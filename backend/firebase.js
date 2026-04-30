const admin = require("firebase-admin");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

// The service account lives at the project root by default.
// Keep the real file out of git and set FIREBASE_SERVICE_ACCOUNT_PATH if needed.
const serviceAccountPath = path.resolve(
  process.env.FIREBASE_SERVICE_ACCOUNT_PATH || path.join(__dirname, "..", "serviceAccountKey.json")
);

if (!fs.existsSync(serviceAccountPath)) {
  throw new Error(
    `Missing Firebase service account file at ${serviceAccountPath}. ` +
      "Add serviceAccountKey.json to the project root or set FIREBASE_SERVICE_ACCOUNT_PATH."
  );
}

const serviceAccount = require(serviceAccountPath);

function initializeFirebase() {
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  }

  const firestore = admin.firestore();
  firestore.settings({ ignoreUndefinedProperties: true });

  return { admin, firestore };
}

module.exports = {
  admin,
  initializeFirebase,
};
