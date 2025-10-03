import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { collection, addDoc, doc, getDoc, getDocs, updateDoc, query, where, orderBy } from "firebase/firestore";

function withCors(resp) {
  const headers = new Headers(resp.headers);
  headers.set("Access-Control-Allow-Origin", "*");
  headers.set("Access-Control-Allow-Methods", "GET,POST,OPTIONS" );
  headers.set("Access-Control-Allow-Headers", "Content-Type");
  return new NextResponse(resp.body, { status: resp.status, headers });
}

export function OPTIONS() {
  return withCors(new NextResponse(null, { status: 204 }));
}

// Crear pedido desde carrito
export async function POST(request) {
  try {
    const body = await request.json();
    const { carritoId, total, medioPago = "", datosEnvio = null } = body || {};
    if (!carritoId || typeof total !== "number") {
      return withCors(NextResponse.json({ error: "carritoId y total requeridos" }, { status: 400 }));
    }
    const carritoRef = doc(db, "carritos", carritoId);
    const carritoSnap = await getDoc(carritoRef);
    if (!carritoSnap.exists()) return withCors(NextResponse.json({ error: "Carrito no encontrado" }, { status: 404 }));
    const carrito = { id: carritoSnap.id, ...carritoSnap.data() };

    const pedidoRef = await addDoc(collection(db, "pedidos"), {
      carritoId,
      clienteId: carrito.clienteId || null,
      estado: "pagoPendiente",
      total,
      medioPago,
      datosEnvio,
      creadoEn: new Date().toISOString(),
      actualizadoEn: new Date().toISOString(),
    });

    // Marcar carrito como cerrado
    await updateDoc(carritoRef, { estado: "cerrado", actualizadoEn: new Date().toISOString() });
    return withCors(NextResponse.json({ pedidoId: pedidoRef.id }));
  } catch (err) {
    return withCors(NextResponse.json({ error: err.message }, { status: 500 }));
  }
}

// Obtener pedido por ID o por clienteId
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const pedidoId = searchParams.get("pedidoId");
    const clienteId = searchParams.get("clienteId");
    
    // Si se proporciona clienteId, buscar todos los pedidos del cliente
    if (clienteId) {
      const q = query(
        collection(db, "pedidos"),
        where("clienteId", "==", clienteId),
        orderBy("creadoEn", "desc")
      );
      
      const snap = await getDocs(q);
      const pedidos = [];
      snap.forEach((doc) => {
        pedidos.push({ id: doc.id, ...doc.data() });
      });
      
      return withCors(NextResponse.json({ 
        pedidos, 
        total: pedidos.length,
        clienteId 
      }));
    }
    
    // Si se proporciona pedidoId, buscar pedido específico
    if (pedidoId) {
      const ref = doc(db, "pedidos", pedidoId);
      const snap = await getDoc(ref);
      if (!snap.exists()) return withCors(NextResponse.json({ error: "No encontrado" }, { status: 404 }));
      return withCors(NextResponse.json({ pedido: { id: snap.id, ...snap.data() } }));
    }
    
    // Si no se proporciona ninguno, error
    return withCors(NextResponse.json({ 
      error: "Debe proporcionar pedidoId o clienteId" 
    }, { status: 400 }));
    
  } catch (err) {
    return withCors(NextResponse.json({ error: err.message }, { status: 500 }));
  }
}


