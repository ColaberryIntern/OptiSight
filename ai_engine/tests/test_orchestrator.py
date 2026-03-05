"""
Tests for the LLM Orchestration Engine (Phase 4).

Covers:
- orchestrator/prompts.py — Prompt string validation
- orchestrator/sql_generator.py — Parameterized query generation
- orchestrator/context_builder.py — Context formatting and token budgets
- orchestrator/query_engine.py — Pipeline steps with mocked LLM/DB calls
- routes/orchestrator_routes.py — Flask endpoint validation
"""

import json
import sys
import os
from datetime import datetime, date
from decimal import Decimal
from unittest.mock import patch, MagicMock

import pytest

# Add ai_engine root to path so imports work
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


# ═════════════════════════════════════════════════════════════
# SECTION 1: Prompt Tests
# ═════════════════════════════════════════════════════════════


class TestPrompts:
    """Tests for orchestrator/prompts.py — validate prompt definitions."""

    def test_system_prompt_exists_and_nonempty(self):
        from orchestrator.prompts import SYSTEM_PROMPT
        assert isinstance(SYSTEM_PROMPT, str)
        assert len(SYSTEM_PROMPT) > 100

    def test_system_prompt_contains_optisight_persona(self):
        from orchestrator.prompts import SYSTEM_PROMPT
        assert "OptiSight" in SYSTEM_PROMPT
        assert "optical" in SYSTEM_PROMPT.lower()

    def test_intent_classification_prompt_has_all_intents(self):
        from orchestrator.prompts import INTENT_CLASSIFICATION_PROMPT
        expected_intents = [
            "revenue_analysis",
            "complaint_investigation",
            "inventory_check",
            "forecast_request",
            "risk_assessment",
            "store_comparison",
            "general_qa",
        ]
        for intent in expected_intents:
            assert intent in INTENT_CLASSIFICATION_PROMPT

    def test_plan_generation_prompt_has_all_templates(self):
        from orchestrator.prompts import PLAN_GENERATION_PROMPT
        expected_templates = [
            "store_performance",
            "revenue_trends",
            "issue_analysis",
            "inventory_status",
            "exam_metrics",
            "customer_metrics",
            "top_products",
        ]
        for template in expected_templates:
            assert template in PLAN_GENERATION_PROMPT

    def test_plan_generation_prompt_has_all_models(self):
        from orchestrator.prompts import PLAN_GENERATION_PROMPT
        expected_models = [
            "anomaly_detector",
            "forecaster",
            "issue_clusterer",
            "root_cause_explainer",
            "risk_scorer",
        ]
        for model in expected_models:
            assert model in PLAN_GENERATION_PROMPT

    def test_visualization_prompt_has_all_chart_types(self):
        from orchestrator.prompts import VISUALIZATION_PROMPT
        expected_types = [
            "line", "bar", "heatmap", "geo", "network",
            "radar", "waterfall", "forecast_cone", "risk_matrix",
            "decomposition_tree",
        ]
        for chart_type in expected_types:
            assert chart_type in VISUALIZATION_PROMPT

    def test_narrative_generation_prompt_exists(self):
        from orchestrator.prompts import NARRATIVE_GENERATION_PROMPT
        assert isinstance(NARRATIVE_GENERATION_PROMPT, str)
        assert len(NARRATIVE_GENERATION_PROMPT) > 50

    def test_followup_prompt_exists(self):
        from orchestrator.prompts import FOLLOWUP_PROMPT
        assert isinstance(FOLLOWUP_PROMPT, str)
        assert "follow-up" in FOLLOWUP_PROMPT.lower() or "follow_up" in FOLLOWUP_PROMPT.lower()


# ═════════════════════════════════════════════════════════════
# SECTION 2: SQL Generator Tests
# ═════════════════════════════════════════════════════════════


