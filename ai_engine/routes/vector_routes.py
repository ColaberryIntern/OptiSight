"""
OptiSight AI Engine — Vector Routes.

Flask Blueprint providing REST endpoints for vector embedding
and semantic similarity search operations.

Endpoints:
    POST /vectors/embed           — Embed arbitrary text, return vector
    POST /vectors/similar-issues  — Search similar issues
    POST /vectors/similar-stores  — Cross-store similarity
    POST /vectors/search-stores   — Semantic store search
    POST /vectors/embed-pipeline  — Trigger batch embedding (admin)
"""

import logging
import traceback

from flask import Blueprint, jsonify, request

from services.embedding_service import embed_text
from services.vector_service import (
    similar_issue_search,
    similar_resolution_search,
    cross_store_similarity,
    semantic_store_search,
    store_qa_context,
)
from services.embedding_pipeline import (
    embed_all_issues,
    embed_store_summaries,
    embed_new_issue,
    embed_qa,
)

logger = logging.getLogger(__name__)

vector_bp = Blueprint("vectors", __name__, url_prefix="/vectors")


# ─────────────────────────────────────────────────────────────
# POST /vectors/embed
# ─────────────────────────────────────────────────────────────


@vector_bp.route("/embed", methods=["POST"])
def embed_endpoint():
    """
    Embed arbitrary text and return the vector.

    Request JSON:
        {
            "text": "some text to embed"
        }

    Response JSON:
        {
            "embedding": [0.01, -0.02, ...],
            "dimensions": 1536,
            "model": "text-embedding-3-small"
        }
    """
    try:
        data = request.get_json(force=True, silent=True)
        if data is None:
            return jsonify({"error": "Request body must be valid JSON"}), 400

        text = data.get("text", "")
        if not text or not text.strip():
            return jsonify({"error": "text field is required and cannot be empty"}), 400

        embedding = embed_text(text)

        return jsonify({
            "embedding": embedding,
            "dimensions": len(embedding),
            "model": "text-embedding-3-small",
        }), 200

    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        logger.error("Error in /vectors/embed: %s\n%s", str(e), traceback.format_exc())
        return jsonify({"error": f"Internal server error: {str(e)}"}), 500


# ─────────────────────────────────────────────────────────────
# POST /vectors/similar-issues
# ─────────────────────────────────────────────────────────────


@vector_bp.route("/similar-issues", methods=["POST"])
def similar_issues_endpoint():
    """
    Search for issues similar to a query description.

    Request JSON:
        {
            "query": "description of the issue",
            "limit": 10,
            "search_type": "description" | "resolution"
        }

    Response JSON:
        {
            "results": [
                {
                    "complaint_id": "...",
                    "description": "...",
                    "category": "...",
                    "similarity_score": 0.95
                },
                ...
            ],
            "count": 10
        }
    """
    try:
        data = request.get_json(force=True, silent=True)
        if data is None:
            return jsonify({"error": "Request body must be valid JSON"}), 400

        query = data.get("query", "")
        if not query or not query.strip():
            return jsonify({"error": "query field is required"}), 400

        limit = data.get("limit", 10)
        if not isinstance(limit, int) or limit < 1:
            limit = 10

        search_type = data.get("search_type", "description")

        if search_type == "resolution":
            results = similar_resolution_search(query, limit=limit)
        else:
            results = similar_issue_search(query, limit=limit)

        # Convert Decimal/float types for JSON serialization
        for r in results:
            if "similarity_score" in r:
                r["similarity_score"] = float(r["similarity_score"])

        return jsonify({
            "results": results,
            "count": len(results),
        }), 200

    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        logger.error(
            "Error in /vectors/similar-issues: %s\n%s",
            str(e),
            traceback.format_exc(),
        )
        return jsonify({"error": f"Internal server error: {str(e)}"}), 500


# ─────────────────────────────────────────────────────────────
# POST /vectors/similar-stores
# ─────────────────────────────────────────────────────────────


