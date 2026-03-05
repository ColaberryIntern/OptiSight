"""
Tests for the Vector Routes Flask Blueprint.

Covers:
- POST /vectors/embed endpoint
- POST /vectors/similar-issues endpoint
- POST /vectors/similar-stores endpoint
- POST /vectors/search-stores endpoint
- POST /vectors/embed-pipeline endpoint
- Input validation for all endpoints
- Error handling
"""

import json
import sys
import os
from unittest.mock import patch, MagicMock

import pytest

# Add ai_engine root to path so imports work
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.embedding_service import EMBEDDING_DIMENSIONS


# ─────────────────────────────────────────────────────────────
# Fixtures
# ─────────────────────────────────────────────────────────────

@pytest.fixture
def mock_embedding():
    """Return a fake 1536-dim embedding vector."""
    return [0.01] * EMBEDDING_DIMENSIONS


@pytest.fixture
def client():
    """Create a Flask test client with mocked imports."""
    from app import app as flask_app

    flask_app.config["TESTING"] = True
    with flask_app.test_client() as c:
        yield c


# ─────────────────────────────────────────────────────────────
# POST /vectors/embed tests
# ─────────────────────────────────────────────────────────────

class TestEmbedEndpoint:
    """Tests for POST /vectors/embed."""

    @patch("routes.vector_routes.embed_text")
    def test_embed_returns_vector(self, mock_embed, client, mock_embedding):
        mock_embed.return_value = mock_embedding

        response = client.post(
            "/vectors/embed",
            json={"text": "test text for embedding"},
        )

        assert response.status_code == 200
        data = response.get_json()
        assert "embedding" in data
        assert len(data["embedding"]) == EMBEDDING_DIMENSIONS
        assert data["dimensions"] == EMBEDDING_DIMENSIONS
        assert data["model"] == "text-embedding-3-small"

    def test_embed_rejects_missing_text(self, client):
        response = client.post("/vectors/embed", json={})

        assert response.status_code == 400
        data = response.get_json()
        assert "error" in data

    def test_embed_rejects_empty_text(self, client):
        response = client.post("/vectors/embed", json={"text": ""})

        assert response.status_code == 400

    def test_embed_rejects_whitespace_text(self, client):
        response = client.post("/vectors/embed", json={"text": "   "})

        assert response.status_code == 400

    def test_embed_rejects_invalid_json(self, client):
        response = client.post(
            "/vectors/embed",
            data="not json",
            content_type="text/plain",
        )

        assert response.status_code == 400

    @patch("routes.vector_routes.embed_text")
    def test_embed_handles_service_error(self, mock_embed, client):
        mock_embed.side_effect = RuntimeError("API failure")

        response = client.post(
            "/vectors/embed",
            json={"text": "test text"},
        )

        assert response.status_code == 500
        data = response.get_json()
        assert "error" in data


# ─────────────────────────────────────────────────────────────
# POST /vectors/similar-issues tests
# ─────────────────────────────────────────────────────────────

class TestSimilarIssuesEndpoint:
    """Tests for POST /vectors/similar-issues."""

    @patch("routes.vector_routes.similar_issue_search")
    def test_returns_similar_issues(self, mock_search, client):
        mock_search.return_value = [
            {
                "complaint_id": "ISS-001",
                "description": "Damaged product",
                "category": "Shipping",
                "status": "open",
                "similarity_score": 0.95,
            },
        ]

        response = client.post(
            "/vectors/similar-issues",
            json={"query": "damaged items", "limit": 5},
        )

        assert response.status_code == 200
        data = response.get_json()
        assert "results" in data
        assert data["count"] == 1
        assert data["results"][0]["complaint_id"] == "ISS-001"

    @patch("routes.vector_routes.similar_resolution_search")
    def test_resolution_search_type(self, mock_search, client):
        mock_search.return_value = [
            {
                "complaint_id": "ISS-002",
                "description": "Defective product",
                "resolution_notes": "Refund issued",
                "category": "Quality",
                "similarity_score": 0.88,
            },
        ]

        response = client.post(
            "/vectors/similar-issues",
            json={
                "query": "refund",
                "search_type": "resolution",
            },
        )

        assert response.status_code == 200
        mock_search.assert_called_once()

    def test_rejects_missing_query(self, client):
        response = client.post("/vectors/similar-issues", json={})

        assert response.status_code == 400

    def test_rejects_empty_query(self, client):
        response = client.post(
            "/vectors/similar-issues",
            json={"query": ""},
        )

        assert response.status_code == 400

    @patch("routes.vector_routes.similar_issue_search")
    def test_uses_default_limit(self, mock_search, client):
        mock_search.return_value = []

        response = client.post(
            "/vectors/similar-issues",
            json={"query": "test query"},
        )

        assert response.status_code == 200
        mock_search.assert_called_once_with("test query", limit=10)


# ─────────────────────────────────────────────────────────────
# POST /vectors/similar-stores tests
# ─────────────────────────────────────────────────────────────