class TestSQLGenerator:
    """Tests for orchestrator/sql_generator.py — safe parameterized queries."""

    def test_store_performance_no_filters(self):
        from orchestrator.sql_generator import store_performance
        sql, params = store_performance()
        assert "store_performance_features" in sql
        assert "ORDER BY store_id" in sql
        assert params == ()

    def test_store_performance_with_store_id(self):
        from orchestrator.sql_generator import store_performance
        sql, params = store_performance(store_id="abc-123")
        assert "store_id = %s" in sql
        assert params == ("abc-123",)

    def test_store_performance_with_region(self):
        from orchestrator.sql_generator import store_performance
        sql, params = store_performance(region="Northeast")
        assert "region = %s" in sql
        assert params == ("Northeast",)

    def test_store_performance_with_both_filters(self):
        from orchestrator.sql_generator import store_performance
        sql, params = store_performance(store_id="abc-123", region="Northeast")
        assert "store_id = %s" in sql
        assert "region = %s" in sql
        assert len(params) == 2

    def test_revenue_trends_default(self):
        from orchestrator.sql_generator import revenue_trends
        sql, params = revenue_trends()
        assert "transactions" in sql
        assert "SUM" in sql
        assert params[0] == 90  # default days

    def test_revenue_trends_with_store_and_days(self):
        from orchestrator.sql_generator import revenue_trends
        sql, params = revenue_trends(store_id="store-1", days=30)
        assert "store_id = %s" in sql
        assert params == (30, "store-1")

    def test_issue_analysis_no_filters(self):
        from orchestrator.sql_generator import issue_analysis
        sql, params = issue_analysis()
        assert "issues" in sql
        assert "complaint_id" in sql
        assert "LIMIT 100" in sql
        assert params == ()

    def test_issue_analysis_all_filters(self):
        from orchestrator.sql_generator import issue_analysis
        sql, params = issue_analysis(
            store_id="store-1", status="open", category="lens"
        )
        assert "store_id = %s" in sql
        assert "status = %s" in sql
        assert "category = %s" in sql
        assert len(params) == 3

    def test_inventory_status_no_filters(self):
        from orchestrator.sql_generator import inventory_status
        sql, params = inventory_status()
        assert "inventory_risk_features" in sql
        assert params == ()

    def test_inventory_status_with_filters(self):
        from orchestrator.sql_generator import inventory_status
        sql, params = inventory_status(product_type="frames", store_id="s1")
        assert "store_id = %s" in sql
        assert "product_type = %s" in sql
        assert len(params) == 2

    def test_exam_metrics_default(self):
        from orchestrator.sql_generator import exam_metrics
        sql, params = exam_metrics()
        assert "eye_exams" in sql
        assert "total_exams" in sql
        assert params[0] == 90  # default days

    def test_exam_metrics_with_store(self):
        from orchestrator.sql_generator import exam_metrics
        sql, params = exam_metrics(store_id="s1", days=30)
        assert "store_id = %s" in sql
        assert params == (30, "s1")

    def test_customer_metrics_no_filters(self):
        from orchestrator.sql_generator import customer_metrics
        sql, params = customer_metrics()
        assert "customer_behavior_features" in sql
        assert params == ()

    def test_customer_metrics_with_store(self):
        from orchestrator.sql_generator import customer_metrics
        sql, params = customer_metrics(store_id="s1")
        assert "store_id = %s" in sql
        assert params == ("s1",)

    def test_top_products_default(self):
        from orchestrator.sql_generator import top_products
        sql, params = top_products()
        assert "products" in sql
        assert "total_revenue" in sql
        assert "LIMIT %s" in sql
        assert params[-1] == 10  # default limit

    def test_top_products_with_store_and_limit(self):
        from orchestrator.sql_generator import top_products
        sql, params = top_products(store_id="s1", limit=5)
        assert "store_id = %s" in sql
        assert params == ("s1", 5)

    def test_generate_query_valid_template(self):
        from orchestrator.sql_generator import generate_query
        sql, params = generate_query("store_performance", {"store_id": "abc"})
        assert "store_performance_features" in sql
        assert "abc" in params

    def test_generate_query_invalid_template_raises(self):
        from orchestrator.sql_generator import generate_query
        with pytest.raises(ValueError, match="Unknown SQL template"):
            generate_query("nonexistent_template", {})

    def test_generate_query_ignores_none_params(self):
        from orchestrator.sql_generator import generate_query
        sql, params = generate_query(
            "store_performance", {"store_id": None, "region": "West"}
        )
        assert "region = %s" in sql
        assert "West" in params
        # store_id=None should be excluded
        assert len(params) == 1

    def test_generate_query_ignores_unknown_params(self):
        from orchestrator.sql_generator import generate_query
        sql, params = generate_query(
            "store_performance", {"store_id": "x", "unknown_param": "y"}
        )
        assert params == ("x",)

    def test_no_string_interpolation_in_queries(self):
        """Ensure no f-strings or .format() in generated SQL."""
        from orchestrator.sql_generator import TEMPLATE_REGISTRY
        for name, fn in TEMPLATE_REGISTRY.items():
            # Call each with no params
            sql, params = fn()
            # SQL should only contain %s placeholders for parameters, no
            # direct value injection
            assert "f'" not in sql, f"Template {name} uses f-string"
            assert ".format(" not in sql, f"Template {name} uses .format()"


# ═════════════════════════════════════════════════════════════
# SECTION 3: Context Builder Tests
# ═════════════════════════════════════════════════════════════


