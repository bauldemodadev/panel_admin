import { NextResponse } from "next/server";
export const runtime = "nodejs";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { verifyFirebaseToken, isDevBypassEnabled } from "@/lib/firebase-admin";
import { json, errorJson, corsPreflight } from "@/lib/api-helpers";
import { validateDireccionUpsert, trimOrEmpty } from "@/lib/validation";

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
    if (!snap.exists()) return json([], { status: 200 }, request);
    const data = snap.data() || {};
    if (!trimOrEmpty(data.direccion) || !trimOrEmpty(data.localidad)) {
      return json([], { status: 200 }, request);
    }
    const dir = buildDireccionPrincipal(data);
    return json([dir], { status: 200 }, request);
  } catch (err) {
    const status = err?.status || 500;
    return errorJson(err.message || "internal_error", status, request);
  }
}

export async function POST(request, { params }) {
  try {
    const authHeader = request.headers.get("authorization");
    const decoded = await verifyFirebaseToken(authHeader);
    const uidFromToken = decoded?.uid;
    const uid = params?.uid;
    if (!uid) return errorJson("Missing uid", 400, request);
    if (!isDevBypassEnabled()) {
      if (uid !== uidFromToken) return errorJson("forbidden", 403, request);
    }

    const body = await request.json();
    const { direccion, localidad, codigoPostal, lat, lng } = validateDireccionUpsert(body || {});
    const nowIso = new Date().toISOString();

    const ref = doc(db, "clientes", uid);
    const snap = await getDoc(ref);
    const existing = snap.data() || {};
    const createdIso = existing.creadoEn || nowIso;

    const payload = {
      direccion,
      localidad,
      codigoPostal: codigoPostal || existing.codigoPostal || "",
      lat: lat ?? null,
      lng: lng ?? null,
      partido: trimOrEmpty(body?.partido) || existing.partido || "",
      barrio: trimOrEmpty(body?.barrio) || existing.barrio || "",
      area: trimOrEmpty(body?.area) || existing.area || "",
      lote: trimOrEmpty(body?.lote) || existing.lote || "",
      origen: trimOrEmpty(body?.origen) || existing.origen || "ecommerce",
      creadoEn: createdIso,
      actualizadoEn: nowIso,
    };
    await setDoc(ref, payload, { merge: true });
    const dir = buildDireccionPrincipal({ ...existing, ...payload });
    return json(dir, { status: 201 }, request);
  } catch (err) {
    const status = err?.status || 500;
    return errorJson(err.message || "internal_error", status, request);
  }
}

function buildDireccionPrincipal(data) {
  return {
    id: "principal",
    direccion: data.direccion || "",
    ciudad: data.localidad || "",
    codigoPostal: data.codigoPostal || "",
    metodoEntrega: "envio",
    lat: data.lat ?? null,
    lng: data.lng ?? null,
    esFavorita: true,
    origen: data.origen || "ecommerce",
    creadoEn: data.creadoEn || null,
    actualizadoEn: data.actualizadoEn || null,
  };
}


