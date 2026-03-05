"""
Tests for the Customer Segmentation model and Flask /segment endpoint.

Covers:
- RFM computation from transaction data
- K-Means fitting on RFM data
- Segment prediction and label assignment
- Segment profile generation
- Silhouette score calculation
- Flask /segment endpoint integration tests
- Edge cases: empty data, single user, missing fields
"""

import json
import sys
import os

import pytest
import pandas as pd
import numpy as np

# Add ai_engine root to path so imports work
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from models.customer_segmentation import CustomerSegmentation
from app import app as flask_app


# ─────────────────────────────────────────────────────────────
# Sample data fixtures
# ─────────────────────────────────────────────────────────────

@pytest.fixture
def sample_transactions():
    """Create a sample transactions DataFrame for testing."""
    data = [
        {'user_id': 'u1', 'total_amount': 500, 'transaction_date': '2024-01-15'},
        {'user_id': 'u1', 'total_amount': 300, 'transaction_date': '2024-02-10'},
        {'user_id': 'u1', 'total_amount': 200, 'transaction_date': '2024-03-05'},

        {'user_id': 'u2', 'total_amount': 50, 'transaction_date': '2024-01-01'},

        {'user_id': 'u3', 'total_amount': 1000, 'transaction_date': '2024-03-01'},
        {'user_id': 'u3', 'total_amount': 800, 'transaction_date': '2024-03-10'},
        {'user_id': 'u3', 'total_amount': 600, 'transaction_date': '2024-03-12'},
        {'user_id': 'u3', 'total_amount': 400, 'transaction_date': '2024-03-14'},

        {'user_id': 'u4', 'total_amount': 150, 'transaction_date': '2024-02-01'},
        {'user_id': 'u4', 'total_amount': 100, 'transaction_date': '2024-02-15'},

        {'user_id': 'u5', 'total_amount': 2000, 'transaction_date': '2024-03-13'},
        {'user_id': 'u5', 'total_amount': 1500, 'transaction_date': '2024-03-14'},
        {'user_id': 'u5', 'total_amount': 1200, 'transaction_date': '2024-03-15'},

        {'user_id': 'u6', 'total_amount': 75, 'transaction_date': '2024-01-10'},
    ]
    return pd.DataFrame(data)


@pytest.fixture
def sample_transactions_list():
    """Return sample transactions as a list of dicts (for API calls)."""
    return [
        {'user_id': 'u1', 'total_amount': 500, 'transaction_date': '2024-01-15'},
        {'user_id': 'u1', 'total_amount': 300, 'transaction_date': '2024-02-10'},
        {'user_id': 'u1', 'total_amount': 200, 'transaction_date': '2024-03-05'},

        {'user_id': 'u2', 'total_amount': 50, 'transaction_date': '2024-01-01'},

        {'user_id': 'u3', 'total_amount': 1000, 'transaction_date': '2024-03-01'},
        {'user_id': 'u3', 'total_amount': 800, 'transaction_date': '2024-03-10'},
        {'user_id': 'u3', 'total_amount': 600, 'transaction_date': '2024-03-12'},
        {'user_id': 'u3', 'total_amount': 400, 'transaction_date': '2024-03-14'},

        {'user_id': 'u4', 'total_amount': 150, 'transaction_date': '2024-02-01'},
        {'user_id': 'u4', 'total_amount': 100, 'transaction_date': '2024-02-15'},

        {'user_id': 'u5', 'total_amount': 2000, 'transaction_date': '2024-03-13'},
        {'user_id': 'u5', 'total_amount': 1500, 'transaction_date': '2024-03-14'},
        {'user_id': 'u5', 'total_amount': 1200, 'transaction_date': '2024-03-15'},

        {'user_id': 'u6', 'total_amount': 75, 'transaction_date': '2024-01-10'},
    ]


@pytest.fixture
def segmenter_with_rfm(sample_transactions):
    """Return a CustomerSegmentation instance with computed RFM data."""
    seg = CustomerSegmentation()
    rfm = seg.compute_rfm(sample_transactions)
    return seg, rfm


@pytest.fixture
def fitted_segmenter(segmenter_with_rfm):
    """Return a fitted CustomerSegmentation instance and its RFM data."""
    seg, rfm = segmenter_with_rfm
    seg.fit(rfm, n_clusters=4)
    return seg, rfm


@pytest.fixture
def client():
    """Create a Flask test client."""
    flask_app.config['TESTING'] = True
    with flask_app.test_client() as c:
        yield c


# ─────────────────────────────────────────────────────────────
# RFM Computation Tests
# ─────────────────────────────────────────────────────────────

