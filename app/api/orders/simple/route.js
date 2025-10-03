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

// GET /api/orders/simple?userId={email} - Versión simplificada sin consultas complejas
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    console.log("API /api/orders/simple llamada con userId:", userId);

    if (!userId) {
      return withCors(
        NextResponse.json(
          {
            error: "userId (email) requerido",
          },
          { status: 400 }
        )
      );
    }

    // Validar formato de email básico
    if (!userId.includes("@")) {
      return withCors(
        NextResponse.json(
          {
            error: "userId debe ser un email válido",
            userId: userId
          },
          { status: 400 }
        )
      );
    }

    // Consulta simple sin orderBy para evitar problemas de índice
    const ventasQuery = query(
      collection(db, "ventas"),
      where("cliente.email", "==", userId),
      limit(50) // Limitar resultados para evitar timeouts
    );

    console.log("Ejecutando consulta a Firestore...");
    const ventasSnap = await getDocs(ventasQuery);
    console.log(`Encontradas ${ventasSnap.docs.length} ventas`);

    // Estructura simplificada sin consultas adicionales
    const ventas = ventasSnap.docs.map((doc) => {
      const venta = doc.data();
      
      return {
        id: doc.id,
        numeroPedido: venta.numeroPedido || doc.id,
        estado: venta.estadoPago || "pendiente",
        total: venta.total || 0,
        fecha: venta.fecha || null,
        fechaEntrega: venta.fechaEntrega || null,
        medioPago: venta.formaPago || "efectivo",
        
        // Productos básicos sin buscar imágenes
        productos: (venta.productos || venta.items || []).map((producto) => ({
          id: producto.id || "",
          nombre: producto.nombre || "",
          cantidad: producto.cantidad || 0,
          precio: producto.precio || 0,
          unidad: producto.unidad || "",
          categoria: producto.categoria || "",
          // Solo dimensiones para maderas
          ...(producto.categoria === "Maderas" && {
            alto: producto.alto || 0,
            ancho: producto.ancho || 0,
            largo: producto.largo || 0,
            cepilladoAplicado: producto.cepilladoAplicado || false,
          }),
        })),
        
        // Información básica de envío
        envio: {
          estado: venta.estadoEnvio || "pendiente",
          direccion: venta.direccionEnvio || venta.cliente?.direccion || "",
          transportista: venta.transportista || "",
          fechaEntrega: venta.fechaEntrega || null,
        },
        
        // Cliente básico
        cliente: {
          nombre: venta.cliente?.nombre || "",
          telefono: venta.cliente?.telefono || "",
        },
      };
    });

    // Ordenar manualmente por fecha
    ventas.sort((a, b) => {
      const fechaA = a.fecha || "";
      const fechaB = b.fecha || "";
      return fechaB.localeCompare(fechaA);
    });

    console.log(`Retornando ${ventas.length} ventas procesadas`);

    return withCors(
      NextResponse.json({
        success: true,
        data: ventas,
        total: ventas.length,
        usuario: {
          email: userId,
        },
        mensaje: ventas.length === 0 ? "No se encontraron ventas para este usuario" : null,
      })
    );

  } catch (err) {
    console.error("Error en /api/orders/simple:", {
      message: err.message,
      code: err.code,
      stack: err.stack,
      userId: searchParams.get("userId")
    });

    // Manejar errores específicos de Firestore
    if (err.code === "permission-denied") {
      return withCors(
        NextResponse.json(
          {
            error: "Error de permisos en la base de datos",
            message: "No se puede acceder a la colección de ventas",
            userId: searchParams.get("userId")
          },
          { status: 403 }
        )
      );
    }

    if (err.code === "unavailable") {
      return withCors(
        NextResponse.json(
          {
            error: "Base de datos no disponible",
            message: "Error de conectividad con Firestore",
            userId: searchParams.get("userId")
          },
          { status: 503 }
        )
      );
    }

    if (err.code === "failed-precondition") {
      return withCors(
        NextResponse.json(
          {
            error: "Error de índice en la base de datos",
            message: "La consulta requiere un índice que no existe",
            userId: searchParams.get("userId")
          },
          { status: 400 }
        )
      );
    }

    // Error genérico
    return withCors(
      NextResponse.json(
        {
          error: "Error interno del servidor",
          message: "Error al consultar las ventas del usuario",
          details: err.message,
          userId: searchParams.get("userId")
        },
        { status: 500 }
      )
    );
  }
}
