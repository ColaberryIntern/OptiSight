// Set environment variables before any imports
process.env.DATABASE_URL = 'postgres://retail_insight:changeme@localhost:5433/retail_insight';
process.env.JWT_SECRET = 'test-secret';
process.env.NODE_ENV = 'development';

const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../../src/app');
const db = require('../../src/config/db');

// Generate test tokens with valid UUIDs
const adminUserId = 'a0000000-0000-0000-0000-000000000001';
const managerUserId = 'a0000000-0000-0000-0000-000000000003';
const executiveUserId = 'a0000000-0000-0000-0000-000000000002';

const adminToken = jwt.sign(
  { userId: adminUserId, email: 'admin@test.com', role: 'admin' },
  'test-secret',
  { expiresIn: '1h' }
);

const managerToken = jwt.sign(
  { userId: managerUserId, email: 'manager@test.com', role: 'manager' },
  'test-secret',
  { expiresIn: '1h' }
);

const executiveToken = jwt.sign(
  { userId: executiveUserId, email: 'exec@test.com', role: 'executive' },
  'test-secret',
  { expiresIn: '1h' }
);

beforeAll(async () => {
  // Run migrations to ensure the notifications table exists
  await db.migrate.latest();
});

beforeEach(async () => {
  // Clean up notifications table between tests
  await db('notifications').del();
});

afterAll(async () => {
  // Rollback migrations and close connection
  await db.migrate.rollback();
  await db.destroy();
});

