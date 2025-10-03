import { NextResponse } from "next/server";
export const runtime = "nodejs";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { verifyFirebaseToken, isDevBypassEnabled } from "@/lib/firebase-admin";
import { json, errorJson, corsPreflight } from "@/lib/api-helpers";
import { validateDireccionUpsert, trimOrEmpty } from "@/lib/validation";

export function OPTIONS(request, { params }) {
  return corsPreflight(request);
}

export async function PUT(request, { params }) {
  try {
    const authHeader = request.headers.get("authorization");
    const decoded = await verifyFirebaseToken(authHeader);
    const uidFromToken = decoded?.uid;
    const uid = params?.uid;
    const id = params?.id;
    if (!uid || !id) return errorJson("Missing uid or id", 400, request);
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
      actualizadoEn: nowIso,
      creadoEn: createdIso,
    };
    await setDoc(ref, payload, { merge: true });
    const dir = {
      id: "principal",
      direccion: payload.direccion,
      ciudad: payload.localidad,
      codigoPostal: payload.codigoPostal,
      metodoEntrega: "envio",
      lat: payload.lat,
      lng: payload.lng,
      esFavorita: true,
      origen: existing.origen || "ecommerce",
      creadoEn: payload.creadoEn,
      actualizadoEn: payload.actualizadoEn,
    };
    return json(dir, { status: 200 }, request);
  } catch (err) {
    const status = err?.status || 500;
    return errorJson(err.message || "internal_error", status, request);
  }
}

export async function DELETE(request, { params }) {
  try {
    const authHeader = request.headers.get("authorization");
    const decoded = await verifyFirebaseToken(authHeader);
    const uidFromToken = decoded?.uid;
    const uid = params?.uid;
    const id = params?.id;
    if (!uid || !id) return errorJson("Missing uid or id", 400, request);
    if (!isDevBypassEnabled()) {
      if (uid !== uidFromToken) return errorJson("forbidden", 403, request);
    }

    const nowIso = new Date().toISOString();
    const ref = doc(db, "clientes", uid);
    const snap = await getDoc(ref);
    if (!snap.exists()) return corsPreflight(request);
    const existing = snap.data() || {};
    const payload = {
      direccion: "",
      localidad: "",
      codigoPostal: "",
      lat: null,
      lng: null,
      partido: "",
      barrio: "",
      area: "",
      lote: "",
      actualizadoEn: nowIso,
    };
    await setDoc(ref, payload, { merge: true });
    return corsPreflight(request);
  } catch (err) {
    const status = err?.status || 500;
    return errorJson(err.message || "internal_error", status, request);
  }
}


