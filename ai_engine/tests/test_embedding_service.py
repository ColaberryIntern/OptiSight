"""
Tests for the Embedding Service.

Covers:
- Text sanitization
- Single text embedding with mocked OpenAI client
- Batch text embedding with mocked OpenAI client
- Empty text validation
- Retry logic on rate limit errors
- Retry logic on API errors
- Input truncation for long texts
- Missing API key validation
"""

import sys
import os
from unittest.mock import patch, MagicMock

import pytest

# Add ai_engine root to path so imports work
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.embedding_service import (
    embed_text,
    embed_batch,
    _sanitize_text,
    EMBEDDING_DIMENSIONS,
    MAX_BATCH_SIZE,
    MAX_INPUT_LENGTH,
)


# ─────────────────────────────────────────────────────────────
# Fixtures
# ─────────────────────────────────────────────────────────────

@pytest.fixture
def mock_embedding():
    """Return a fake 1536-dim embedding vector."""
    return [0.01 * i for i in range(EMBEDDING_DIMENSIONS)]


@pytest.fixture
def mock_openai_client(mock_embedding):
    """Create a mocked OpenAI client that returns fake embeddings."""
    mock_client = MagicMock()

    # Mock single embedding response
    mock_data_item = MagicMock()
    mock_data_item.embedding = mock_embedding

    mock_response = MagicMock()
    mock_response.data = [mock_data_item]

    mock_client.embeddings.create.return_value = mock_response
    return mock_client


@pytest.fixture
def mock_openai_batch_client(mock_embedding):
    """Create a mocked OpenAI client for batch embedding."""
    mock_client = MagicMock()

    def batch_response(input, **kwargs):
        resp = MagicMock()
        items = []
        for _ in input:
            item = MagicMock()
            item.embedding = mock_embedding
            items.append(item)
        resp.data = items
        return resp

    mock_client.embeddings.create.side_effect = batch_response
    return mock_client


# ─────────────────────────────────────────────────────────────
# Text sanitization tests
# ─────────────────────────────────────────────────────────────

class TestSanitizeText:
    """Tests for the _sanitize_text helper function."""

    def test_sanitize_removes_newlines(self):
        result = _sanitize_text("hello\nworld\n")
        assert "\n" not in result
        assert result == "hello world"

    def test_sanitize_collapses_whitespace(self):
        result = _sanitize_text("hello   world   foo")
        assert result == "hello world foo"

    def test_sanitize_strips_whitespace(self):
        result = _sanitize_text("  hello world  ")
        assert result == "hello world"

    def test_sanitize_empty_string(self):
        assert _sanitize_text("") == ""

    def test_sanitize_none_returns_empty(self):
        assert _sanitize_text(None) == ""

    def test_sanitize_truncates_long_text(self):
        max_chars = MAX_INPUT_LENGTH * 4
        long_text = "a" * (max_chars + 1000)
        result = _sanitize_text(long_text)
        assert len(result) == max_chars


# ─────────────────────────────────────────────────────────────
# Single embed tests
# ─────────────────────────────────────────────────────────────

