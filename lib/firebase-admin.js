import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

let adminAuthInstance = null;

function getServiceAccountConfig() {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  let privateKey = process.env.FIREBASE_PRIVATE_KEY;
  if (privateKey && privateKey.includes("\\n")) {
    privateKey = privateKey.replace(/\\n/g, "\n");
  }
  if (projectId && clientEmail && privateKey) {
    return { projectId, clientEmail, privateKey };
  }
  return null;
}

export function getAdminAuth() {
  if (adminAuthInstance) return adminAuthInstance;
  const apps = getApps();
  if (apps.length === 0) {
    const svc = getServiceAccountConfig();
    if (svc) {
      initializeApp({
        credential: cert({
          projectId: svc.projectId,
          clientEmail: svc.clientEmail,
          privateKey: svc.privateKey,
        }),
      });
    } else {
      // Fallback: initialize with default credentials (if present in environment)
      initializeApp();
    }
  }
  adminAuthInstance = getAuth();
  return adminAuthInstance;
}

export function isDevBypassEnabled() {
  return process.env.DEV_BYPASS_AUTH === "1";
}

export async function verifyFirebaseToken(authorizationHeader) {
  if (!authorizationHeader || !authorizationHeader.toLowerCase().startsWith("bearer ")) {
    if (isDevBypassEnabled()) {
      return {};
    }
    const error = new Error("Missing or invalid Authorization header");
    error.status = 401;
    throw error;
  }
  const token = authorizationHeader.substring(7);
  try {
    const auth = getAdminAuth();
    const decoded = await auth.verifyIdToken(token);
    return decoded;
  } catch (e) {
    if (isDevBypassEnabled()) {
      return {};
    }
    const error = new Error("Unauthorized");
    error.status = 401;
    throw error;
  }
}


