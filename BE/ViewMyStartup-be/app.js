import express from "express";
import cors from "cors";
import { DATABASE_URL } from "./src/config/env.js";
import investmentRouter from "./src/routes/investmentRoute.js";
import { router as corpRouter } from "./src/routes/corpRoute.js";
import { router as compareTotalRouter } from "./src/routes/compareTotalRoute.js";
import { router as compareRouter } from "./src/routes/compareRoute.js";
import swaggerUi from "swagger-ui-express";
import swaggerSpec from "./src/swagger/swagger.js";
import { prisma } from "./src/config/prisma.js";
import cron from "node-cron";
import morgan from "morgan";

//투자금 등등은 너무 커서 BigInt 로 세팅한거 조회하기 위한 작업
BigInt.prototype.toJSON = function () {
  return this.toString();
};

const app = express();
const PORT = process.env.PORT || 3000;
const PUBLIC_BASE_URL = (
  process.env.RENDER_EXTERNAL_URL || `http://localhost:${PORT}`
).replace(/\/+$/, "");

//cors 오류 방지 - 모든 도메인 허용
app.use(cors());
app.use(express.json());
app.use(morgan("combined"));

//Swagger UI
app.use(
  "/api-docs",
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec, { explorer: true })
);

// Render health check: confirm both the API process and its database connection.
app.get("/health", async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({ status: "alive", database: "connected" });
  } catch (error) {
    console.error("Database health check failed:", error.message);
    res.status(503).json({ status: "unhealthy", database: "disconnected" });
  }
});

app.use("/corp", corpRouter);
app.use("/corpTotals", compareTotalRouter);
app.use("/compare", compareRouter);
app.use("/", investmentRouter);

// Ping the current deployment every 10 minutes.
cron.schedule("*/10 * * * *", async () => {
  try {
    const response = await fetch(`${PUBLIC_BASE_URL}/health`);
    console.log(
      `[${new Date().toISOString()}] Ping sent, status: ${response.status}`
    );
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Ping failed:`, error.message);
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running at http://localhost:${PORT}/api-docs`);
});
