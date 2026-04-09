const jwt = require('jsonwebtoken');

const makeJwt = (payload = { sub: 'test-user' }) =>
  jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });

const authHeader = () => ({
  Authorization: `Bearer ${makeJwt()}`,
});

module.exports = { authHeader };