class TestComputeRFM:
    """Tests for the compute_rfm() method."""

    def test_compute_rfm_basic(self, sample_transactions):
        seg = CustomerSegmentation()
        rfm = seg.compute_rfm(sample_transactions)

        assert len(rfm) == 6
        assert list(rfm.columns) == ['user_id', 'recency', 'frequency', 'monetary']

        # All recency values should be positive integers
        assert (rfm['recency'] > 0).all()

        # All frequency values should be positive integers
        assert (rfm['frequency'] > 0).all()

        # All monetary values should be positive
        assert (rfm['monetary'] > 0).all()

    def test_compute_rfm_empty_data(self):
        seg = CustomerSegmentation()
        empty_df = pd.DataFrame(columns=['user_id', 'total_amount', 'transaction_date'])
        rfm = seg.compute_rfm(empty_df)

        assert rfm.empty
        assert list(rfm.columns) == ['user_id', 'recency', 'frequency', 'monetary']

    def test_compute_rfm_single_user(self):
        seg = CustomerSegmentation()
        df = pd.DataFrame([
            {'user_id': 'u1', 'total_amount': 100, 'transaction_date': '2024-03-15'},
        ])
        rfm = seg.compute_rfm(df)

        assert len(rfm) == 1
        assert rfm.iloc[0]['user_id'] == 'u1'
        assert rfm.iloc[0]['recency'] == 1  # Reference date is max + 1 day
        assert rfm.iloc[0]['frequency'] == 1
        assert rfm.iloc[0]['monetary'] == 100.0

    def test_compute_rfm_frequency_counts_transactions(self, sample_transactions):
        seg = CustomerSegmentation()
        rfm = seg.compute_rfm(sample_transactions)

        # u1 has 3 transactions
        u1_row = rfm[rfm['user_id'] == 'u1'].iloc[0]
        assert u1_row['frequency'] == 3

        # u2 has 1 transaction
        u2_row = rfm[rfm['user_id'] == 'u2'].iloc[0]
        assert u2_row['frequency'] == 1

        # u3 has 4 transactions
        u3_row = rfm[rfm['user_id'] == 'u3'].iloc[0]
        assert u3_row['frequency'] == 4

    def test_compute_rfm_monetary_sums_amounts(self, sample_transactions):
        seg = CustomerSegmentation()
        rfm = seg.compute_rfm(sample_transactions)

        # u1: 500 + 300 + 200 = 1000
        u1_row = rfm[rfm['user_id'] == 'u1'].iloc[0]
        assert u1_row['monetary'] == 1000.0

        # u5: 2000 + 1500 + 1200 = 4700
        u5_row = rfm[rfm['user_id'] == 'u5'].iloc[0]
        assert u5_row['monetary'] == 4700.0


# ─────────────────────────────────────────────────────────────
# Fit Tests
# ─────────────────────────────────────────────────────────────

class TestFit:
    """Tests for the fit() method."""

    def test_fit_basic(self, segmenter_with_rfm):
        seg, rfm = segmenter_with_rfm
        seg.fit(rfm, n_clusters=4)

        assert seg.model is not None
        assert seg.labels_ is not None
        assert len(seg.labels_) == len(rfm)
        assert seg.cluster_centers_ is not None
        assert seg.cluster_centers_.shape == (4, 3)

    def test_fit_with_fewer_users_than_clusters(self):
        seg = CustomerSegmentation()
        df = pd.DataFrame([
            {'user_id': 'u1', 'total_amount': 100, 'transaction_date': '2024-03-15'},
            {'user_id': 'u2', 'total_amount': 200, 'transaction_date': '2024-03-14'},
        ])
        rfm = seg.compute_rfm(df)
        seg.fit(rfm, n_clusters=4)

        # Should reduce n_clusters to number of users
        assert seg.model is not None
        assert seg.model.n_clusters == 2

    def test_fit_single_user(self):
        seg = CustomerSegmentation()
        df = pd.DataFrame([
            {'user_id': 'u1', 'total_amount': 100, 'transaction_date': '2024-03-15'},
        ])
        rfm = seg.compute_rfm(df)
        seg.fit(rfm, n_clusters=4)

        assert seg.model is not None
        assert seg.model.n_clusters == 1


# ─────────────────────────────────────────────────────────────
# Predict Tests
# ─────────────────────────────────────────────────────────────

class TestPredict:
    """Tests for the predict() method."""

    def test_predict_returns_segments(self, fitted_segmenter):
        seg, rfm = fitted_segmenter
        results = seg.predict(rfm)

        assert isinstance(results, list)
        assert len(results) == len(rfm)

        for result in results:
            assert 'user_id' in result
            assert 'segment' in result
            assert 'rfm_scores' in result
            assert 'recency' in result['rfm_scores']
            assert 'frequency' in result['rfm_scores']
            assert 'monetary' in result['rfm_scores']

    def test_predict_before_fit_raises(self):
        seg = CustomerSegmentation()
        rfm = pd.DataFrame({
            'user_id': ['u1'],
            'recency': [10],
            'frequency': [5],
            'monetary': [500.0],
        })

        with pytest.raises(ValueError, match='Model not fitted'):
            seg.predict(rfm)

    def test_predict_assigns_valid_segment_labels(self, fitted_segmenter):
        seg, rfm = fitted_segmenter
        results = seg.predict(rfm)

        valid_labels = set(seg.segment_labels) | {f'Segment_{i}' for i in range(10)}
        for result in results:
            assert result['segment'] in valid_labels

    def test_predict_user_ids_match(self, fitted_segmenter):
        seg, rfm = fitted_segmenter
        results = seg.predict(rfm)

        result_user_ids = {r['user_id'] for r in results}
        expected_user_ids = {str(uid) for uid in rfm['user_id'].values}
        assert result_user_ids == expected_user_ids


