import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, limit } from "firebase/firestore";

function withCors(resp) {
  const headers = new Headers(resp.headers);
  headers.set("Access-Control-Allow-Origin", "*");
  headers.set("Access-Control-Allow-Methods", "GET,OPTIONS");
  headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  return new NextResponse(resp.body, { status: resp.status, headers });
}

export function OPTIONS() {
  return withCors(new NextResponse(null, { status: 204 }));
}

// GET /api/users/{email}/profiles
export async function GET(request, { params }) {
  try {
    const { email } = params;
    
    if (!email) {
      return withCors(NextResponse.json({ 
        error: "Email requerido" 
      }, { status: 400 }));
    }

    // Buscar cliente por email en la colección clientes
    const q = query(
      collection(db, "clientes"),
      where("email", "==", email),
      limit(1)
    );
    
    const snap = await getDocs(q);
    
    if (snap.empty) {
      return withCors(NextResponse.json({ 
        error: "Usuario no encontrado",
        email: email
      }, { status: 404 }));
    }

    const cliente = snap.docs[0].data();
    
    // Formatear respuesta para ecommerce externo
    const perfil = {
      id: snap.docs[0].id,
      email: cliente.email,
      nombre: cliente.nombre || "",
      telefono: cliente.telefono || "",
      cuit: cliente.cuit || "",
      direccion: cliente.direccion || "",
      localidad: cliente.localidad || "",
      partido: cliente.partido || "",
      codigoPostal: cliente.codigoPostal || "",
      barrio: cliente.barrio || "",
      area: cliente.area || "",
      lote: cliente.lote || "",
      lat: cliente.lat || null,
      lng: cliente.lng || null,
      esClienteViejo: cliente.esClienteViejo || false,
      origen: cliente.origen || "ecommerce",
      creadoEn: cliente.creadoEn || null,
      actualizadoEn: cliente.actualizadoEn || null
    };

    return withCors(NextResponse.json({
      success: true,
      data: perfil
    }));

  } catch (err) {
    console.error("Error en /api/users/[email]/profiles:", err);
    return withCors(NextResponse.json({ 
      error: "Error interno del servidor",
      message: err.message
    }, { status: 500 }));
  }
}
