import { NextResponse } from "next/server";
import { withCorsApi, preflightApi, jsonOk, jsonError } from "@/lib/cors-api";
import { obtenerCarritoPorId, guardarCarrito } from "@/lib/carts";

export function OPTIONS(request) {
  return preflightApi(request);
}

export async function PATCH(request, { params }) {
  const carritoId = String(params?.id || "");
  try {
    if (!carritoId) return jsonError("carritoId requerido", { status: 400 }, request);
    const carrito = await obtenerCarritoPorId(carritoId);
    if (!carrito) return jsonError("Carrito no encontrado", { status: 404 }, request);
    if (carrito.estado === "cerrado") return jsonError("Carrito ya cerrado", { status: 409 }, request);
    const actualizado = { ...carrito, estado: "cerrado", actualizadoEn: new Date().toISOString() };
    await guardarCarrito(actualizado);
    return jsonOk(actualizado, { status: 200 }, request);
  } catch (err) {
    const msg = typeof err?.message === "string" ? err.message : "Error interno";
    return jsonError(msg, { status: 500 }, request);
  }
}


