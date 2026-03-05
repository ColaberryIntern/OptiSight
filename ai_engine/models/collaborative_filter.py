"""
Collaborative Filtering Recommendation Engine.

Uses cosine similarity on a user-item interaction matrix to find
similar users and recommend products the target user hasn't purchased.
Falls back to popularity-based recommendations for cold-start users.
"""

import pandas as pd
import numpy as np
from sklearn.metrics.pairwise import cosine_similarity


class CollaborativeFilter:
    """Simple user-based collaborative filtering using cosine similarity."""

    def __init__(self):
        self.interaction_matrix = None
        self.similarity_matrix = None
        self.user_ids = None
        self.product_ids = None
        self.popularity_scores = None
        self._is_fitted = False

    def fit(self, interactions_df):
        """
        Build the user-item interaction matrix and compute user similarities.

        Parameters
        ----------
        interactions_df : pd.DataFrame
            Must contain columns: user_id, product_id, interaction_score
        """
        if interactions_df.empty:
            self._is_fitted = False
            return self

        required_cols = {'user_id', 'product_id', 'interaction_score'}
        missing = required_cols - set(interactions_df.columns)
        if missing:
            raise ValueError(f'Missing required columns: {missing}')

        # Build the user-item interaction matrix (pivot table)
        self.interaction_matrix = interactions_df.pivot_table(
            index='user_id',
            columns='product_id',
            values='interaction_score',
            aggfunc='sum',
            fill_value=0,
        )

        self.user_ids = list(self.interaction_matrix.index)
        self.product_ids = list(self.interaction_matrix.columns)

        # Compute cosine similarity between users
        matrix_values = self.interaction_matrix.values.astype(float)
        self.similarity_matrix = cosine_similarity(matrix_values)

        # Pre-compute popularity scores (total interaction score per product)
        self.popularity_scores = (
            interactions_df.groupby('product_id')['interaction_score']
            .sum()
            .sort_values(ascending=False)
        )

        self._is_fitted = True
        return self

    def recommend(self, user_id, n=5):
        """
        Generate product recommendations for a user.

        Parameters
        ----------
        user_id : str
            The target user ID.
        n : int
            Number of recommendations to return.

        Returns
        -------
        list[dict]
            Each dict has keys: product_id, score, reason.
        """
        if not self._is_fitted:
            return []

        # Cold-start fallback: user not in training data
        if user_id not in self.user_ids:
            return self.get_popular(n)

        user_idx = self.user_ids.index(user_id)

        # Get similarity scores with all other users
        user_similarities = self.similarity_matrix[user_idx]

        # Get the target user's interaction vector
        user_interactions = self.interaction_matrix.iloc[user_idx].values

        # Products the user has already interacted with
        interacted_mask = user_interactions > 0

        # Compute weighted scores: sum of (similarity * interaction) for each product
        # across all other users
        weighted_scores = np.zeros(len(self.product_ids))
        for other_idx in range(len(self.user_ids)):
            if other_idx == user_idx:
                continue
            sim = user_similarities[other_idx]
            if sim <= 0:
                continue
            other_interactions = self.interaction_matrix.iloc[other_idx].values
            weighted_scores += sim * other_interactions

        # Zero out products the user already interacted with
        weighted_scores[interacted_mask] = 0

        # If no recommendations available (user bought everything or no similar users)
        if weighted_scores.sum() == 0:
            return self.get_popular(n)

        # Normalize scores to 0-1 range
        max_score = weighted_scores.max()
        if max_score > 0:
            normalized_scores = weighted_scores / max_score
        else:
            normalized_scores = weighted_scores

        # Get top-n product indices
        top_indices = np.argsort(normalized_scores)[::-1][:n]

        recommendations = []
        for idx in top_indices:
            score = float(normalized_scores[idx])
            if score <= 0:
                break
            recommendations.append({
                'product_id': str(self.product_ids[idx]),
                'score': round(score, 4),
                'reason': 'Recommended based on similar users\' purchase patterns',
            })

        # If we have fewer than n, pad with popular items
        if len(recommendations) < n:
            existing_ids = {r['product_id'] for r in recommendations}
            existing_ids.update(
                str(self.product_ids[i])
                for i in range(len(self.product_ids))
                if interacted_mask[i]
            )
            popular_fill = self._get_popular_excluding(existing_ids, n - len(recommendations))
            recommendations.extend(popular_fill)

        return recommendations

    def get_popular(self, n=5):
        """
        Return top products by total interaction score (cold-start fallback).

        Parameters
        ----------
        n : int
            Number of products to return.

        Returns
        -------
        list[dict]
            Each dict has keys: product_id, score, reason.
        """
        if not self._is_fitted or self.popularity_scores is None:
            return []

        max_pop = self.popularity_scores.iloc[0] if len(self.popularity_scores) > 0 else 1
        if max_pop == 0:
            max_pop = 1

        results = []
        for product_id, total_score in self.popularity_scores.head(n).items():
            results.append({
                'product_id': str(product_id),
                'score': round(float(total_score / max_pop), 4),
                'reason': 'Popular product (cold-start recommendation)',
            })

        return results

    def _get_popular_excluding(self, exclude_ids, n):
        """Return popular products excluding specified IDs."""
        if not self._is_fitted or self.popularity_scores is None:
            return []

        max_pop = self.popularity_scores.iloc[0] if len(self.popularity_scores) > 0 else 1
        if max_pop == 0:
            max_pop = 1

        results = []
        for product_id, total_score in self.popularity_scores.items():
            if str(product_id) in exclude_ids:
                continue
            results.append({
                'product_id': str(product_id),
                'score': round(float(total_score / max_pop), 4),
                'reason': 'Popular product (supplemental recommendation)',
            })
            if len(results) >= n:
                break

        return results
