const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Mock the User model before requiring authService
jest.mock('../../src/models/User');
// Mock the shared logger to suppress log output during tests
jest.mock('@retail-insight/shared', () => ({
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn() },
}));

const User = require('../../src/models/User');
const authService = require('../../src/services/authService');

// Set JWT_SECRET for token signing during tests
process.env.JWT_SECRET = 'unit-test-secret';

describe('authService', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  // -------------------------------------------------------------------
  // register
  // -------------------------------------------------------------------
  describe('register', () => {
    it('creates a user with a hashed password and returns userId, email, role', async () => {
      User.findByEmail.mockResolvedValue(null);

      const fakeUser = {
        user_id: 'abc-123',
        email: 'new@example.com',
        role: 'executive',
      };
      User.create.mockResolvedValue(fakeUser);

      const result = await authService.register({
        email: 'new@example.com',
        password: 'Str0ng!Pass',
        role: 'executive',
      });

      // Verify password was hashed (not stored as plaintext)
      const createCall = User.create.mock.calls[0][0];
      expect(createCall.passwordHash).toBeDefined();
      expect(createCall.passwordHash).not.toBe('Str0ng!Pass');
      const isHashed = await bcrypt.compare('Str0ng!Pass', createCall.passwordHash);
      expect(isHashed).toBe(true);

      // Verify return shape
      expect(result).toEqual({
        userId: 'abc-123',
        email: 'new@example.com',
        role: 'executive',
      });
    });

    it('throws 409 when email is already registered', async () => {
      User.findByEmail.mockResolvedValue({ user_id: 'existing', email: 'dup@example.com' });

      await expect(
        authService.register({
          email: 'dup@example.com',
          password: 'Str0ng!Pass',
        })
      ).rejects.toMatchObject({
        message: 'Email already registered',
        statusCode: 409,
      });

      expect(User.create).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------
  // login
  // -------------------------------------------------------------------
  describe('login', () => {
    const storedHash = bcrypt.hashSync('Correct!1', 10);
    const fakeUser = {
      user_id: 'user-456',
      email: 'login@example.com',
      role: 'manager',
      password_hash: storedHash,
    };

    it('returns a valid JWT token for correct credentials', async () => {
      User.findByEmail.mockResolvedValue(fakeUser);

      const result = await authService.login({
        email: 'login@example.com',
        password: 'Correct!1',
      });

      expect(result.token).toBeDefined();
      expect(typeof result.token).toBe('string');

      // Decode and verify payload
      const decoded = jwt.verify(result.token, process.env.JWT_SECRET);
      expect(decoded.userId).toBe('user-456');
      expect(decoded.email).toBe('login@example.com');
      expect(decoded.role).toBe('manager');

      // Verify user object in response
      expect(result.user).toEqual({
        userId: 'user-456',
        email: 'login@example.com',
        role: 'manager',
        email_verified: false,
      });
    });

    it('throws 401 for wrong password', async () => {
      User.findByEmail.mockResolvedValue(fakeUser);

      await expect(
        authService.login({
          email: 'login@example.com',
          password: 'WrongPassword!1',
        })
      ).rejects.toMatchObject({
        message: 'Invalid email or password',
        statusCode: 401,
      });
    });

    it('throws 401 when user does not exist', async () => {
      User.findByEmail.mockResolvedValue(null);

      await expect(
        authService.login({
          email: 'noone@example.com',
          password: 'Whatever!1',
        })
      ).rejects.toMatchObject({
        message: 'Invalid email or password',
        statusCode: 401,
      });
    });
  });

  // -------------------------------------------------------------------
  // getUserProfile
  // -------------------------------------------------------------------
  describe('getUserProfile', () => {
    it('returns user without password_hash', async () => {
      const profile = {
        user_id: 'user-789',
        email: 'profile@example.com',
        role: 'admin',
        profile_data: {},
        email_verified: false,
        created_at: '2025-01-01T00:00:00.000Z',
        updated_at: '2025-01-01T00:00:00.000Z',
      };
      User.findById.mockResolvedValue(profile);

      const result = await authService.getUserProfile('user-789');

      expect(result).toEqual(profile);
      expect(result.password_hash).toBeUndefined();
      expect(User.findById).toHaveBeenCalledWith('user-789');
    });

    it('throws 404 when user does not exist', async () => {
      User.findById.mockResolvedValue(null);

      await expect(
        authService.getUserProfile('nonexistent-id')
      ).rejects.toMatchObject({
        message: 'User not found',
        statusCode: 404,
      });
    });
  });
});
