"""
OptiSight AI Engine — Embedding Pipeline.

Batch and real-time embedding workflows for populating vector columns
in the PostgreSQL database. Handles issues, store summaries, and Q&A
entries.
"""

import logging
import os
from typing import Any, Dict, List, Optional

import psycopg2
import psycopg2.extras
from pgvector.psycopg2 import register_vector

from services.embedding_service import embed_text, embed_batch

logger = logging.getLogger(__name__)

# ─────────────────────────────────────────────────────────────
# Database connection (shared with vector_service pattern)
# ─────────────────────────────────────────────────────────────

BATCH_SIZE = 50  # Number of records to process per batch


def _get_connection():
    """
    Create a PostgreSQL connection using environment variables.

    Uses DATABASE_URL if available, otherwise constructs from
    individual DB_* variables.

    Returns:
        psycopg2 connection with pgvector registered.
    """
    database_url = os.environ.get("DATABASE_URL")

    if database_url:
        conn = psycopg2.connect(database_url)
    else:
        conn = psycopg2.connect(
            host=os.environ.get("DB_HOST", "postgres"),
            port=int(os.environ.get("DB_PORT", "5432")),
            dbname=os.environ.get("DB_NAME", "retail_insight"),
            user=os.environ.get("DB_USER", "retail_insight"),
            password=os.environ.get("DB_PASSWORD", "changeme"),
        )

    register_vector(conn)
    return conn


# ─────────────────────────────────────────────────────────────
# Issue embedding pipeline
# ─────────────────────────────────────────────────────────────


def embed_all_issues() -> Dict[str, Any]:
    """
    Batch embed all issue descriptions and resolution notes.

    Processes issues that do not yet have embeddings, in batches
    of BATCH_SIZE. Updates the description_embedding and
    resolution_embedding columns.

    Returns:
        Dict with keys:
            - descriptions_embedded: count of description embeddings created
            - resolutions_embedded: count of resolution embeddings created
            - errors: count of errors encountered
    """
    stats = {
        "descriptions_embedded": 0,
        "resolutions_embedded": 0,
        "errors": 0,
    }

    conn = None
    try:
        conn = _get_connection()

        # ── Embed descriptions ──────────────────────────────
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                """
                SELECT complaint_id, description
                FROM issues
                WHERE description IS NOT NULL
                  AND description != ''
                  AND description_embedding IS NULL
                ORDER BY complaint_id
                """
            )
            rows = cur.fetchall()

        logger.info("Found %d issues needing description embeddings", len(rows))

        for batch_start in range(0, len(rows), BATCH_SIZE):
            batch = rows[batch_start:batch_start + BATCH_SIZE]
            texts = [row["description"] for row in batch]
            ids = [row["complaint_id"] for row in batch]

            try:
                embeddings = embed_batch(texts)

                with conn.cursor() as cur:
                    for issue_id, embedding in zip(ids, embeddings):
                        cur.execute(
                            """
                            UPDATE issues
                            SET description_embedding = %s::vector
                            WHERE complaint_id = %s
                            """,
                            (embedding, issue_id),
                        )
                conn.commit()
                stats["descriptions_embedded"] += len(batch)
                logger.info(
                    "Embedded descriptions batch %d-%d of %d",
                    batch_start,
                    batch_start + len(batch),
                    len(rows),
                )
            except Exception as e:
                conn.rollback()
                stats["errors"] += 1
                logger.error(
                    "Failed to embed description batch starting at %d: %s",
                    batch_start,
                    str(e),
                )

        # ── Embed resolution notes ──────────────────────────
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                """
                SELECT complaint_id, resolution_notes
                FROM issues
                WHERE resolution_notes IS NOT NULL
                  AND resolution_notes != ''
                  AND resolution_embedding IS NULL
                ORDER BY complaint_id
                """
            )
            rows = cur.fetchall()

        logger.info("Found %d issues needing resolution embeddings", len(rows))

        for batch_start in range(0, len(rows), BATCH_SIZE):
            batch = rows[batch_start:batch_start + BATCH_SIZE]
            texts = [row["resolution_notes"] for row in batch]
            ids = [row["complaint_id"] for row in batch]

            try:
                embeddings = embed_batch(texts)

                with conn.cursor() as cur:
                    for issue_id, embedding in zip(ids, embeddings):
                        cur.execute(
                            """
                            UPDATE issues
                            SET resolution_embedding = %s::vector
                            WHERE complaint_id = %s
                            """,
                            (embedding, issue_id),
                        )
                conn.commit()
                stats["resolutions_embedded"] += len(batch)
                logger.info(
                    "Embedded resolutions batch %d-%d of %d",
                    batch_start,
                    batch_start + len(batch),
                    len(rows),
                )
            except Exception as e:
                conn.rollback()
                stats["errors"] += 1
                logger.error(
                    "Failed to embed resolution batch starting at %d: %s",
                    batch_start,
                    str(e),
                )

    except Exception as e:
        logger.error("embed_all_issues pipeline failed: %s", str(e))
        stats["errors"] += 1
    finally:
        if conn:
            conn.close()

    logger.info("embed_all_issues completed: %s", stats)
    return stats


