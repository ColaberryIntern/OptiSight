"""
OptiSight AI Engine — Query Engine (Orchestrator Brain).

Main orchestrator that processes executive questions through a multi-step
pipeline: intent classification, plan generation, SQL/ML/vector execution,
context building, narrative generation, visualization recommendation,
and follow-up question generation.

All LLM calls use GPT-4o via the OpenAI SDK.
ML models are invoked directly (not via HTTP).
SQL uses parameterized queries via psycopg2.
"""

import json
import logging
import os
import time
import traceback
import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import Any, Dict, List, Optional

import psycopg2
import psycopg2.extras

logger = logging.getLogger(__name__)

# ─────────────────────────────────────────────────────────────
# Configuration
# ─────────────────────────────────────────────────────────────

LLM_MODEL = "gpt-4o"
LLM_TEMPERATURE = 0.3  # Low temperature for analytical accuracy
LLM_MAX_TOKENS_CLASSIFY = 500
LLM_MAX_TOKENS_PLAN = 800
LLM_MAX_TOKENS_NARRATIVE = 1500
LLM_MAX_TOKENS_VIZ = 600
LLM_MAX_TOKENS_FOLLOWUP = 400


# ─────────────────────────────────────────────────────────────
# OpenAI Client
# ─────────────────────────────────────────────────────────────


def _get_openai_client():
    """
    Create an OpenAI client using the OPENAI_API_KEY env var.

    Returns:
        openai.OpenAI client instance.

    Raises:
        ValueError: If OPENAI_API_KEY is not set.
    """
    from openai import OpenAI

    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        raise ValueError(
            "OPENAI_API_KEY environment variable is required for the orchestrator."
        )
    return OpenAI(api_key=api_key)


def _call_llm(
    system_prompt: str,
    user_message: str,
    max_tokens: int = 1000,
    temperature: float = LLM_TEMPERATURE,
) -> str:
    """
    Make a GPT-4o API call and return the response text.

    Args:
        system_prompt: The system prompt defining behavior.
        user_message: The user message content.
        max_tokens: Maximum response tokens.
        temperature: Sampling temperature.

    Returns:
        The assistant's response text.

    Raises:
        RuntimeError: If the API call fails.
    """
    try:
        client = _get_openai_client()
        response = client.chat.completions.create(
            model=LLM_MODEL,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_message},
            ],
            max_tokens=max_tokens,
            temperature=temperature,
        )
        return response.choices[0].message.content.strip()
    except Exception as e:
        logger.error("LLM call failed: %s", str(e))
        raise RuntimeError(f"LLM API call failed: {str(e)}") from e


def _parse_json_response(text: str) -> dict:
    """
    Parse a JSON response from the LLM, handling markdown code blocks.

    Args:
        text: Raw LLM response text that should contain JSON.

    Returns:
        Parsed dictionary.

    Raises:
        ValueError: If JSON parsing fails.
    """
    # Strip markdown code block wrappers if present
    cleaned = text.strip()
    if cleaned.startswith("```json"):
        cleaned = cleaned[7:]
    elif cleaned.startswith("```"):
        cleaned = cleaned[3:]
    if cleaned.endswith("```"):
        cleaned = cleaned[:-3]
    cleaned = cleaned.strip()

    try:
        return json.loads(cleaned)
    except json.JSONDecodeError as e:
        logger.error("Failed to parse LLM JSON response: %s\nRaw: %s", str(e), text[:500])
        raise ValueError(f"LLM returned invalid JSON: {str(e)}") from e


# ─────────────────────────────────────────────────────────────
# Database Connection
# ─────────────────────────────────────────────────────────────


def _get_db_connection():
    """Create a psycopg2 connection using DATABASE_URL env var."""
    database_url = os.environ.get(
        "DATABASE_URL",
        "postgresql://retail_insight:changeme@postgres:5432/retail_insight",
    )
    return psycopg2.connect(database_url)