class TestContextBuilder:
    """Tests for orchestrator/context_builder.py — context formatting."""

    def test_build_context_empty_inputs(self):
        from orchestrator.context_builder import build_context
        result = build_context()
        # Should return an empty string (no sections)
        assert isinstance(result, str)

    def test_build_context_with_sql_results(self):
        from orchestrator.context_builder import build_context
        sql_results = {
            "store_performance": [
                {"store_id": "s1", "revenue_30d": 50000, "complaint_count": 5},
                {"store_id": "s2", "revenue_30d": 75000, "complaint_count": 2},
            ]
        }
        result = build_context(sql_results=sql_results)
        assert "DATABASE QUERY RESULTS" in result
        assert "store_performance" in result
        assert "2 rows" in result

    def test_build_context_with_ml_results(self):
        from orchestrator.context_builder import build_context
        ml_results = {
            "anomaly_detector": [
                {
                    "store_id": "s1",
                    "anomaly_score": -0.15,
                    "is_anomaly": True,
                    "feature_contributions": {"revenue": 0.6, "complaints": 0.4},
                },
            ]
        }
        result = build_context(ml_results=ml_results)
        assert "ML MODEL RESULTS" in result
        assert "anomaly_detector" in result
        assert "anomalous" in result.lower()

    def test_build_context_with_vector_results(self):
        from orchestrator.context_builder import build_context
        vector_results = {
            "similar_issues": [
                {
                    "complaint_id": "c1",
                    "description": "Broken lens frame",
                    "category": "product_defect",
                    "similarity_score": 0.95,
                },
            ]
        }
        result = build_context(vector_results=vector_results)
        assert "SEMANTIC SEARCH RESULTS" in result
        assert "similar_issues" in result

    def test_build_context_with_errors(self):
        from orchestrator.context_builder import build_context
        errors = ["SQL query failed: connection refused"]
        result = build_context(errors=errors)
        assert "DATA SOURCE NOTES" in result
        assert "connection refused" in result

    def test_build_context_combined(self):
        from orchestrator.context_builder import build_context
        result = build_context(
            sql_results={"test_query": [{"col1": "val1"}]},
            ml_results={"risk_scorer": [{"store_id": "s1", "risk_score": 75.0, "risk_level": "high"}]},
            vector_results={"qa_context": [{"question": "test?", "answer": "yes", "similarity_score": 0.9}]},
            errors=["Minor warning"],
        )
        assert "DATABASE QUERY RESULTS" in result
        assert "ML MODEL RESULTS" in result
        assert "SEMANTIC SEARCH RESULTS" in result
        assert "DATA SOURCE NOTES" in result

    def test_format_currency_helper(self):
        from orchestrator.context_builder import _format_currency
        assert "$" in _format_currency(1234567)
        assert "M" in _format_currency(1234567)
        assert "$50,000" == _format_currency(50000)
        assert "$9.99" == _format_currency(9.99)

    def test_format_percentage_helper(self):
        from orchestrator.context_builder import _format_percentage
        assert _format_percentage(75.5) == "75.5%"
        assert _format_percentage(100) == "100.0%"

    def test_format_number_helper(self):
        from orchestrator.context_builder import _format_number
        assert _format_number(1234) == "1,234"
        assert _format_number(1234.56) == "1,234.56"

    def test_safe_serialize_decimal(self):
        from orchestrator.context_builder import _safe_serialize
        result = _safe_serialize(Decimal("123.45"))
        assert isinstance(result, float)
        assert result == 123.45

    def test_safe_serialize_datetime(self):
        from orchestrator.context_builder import _safe_serialize
        dt = datetime(2024, 1, 15, 10, 30, 0)
        result = _safe_serialize(dt)
        assert result == "2024-01-15T10:30:00"

    def test_safe_serialize_date(self):
        from orchestrator.context_builder import _safe_serialize
        d = date(2024, 6, 15)
        result = _safe_serialize(d)
        assert result == "2024-06-15"

    def test_safe_serialize_none(self):
        from orchestrator.context_builder import _safe_serialize
        assert _safe_serialize(None) is None

    def test_detect_column_type(self):
        from orchestrator.context_builder import _detect_column_type
        assert _detect_column_type("total_revenue") == "currency"
        assert _detect_column_type("avg_amount") == "currency"
        assert _detect_column_type("conversion_rate") == "percentage"
        assert _detect_column_type("complaint_count") == "count"
        assert _detect_column_type("created_at") == "date"
        assert _detect_column_type("store_id") == "id"
        assert _detect_column_type("some_metric") == "number"

    def test_large_result_set_summarized(self):
        from orchestrator.context_builder import _format_sql_results
        # Create 100 rows to trigger summary mode
        rows = [
            {"store_id": f"s{i}", "revenue_30d": 1000 * i, "complaint_count": i}
            for i in range(100)
        ]
        result = _format_sql_results("big_query", rows)
        assert "100 rows" in result
        assert "summary" in result.lower()
        assert "avg=" in result or "min=" in result

    def test_small_result_set_full_detail(self):
        from orchestrator.context_builder import _format_sql_results
        rows = [
            {"store_id": "s1", "revenue_30d": 50000},
            {"store_id": "s2", "revenue_30d": 75000},
        ]
        result = _format_sql_results("small_query", rows)
        assert "2 rows" in result
        assert "Row 1" in result
        assert "Row 2" in result

    def test_empty_results(self):
        from orchestrator.context_builder import _format_sql_results
        result = _format_sql_results("empty_query", [])
        assert "No data returned" in result

    def test_context_truncation(self):
        from orchestrator.context_builder import build_context, MAX_CONTEXT_CHARS
        # Create a very large SQL result
        huge_rows = [
            {"store_id": f"s{i}", "description": "x" * 500}
            for i in range(500)
        ]
        result = build_context(sql_results={"huge": huge_rows})
        assert len(result) <= MAX_CONTEXT_CHARS + 100  # small buffer for truncation message

    def test_format_ml_risk_scorer(self):
        from orchestrator.context_builder import _format_ml_results
        results = [
            {"store_id": "s1", "risk_score": 85.0, "risk_level": "critical"},
            {"store_id": "s2", "risk_score": 45.0, "risk_level": "medium"},
        ]
        text = _format_ml_results("risk_scorer", results)
        assert "risk_scorer" in text
        assert "Scored 2 stores" in text
        assert "critical" in text

    def test_format_ml_forecaster(self):
        from orchestrator.context_builder import _format_ml_results
        results = {
            "trend": "upward",
            "summary": {"data_points": 90, "mean": 15000},
            "forecast": [
                {"date": "2024-06-01", "predicted": 16000, "lower": 14000, "upper": 18000},
                {"date": "2024-06-02", "predicted": 16100, "lower": 14100, "upper": 18100},
            ],
        }
        text = _format_ml_results("forecaster", results)
        assert "forecaster" in text
        assert "upward" in text

    def test_format_ml_issue_clusterer(self):
        from orchestrator.context_builder import _format_ml_results
        results = {
            "clusters": [
                {"cluster_id": 0, "top_keywords": ["lens", "frame"], "issue_count": 15},
                {"cluster_id": 1, "top_keywords": ["wait", "time"], "issue_count": 8},
            ],
            "noise_count": 3,
            "total_issues": 26,
        }
        text = _format_ml_results("issue_clusterer", results)
        assert "2 clusters" in text
        assert "26 issues" in text

    def test_format_ml_root_cause(self):
        from orchestrator.context_builder import _format_ml_results
        results = {
            "global_importance": [
                {"feature": "exam_count", "importance": 0.35, "direction": "positive"},
            ],
            "model_performance": {
                "r_squared": 0.87,
                "n_features": 10,
                "n_samples": 50,
            },
        }
        text = _format_ml_results("root_cause_explainer", results)
        assert "R-squared" in text
        assert "exam_count" in text

    def test_format_vector_similar_issues(self):
        from orchestrator.context_builder import _format_vector_results
        results = [
            {
                "complaint_id": "c1",
                "description": "Scratched lens coating",
                "category": "product_defect",
                "similarity_score": 0.93,
            },
        ]
        text = _format_vector_results("similar_issues", results)
        assert "similar_issues" in text
        assert "0.930" in text
        assert "Scratched lens" in text

    def test_format_vector_similar_stores(self):
        from orchestrator.context_builder import _format_vector_results
        results = [
            {
                "store_id": "s5",
                "store_name": "OptiStore West",
                "region": "West",
                "summary_text": "High volume store with good conversion",
                "similarity_score": 0.88,
            },
        ]
        text = _format_vector_results("similar_stores", results)
        assert "OptiStore West" in text
        assert "0.880" in text

    def test_format_vector_empty(self):
        from orchestrator.context_builder import _format_vector_results
        text = _format_vector_results("some_search", [])
        assert "No results found" in text


