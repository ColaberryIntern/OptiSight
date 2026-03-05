const anonymizeMiddleware = require('../middleware/anonymizeMiddleware');

describe('anonymizeMiddleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      user: { userId: 'abc-123', email: 'test@example.com', role: 'admin' },
      body: { userId: 'xyz-789', email: 'other@test.com', data: 'keep' },
      query: { userId: 'q-1' },
    };
    res = {};
    next = jest.fn();
  });

  it('attaches anonymized user data to req.anonymized', () => {
    anonymizeMiddleware()(req, res, next);
    expect(req.anonymized.user.role).toBe('admin');
    expect(req.anonymized.user.userId).not.toBe('abc-123');
    expect(req.anonymized.user.email).toMatch(/@example\.com$/);
  });

  it('anonymizes body data', () => {
    anonymizeMiddleware()(req, res, next);
    expect(req.anonymized.body.userId).not.toBe('xyz-789');
    expect(req.anonymized.body.data).toBe('keep');
  });

  it('anonymizes query params', () => {
    anonymizeMiddleware()(req, res, next);
    expect(req.anonymized.query.userId).not.toBe('q-1');
  });

  it('calls next()', () => {
    anonymizeMiddleware()(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('handles missing user', () => {
    req.user = null;
    anonymizeMiddleware()(req, res, next);
    expect(req.anonymized.user).toBeUndefined();
    expect(next).toHaveBeenCalled();
  });

  it('accepts custom field list', () => {
    anonymizeMiddleware(['email'])(req, res, next);
    expect(req.anonymized.user.userId).toBe('abc-123'); // Not anonymized
    expect(req.anonymized.user.email).not.toBe('test@example.com'); // Anonymized
  });
});
