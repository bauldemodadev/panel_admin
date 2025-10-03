import { NextResponse } from "next/server";
import { withCorsApi, preflightApi, jsonOk, jsonError } from "@/lib/cors-api";
import { obtenerCarritoPorId, guardarCarrito, calcularTotales } from "@/lib/carts";

export function OPTIONS(request) {
  return preflightApi(request);
}

export async function DELETE(request, { params }) {
  const carritoId = String(params?.id || "");
  try {
    if (!carritoId) return jsonError("carritoId requerido", { status: 400 }, request);
    const carrito = await obtenerCarritoPorId(carritoId);
    if (!carrito) return jsonError("Carrito no encontrado", { status: 404 }, request);
    if (carrito.estado === "cerrado") return jsonError("Carrito cerrado", { status: 409 }, request);
    const items = [];
    const totales = calcularTotales(items);
    const actualizado = { ...carrito, items, totales, actualizadoEn: new Date().toISOString() };
    await guardarCarrito(actualizado);
    return jsonOk(actualizado, { status: 200 }, request);
  } catch (err) {
    const msg = typeof err?.message === "string" ? err.message : "Error interno";
    return jsonError(msg, { status: 500 }, request);
  }
}


