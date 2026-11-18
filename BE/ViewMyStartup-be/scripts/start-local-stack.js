import EmbeddedPostgres from "embedded-postgres";
import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import { createServer } from "node:net";
import { fileURLToPath } from "node:url";
import path from "node:path";

const backendDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const frontendDir = path.resolve(backendDir, "..", "..", "FE", "ViewMyStartup-fe");
const databaseName = "viewmystartup";
const dataDir = path.join(backendDir, ".local-postgres", "data");
const pg = new EmbeddedPostgres({
  databaseDir: dataDir,
  user: "postgres",
  password: "localdev",
  port: 5433,
  persistent: true,
  initdbFlags: ["--locale=C", "--encoding=UTF8"],
  autoRehydrateSymlinks: true,
  onLog: (message) => console.log(`[postgres] ${message}`),
  onError: (error) => console.error(`[postgres] ${error}`),
});

const children = [];
let shuttingDown = false;
let pgStarted = false;

async function isPortInUse(port) {
  return new Promise((resolve) => {
    const server = createServer();
    server.once("error", (error) => resolve(error.code === "EADDRINUSE"));
    server.listen(port, "127.0.0.1", () => {
      server.close(() => resolve(false));
    });
  });
}

async function localApiIsHealthy() {
  try {
    const response = await fetch("http://127.0.0.1:3000/health");
    const body = await response.json();
    return response.ok && body.database === "connected";
  } catch {
    return false;
  }
}

async function localFrontendIsRunning() {
  try {
    const response = await fetch("http://127.0.0.1:5173/");
    return response.ok;
  } catch {
    return false;
  }
}

async function canUseExistingDatabase() {
  const client = pg.getPgClient("postgres", "127.0.0.1");
  try {
    await client.connect();
    await client.query("SELECT 1");
    return true;
  } catch {
    return false;
  } finally {
    await client.end().catch(() => {});
  }
}

function runNode(args, cwd, label) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, args, { cwd, stdio: "inherit" });
    children.push(child);
    child.once("error", reject);
    child.once("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${label} exited with code ${code}`));
    });
  });
}

function startNode(args, cwd, label) {
  const child = spawn(process.execPath, args, { cwd, stdio: "inherit" });
  children.push(child);
  child.once("error", (error) => console.error(`${label} failed to start:`, error));
  child.once("exit", (code) => {
    if (!shuttingDown) console.error(`${label} stopped (exit code ${code}).`);
  });
  return child;
}

async function waitFor(url, label) {
  const deadline = Date.now() + 60_000;
  let lastError;

  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
      lastError = new Error(`${label} returned HTTP ${response.status}`);
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  throw new Error(`${label} did not become ready: ${lastError?.message ?? "timeout"}`);
}

async function waitForApi() {
  const deadline = Date.now() + 60_000;
  let lastError;

  while (Date.now() < deadline) {
    try {
      const response = await fetch("http://127.0.0.1:3000/health");
      const body = await response.json();
      if (response.ok && body.database === "connected") return;
      lastError = new Error(`API health: ${JSON.stringify(body)}`);
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  throw new Error(`Backend API and database did not become ready: ${lastError?.message ?? "timeout"}`);
}

async function stop() {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const child of children) {
    if (child.exitCode === null && !child.killed) child.kill("SIGTERM");
  }
  if (pgStarted) {
    await pg.stop().catch((error) => console.error("PostgreSQL shutdown failed:", error));
    pgStarted = false;
  }
}

if ((await localApiIsHealthy()) && (await localFrontendIsRunning())) {
  console.log("The local app is already running at http://localhost:5173.");
  process.exit(0);
}

for (const [port, service] of [[3000, "API"], [5173, "frontend"]]) {
  if (await isPortInUse(port)) {
    console.error(`Port ${port} is already in use. Stop the existing ${service} terminal with Ctrl+C before starting another copy.`);
    process.exit(1);
  }
}

const databasePortInUse = await isPortInUse(5433);
let useExistingDatabase = false;
if (databasePortInUse) {
  useExistingDatabase = await canUseExistingDatabase();
  if (!useExistingDatabase) {
    console.error("Port 5433 is already in use by another process. Stop it or free the port before starting the local app.");
    process.exit(1);
  }
  console.log("Using the PostgreSQL server already running on port 5433.");
}

try {
  if (!useExistingDatabase) {
    try {
      await fs.access(path.join(dataDir, "PG_VERSION"));
    } catch {
      // A failed first initialization can leave partial files in this app-owned folder.
      await fs.rm(dataDir, { recursive: true, force: true });
      await pg.initialise();
    }
    await pg.start();
    pgStarted = true;
  }

  const client = pg.getPgClient("postgres", "127.0.0.1");
  await client.connect();
  const existing = await client.query(
    "SELECT 1 FROM pg_database WHERE datname = $1",
    [databaseName]
  );
  await client.end();
  if (existing.rowCount === 0) {
    const adminClient = pg.getPgClient("postgres", "127.0.0.1");
    await adminClient.connect();
    await adminClient.query(`CREATE DATABASE "${databaseName}"`);
    await adminClient.end();
  }

  const cli = path.join(backendDir, "node_modules", "prisma", "build", "index.js");
  await runNode([cli, "migrate", "deploy"], backendDir, "Prisma migrations");

  const databaseClient = pg.getPgClient(databaseName, "127.0.0.1");
  await databaseClient.connect();
  const corpTable = await databaseClient.query(
    `SELECT to_regclass('public."Corp"') AS table_name`
  );
  let needsSeed = !corpTable.rows[0].table_name;
  if (!needsSeed) {
    const count = await databaseClient.query('SELECT COUNT(*)::int AS count FROM "Corp"');
    needsSeed = count.rows[0].count === 0;
  }
  await databaseClient.end();

  if (needsSeed) {
    console.log("Local database is empty; loading the project's sample data once.");
    await runNode([cli, "db", "seed"], backendDir, "Prisma seed");
  }

  const nodemon = path.join(backendDir, "node_modules", "nodemon", "bin", "nodemon.js");
  const vite = path.join(frontendDir, "node_modules", "vite", "bin", "vite.js");
  startNode([nodemon, "app.js"], backendDir, "Backend");
  startNode([vite, "--host", "127.0.0.1"], frontendDir, "Frontend");

  await Promise.all([
    waitForApi(),
    waitFor("http://127.0.0.1:5173/", "Frontend"),
  ]);

  console.log("\nLocal app is ready: http://localhost:5173");
  console.log("API docs: http://localhost:3000/api-docs");
  console.log("Press Ctrl+C to stop the local app and database.");

  await new Promise((resolve) => {
    process.once("SIGINT", resolve);
    process.once("SIGTERM", resolve);
  });
} catch (error) {
  console.error("Could not start the local app:", error);
  process.exitCode = 1;
} finally {
  await stop();
}
