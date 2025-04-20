require('dotenv').config();
const express = require('express');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;
const HOST = process.env.HOST || `http://localhost:${port}`;

const shortCodeToUrl = new Map();
const urlToShortCode = new Map();
const urlAccessLogs = new Map;

// Middlewares
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// Utility: Generate short code
function generateShortCode(length = 8) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    return Array.from({ length }, () => chars.charAt(Math.floor(Math.random() * chars.length))).join('');
}

// API: Shorten URL
app.post('/api/shorten', (req, res) => {
    const { longUrl } = req.body;

    if (!longUrl) {
        return res.status(400).json({ message: 'URL is required' });
    }

    if (!/^https?:\/\//.test(longUrl)) {
        return res.status(400).json({ message: 'Invalid URL' });
    }
    // Check if URL already exists
    if (urlToShortCode.has(longUrl)) {
        const existingCode = urlToShortCode.get(longUrl);
        if (existingCode) {
            return res.status(200).json({ shortUrl: `${HOST}/shorten/${existingCode}` });
        }
    }
    // Generate a unique short code
    const shortCode = generateShortCode();
    shortCodeToUrl.set(shortCode, longUrl);
    urlToShortCode.set(longUrl, shortCode);

    res.status(200).json({ shortUrl: `${HOST}/shorten/${shortCode}` });
});

// Redirect: Handle short URL access
app.get('/shorten/:code', (req, res) => {
    const key = req.params.code;
    const longUrl = shortCodeToUrl.get(key);
    if (!longUrl) {
        return res.status(404).send('URL not found');
    }
    const userAgent = req.headers['user-agent'];
    const referrer = req.headers['referer'] || 'Direct';
    const ip = req.ip;
    const timestamp = new Date().toISOString();
    const log = { timestamp, userAgent, referrer, ip };
    if (!urlAccessLogs.has(key)) {
        urlAccessLogs.set(key, []);
    }
    urlAccessLogs.get(key).push(log);
    console.log(`Short URL accessed: ${key}`);
    console.log(`Redirecting to ${longUrl}`);
    // Redirect to the long URL
    return res.redirect(302, longUrl)
});


// Catch-all 404
app.all('*', (req, res) => {
    res.status(404).send('Resource not found');
});

// Start server
app.listen(port, () => {
    console.log(`🚀 Server running at ${HOST}`);
});
