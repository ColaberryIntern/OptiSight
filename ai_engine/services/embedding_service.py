"""
OptiSight AI Engine — Embedding Service.

Uses OpenAI text-embedding-3-small model (1536 dimensions) to generate
vector embeddings from text. Provides single-text and batch embedding
functions with retry logic and rate limiting.
"""

import logging
import os
import time
from typing import List, Optional

from openai import OpenAI, RateLimitError, APIError, APITimeoutError

logger = logging.getLogger(__name__)

# ─────────────────────────────────────────────────────────────
# Configuration
# ─────────────────────────────────────────────────────────────

EMBEDDING_MODEL = "text-embedding-3-small"
EMBEDDING_DIMENSIONS = 1536
MAX_BATCH_SIZE = 100  # OpenAI batch limit per request
MAX_RETRIES = 3
RETRY_BASE_DELAY = 1.0  # seconds, exponential backoff base
MAX_INPUT_LENGTH = 8191  # token limit for text-embedding-3-small


def _get_client() -> OpenAI:
    """
    Create an OpenAI client using the OPENAI_API_KEY environment variable.

    Returns:
        OpenAI: Configured OpenAI client.

    Raises:
        ValueError: If OPENAI_API_KEY is not set.
    """
    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        raise ValueError(
            "OPENAI_API_KEY environment variable is required for embedding generation. "
            "Set it in your environment or .env file."
        )
    return OpenAI(api_key=api_key)


def _sanitize_text(text: str) -> str:
    """
    Clean and prepare text for embedding.

    Replaces newlines with spaces, strips whitespace, and truncates
    overly long inputs to stay within model token limits.

    Args:
        text: Raw input text.

    Returns:
        Cleaned text string.
    """
    if not text:
        return ""
    # Replace newlines, collapse whitespace
    cleaned = " ".join(text.split())
    # Rough truncation — 1 token ~ 4 chars for English text
    max_chars = MAX_INPUT_LENGTH * 4
    if len(cleaned) > max_chars:
        logger.warning(
            "Text truncated from %d to %d characters for embedding",
            len(cleaned),
            max_chars,
        )
        cleaned = cleaned[:max_chars]
    return cleaned


def embed_text(text: str) -> List[float]:
    """
    Generate an embedding vector for a single text string.

    Uses OpenAI text-embedding-3-small model with retry logic
    for rate limits and transient errors.

    Args:
        text: The text to embed.

    Returns:
        List of 1536 floats representing the embedding vector.

    Raises:
        ValueError: If text is empty or OPENAI_API_KEY is not set.
        RuntimeError: If embedding fails after all retries.
    """
    if not text or not text.strip():
        raise ValueError("Cannot embed empty text")

    cleaned = _sanitize_text(text)
    client = _get_client()

    last_error: Optional[Exception] = None
    for attempt in range(MAX_RETRIES):
        try:
            response = client.embeddings.create(
                input=cleaned,
                model=EMBEDDING_MODEL,
                dimensions=EMBEDDING_DIMENSIONS,
            )
            embedding = response.data[0].embedding
            logger.debug(
                "Generated embedding for text (length=%d, dims=%d)",
                len(cleaned),
                len(embedding),
            )
            return embedding

        except RateLimitError as e:
            delay = RETRY_BASE_DELAY * (2 ** attempt)
            logger.warning(
                "Rate limited on attempt %d/%d, retrying in %.1fs: %s",
                attempt + 1,
                MAX_RETRIES,
                delay,
                str(e),
            )
            last_error = e
            time.sleep(delay)

        except (APIError, APITimeoutError) as e:
            delay = RETRY_BASE_DELAY * (2 ** attempt)
            logger.warning(
                "API error on attempt %d/%d, retrying in %.1fs: %s",
                attempt + 1,
                MAX_RETRIES,
                delay,
                str(e),
            )
            last_error = e
            time.sleep(delay)

    raise RuntimeError(
        f"Failed to generate embedding after {MAX_RETRIES} attempts: {last_error}"
    )


def embed_batch(texts: List[str]) -> List[List[float]]:
    """
    Generate embedding vectors for a batch of text strings.

    Splits input into chunks of MAX_BATCH_SIZE and processes each
    chunk with retry logic.

    Args:
        texts: List of text strings to embed.

    Returns:
        List of embedding vectors (each a list of 1536 floats),
        in the same order as the input texts.

    Raises:
        ValueError: If texts list is empty or OPENAI_API_KEY is not set.
        RuntimeError: If embedding fails after all retries.
    """
    if not texts:
        raise ValueError("Cannot embed empty text list")

    cleaned_texts = [_sanitize_text(t) for t in texts]
    # Filter out empty strings but track indices
    valid_indices = [i for i, t in enumerate(cleaned_texts) if t]
    valid_texts = [cleaned_texts[i] for i in valid_indices]

    if not valid_texts:
        raise ValueError("All texts are empty after sanitization")

    client = _get_client()
    all_embeddings: List[Optional[List[float]]] = [None] * len(texts)

    # Process in batches
    for batch_start in range(0, len(valid_texts), MAX_BATCH_SIZE):
        batch_end = min(batch_start + MAX_BATCH_SIZE, len(valid_texts))
        batch = valid_texts[batch_start:batch_end]
        batch_indices = valid_indices[batch_start:batch_end]

        last_error: Optional[Exception] = None
        for attempt in range(MAX_RETRIES):
            try:
                response = client.embeddings.create(
                    input=batch,
                    model=EMBEDDING_MODEL,
                    dimensions=EMBEDDING_DIMENSIONS,
                )

                # Map results back to original indices
                for j, embedding_data in enumerate(response.data):
                    original_idx = batch_indices[j]
                    all_embeddings[original_idx] = embedding_data.embedding

                logger.info(
                    "Embedded batch of %d texts (batch %d-%d of %d total)",
                    len(batch),
                    batch_start,
                    batch_end,
                    len(valid_texts),
                )
                break  # Success, move to next batch

            except RateLimitError as e:
                delay = RETRY_BASE_DELAY * (2 ** attempt)
                logger.warning(
                    "Rate limited on batch attempt %d/%d, retrying in %.1fs",
                    attempt + 1,
                    MAX_RETRIES,
                    delay,
                )
                last_error = e
                time.sleep(delay)

            except (APIError, APITimeoutError) as e:
                delay = RETRY_BASE_DELAY * (2 ** attempt)
                logger.warning(
                    "API error on batch attempt %d/%d, retrying in %.1fs",
                    attempt + 1,
                    MAX_RETRIES,
                    delay,
                )
                last_error = e
                time.sleep(delay)
        else:
            raise RuntimeError(
                f"Failed to embed batch after {MAX_RETRIES} attempts: {last_error}"
            )

    # Replace None entries (from empty texts) with zero vectors
    zero_vector = [0.0] * EMBEDDING_DIMENSIONS
    result = []
    for emb in all_embeddings:
        if emb is None:
            result.append(zero_vector)
        else:
            result.append(emb)

    return result