class TestEmbedText:
    """Tests for the embed_text function."""

    @patch.dict(os.environ, {"OPENAI_API_KEY": "test-key-123"})
    @patch("services.embedding_service._get_client")
    def test_embed_text_returns_correct_dimensions(
        self, mock_get_client, mock_openai_client, mock_embedding
    ):
        mock_get_client.return_value = mock_openai_client
        result = embed_text("test text")

        assert isinstance(result, list)
        assert len(result) == EMBEDDING_DIMENSIONS
        assert result == mock_embedding

    @patch.dict(os.environ, {"OPENAI_API_KEY": "test-key-123"})
    @patch("services.embedding_service._get_client")
    def test_embed_text_calls_openai_with_correct_model(
        self, mock_get_client, mock_openai_client
    ):
        mock_get_client.return_value = mock_openai_client
        embed_text("test text")

        mock_openai_client.embeddings.create.assert_called_once()
        call_kwargs = mock_openai_client.embeddings.create.call_args
        assert call_kwargs.kwargs["model"] == "text-embedding-3-small"
        assert call_kwargs.kwargs["dimensions"] == EMBEDDING_DIMENSIONS

    def test_embed_text_raises_on_empty_string(self):
        with pytest.raises(ValueError, match="Cannot embed empty text"):
            embed_text("")

    def test_embed_text_raises_on_whitespace_only(self):
        with pytest.raises(ValueError, match="Cannot embed empty text"):
            embed_text("   ")

    def test_embed_text_raises_on_none(self):
        with pytest.raises(ValueError, match="Cannot embed empty text"):
            embed_text(None)

    @patch.dict(os.environ, {"OPENAI_API_KEY": "test-key-123"})
    @patch("services.embedding_service._get_client")
    @patch("services.embedding_service.time.sleep")
    def test_embed_text_retries_on_rate_limit(
        self, mock_sleep, mock_get_client, mock_openai_client, mock_embedding
    ):
        from openai import RateLimitError

        # First call raises rate limit, second succeeds
        mock_data_item = MagicMock()
        mock_data_item.embedding = mock_embedding
        mock_response = MagicMock()
        mock_response.data = [mock_data_item]

        mock_openai_client.embeddings.create.side_effect = [
            RateLimitError(
                message="Rate limit exceeded",
                response=MagicMock(status_code=429),
                body=None,
            ),
            mock_response,
        ]
        mock_get_client.return_value = mock_openai_client

        result = embed_text("test text")
        assert len(result) == EMBEDDING_DIMENSIONS
        assert mock_sleep.called

    @patch.dict(os.environ, {"OPENAI_API_KEY": "test-key-123"})
    @patch("services.embedding_service._get_client")
    @patch("services.embedding_service.time.sleep")
    def test_embed_text_raises_after_max_retries(
        self, mock_sleep, mock_get_client, mock_openai_client
    ):
        from openai import RateLimitError

        mock_openai_client.embeddings.create.side_effect = RateLimitError(
            message="Rate limit exceeded",
            response=MagicMock(status_code=429),
            body=None,
        )
        mock_get_client.return_value = mock_openai_client

        with pytest.raises(RuntimeError, match="Failed to generate embedding"):
            embed_text("test text")

    @patch.dict(os.environ, {}, clear=True)
    def test_embed_text_raises_on_missing_api_key(self):
        # Remove any existing OPENAI_API_KEY
        os.environ.pop("OPENAI_API_KEY", None)
        with pytest.raises(ValueError, match="OPENAI_API_KEY"):
            embed_text("test text")


# ─────────────────────────────────────────────────────────────
# Batch embed tests
# ─────────────────────────────────────────────────────────────

class TestEmbedBatch:
    """Tests for the embed_batch function."""

    @patch.dict(os.environ, {"OPENAI_API_KEY": "test-key-123"})
    @patch("services.embedding_service._get_client")
    def test_embed_batch_returns_correct_count(
        self, mock_get_client, mock_openai_batch_client
    ):
        mock_get_client.return_value = mock_openai_batch_client
        texts = ["text one", "text two", "text three"]
        results = embed_batch(texts)

        assert len(results) == 3
        for emb in results:
            assert len(emb) == EMBEDDING_DIMENSIONS

    @patch.dict(os.environ, {"OPENAI_API_KEY": "test-key-123"})
    @patch("services.embedding_service._get_client")
    def test_embed_batch_handles_empty_strings_in_list(
        self, mock_get_client, mock_openai_batch_client
    ):
        mock_get_client.return_value = mock_openai_batch_client
        texts = ["valid text", "", "another valid"]
        results = embed_batch(texts)

        assert len(results) == 3
        # The empty string index should get a zero vector
        assert results[1] == [0.0] * EMBEDDING_DIMENSIONS

    def test_embed_batch_raises_on_empty_list(self):
        with pytest.raises(ValueError, match="Cannot embed empty text list"):
            embed_batch([])

    def test_embed_batch_raises_on_all_empty_strings(self):
        with pytest.raises(ValueError, match="All texts are empty"):
            embed_batch(["", "  ", ""])

    @patch.dict(os.environ, {"OPENAI_API_KEY": "test-key-123"})
    @patch("services.embedding_service._get_client")
    def test_embed_batch_preserves_order(
        self, mock_get_client
    ):
        """Ensure batch results map to correct input indices."""
        mock_client = MagicMock()

        def indexed_response(input, **kwargs):
            resp = MagicMock()
            items = []
            for i, _ in enumerate(input):
                item = MagicMock()
                # Create distinguishable embeddings using index
                item.embedding = [float(i)] * EMBEDDING_DIMENSIONS
                items.append(item)
            resp.data = items
            return resp

        mock_client.embeddings.create.side_effect = indexed_response
        mock_get_client.return_value = mock_client

        texts = ["first", "second", "third"]
        results = embed_batch(texts)

        assert results[0][0] == 0.0
        assert results[1][0] == 1.0
        assert results[2][0] == 2.0
