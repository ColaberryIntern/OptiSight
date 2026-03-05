"""
Tests for the InventoryOptimizer model and Flask /optimize-inventory endpoint.

Covers:
- EOQ calculation (basic and edge cases)
- Safety stock calculation
- Reorder point calculation
- Full optimization with sample product/transaction data
- Status classification (reorder_now, low_stock, overstock, ok)
- Flask /optimize-inventory endpoint
- Edge cases: empty products, missing fields, zero demand
"""

import json
import math
import sys
import os

import pytest
import numpy as np
import pandas as pd

# Add ai_engine root to path so imports work
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from models.inventory_optimizer import InventoryOptimizer
from app import app as flask_app


# ─────────────────────────────────────────────────────────────
# Fixtures
# ─────────────────────────────────────────────────────────────

@pytest.fixture
def optimizer():
    """Return a fresh InventoryOptimizer instance."""
    return InventoryOptimizer()


@pytest.fixture
def sample_products():
    """Create a sample products DataFrame."""
    return pd.DataFrame([
        {'product_id': 'p1', 'product_name': 'Widget A', 'price': 20.0, 'inventory_count': 5},
        {'product_id': 'p2', 'product_name': 'Widget B', 'price': 50.0, 'inventory_count': 200},
        {'product_id': 'p3', 'product_name': 'Widget C', 'price': 10.0, 'inventory_count': 50},
    ])


@pytest.fixture
def sample_transactions():
    """Create sample transactions with JSONB items arrays."""
    return pd.DataFrame([
        {
            'items': [
                {'product_id': 'p1', 'quantity': 3},
                {'product_id': 'p3', 'quantity': 1},
            ],
            'transaction_date': '2025-01-01',
        },
        {
            'items': [
                {'product_id': 'p1', 'quantity': 2},
                {'product_id': 'p2', 'quantity': 1},
            ],
            'transaction_date': '2025-01-05',
        },
        {
            'items': [
                {'product_id': 'p1', 'quantity': 4},
                {'product_id': 'p3', 'quantity': 2},
            ],
            'transaction_date': '2025-01-10',
        },
        {
            'items': [
                {'product_id': 'p1', 'quantity': 1},
            ],
            'transaction_date': '2025-01-15',
        },
    ])


@pytest.fixture
def client():
    """Create a Flask test client."""
    flask_app.config['TESTING'] = True
    with flask_app.test_client() as c:
        yield c


# ─────────────────────────────────────────────────────────────
# EOQ Calculation Tests
# ─────────────────────────────────────────────────────────────

class TestCalculateEOQ:
    """Tests for the calculate_eoq() method."""

    def test_calculate_eoq_basic(self, optimizer):
        """Standard EOQ calculation: sqrt(2 * 1000 * 50 / 5) = sqrt(20000) ~= 141.42."""
        eoq = optimizer.calculate_eoq(
            annual_demand=1000,
            ordering_cost=50,
            holding_cost_per_unit=5,
        )
        expected = math.sqrt(2 * 1000 * 50 / 5)
        assert abs(eoq - expected) < 0.01

    def test_calculate_eoq_zero_demand(self, optimizer):
        """EOQ should be 0 when annual demand is 0."""
        eoq = optimizer.calculate_eoq(
            annual_demand=0,
            ordering_cost=50,
            holding_cost_per_unit=5,
        )
        assert eoq == 0

    def test_calculate_eoq_negative_inputs(self, optimizer):
        """EOQ should be 0 for negative inputs."""
        assert optimizer.calculate_eoq(-100, 50, 5) == 0
        assert optimizer.calculate_eoq(100, -50, 5) == 0
        assert optimizer.calculate_eoq(100, 50, -5) == 0

    def test_calculate_eoq_returns_float(self, optimizer):
        """EOQ should always return a float."""
        eoq = optimizer.calculate_eoq(1000, 50, 5)
        assert isinstance(eoq, float)


