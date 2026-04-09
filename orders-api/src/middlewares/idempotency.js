const pool = require('../db/connection');

const idempotency = (targetType) => async (req, res, next) => {
  const key = req.headers['x-idempotency-key'];
  if (!key) return res.status(400).json({ error: 'X-Idempotency-Key requerido' });

  const [rows] = await pool.execute(
    'SELECT * FROM idempotency_keys WHERE `key` = ?',
    [key]
  );

  if (rows.length) {
    return res.status(200).json(rows[0].response_body);
  }

  res.sendResponse = res.json.bind(res);
  res.json = async (body) => {
    await pool.execute(
      `INSERT INTO idempotency_keys (\`key\`, target_type, status, response_body, expires_at)
       VALUES (?, ?, 'completed', ?, DATE_ADD(NOW(), INTERVAL 24 HOUR))`,
      [key, targetType, JSON.stringify(body)]
    );
    res.sendResponse(body);
  };

  next();
};

module.exports = idempotency;