# ═════════════════════════════════════════════════════════════
# SECTION 4: Query Engine Tests (with mocked LLM and DB)
# ═════════════════════════════════════════════════════════════


class TestQueryEngineHelpers:
    """Test helper functions in query_engine.py."""

    def test_parse_json_response_clean(self):
        from orchestrator.query_engine import _parse_json_response
        result = _parse_json_response('{"key": "value"}')
        assert result == {"key": "value"}

    def test_parse_json_response_with_markdown_wrapper(self):
        from orchestrator.query_engine import _parse_json_response
        result = _parse_json_response('```json\n{"key": "value"}\n```')
        assert result == {"key": "value"}

    def test_parse_json_response_with_generic_code_block(self):
        from orchestrator.query_engine import _parse_json_response
        result = _parse_json_response('```\n{"key": "value"}\n```')
        assert result == {"key": "value"}

    def test_parse_json_response_invalid_raises(self):
        from orchestrator.query_engine import _parse_json_response
        with pytest.raises(ValueError, match="invalid JSON"):
            _parse_json_response("not json at all")

    def test_safe_serialize_list(self):
        from orchestrator.query_engine import _safe_serialize_list
        import uuid as uuid_mod
        items = [
            {
                "id": uuid_mod.UUID("12345678-1234-5678-1234-567812345678"),
                "amount": Decimal("99.99"),
                "created_at": datetime(2024, 1, 15),
                "name": "test",
            }
        ]
        result = _safe_serialize_list(items)
        assert result[0]["id"] == "12345678-1234-5678-1234-567812345678"
        assert result[0]["amount"] == 99.99
        assert result[0]["created_at"] == "2024-01-15T00:00:00"
        assert result[0]["name"] == "test"


class TestClassifyIntent:
    """Test intent classification with mocked LLM."""

    @patch("orchestrator.query_engine._call_llm")
    def test_classify_revenue_intent(self, mock_llm):
        from orchestrator.query_engine import classify_intent
        mock_llm.return_value = json.dumps({
            "intent": "revenue_analysis",
            "confidence": 0.95,
            "entities": {"store_id": "s1", "time_period": "last 30 days"},
            "reasoning": "Question asks about revenue",
        })

        result = classify_intent("What is the revenue for store S1?")
        assert result["intent"] == "revenue_analysis"
        assert result["confidence"] == 0.95
        assert result["entities"]["store_id"] == "s1"

    @patch("orchestrator.query_engine._call_llm")
    def test_classify_unknown_intent_defaults_to_general_qa(self, mock_llm):
        from orchestrator.query_engine import classify_intent
        mock_llm.return_value = json.dumps({
            "intent": "unknown_type",
            "confidence": 0.3,
            "entities": {},
            "reasoning": "Could not classify",
        })

        result = classify_intent("What is going on?")
        assert result["intent"] == "general_qa"

    @patch("orchestrator.query_engine._call_llm")
    def test_classify_missing_entities_defaults_to_empty(self, mock_llm):
        from orchestrator.query_engine import classify_intent
        mock_llm.return_value = json.dumps({
            "intent": "general_qa",
            "confidence": 0.8,
        })

        result = classify_intent("Hello")
        assert result["entities"] == {}

    @patch("orchestrator.query_engine._call_llm")
    def test_classify_all_valid_intents(self, mock_llm):
        from orchestrator.query_engine import classify_intent
        valid_intents = [
            "revenue_analysis", "complaint_investigation", "inventory_check",
            "forecast_request", "risk_assessment", "store_comparison", "general_qa",
        ]
        for intent in valid_intents:
            mock_llm.return_value = json.dumps({
                "intent": intent,
                "confidence": 0.9,
                "entities": {},
                "reasoning": "test",
            })
            result = classify_intent("test question")
            assert result["intent"] == intent


