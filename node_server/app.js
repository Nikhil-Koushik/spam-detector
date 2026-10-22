const express = require("express");
const cors = require("cors");
require('dotenv').config();
const app = express();
const path = require('path');


const PORT = process.env.PORT || 5000;

const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:5000',
    process.env.FRONTEND_URL
].filter(Boolean);

const corsOptions = {
    origin: function (origin, callback) {
        // allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);

        if (allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    }
};

app.use(cors(corsOptions));
app.use(express.json());

app.use(express.static(path.join(__dirname, './SPA/react_app/dist')));

app.get('/spam-detector-health', async (req, res) => {
    try {
        console.log("Initiating /spam-detector-health api call");
        const response = await fetch(process.env.ENDPOINT_URL_PYTHON + '/', {
            method: "GET"
        });

        if (!response.ok) {
            return res.status(response.status).json({
                error: 'Failed to retrieve data from external provider, python server'
            });
        }

        const data = await response.json();
        res.json({
            message: "Data fetched successfully",
            data: data
        })
    } catch (e) {
        console.error(e, 'Error in health check');
        res.status(500).json({ error: "Internal Server Error", message: e.message });
    } finally {
        console.log("Finished /spam-detector-health api call");
    }
})

app.post('/check-spam', async (req, res) => {
    try {
        console.log("Initiating /check-spam api call");
        const { emails } = req.body;
        const response = await fetch(process.env.ENDPOINT_URL_PYTHON + "/predict", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                "emails": emails
            })
        });
        const data = await response.json();
        console.log(data);
        res.json({
            message: "Data fetched successfully",
            data: data
        })
    } catch (e) {
        console.error(e, '/check-spam failed')
        res.status(500).json({ error: "Internal Server Error", message: e.message });
    } finally {
        console.log("Finished /check-spam api call");
    }
})


app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, './SPA/react_app/dist', 'index.html'));
})

app.listen(PORT, () => {
    console.log("Listening on port: ", PORT);
})
