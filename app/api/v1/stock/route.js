import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { collection, doc, getDoc, getDocs, query, where } from "firebase/firestore";

function withCors(resp) {
  const headers = new Headers(resp.headers);
  headers.set("Access-Control-Allow-Origin", "*");
  headers.set("Access-Control-Allow-Methods", "GET,OPTIONS");
  headers.set("Access-Control-Allow-Headers", "Content-Type");
  return new NextResponse(resp.body, { status: resp.status, headers });
}

export function OPTIONS() {
  return withCors(new NextResponse(null, { status: 204 }));
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const idsParam = searchParams.get("ids");
    const now = Date.now();

    const productoIds = [];
    if (id) productoIds.push(id);
    if (idsParam) {
      idsParam
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .forEach((x) => productoIds.push(x));
    }

    if (productoIds.length === 0) {
      return withCors(NextResponse.json({ error: "Debe enviar id o ids" }, { status: 400 }));
    }

    const items = [];
    for (const pid of productoIds) {
      const ref = doc(db, "productos", pid);
      const snap = await getDoc(ref);
      if (!snap.exists()) {
        items.push({ id: pid, error: "No encontrado" });
        continue;
      }
      const data = { id: snap.id, ...snap.data() };

      // Reservas vigentes
      let reservadas = 0;
      try {
        const qq = query(collection(db, "reservasStock"), where("productoId", "==", pid));
        const rs = await getDocs(qq);
        rs.forEach((d) => {
          const r = d.data();
          if (String(r.estado || "").toLowerCase() !== "activa") return;
          const exp = r.expiresAt ? Date.parse(r.expiresAt) : 0;
          if (Number.isFinite(exp) && exp > now) {
            const cant = Number(r.cantidad);
            if (Number.isFinite(cant)) reservadas += cant;
          }
        });
      } catch (_) {}

      const stockTotal = Number(data.stock) || 0;
      const stockDisponible = Math.max(0, stockTotal - reservadas);
      items.push({
        id: data.id,
        stockTotal,
        stockReservado: reservadas,
        stockDisponible,
        estado: data.estado || "",
        nombre: data.nombre || "",
        unidadMedida: data.unidadMedida || "",
      });
    }

    return withCors(NextResponse.json({ items }));
  } catch (err) {
    return withCors(NextResponse.json({ error: err.message }, { status: 500 }));
  }
}


