"""
Tests for the ComplaintClusterer model and Flask /cluster-complaints endpoint.

Covers:
- Model fit with sample data
- Empty data handling
- Single complaint edge case
- Cluster output with keywords
- Calling get_clusters before fit
- Regional heatmap generation
- Regional heatmap with empty data
- Flask /cluster-complaints endpoint with valid data
- Flask /cluster-complaints endpoint with missing description
"""

import json
import sys
import os

import pytest
import pandas as pd
import numpy as np

# Add ai_engine root to path so imports work
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from models.complaint_clustering import ComplaintClusterer
from app import app as flask_app


# ─────────────────────────────────────────────────────────────
# Sample data fixtures
# ─────────────────────────────────────────────────────────────

@pytest.fixture
def sample_complaints_df():
    """Create a sample complaints DataFrame for testing."""
    data = [
        {'description': 'The product arrived damaged and broken packaging',
         'region': 'North', 'category': 'Shipping'},
        {'description': 'Package was delivered late after two weeks delay',
         'region': 'North', 'category': 'Shipping'},
        {'description': 'Item was defective and stopped working after one day',
         'region': 'South', 'category': 'Quality'},
        {'description': 'Poor customer service and rude staff members',
         'region': 'South', 'category': 'Service'},
        {'description': 'Wrong item delivered instead of what I ordered',
         'region': 'East', 'category': 'Shipping'},
        {'description': 'Product quality is very poor and cheap materials used',
         'region': 'East', 'category': 'Quality'},
        {'description': 'Refund was not processed after returning the item',
         'region': 'West', 'category': 'Billing'},
        {'description': 'Overcharged on my credit card for the purchase',
         'region': 'West', 'category': 'Billing'},
        {'description': 'The delivery driver left the package in the rain',
         'region': 'North', 'category': 'Shipping'},
        {'description': 'Staff was unhelpful and ignored my questions completely',
         'region': 'South', 'category': 'Service'},
    ]
    return pd.DataFrame(data)


@pytest.fixture
def sample_complaints_list():
    """Return sample complaints as a list of dicts (for API calls)."""
    return [
        {'description': 'The product arrived damaged and broken packaging',
         'region': 'North', 'category': 'Shipping'},
        {'description': 'Package was delivered late after two weeks delay',
         'region': 'North', 'category': 'Shipping'},
        {'description': 'Item was defective and stopped working after one day',
         'region': 'South', 'category': 'Quality'},
        {'description': 'Poor customer service and rude staff members',
         'region': 'South', 'category': 'Service'},
        {'description': 'Wrong item delivered instead of what I ordered',
         'region': 'East', 'category': 'Shipping'},
        {'description': 'Product quality is very poor and cheap materials used',
         'region': 'East', 'category': 'Quality'},
        {'description': 'Refund was not processed after returning the item',
         'region': 'West', 'category': 'Billing'},
        {'description': 'Overcharged on my credit card for the purchase',
         'region': 'West', 'category': 'Billing'},
        {'description': 'The delivery driver left the package in the rain',
         'region': 'North', 'category': 'Shipping'},
        {'description': 'Staff was unhelpful and ignored my questions completely',
         'region': 'South', 'category': 'Service'},
    ]


@pytest.fixture
def client():
    """Create a Flask test client."""
    flask_app.config['TESTING'] = True
    with flask_app.test_client() as c:
        yield c


# ─────────────────────────────────────────────────────────────
# ComplaintClusterer Model Tests
# ─────────────────────────────────────────────────────────────

class TestComplaintClustererFit:
    """Tests for the fit() method."""

    def test_fit_basic(self, sample_complaints_df):
        clusterer = ComplaintClusterer()
        result = clusterer.fit(sample_complaints_df, n_clusters=3)

        assert result is clusterer  # returns self
        assert clusterer.model is not None
        assert clusterer.labels_ is not None
        assert len(clusterer.labels_) == len(sample_complaints_df)
        assert clusterer.n_clusters == 3

    def test_fit_empty_data(self):
        clusterer = ComplaintClusterer()
        empty_df = pd.DataFrame(columns=['description', 'region', 'category'])
        clusterer.fit(empty_df, n_clusters=3)

        assert clusterer.model is None
        assert clusterer.labels_ is not None
        assert len(clusterer.labels_) == 0

    def test_fit_single_complaint(self):
        single_df = pd.DataFrame([{
            'description': 'Single complaint about broken product',
            'region': 'North',
            'category': 'Quality'
        }])
        clusterer = ComplaintClusterer()
        clusterer.fit(single_df, n_clusters=5)

        # Should reduce n_clusters to 1 since only 1 complaint
        assert clusterer.n_clusters == 1
        assert len(clusterer.labels_) == 1
        assert clusterer.labels_[0] == 0

    def test_fit_without_description_column(self):
        bad_df = pd.DataFrame([{'region': 'North', 'category': 'Quality'}])
        clusterer = ComplaintClusterer()
        clusterer.fit(bad_df, n_clusters=3)

        # Should handle missing description gracefully
        assert clusterer.model is None
        assert len(clusterer.labels_) == 0


