/**
 * Boots the spam model and the web app as one process group.
 * Express starts only after the local Python API is accepting requests,
 * so a hosting platform never routes traffic to a model that is still loading.
 */
const { spawn, spawnSync } = require("child_process");
const http = require("http");
const path = require("path");

const root = path.resolve(__dirname, "..");
const pythonPort = String(process.env.PYTHON_PORT || "8000");
const readyTimeoutMs = Number(process.env.PYTHON_READY_TIMEOUT_MS || 120000);

process.env.PYTHON_PORT = pythonPort;
process.env.ENDPOINT_URL_PYTHON = `http://127.0.0.1:${pythonPort}`;
process.env.PYTHONUNBUFFERED = process.env.PYTHONUNBUFFERED || "1";

let shuttingDown = false;
let pythonProcess = null;
let webProcess = null;

function resolvePython() {
  const candidates = process.platform === "win32" ? ["python", "py", "python3"] : ["python3", "python"];
  for (const command of candidates) {
    const result = spawnSync(command, ["--version"], {
      encoding: "utf8",
      timeout: 5000,
      windowsHide: true,
    });
    const output = `${result.stdout || ""}${result.stderr || ""}${result.error || ""}`;
    if (result.status === 0 && !/was not found/i.test(output)) return command;
  }
  console.error("Python was not found on PATH. Install Python 3.11+ and try again.");
  process.exit(1);
}

function shutdown(code) {
  if (shuttingDown) return;
  shuttingDown = true;
  if (pythonProcess && pythonProcess.exitCode === null) pythonProcess.kill();
  if (webProcess && webProcess.exitCode === null) webProcess.kill();
  setTimeout(() => process.exit(code), 300);
}

function waitForPython() {
  const started = Date.now();
  const url = `http://127.0.0.1:${pythonPort}/`;

  return new Promise((resolve, reject) => {
    const attempt = () => {
      if (pythonProcess.exitCode !== null) {
        reject(new Error(`Python API exited before it was ready (code ${pythonProcess.exitCode})`));
        return;
      }

      const request = http.get(url, (response) => {
        response.resume();
        if (response.statusCode === 200) {
          resolve();
          return;
        }
        retry();
      });

      request.setTimeout(2000, () => request.destroy());
      request.on("error", retry);
    };

    const retry = () => {
      if (Date.now() - started > readyTimeoutMs) {
        reject(new Error(`Python API was not ready within ${readyTimeoutMs}ms`));
        return;
      }
      setTimeout(attempt, 1000);
    };

    attempt();
  });
}

function startWeb() {
  webProcess = spawn(process.execPath, ["app.js"], {
    cwd: path.join(root, "node_server"),
    stdio: "inherit",
    env: process.env,
  });

  webProcess.on("error", (error) => {
    console.error(`Failed to start the web server: ${error.message}`);
    if (!shuttingDown) shutdown(1);
  });

  webProcess.on("exit", (code, signal) => {
    if (shuttingDown) return;
    console.error(`Web server exited (${signal || code})`);
    shutdown(code == null ? 1 : code);
  });
}

async function main() {
  const pythonCommand = resolvePython();
  console.log(`Starting spam model API on 127.0.0.1:${pythonPort}`);

  pythonProcess = spawn(
    pythonCommand,
    ["-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", pythonPort],
    {
      cwd: path.join(root, "python_server"),
      stdio: "inherit",
      env: process.env,
    }
  );

  pythonProcess.on("error", (error) => {
    console.error(`Failed to start Python: ${error.message}`);
    if (!shuttingDown) shutdown(1);
  });

  pythonProcess.on("exit", (code, signal) => {
    if (shuttingDown) return;
    console.error(`Python API exited (${signal || code})`);
    shutdown(code == null ? 1 : code);
  });

  process.on("SIGINT", () => shutdown(0));
  process.on("SIGTERM", () => shutdown(0));

  console.log("Waiting for the spam model to finish loading");
  await waitForPython();
  console.log("Spam model is ready. Starting the web server.");
  startWeb();
}

main().catch((error) => {
  console.error(error.message);
  shutdown(1);
});
