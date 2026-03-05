"""
Tests for the Vector Service.

Covers:
- similar_issue_search with mocked DB and embeddings
- similar_resolution_search with mocked DB and embeddings
- cross_store_similarity with mocked DB
- semantic_store_search with mocked DB and embeddings
- store_qa_context with pre-computed embeddings
- Input validation for all functions
- Database connection construction
"""

import sys
import os
from unittest.mock import patch, MagicMock
from datetime import datetime

import pytest

# Add ai_engine root to path so imports work
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.vector_service import (
    similar_issue_search,
    similar_resolution_search,
    cross_store_similarity,
    semantic_store_search,
    store_qa_context,
    _get_connection,
)
from services.embedding_service import EMBEDDING_DIMENSIONS


# ─────────────────────────────────────────────────────────────
# Fixtures
# ─────────────────────────────────────────────────────────────

@pytest.fixture
def mock_embedding():
    """Return a fake 1536-dim embedding vector."""
    return [0.01] * EMBEDDING_DIMENSIONS


@pytest.fixture
def mock_issue_rows():
    """Return sample issue search results."""
    return [
        {
            "complaint_id": "ISS-001",
            "description": "Product arrived damaged",
            "category": "Shipping",
            "status": "open",
            "similarity_score": 0.95,
        },
        {
            "complaint_id": "ISS-002",
            "description": "Package was broken on arrival",
            "category": "Shipping",
            "status": "resolved",
            "similarity_score": 0.88,
        },
    ]


@pytest.fixture
def mock_resolution_rows():
    """Return sample resolution search results."""
    return [
        {
            "complaint_id": "ISS-003",
            "description": "Defective product received",
            "resolution_notes": "Full refund issued and replacement sent",
            "category": "Quality",
            "similarity_score": 0.92,
        },
    ]


@pytest.fixture
def mock_store_rows():
    """Return sample store search results."""
    return [
        {
            "store_id": "STORE-A",
            "store_name": "Downtown Store",
            "region": "North",
            "summary_text": "High volume urban store",
            "similarity_score": 0.90,
        },
        {
            "store_id": "STORE-B",
            "store_name": "Mall Store",
            "region": "South",
            "summary_text": "Suburban mall location",
            "similarity_score": 0.85,
        },
    ]


@pytest.fixture
def mock_qa_rows():
    """Return sample Q&A context results."""
    return [
        {
            "qa_id": "QA-001",
            "question": "How to handle damaged shipments?",
            "answer": "Issue refund or replacement per policy",
            "created_at": datetime(2024, 6, 1, 12, 0, 0),
            "similarity_score": 0.93,
        },
    ]


# ─────────────────────────────────────────────────────────────
# similar_issue_search tests
# ─────────────────────────────────────────────────────────────

class TestSimilarIssueSearch:
    """Tests for similar_issue_search."""

    @patch("services.vector_service.embed_text")
    @patch("services.vector_service._execute_vector_query")
    def test_returns_matching_issues(
        self, mock_query, mock_embed, mock_embedding, mock_issue_rows
    ):
        mock_embed.return_value = mock_embedding
        mock_query.return_value = mock_issue_rows

        results = similar_issue_search("damaged product")

        assert len(results) == 2
        assert results[0]["complaint_id"] == "ISS-001"
        assert results[0]["similarity_score"] == 0.95
        mock_embed.assert_called_once_with("damaged product")

    @patch("services.vector_service.embed_text")
    @patch("services.vector_service._execute_vector_query")
    def test_respects_limit_parameter(
        self, mock_query, mock_embed, mock_embedding, mock_issue_rows
    ):
        mock_embed.return_value = mock_embedding
        mock_query.return_value = mock_issue_rows[:1]

        results = similar_issue_search("damaged product", limit=1)

        assert len(results) == 1
        # Verify limit was passed to query
        call_args = mock_query.call_args
        assert call_args[0][2] == 1  # limit parameter

    def test_raises_on_empty_query(self):
        with pytest.raises(ValueError, match="cannot be empty"):
            similar_issue_search("")

    def test_raises_on_whitespace_query(self):
        with pytest.raises(ValueError, match="cannot be empty"):
            similar_issue_search("   ")


# ─────────────────────────────────────────────────────────────
# similar_resolution_search tests
# ─────────────────────────────────────────────────────────────

class TestSimilarResolutionSearch:
    """Tests for similar_resolution_search."""

    @patch("services.vector_service.embed_text")
    @patch("services.vector_service._execute_vector_query")
    def test_returns_matching_resolutions(
        self, mock_query, mock_embed, mock_embedding, mock_resolution_rows
    ):
        mock_embed.return_value = mock_embedding
        mock_query.return_value = mock_resolution_rows

        results = similar_resolution_search("refund and replacement")

        assert len(results) == 1
        assert results[0]["complaint_id"] == "ISS-003"
        assert "resolution_notes" in results[0]

    def test_raises_on_empty_query(self):
        with pytest.raises(ValueError, match="cannot be empty"):
            similar_resolution_search("")


