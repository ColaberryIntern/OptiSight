"""
OptiSight AI Engine — Context Builder.

Builds structured LLM context from raw data sources (SQL results,
ML model outputs, vector search results). Handles summarization of
large result sets, token budget management, and number formatting
to produce a clean context string for GPT-4o narrative generation.
"""

import logging
from datetime import date, datetime
from decimal import Decimal
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)

# ─────────────────────────────────────────────────────────────
# Configuration
# ─────────────────────────────────────────────────────────────

MAX_CONTEXT_TOKENS = 8000  # ~8K tokens for context window budget
CHARS_PER_TOKEN = 4  # Rough estimate: 1 token ~ 4 characters
MAX_CONTEXT_CHARS = MAX_CONTEXT_TOKENS * CHARS_PER_TOKEN
MAX_SQL_ROWS_FULL = 50  # Show full detail up to this many rows
MAX_SQL_ROWS_SUMMARY = 200  # Summarize up to this many rows


# ─────────────────────────────────────────────────────────────
# Number Formatting Helpers
# ─────────────────────────────────────────────────────────────


def _format_currency(value: Any) -> str:
    """Format a numeric value as USD currency."""
    try:
        num = float(value)
        if abs(num) >= 1_000_000:
            return f"${num / 1_000_000:,.1f}M"
        elif abs(num) >= 1_000:
            return f"${num:,.0f}"
        else:
            return f"${num:,.2f}"
    except (TypeError, ValueError):
        return str(value)


def _format_percentage(value: Any) -> str:
    """Format a numeric value as a percentage."""
    try:
        num = float(value)
        return f"{num:.1f}%"
    except (TypeError, ValueError):
        return str(value)


def _format_number(value: Any) -> str:
    """Format a numeric value with comma separators."""
    try:
        num = float(value)
        if num == int(num):
            return f"{int(num):,}"
        return f"{num:,.2f}"
    except (TypeError, ValueError):
        return str(value)


def _safe_serialize(value: Any) -> Any:
    """Convert non-JSON-serializable types to safe representations."""
    if value is None:
        return None
    if isinstance(value, Decimal):
        return float(value)
    if isinstance(value, (datetime, date)):
        return value.isoformat()
    if isinstance(value, bytes):
        return value.decode("utf-8", errors="replace")
    return value


def _detect_column_type(column_name: str) -> str:
    """
    Heuristically detect the semantic type of a column based on its name.

    Returns one of: 'currency', 'percentage', 'count', 'date', 'id', 'text', 'number'.
    """
    name_lower = column_name.lower()

    currency_keywords = [
        "revenue", "amount", "price", "cost", "fee", "salary",
        "total_amount", "avg_sale", "sale_value",
    ]
    pct_keywords = [
        "pct", "percent", "rate", "ratio", "conversion",
        "growth", "change_pct",
    ]
    count_keywords = [
        "count", "total_exams", "units_sold", "num_",
        "unique_patients", "examining_doctors",
    ]
    date_keywords = ["date", "created_at", "resolved_at", "updated_at"]
    id_keywords = ["_id", "uuid"]

    for kw in currency_keywords:
        if kw in name_lower:
            return "currency"
    for kw in pct_keywords:
        if kw in name_lower:
            return "percentage"
    for kw in count_keywords:
        if kw in name_lower:
            return "count"
    for kw in date_keywords:
        if kw in name_lower:
            return "date"
    for kw in id_keywords:
        if kw in name_lower:
            return "id"

    return "number"


def _format_value_by_type(value: Any, col_type: str) -> str:
    """Format a value based on detected column type."""
    if value is None:
        return "N/A"
    value = _safe_serialize(value)
    if col_type == "currency":
        return _format_currency(value)
    elif col_type == "percentage":
        return _format_percentage(value)
    elif col_type == "count":
        return _format_number(value)
    elif col_type == "date":
        return str(value)
    elif col_type == "id":
        return str(value)
    else:
        try:
            num = float(value)
            return _format_number(num)
        except (TypeError, ValueError):
            return str(value)


# ─────────────────────────────────────────────────────────────
# SQL Result Formatting
# ─────────────────────────────────────────────────────────────


