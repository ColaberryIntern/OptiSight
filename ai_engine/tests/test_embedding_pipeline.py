"""
Tests for the Embedding Pipeline.

Covers:
- embed_all_issues batch pipeline
- embed_store_summaries batch pipeline
- embed_new_issue single-record pipeline
- embed_qa single-record pipeline
- Error handling and rollback behavior
- Empty result set handling
"""

import sys
import os
from unittest.mock import patch, MagicMock, call

import pytest

# Add ai_engine root to path so imports work
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.embedding_pipeline import (
    embed_all_issues,
    embed_store_summaries,
    embed_new_issue,
    embed_qa,
    BATCH_SIZE,
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
def mock_db_connection():
    """Create a mocked database connection with cursor context manager."""
    mock_conn = MagicMock()
    mock_cursor = MagicMock()
    mock_cursor.__enter__ = MagicMock(return_value=mock_cursor)
    mock_cursor.__exit__ = MagicMock(return_value=False)
    mock_conn.cursor.return_value = mock_cursor
    return mock_conn, mock_cursor


# ─────────────────────────────────────────────────────────────
# embed_all_issues tests
# ─────────────────────────────────────────────────────────────

class TestEmbedAllIssues:
    """Tests for the embed_all_issues batch pipeline."""

    @patch("services.embedding_pipeline.embed_batch")
    @patch("services.embedding_pipeline._get_connection")
    def test_embeds_descriptions_and_resolutions(
        self, mock_get_conn, mock_embed_batch, mock_embedding
    ):
        mock_conn = MagicMock()
        mock_cursor = MagicMock()
        mock_cursor.__enter__ = MagicMock(return_value=mock_cursor)
        mock_cursor.__exit__ = MagicMock(return_value=False)
        mock_conn.cursor.return_value = mock_cursor

        # First fetchall: issues needing description embeddings
        # Second fetchall: issues needing resolution embeddings
        mock_cursor.fetchall.side_effect = [
            [
                {"complaint_id": "ISS-1", "description": "damaged product"},
                {"complaint_id": "ISS-2", "description": "late delivery"},
            ],
            [
                {"complaint_id": "ISS-3", "resolution_notes": "refund issued"},
            ],
        ]

        mock_embed_batch.return_value = [mock_embedding, mock_embedding]
        mock_get_conn.return_value = mock_conn

        stats = embed_all_issues()

        assert stats["descriptions_embedded"] == 2
        assert stats["resolutions_embedded"] == 1
        assert stats["errors"] == 0
        assert mock_conn.commit.called

    @patch("services.embedding_pipeline._get_connection")
    def test_handles_no_issues_to_embed(self, mock_get_conn):
        mock_conn = MagicMock()
        mock_cursor = MagicMock()
        mock_cursor.__enter__ = MagicMock(return_value=mock_cursor)
        mock_cursor.__exit__ = MagicMock(return_value=False)
        mock_conn.cursor.return_value = mock_cursor

        # No rows found
        mock_cursor.fetchall.return_value = []

        mock_get_conn.return_value = mock_conn

        stats = embed_all_issues()

        assert stats["descriptions_embedded"] == 0
        assert stats["resolutions_embedded"] == 0
        assert stats["errors"] == 0

    @patch("services.embedding_pipeline.embed_batch")
    @patch("services.embedding_pipeline._get_connection")
    def test_handles_embedding_error_gracefully(
        self, mock_get_conn, mock_embed_batch
    ):
        mock_conn = MagicMock()
        mock_cursor = MagicMock()
        mock_cursor.__enter__ = MagicMock(return_value=mock_cursor)
        mock_cursor.__exit__ = MagicMock(return_value=False)
        mock_conn.cursor.return_value = mock_cursor

        mock_cursor.fetchall.side_effect = [
            [{"complaint_id": "ISS-1", "description": "test"}],
            [],  # no resolutions
        ]

        mock_embed_batch.side_effect = RuntimeError("API error")
        mock_get_conn.return_value = mock_conn

        stats = embed_all_issues()

        assert stats["errors"] >= 1
        assert mock_conn.rollback.called

    @patch("services.embedding_pipeline._get_connection")
    def test_handles_connection_error(self, mock_get_conn):
        mock_get_conn.side_effect = Exception("Connection refused")

        stats = embed_all_issues()

        assert stats["errors"] >= 1


# ─────────────────────────────────────────────────────────────
# embed_store_summaries tests
# ─────────────────────────────────────────────────────────────

class TestEmbedStoreSummaries:
    """Tests for the embed_store_summaries batch pipeline."""

    @patch("services.embedding_pipeline.embed_batch")
    @patch("services.embedding_pipeline._get_connection")
    def test_embeds_store_summaries(
        self, mock_get_conn, mock_embed_batch, mock_embedding
    ):
        mock_conn = MagicMock()
        mock_cursor = MagicMock()
        mock_cursor.__enter__ = MagicMock(return_value=mock_cursor)
        mock_cursor.__exit__ = MagicMock(return_value=False)
        mock_conn.cursor.return_value = mock_cursor

        mock_cursor.fetchall.return_value = [
            {
                "store_id": "S1",
                "store_name": "Store One",
                "region": "North",
                "summary_text": "High volume urban store",
            },
        ]

        mock_embed_batch.return_value = [mock_embedding]
        mock_get_conn.return_value = mock_conn

        stats = embed_store_summaries()

        assert stats["stores_embedded"] == 1
        assert stats["errors"] == 0

    @patch("services.embedding_pipeline._get_connection")
    def test_handles_no_stores_to_embed(self, mock_get_conn):
        mock_conn = MagicMock()
        mock_cursor = MagicMock()
        mock_cursor.__enter__ = MagicMock(return_value=mock_cursor)
        mock_cursor.__exit__ = MagicMock(return_value=False)
        mock_conn.cursor.return_value = mock_cursor

        mock_cursor.fetchall.return_value = []
        mock_get_conn.return_value = mock_conn

        stats = embed_store_summaries()

        assert stats["stores_embedded"] == 0
        assert stats["errors"] == 0


# ─────────────────────────────────────────────────────────────
# embed_new_issue tests
# ─────────────────────────────────────────────────────────────

class TestEmbedNewIssue:
    """Tests for the embed_new_issue real-time pipeline."""

    @patch("services.embedding_pipeline.embed_text")
    @patch("services.embedding_pipeline._get_connection")
    def test_embeds_description_and_resolution(
        self, mock_get_conn, mock_embed, mock_embedding
    ):
        mock_conn = MagicMock()
        mock_cursor = MagicMock()
        mock_cursor.__enter__ = MagicMock(return_value=mock_cursor)
        mock_cursor.__exit__ = MagicMock(return_value=False)
        mock_conn.cursor.return_value = mock_cursor

        mock_cursor.fetchone.return_value = {
            "complaint_id": "ISS-1",
            "description": "Product was damaged",
            "resolution_notes": "Refund issued",
        }

        mock_embed.return_value = mock_embedding
        mock_get_conn.return_value = mock_conn

        result = embed_new_issue("ISS-1")

        assert result["issue_id"] == "ISS-1"
        assert result["description_embedded"] is True
        assert result["resolution_embedded"] is True
        assert mock_embed.call_count == 2

    @patch("services.embedding_pipeline.embed_text")
    @patch("services.embedding_pipeline._get_connection")
    def test_embeds_description_only_when_no_resolution(
        self, mock_get_conn, mock_embed, mock_embedding
    ):
        mock_conn = MagicMock()
        mock_cursor = MagicMock()
        mock_cursor.__enter__ = MagicMock(return_value=mock_cursor)
        mock_cursor.__exit__ = MagicMock(return_value=False)
        mock_conn.cursor.return_value = mock_cursor

        mock_cursor.fetchone.return_value = {
            "complaint_id": "ISS-2",
            "description": "Product was damaged",
            "resolution_notes": None,
        }

        mock_embed.return_value = mock_embedding
        mock_get_conn.return_value = mock_conn

        result = embed_new_issue("ISS-2")

        assert result["description_embedded"] is True
        assert result["resolution_embedded"] is False
        assert mock_embed.call_count == 1

    @patch("services.embedding_pipeline._get_connection")
    def test_handles_missing_issue(self, mock_get_conn):
        mock_conn = MagicMock()
        mock_cursor = MagicMock()
        mock_cursor.__enter__ = MagicMock(return_value=mock_cursor)
        mock_cursor.__exit__ = MagicMock(return_value=False)
        mock_conn.cursor.return_value = mock_cursor

        mock_cursor.fetchone.return_value = None
        mock_get_conn.return_value = mock_conn

        result = embed_new_issue("NONEXISTENT")

        assert result["description_embedded"] is False
        assert result["resolution_embedded"] is False


# ─────────────────────────────────────────────────────────────
# embed_qa tests
# ─────────────────────────────────────────────────────────────

class TestEmbedQa:
    """Tests for the embed_qa real-time pipeline."""

    @patch("services.embedding_pipeline.embed_text")
    @patch("services.embedding_pipeline._get_connection")
    def test_embeds_question(self, mock_get_conn, mock_embed, mock_embedding):
        mock_conn = MagicMock()
        mock_cursor = MagicMock()
        mock_cursor.__enter__ = MagicMock(return_value=mock_cursor)
        mock_cursor.__exit__ = MagicMock(return_value=False)
        mock_conn.cursor.return_value = mock_cursor

        mock_cursor.fetchone.return_value = {
            "qa_id": "QA-1",
            "question": "How to handle returns?",
        }

        mock_embed.return_value = mock_embedding
        mock_get_conn.return_value = mock_conn

        result = embed_qa("QA-1")

        assert result["qa_id"] == "QA-1"
        assert result["embedded"] is True

    @patch("services.embedding_pipeline._get_connection")
    def test_handles_missing_qa_entry(self, mock_get_conn):
        mock_conn = MagicMock()
        mock_cursor = MagicMock()
        mock_cursor.__enter__ = MagicMock(return_value=mock_cursor)
        mock_cursor.__exit__ = MagicMock(return_value=False)
        mock_conn.cursor.return_value = mock_cursor

        mock_cursor.fetchone.return_value = None
        mock_get_conn.return_value = mock_conn

        result = embed_qa("NONEXISTENT")

        assert result["embedded"] is False

    @patch("services.embedding_pipeline._get_connection")
    def test_handles_empty_question(self, mock_get_conn):
        mock_conn = MagicMock()
        mock_cursor = MagicMock()
        mock_cursor.__enter__ = MagicMock(return_value=mock_cursor)
        mock_cursor.__exit__ = MagicMock(return_value=False)
        mock_conn.cursor.return_value = mock_cursor

        mock_cursor.fetchone.return_value = {
            "qa_id": "QA-2",
            "question": "  ",
        }
        mock_get_conn.return_value = mock_conn

        result = embed_qa("QA-2")

        assert result["embedded"] is False
