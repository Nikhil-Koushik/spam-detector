const express = require("express");
const cors = require("cors");
require('dotenv').config();
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// 1. Serve static assets explicitly
const distPath = path.resolve(__dirname, 'SPA', 'react_app', 'dist');
app.use(express.static(distPath));

// 2. API Routes
app.get('/spam-detector-health', async (req, res) => {
    try {
        const response = await fetch(process.env.ENDPOINT_URL_PYTHON + '/', { method: "GET" });
        if (!response.ok) {
            return res.status(response.status).json({ error: 'Failed to retrieve data from external provider, python server' });
        }
        const data = await response.json();
        res.json({ message: "Data fetched successfully", data });
    } catch (e) {
        res.status(500).json({ error: "Internal Server Error", message: e.message });
    }
});

app.post('/check-spam', async (req, res) => {
    try {
        const { emails } = req.body;
        const response = await fetch(process.env.ENDPOINT_URL_PYTHON + "/predict", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ emails })
        });
        const data = await response.json();
        res.json({ message: "Data fetched successfully", data });
    } catch (e) {
        res.status(500).json({ error: "/check-spam failed", message: e.message });
    }
});

// 3. Fallback for SPA Routing
// Express 5.x compatible catch-all route for frontend SPA navigation
app.get('*', (req, res, next) => {
    // If the request path includes a file extension (e.g., .js, .css, .png), pass to 404 instead of serving HTML
    if (req.path.includes('.')) {
        return res.status(404).send('File not found');
    }
    res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(PORT, () => {
    console.log("Listening on port: ", PORT);
});