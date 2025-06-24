// server.js
const express = require('express');
const fetch = require('node-fetch');
const { v4: uuidv4 } = require('uuid');
const app = express();

app.use(express.json());

let ezpinAccessToken = null;
let tokenExpiry = 0;

const EZPIN_CLIENT_ID = '1515522';
const EZPIN_SECRET_KEY = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzayI6ImEyMTJiODY5LWQxYjMtNDI2YS04ZDBmLTZmZmVjNzJmYjkwZCJ9.NjM1P9cYmPu-_hovD5Xew6iPm813eKNMGamgp1efsuY';

async function getToken() {
  const now = Math.floor(Date.now() / 1000);
  if (ezpinAccessToken && tokenExpiry > now) return ezpinAccessToken;

  const response = await fetch('https://api.ezpaypin.com/vendors/v2/auth/token/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: EZPIN_CLIENT_ID,
      secret_key: EZPIN_SECRET_KEY,
    }),
  });

  const result = await response.json();
  ezpinAccessToken = result.access;
  tokenExpiry = now + (result.expire || 10800) - 60; // subtract 1 min buffer
  return ezpinAccessToken;
}

app.get('/', (_, res) => {
  res.send('EZPIN Proxy is up.');
});

app.get('/status', (_, res) => {
  res.json({ ready: true });
});

app.post('/order', async (req, res) => {
  try {
    const token = await getToken();
    const refCode = uuidv4();

    const payload = {
      ...req.body,
      reference_code: refCode,
    };

    const response = await fetch('https://api.ezpaypin.com/vendors/v2/orders/', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();
    res.status(200).json(result);
  } catch (err) {
    console.error('Order error:', err);
    res.status(500).json({ error: 'Failed to process order' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`EZPIN Proxy listening on port ${PORT}`));