# ─────────────────────────────────────────────────────────────
# Safety Stock Tests
# ─────────────────────────────────────────────────────────────

class TestCalculateSafetyStock:
    """Tests for the calculate_safety_stock() method."""

    def test_calculate_safety_stock(self, optimizer):
        """Safety stock should be positive for valid inputs."""
        ss = optimizer.calculate_safety_stock(
            demand_std=5.0,
            lead_time_days=7,
            service_level=0.95,
        )
        assert ss > 0

    def test_calculate_safety_stock_zero_std(self, optimizer):
        """Safety stock should be 0 when demand std dev is 0."""
        ss = optimizer.calculate_safety_stock(
            demand_std=0,
            lead_time_days=7,
        )
        assert ss == 0

    def test_calculate_safety_stock_zero_lead_time(self, optimizer):
        """Safety stock should be 0 when lead time is 0."""
        ss = optimizer.calculate_safety_stock(
            demand_std=5.0,
            lead_time_days=0,
        )
        assert ss == 0

    def test_calculate_safety_stock_higher_service_level(self, optimizer):
        """Higher service level should require more safety stock."""
        ss_95 = optimizer.calculate_safety_stock(5.0, 7, service_level=0.95)
        ss_99 = optimizer.calculate_safety_stock(5.0, 7, service_level=0.99)
        assert ss_99 > ss_95


# ─────────────────────────────────────────────────────────────
# Reorder Point Tests
# ─────────────────────────────────────────────────────────────

class TestCalculateReorderPoint:
    """Tests for the calculate_reorder_point() method."""

    def test_calculate_reorder_point(self, optimizer):
        """ROP = avg_daily_demand * lead_time + safety_stock."""
        rop = optimizer.calculate_reorder_point(
            avg_daily_demand=10,
            lead_time_days=7,
            safety_stock=20,
        )
        assert rop == 90.0  # 10 * 7 + 20

    def test_calculate_reorder_point_zero_demand(self, optimizer):
        """ROP should equal safety stock when demand is 0."""
        rop = optimizer.calculate_reorder_point(0, 7, 20)
        assert rop == 20.0


# ─────────────────────────────────────────────────────────────
# Full Optimize Tests
# ─────────────────────────────────────────────────────────────