# ─────────────────────────────────────────────────────────────
# Segment Profile Tests
# ─────────────────────────────────────────────────────────────

class TestSegmentProfiles:
    """Tests for the get_segment_profiles() method."""

    def test_get_segment_profiles(self, fitted_segmenter):
        seg, rfm = fitted_segmenter
        profiles = seg.get_segment_profiles()

        assert isinstance(profiles, list)
        assert len(profiles) > 0

        for profile in profiles:
            assert 'segment' in profile
            assert 'count' in profile
            assert 'avg_recency' in profile
            assert 'avg_frequency' in profile
            assert 'avg_monetary' in profile
            assert isinstance(profile['count'], int)
            assert profile['count'] > 0

    def test_segment_labels_assigned_by_monetary(self, fitted_segmenter):
        seg, rfm = fitted_segmenter
        profiles = seg.get_segment_profiles()

        # Profiles should be sorted by avg_monetary descending
        monetary_values = [p['avg_monetary'] for p in profiles]
        assert monetary_values == sorted(monetary_values, reverse=True)

    def test_profiles_count_sums_to_total_users(self, fitted_segmenter):
        seg, rfm = fitted_segmenter
        profiles = seg.get_segment_profiles()

        total_count = sum(p['count'] for p in profiles)
        assert total_count == len(rfm)

    def test_profiles_empty_before_fit(self):
        seg = CustomerSegmentation()
        profiles = seg.get_segment_profiles()

        assert profiles == []


# ─────────────────────────────────────────────────────────────
# Silhouette Score Tests
# ─────────────────────────────────────────────────────────────

class TestSilhouetteScore:
    """Tests for the get_silhouette_score() method."""

    def test_silhouette_score(self, fitted_segmenter):
        seg, rfm = fitted_segmenter
        score = seg.get_silhouette_score(rfm)

        assert isinstance(score, float)
        # Silhouette score ranges from -1 to 1
        assert -1.0 <= score <= 1.0

    def test_silhouette_score_before_fit(self):
        seg = CustomerSegmentation()
        rfm = pd.DataFrame({
            'user_id': ['u1', 'u2', 'u3'],
            'recency': [10, 20, 30],
            'frequency': [5, 3, 1],
            'monetary': [500.0, 300.0, 100.0],
        })
        score = seg.get_silhouette_score(rfm)

        assert score == 0.0

    def test_silhouette_score_too_few_samples(self):
        seg = CustomerSegmentation()
        rfm = pd.DataFrame({
            'user_id': ['u1', 'u2'],
            'recency': [10, 20],
            'frequency': [5, 3],
            'monetary': [500.0, 300.0],
        })
        score = seg.get_silhouette_score(rfm)

        assert score == 0.0


# ─────────────────────────────────────────────────────────────
# Flask Endpoint Tests
# ─────────────────────────────────────────────────────────────

class TestFlaskSegmentEndpoint:
    """Tests for POST /segment."""

    def test_flask_segment_endpoint(self, client, sample_transactions_list):
        response = client.post('/segment', json={
            'transactions': sample_transactions_list,
        })

        assert response.status_code == 200
        data = response.get_json()

        assert 'segments' in data
        assert 'profiles' in data
        assert isinstance(data['segments'], list)
        assert isinstance(data['profiles'], list)
        assert len(data['segments']) > 0
        assert len(data['profiles']) > 0

        # Verify segment structure
        for seg in data['segments']:
            assert 'user_id' in seg
            assert 'segment' in seg
            assert 'rfm_scores' in seg

        # Verify profile structure
        for profile in data['profiles']:
            assert 'segment' in profile
            assert 'count' in profile
            assert 'avg_recency' in profile
            assert 'avg_frequency' in profile
            assert 'avg_monetary' in profile

    def test_flask_segment_empty_transactions(self, client):
        response = client.post('/segment', json={
            'transactions': [],
        })

        assert response.status_code == 200
        data = response.get_json()
        assert data['segments'] == []
        assert data['profiles'] == []

    def test_flask_segment_missing_fields(self, client):
        response = client.post('/segment', json={
            'transactions': [
                {'user_id': 'u1', 'total_amount': 100},
                # missing transaction_date
            ],
        })

        assert response.status_code == 400
        data = response.get_json()
        assert 'error' in data

    def test_flask_segment_missing_transactions_key(self, client):
        response = client.post('/segment', json={
            'data': [],
        })

        assert response.status_code == 400
        data = response.get_json()
        assert 'error' in data

    def test_flask_segment_custom_n_clusters(self, client, sample_transactions_list):
        response = client.post('/segment', json={
            'transactions': sample_transactions_list,
            'n_clusters': 3,
        })

        assert response.status_code == 200
        data = response.get_json()
        assert len(data['profiles']) <= 3
