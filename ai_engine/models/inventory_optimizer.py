"""
Inventory Optimization using Economic Order Quantity (EOQ).

Calculates optimal order quantities, safety stock levels, and reorder points
based on historical transaction demand data. Classifies product inventory
status as reorder_now, low_stock, overstock, or ok.
"""

import json

import numpy as np
import pandas as pd
from scipy.stats import norm


class InventoryOptimizer:
    """Economic Order Quantity (EOQ) based inventory optimization."""

    def calculate_eoq(self, annual_demand, ordering_cost, holding_cost_per_unit):
        """
        Calculate Economic Order Quantity.

        EOQ = sqrt(2 * D * S / H)
        where D = annual demand, S = ordering cost per order, H = holding cost per unit per year

        Args:
            annual_demand: Annual demand in units (D)
            ordering_cost: Cost per order placed (S)
            holding_cost_per_unit: Holding cost per unit per year (H)

        Returns:
            Optimal order quantity as float
        """
        if annual_demand <= 0 or ordering_cost <= 0 or holding_cost_per_unit <= 0:
            return 0
        return float(np.sqrt((2 * annual_demand * ordering_cost) / holding_cost_per_unit))

    def calculate_safety_stock(self, demand_std, lead_time_days, service_level=0.95):
        """
        Calculate safety stock.

        SS = Z * sigma_d * sqrt(L)
        where Z = z-score for service level, sigma_d = daily demand std dev,
        L = lead time in days

        Args:
            demand_std: Standard deviation of daily demand
            lead_time_days: Supplier lead time in days
            service_level: Desired service level (default 0.95 = 95%)

        Returns:
            Safety stock quantity as float
        """
        if demand_std <= 0 or lead_time_days <= 0:
            return 0
        z_score = norm.ppf(service_level)
        return float(z_score * demand_std * np.sqrt(lead_time_days))

    def calculate_reorder_point(self, avg_daily_demand, lead_time_days, safety_stock):
        """
        Calculate reorder point.

        ROP = (avg_daily_demand * lead_time) + safety_stock

        Args:
            avg_daily_demand: Average daily demand in units
            lead_time_days: Supplier lead time in days
            safety_stock: Safety stock quantity

        Returns:
            Reorder point as float
        """
        return float(avg_daily_demand * lead_time_days + safety_stock)

    def optimize(self, products_df, transactions_df, lead_time_days=7,
                 ordering_cost=50, holding_cost_rate=0.25):
        """
        Optimize inventory for all products.

        Args:
            products_df: DataFrame with [product_id, product_name, price, inventory_count]
            transactions_df: DataFrame with [items (JSONB containing product_ids), transaction_date]
            lead_time_days: Supplier lead time in days
            ordering_cost: Cost per order placed
            holding_cost_rate: Annual holding cost as fraction of unit price

        Returns:
            List of recommendation dicts per product, sorted by urgency
        """
        if products_df.empty:
            return []

        # Calculate demand per product from transactions
        product_demand = self._calculate_product_demand(transactions_df)

        recommendations = []
        for _, product in products_df.iterrows():
            pid = str(product['product_id'])
            demand_data = product_demand.get(pid, {
                'total_sold': 0,
                'daily_avg': 0,
                'daily_std': 0,
                'days_of_data': 1,
            })

            annual_demand = demand_data['daily_avg'] * 365
            holding_cost = float(product['price']) * holding_cost_rate

            eoq = self.calculate_eoq(annual_demand, ordering_cost, holding_cost) if annual_demand > 0 else 0
            safety_stock = self.calculate_safety_stock(demand_data['daily_std'], lead_time_days)
            reorder_point = self.calculate_reorder_point(demand_data['daily_avg'], lead_time_days, safety_stock)

            current_stock = int(product.get('inventory_count', 0))

            status = 'ok'
            if current_stock <= reorder_point:
                status = 'reorder_now'
            elif current_stock <= reorder_point * 1.5:
                status = 'low_stock'
            elif annual_demand > 0 and current_stock > annual_demand * 0.5:
                status = 'overstock'

            recommendations.append({
                'product_id': pid,
                'product_name': str(product.get('product_name', '')),
                'current_stock': current_stock,
                'eoq': round(eoq, 0),
                'safety_stock': round(safety_stock, 0),
                'reorder_point': round(reorder_point, 0),
                'status': status,
                'daily_demand_avg': round(demand_data['daily_avg'], 2),
                'days_of_supply': round(current_stock / demand_data['daily_avg'], 1) if demand_data['daily_avg'] > 0 else float('inf'),
            })

        # Sort: reorder_now first, then low_stock, overstock, ok
        status_order = {'reorder_now': 0, 'low_stock': 1, 'overstock': 2, 'ok': 3}
        recommendations.sort(key=lambda x: status_order.get(x['status'], 99))

        return recommendations

    def _calculate_product_demand(self, transactions_df):
        """
        Calculate per-product demand statistics from transaction data.

        Parses JSONB items arrays from transactions and computes daily averages,
        standard deviations, and totals for each product.

        Args:
            transactions_df: DataFrame with [items, transaction_date]

        Returns:
            Dict mapping product_id -> {total_sold, daily_avg, daily_std, days_of_data}
        """
        if transactions_df.empty:
            return {}

        product_daily = {}

        for _, txn in transactions_df.iterrows():
            items = txn.get('items', [])
            if isinstance(items, str):
                try:
                    items = json.loads(items)
                except (json.JSONDecodeError, TypeError):
                    items = []

            date = pd.to_datetime(txn['transaction_date']).date()

            for item in items:
                pid = str(item.get('product_id', ''))
                qty = item.get('quantity', 1)
                if pid:
                    if pid not in product_daily:
                        product_daily[pid] = {}
                    product_daily[pid][date] = product_daily[pid].get(date, 0) + qty

        result = {}
        for pid, daily_data in product_daily.items():
            quantities = list(daily_data.values())
            total_sold = sum(quantities)
            days_of_data = max(1, len(daily_data))

            # Use total days spanned, not just days with sales
            if daily_data:
                date_range = (max(daily_data.keys()) - min(daily_data.keys())).days + 1
                days_of_data = max(days_of_data, date_range)

            daily_avg = total_sold / days_of_data
            daily_std = float(np.std(quantities)) if len(quantities) > 1 else daily_avg * 0.3

            result[pid] = {
                'total_sold': total_sold,
                'daily_avg': daily_avg,
                'daily_std': daily_std,
                'days_of_data': days_of_data,
            }

        return result
