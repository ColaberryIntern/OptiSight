"""
Tests for the Collaborative Filter model and Flask /predict endpoint.

Covers:
- Model fit with sample data
- Recommendations for user with purchase history
- Cold-start fallback (user not in training data)
- Flask /predict endpoint with sample data
- Flask /health endpoint
- Edge cases: empty interactions, missing fields
"""

import json
import sys
import os

import pytest
import pandas as pd

# Add ai_engine root to path so imports work
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from models.collaborative_filter import CollaborativeFilter
from app import app as flask_app


# ─────────────────────────────────────────────────────────────
# Sample data fixtures
# ─────────────────────────────────────────────────────────────

@pytest.fixture
def sample_interactions():
    """Create a sample interactions DataFrame for testing."""
    data = [
        {'user_id': 'u1', 'product_id': 'p1', 'interaction_score': 5},
        {'user_id': 'u1', 'product_id': 'p2', 'interaction_score': 3},
        {'user_id': 'u1', 'product_id': 'p3', 'interaction_score': 1},

        {'user_id': 'u2', 'product_id': 'p1', 'interaction_score': 4},
        {'user_id': 'u2', 'product_id': 'p2', 'interaction_score': 5},
        {'user_id': 'u2', 'product_id': 'p4', 'interaction_score': 3},
        {'user_id': 'u2', 'product_id': 'p5', 'interaction_score': 2},

        {'user_id': 'u3', 'product_id': 'p3', 'interaction_score': 4},
        {'user_id': 'u3', 'product_id': 'p4', 'interaction_score': 5},
        {'user_id': 'u3', 'product_id': 'p5', 'interaction_score': 3},
        {'user_id': 'u3', 'product_id': 'p6', 'interaction_score': 2},

        {'user_id': 'u4', 'product_id': 'p1', 'interaction_score': 2},
        {'user_id': 'u4', 'product_id': 'p6', 'interaction_score': 4},
        {'user_id': 'u4', 'product_id': 'p7', 'interaction_score': 6},
    ]
    return pd.DataFrame(data)


@pytest.fixture
def fitted_model(sample_interactions):
    """Return a CollaborativeFilter model fitted on sample data."""
    model = CollaborativeFilter()
    model.fit(sample_interactions)
    return model


@pytest.fixture
def client():
    """Create a Flask test client."""
    flask_app.config['TESTING'] = True
    with flask_app.test_client() as c:
        yield c


@pytest.fixture
def sample_interactions_list():
    """Return sample interactions as a list of dicts (for API calls)."""
    return [
        {'user_id': 'u1', 'product_id': 'p1', 'interaction_score': 5},
        {'user_id': 'u1', 'product_id': 'p2', 'interaction_score': 3},
        {'user_id': 'u1', 'product_id': 'p3', 'interaction_score': 1},

        {'user_id': 'u2', 'product_id': 'p1', 'interaction_score': 4},
        {'user_id': 'u2', 'product_id': 'p2', 'interaction_score': 5},
        {'user_id': 'u2', 'product_id': 'p4', 'interaction_score': 3},
        {'user_id': 'u2', 'product_id': 'p5', 'interaction_score': 2},

        {'user_id': 'u3', 'product_id': 'p3', 'interaction_score': 4},
        {'user_id': 'u3', 'product_id': 'p4', 'interaction_score': 5},
        {'user_id': 'u3', 'product_id': 'p5', 'interaction_score': 3},
        {'user_id': 'u3', 'product_id': 'p6', 'interaction_score': 2},

        {'user_id': 'u4', 'product_id': 'p1', 'interaction_score': 2},
        {'user_id': 'u4', 'product_id': 'p6', 'interaction_score': 4},
        {'user_id': 'u4', 'product_id': 'p7', 'interaction_score': 6},
    ]


# ─────────────────────────────────────────────────────────────
# CollaborativeFilter Model Tests
# ─────────────────────────────────────────────────────────────

class TestCollaborativeFilterFit:
    """Tests for the fit() method."""

    def test_fit_sets_internal_state(self, sample_interactions):
        model = CollaborativeFilter()
        model.fit(sample_interactions)

        assert model._is_fitted is True
        assert model.interaction_matrix is not None
        assert model.similarity_matrix is not None
        assert len(model.user_ids) == 4
        assert len(model.product_ids) == 7

    def test_fit_with_empty_dataframe(self):
        model = CollaborativeFilter()
        empty_df = pd.DataFrame(columns=['user_id', 'product_id', 'interaction_score'])
        model.fit(empty_df)

        assert model._is_fitted is False

    def test_fit_with_missing_columns_raises_error(self):
        model = CollaborativeFilter()
        bad_df = pd.DataFrame({'user_id': ['u1'], 'product_id': ['p1']})

        with pytest.raises(ValueError, match='Missing required columns'):
            model.fit(bad_df)

    def test_fit_aggregates_duplicate_interactions(self):
        df = pd.DataFrame([
            {'user_id': 'u1', 'product_id': 'p1', 'interaction_score': 3},
            {'user_id': 'u1', 'product_id': 'p1', 'interaction_score': 2},
        ])
        model = CollaborativeFilter()
        model.fit(df)

        # Should aggregate to 5
        assert model.interaction_matrix.loc['u1', 'p1'] == 5