# ─────────────────────────────────────────────────────────────
# Store summary generation
# ─────────────────────────────────────────────────────────────


def generate_store_summaries() -> Dict[str, Any]:
    """
    Generate natural-language summaries for each store and insert into
    the store_summaries table.

    Queries store_performance_features and stores tables to build a
    rich text summary per store. Only generates for stores that do not
    already have a summary.

    Returns:
        Dict with keys:
            - summaries_generated: count of new summaries created
            - errors: count of errors encountered
    """
    stats = {"summaries_generated": 0, "errors": 0}

    conn = None
    try:
        conn = _get_connection()

        # Find stores that don't have summaries yet
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute("""
                SELECT
                    s.store_id,
                    s.store_name,
                    s.city,
                    s.state,
                    s.region,
                    COALESCE(spf.revenue_30d, 0) AS revenue_30d,
                    COALESCE(spf.txn_count_30d, 0) AS txn_count_30d,
                    COALESCE(spf.customer_count_30d, 0) AS customer_count_30d,
                    COALESCE(spf.avg_ticket, 0) AS avg_ticket,
                    COALESCE(spf.complaint_count_30d, 0) AS complaint_count_30d,
                    COALESCE(spf.exam_count_30d, 0) AS exam_count_30d
                FROM stores s
                LEFT JOIN store_performance_features spf
                    ON s.store_id = spf.store_id
                WHERE s.is_active = true
                    AND s.store_id NOT IN (
                        SELECT store_id FROM store_summaries
                        WHERE summary_text IS NOT NULL
                    )
                ORDER BY s.store_name
            """)
            stores = cur.fetchall()

        if not stores:
            logger.info("All stores already have summaries — skipping generation")
            return stats

        logger.info("Generating summaries for %d stores", len(stores))

        # Get top complaint category per store
        complaint_categories = {}
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute("""
                SELECT store_id, category, COUNT(*) AS cnt
                FROM issues
                GROUP BY store_id, category
                ORDER BY store_id, cnt DESC
            """)
            for row in cur.fetchall():
                sid = row["store_id"]
                if sid not in complaint_categories:
                    complaint_categories[sid] = row["category"]

        for store in stores:
            try:
                sid = store["store_id"]
                name = store["store_name"] or str(sid)[:8]
                city = store.get("city") or "Unknown"
                region = store.get("region") or "Unknown"
                rev = float(store.get("revenue_30d", 0))
                txns = int(store.get("txn_count_30d", 0))
                customers = int(store.get("customer_count_30d", 0))
                avg_ticket = float(store.get("avg_ticket", 0))
                complaints = int(store.get("complaint_count_30d", 0))
                exams = int(store.get("exam_count_30d", 0))
                top_category = complaint_categories.get(sid, "none")

                summary = (
                    f"{name} in {city}, {region} region. "
                    f"30-day revenue: ${rev:,.0f} across {txns} transactions. "
                    f"{customers} unique customers, average ticket ${avg_ticket:,.0f}. "
                    f"{complaints} complaints in 30 days"
                )
                if complaints > 0 and top_category != "none":
                    summary += f" (mainly {top_category})"
                summary += f". {exams} eye exams conducted."

                with conn.cursor() as cur:
                    # Check if summary already exists
                    cur.execute(
                        "SELECT summary_id FROM store_summaries WHERE store_id = %s",
                        (sid,),
                    )
                    existing = cur.fetchone()
                    if existing:
                        cur.execute(
                            """
                            UPDATE store_summaries
                            SET summary_text = %s, generated_at = NOW(),
                                summary_embedding = NULL
                            WHERE store_id = %s
                            """,
                            (summary, sid),
                        )
                    else:
                        cur.execute(
                            """
                            INSERT INTO store_summaries
                                (store_id, summary_text, generated_at)
                            VALUES (%s, %s, NOW())
                            """,
                            (sid, summary),
                        )
                conn.commit()
                stats["summaries_generated"] += 1
                logger.info("Generated summary for store %s (%s)", name, sid)

            except Exception as e:
                conn.rollback()
                stats["errors"] += 1
                logger.error("Failed to generate summary for store %s: %s", sid, e)

    except Exception as e:
        logger.error("generate_store_summaries failed: %s", e)
        stats["errors"] += 1
    finally:
        if conn:
            conn.close()

    logger.info("generate_store_summaries completed: %s", stats)
    return stats


