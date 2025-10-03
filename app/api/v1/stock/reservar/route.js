import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { collection, addDoc, getDocs, query, where, doc, getDoc, updateDoc } from "firebase/firestore";

function withCors(resp) {
  const headers = new Headers(resp.headers);
  headers.set("Access-Control-Allow-Origin", "*");
  headers.set("Access-Control-Allow-Methods", "POST,OPTIONS");
  headers.set("Access-Control-Allow-Headers", "Content-Type,Idempotency-Key");
  return new NextResponse(resp.body, { status: resp.status, headers });
}

export function OPTIONS() {
  return withCors(new NextResponse(null, { status: 204 }));
}

export async function POST(request) {
  try {
    const body = await request.json();
    const headers = request.headers || new Headers();
    const productoId = String(body?.productoId || "").trim();
    const carritoId = body?.carritoId ? String(body.carritoId) : null;
    const cantidad = Number(body?.cantidad || 0);
    const ttlSegundos = Math.max(60, Number(body?.ttlSegundos || 900)); // default 15 minutos
    const idempotencyKey = String(headers.get("Idempotency-Key") || body?.idempotencyKey || "").trim();

    if (!productoId || !Number.isFinite(cantidad) || cantidad <= 0) {
      return withCors(NextResponse.json({ error: "productoId y cantidad válidos requeridos" }, { status: 400 }));
    }

    // Idempotencia: si llega una misma key, devolver la reserva existente
    if (idempotencyKey) {
      try {
        const qq = query(collection(db, "reservasStock"), where("idempotencyKey", "==", idempotencyKey));
        const rs = await getDocs(qq);
        let existente = null;
        rs.forEach((d) => (existente = { id: d.id, ...d.data() }));
        if (existente) {
          return withCors(NextResponse.json({ reserva: existente, idempotente: true }));
        }
      } catch (_) {}
    }

    // Verificar stock disponible (stock - reservas activas no vencidas)
    const now = Date.now();
    const prodRef = doc(db, "productos", productoId);
    const prodSnap = await getDoc(prodRef);
    if (!prodSnap.exists()) return withCors(NextResponse.json({ error: "Producto no encontrado" }, { status: 404 }));
    const prod = { id: prodSnap.id, ...prodSnap.data() };
    const stockTotal = Number(prod.stock) || 0;

    let reservadas = 0;
    try {
      const qq = query(collection(db, "reservasStock"), where("productoId", "==", productoId), where("estado", "==", "activa"));
      const rs = await getDocs(qq);
      rs.forEach((d) => {
        const r = d.data();
        const exp = r.expiresAt ? Date.parse(r.expiresAt) : 0;
        if (Number.isFinite(exp) && exp > now) {
          const cant = Number(r.cantidad);
          if (Number.isFinite(cant)) reservadas += cant;
        }
      });
    } catch (_) {}

    const disponible = Math.max(0, stockTotal - reservadas);
    if (cantidad > disponible) {
      return withCors(NextResponse.json({ error: "Stock insuficiente", stockTotal, reservado: reservadas, disponible }, { status: 409 }));
    }

    const expiresAt = new Date(Date.now() + ttlSegundos * 1000).toISOString();
    const reserva = {
      productoId,
      carritoId,
      cantidad,
      estado: "activa",
      createdAt: new Date().toISOString(),
      expiresAt,
      idempotencyKey: idempotencyKey || null,
    };
    const ref = await addDoc(collection(db, "reservasStock"), reserva);
    return withCors(NextResponse.json({ reserva: { id: ref.id, ...reserva } }));
  } catch (err) {
    return withCors(NextResponse.json({ error: err.message }, { status: 500 }));
  }
}