def _execute_sql(sql: str, params: tuple) -> List[Dict[str, Any]]:
    """
    Execute a parameterized SQL query and return results as dicts.

    Converts non-JSON-serializable types (Decimal, datetime, etc.)
    to safe Python types.

    Args:
        sql: SQL query string with %s placeholders.
        params: Parameter tuple.

    Returns:
        List of row dictionaries.
    """
    conn = None
    try:
        conn = _get_db_connection()
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(sql, params)
            rows = cur.fetchall()

        # Convert to plain dicts with safe types
        results = []
        for row in rows:
            safe_row = {}
            for key, value in dict(row).items():
                if isinstance(value, Decimal):
                    safe_row[key] = float(value)
                elif isinstance(value, (datetime, date)):
                    safe_row[key] = value.isoformat()
                elif isinstance(value, uuid.UUID):
                    safe_row[key] = str(value)
                else:
                    safe_row[key] = value
            results.append(safe_row)

        return results
    except Exception as e:
        logger.error("SQL execution failed: %s\nSQL: %s\nParams: %s", str(e), sql[:200], params)
        raise
    finally:
        if conn:
            conn.close()


# ─────────────────────────────────────────────────────────────
# Pipeline Step 1: Intent Classification
# ─────────────────────────────────────────────────────────────


def classify_intent(question: str) -> Dict[str, Any]:
    """
    Classify the user's question into an intent category and extract entities.

    Args:
        question: The user's natural language question.

    Returns:
        Dict with keys: intent, confidence, entities, reasoning.
    """
    from orchestrator.prompts import INTENT_CLASSIFICATION_PROMPT

    response_text = _call_llm(
        system_prompt=INTENT_CLASSIFICATION_PROMPT,
        user_message=question,
        max_tokens=LLM_MAX_TOKENS_CLASSIFY,
    )

    result = _parse_json_response(response_text)

    # Validate required fields
    valid_intents = {
        "revenue_analysis", "complaint_investigation", "inventory_check",
        "forecast_request", "risk_assessment", "store_comparison", "general_qa",
    }
    if result.get("intent") not in valid_intents:
        logger.warning(
            "LLM returned unknown intent '%s', defaulting to general_qa",
            result.get("intent"),
        )
        result["intent"] = "general_qa"

    if "entities" not in result:
        result["entities"] = {}
    if "confidence" not in result:
        result["confidence"] = 0.5

    logger.info(
        "Intent classified: %s (confidence: %.2f)",
        result["intent"],
        result["confidence"],
    )
    return result


# ─────────────────────────────────────────────────────────────
# Pipeline Step 2: Plan Generation
# ─────────────────────────────────────────────────────────────


def generate_plan(question: str, intent_result: Dict[str, Any]) -> Dict[str, Any]:
    """
    Generate an execution plan specifying which data sources to query.

    Args:
        question: The user's original question.
        intent_result: The result from classify_intent().

    Returns:
        Dict with keys: sql_queries, ml_models, vector_searches, reasoning.
    """
    from orchestrator.prompts import PLAN_GENERATION_PROMPT

    plan_input = (
        f"User question: {question}\n\n"
        f"Classified intent: {intent_result['intent']}\n"
        f"Confidence: {intent_result['confidence']}\n"
        f"Extracted entities: {json.dumps(intent_result.get('entities', {}))}\n"
    )

    response_text = _call_llm(
        system_prompt=PLAN_GENERATION_PROMPT,
        user_message=plan_input,
        max_tokens=LLM_MAX_TOKENS_PLAN,
    )

    result = _parse_json_response(response_text)

    # Ensure required keys exist with defaults
    result.setdefault("sql_queries", [])
    result.setdefault("ml_models", [])
    result.setdefault("vector_searches", [])
    result.setdefault("reasoning", "")

    logger.info(
        "Plan generated: %d SQL queries, %d ML models, %d vector searches",
        len(result["sql_queries"]),
        len(result["ml_models"]),
        len(result["vector_searches"]),
    )
    return result


# ─────────────────────────────────────────────────────────────
# Pipeline Step 3: SQL Execution
# ─────────────────────────────────────────────────────────────


