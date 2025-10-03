import { NextResponse } from "next/server";
import { withCorsApi, preflightApi, jsonOk, jsonError } from "@/lib/cors-api";
import { crearCarrito } from "@/lib/carts";
import { verifyFirebaseToken } from "@/lib/firebase-admin";

export function OPTIONS(request) {
  return preflightApi(request);
}

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    let usuarioId = body?.usuarioId ?? null;
    // Asociar token si viene
    try {
      const authHeader = request.headers.get("authorization");
      if (authHeader) {
        const decoded = await verifyFirebaseToken(authHeader);
        if (decoded?.uid) usuarioId = usuarioId || decoded.uid;
      }
    } catch (_) {}
    const moneda = typeof body?.moneda === "string" ? body.moneda : "ARS";
    const carrito = await crearCarrito({ usuarioId, moneda });
    return jsonOk(carrito, { status: 201 }, request);
  } catch (err) {
    const msg = typeof err?.message === "string" ? err.message : "Error interno";
    return jsonError(msg, { status: 500 }, request);
  }
}


