// Set environment variables before any imports
process.env.JWT_SECRET = 'test-secret';
process.env.NODE_ENV = 'test';

const request = require('supertest');
const jwt = require('jsonwebtoken');

// Mock the complaint service
jest.mock('../../src/services/complaintService', () => ({
  submitComplaint: jest.fn(),
  getComplaints: jest.fn(),
}));

const app = require('../../src/app');
const complaintService = require('../../src/services/complaintService');

const adminToken = jwt.sign(
  { userId: 'a0000000-0000-0000-0000-000000000001', email: 'admin@test.com', role: 'admin' },
  'test-secret',
  { expiresIn: '1h' }
);

const executiveToken = jwt.sign(
  { userId: 'a0000000-0000-0000-0000-000000000002', email: 'exec@test.com', role: 'executive' },
  'test-secret',
  { expiresIn: '1h' }
);

afterEach(() => {
  jest.clearAllMocks();
});

describe('Complaints - Integration Tests', () => {
  describe('POST /api/v1/data/complaints', () => {
    it('should return 201 when valid complaint is submitted', async () => {
      complaintService.submitComplaint.mockResolvedValue({
        complaintId: 'c0000000-0000-0000-0000-000000000001',
        message: 'Complaint submitted successfully',
      });

      const res = await request(app)
        .post('/api/v1/data/complaints')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          description: 'The product arrived damaged with broken packaging',
          category: 'Shipping',
          region: 'North',
          storeId: '00000000-0000-0000-0000-000000000001',
        });

      expect(res.status).toBe(201);
      expect(res.body.complaintId).toBeDefined();
      expect(res.body.message).toBe('Complaint submitted successfully');
    });

    it('should return 400 when description is missing', async () => {
      const res = await request(app)
        .post('/api/v1/data/complaints')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          category: 'Shipping',
          region: 'North',
        });

      expect(res.status).toBe(400);
    });

    it('should return 400 when category is missing', async () => {
      const res = await request(app)
        .post('/api/v1/data/complaints')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          description: 'Some complaint about the service',
          region: 'North',
        });

      expect(res.status).toBe(400);
    });

    it('should return 400 when region is missing', async () => {
      const res = await request(app)
        .post('/api/v1/data/complaints')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          description: 'Some complaint about the service',
          category: 'Service',
        });

      expect(res.status).toBe(400);
    });

    it('should return 401 when no auth token is provided', async () => {
      const res = await request(app)
        .post('/api/v1/data/complaints')
        .send({
          description: 'Some complaint',
          category: 'Shipping',
          region: 'North',
        });

      expect(res.status).toBe(401);
    });

    it('should return 201 with any authenticated role (executive)', async () => {
      complaintService.submitComplaint.mockResolvedValue({
        complaintId: 'c0000000-0000-0000-0000-000000000002',
        message: 'Complaint submitted successfully',
      });

      const res = await request(app)
        .post('/api/v1/data/complaints')
        .set('Authorization', `Bearer ${executiveToken}`)
        .send({
          description: 'Executive submitting a complaint about quality',
          category: 'Quality',
          region: 'South',
        });

      expect(res.status).toBe(201);
      expect(res.body.complaintId).toBeDefined();
    });
  });

  describe('GET /api/v1/data/complaints', () => {
    it('should return 200 with complaint data (no filters)', async () => {
      complaintService.getComplaints.mockResolvedValue({
        complaints: [{ complaint_id: 'c1', description: 'test', category: 'Shipping', region: 'North' }],
        total: 1,
        page: 1,
        limit: 20,
      });

      const res = await request(app)
        .get('/api/v1/data/complaints')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.complaints).toBeDefined();
      expect(Array.isArray(res.body.complaints)).toBe(true);
      expect(res.body.total).toBeDefined();
      expect(res.body.page).toBeDefined();
      expect(res.body.limit).toBeDefined();
    });

    it('should return 200 with region filter', async () => {
      complaintService.getComplaints.mockResolvedValue({
        complaints: [{ complaint_id: 'c1', description: 'test', category: 'Shipping', region: 'North' }],
        total: 1,
        page: 1,
        limit: 20,
      });

      const res = await request(app)
        .get('/api/v1/data/complaints?region=North')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.complaints).toBeDefined();
      expect(complaintService.getComplaints).toHaveBeenCalledWith(
        expect.objectContaining({ region: 'North' })
      );
    });

    it('should return 200 with category filter', async () => {
      complaintService.getComplaints.mockResolvedValue({
        complaints: [{ complaint_id: 'c1', description: 'test', category: 'Shipping', region: 'North' }],
        total: 1,
        page: 1,
        limit: 20,
      });

      const res = await request(app)
        .get('/api/v1/data/complaints?category=Shipping')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(complaintService.getComplaints).toHaveBeenCalledWith(
        expect.objectContaining({ category: 'Shipping' })
      );
    });

    it('should return 200 with pagination parameters', async () => {
      complaintService.getComplaints.mockResolvedValue({
        complaints: [{ complaint_id: 'c1' }],
        total: 5,
        page: 1,
        limit: 2,
      });

      const res = await request(app)
        .get('/api/v1/data/complaints?page=1&limit=2')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.complaints).toBeDefined();
      expect(res.body.page).toBe(1);
      expect(res.body.limit).toBe(2);
    });

    it('should return 401 without auth token', async () => {
      const res = await request(app)
        .get('/api/v1/data/complaints');

      expect(res.status).toBe(401);
    });
  });
});