class TestComplaintClustererGetClusters:
    """Tests for the get_clusters() method."""

    def test_get_clusters_returns_keywords(self, sample_complaints_df):
        clusterer = ComplaintClusterer()
        clusterer.fit(sample_complaints_df, n_clusters=3)
        clusters = clusterer.get_clusters(sample_complaints_df, top_terms=5)

        assert isinstance(clusters, list)
        assert len(clusters) == 3

        for cluster in clusters:
            assert 'cluster_id' in cluster
            assert 'top_keywords' in cluster
            assert 'complaint_count' in cluster
            assert 'sample_complaints' in cluster
            assert isinstance(cluster['top_keywords'], list)
            assert len(cluster['top_keywords']) <= 5
            assert cluster['complaint_count'] > 0

    def test_get_clusters_before_fit(self):
        clusterer = ComplaintClusterer()
        clusters = clusterer.get_clusters(pd.DataFrame())

        assert clusters == []

    def test_get_clusters_sorted_by_count(self, sample_complaints_df):
        clusterer = ComplaintClusterer()
        clusterer.fit(sample_complaints_df, n_clusters=3)
        clusters = clusterer.get_clusters(sample_complaints_df)

        # Should be sorted by complaint_count descending
        counts = [c['complaint_count'] for c in clusters]
        assert counts == sorted(counts, reverse=True)

    def test_get_clusters_total_equals_input_count(self, sample_complaints_df):
        clusterer = ComplaintClusterer()
        clusterer.fit(sample_complaints_df, n_clusters=3)
        clusters = clusterer.get_clusters(sample_complaints_df)

        total = sum(c['complaint_count'] for c in clusters)
        assert total == len(sample_complaints_df)


class TestComplaintClustererHeatmap:
    """Tests for the get_regional_heatmap() method."""

    def test_regional_heatmap_basic(self, sample_complaints_df):
        clusterer = ComplaintClusterer()
        heatmap = clusterer.get_regional_heatmap(sample_complaints_df)

        assert 'regions' in heatmap
        assert 'categories' in heatmap
        assert 'data' in heatmap

        assert set(heatmap['regions']) == {'North', 'South', 'East', 'West'}
        assert set(heatmap['categories']) == {'Shipping', 'Quality', 'Service', 'Billing'}

        # Data matrix should be regions x categories
        assert len(heatmap['data']) == len(heatmap['regions'])
        for row in heatmap['data']:
            assert len(row) == len(heatmap['categories'])

    def test_regional_heatmap_empty(self):
        clusterer = ComplaintClusterer()
        empty_df = pd.DataFrame(columns=['description', 'region', 'category'])
        heatmap = clusterer.get_regional_heatmap(empty_df)

        assert heatmap == {'regions': [], 'categories': [], 'data': []}

    def test_regional_heatmap_missing_columns(self):
        clusterer = ComplaintClusterer()
        bad_df = pd.DataFrame([{'description': 'test'}])
        heatmap = clusterer.get_regional_heatmap(bad_df)

        assert heatmap == {'regions': [], 'categories': [], 'data': []}

    def test_regional_heatmap_counts_correct(self):
        df = pd.DataFrame([
            {'description': 'a', 'region': 'North', 'category': 'Shipping'},
            {'description': 'b', 'region': 'North', 'category': 'Shipping'},
            {'description': 'c', 'region': 'North', 'category': 'Quality'},
            {'description': 'd', 'region': 'South', 'category': 'Shipping'},
        ])
        clusterer = ComplaintClusterer()
        heatmap = clusterer.get_regional_heatmap(df)

        # North should have 2 Shipping, 1 Quality
        north_idx = heatmap['regions'].index('North')
        shipping_idx = heatmap['categories'].index('Shipping')
        quality_idx = heatmap['categories'].index('Quality')

        assert heatmap['data'][north_idx][shipping_idx] == 2
        assert heatmap['data'][north_idx][quality_idx] == 1


# ─────────────────────────────────────────────────────────────
# Flask Endpoint Tests
# ─────────────────────────────────────────────────────────────

class TestClusterComplaintsEndpoint:
    """Tests for POST /cluster-complaints."""

    def test_flask_cluster_endpoint(self, client, sample_complaints_list):
        response = client.post('/cluster-complaints', json={
            'complaints': sample_complaints_list,
            'n_clusters': 3,
        })

        assert response.status_code == 200
        data = response.get_json()
        assert 'clusters' in data
        assert 'heatmap' in data
        assert isinstance(data['clusters'], list)
        assert len(data['clusters']) == 3

        for cluster in data['clusters']:
            assert 'cluster_id' in cluster
            assert 'top_keywords' in cluster
            assert 'complaint_count' in cluster
            assert 'sample_complaints' in cluster

        # Verify heatmap structure
        heatmap = data['heatmap']
        assert 'regions' in heatmap
        assert 'categories' in heatmap
        assert 'data' in heatmap

    def test_flask_cluster_missing_description(self, client):
        response = client.post('/cluster-complaints', json={
            'complaints': [
                {'region': 'North', 'category': 'Shipping'},
                {'region': 'South', 'category': 'Quality'},
            ],
        })

        assert response.status_code == 400
        data = response.get_json()
        assert 'error' in data
        assert 'description' in data['error'].lower()

    def test_flask_cluster_empty_complaints(self, client):
        response = client.post('/cluster-complaints', json={
            'complaints': [],
        })

        assert response.status_code == 200
        data = response.get_json()
        assert data['clusters'] == []
        assert data['heatmap'] == {'regions': [], 'categories': [], 'data': []}

    def test_flask_cluster_missing_complaints_field(self, client):
        response = client.post('/cluster-complaints', json={
            'n_clusters': 3,
        })

        assert response.status_code == 400
        data = response.get_json()
        assert 'error' in data

    def test_flask_cluster_default_n_clusters(self, client, sample_complaints_list):
        response = client.post('/cluster-complaints', json={
            'complaints': sample_complaints_list,
        })

        assert response.status_code == 200
        data = response.get_json()
        assert 'clusters' in data
        # Default is 5 clusters, but may be less if fewer distinct complaints
        assert len(data['clusters']) <= 5