describe('Notification Service - Integration Tests', () => {
  // ──────────────────────────────────────────────────────────────
  // POST /api/v1/notifications
  // ──────────────────────────────────────────────────────────────

  describe('POST /api/v1/notifications', () => {
    it('should return 201 with valid data and admin auth', async () => {
      const res = await request(app)
        .post('/api/v1/notifications')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          userId: executiveUserId,
          type: 'anomaly_alert',
          title: 'Sales Anomaly Detected',
          message: 'Unusual sales spike detected in Store #42.',
          metadata: { storeId: 'store-42', severity: 'high' },
        });

      expect(res.status).toBe(201);
      expect(res.body.notification_id).toBeDefined();
      expect(res.body.user_id).toBe(executiveUserId);
      expect(res.body.type).toBe('anomaly_alert');
      expect(res.body.title).toBe('Sales Anomaly Detected');
      expect(res.body.message).toBe('Unusual sales spike detected in Store #42.');
      expect(res.body.is_read).toBe(false);
      expect(res.body.created_at).toBeDefined();
    });

    it('should return 201 with valid data and manager auth', async () => {
      const res = await request(app)
        .post('/api/v1/notifications')
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          userId: executiveUserId,
          type: 'system',
          title: 'System Update',
          message: 'Scheduled maintenance at midnight.',
        });

      expect(res.status).toBe(201);
      expect(res.body.notification_id).toBeDefined();
    });

    it('should return 401 without auth token', async () => {
      const res = await request(app)
        .post('/api/v1/notifications')
        .send({
          userId: executiveUserId,
          type: 'system',
          title: 'Test',
          message: 'Test message',
        });

      expect(res.status).toBe(401);
      expect(res.body.error).toBeDefined();
      expect(res.body.error.code).toBe('401');
    });

    it('should return 403 when user has executive role (not admin/manager)', async () => {
      const res = await request(app)
        .post('/api/v1/notifications')
        .set('Authorization', `Bearer ${executiveToken}`)
        .send({
          userId: executiveUserId,
          type: 'system',
          title: 'Test',
          message: 'Test message',
        });

      expect(res.status).toBe(403);
      expect(res.body.error).toBeDefined();
      expect(res.body.error.code).toBe('403');
    });

    it('should return 400 with missing required fields', async () => {
      const res = await request(app)
        .post('/api/v1/notifications')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          userId: executiveUserId,
          // missing type, title, message
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
      expect(res.body.error.code).toBe('400');
    });

    it('should return 400 when title is missing', async () => {
      const res = await request(app)
        .post('/api/v1/notifications')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          userId: executiveUserId,
          type: 'system',
          message: 'Test message',
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
      expect(res.body.error.code).toBe('400');
    });
  });

  // ──────────────────────────────────────────────────────────────
  // GET /api/v1/notifications/:userId
  // ──────────────────────────────────────────────────────────────

  describe('GET /api/v1/notifications/:userId', () => {
    it('should return notifications list for a user', async () => {
      // Seed some notifications
      await db('notifications').insert([
        {
          user_id: executiveUserId,
          type: 'anomaly_alert',
          title: 'Alert 1',
          message: 'First alert',
        },
        {
          user_id: executiveUserId,
          type: 'system',
          title: 'System Notice',
          message: 'System notification',
        },
      ]);

      const res = await request(app)
        .get(`/api/v1/notifications/${executiveUserId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBe(2);
      expect(res.body.pagination).toBeDefined();
      expect(res.body.pagination.page).toBe(1);
      expect(res.body.pagination.total).toBe(2);
    });

    it('should return paginated results', async () => {
      // Seed 5 notifications
      const notifications = [];
      for (let i = 1; i <= 5; i++) {
        notifications.push({
          user_id: executiveUserId,
          type: 'system',
          title: `Notification ${i}`,
          message: `Message ${i}`,
        });
      }
      await db('notifications').insert(notifications);

      const res = await request(app)
        .get(`/api/v1/notifications/${executiveUserId}?page=1&limit=2`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(2);
      expect(res.body.pagination.page).toBe(1);
      expect(res.body.pagination.limit).toBe(2);
      expect(res.body.pagination.total).toBe(5);

      // Fetch page 2
      const res2 = await request(app)
        .get(`/api/v1/notifications/${executiveUserId}?page=2&limit=2`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res2.status).toBe(200);
      expect(res2.body.data.length).toBe(2);
      expect(res2.body.pagination.page).toBe(2);
    });

    it('should return 401 without auth token', async () => {
      const res = await request(app)
        .get(`/api/v1/notifications/${executiveUserId}`);

      expect(res.status).toBe(401);
      expect(res.body.error).toBeDefined();
      expect(res.body.error.code).toBe('401');
    });

    it('should return empty array for user with no notifications', async () => {
      const res = await request(app)
        .get(`/api/v1/notifications/${adminUserId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toEqual([]);
      expect(res.body.pagination.total).toBe(0);
    });
  });

  // ──────────────────────────────────────────────────────────────
  // PATCH /api/v1/notifications/:notificationId/read
  // ──────────────────────────────────────────────────────────────

  describe('PATCH /api/v1/notifications/:notificationId/read', () => {
    it('should mark a notification as read', async () => {
      // Seed a notification
      const [notification] = await db('notifications')
        .insert({
          user_id: executiveUserId,
          type: 'recommendation',
          title: 'New Recommendation',
          message: 'Consider restocking item X.',
          is_read: false,
        })
        .returning(['notification_id']);

      const res = await request(app)
        .patch(`/api/v1/notifications/${notification.notification_id}/read`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.notification_id).toBe(notification.notification_id);
      expect(res.body.is_read).toBe(true);
    });

    it('should return 404 for non-existent notification', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const res = await request(app)
        .patch(`/api/v1/notifications/${fakeId}/read`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
      expect(res.body.error).toBeDefined();
      expect(res.body.error.message).toMatch(/not found/i);
    });

    it('should return 401 without auth token', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const res = await request(app)
        .patch(`/api/v1/notifications/${fakeId}/read`);

      expect(res.status).toBe(401);
    });
  });

  // ──────────────────────────────────────────────────────────────
  // GET /api/v1/notifications/:userId/unread-count
  // ──────────────────────────────────────────────────────────────

  describe('GET /api/v1/notifications/:userId/unread-count', () => {
    it('should return the count of unread notifications', async () => {
      // Seed notifications: 2 unread + 1 read
      await db('notifications').insert([
        {
          user_id: executiveUserId,
          type: 'anomaly_alert',
          title: 'Alert 1',
          message: 'Unread alert',
          is_read: false,
        },
        {
          user_id: executiveUserId,
          type: 'system',
          title: 'System 1',
          message: 'Unread system',
          is_read: false,
        },
        {
          user_id: executiveUserId,
          type: 'recommendation',
          title: 'Rec 1',
          message: 'Read recommendation',
          is_read: true,
        },
      ]);

      const res = await request(app)
        .get(`/api/v1/notifications/${executiveUserId}/unread-count`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.unreadCount).toBe(2);
    });

    it('should return 0 when no unread notifications exist', async () => {
      const res = await request(app)
        .get(`/api/v1/notifications/${adminUserId}/unread-count`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.unreadCount).toBe(0);
    });

    it('should return 401 without auth token', async () => {
      const res = await request(app)
        .get(`/api/v1/notifications/${executiveUserId}/unread-count`);

      expect(res.status).toBe(401);
      expect(res.body.error).toBeDefined();
      expect(res.body.error.code).toBe('401');
    });
  });
});