# ─────────────────────────────────────────────────────────────
# Store summary embedding pipeline
# ─────────────────────────────────────────────────────────────


def embed_store_summaries() -> Dict[str, Any]:
    """
    Generate text summaries per store and embed them.

    Queries materialized views or aggregation queries to build
    a text summary for each store, then embeds that summary
    and stores it in the store_summaries table.

    Returns:
        Dict with keys:
            - stores_embedded: count of store summaries embedded
            - errors: count of errors encountered
    """
    stats = {
        "stores_embedded": 0,
        "errors": 0,
    }

    conn = None
    try:
        conn = _get_connection()

        # Fetch stores needing summary embeddings
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                """
                SELECT store_id, summary_text
                FROM store_summaries
                WHERE summary_text IS NOT NULL
                  AND summary_text != ''
                  AND summary_embedding IS NULL
                ORDER BY store_id
                """
            )
            rows = cur.fetchall()

        logger.info("Found %d stores needing summary embeddings", len(rows))

        if not rows:
            return stats

        for batch_start in range(0, len(rows), BATCH_SIZE):
            batch = rows[batch_start:batch_start + BATCH_SIZE]
            texts = [row["summary_text"] for row in batch]
            ids = [row["store_id"] for row in batch]

            try:
                embeddings = embed_batch(texts)

                with conn.cursor() as cur:
                    for store_id, embedding in zip(ids, embeddings):
                        cur.execute(
                            """
                            UPDATE store_summaries
                            SET summary_embedding = %s::vector
                            WHERE store_id = %s
                            """,
                            (embedding, store_id),
                        )
                conn.commit()
                stats["stores_embedded"] += len(batch)
                logger.info(
                    "Embedded store summaries batch %d-%d of %d",
                    batch_start,
                    batch_start + len(batch),
                    len(rows),
                )
            except Exception as e:
                conn.rollback()
                stats["errors"] += 1
                logger.error(
                    "Failed to embed store summary batch starting at %d: %s",
                    batch_start,
                    str(e),
                )

    except Exception as e:
        logger.error("embed_store_summaries pipeline failed: %s", str(e))
        stats["errors"] += 1
    finally:
        if conn:
            conn.close()

    logger.info("embed_store_summaries completed: %s", stats)
    return stats


