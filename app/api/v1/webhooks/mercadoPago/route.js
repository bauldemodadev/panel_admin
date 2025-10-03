import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { doc, updateDoc } from "firebase/firestore";

function withCors(resp) {
  const headers = new Headers(resp.headers);
  headers.set("Access-Control-Allow-Origin", "*");
  headers.set("Access-Control-Allow-Methods", "POST,OPTIONS");
  headers.set("Access-Control-Allow-Headers", "Content-Type" );
  return new NextResponse(resp.body, { status: resp.status, headers });
}

export function OPTIONS() {
  return withCors(new NextResponse(null, { status: 204 }));
}

// Webhook de ejemplo
export async function POST(request) {
  try {
    const body = await request.json();
    const { pedidoId, estadoPago = "pagado" } = body || {};
    if (!pedidoId) return withCors(NextResponse.json({ error: "pedidoId requerido" }, { status: 400 }));
    const ref = doc(db, "pedidos", pedidoId);
    await updateDoc(ref, { estado: estadoPago, actualizadoEn: new Date().toISOString() });
    return withCors(NextResponse.json({ ok: true }));
  } catch (err) {
    return withCors(NextResponse.json({ error: err.message }, { status: 500 }));
  }
}


