import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";

function withCors(resp) {
  const headers = new Headers(resp.headers);
  headers.set("Access-Control-Allow-Origin", "*");
  headers.set("Access-Control-Allow-Methods", "POST,OPTIONS");
  headers.set("Access-Control-Allow-Headers", "Content-Type");
  return new NextResponse(resp.body, { status: resp.status, headers });
}

export function OPTIONS() {
  return withCors(new NextResponse(null, { status: 204 }));
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { reservaId } = body || {};
    if (!reservaId) return withCors(NextResponse.json({ error: "reservaId requerido" }, { status: 400 }));
    const ref = doc(db, "reservasStock", String(reservaId));
    const snap = await getDoc(ref);
    if (!snap.exists()) return withCors(NextResponse.json({ error: "No encontrado" }, { status: 404 }));
    const reserva = { id: snap.id, ...snap.data() };
    if (String(reserva.estado || "") !== "activa") {
      return withCors(NextResponse.json({ ok: true, reserva }));
    }
    await updateDoc(ref, { estado: "liberada", actualizadoEn: new Date().toISOString() });
    return withCors(NextResponse.json({ ok: true }));
  } catch (err) {
    return withCors(NextResponse.json({ error: err.message }, { status: 500 }));
  }
}


