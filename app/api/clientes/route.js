import { NextResponse } from "next/server";
export const runtime = "nodejs";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { verifyFirebaseToken, isDevBypassEnabled } from "@/lib/firebase-admin";
import { json, errorJson, corsPreflight } from "@/lib/api-helpers";
import { validateClienteUpsert, trimOrEmpty } from "@/lib/validation";

export function OPTIONS(request) {
  return corsPreflight(request);
}

export async function POST(request) {
  try {
    const authHeader = request.headers.get("authorization");
    const decoded = await verifyFirebaseToken(authHeader);

    const body = await request.json();
    const uidFromToken = decoded?.uid;
    const uidFromBody = trimOrEmpty(body?.uid);
    const uid = uidFromBody || uidFromToken;

    if (!uid) return errorJson("uid es obligatorio", 400, request);
    if (!isDevBypassEnabled()) {
      if (uidFromBody && uidFromBody !== uidFromToken) {
        return errorJson("forbidden", 403, request);
      }
    }

    const { nombre, telefono, cuit, email } = validateClienteUpsert(body || {});
    const origen = trimOrEmpty(body?.origen) || "ecommerce";
    const descripcion = trimOrEmpty(body?.descripcion) || (await clienteExists(uid) ? "Update desde ecommerce" : "Alta desde ecommerce");

    const ref = doc(db, "clientes", uid);
    const nowIso = new Date().toISOString();
    const existing = await getDoc(ref);

    if (!existing.exists()) {
      const payload = {
        area: "",
        barrio: "",
        cuit,
        descripcion,
        direccion: "",
        email,
        esClienteViejo: Boolean(body?.esClienteViejo) || false,
        localidad: "",
        lote: "",
        nombre,
        partido: "",
        telefono,
        codigoPostal: "",
        lat: null,
        lng: null,
        origen,
        creadoEn: nowIso,
        actualizadoEn: nowIso,
      };
      await setDoc(ref, payload, { merge: true });
      return json({ uid, ...payload }, { status: 200 }, request);
    }

    const existingData = existing.data() || {};
    const createdIso = existingData.creadoEn || nowIso;
    const payload = {
      // solo actualizamos campos de cliente, no dirección aquí
      cuit,
      descripcion,
      email,
      esClienteViejo: body?.esClienteViejo != null ? Boolean(body.esClienteViejo) : existingData.esClienteViejo ?? false,
      nombre,
      telefono,
      origen: trimOrEmpty(body?.origen) || existingData.origen || "ecommerce",
      creadoEn: createdIso,
      actualizadoEn: nowIso,
    };
    await setDoc(ref, payload, { merge: true });
    const updatedSnap = await getDoc(ref);
    return json({ uid, ...(updatedSnap.data() || {}) }, { status: 200 }, request);
  } catch (err) {
    const status = err?.status || 500;
    return errorJson(err.message || "internal_error", status, request);
  }
}

async function clienteExists(uid) {
  const ref = doc(db, "clientes", uid);
  const snap = await getDoc(ref);
  return snap.exists();
}


