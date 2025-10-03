import { NextResponse } from "next/server";
import { withCorsApi, preflightApi, jsonOk, jsonError } from "@/lib/cors-api";
import { obtenerCarritoPorId, guardarCarrito, mergearItems, calcularTotales } from "@/lib/carts";

function validarNuevoItem(it) {
  const errores = [];
  if (!it || typeof it !== "object") {
    errores.push("item inválido");
    return errores;
  }
  if (!it.productoId) errores.push("productoId requerido");
  if (typeof it.nombreProducto !== "string") errores.push("nombreProducto requerido");
  if (typeof it.sku !== "string") errores.push("sku requerido");
  if (typeof it.imagenUrl !== "string") errores.push("imagenUrl requerido");
  const precio = Number(it.precioUnitario);
  const cantidad = Number(it.cantidad);
  if (!(precio >= 0)) errores.push("precioUnitario >= 0 requerido");
  if (!(cantidad > 0)) errores.push("cantidad > 0 requerido");
  return errores;
}

export function OPTIONS(request) {
  return preflightApi(request);
}

export async function POST(request, { params }) {
  const carritoId = params?.id ? String(params.id) : "";
  try {
    if (!carritoId) return jsonError("carritoId requerido", { status: 400 }, request);
    const body = await request.json().catch(() => ({}));
    const errores = validarNuevoItem(body);
    if (errores.length) return jsonError(errores.join(", "), { status: 422 }, request);

    const carrito = await obtenerCarritoPorId(carritoId);
    if (!carrito) return jsonError("Carrito no encontrado", { status: 404 }, request);
    if (carrito.estado === "cerrado") return jsonError("Carrito cerrado", { status: 409 }, request);

    const item = {
      itemId: crypto.randomUUID(),
      productoId: String(body.productoId),
      nombreProducto: String(body.nombreProducto),
      sku: String(body.sku),
      imagenUrl: String(body.imagenUrl),
      atributos: body.atributos && typeof body.atributos === "object" ? body.atributos : {},
      precioUnitario: Number(body.precioUnitario),
      cantidad: Number(body.cantidad),
    };

    // Merge por productoId+atributos
    const items = mergearItems(carrito.items || [], [item]);
    const totales = calcularTotales(items);
    const actualizado = { ...carrito, items, totales, actualizadoEn: new Date().toISOString() };
    await guardarCarrito(actualizado);
    return jsonOk(actualizado, { status: 200 }, request);
  } catch (err) {
    const msg = typeof err?.message === "string" ? err.message : "Error interno";
    return jsonError(msg, { status: 500 }, request);
  }
}


