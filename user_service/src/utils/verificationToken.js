const jwt = require('jsonwebtoken');

const VERIFICATION_SECRET = process.env.JWT_SECRET + '_email_verify';
const EXPIRY = '24h';

const verificationToken = {
  generate(userId, email) {
    return jwt.sign({ userId, email, purpose: 'email_verification' }, VERIFICATION_SECRET, { expiresIn: EXPIRY });
  },
  verify(token) {
    return jwt.verify(token, VERIFICATION_SECRET);
  },
};

module.exports = verificationToken;
