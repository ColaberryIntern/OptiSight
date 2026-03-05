"""
Sample training script for the Collaborative Filter model.

Demonstrates how to:
1. Create sample user-product interaction data
2. Fit the collaborative filter model
3. Generate recommendations for a specific user
4. Handle cold-start scenarios

Usage:
    cd ai_engine
    python scripts/train_model.py
"""

import sys
import os

# Add parent directory to path so we can import models
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pandas as pd
from models.collaborative_filter import CollaborativeFilter


def create_sample_data():
    """Create sample user-product interaction data for demonstration."""
    interactions = [
        # User A buys grocery staples
        {'user_id': 'user_A', 'product_id': 'milk', 'interaction_score': 5},
        {'user_id': 'user_A', 'product_id': 'bread', 'interaction_score': 4},
        {'user_id': 'user_A', 'product_id': 'eggs', 'interaction_score': 3},
        {'user_id': 'user_A', 'product_id': 'butter', 'interaction_score': 2},

        # User B has similar taste to User A plus some extras
        {'user_id': 'user_B', 'product_id': 'milk', 'interaction_score': 4},
        {'user_id': 'user_B', 'product_id': 'bread', 'interaction_score': 5},
        {'user_id': 'user_B', 'product_id': 'eggs', 'interaction_score': 2},
        {'user_id': 'user_B', 'product_id': 'cheese', 'interaction_score': 6},
        {'user_id': 'user_B', 'product_id': 'yogurt', 'interaction_score': 3},

        # User C has different preferences
        {'user_id': 'user_C', 'product_id': 'chips', 'interaction_score': 7},
        {'user_id': 'user_C', 'product_id': 'soda', 'interaction_score': 5},
        {'user_id': 'user_C', 'product_id': 'candy', 'interaction_score': 4},
        {'user_id': 'user_C', 'product_id': 'milk', 'interaction_score': 1},

        # User D shares some overlap with A and B
        {'user_id': 'user_D', 'product_id': 'milk', 'interaction_score': 3},
        {'user_id': 'user_D', 'product_id': 'bread', 'interaction_score': 3},
        {'user_id': 'user_D', 'product_id': 'cheese', 'interaction_score': 4},
        {'user_id': 'user_D', 'product_id': 'yogurt', 'interaction_score': 5},
        {'user_id': 'user_D', 'product_id': 'butter', 'interaction_score': 2},
    ]
    return pd.DataFrame(interactions)


def main():
    print('=' * 60)
    print('OptiSight AI Engine - Collaborative Filter Training Demo')
    print('=' * 60)

    # Step 1: Create sample data
    print('\n--- Step 1: Loading sample interaction data ---')
    df = create_sample_data()
    print(f'Loaded {len(df)} interactions from {df["user_id"].nunique()} users '
          f'across {df["product_id"].nunique()} products')
    print(f'\nUsers: {sorted(df["user_id"].unique())}')
    print(f'Products: {sorted(df["product_id"].unique())}')

    # Step 2: Fit the model
    print('\n--- Step 2: Training the collaborative filter ---')
    model = CollaborativeFilter()
    model.fit(df)
    print('Model trained successfully.')

    # Step 3: Generate recommendations for User A
    print('\n--- Step 3: Recommendations for user_A ---')
    print('User A has purchased: milk, bread, eggs, butter')
    recs = model.recommend('user_A', n=3)
    for i, rec in enumerate(recs, 1):
        print(f'  {i}. {rec["product_id"]} (score: {rec["score"]}) - {rec["reason"]}')

    # Step 4: Generate recommendations for User C
    print('\n--- Step 4: Recommendations for user_C ---')
    print('User C has purchased: chips, soda, candy, milk')
    recs = model.recommend('user_C', n=3)
    for i, rec in enumerate(recs, 1):
        print(f'  {i}. {rec["product_id"]} (score: {rec["score"]}) - {rec["reason"]}')

    # Step 5: Cold-start user (not in training data)
    print('\n--- Step 5: Cold-start user (user_NEW) ---')
    print('user_NEW has no purchase history.')
    recs = model.recommend('user_NEW', n=3)
    for i, rec in enumerate(recs, 1):
        print(f'  {i}. {rec["product_id"]} (score: {rec["score"]}) - {rec["reason"]}')

    # Step 6: Popular products
    print('\n--- Step 6: Global popular products ---')
    popular = model.get_popular(n=5)
    for i, p in enumerate(popular, 1):
        print(f'  {i}. {p["product_id"]} (score: {p["score"]}) - {p["reason"]}')

    print('\n' + '=' * 60)
    print('Training demo complete.')
    print('=' * 60)


if __name__ == '__main__':
    main()