def execute_sql_queries(plan: Dict[str, Any]) -> Dict[str, List[Dict[str, Any]]]:
    """
    Execute all SQL queries specified in the plan.

    Args:
        plan: The execution plan from generate_plan().

    Returns:
        Dict mapping query template names to lists of row dicts.
    """
    from orchestrator.sql_generator import generate_query

    results = {}
    errors = []

    for query_spec in plan.get("sql_queries", []):
        template_name = query_spec.get("template", "")
        params = query_spec.get("params", {})

        try:
            sql, sql_params = generate_query(template_name, params)
            rows = _execute_sql(sql, sql_params)
            results[template_name] = rows
            logger.info(
                "SQL query '%s' returned %d rows",
                template_name,
                len(rows),
            )
        except Exception as e:
            error_msg = f"SQL query '{template_name}' failed: {str(e)}"
            logger.error(error_msg)
            errors.append(error_msg)
            results[template_name] = []

    return results


# ─────────────────────────────────────────────────────────────
# Store Name Resolution Helper
# ─────────────────────────────────────────────────────────────


def _resolve_store_params(plan: Dict[str, Any], question: str) -> None:
    """
    Resolve store/city names in the question to store_ids for ML models.

    Mutates plan in place — enriches ml_models[*].params with store_id
    when a city or store name from the question matches a DB record.
    """
    # Only resolve if an ML model needs a store_id but doesn't have one
    needs_resolution = False
    for spec in plan.get("ml_models", []):
        model = spec.get("model", "")
        params = spec.get("params", {})
        if model in ("forecaster", "root_cause_explainer") and not params.get("store_id"):
            needs_resolution = True
            break

    if not needs_resolution:
        return

    try:
        conn = _get_db_connection()
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                "SELECT store_id, store_name, city FROM stores WHERE is_active = true"
            )
            stores = cur.fetchall()
        conn.close()
    except Exception:
        logger.exception("Store resolution DB query failed")
        return

    q_lower = question.lower()
    matched_id = None
    for s in stores:
        city = (s.get("city") or "").lower()
        name = (s.get("store_name") or "").lower()
        if city and city in q_lower:
            matched_id = str(s["store_id"])
            break
        if name and name in q_lower:
            matched_id = str(s["store_id"])
            break

    if matched_id:
        for spec in plan.get("ml_models", []):
            model = spec.get("model", "")
            params = spec.get("params", {})
            if model in ("forecaster", "root_cause_explainer") and not params.get("store_id"):
                spec.setdefault("params", {})["store_id"] = matched_id
                logger.info("Resolved store_id=%s for model '%s'", matched_id, model)


# ─────────────────────────────────────────────────────────────
# Pipeline Step 4: ML Model Execution
# ─────────────────────────────────────────────────────────────


def execute_ml_models(plan: Dict[str, Any]) -> Dict[str, Any]:
    """
    Execute ML models specified in the plan by importing and calling directly.

    Args:
        plan: The execution plan from generate_plan().

    Returns:
        Dict mapping model names to their output data.
    """
    results = {}

    for model_spec in plan.get("ml_models", []):
        model_name = model_spec.get("model", "")
        params = model_spec.get("params", {})

        try:
            if model_name == "anomaly_detector":
                from models.anomaly_detector import AnomalyDetector
                detector = AnomalyDetector()
                store_ids = params.get("store_ids")
                if isinstance(store_ids, str):
                    store_ids = [store_ids]
                results[model_name] = detector.detect_from_db(store_ids=store_ids)

            elif model_name == "forecaster":
                from models.forecaster import Forecaster
                forecaster = Forecaster()
                store_id = params.get("store_id")
                metric = params.get("metric", "revenue")
                periods = params.get("periods", 90)
                if isinstance(periods, str):
                    periods = int(periods)
                if store_id:
                    results[model_name] = forecaster.forecast_from_db(
                        store_id=store_id,
                        metric=metric,
                        periods=periods,
                    )
                else:
                    results[model_name] = {"error": "store_id required for forecasting"}

            elif model_name == "issue_clusterer":
                from models.issue_clusterer import IssueClustered
                clusterer = IssueClustered()
                results[model_name] = clusterer.cluster_from_db()

            elif model_name == "root_cause_explainer":
                from models.root_cause_explainer import RootCauseExplainer
                explainer = RootCauseExplainer()
                target_metric = params.get("target_metric", "revenue_30d")
                # Resolve common LLM metric aliases to actual column names
                _METRIC_ALIASES = {
                    "revenue": "revenue_30d",
                    "complaints": "complaint_count_30d",
                    "transactions": "txn_count_30d",
                    "customers": "customer_count_30d",
                }
                target_metric = _METRIC_ALIASES.get(target_metric, target_metric)
                store_id = params.get("store_id")
                results[model_name] = explainer.explain_from_db(
                    target_metric=target_metric,
                    store_id=store_id,
                )

            elif model_name == "risk_scorer":
                from models.risk_scorer import RiskScorer
                scorer = RiskScorer()
                store_id = params.get("store_id")
                if store_id:
                    results[model_name] = scorer.score(store_id=store_id)
                else:
                    results[model_name] = scorer.score_all()

            else:
                logger.warning("Unknown ML model: %s", model_name)
                results[model_name] = {"error": f"Unknown model: {model_name}"}

            logger.info("ML model '%s' executed successfully", model_name)

        except Exception as e:
            error_msg = f"ML model '{model_name}' failed: {str(e)}"
            logger.error("%s\n%s", error_msg, traceback.format_exc())
            results[model_name] = {"error": error_msg}

    return results


