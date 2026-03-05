"""
Complaint Clustering Engine.

Uses TF-IDF vectorization + K-Means clustering to group customer complaints
into meaningful clusters, and generates regional heatmap data for visualization.
"""

import pandas as pd
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.cluster import KMeans


class ComplaintClusterer:
    """TF-IDF + K-Means complaint clustering with regional heatmap."""

    def __init__(self):
        self.vectorizer = TfidfVectorizer(
            max_features=1000,
            stop_words='english',
            min_df=1,
            max_df=0.95
        )
        self.model = None
        self.labels_ = None
        self.n_clusters = None

    def fit(self, complaints_df, n_clusters=5):
        """
        Fit TF-IDF + K-Means on complaint descriptions.

        Parameters
        ----------
        complaints_df : pd.DataFrame
            Must contain at least a 'description' column.
        n_clusters : int
            Number of clusters to create.

        Returns
        -------
        self
        """
        if complaints_df.empty or 'description' not in complaints_df.columns:
            self.labels_ = np.array([])
            return self

        descriptions = complaints_df['description'].fillna('').tolist()

        if len(descriptions) < n_clusters:
            n_clusters = max(1, len(descriptions))

        self.n_clusters = n_clusters

        # For very small document sets, relax max_df to avoid
        # max_df < min_df errors in TfidfVectorizer
        if len(descriptions) <= 2:
            self.vectorizer = TfidfVectorizer(
                max_features=1000,
                stop_words='english',
                min_df=1,
                max_df=1.0
            )

        tfidf_matrix = self.vectorizer.fit_transform(descriptions)

        self.model = KMeans(n_clusters=n_clusters, random_state=42, n_init=10)
        self.labels_ = self.model.fit_predict(tfidf_matrix)

        return self

    def get_clusters(self, complaints_df, top_terms=5):
        """
        Get cluster labels with top keywords.

        Parameters
        ----------
        complaints_df : pd.DataFrame
            Same DataFrame used in fit().
        top_terms : int
            Number of top TF-IDF terms per cluster.

        Returns
        -------
        list[dict]
            Each dict has keys: cluster_id, top_keywords, complaint_count,
            sample_complaints.
        """
        if self.model is None or self.labels_ is None or len(self.labels_) == 0:
            return []

        feature_names = self.vectorizer.get_feature_names_out()
        clusters = []

        for cluster_id in range(self.n_clusters):
            # Get top terms for this cluster center
            center = self.model.cluster_centers_[cluster_id]
            top_indices = center.argsort()[-top_terms:][::-1]
            top_keywords = [feature_names[i] for i in top_indices]

            # Get complaints in this cluster
            mask = self.labels_ == cluster_id
            cluster_complaints = complaints_df[mask]

            sample_descriptions = cluster_complaints['description'].head(3).tolist()

            clusters.append({
                'cluster_id': int(cluster_id),
                'top_keywords': top_keywords,
                'complaint_count': int(mask.sum()),
                'sample_complaints': sample_descriptions
            })

        clusters.sort(key=lambda x: x['complaint_count'], reverse=True)
        return clusters

    def get_regional_heatmap(self, complaints_df):
        """
        Aggregate complaint counts by region x category.

        Parameters
        ----------
        complaints_df : pd.DataFrame
            Must contain 'region' and 'category' columns.

        Returns
        -------
        dict
            Keys: regions (list), categories (list), data (2D list of counts).
        """
        if complaints_df.empty:
            return {'regions': [], 'categories': [], 'data': []}

        required = ['region', 'category']
        for col in required:
            if col not in complaints_df.columns:
                return {'regions': [], 'categories': [], 'data': []}

        pivot = complaints_df.groupby(['region', 'category']).size().reset_index(name='count')

        regions = sorted(complaints_df['region'].dropna().unique().tolist())
        categories = sorted(complaints_df['category'].dropna().unique().tolist())

        # Build matrix
        data = []
        for region in regions:
            row = []
            for category in categories:
                match = pivot[(pivot['region'] == region) & (pivot['category'] == category)]
                count = int(match['count'].values[0]) if len(match) > 0 else 0
                row.append(count)
            data.append(row)

        return {
            'regions': regions,
            'categories': categories,
            'data': data
        }
