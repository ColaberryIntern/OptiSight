"""
OptiSight AI Engine — Vector Service.

Provides semantic similarity search functions using pgvector
cosine distance against PostgreSQL vector columns. Handles
direct database connections and query construction for issue,
store, and Q&A vector searches.
"""

import logging
import os
from typing import Any, Dict, List, Optional

import psycopg2
import psycopg2.extras
from pgvector.psycopg2 import register_vector

from services.embedding_service import embed_text

logger = logging.getLogger(__name__)

# ─────────────────────────────────────────────────────────────
# Database connection
# ─────────────────────────────────────────────────────────────


def _get_connection():
    """
    Create a PostgreSQL connection using environment variables.

    Uses DATABASE_URL if available, otherwise constructs the connection
    string from individual DB_* environment variables.

    Returns:
        psycopg2 connection object with pgvector registered.
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


def _execute_vector_query(
    query: str,
    params: tuple,
    limit: int,
) -> List[Dict[str, Any]]:
    """
    Execute a vector similarity query and return results as dicts.

    Args:
        query: SQL query string with %s placeholders.
        params: Parameter tuple for the query.
        limit: Maximum number of results.

    Returns:
        List of result dictionaries.
    """
    conn = None
    try:
        conn = _get_connection()
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(query, params)
            rows = cur.fetchall()
            return [dict(row) for row in rows]
    except Exception as e:
        logger.error("Vector query failed: %s", str(e))
        raise
    finally:
        if conn:
            conn.close()


# ─────────────────────────────────────────────────────────────
# Issue search functions
# ─────────────────────────────────────────────────────────────


def similar_issue_search(
    query_text: str,
    limit: int = 10,
) -> List[Dict[str, Any]]:
    """
    Find issues with similar descriptions using cosine similarity.

    Embeds the query text and searches the issues table against
    the description_embedding column using pgvector cosine distance.

    Args:
        query_text: Natural language description to search for.
        limit: Maximum number of results to return (default 10).

    Returns:
        List of issue dicts with fields: complaint_id, description,
        category, status, similarity_score.
    """
    if not query_text or not query_text.strip():
        raise ValueError("Query text cannot be empty")

    query_embedding = embed_text(query_text)

    sql = """
        SELECT
            complaint_id,
            description,
            category,
            status,
            1 - (description_embedding <=> %s::vector) AS similarity_score
        FROM issues
        WHERE description_embedding IS NOT NULL
        ORDER BY description_embedding <=> %s::vector
        LIMIT %s
    """

    results = _execute_vector_query(
        sql,
        (query_embedding, query_embedding, limit),
        limit,
    )

    logger.info(
        "Similar issue search for '%s...' returned %d results",
        query_text[:50],
        len(results),
    )
    return results


def similar_resolution_search(
    query_text: str,
    limit: int = 10,
) -> List[Dict[str, Any]]:
    """
    Find issues with similar resolutions using cosine similarity.

    Searches the resolution_embedding column to find past resolutions
    that match the query semantically.

    Args:
        query_text: Description of the resolution approach to search for.
        limit: Maximum number of results to return (default 10).

    Returns:
        List of issue dicts with fields: complaint_id, description,
        resolution_notes, category, similarity_score.
    """
    if not query_text or not query_text.strip():
        raise ValueError("Query text cannot be empty")

    query_embedding = embed_text(query_text)

    sql = """
        SELECT
            complaint_id,
            description,
            resolution_notes,
            category,
            1 - (resolution_embedding <=> %s::vector) AS similarity_score
        FROM issues
        WHERE resolution_embedding IS NOT NULL
        ORDER BY resolution_embedding <=> %s::vector
        LIMIT %s
    """

    results = _execute_vector_query(
        sql,
        (query_embedding, query_embedding, limit),
        limit,
    )

    logger.info(
        "Similar resolution search for '%s...' returned %d results",
        query_text[:50],
        len(results),
    )
    return results


# ─────────────────────────────────────────────────────────────
# Store search functions
# ─────────────────────────────────────────────────────────────


def cross_store_similarity(
    store_id: str,
    limit: int = 5,
) -> List[Dict[str, Any]]:
    """
    Find stores with similar operational profiles.

    Compares a given store's summary embedding against all other
    stores to find operationally similar locations.

    Args:
        store_id: The store ID to find similar stores for.
        limit: Maximum number of similar stores to return (default 5).

    Returns:
        List of store dicts with fields: store_id, store_name,
        region, summary_text, similarity_score.

    Raises:
        ValueError: If the source store has no embedding.
    """
    if not store_id:
        raise ValueError("store_id cannot be empty")

    # First, get the source store's embedding
    conn = None
    try:
        conn = _get_connection()
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                """
                SELECT summary_embedding
                FROM store_summaries
                WHERE store_id = %s AND summary_embedding IS NOT NULL
                """,
                (store_id,),
            )
            row = cur.fetchone()
            if not row:
                raise ValueError(
                    f"Store {store_id} not found or has no embedding"
                )
            source_embedding = row["summary_embedding"]

            # Find similar stores (excluding the source store)
            cur.execute(
                """
                SELECT
                    store_id,
                    store_name,
                    region,
                    summary_text,
                    1 - (summary_embedding <=> %s::vector) AS similarity_score
                FROM store_summaries
                WHERE store_id != %s AND summary_embedding IS NOT NULL
                ORDER BY summary_embedding <=> %s::vector
                LIMIT %s
                """,
                (source_embedding, store_id, source_embedding, limit),
            )
            results = [dict(r) for r in cur.fetchall()]

        logger.info(
            "Cross-store similarity for store %s returned %d results",
            store_id,
            len(results),
        )
        return results
    except Exception as e:
        logger.error("Cross-store similarity failed: %s", str(e))
        raise
    finally:
        if conn:
            conn.close()


def semantic_store_search(
    query_text: str,
    limit: int = 5,
) -> List[Dict[str, Any]]:
    """
    Find stores matching a natural language description.

    Embeds the query and searches store summary embeddings
    for semantic matches.

    Args:
        query_text: Natural language description of desired store characteristics.
        limit: Maximum number of results (default 5).

    Returns:
        List of store dicts with fields: store_id, store_name,
        region, summary_text, similarity_score.
    """
    if not query_text or not query_text.strip():
        raise ValueError("Query text cannot be empty")

    query_embedding = embed_text(query_text)

    sql = """
        SELECT
            store_id,
            store_name,
            region,
            summary_text,
            1 - (summary_embedding <=> %s::vector) AS similarity_score
        FROM store_summaries
        WHERE summary_embedding IS NOT NULL
        ORDER BY summary_embedding <=> %s::vector
        LIMIT %s
    """

    results = _execute_vector_query(
        sql,
        (query_embedding, query_embedding, limit),
        limit,
    )

    logger.info(
        "Semantic store search for '%s...' returned %d results",
        query_text[:50],
        len(results),
    )
    return results


# ─────────────────────────────────────────────────────────────
# Q&A context retrieval
# ─────────────────────────────────────────────────────────────


def store_qa_context(
    question_embedding: List[float],
    limit: int = 3,
) -> List[Dict[str, Any]]:
    """
    Retrieve relevant past Q&A entries for context augmentation.

    Uses a pre-computed question embedding to find semantically
    similar past questions and their answers from the qa_history table.

    Args:
        question_embedding: Pre-computed embedding vector (1536 dims).
        limit: Maximum number of Q&A entries to return (default 3).

    Returns:
        List of Q&A dicts with fields: qa_id, question, answer,
        created_at, similarity_score.
    """
    if not question_embedding or len(question_embedding) != 1536:
        raise ValueError(
            "question_embedding must be a list of 1536 floats"
        )

    sql = """
        SELECT
            qa_id,
            question,
            answer,
            created_at,
            1 - (question_embedding <=> %s::vector) AS similarity_score
        FROM qa_history
        WHERE question_embedding IS NOT NULL
        ORDER BY question_embedding <=> %s::vector
        LIMIT %s
    """

    results = _execute_vector_query(
        sql,
        (question_embedding, question_embedding, limit),
        limit,
    )

    # Convert datetime objects to ISO strings for JSON serialization
    for r in results:
        if r.get("created_at"):
            r["created_at"] = r["created_at"].isoformat()

    logger.info(
        "Q&A context retrieval returned %d results",
        len(results),
    )
    return results


# ─────────────────────────────────────────────────────────────
# Store similarity network
# ─────────────────────────────────────────────────────────────


def store_similarity_network(
    threshold: float = 0.5,
) -> Dict[str, Any]:
    """
    Compute pairwise similarity between all stores.

    Uses pgvector cosine distance on store summary embeddings to find
    pairs above *threshold*.  Returns edges suitable for the left-panel
    store network graph.

    Args:
        threshold: Minimum similarity score (0–1) to include an edge.

    Returns:
        Dict with key ``edges`` — a list of
        ``{source, target, weight}`` dicts.
    """
    conn = None
    try:
        conn = _get_connection()
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                """
                SELECT
                    a.store_id AS source,
                    b.store_id AS target,
                    1 - (a.summary_embedding <=> b.summary_embedding) AS weight
                FROM store_summaries a
                CROSS JOIN store_summaries b
                WHERE a.store_id < b.store_id
                  AND a.summary_embedding IS NOT NULL
                  AND b.summary_embedding IS NOT NULL
                  AND 1 - (a.summary_embedding <=> b.summary_embedding) > %s
                ORDER BY weight DESC
                """,
                (threshold,),
            )
            rows = cur.fetchall()

        edges = [
            {
                "source": str(r["source"]),
                "target": str(r["target"]),
                "weight": round(float(r["weight"]), 3),
            }
            for r in rows
        ]

        logger.info(
            "Store similarity network: %d edges above threshold %.2f",
            len(edges),
            threshold,
        )
        return {"edges": edges}

    except Exception as e:
        logger.error("store_similarity_network failed: %s", str(e))
        return {"edges": []}
    finally:
        if conn:
            conn.close()
