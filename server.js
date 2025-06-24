const express = require('express');
const fetch = require('node-fetch');
const { v4: uuidv4 } = require('uuid');
const app = express();
app.use(express.json());

const CLIENT_ID = '1515522';
const SECRET_KEY = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzayI6IjU4YWJmM2YzLWY2NWUtNDcwYi04YTgzLTZmMjZjZTNjMWY3MSJ9.Zxklp2PfwYAdbqXvXAJ7LOZWDGMDZ15m10-BZupx3UE'; // <-- replace this

let tokenCache = { token: null, expires: 0 };

// Get EZPIN access token (with caching)
async function getAccessToken() {
  const now = Date.now() / 1000;
  if (tokenCache.token && now < tokenCache.expires - 60) return tokenCache.token;

  const res = await fetch('https://api.ezpaypin.com/vendors/v2/auth/token/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_id: CLIENT_ID, secret_key: SECRET_KEY }),
  });

  const data = await res.json();
  tokenCache.token = data.access;
  tokenCache.expires = data.expire;
  return data.access;
}

// Proxy to create a gift card order
app.post('/order', async (req, res) => {
  try {
    const token = await getAccessToken();
    const {
      sku, quantity, price, pre_order = false,
      destination = null, delivery_type = 0,
    } = req.body;

    const refCode = uuidv4();

    const response = await fetch('https://api.ezpaypin.com/vendors/v2/orders/', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sku,
        quantity,
        price,
        pre_order,
        delivery_type,
        destination,
        reference_code: refCode,
      }),
    });

    const result = await response.json();
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal error' });
  }
});

// Ping to test health
app.get('/', (_, res) => {
  res.send('EZPIN Proxy is up.');
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Server running on ${port}`));