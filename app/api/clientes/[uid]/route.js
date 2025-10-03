import { NextResponse } from "next/server";
export const runtime = "nodejs";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { verifyFirebaseToken, isDevBypassEnabled } from "@/lib/firebase-admin";
import { json, errorJson, corsPreflight } from "@/lib/api-helpers";

export function OPTIONS(request, { params }) {
  return corsPreflight(request);
}

export async function GET(request, { params }) {
  try {
    const authHeader = request.headers.get("authorization");
    const decoded = await verifyFirebaseToken(authHeader);
    const uidFromToken = decoded?.uid;
    const uid = params?.uid;
    if (!uid) return errorJson("Missing uid", 400, request);
    if (!isDevBypassEnabled()) {
      if (uid !== uidFromToken) return errorJson("forbidden", 403, request);
    }

    const ref = doc(db, "clientes", uid);
    const snap = await getDoc(ref);
    if (!snap.exists()) return errorJson("not_found", 404, request);
    return json({ uid, ...(snap.data() || {}) }, { status: 200 }, request);
  } catch (err) {
    const status = err?.status || 500;
    return errorJson(err.message || "internal_error", status, request);
  }
}


