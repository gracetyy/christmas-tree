// Simple Vercel serverless function to proxy requests to CounterAPI v2
// - POST -> increments the counter (calls /up)
// - GET  -> fetches current value

export default async function handler(req, res) {
  const apiKey = process.env.COUNTER_API_KEY;

  if (!apiKey) {
    res.status(500).json({ error: 'COUNTER_API_KEY not configured on the server' });
    return;
  }

  const baseUrl = 'https://api.counterapi.dev/v2/gracetyy/christmas-tree';
  let target = baseUrl;

  if (req.method === 'POST') {
    target = `${baseUrl}/up`;
  } else if (req.method === 'GET') {
    target = baseUrl;
  } else {
    res.setHeader('Allow', 'GET, POST');
    res.status(405).end('Method Not Allowed');
    return;
  }

  try {
    console.log('Proxy forwarding to:', target);
    const response = await fetch(target, {
      method: 'GET', // Counter API uses GET for both endpoints
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: 'application/json'
      }
    });

    const text = await response.text();
    console.log('Raw CounterAPI response:', text);

    // Try to parse JSON, but if it's not JSON, return raw text for debugging
    let data;
    try {
      data = JSON.parse(text);
    } catch (parseErr) {
      console.warn('Failed to parse CounterAPI response as JSON:', parseErr);
      data = { raw: text };
    }

    console.log('Parsed CounterAPI response:', data);
    res.status(response.status).json(data);
  } catch (err) {
    console.error('Proxy Error:', err);
    res.status(502).json({ error: 'Failed to reach Counter API' });
  }
}
