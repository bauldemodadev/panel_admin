import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { collection, addDoc, doc, getDoc, updateDoc } from "firebase/firestore";
import { calcularPreciosProducto, normalizarProductoEntrada } from "@/lib/pricing";

function withCors(resp) {
  const headers = new Headers(resp.headers);
  headers.set("Access-Control-Allow-Origin", "*");
  headers.set("Access-Control-Allow-Methods", "GET,POST,PATCH,OPTIONS");
  headers.set("Access-Control-Allow-Headers", "Content-Type");
  return new NextResponse(resp.body, { status: resp.status, headers });
}

export function OPTIONS() {
  return withCors(new NextResponse(null, { status: 204 }));
}

// Crear carrito
export async function POST(request) {
  try {
    const body = await request.json();
    const { clienteId = null } = body || {};
    const docRef = await addDoc(collection(db, "carritos"), {
      clienteId,
      estado: "abierto",
      creadoEn: new Date().toISOString(),
      actualizadoEn: new Date().toISOString(),
    });
    return withCors(NextResponse.json({ carritoId: docRef.id }));
  } catch (err) {
    return withCors(NextResponse.json({ error: err.message }, { status: 500 }));
  }
}

// Obtener carrito con totales
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const carritoId = searchParams.get("carritoId");
    if (!carritoId) return withCors(NextResponse.json({ error: "carritoId requerido" }, { status: 400 }));
    const ref = doc(db, "carritos", carritoId);
    const snap = await getDoc(ref);
    if (!snap.exists()) return withCors(NextResponse.json({ error: "No encontrado" }, { status: 404 }));
    const carrito = { id: snap.id, ...snap.data() };

    const itemsRef = doc(db, "carritos", carritoId);
    // Para simplicidad, asumimos que el carrito guarda `items` embebidos
    const items = Array.isArray(carrito.items) ? carrito.items : [];
    let subtotal = 0;
    for (const it of items) {
      const normalized = normalizarProductoEntrada(it.producto || {});
      const pricing = calcularPreciosProducto(normalized, {
        cantidad: it.cantidad || 1,
        cepillado: Boolean(it.cepillado),
        redondear: true,
        modoRedondeo: "total",
      });
      it.pricing = pricing;
      subtotal += pricing.precioTotalFinal;
    }
    return withCors(NextResponse.json({ carrito: { ...carrito, items }, subtotal }));
  } catch (err) {
    return withCors(NextResponse.json({ error: err.message }, { status: 500 }));
  }
}

// Actualizar items del carrito (agregar/editar/eliminar)
export async function PATCH(request) {
  try {
    const body = await request.json();
    const { carritoId, items } = body || {};
    if (!carritoId || !Array.isArray(items)) {
      return withCors(NextResponse.json({ error: "carritoId e items requeridos" }, { status: 400 }));
    }
    const ref = doc(db, "carritos", carritoId);
    const snap = await getDoc(ref);
    if (!snap.exists()) return withCors(NextResponse.json({ error: "No encontrado" }, { status: 404 }));
    await updateDoc(ref, { items, actualizadoEn: new Date().toISOString() });
    return withCors(NextResponse.json({ ok: true }));
  } catch (err) {
    return withCors(NextResponse.json({ error: err.message }, { status: 500 }));
  }
}


