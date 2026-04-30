require("dotenv").config();

const express = require("express");
const cors = require("cors");

const { initializeFirebase } = require("./firebase");
const { initializeDatabase } = require("./db");
const { getLast10ReadingsPerDevice, runSyncWorker } = require("./sync");

const app = express();
const port = Number(process.env.PORT || 4000);

app.use(cors());
app.use(express.json());

app.get("/health", (req, res) => {
  res.json({ ok: true });
});

// Returns the latest 10 readings for every device, grouped by device_id.
app.get("/readings", async (req, res) => {
  try {
    const grouped = await getLast10ReadingsPerDevice();
    res.json({ success: true, data: grouped });
  } catch (error) {
    console.error("GET /readings failed:", error);
    res.status(500).json({
      success: false,
      message: "Unable to fetch readings",
    });
  }
});

async function startServer() {
  try {
    initializeFirebase();
    let dbAvailable = true;

    try {
      await initializeDatabase();
    } catch (dbErr) {
      dbAvailable = false;
      console.error("Database initialization failed:", dbErr && dbErr.message ? dbErr.message : dbErr);
      console.error("Continuing without DB. Sync worker disabled. Set correct MYSQL credentials in backend/.env to enable DB.");
    }

    if (dbAvailable) {
      try {
        await runSyncWorker();
      } catch (syncErr) {
        console.error("Sync worker failed to start:", syncErr);
      }
    }

    // Expose DB availability to request handlers via app.locals
    app.locals.dbAvailable = dbAvailable;

    app.listen(port, () => {
      console.log(`HydroSentinal backend running on http://localhost:${port}`);
      if (!dbAvailable) console.log("NOTE: MySQL unavailable — reading sync disabled.");
    });
  } catch (error) {
    console.error("Server failed to start:", error);
    process.exitCode = 1;
  }
}

startServer();