class TestGeneratePlan:
    """Test plan generation with mocked LLM."""

    @patch("orchestrator.query_engine._call_llm")
    def test_plan_with_sql_and_ml(self, mock_llm):
        from orchestrator.query_engine import generate_plan
        mock_llm.return_value = json.dumps({
            "sql_queries": [
                {"template": "store_performance", "params": {"store_id": "s1"}}
            ],
            "ml_models": [
                {"model": "anomaly_detector", "params": {"store_ids": ["s1"]}}
            ],
            "vector_searches": [],
            "reasoning": "Need store data and anomaly check",
        })

        intent_result = {
            "intent": "risk_assessment",
            "confidence": 0.9,
            "entities": {"store_id": "s1"},
        }

        result = generate_plan("Is store s1 at risk?", intent_result)
        assert len(result["sql_queries"]) == 1
        assert len(result["ml_models"]) == 1
        assert result["sql_queries"][0]["template"] == "store_performance"

    @patch("orchestrator.query_engine._call_llm")
    def test_plan_defaults_empty_arrays(self, mock_llm):
        from orchestrator.query_engine import generate_plan
        mock_llm.return_value = json.dumps({
            "reasoning": "Simple greeting",
        })

        result = generate_plan("Hello", {"intent": "general_qa", "confidence": 0.9, "entities": {}})
        assert result["sql_queries"] == []
        assert result["ml_models"] == []
        assert result["vector_searches"] == []


class TestExecuteSQLQueries:
    """Test SQL query execution with mocked database."""

    @patch("orchestrator.query_engine._execute_sql")
    def test_execute_sql_queries_success(self, mock_exec):
        from orchestrator.query_engine import execute_sql_queries
        mock_exec.return_value = [
            {"store_id": "s1", "revenue_30d": 50000.0},
        ]

        plan = {
            "sql_queries": [
                {"template": "store_performance", "params": {"store_id": "s1"}}
            ]
        }
        results = execute_sql_queries(plan)
        assert "store_performance" in results
        assert len(results["store_performance"]) == 1

    @patch("orchestrator.query_engine._execute_sql")
    def test_execute_sql_queries_failure_returns_empty(self, mock_exec):
        from orchestrator.query_engine import execute_sql_queries
        mock_exec.side_effect = Exception("Connection refused")

        plan = {
            "sql_queries": [
                {"template": "store_performance", "params": {}}
            ]
        }
        results = execute_sql_queries(plan)
        assert results["store_performance"] == []

    def test_execute_sql_queries_empty_plan(self):
        from orchestrator.query_engine import execute_sql_queries
        results = execute_sql_queries({"sql_queries": []})
        assert results == {}


class TestExecuteMLModels:
    """Test ML model execution with mocked models."""

    @patch("models.anomaly_detector.AnomalyDetector.detect_from_db")
    def test_execute_anomaly_detector(self, mock_detect):
        from orchestrator.query_engine import execute_ml_models
        mock_detect.return_value = [
            {"store_id": "s1", "anomaly_score": -0.15, "is_anomaly": True},
        ]

        plan = {
            "ml_models": [
                {"model": "anomaly_detector", "params": {"store_ids": ["s1"]}}
            ]
        }
        results = execute_ml_models(plan)
        assert "anomaly_detector" in results
        assert len(results["anomaly_detector"]) == 1

    @patch("models.risk_scorer.RiskScorer.score_all")
    def test_execute_risk_scorer_all(self, mock_score):
        from orchestrator.query_engine import execute_ml_models
        mock_score.return_value = [
            {"store_id": "s1", "risk_score": 75.0, "risk_level": "high"},
        ]

        plan = {
            "ml_models": [
                {"model": "risk_scorer", "params": {}}
            ]
        }
        results = execute_ml_models(plan)
        assert "risk_scorer" in results

    @patch("models.risk_scorer.RiskScorer.score")
    def test_execute_risk_scorer_single_store(self, mock_score):
        from orchestrator.query_engine import execute_ml_models
        mock_score.return_value = [
            {"store_id": "s1", "risk_score": 75.0, "risk_level": "high"},
        ]

        plan = {
            "ml_models": [
                {"model": "risk_scorer", "params": {"store_id": "s1"}}
            ]
        }
        results = execute_ml_models(plan)
        assert "risk_scorer" in results
        mock_score.assert_called_once_with(store_id="s1")

    def test_execute_unknown_model(self):
        from orchestrator.query_engine import execute_ml_models
        plan = {
            "ml_models": [
                {"model": "nonexistent_model", "params": {}}
            ]
        }
        results = execute_ml_models(plan)
        assert "error" in results["nonexistent_model"]

    def test_execute_ml_empty_plan(self):
        from orchestrator.query_engine import execute_ml_models
        results = execute_ml_models({"ml_models": []})
        assert results == {}

    @patch("models.anomaly_detector.AnomalyDetector.detect_from_db")
    def test_execute_ml_handles_exception(self, mock_detect):
        from orchestrator.query_engine import execute_ml_models
        mock_detect.side_effect = RuntimeError("DB down")

        plan = {
            "ml_models": [
                {"model": "anomaly_detector", "params": {}}
            ]
        }
        results = execute_ml_models(plan)
        assert "error" in results["anomaly_detector"]
        assert "DB down" in results["anomaly_detector"]["error"]