class TestCollaborativeFilterRecommend:
    """Tests for the recommend() method."""

    def test_recommend_returns_list_of_dicts(self, fitted_model):
        recs = fitted_model.recommend('u1', n=3)

        assert isinstance(recs, list)
        assert len(recs) > 0
        for rec in recs:
            assert 'product_id' in rec
            assert 'score' in rec
            assert 'reason' in rec

    def test_recommend_excludes_already_purchased(self, fitted_model):
        recs = fitted_model.recommend('u1', n=5)
        purchased = {'p1', 'p2', 'p3'}

        # Collaborative-filtering based recs should not include already purchased products
        cf_recs = [r for r in recs if 'similar users' in r['reason']]
        for rec in cf_recs:
            assert rec['product_id'] not in purchased

    def test_recommend_scores_between_0_and_1(self, fitted_model):
        recs = fitted_model.recommend('u1', n=5)

        for rec in recs:
            assert 0 <= rec['score'] <= 1.0

    def test_recommend_respects_n_parameter(self, fitted_model):
        recs = fitted_model.recommend('u1', n=2)

        assert len(recs) <= 2

    def test_recommend_for_unfitted_model_returns_empty(self):
        model = CollaborativeFilter()
        recs = model.recommend('u1', n=3)

        assert recs == []


class TestCollaborativeFilterColdStart:
    """Tests for cold-start fallback behavior."""

    def test_cold_start_returns_popular_products(self, fitted_model):
        recs = fitted_model.recommend('unknown_user', n=3)

        assert len(recs) > 0
        for rec in recs:
            assert 'cold-start' in rec['reason'].lower() or 'popular' in rec['reason'].lower()

    def test_cold_start_returns_correct_count(self, fitted_model):
        recs = fitted_model.recommend('unknown_user', n=3)

        assert len(recs) == 3

    def test_get_popular_returns_sorted_by_score(self, fitted_model):
        popular = fitted_model.get_popular(n=5)

        scores = [p['score'] for p in popular]
        assert scores == sorted(scores, reverse=True)

    def test_get_popular_on_unfitted_model_returns_empty(self):
        model = CollaborativeFilter()
        popular = model.get_popular(n=3)

        assert popular == []


# ─────────────────────────────────────────────────────────────
# Flask Endpoint Tests
# ─────────────────────────────────────────────────────────────

class TestHealthEndpoint:
    """Tests for GET /health."""

    def test_health_returns_200(self, client):
        response = client.get('/health')

        assert response.status_code == 200
        data = response.get_json()
        assert data['status'] == 'ok'
        assert data['service'] == 'ai_engine'


class TestPredictEndpoint:
    """Tests for POST /predict."""

    def test_predict_returns_recommendations(self, client, sample_interactions_list):
        response = client.post('/predict', json={
            'user_id': 'u1',
            'interactions': sample_interactions_list,
            'n': 3,
        })

        assert response.status_code == 200
        data = response.get_json()
        assert 'recommendations' in data
        assert isinstance(data['recommendations'], list)
        assert len(data['recommendations']) > 0

        for rec in data['recommendations']:
            assert 'product_id' in rec
            assert 'score' in rec
            assert 'reason' in rec

    def test_predict_cold_start_user(self, client, sample_interactions_list):
        response = client.post('/predict', json={
            'user_id': 'new_user_xyz',
            'interactions': sample_interactions_list,
            'n': 3,
        })

        assert response.status_code == 200
        data = response.get_json()
        assert 'recommendations' in data
        assert len(data['recommendations']) > 0

        # Should return popularity-based results
        for rec in data['recommendations']:
            assert 'popular' in rec['reason'].lower() or 'cold-start' in rec['reason'].lower()

    def test_predict_empty_interactions_returns_empty(self, client):
        response = client.post('/predict', json={
            'user_id': 'u1',
            'interactions': [],
            'n': 5,
        })

        assert response.status_code == 200
        data = response.get_json()
        assert data['recommendations'] == []

    def test_predict_missing_user_id_returns_400(self, client):
        response = client.post('/predict', json={
            'interactions': [],
        })

        assert response.status_code == 400
        data = response.get_json()
        assert 'error' in data

    def test_predict_missing_body_returns_400(self, client):
        response = client.post('/predict',
                               data='not json',
                               content_type='text/plain')

        assert response.status_code == 400

    def test_predict_missing_interaction_fields_returns_400(self, client):
        response = client.post('/predict', json={
            'user_id': 'u1',
            'interactions': [
                {'user_id': 'u1', 'product_id': 'p1'},  # missing interaction_score
            ],
            'n': 3,
        })

        assert response.status_code == 400
        data = response.get_json()
        assert 'error' in data

    def test_predict_default_n_when_not_provided(self, client, sample_interactions_list):
        response = client.post('/predict', json={
            'user_id': 'u1',
            'interactions': sample_interactions_list,
        })

        assert response.status_code == 200
        data = response.get_json()
        assert 'recommendations' in data
        # Default n=5, should have some recommendations
        assert len(data['recommendations']) <= 5