@vector_bp.route("/similar-stores", methods=["POST"])
def similar_stores_endpoint():
    """
    Find stores with similar operational profiles.

    Request JSON:
        {
            "store_id": "store-123",
            "limit": 5
        }

    Response JSON:
        {
            "results": [
                {
                    "store_id": "...",
                    "store_name": "...",
                    "region": "...",
                    "similarity_score": 0.92
                },
                ...
            ],
            "count": 5
        }
    """
    try:
        data = request.get_json(force=True, silent=True)
        if data is None:
            return jsonify({"error": "Request body must be valid JSON"}), 400

        store_id = data.get("store_id", "")
        if not store_id:
            return jsonify({"error": "store_id field is required"}), 400

        limit = data.get("limit", 5)
        if not isinstance(limit, int) or limit < 1:
            limit = 5

        results = cross_store_similarity(store_id, limit=limit)

        for r in results:
            if "similarity_score" in r:
                r["similarity_score"] = float(r["similarity_score"])

        return jsonify({
            "results": results,
            "count": len(results),
        }), 200

    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        logger.error(
            "Error in /vectors/similar-stores: %s\n%s",
            str(e),
            traceback.format_exc(),
        )
        return jsonify({"error": f"Internal server error: {str(e)}"}), 500


# ─────────────────────────────────────────────────────────────
# POST /vectors/search-stores
# ─────────────────────────────────────────────────────────────


@vector_bp.route("/search-stores", methods=["POST"])
def search_stores_endpoint():
    """
    Search stores by natural language description.

    Request JSON:
        {
            "query": "high volume store with frequent complaints about produce",
            "limit": 5
        }

    Response JSON:
        {
            "results": [
                {
                    "store_id": "...",
                    "store_name": "...",
                    "region": "...",
                    "summary_text": "...",
                    "similarity_score": 0.88
                },
                ...
            ],
            "count": 5
        }
    """
    try:
        data = request.get_json(force=True, silent=True)
        if data is None:
            return jsonify({"error": "Request body must be valid JSON"}), 400

        query = data.get("query", "")
        if not query or not query.strip():
            return jsonify({"error": "query field is required"}), 400

        limit = data.get("limit", 5)
        if not isinstance(limit, int) or limit < 1:
            limit = 5

        results = semantic_store_search(query, limit=limit)

        for r in results:
            if "similarity_score" in r:
                r["similarity_score"] = float(r["similarity_score"])

        return jsonify({
            "results": results,
            "count": len(results),
        }), 200

    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        logger.error(
            "Error in /vectors/search-stores: %s\n%s",
            str(e),
            traceback.format_exc(),
        )
        return jsonify({"error": f"Internal server error: {str(e)}"}), 500


# ─────────────────────────────────────────────────────────────
# POST /vectors/embed-pipeline
# ─────────────────────────────────────────────────────────────


@vector_bp.route("/embed-pipeline", methods=["POST"])
def embed_pipeline_endpoint():
    """
    Trigger batch embedding pipeline (admin operation).

    Request JSON:
        {
            "targets": ["issues", "stores", "all"],
            "issue_id": "optional-single-issue-id",
            "qa_id": "optional-single-qa-id"
        }

    - If issue_id is provided, embeds only that single issue.
    - If qa_id is provided, embeds only that Q&A entry.
    - Otherwise, runs batch pipeline on specified targets.

    Response JSON:
        {
            "status": "completed",
            "results": { ... }
        }
    """
    try:
        data = request.get_json(force=True, silent=True)
        if data is None:
            return jsonify({"error": "Request body must be valid JSON"}), 400

        # Single issue embedding
        issue_id = data.get("issue_id")
        if issue_id:
            result = embed_new_issue(issue_id)
            return jsonify({
                "status": "completed",
                "results": result,
            }), 200

        # Single Q&A embedding
        qa_id = data.get("qa_id")
        if qa_id:
            result = embed_qa(qa_id)
            return jsonify({
                "status": "completed",
                "results": result,
            }), 200

        # Batch pipeline
        targets = data.get("targets", ["all"])
        if isinstance(targets, str):
            targets = [targets]

        results = {}

        if "all" in targets or "issues" in targets:
            results["issues"] = embed_all_issues()

        if "all" in targets or "stores" in targets:
            results["stores"] = embed_store_summaries()

        return jsonify({
            "status": "completed",
            "results": results,
        }), 200

    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        logger.error(
            "Error in /vectors/embed-pipeline: %s\n%s",
            str(e),
            traceback.format_exc(),
        )
        return jsonify({"error": f"Internal server error: {str(e)}"}), 500
