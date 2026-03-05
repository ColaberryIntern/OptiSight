// ***********************************************
// Custom Cypress Commands for OptiSight
// ***********************************************

/**
 * Simulate a logged-in user by setting the JWT token in localStorage
 * and intercepting the session-restore profile call so the app
 * recognises the user as authenticated.
 *
 * Usage:  cy.login()                       — default admin user
 *         cy.login('mgr@test.com', 'pass') — custom email
 */
Cypress.Commands.add('login', (email = 'admin@optisight.io', password = 'Test1234!') => {
  // Build a deterministic fake JWT whose payload the app can decode
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = btoa(
    JSON.stringify({
      userId: 'user-e2e-001',
      sub: 'user-e2e-001',
      email,
      role: 'admin',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 86400,
    })
  );
  const fakeToken = `${header}.${payload}.fake-signature`;

  // Persist the token exactly where the app stores it
  window.localStorage.setItem('ri_auth_token', fakeToken);

  // Intercept the profile-restore call so the app gets user data
  cy.intercept('GET', '/api/v1/users/*', {
    statusCode: 200,
    body: {
      user_id: 'user-e2e-001',
      email,
      role: 'admin',
      created_at: '2024-01-15T00:00:00Z',
    },
  }).as('getProfile');
});

/**
 * Clear auth state to simulate a logged-out user.
 */
Cypress.Commands.add('logout', () => {
  window.localStorage.removeItem('ri_auth_token');
});

/**
 * Stub common dashboard API endpoints so dashboard renders
 * without a running backend.
 */
Cypress.Commands.add('stubDashboardAPIs', () => {
  cy.intercept('GET', '/api/v1/dashboard/performance*', {
    statusCode: 200,
    body: {
      totalRevenue: 125000,
      totalOrders: 3420,
      avgOrderValue: 36.55,
      conversionRate: 4.2,
      revenueByDay: [
        { date: '2024-12-01', revenue: 4200 },
        { date: '2024-12-02', revenue: 3800 },
        { date: '2024-12-03', revenue: 5100 },
      ],
      topProducts: [
        { name: 'Organic Milk', sales: 450, revenue: 2250 },
        { name: 'Whole Wheat Bread', sales: 380, revenue: 1140 },
        { name: 'Free Range Eggs', sales: 320, revenue: 1920 },
      ],
    },
  }).as('getPerformance');

  cy.intercept('GET', '/api/v1/analytics/revenue-anomalies*', {
    statusCode: 200,
    body: {
      anomalies: [
        {
          date: '2024-12-02',
          metric: 'revenue',
          expected: 4000,
          actual: 2100,
          severity: 'high',
          message: 'Revenue dropped 47% below expected',
        },
      ],
    },
  }).as('getAnomalies');

  cy.intercept('GET', '/api/v1/data/stores', {
    statusCode: 200,
    body: {
      stores: [
        { store_id: 'store-001', name: 'Downtown Store' },
        { store_id: 'store-002', name: 'Mall Location' },
      ],
    },
  }).as('getStores');

  cy.intercept('GET', '/api/v1/analytics/customer-segmentation*', {
    statusCode: 200,
    body: {
      segments: [
        { name: 'High Value', count: 120, percentage: 15 },
        { name: 'Regular', count: 450, percentage: 55 },
        { name: 'At Risk', count: 250, percentage: 30 },
      ],
    },
  }).as('getSegmentation');

  cy.intercept('GET', '/api/v1/analytics/complaint-clusters*', {
    statusCode: 200,
    body: {
      clusters: [
        { category: 'Delivery', count: 45 },
        { category: 'Quality', count: 32 },
      ],
    },
  }).as('getComplaintClusters');

  cy.intercept('GET', '/api/v1/analytics/inventory-optimization*', {
    statusCode: 200,
    body: {
      items: [
        { name: 'Organic Milk', stock: 150, reorderPoint: 50, status: 'healthy' },
        { name: 'Eggs', stock: 20, reorderPoint: 40, status: 'low' },
      ],
    },
  }).as('getInventoryHealth');

  cy.intercept('GET', '/api/v1/analytics/sales-forecast*', {
    statusCode: 200,
    body: {
      forecast: [
        { date: '2024-12-10', predicted: 4500, lower: 3800, upper: 5200 },
        { date: '2024-12-11', predicted: 4700, lower: 4000, upper: 5400 },
      ],
    },
  }).as('getSalesForecast');
});

/**
 * Stub notification API endpoints.
 */
Cypress.Commands.add('stubNotificationAPIs', (notifications = null) => {
  const defaultNotifications = [
    {
      id: 'notif-001',
      notification_id: 'notif-001',
      title: 'Revenue Alert',
      message: 'Daily revenue exceeded target by 20%',
      read: false,
      created_at: '2024-12-10T14:30:00Z',
    },
    {
      id: 'notif-002',
      notification_id: 'notif-002',
      title: 'Inventory Warning',
      message: 'Organic Milk stock is below reorder point',
      read: true,
      created_at: '2024-12-09T10:15:00Z',
    },
    {
      id: 'notif-003',
      notification_id: 'notif-003',
      title: 'System Update',
      message: 'Analytics engine updated to v2.1',
      read: false,
      created_at: '2024-12-08T08:00:00Z',
    },
  ];

  cy.intercept('GET', '/api/v1/notifications/*', (req) => {
    // Avoid intercepting the mark-as-read PATCH requests
    if (req.method === 'GET') {
      req.reply({
        statusCode: 200,
        body: {
          notifications: notifications || defaultNotifications,
        },
      });
    }
  }).as('getNotifications');

  cy.intercept('GET', '/api/v1/notifications/*/unread-count', {
    statusCode: 200,
    body: { unreadCount: 2 },
  }).as('getUnreadCount');

  cy.intercept('PATCH', '/api/v1/notifications/*/read', {
    statusCode: 200,
    body: { success: true },
  }).as('markNotificationRead');
});