# ─────────────────────────────────────────────────────────────
# Pipeline Step 5: Vector Search Execution
# ─────────────────────────────────────────────────────────────


def execute_vector_searches(
    plan: Dict[str, Any],
    question: str,
) -> Dict[str, List[Dict[str, Any]]]:
    """
    Execute vector similarity searches specified in the plan.

    Args:
        plan: The execution plan from generate_plan().
        question: The original user question (used as default query text).

    Returns:
        Dict mapping search names to lists of result dicts.
    """
    results = {}

    for search_spec in plan.get("vector_searches", []):
        search_name = search_spec.get("search", "")
        params = search_spec.get("params", {})

        try:
            if search_name == "similar_issues":
                from services.vector_service import similar_issue_search
                query_text = params.get("query_text", question)
                limit = params.get("limit", 5)
                raw_results = similar_issue_search(query_text, limit=limit)
                # Ensure JSON-serializable
                results[search_name] = _safe_serialize_list(raw_results)

            elif search_name == "similar_stores":
                from services.vector_service import cross_store_similarity
                store_id = params.get("store_id")
                if store_id:
                    limit = params.get("limit", 5)
                    raw_results = cross_store_similarity(store_id, limit=limit)
                    results[search_name] = _safe_serialize_list(raw_results)
                else:
                    results[search_name] = []

            elif search_name == "semantic_store_search":
                from services.vector_service import semantic_store_search
                query_text = params.get("query_text", question)
                limit = params.get("limit", 5)
                raw_results = semantic_store_search(query_text, limit=limit)
                results[search_name] = _safe_serialize_list(raw_results)

            elif search_name == "qa_context":
                from services.embedding_service import embed_text
                from services.vector_service import store_qa_context
                query_text = params.get("query_text", question)
                embedding = embed_text(query_text)
                limit = params.get("limit", 3)
                raw_results = store_qa_context(embedding, limit=limit)
                results[search_name] = _safe_serialize_list(raw_results)

            else:
                logger.warning("Unknown vector search: %s", search_name)
                results[search_name] = []

            logger.info(
                "Vector search '%s' returned %d results",
                search_name,
                len(results.get(search_name, [])),
            )

        except Exception as e:
            error_msg = f"Vector search '{search_name}' failed: {str(e)}"
            logger.error("%s\n%s", error_msg, traceback.format_exc())
            results[search_name] = []

    return results


def _safe_serialize_list(items: List[Dict]) -> List[Dict]:
    """Convert all values in a list of dicts to JSON-safe types."""
    safe_items = []
    for item in items:
        safe_item = {}
        for k, v in item.items():
            if isinstance(v, Decimal):
                safe_item[k] = float(v)
            elif isinstance(v, (datetime, date)):
                safe_item[k] = v.isoformat()
            elif isinstance(v, uuid.UUID):
                safe_item[k] = str(v)
            else:
                safe_item[k] = v
        safe_items.append(safe_item)
    return safe_items


# ─────────────────────────────────────────────────────────────
# Pipeline Step 6: Result Merging (via Context Builder)
# ─────────────────────────────────────────────────────────────

# This step is handled by context_builder.build_context()


# ─────────────────────────────────────────────────────────────
# Pipeline Step 7: Narrative Generation
# ─────────────────────────────────────────────────────────────