class TestExecuteVectorSearches:
    """Test vector search execution with mocked services."""

    @patch("services.vector_service.similar_issue_search")
    def test_execute_similar_issues(self, mock_search):
        from orchestrator.query_engine import execute_vector_searches
        mock_search.return_value = [
            {
                "complaint_id": "c1",
                "description": "broken lens",
                "similarity_score": Decimal("0.95"),
            },
        ]

        plan = {
            "vector_searches": [
                {"search": "similar_issues", "params": {"query_text": "broken frames"}}
            ]
        }
        results = execute_vector_searches(plan, "broken frames")
        assert "similar_issues" in results
        assert len(results["similar_issues"]) == 1
        # Decimal should be converted to float
        assert isinstance(results["similar_issues"][0]["similarity_score"], float)

    @patch("services.vector_service.similar_issue_search")
    def test_execute_vector_search_failure_returns_empty(self, mock_search):
        from orchestrator.query_engine import execute_vector_searches
        mock_search.side_effect = Exception("Connection error")

        plan = {
            "vector_searches": [
                {"search": "similar_issues", "params": {}}
            ]
        }
        results = execute_vector_searches(plan, "test query")
        assert results["similar_issues"] == []

    def test_execute_vector_unknown_search(self):
        from orchestrator.query_engine import execute_vector_searches
        plan = {
            "vector_searches": [
                {"search": "nonexistent_search", "params": {}}
            ]
        }
        results = execute_vector_searches(plan, "test")
        assert results["nonexistent_search"] == []

    def test_execute_vector_empty_plan(self):
        from orchestrator.query_engine import execute_vector_searches
        results = execute_vector_searches({"vector_searches": []}, "test")
        assert results == {}


class TestNarrativeGeneration:
    """Test narrative generation with mocked LLM."""

    @patch("orchestrator.query_engine._call_llm")
    def test_generate_narrative(self, mock_llm):
        from orchestrator.query_engine import generate_narrative
        mock_llm.return_value = "Store S1 generated $50,000 in revenue over the last 30 days."

        result = generate_narrative(
            "What is the revenue for store S1?",
            "[store_performance] store_id: s1, revenue_30d: $50,000",
        )
        assert "50,000" in result
        assert isinstance(result, str)


class TestVisualizationRecommendation:
    """Test visualization recommendation with mocked LLM."""

    @patch("orchestrator.query_engine._call_llm")
    def test_recommend_visualizations(self, mock_llm):
        from orchestrator.query_engine import recommend_visualizations
        mock_llm.return_value = json.dumps({
            "visualizations": [
                {
                    "type": "line",
                    "title": "Revenue Trend",
                    "description": "Daily revenue over time",
                    "data_keys": ["date", "daily_revenue"],
                    "priority": 1,
                },
                {
                    "type": "bar",
                    "title": "Store Comparison",
                    "description": "Revenue by store",
                    "data_keys": ["store_id", "revenue_30d"],
                    "priority": 2,
                },
            ]
        })

        result = recommend_visualizations(
            "Show me revenue trends",
            "context data",
            "narrative text",
        )
        assert len(result) == 2
        assert result[0]["type"] == "line"
        assert result[1]["type"] == "bar"

    @patch("orchestrator.query_engine._call_llm")
    def test_recommend_filters_invalid_chart_types(self, mock_llm):
        from orchestrator.query_engine import recommend_visualizations
        mock_llm.return_value = json.dumps({
            "visualizations": [
                {"type": "line", "title": "Valid", "description": "ok", "data_keys": [], "priority": 1},
                {"type": "pie_chart", "title": "Invalid", "description": "bad", "data_keys": [], "priority": 2},
            ]
        })

        result = recommend_visualizations("question", "context", "narrative")
        assert len(result) == 1
        assert result[0]["type"] == "line"

    @patch("orchestrator.query_engine._call_llm")
    def test_recommend_handles_llm_failure(self, mock_llm):
        from orchestrator.query_engine import recommend_visualizations
        mock_llm.side_effect = RuntimeError("API error")

        result = recommend_visualizations("question", "context", "narrative")
        assert result == []


class TestFollowupGeneration:
    """Test follow-up question generation with mocked LLM."""

    @patch("orchestrator.query_engine._call_llm")
    def test_generate_followups(self, mock_llm):
        from orchestrator.query_engine import generate_followups
        mock_llm.return_value = json.dumps({
            "follow_up_questions": [
                "How does this compare to last quarter?",
                "Which product category is driving the decline?",
                "What is the forecast for next month?",
            ]
        })

        result = generate_followups("What is the revenue?", "Revenue is $50K.")
        assert len(result) == 3
        assert "quarter" in result[0]

    @patch("orchestrator.query_engine._call_llm")
    def test_generate_followups_limits_to_3(self, mock_llm):
        from orchestrator.query_engine import generate_followups
        mock_llm.return_value = json.dumps({
            "follow_up_questions": ["Q1?", "Q2?", "Q3?", "Q4?", "Q5?"]
        })

        result = generate_followups("question", "narrative")
        assert len(result) == 3

    @patch("orchestrator.query_engine._call_llm")
    def test_generate_followups_handles_failure(self, mock_llm):
        from orchestrator.query_engine import generate_followups
        mock_llm.side_effect = RuntimeError("API error")

        result = generate_followups("question", "narrative")
        assert result == []


