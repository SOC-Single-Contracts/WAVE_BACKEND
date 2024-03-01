const jwt = require('jsonwebtoken');
const secret = process.env.ENCRYPTION_KEY;

function verifyToken(token) {
    if (typeof token !== 'string') {
      return null;
    }
    try {
      const payload = jwt.verify(token, secret);
      return payload;
    } catch (error) {
      return null;
    }
}

module.exports = { verifyToken };