class TestOptimize:
    """Tests for the optimize() method."""

    def test_optimize_basic(self, optimizer, sample_products, sample_transactions):
        """Optimize should return a recommendation for each product."""
        recs = optimizer.optimize(sample_products, sample_transactions)

        assert isinstance(recs, list)
        assert len(recs) == 3  # one per product

        for rec in recs:
            assert 'product_id' in rec
            assert 'product_name' in rec
            assert 'current_stock' in rec
            assert 'eoq' in rec
            assert 'safety_stock' in rec
            assert 'reorder_point' in rec
            assert 'status' in rec
            assert 'daily_demand_avg' in rec
            assert 'days_of_supply' in rec

    def test_optimize_empty_products(self, optimizer, sample_transactions):
        """Optimize should return empty list for empty products."""
        empty_products = pd.DataFrame()
        recs = optimizer.optimize(empty_products, sample_transactions)
        assert recs == []

    def test_optimize_empty_transactions(self, optimizer, sample_products):
        """Optimize should work with no transactions (all products will have zero demand)."""
        empty_txns = pd.DataFrame()
        recs = optimizer.optimize(sample_products, empty_txns)
        assert len(recs) == 3
        for rec in recs:
            assert rec['daily_demand_avg'] == 0
            assert rec['days_of_supply'] == float('inf')

    def test_optimize_status_classification(self, optimizer):
        """Test that status is correctly assigned based on stock vs reorder point."""
        # Product with very low stock should be reorder_now
        products = pd.DataFrame([
            {'product_id': 'p1', 'product_name': 'Low Stock', 'price': 10.0, 'inventory_count': 1},
            {'product_id': 'p2', 'product_name': 'OK Stock', 'price': 10.0, 'inventory_count': 1000},
        ])

        # Create transactions that give p1 high demand
        transactions = pd.DataFrame([
            {
                'items': [{'product_id': 'p1', 'quantity': 50}],
                'transaction_date': '2025-01-01',
            },
            {
                'items': [{'product_id': 'p1', 'quantity': 50}],
                'transaction_date': '2025-01-10',
            },
        ])

        recs = optimizer.optimize(products, transactions)
        rec_map = {r['product_id']: r for r in recs}

        # p1 has high demand (100 units over 10 days) and only 1 in stock
        assert rec_map['p1']['status'] == 'reorder_now'

    def test_optimize_sorted_by_urgency(self, optimizer, sample_products, sample_transactions):
        """Recommendations should be sorted with reorder_now first."""
        recs = optimizer.optimize(sample_products, sample_transactions)

        status_order = {'reorder_now': 0, 'low_stock': 1, 'overstock': 2, 'ok': 3}
        statuses = [status_order.get(r['status'], 99) for r in recs]
        assert statuses == sorted(statuses)

    def test_optimize_json_string_items(self, optimizer):
        """Transactions with JSON string items should be parsed correctly."""
        products = pd.DataFrame([
            {'product_id': 'p1', 'product_name': 'Test', 'price': 10.0, 'inventory_count': 50},
        ])
        transactions = pd.DataFrame([
            {
                'items': json.dumps([{'product_id': 'p1', 'quantity': 5}]),
                'transaction_date': '2025-01-01',
            },
        ])

        recs = optimizer.optimize(products, transactions)
        assert len(recs) == 1
        assert recs[0]['daily_demand_avg'] > 0


# ─────────────────────────────────────────────────────────────
# Flask Endpoint Tests
# ─────────────────────────────────────────────────────────────

class TestOptimizeInventoryEndpoint:
    """Tests for POST /optimize-inventory."""

    def test_flask_optimize_endpoint(self, client):
        """Endpoint should return recommendations for valid input."""
        response = client.post('/optimize-inventory', json={
            'products': [
                {'product_id': 'p1', 'product_name': 'Widget', 'price': 20.0, 'inventory_count': 10},
            ],
            'transactions': [
                {
                    'items': [{'product_id': 'p1', 'quantity': 5}],
                    'transaction_date': '2025-01-01',
                },
                {
                    'items': [{'product_id': 'p1', 'quantity': 3}],
                    'transaction_date': '2025-01-10',
                },
            ],
        })

        assert response.status_code == 200
        data = response.get_json()
        assert 'recommendations' in data
        assert isinstance(data['recommendations'], list)
        assert len(data['recommendations']) == 1

        rec = data['recommendations'][0]
        assert rec['product_id'] == 'p1'
        assert 'eoq' in rec
        assert 'status' in rec

    def test_flask_optimize_missing_products(self, client):
        """Endpoint should return 400 when products field is missing."""
        response = client.post('/optimize-inventory', json={
            'transactions': [],
        })

        assert response.status_code == 400
        data = response.get_json()
        assert 'error' in data

    def test_flask_optimize_empty_products(self, client):
        """Endpoint should return empty recommendations for empty products list."""
        response = client.post('/optimize-inventory', json={
            'products': [],
        })

        assert response.status_code == 200
        data = response.get_json()
        assert data['recommendations'] == []

    def test_flask_optimize_no_transactions(self, client):
        """Endpoint should work with products but no transactions."""
        response = client.post('/optimize-inventory', json={
            'products': [
                {'product_id': 'p1', 'product_name': 'Widget', 'price': 20.0, 'inventory_count': 100},
            ],
        })

        assert response.status_code == 200
        data = response.get_json()
        assert len(data['recommendations']) == 1
        assert data['recommendations'][0]['daily_demand_avg'] == 0
