import { NextResponse } from "next/server";
import { withCorsApi, preflightApi, jsonOk, jsonError } from "@/lib/cors-api";
import { obtenerCarritoPorId, guardarCarrito, calcularTotales } from "@/lib/carts";

export function OPTIONS(request) {
  return preflightApi(request);
}

export async function PATCH(request, { params }) {
  const carritoId = String(params?.id || "");
  const itemId = String(params?.itemId || "");
  try {
    if (!carritoId || !itemId) return jsonError("parámetros requeridos", { status: 400 }, request);
    const body = await request.json().catch(() => ({}));
    const carrito = await obtenerCarritoPorId(carritoId);
    if (!carrito) return jsonError("Carrito no encontrado", { status: 404 }, request);
    if (carrito.estado === "cerrado") return jsonError("Carrito cerrado", { status: 409 }, request);

    const items = Array.isArray(carrito.items) ? [...carrito.items] : [];
    const idx = items.findIndex((it) => String(it.itemId) === itemId);
    if (idx === -1) return jsonError("Item no encontrado", { status: 404 }, request);

    const it = { ...items[idx] };
    if (body.cantidad != null) {
      const cantidad = Number(body.cantidad);
      if (!(cantidad > 0)) return jsonError("cantidad > 0 requerida", { status: 422 }, request);
      it.cantidad = cantidad;
    }
    if (body.atributos && typeof body.atributos === "object") {
      it.atributos = { ...body.atributos };
    }
    items[idx] = it;
    const totales = calcularTotales(items);
    const actualizado = { ...carrito, items, totales, actualizadoEn: new Date().toISOString() };
    await guardarCarrito(actualizado);
    return jsonOk(actualizado, { status: 200 }, request);
  } catch (err) {
    const msg = typeof err?.message === "string" ? err.message : "Error interno";
    return jsonError(msg, { status: 500 }, request);
  }
}

export async function DELETE(request, { params }) {
  const carritoId = String(params?.id || "");
  const itemId = String(params?.itemId || "");
  try {
    if (!carritoId || !itemId) return jsonError("parámetros requeridos", { status: 400 }, request);
    const carrito = await obtenerCarritoPorId(carritoId);
    if (!carrito) return jsonError("Carrito no encontrado", { status: 404 }, request);
    if (carrito.estado === "cerrado") return jsonError("Carrito cerrado", { status: 409 }, request);
    const items = (carrito.items || []).filter((it) => String(it.itemId) !== itemId);
    const totales = calcularTotales(items);
    const actualizado = { ...carrito, items, totales, actualizadoEn: new Date().toISOString() };
    await guardarCarrito(actualizado);
    return jsonOk(actualizado, { status: 200 }, request);
  } catch (err) {
    const msg = typeof err?.message === "string" ? err.message : "Error interno";
    return jsonError(msg, { status: 500 }, request);
  }
}