def _format_sql_results(
    query_name: str,
    rows: List[Dict[str, Any]],
) -> str:
    """
    Format SQL query results into a readable context block.

    For small result sets (<=50 rows), shows full detail.
    For larger sets, provides a statistical summary.

    Args:
        query_name: Human-readable name of the query.
        rows: List of row dictionaries from the query.

    Returns:
        Formatted string block for LLM context.
    """
    if not rows:
        return f"[{query_name}]: No data returned.\n"

    sections = [f"[{query_name}] ({len(rows)} rows):"]

    # Detect column types
    columns = list(rows[0].keys())
    col_types = {col: _detect_column_type(col) for col in columns}

    if len(rows) <= MAX_SQL_ROWS_FULL:
        # Full detail output
        for i, row in enumerate(rows):
            row_parts = []
            for col in columns:
                val = _format_value_by_type(row.get(col), col_types[col])
                row_parts.append(f"{col}: {val}")
            sections.append(f"  Row {i + 1}: {' | '.join(row_parts)}")
    else:
        # Summary mode for large result sets
        sections.append(f"  (Showing summary of {len(rows)} rows)")

        # Compute statistics for numeric columns
        for col in columns:
            if col_types[col] in ("currency", "percentage", "count", "number"):
                values = []
                for row in rows[:MAX_SQL_ROWS_SUMMARY]:
                    try:
                        values.append(float(_safe_serialize(row.get(col, 0)) or 0))
                    except (TypeError, ValueError):
                        continue

                if values:
                    avg_val = sum(values) / len(values)
                    min_val = min(values)
                    max_val = max(values)
                    formatter = (
                        _format_currency if col_types[col] == "currency"
                        else _format_percentage if col_types[col] == "percentage"
                        else _format_number
                    )
                    sections.append(
                        f"  {col}: avg={formatter(avg_val)}, "
                        f"min={formatter(min_val)}, max={formatter(max_val)}"
                    )

        # Show first 5 rows as sample
        sections.append("  Sample rows:")
        for i, row in enumerate(rows[:5]):
            row_parts = []
            for col in columns:
                val = _format_value_by_type(row.get(col), col_types[col])
                row_parts.append(f"{col}: {val}")
            sections.append(f"    Row {i + 1}: {' | '.join(row_parts)}")

    return "\n".join(sections) + "\n"


# ─────────────────────────────────────────────────────────────
# ML Result Formatting
# ─────────────────────────────────────────────────────────────


def _format_ml_results(
    model_name: str,
    results: Any,
) -> str:
    """
    Format ML model results into a readable context block.

    Args:
        model_name: Name of the ML model that produced the results.
        results: The raw model output (dict or list).

    Returns:
        Formatted string block for LLM context.
    """
    if not results:
        return f"[ML: {model_name}]: No results returned.\n"

    sections = [f"[ML: {model_name}]:"]

    if model_name == "anomaly_detector":
        if isinstance(results, list):
            anomalies = [r for r in results if r.get("is_anomaly")]
            normal = [r for r in results if not r.get("is_anomaly")]
            sections.append(f"  Analyzed {len(results)} stores: "
                          f"{len(anomalies)} anomalous, {len(normal)} normal")
            if anomalies:
                sections.append("  Anomalous stores:")
                for a in anomalies[:10]:
                    store = a.get("store_id", "unknown")
                    score = a.get("anomaly_score", 0)
                    top_features = sorted(
                        a.get("feature_contributions", {}).items(),
                        key=lambda x: x[1], reverse=True
                    )[:3]
                    feat_str = ", ".join(f"{f}: {v:.2%}" for f, v in top_features)
                    sections.append(
                        f"    Store {store}: score={score:.4f}, "
                        f"top factors=[{feat_str}]"
                    )

    elif model_name == "risk_scorer":
        if isinstance(results, list):
            sections.append(f"  Scored {len(results)} stores:")
            for r in results[:15]:
                store = r.get("store_id", "unknown")
                score = r.get("risk_score", 0)
                level = r.get("risk_level", "unknown")
                sections.append(f"    Store {store}: score={score:.1f}, level={level}")

    elif model_name == "forecaster":
        if isinstance(results, dict):
            trend = results.get("trend", "unknown")
            summary = results.get("summary", {})
            forecast = results.get("forecast", [])
            sections.append(f"  Trend: {trend}")
            if summary:
                sections.append(
                    f"  Training data: {summary.get('data_points', 0)} points, "
                    f"mean={_format_currency(summary.get('mean', 0))}"
                )
            if forecast:
                last_5 = forecast[-5:] if len(forecast) > 5 else forecast
                sections.append(f"  Forecast ({len(forecast)} periods):")
                for f in last_5:
                    sections.append(
                        f"    {f.get('date', '?')}: "
                        f"predicted={_format_currency(f.get('predicted', 0))}, "
                        f"range=[{_format_currency(f.get('lower', 0))}, "
                        f"{_format_currency(f.get('upper', 0))}]"
                    )

    elif model_name == "root_cause_explainer":
        if isinstance(results, dict):
            global_imp = results.get("global_importance", [])
            perf = results.get("model_performance", {})
            if perf:
                sections.append(
                    f"  Model R-squared: {perf.get('r_squared', 0):.4f} "
                    f"({perf.get('n_features', 0)} features, "
                    f"{perf.get('n_samples', 0)} samples)"
                )
            if global_imp:
                sections.append("  Top contributing factors (global):")
                for gi in global_imp[:10]:
                    sections.append(
                        f"    {gi['feature']}: importance={gi['importance']:.4f}, "
                        f"direction={gi['direction']}"
                    )

    elif model_name == "issue_clusterer":
        if isinstance(results, dict):
            clusters = results.get("clusters", [])
            noise = results.get("noise_count", 0)
            total = results.get("total_issues", 0)
            sections.append(
                f"  Found {len(clusters)} clusters from {total} issues "
                f"({noise} noise/unclustered)"
            )
            for c in clusters[:8]:
                keywords = ", ".join(c.get("top_keywords", [])[:5])
                sections.append(
                    f"    Cluster {c['cluster_id']}: "
                    f"{c['issue_count']} issues, keywords=[{keywords}]"
                )

    else:
        # Generic formatting
        sections.append(f"  {str(results)[:2000]}")

    return "\n".join(sections) + "\n"