def generate_narrative(
    question: str,
    context: str,
) -> str:
    """
    Generate an executive narrative answering the user's question.

    Args:
        question: The user's original question.
        context: Formatted data context from the context builder.

    Returns:
        Narrative text string.
    """
    from orchestrator.prompts import SYSTEM_PROMPT, NARRATIVE_GENERATION_PROMPT

    full_system = f"{SYSTEM_PROMPT}\n\n{NARRATIVE_GENERATION_PROMPT}"

    user_message = (
        f"User Question: {question}\n\n"
        f"Data Context:\n{context}"
    )

    narrative = _call_llm(
        system_prompt=full_system,
        user_message=user_message,
        max_tokens=LLM_MAX_TOKENS_NARRATIVE,
        temperature=0.4,  # Slightly higher for more natural language
    )

    logger.info("Narrative generated: %d characters", len(narrative))
    return narrative


# ─────────────────────────────────────────────────────────────
# Pipeline Step 8: Visualization Selection
# ─────────────────────────────────────────────────────────────


def recommend_visualizations(
    question: str,
    context: str,
    narrative: str,
) -> List[Dict[str, Any]]:
    """
    Recommend chart types and visualization configurations.

    Args:
        question: The user's original question.
        context: The data context.
        narrative: The generated narrative.

    Returns:
        List of visualization recommendation dicts.
    """
    from orchestrator.prompts import VISUALIZATION_PROMPT

    user_message = (
        f"User Question: {question}\n\n"
        f"Narrative:\n{narrative}\n\n"
        f"Available Data Context:\n{context[:4000]}"
    )

    try:
        response_text = _call_llm(
            system_prompt=VISUALIZATION_PROMPT,
            user_message=user_message,
            max_tokens=LLM_MAX_TOKENS_VIZ,
        )

        result = _parse_json_response(response_text)
        visualizations = result.get("visualizations", [])

        # Validate chart types
        valid_types = {
            "line", "bar", "heatmap", "geo", "network", "radar",
            "waterfall", "forecast_cone", "risk_matrix", "decomposition_tree",
        }
        validated = []
        for viz in visualizations:
            if viz.get("type") in valid_types:
                validated.append(viz)
            else:
                logger.warning("Ignoring invalid chart type: %s", viz.get("type"))

        return validated

    except Exception as e:
        logger.error("Visualization recommendation failed: %s", str(e))
        return []


# ─────────────────────────────────────────────────────────────
# Pipeline Step 9: Follow-up Question Generation
# ─────────────────────────────────────────────────────────────


def generate_followups(
    question: str,
    narrative: str,
) -> List[str]:
    """
    Generate 2-3 follow-up questions an executive would logically ask next.

    Args:
        question: The user's original question.
        narrative: The generated narrative.

    Returns:
        List of follow-up question strings.
    """
    from orchestrator.prompts import FOLLOWUP_PROMPT

    user_message = (
        f"Original Question: {question}\n\n"
        f"Generated Narrative:\n{narrative}"
    )

    try:
        response_text = _call_llm(
            system_prompt=FOLLOWUP_PROMPT,
            user_message=user_message,
            max_tokens=LLM_MAX_TOKENS_FOLLOWUP,
        )

        result = _parse_json_response(response_text)
        followups = result.get("follow_up_questions", [])

        # Ensure we have at most 3 questions
        return followups[:3]

    except Exception as e:
        logger.error("Follow-up generation failed: %s", str(e))
        return []


# ─────────────────────────────────────────────────────────────
# Main Orchestration Pipeline
# ─────────────────────────────────────────────────────────────


