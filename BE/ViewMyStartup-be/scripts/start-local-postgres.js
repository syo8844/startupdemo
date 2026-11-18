import EmbeddedPostgres from "embedded-postgres";

const databaseName = "viewmystartup";
const pg = new EmbeddedPostgres({
  databaseDir: ".local-postgres/data",
  user: "postgres",
  password: "localdev",
  port: 5433,
  persistent: true,
  autoRehydrateSymlinks: true,
  onLog: (message) => console.log(`[postgres] ${message}`),
  onError: (error) => console.error(`[postgres] ${error}`),
});

let stopping = false;

async function stop() {
  if (stopping) return;
  stopping = true;
  await pg.stop();
  console.log("Local PostgreSQL stopped.");
}

try {
  await pg.initialise();
  await pg.start();

  const client = pg.getPgClient("postgres", "127.0.0.1");
  await client.connect();
  const existingDatabase = await client.query(
    "SELECT 1 FROM pg_database WHERE datname = $1",
    [databaseName]
  );
  if (existingDatabase.rowCount === 0) {
    await client.query(`CREATE DATABASE "${databaseName}"`);
  }
  await client.end();

  console.log(`Local PostgreSQL is ready on 127.0.0.1:5433 (${databaseName}).`);
  console.log("Press Ctrl+C to stop PostgreSQL.");

  await new Promise((resolve) => {
    process.once("SIGINT", resolve);
    process.once("SIGTERM", resolve);
  });

  await stop();
} catch (error) {
  console.error("Could not start local PostgreSQL:", error);
  await pg.stop().catch(() => {});
  process.exitCode = 1;
}
