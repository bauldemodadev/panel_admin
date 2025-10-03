import { NextResponse } from "next/server";
import { withCorsApi, preflightApi, jsonOk, jsonError } from "@/lib/cors-api";
import {
  crearCarrito,
  encontrarCarritoAbiertoPorUsuario,
  obtenerCarritoPorId,
  calcularTotales,
  mergearCarritoDeUsuarioEnActual,
} from "@/lib/carts";
import { verifyFirebaseToken } from "@/lib/firebase-admin";

export function OPTIONS(request) {
  return preflightApi(request);
}

export async function GET(request, { params }) {
  const id = params?.id ? String(params.id) : "";
  const { searchParams } = new URL(request.url);
  const autoCrear = (searchParams.get("auto") || "1").toLowerCase() !== "0";
  try {
    if (!id) return jsonError("id requerido", { status: 400 }, request);

    // Primero, probar como usuarioId con carrito abierto
    let carrito = await encontrarCarritoAbiertoPorUsuario(id);

    // Si no, intentar como carritoId
    if (!carrito) carrito = await obtenerCarritoPorId(id);

    // Autocrear si no existe
    if (!carrito && autoCrear) {
      carrito = await crearCarrito({ usuarioId: null, moneda: "ARS" });
    }

    if (!carrito) return jsonError("No encontrado", { status: 404 }, request);

    // Recalcular totales por si vinieron incoherentes y asociar token si vino
    const items = Array.isArray(carrito.items) ? carrito.items : [];
    const totales = calcularTotales(items);
    let out = { ...carrito, totales };
    try {
      const authHeader = request.headers.get("authorization");
      if (authHeader) {
        const decoded = await verifyFirebaseToken(authHeader);
        if (decoded?.uid) {
          out = await mergearCarritoDeUsuarioEnActual({ actual: out, usuarioId: decoded.uid });
        }
      }
    } catch (_) {}
    return jsonOk(out, { status: 200 }, request);
  } catch (err) {
    const msg = typeof err?.message === "string" ? err.message : "Error interno";
    return jsonError(msg, { status: 500 }, request);
  }
}


