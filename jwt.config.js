const jwt = require('jsonwebtoken');
const key = process.env.ENCRYPTION_KEY;

function decrypt(data) {
    try {
      const payload = jwt.verify(data, key);
      return payload;
    } catch (error) {
      return null;
    }
}

function encrypt(data) {
    try {
      const payload = jwt.sign(data, key);
      return payload;
    } catch (error) {
      return null;
    }
}

module.exports = { decrypt , encrypt };