class TestProcessQuery:
    """Test the full orchestration pipeline with all steps mocked."""

    @patch("orchestrator.query_engine.generate_followups")
    @patch("orchestrator.query_engine.recommend_visualizations")
    @patch("orchestrator.query_engine.generate_narrative")
    @patch("orchestrator.query_engine.execute_vector_searches")
    @patch("orchestrator.query_engine.execute_ml_models")
    @patch("orchestrator.query_engine.execute_sql_queries")
    @patch("orchestrator.query_engine.generate_plan")
    @patch("orchestrator.query_engine.classify_intent")
    def test_full_pipeline_success(
        self, mock_classify, mock_plan, mock_sql, mock_ml,
        mock_vector, mock_narrative, mock_viz, mock_followup,
    ):
        from orchestrator.query_engine import process_query

        # Intent classification
        mock_classify.return_value = {
            "intent": "revenue_analysis",
            "confidence": 0.95,
            "entities": {"store_id": "s1"},
            "reasoning": "Revenue question",
        }

        # Plan generation
        mock_plan.return_value = {
            "sql_queries": [
                {"template": "store_performance", "params": {"store_id": "s1"}}
            ],
            "ml_models": [
                {"model": "anomaly_detector", "params": {"store_ids": ["s1"]}}
            ],
            "vector_searches": [],
            "reasoning": "Need store data",
        }

        # SQL execution
        mock_sql.return_value = {
            "store_performance": [
                {"store_id": "s1", "revenue_30d": 50000.0},
            ]
        }

        # ML execution
        mock_ml.return_value = {
            "anomaly_detector": [
                {"store_id": "s1", "anomaly_score": 0.1, "is_anomaly": False},
            ]
        }

        # Vector search (empty, not requested)
        mock_vector.return_value = {}

        # Narrative
        mock_narrative.return_value = "Store S1 generated $50,000 in revenue."

        # Visualization
        mock_viz.return_value = [
            {"type": "bar", "title": "Revenue", "description": "Bar chart", "data_keys": [], "priority": 1},
        ]

        # Follow-ups
        mock_followup.return_value = [
            "How does this compare to last quarter?",
        ]

        result = process_query(
            question="What is the revenue for store S1?",
            user_id="user-123",
        )

        # Validate response structure
        assert "answer" in result
        assert "data" in result
        assert "visualizations" in result
        assert "follow_up_questions" in result
        assert "execution_path" in result
        assert "sources" in result
        assert "metadata" in result

        # Validate content
        assert result["answer"] == "Store S1 generated $50,000 in revenue."
        assert "store_performance" in result["sources"]
        assert "anomaly_detector" in result["sources"]
        assert result["metadata"]["intent"] == "revenue_analysis"
        assert result["metadata"]["intent_confidence"] == 0.95
        assert isinstance(result["metadata"]["execution_time_seconds"], float)
        assert "SQL" in result["execution_path"]
        assert "ML" in result["execution_path"]

    @patch("orchestrator.query_engine.generate_followups")
    @patch("orchestrator.query_engine.recommend_visualizations")
    @patch("orchestrator.query_engine.generate_narrative")
    @patch("orchestrator.query_engine.execute_vector_searches")
    @patch("orchestrator.query_engine.execute_ml_models")
    @patch("orchestrator.query_engine.execute_sql_queries")
    @patch("orchestrator.query_engine.generate_plan")
    @patch("orchestrator.query_engine.classify_intent")
    def test_pipeline_handles_intent_failure(
        self, mock_classify, mock_plan, mock_sql, mock_ml,
        mock_vector, mock_narrative, mock_viz, mock_followup,
    ):
        from orchestrator.query_engine import process_query

        # Simulate intent classification failure
        mock_classify.side_effect = RuntimeError("LLM down")

        # Plan should still be attempted with fallback intent
        mock_plan.return_value = {
            "sql_queries": [],
            "ml_models": [],
            "vector_searches": [],
            "reasoning": "Fallback",
        }
        mock_sql.return_value = {}
        mock_ml.return_value = {}
        mock_vector.return_value = {}
        mock_narrative.return_value = "Unable to fully process."
        mock_viz.return_value = []
        mock_followup.return_value = []

        result = process_query("test question", "user-1")

        # Should still return a response, not crash
        assert "answer" in result
        assert result["metadata"]["intent"] == "general_qa"
        assert result["metadata"]["errors"] is not None
        assert len(result["metadata"]["errors"]) > 0

    @patch("orchestrator.query_engine.generate_followups")
    @patch("orchestrator.query_engine.recommend_visualizations")
    @patch("orchestrator.query_engine.generate_narrative")
    @patch("orchestrator.query_engine.execute_vector_searches")
    @patch("orchestrator.query_engine.execute_ml_models")
    @patch("orchestrator.query_engine.execute_sql_queries")
    @patch("orchestrator.query_engine.generate_plan")
    @patch("orchestrator.query_engine.classify_intent")
    def test_pipeline_handles_narrative_failure(
        self, mock_classify, mock_plan, mock_sql, mock_ml,
        mock_vector, mock_narrative, mock_viz, mock_followup,
    ):
        from orchestrator.query_engine import process_query

        mock_classify.return_value = {
            "intent": "general_qa",
            "confidence": 0.8,
            "entities": {},
        }
        mock_plan.return_value = {
            "sql_queries": [],
            "ml_models": [],
            "vector_searches": [],
        }
        mock_sql.return_value = {}
        mock_ml.return_value = {}
        mock_vector.return_value = {}
        mock_narrative.side_effect = RuntimeError("LLM failed")
        mock_viz.return_value = []
        mock_followup.return_value = []

        result = process_query("test", "user-1")

        # Should return fallback answer
        assert "unable to generate" in result["answer"].lower()
        assert result["metadata"]["errors"] is not None

    @patch("orchestrator.query_engine.generate_followups")
    @patch("orchestrator.query_engine.recommend_visualizations")
    @patch("orchestrator.query_engine.generate_narrative")
    @patch("orchestrator.query_engine.execute_vector_searches")
    @patch("orchestrator.query_engine.execute_ml_models")
    @patch("orchestrator.query_engine.execute_sql_queries")
    @patch("orchestrator.query_engine.generate_plan")
    @patch("orchestrator.query_engine.classify_intent")
    def test_execution_path_reflects_sources(
        self, mock_classify, mock_plan, mock_sql, mock_ml,
        mock_vector, mock_narrative, mock_viz, mock_followup,
    ):
        from orchestrator.query_engine import process_query

        mock_classify.return_value = {"intent": "general_qa", "confidence": 0.9, "entities": {}}
        mock_plan.return_value = {
            "sql_queries": [{"template": "store_performance", "params": {}}],
            "ml_models": [],
            "vector_searches": [{"search": "qa_context", "params": {}}],
        }
        mock_sql.return_value = {"store_performance": [{"col": "val"}]}
        mock_ml.return_value = {}
        mock_vector.return_value = {"qa_context": [{"q": "hi", "a": "hello"}]}
        mock_narrative.return_value = "Response text."
        mock_viz.return_value = []
        mock_followup.return_value = []

        result = process_query("test", "user-1")
        assert "SQL(store_performance)" in result["execution_path"]
        assert "Vector(qa_context)" in result["execution_path"]
        assert "ML" not in result["execution_path"]


