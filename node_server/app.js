// pip install -r python_server/requirements.txt
// npm install --prefix node_server
// npm run build:web
// npm start

// docker build -t spam-detector .
// docker run -p 5000:5000 -e PORT=5000 spam-detector


const express = require("express");
const cors = require("cors");
require("dotenv").config();
const app = express();
const path = require("path");

const PORT = process.env.PORT || 5000;
const HOST = "0.0.0.0";
const PYTHON_PORT = process.env.PYTHON_PORT || "8000";
const PYTHON_BASE_URL = (
    process.env.ENDPOINT_URL_PYTHON || `http://127.0.0.1:${PYTHON_PORT}`
).replace(/\/+$/, "");

const allowedOrigins = [
    "http://localhost:5173",
    "http://localhost:5000",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:5000",
    process.env.FRONTEND_URL
].filter(Boolean);

const corsOptions = {
    origin: function (origin, callback) {
        if (!origin) return callback(null, true);

        if (allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(new Error("Not allowed by CORS"));
        }
    }
};

app.use(cors(corsOptions));
app.use(express.json());

console.log("Looking for static files at:", path.join(__dirname, "./SPA/react_app/dist"));
console.log("Spam model API:", PYTHON_BASE_URL);
app.use(express.static(path.join(__dirname, "./SPA/react_app/dist")));

function timeoutSignal(ms) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), ms);
    return { signal: controller.signal, cancel: () => clearTimeout(timer) };
}

async function callPython(pathname, options = {}) {
    const timeout = timeoutSignal(20000);
    try {
        const response = await fetch(`${PYTHON_BASE_URL}${pathname}`, {
            ...options,
            signal: timeout.signal
        });
        const text = await response.text();
        let body = null;
        if (text) {
            try {
                body = JSON.parse(text);
            } catch {
                body = { message: text };
            }
        }
        return { ok: response.ok, status: response.status, body };
    } catch (error) {
        if (error.name === "AbortError") {
            const timeoutError = new Error("The spam model did not respond in time");
            timeoutError.status = 503;
            throw timeoutError;
        }
        const unavailable = new Error("The spam model is unavailable");
        unavailable.status = 503;
        unavailable.cause = error;
        throw unavailable;
    } finally {
        timeout.cancel();
    }
}

app.get("/spam-detector-health", async (req, res) => {
    try {
        console.log("Initiating /spam-detector-health api call");
        const response = await callPython("/");

        if (!response.ok) {
            return res.status(response.status).json({
                error: "Failed to retrieve data from the spam model"
            });
        }

        res.json({
            message: "Data fetched successfully",
            data: response.body
        });
    } catch (e) {
        console.error(e, "Error in health check");
        res.status(e.status || 500).json({ error: "Internal Server Error", message: e.message });
    } finally {
        console.log("Finished /spam-detector-health api call");
    }
});

app.post("/check-spam", async (req, res) => {
    try {
        console.log("Initiating /check-spam api call");
        const { emails } = req.body;
        if (!Array.isArray(emails) || emails.length === 0) {
            return res.status(400).json({ error: "Provide one or more emails to check" });
        }

        const response = await callPython("/predict", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ emails })
        });

        if (!response.ok) {
            return res.status(response.status).json({
                error: "Failed to check messages",
                message: response.body?.detail || response.body?.message || "Spam model request failed"
            });
        }

        res.json({
            message: "Data fetched successfully",
            data: response.body
        });
    } catch (e) {
        console.error(e, "/check-spam failed");
        res.status(e.status || 500).json({ error: "Internal Server Error", message: e.message });
    } finally {
        console.log("Finished /check-spam api call");
    }
});

app.get(/(.*)/, (req, res) => {
    if (req.path.startsWith("/assets/") || path.extname(req.path)) {
        return res.status(404).end();
    }

    res.sendFile(path.join(__dirname, "./SPA/react_app/dist", "index.html"));
});

app.listen(PORT, HOST, () => {
    console.log(`Listening on ${HOST}:${PORT}`);
});
