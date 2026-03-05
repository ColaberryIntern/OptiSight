"""
Customer Segmentation using K-Means Clustering on RFM Data.

Computes Recency, Frequency, and Monetary scores from transaction data,
then applies K-Means clustering to segment customers into meaningful groups
(e.g., Champions, Loyal, At-Risk, Lost).
"""

import pandas as pd
import numpy as np
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import silhouette_score


class CustomerSegmentation:
    """K-Means clustering on RFM (Recency, Frequency, Monetary) data."""

    def __init__(self):
        self.model = None
        self.scaler = StandardScaler()
        self.segment_labels = ['Lost', 'At-Risk', 'Loyal', 'Champions']
        self.cluster_centers_ = None
        self.labels_ = None

    def compute_rfm(self, transactions_df):
        """
        Compute RFM scores from transaction data.

        Args:
            transactions_df: DataFrame with columns [user_id, total_amount, transaction_date]

        Returns:
            DataFrame with columns [user_id, recency, frequency, monetary]
        """
        if transactions_df.empty:
            return pd.DataFrame(columns=['user_id', 'recency', 'frequency', 'monetary'])

        transactions_df = transactions_df.copy()
        transactions_df['transaction_date'] = pd.to_datetime(transactions_df['transaction_date'])

        reference_date = transactions_df['transaction_date'].max() + pd.Timedelta(days=1)

        rfm = transactions_df.groupby('user_id').agg({
            'transaction_date': lambda x: (reference_date - x.max()).days,
            'total_amount': ['count', 'sum']
        }).reset_index()

        rfm.columns = ['user_id', 'recency', 'frequency', 'monetary']
        return rfm

    def fit(self, rfm_df, n_clusters=4):
        """
        Fit K-Means model on RFM data.

        Args:
            rfm_df: DataFrame with columns [user_id, recency, frequency, monetary]
            n_clusters: Number of clusters (default 4)

        Returns:
            self
        """
        if len(rfm_df) < n_clusters:
            n_clusters = max(1, len(rfm_df))

        features = rfm_df[['recency', 'frequency', 'monetary']].values
        scaled_features = self.scaler.fit_transform(features)

        self.model = KMeans(n_clusters=n_clusters, random_state=42, n_init=10)
        self.labels_ = self.model.fit_predict(scaled_features)
        self.cluster_centers_ = self.scaler.inverse_transform(self.model.cluster_centers_)

        # Order clusters by monetary value (descending) to assign meaningful labels
        center_monetary = self.cluster_centers_[:, 2]  # monetary is column index 2
        sorted_indices = np.argsort(-center_monetary)

        label_map = {}
        for rank, cluster_idx in enumerate(sorted_indices):
            if rank < len(self.segment_labels):
                label_map[cluster_idx] = self.segment_labels[rank]
            else:
                label_map[cluster_idx] = f'Segment_{rank}'

        self._label_map = label_map
        return self

    def predict(self, rfm_df):
        """
        Assign segments to users based on their RFM data.

        Args:
            rfm_df: DataFrame with [user_id, recency, frequency, monetary]

        Returns:
            List of dicts: [{user_id, segment, rfm_scores: {recency, frequency, monetary}}]
        """
        if self.model is None:
            raise ValueError('Model not fitted. Call fit() first.')

        features = rfm_df[['recency', 'frequency', 'monetary']].values
        scaled_features = self.scaler.transform(features)
        cluster_labels = self.model.predict(scaled_features)

        results = []
        for i, row in rfm_df.iterrows():
            cluster_id = cluster_labels[i] if isinstance(i, int) else cluster_labels[list(rfm_df.index).index(i)]
            segment = self._label_map.get(cluster_id, f'Segment_{cluster_id}')
            results.append({
                'user_id': str(row['user_id']),
                'segment': segment,
                'rfm_scores': {
                    'recency': int(row['recency']),
                    'frequency': int(row['frequency']),
                    'monetary': float(row['monetary'])
                }
            })
        return results

    def get_segment_profiles(self):
        """
        Get profile summary for each segment.

        Returns:
            List of dicts with segment profile info
        """
        if self.cluster_centers_ is None:
            return []

        profiles = []
        for cluster_id, label in self._label_map.items():
            center = self.cluster_centers_[cluster_id]
            count = int(np.sum(self.labels_ == cluster_id))
            profiles.append({
                'segment': label,
                'count': count,
                'avg_recency': round(float(center[0]), 1),
                'avg_frequency': round(float(center[1]), 1),
                'avg_monetary': round(float(center[2]), 2),
            })

        # Sort by monetary desc
        profiles.sort(key=lambda x: x['avg_monetary'], reverse=True)
        return profiles

    def get_silhouette_score(self, rfm_df):
        """Calculate silhouette score for current clustering."""
        if self.model is None or len(rfm_df) < 3:
            return 0.0
        features = rfm_df[['recency', 'frequency', 'monetary']].values
        scaled = self.scaler.transform(features)
        labels = self.model.predict(scaled)
        if len(set(labels)) < 2:
            return 0.0
        return float(silhouette_score(scaled, labels))