# ═════════════════════════════════════════════════════════════
# SECTION 5: Orchestrator Routes Tests
# ═════════════════════════════════════════════════════════════


class TestOrchestratorRoutes:
    """Tests for routes/orchestrator_routes.py endpoint validation."""

    @pytest.fixture
    def client(self):
        """Create a Flask test client."""
        from app import app as flask_app
        flask_app.config["TESTING"] = True
        with flask_app.test_client() as c:
            yield c

    def test_missing_body_returns_400(self, client):
        response = client.post(
            "/orchestrator/query",
            data="not json",
            content_type="text/plain",
        )
        assert response.status_code == 400

    def test_missing_question_returns_400(self, client):
        response = client.post(
            "/orchestrator/query",
            json={"user_id": "u1"},
        )
        assert response.status_code == 400
        data = response.get_json()
        assert "question" in data["error"]

    def test_empty_question_returns_400(self, client):
        response = client.post(
            "/orchestrator/query",
            json={"question": "   ", "user_id": "u1"},
        )
        assert response.status_code == 400

    def test_missing_user_id_returns_400(self, client):
        response = client.post(
            "/orchestrator/query",
            json={"question": "What is the revenue?"},
        )
        assert response.status_code == 400
        data = response.get_json()
        assert "user_id" in data["error"]

    @patch("orchestrator.query_engine.process_query")
    def test_successful_query(self, mock_process, client):
        mock_process.return_value = {
            "answer": "Revenue is $50K.",
            "data": {},
            "visualizations": [],
            "follow_up_questions": [],
            "execution_path": "SQL(store_performance)",
            "sources": ["store_performance"],
            "metadata": {
                "intent": "revenue_analysis",
                "intent_confidence": 0.95,
                "execution_time_seconds": 1.5,
                "errors": None,
                "user_id": "u1",
            },
        }

        response = client.post(
            "/orchestrator/query",
            json={
                "question": "What is the revenue?",
                "user_id": "u1",
            },
        )
        assert response.status_code == 200
        data = response.get_json()
        assert data["answer"] == "Revenue is $50K."
        assert "sources" in data

    @patch("orchestrator.query_engine.process_query")
    def test_query_with_context(self, mock_process, client):
        mock_process.return_value = {
            "answer": "Analysis complete.",
            "data": {},
            "visualizations": [],
            "follow_up_questions": [],
            "execution_path": "",
            "sources": [],
            "metadata": {},
        }

        response = client.post(
            "/orchestrator/query",
            json={
                "question": "How is my store doing?",
                "user_id": "u1",
                "context": {"current_store": "s1"},
            },
        )
        assert response.status_code == 200

        # Verify context was passed
        call_args = mock_process.call_args
        assert call_args.kwargs.get("context") == {"current_store": "s1"} or \
               call_args[1].get("context") == {"current_store": "s1"} or \
               (len(call_args[0]) > 2 and call_args[0][2] == {"current_store": "s1"})

    @patch("orchestrator.query_engine.process_query")
    def test_query_runtime_error_returns_503(self, mock_process, client):
        mock_process.side_effect = RuntimeError("LLM service down")

        response = client.post(
            "/orchestrator/query",
            json={"question": "test", "user_id": "u1"},
        )
        assert response.status_code == 503

    @patch("orchestrator.query_engine.process_query")
    def test_query_value_error_returns_400(self, mock_process, client):
        mock_process.side_effect = ValueError("Invalid question format")

        response = client.post(
            "/orchestrator/query",
            json={"question": "test", "user_id": "u1"},
        )
        assert response.status_code == 400

    @patch("orchestrator.query_engine.process_query")
    def test_query_generic_error_returns_500(self, mock_process, client):
        mock_process.side_effect = Exception("Unexpected error")

        response = client.post(
            "/orchestrator/query",
            json={"question": "test", "user_id": "u1"},
        )
        assert response.status_code == 500

    def test_invalid_context_type_coerced_to_dict(self, client):
        """If context is not a dict, it should be replaced with empty dict."""
        with patch("orchestrator.query_engine.process_query") as mock_process:
            mock_process.return_value = {
                "answer": "ok",
                "data": {},
                "visualizations": [],
                "follow_up_questions": [],
                "execution_path": "",
                "sources": [],
                "metadata": {},
            }

            response = client.post(
                "/orchestrator/query",
                json={"question": "test", "user_id": "u1", "context": "not a dict"},
            )
            assert response.status_code == 200

            # context should have been coerced to {}
            call_args = mock_process.call_args
            context_arg = call_args.kwargs.get("context", call_args[1].get("context", {}))
            assert context_arg == {}