class TestSimilarStoresEndpoint:
    """Tests for POST /vectors/similar-stores."""

    @patch("routes.vector_routes.cross_store_similarity")
    def test_returns_similar_stores(self, mock_search, client):
        mock_search.return_value = [
            {
                "store_id": "STORE-A",
                "store_name": "Downtown Store",
                "region": "North",
                "similarity_score": 0.92,
            },
        ]

        response = client.post(
            "/vectors/similar-stores",
            json={"store_id": "STORE-X", "limit": 5},
        )

        assert response.status_code == 200
        data = response.get_json()
        assert data["count"] == 1
        assert data["results"][0]["store_id"] == "STORE-A"

    def test_rejects_missing_store_id(self, client):
        response = client.post("/vectors/similar-stores", json={})

        assert response.status_code == 400

    @patch("routes.vector_routes.cross_store_similarity")
    def test_handles_not_found_store(self, mock_search, client):
        mock_search.side_effect = ValueError("Store not found")

        response = client.post(
            "/vectors/similar-stores",
            json={"store_id": "NONEXISTENT"},
        )

        assert response.status_code == 400


# ─────────────────────────────────────────────────────────────
# POST /vectors/search-stores tests
# ─────────────────────────────────────────────────────────────

class TestSearchStoresEndpoint:
    """Tests for POST /vectors/search-stores."""

    @patch("routes.vector_routes.semantic_store_search")
    def test_returns_matching_stores(self, mock_search, client):
        mock_search.return_value = [
            {
                "store_id": "STORE-B",
                "store_name": "Mall Store",
                "region": "South",
                "summary_text": "Suburban mall location",
                "similarity_score": 0.85,
            },
        ]

        response = client.post(
            "/vectors/search-stores",
            json={"query": "suburban mall"},
        )

        assert response.status_code == 200
        data = response.get_json()
        assert data["count"] == 1

    def test_rejects_missing_query(self, client):
        response = client.post("/vectors/search-stores", json={})

        assert response.status_code == 400

    def test_rejects_empty_query(self, client):
        response = client.post(
            "/vectors/search-stores",
            json={"query": "  "},
        )

        assert response.status_code == 400


# ─────────────────────────────────────────────────────────────
# POST /vectors/embed-pipeline tests
# ─────────────────────────────────────────────────────────────

class TestEmbedPipelineEndpoint:
    """Tests for POST /vectors/embed-pipeline."""

    @patch("routes.vector_routes.embed_new_issue")
    def test_single_issue_embedding(self, mock_embed, client):
        mock_embed.return_value = {
            "issue_id": "ISS-1",
            "description_embedded": True,
            "resolution_embedded": False,
        }

        response = client.post(
            "/vectors/embed-pipeline",
            json={"issue_id": "ISS-1"},
        )

        assert response.status_code == 200
        data = response.get_json()
        assert data["status"] == "completed"
        assert data["results"]["issue_id"] == "ISS-1"

    @patch("routes.vector_routes.embed_qa")
    def test_single_qa_embedding(self, mock_embed, client):
        mock_embed.return_value = {
            "qa_id": "QA-1",
            "embedded": True,
        }

        response = client.post(
            "/vectors/embed-pipeline",
            json={"qa_id": "QA-1"},
        )

        assert response.status_code == 200
        data = response.get_json()
        assert data["results"]["embedded"] is True

    @patch("routes.vector_routes.embed_store_summaries")
    @patch("routes.vector_routes.embed_all_issues")
    def test_batch_pipeline_all(self, mock_issues, mock_stores, client):
        mock_issues.return_value = {
            "descriptions_embedded": 10,
            "resolutions_embedded": 5,
            "errors": 0,
        }
        mock_stores.return_value = {
            "stores_embedded": 3,
            "errors": 0,
        }

        response = client.post(
            "/vectors/embed-pipeline",
            json={"targets": ["all"]},
        )

        assert response.status_code == 200
        data = response.get_json()
        assert "issues" in data["results"]
        assert "stores" in data["results"]
        assert data["results"]["issues"]["descriptions_embedded"] == 10

    @patch("routes.vector_routes.embed_all_issues")
    def test_batch_pipeline_issues_only(self, mock_issues, client):
        mock_issues.return_value = {
            "descriptions_embedded": 5,
            "resolutions_embedded": 2,
            "errors": 0,
        }

        response = client.post(
            "/vectors/embed-pipeline",
            json={"targets": ["issues"]},
        )

        assert response.status_code == 200
        data = response.get_json()
        assert "issues" in data["results"]
        assert "stores" not in data["results"]

    @patch("routes.vector_routes.embed_store_summaries")
    def test_batch_pipeline_stores_only(self, mock_stores, client):
        mock_stores.return_value = {
            "stores_embedded": 3,
            "errors": 0,
        }

        response = client.post(
            "/vectors/embed-pipeline",
            json={"targets": ["stores"]},
        )

        assert response.status_code == 200
        data = response.get_json()
        assert "stores" in data["results"]
        assert "issues" not in data["results"]

    @patch("routes.vector_routes.embed_store_summaries")
    @patch("routes.vector_routes.embed_all_issues")
    def test_batch_pipeline_string_target(
        self, mock_issues, mock_stores, client
    ):
        """Ensure a string target is treated as a single-item list."""
        mock_issues.return_value = {"descriptions_embedded": 0, "resolutions_embedded": 0, "errors": 0}
        mock_stores.return_value = {"stores_embedded": 0, "errors": 0}

        response = client.post(
            "/vectors/embed-pipeline",
            json={"targets": "all"},
        )

        assert response.status_code == 200
        mock_issues.assert_called_once()
        mock_stores.assert_called_once()

    def test_rejects_invalid_json(self, client):
        response = client.post(
            "/vectors/embed-pipeline",
            data="not json",
            content_type="text/plain",
        )

        assert response.status_code == 400