# ─────────────────────────────────────────────────────────────
# cross_store_similarity tests
# ─────────────────────────────────────────────────────────────

class TestCrossStoreSimilarity:
    """Tests for cross_store_similarity."""

    @patch("services.vector_service._get_connection")
    def test_returns_similar_stores(
        self, mock_conn, mock_embedding, mock_store_rows
    ):
        mock_cursor = MagicMock()
        mock_cursor.__enter__ = MagicMock(return_value=mock_cursor)
        mock_cursor.__exit__ = MagicMock(return_value=False)

        # First query returns source store embedding
        # Second query returns similar stores
        mock_cursor.fetchone.return_value = {
            "summary_embedding": mock_embedding,
        }
        mock_cursor.fetchall.return_value = mock_store_rows

        mock_connection = MagicMock()
        mock_connection.cursor.return_value = mock_cursor
        mock_conn.return_value = mock_connection

        results = cross_store_similarity("STORE-X", limit=5)

        assert len(results) == 2
        assert results[0]["store_id"] == "STORE-A"

    @patch("services.vector_service._get_connection")
    def test_raises_when_store_not_found(self, mock_conn):
        mock_cursor = MagicMock()
        mock_cursor.__enter__ = MagicMock(return_value=mock_cursor)
        mock_cursor.__exit__ = MagicMock(return_value=False)
        mock_cursor.fetchone.return_value = None

        mock_connection = MagicMock()
        mock_connection.cursor.return_value = mock_cursor
        mock_conn.return_value = mock_connection

        with pytest.raises(ValueError, match="not found or has no embedding"):
            cross_store_similarity("NONEXISTENT")

    def test_raises_on_empty_store_id(self):
        with pytest.raises(ValueError, match="cannot be empty"):
            cross_store_similarity("")


# ─────────────────────────────────────────────────────────────
# semantic_store_search tests
# ─────────────────────────────────────────────────────────────

class TestSemanticStoreSearch:
    """Tests for semantic_store_search."""

    @patch("services.vector_service.embed_text")
    @patch("services.vector_service._execute_vector_query")
    def test_returns_matching_stores(
        self, mock_query, mock_embed, mock_embedding, mock_store_rows
    ):
        mock_embed.return_value = mock_embedding
        mock_query.return_value = mock_store_rows

        results = semantic_store_search("high volume urban")

        assert len(results) == 2
        assert results[0]["store_name"] == "Downtown Store"

    def test_raises_on_empty_query(self):
        with pytest.raises(ValueError, match="cannot be empty"):
            semantic_store_search("")


# ─────────────────────────────────────────────────────────────
# store_qa_context tests
# ─────────────────────────────────────────────────────────────

class TestStoreQaContext:
    """Tests for store_qa_context."""

    @patch("services.vector_service._execute_vector_query")
    def test_returns_qa_entries(self, mock_query, mock_embedding, mock_qa_rows):
        mock_query.return_value = mock_qa_rows

        results = store_qa_context(mock_embedding, limit=3)

        assert len(results) == 1
        assert results[0]["qa_id"] == "QA-001"
        # Verify datetime was converted to ISO string
        assert results[0]["created_at"] == "2024-06-01T12:00:00"

    def test_raises_on_empty_embedding(self):
        with pytest.raises(ValueError, match="must be a list of 1536 floats"):
            store_qa_context([])

    def test_raises_on_wrong_dimension_embedding(self):
        with pytest.raises(ValueError, match="must be a list of 1536 floats"):
            store_qa_context([0.1] * 768)

    def test_raises_on_none_embedding(self):
        with pytest.raises(ValueError, match="must be a list of 1536 floats"):
            store_qa_context(None)


# ─────────────────────────────────────────────────────────────
# Database connection tests
# ─────────────────────────────────────────────────────────────

class TestGetConnection:
    """Tests for _get_connection helper."""

    @patch("services.vector_service.register_vector")
    @patch("services.vector_service.psycopg2.connect")
    @patch.dict(
        os.environ,
        {"DATABASE_URL": "postgresql://user:pass@host:5432/db"},
    )
    def test_uses_database_url_when_set(self, mock_connect, mock_register):
        mock_connect.return_value = MagicMock()
        _get_connection()

        mock_connect.assert_called_once_with(
            "postgresql://user:pass@host:5432/db"
        )
        mock_register.assert_called_once()

    @patch("services.vector_service.register_vector")
    @patch("services.vector_service.psycopg2.connect")
    @patch.dict(
        os.environ,
        {
            "DB_HOST": "myhost",
            "DB_PORT": "5433",
            "DB_NAME": "mydb",
            "DB_USER": "myuser",
            "DB_PASSWORD": "mypass",
        },
        clear=True,
    )
    def test_uses_individual_vars_when_no_database_url(
        self, mock_connect, mock_register
    ):
        mock_connect.return_value = MagicMock()
        _get_connection()

        mock_connect.assert_called_once_with(
            host="myhost",
            port=5433,
            dbname="mydb",
            user="myuser",
            password="mypass",
        )
