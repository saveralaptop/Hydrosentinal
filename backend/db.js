const mysql = require("mysql2/promise");
require("dotenv").config();

const resolvedConfig = {
  host: "switchyard.proxy.rlwy.net",
  port: 57547,
  user: "root",
  password: process.env.MYSQL_PASSWORD,
  database: "railway",
};

function assertDatabaseConfig() {
  if (!resolvedConfig.password) {
    throw new Error(
      "Missing MYSQL_PASSWORD environment variable. Set it in backend/.env before starting the sync service."
    );
  }
}

let pool = null;

function getPool() {
  if (!pool) {
    pool = mysql.createPool({
      host: resolvedConfig.host,
      port: resolvedConfig.port,
      user: resolvedConfig.user,
      password: resolvedConfig.password,
      database: resolvedConfig.database,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      timezone: "Z",
    });
  }

  return pool;
}

async function initializeDatabase() {
  assertDatabaseConfig();

  // Create the readings table if it does not already exist.
  await getPool().execute(`
    CREATE TABLE IF NOT EXISTS readings (
      id INT NOT NULL AUTO_INCREMENT,
      user_id VARCHAR(191) NOT NULL,
      device_id VARCHAR(191) NOT NULL,
      ph FLOAT NULL,
      turbidity FLOAT NULL,
      timestamp DATETIME NOT NULL,
      PRIMARY KEY (id),
      UNIQUE KEY uniq_user_device_timestamp (user_id, device_id, timestamp)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);
}

module.exports = {
  getPool,
  initializeDatabase,
};