# ─────────────────────────────────────────────────────────────
# Vector Result Formatting
# ─────────────────────────────────────────────────────────────


def _format_vector_results(
    search_name: str,
    results: List[Dict[str, Any]],
) -> str:
    """
    Format vector search results into a readable context block.

    Args:
        search_name: Name of the vector search performed.
        results: List of search result dictionaries.

    Returns:
        Formatted string block for LLM context.
    """
    if not results:
        return f"[Vector: {search_name}]: No results found.\n"

    sections = [f"[Vector: {search_name}] ({len(results)} results):"]

    for i, r in enumerate(results[:10]):
        score = r.get("similarity_score", 0)
        score_str = f"{float(score):.3f}" if score else "N/A"

        if search_name in ("similar_issues", "qa_context"):
            desc = r.get("description", r.get("question", ""))
            if len(desc) > 200:
                desc = desc[:200] + "..."
            category = r.get("category", "")
            status = r.get("status", "")
            answer = r.get("answer", "")

            line = f"  {i + 1}. [score={score_str}]"
            if category:
                line += f" [{category}]"
            if status:
                line += f" [{status}]"
            line += f" {desc}"
            if answer:
                answer_preview = answer[:150] + "..." if len(answer) > 150 else answer
                line += f"\n     Answer: {answer_preview}"
            sections.append(line)

        elif search_name in ("similar_stores", "semantic_store_search"):
            name = r.get("store_name", r.get("store_id", "unknown"))
            region = r.get("region", "")
            summary = r.get("summary_text", "")
            if len(summary) > 150:
                summary = summary[:150] + "..."
            sections.append(
                f"  {i + 1}. [score={score_str}] {name} ({region}): {summary}"
            )

        else:
            sections.append(f"  {i + 1}. [score={score_str}] {str(r)[:200]}")

    return "\n".join(sections) + "\n"


# ─────────────────────────────────────────────────────────────
# Main Context Builder
# ─────────────────────────────────────────────────────────────


def build_context(
    sql_results: Optional[Dict[str, List[Dict[str, Any]]]] = None,
    ml_results: Optional[Dict[str, Any]] = None,
    vector_results: Optional[Dict[str, List[Dict[str, Any]]]] = None,
    errors: Optional[List[str]] = None,
) -> str:
    """
    Build a formatted LLM context string from all data sources.

    Combines SQL query results, ML model outputs, and vector search results
    into a single structured context block that fits within the token budget.

    Args:
        sql_results: Dict mapping query names to lists of row dicts.
        ml_results: Dict mapping model names to their output data.
        vector_results: Dict mapping search names to lists of result dicts.
        errors: Optional list of error messages from failed data sources.

    Returns:
        Formatted context string ready for LLM narrative generation.
    """
    context_parts = []

    # ── SQL Results ──
    if sql_results:
        context_parts.append("=" * 50)
        context_parts.append("DATABASE QUERY RESULTS")
        context_parts.append("=" * 50)
        for query_name, rows in sql_results.items():
            context_parts.append(_format_sql_results(query_name, rows))

    # ── ML Results ──
    if ml_results:
        context_parts.append("=" * 50)
        context_parts.append("ML MODEL RESULTS")
        context_parts.append("=" * 50)
        for model_name, results in ml_results.items():
            context_parts.append(_format_ml_results(model_name, results))

    # ── Vector Results ──
    if vector_results:
        context_parts.append("=" * 50)
        context_parts.append("SEMANTIC SEARCH RESULTS")
        context_parts.append("=" * 50)
        for search_name, results in vector_results.items():
            context_parts.append(_format_vector_results(search_name, results))

    # ── Errors ──
    if errors:
        context_parts.append("=" * 50)
        context_parts.append("DATA SOURCE NOTES")
        context_parts.append("=" * 50)
        for err in errors:
            context_parts.append(f"  Warning: {err}")
        context_parts.append("")

    full_context = "\n".join(context_parts)

    # Token budget enforcement — truncate if needed
    if len(full_context) > MAX_CONTEXT_CHARS:
        logger.warning(
            "Context exceeds budget (%d chars > %d max). Truncating.",
            len(full_context),
            MAX_CONTEXT_CHARS,
        )
        full_context = full_context[:MAX_CONTEXT_CHARS]
        full_context += "\n\n[Context truncated due to size limits]"

    logger.info(
        "Built context: %d chars (~%d tokens)",
        len(full_context),
        len(full_context) // CHARS_PER_TOKEN,
    )
    return full_context
