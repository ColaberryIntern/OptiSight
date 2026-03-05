"""
Issue Clustering using HDBSCAN (Density-Based Clustering).

Uses TF-IDF vectorization + HDBSCAN to cluster issue/complaint descriptions
without requiring a predefined number of clusters. Automatically identifies
noise points (label -1), cluster hierarchies, and top keywords per cluster.
Replaces complaint_clustering.py's K-Means approach but keeps that module intact.
"""

import os
import logging

import numpy as np
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer

logger = logging.getLogger(__name__)


def _get_db_connection():
    """Create a psycopg2 connection using DATABASE_URL env var."""
    import psycopg2
    database_url = os.environ.get(
        'DATABASE_URL',
        'postgresql://retail_insight:changeme@postgres:5432/retail_insight'
    )
    return psycopg2.connect(database_url)


class IssueClustered:
    """HDBSCAN-based issue/complaint clustering with TF-IDF features.

    Unlike K-Means, HDBSCAN does not require specifying the number of clusters
    upfront. It discovers clusters of varying density and marks outliers as
    noise (label -1). This produces more natural groupings of issue descriptions.
    """

    def __init__(self, min_cluster_size=5, min_samples=3, max_features=1000):
        """
        Initialize the issue clusterer.

        Args:
            min_cluster_size: Minimum number of samples to form a cluster. Default 5.
            min_samples: Number of samples in a neighborhood for a point to be
                         core point. Default 3.
            max_features: Maximum TF-IDF vocabulary size. Default 1000.
        """
        self.min_cluster_size = min_cluster_size
        self.min_samples = min_samples
        self.max_features = max_features
        self.vectorizer = TfidfVectorizer(
            max_features=max_features,
            stop_words='english',
            min_df=1,
            max_df=0.95,
        )
        self.model = None
        self.labels_ = None
        self.tfidf_matrix = None
        self.fitted = False

    def cluster(self, texts):
        """
        Cluster a list of text descriptions using TF-IDF + HDBSCAN.

        Args:
            texts: List of strings (issue/complaint descriptions).

        Returns:
            Dict with keys:
            - clusters: List of dicts per cluster:
              {cluster_id, top_keywords, issue_count, sample_issues}
            - noise_count: Number of points not assigned to any cluster
            - total_issues: Total number of input texts
            - hierarchy: List of {parent, child, distance} for dendrogram
        """
        import hdbscan

        if not texts or len(texts) == 0:
            return {
                'clusters': [],
                'noise_count': 0,
                'total_issues': 0,
                'hierarchy': [],
            }

        # Clean texts
        clean_texts = [str(t).strip() if t else '' for t in texts]
        non_empty = [t for t in clean_texts if t]

        if len(non_empty) < 2:
            return {
                'clusters': [],
                'noise_count': len(texts),
                'total_issues': len(texts),
                'hierarchy': [],
            }

        # Adjust max_df for small document sets
        if len(non_empty) <= 2:
            self.vectorizer = TfidfVectorizer(
                max_features=self.max_features,
                stop_words='english',
                min_df=1,
                max_df=1.0,
            )

        # TF-IDF vectorization
        self.tfidf_matrix = self.vectorizer.fit_transform(clean_texts)

        # Adjust HDBSCAN parameters for small datasets
        effective_min_cluster = min(self.min_cluster_size, max(2, len(non_empty) // 2))
        effective_min_samples = min(self.min_samples, effective_min_cluster)

        # Run HDBSCAN
        self.model = hdbscan.HDBSCAN(
            min_cluster_size=effective_min_cluster,
            min_samples=effective_min_samples,
            metric='euclidean',
            cluster_selection_method='eom',  # Excess of Mass
        )

        # HDBSCAN works on dense arrays or sparse — convert to dense for compatibility
        dense_matrix = self.tfidf_matrix.toarray()
        self.labels_ = self.model.fit_predict(dense_matrix)
        self.fitted = True

        # Extract cluster information
        feature_names = self.vectorizer.get_feature_names_out()
        unique_labels = set(self.labels_)
        cluster_labels = sorted([l for l in unique_labels if l >= 0])

        clusters = []
        for cluster_id in cluster_labels:
            mask = self.labels_ == cluster_id
            cluster_indices = np.where(mask)[0]

            # Top keywords: average TF-IDF vector for cluster members
            cluster_vectors = self.tfidf_matrix[cluster_indices].toarray()
            avg_vector = cluster_vectors.mean(axis=0)
            top_indices = avg_vector.argsort()[-10:][::-1]
            top_keywords = [feature_names[idx] for idx in top_indices if avg_vector[idx] > 0]

            # Sample issues
            sample_indices = cluster_indices[:5]
            sample_issues = [clean_texts[i] for i in sample_indices]

            clusters.append({
                'cluster_id': int(cluster_id),
                'top_keywords': top_keywords[:10],
                'issue_count': int(mask.sum()),
                'sample_issues': sample_issues,
            })

        # Sort by issue count descending
        clusters.sort(key=lambda x: x['issue_count'], reverse=True)

        # Noise count
        noise_count = int((self.labels_ == -1).sum())

        # Hierarchy (condensed tree summary)
        hierarchy = self._extract_hierarchy()

        return {
            'clusters': clusters,
            'noise_count': noise_count,
            'total_issues': len(texts),
            'hierarchy': hierarchy,
        }

    def cluster_from_db(self):
        """
        Fetch issue/complaint descriptions from the database and cluster them.

        Queries the complaints or issues table for descriptions and runs HDBSCAN.

        Returns:
            Same as cluster() with additional metadata.
        """
        try:
            conn = _get_db_connection()

            query = """
                SELECT id, description, category, store_id, created_at
                FROM complaints
                WHERE description IS NOT NULL AND description != ''
                ORDER BY created_at DESC
            """
            df = pd.read_sql(query, conn)
            conn.close()

        except Exception as e:
            logger.error('Failed to fetch complaints from database: %s', str(e))
            raise RuntimeError(f'Database query failed: {str(e)}') from e

        if df.empty:
            return {
                'clusters': [],
                'noise_count': 0,
                'total_issues': 0,
                'hierarchy': [],
            }

        texts = df['description'].tolist()
        result = self.cluster(texts)

        # Enrich clusters with complaint IDs
        if self.labels_ is not None and 'id' in df.columns:
            for cluster_info in result['clusters']:
                mask = self.labels_ == cluster_info['cluster_id']
                cluster_info['complaint_ids'] = df.loc[mask, 'id'].astype(str).tolist()

        return result

    def _extract_hierarchy(self):
        """
        Extract a simplified hierarchy from HDBSCAN's condensed tree.

        Returns:
            List of dicts {parent, child, lambda_val} representing the
            condensed cluster hierarchy, or empty list if not available.
        """
        if self.model is None or not hasattr(self.model, 'condensed_tree_'):
            return []

        try:
            tree = self.model.condensed_tree_
            tree_df = tree.to_pandas()

            # Return top-level merges (limit to manageable size)
            hierarchy = []
            for _, row in tree_df.head(100).iterrows():
                hierarchy.append({
                    'parent': int(row['parent']),
                    'child': int(row['child']),
                    'lambda_val': round(float(row['lambda_val']), 6),
                })

            return hierarchy
        except Exception:
            logger.debug('Could not extract HDBSCAN hierarchy')
            return []