def process_query(
    question: str,
    user_id: str,
    context: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """
    Process an executive question through the full orchestration pipeline.

    Pipeline steps:
    1. Intent Classification (GPT-4o)
    2. Plan Generation (GPT-4o)
    3. SQL Execution (psycopg2 parameterized queries)
    4. ML Model Execution (direct Python calls)
    5. Vector Search Execution (pgvector similarity)
    6. Result Merging (context builder)
    7. Narrative Generation (GPT-4o)
    8. Visualization Recommendation (GPT-4o)
    9. Follow-up Question Generation (GPT-4o)

    Args:
        question: The user's natural language question.
        user_id: UUID of the user asking the question.
        context: Optional additional context dict (e.g., current store, role).

    Returns:
        Dict with keys:
            - answer: Narrative text answering the question
            - data: Structured data used in the analysis
            - visualizations: List of recommended visualizations
            - follow_up_questions: List of suggested follow-up questions
            - execution_path: String describing which sources were used
            - sources: List of data source names used
            - metadata: Pipeline execution metadata
    """
    start_time = time.time()
    context = context or {}
    errors = []
    sources_used = []

    logger.info(
        "Processing query from user %s: '%s'",
        user_id,
        question[:100],
    )

    # ── Step 1: Intent Classification ──
    try:
        intent_result = classify_intent(question)
    except Exception as e:
        logger.error("Intent classification failed: %s", str(e))
        intent_result = {
            "intent": "general_qa",
            "confidence": 0.0,
            "entities": {},
            "reasoning": f"Classification failed: {str(e)}",
        }
        errors.append(f"Intent classification failed: {str(e)}")

    # ── Step 2: Plan Generation ──
    try:
        plan = generate_plan(question, intent_result)
    except Exception as e:
        logger.error("Plan generation failed: %s", str(e))
        plan = {
            "sql_queries": [],
            "ml_models": [],
            "vector_searches": [],
            "reasoning": f"Plan generation failed: {str(e)}",
        }
        errors.append(f"Plan generation failed: {str(e)}")

    # ── Step 2b: Geo Signal Detection ──
    _GEO_KEYWORDS = {"store", "stores", "region", "location", "map", "geographic", "density", "where"}
    question_lower = question.lower()
    if any(kw in question_lower for kw in _GEO_KEYWORDS):
        # Inject store_locations SQL if not already in plan
        existing_templates = {
            q.get("template") for q in (plan.get("sql_queries") or [])
        }
        if "store_locations" not in existing_templates:
            if plan.get("sql_queries") is None:
                plan["sql_queries"] = []
            plan["sql_queries"].append({
                "template": "store_locations",
                "params": {},
            })
            logger.info("Geo signal detected — injected store_locations SQL")

    # ── Step 3: SQL Execution ──
    sql_results = {}
    if plan.get("sql_queries"):
        try:
            sql_results = execute_sql_queries(plan)
            for template_name, rows in sql_results.items():
                if rows:
                    sources_used.append(template_name)
        except Exception as e:
            logger.error("SQL execution failed: %s", str(e))
            errors.append(f"SQL execution failed: {str(e)}")

    # ── Step 3b: Store Name Resolution ──
    # If ML models need a store_id but the plan has none, try resolving from question
    if plan.get("ml_models"):
        try:
            _resolve_store_params(plan, question)
        except Exception as e:
            logger.error("Store resolution failed: %s", str(e))

    # ── Step 4: ML Execution ──
    ml_results = {}
    if plan.get("ml_models"):
        try:
            ml_results = execute_ml_models(plan)
            for model_name, result in ml_results.items():
                if result and not (isinstance(result, dict) and "error" in result):
                    sources_used.append(model_name)
        except Exception as e:
            logger.error("ML execution failed: %s", str(e))
            errors.append(f"ML execution failed: {str(e)}")

    # ── Step 5: Vector Execution ──
    vector_results = {}
    if plan.get("vector_searches"):
        try:
            vector_results = execute_vector_searches(plan, question)
            for search_name, results in vector_results.items():
                if results:
                    sources_used.append(search_name)
        except Exception as e:
            logger.error("Vector execution failed: %s", str(e))
            errors.append(f"Vector search failed: {str(e)}")

    # ── Step 6: Context Building ──
    from orchestrator.context_builder import build_context
    data_context = build_context(
        sql_results=sql_results if sql_results else None,
        ml_results=ml_results if ml_results else None,
        vector_results=vector_results if vector_results else None,
        errors=errors if errors else None,
    )

    # ── Step 7: Narrative Generation ──
    try:
        narrative = generate_narrative(question, data_context)
    except Exception as e:
        logger.error("Narrative generation failed: %s", str(e))
        narrative = (
            "I was unable to generate a complete analysis due to a system error. "
            f"Error: {str(e)}. "
            "Please try again or rephrase your question."
        )
        errors.append(f"Narrative generation failed: {str(e)}")

    # ── Step 7b: Advisory Recommendations ──
    recommendations = []
    try:
        from orchestrator.advisory_engine import generate_recommendations
        risk_for_advisory = ml_results.get("risk_scorer", [])
        if not isinstance(risk_for_advisory, list):
            risk_for_advisory = []
        recommendations = generate_recommendations(
            risk_for_advisory, ml_results, sql_results,
        )
    except Exception as e:
        logger.error("Advisory engine failed: %s", str(e))

    # ── Step 8: Visualization Selection ──
    try:
        visualizations = recommend_visualizations(question, data_context, narrative)
    except Exception as e:
        logger.error("Visualization recommendation failed: %s", str(e))
        visualizations = []

    # ── Step 8b: Smart Chart Fallback ──
    # If LLM returned 0 visualizations, generate one from intent + data
    if not visualizations and intent_result.get("intent"):
        _INTENT_CHART_MAP = {
            "revenue_analysis": "line",
            "complaint_investigation": "bar",
            "forecast_request": "forecast_cone",
            "risk_assessment": "risk_matrix",
            "store_comparison": "radar",
            "inventory_check": "bar",
        }
        fallback_type = _INTENT_CHART_MAP.get(intent_result["intent"])
        if fallback_type:
            visualizations = [{
                "type": fallback_type,
                "title": question[:60],
                "description": "Auto-generated visualization based on query intent.",
                "data_keys": [],
                "priority": 1,
            }]
            logger.info("Auto-selected chart type '%s' for intent '%s'",
                        fallback_type, intent_result["intent"])

    # ── Step 8c: Chart Data Mapping ──
    # Build structured_data early so chart mapper can use it
    structured_data = {}
    if sql_results:
        structured_data["sql"] = sql_results
    if ml_results:
        structured_data["ml"] = ml_results
    if vector_results:
        structured_data["vector"] = vector_results

    # If geo signal detected and store_locations data exists, ensure a geo viz
    if sql_results.get("store_locations") and any(
        kw in question.lower()
        for kw in ("store", "region", "map", "density", "location", "geographic")
    ):
        has_geo = any(v.get("type") == "geo" for v in visualizations)
        if not has_geo:
            visualizations.insert(0, {
                "type": "geo",
                "title": "Store Map",
                "description": "Geographic distribution of stores.",
                "data_keys": [],
                "priority": 1,
            })
            logger.info("Geo signal + store_locations data → injected geo visualization")

    # Attach chart-ready data to each visualization
    if visualizations:
        try:
            from orchestrator.chart_data_mapper import prepare_chart_data
            visualizations = prepare_chart_data(visualizations, structured_data)
        except Exception as e:
            logger.error("Chart data mapping failed: %s", str(e))

    # ── Step 9: Follow-up Generation ──
    try:
        follow_ups = generate_followups(question, narrative)
    except Exception as e:
        logger.error("Follow-up generation failed: %s", str(e))
        follow_ups = []

    # ── Build Execution Path String ──
    path_parts = []
    if sql_results:
        sql_names = [k for k, v in sql_results.items() if v]
        if sql_names:
            path_parts.append(f"SQL({', '.join(sql_names)})")
    if ml_results:
        ml_names = [k for k, v in ml_results.items()
                    if v and not (isinstance(v, dict) and "error" in v)]
        if ml_names:
            path_parts.append(f"ML({', '.join(ml_names)})")
    if vector_results:
        vec_names = [k for k, v in vector_results.items() if v]
        if vec_names:
            path_parts.append(f"Vector({', '.join(vec_names)})")

    execution_path = " + ".join(path_parts) if path_parts else "No data sources executed"

    elapsed = time.time() - start_time

    response = {
        "answer": narrative,
        "data": structured_data,
        "visualizations": visualizations,
        "recommendations": recommendations,
        "follow_up_questions": follow_ups,
        "execution_path": execution_path,
        "sources": sources_used,
        "metadata": {
            "intent": intent_result.get("intent"),
            "intent_confidence": intent_result.get("confidence"),
            "execution_time_seconds": round(elapsed, 2),
            "errors": errors if errors else None,
            "user_id": user_id,
        },
    }

    logger.info(
        "Query processed in %.2fs. Intent: %s, Path: %s",
        elapsed,
        intent_result.get("intent"),
        execution_path,
    )

    return response