# ─────────────────────────────────────────────────────────────
# Real-time single-record embedding
# ─────────────────────────────────────────────────────────────


def embed_new_issue(issue_id: str) -> Dict[str, Any]:
    """
    Embed a single newly created issue in real time.

    Retrieves the issue description and resolution notes (if present),
    generates embeddings, and updates the corresponding vector columns.

    Args:
        issue_id: The complaint_id of the issue to embed.

    Returns:
        Dict with keys:
            - issue_id: the processed issue ID
            - description_embedded: bool
            - resolution_embedded: bool
    """
    result = {
        "issue_id": issue_id,
        "description_embedded": False,
        "resolution_embedded": False,
    }

    conn = None
    try:
        conn = _get_connection()

        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                """
                SELECT complaint_id, description, resolution_notes
                FROM issues
                WHERE complaint_id = %s
                """,
                (issue_id,),
            )
            row = cur.fetchone()

        if not row:
            logger.warning("Issue %s not found for embedding", issue_id)
            return result

        # Embed description
        if row.get("description") and row["description"].strip():
            try:
                desc_embedding = embed_text(row["description"])
                with conn.cursor() as cur:
                    cur.execute(
                        """
                        UPDATE issues
                        SET description_embedding = %s::vector
                        WHERE complaint_id = %s
                        """,
                        (desc_embedding, issue_id),
                    )
                conn.commit()
                result["description_embedded"] = True
                logger.info("Embedded description for issue %s", issue_id)
            except Exception as e:
                conn.rollback()
                logger.error(
                    "Failed to embed description for issue %s: %s",
                    issue_id,
                    str(e),
                )

        # Embed resolution notes
        if row.get("resolution_notes") and row["resolution_notes"].strip():
            try:
                res_embedding = embed_text(row["resolution_notes"])
                with conn.cursor() as cur:
                    cur.execute(
                        """
                        UPDATE issues
                        SET resolution_embedding = %s::vector
                        WHERE complaint_id = %s
                        """,
                        (res_embedding, issue_id),
                    )
                conn.commit()
                result["resolution_embedded"] = True
                logger.info("Embedded resolution for issue %s", issue_id)
            except Exception as e:
                conn.rollback()
                logger.error(
                    "Failed to embed resolution for issue %s: %s",
                    issue_id,
                    str(e),
                )

    except Exception as e:
        logger.error("embed_new_issue failed for %s: %s", issue_id, str(e))
    finally:
        if conn:
            conn.close()

    return result


def embed_qa(qa_id: str) -> Dict[str, Any]:
    """
    Embed a Q&A entry after orchestrator response.

    Retrieves the question text from qa_history, generates an
    embedding, and stores it in the question_embedding column.

    Args:
        qa_id: The qa_id of the Q&A entry to embed.

    Returns:
        Dict with keys:
            - qa_id: the processed Q&A ID
            - embedded: bool indicating success
    """
    result = {
        "qa_id": qa_id,
        "embedded": False,
    }

    conn = None
    try:
        conn = _get_connection()

        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                """
                SELECT qa_id, question
                FROM qa_history
                WHERE qa_id = %s
                """,
                (qa_id,),
            )
            row = cur.fetchone()

        if not row:
            logger.warning("Q&A entry %s not found for embedding", qa_id)
            return result

        if not row.get("question") or not row["question"].strip():
            logger.warning("Q&A entry %s has empty question", qa_id)
            return result

        question_embedding = embed_text(row["question"])

        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE qa_history
                SET question_embedding = %s::vector
                WHERE qa_id = %s
                """,
                (question_embedding, qa_id),
            )
        conn.commit()
        result["embedded"] = True
        logger.info("Embedded question for Q&A entry %s", qa_id)

    except Exception as e:
        if conn:
            conn.rollback()
        logger.error("embed_qa failed for %s: %s", qa_id, str(e))
    finally:
        if conn:
            conn.close()

    return result
