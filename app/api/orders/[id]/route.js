import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, updateDoc, doc, getDoc, limit } from "firebase/firestore";

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

// GET /api/orders/{id} - Obtener orden específica por ID
export async function GET(request, { params }) {
  try {
    const { id } = params;
    
    console.log("API GET /api/orders/{id} llamada con ID:", id);

    if (!id) {
      return withCors(
        NextResponse.json(
          {
            success: false,
            error: "ID de orden requerido",
            code: "MISSING_ORDER_ID"
          },
          { status: 400 }
        )
      );
    }

    // Buscar orden por orderId en la colección orders
    const ordersQuery = query(
      collection(db, "orders"),
      where("orderId", "==", id),
      limit(1)
    );

    const ordersSnap = await getDocs(ordersQuery);

    if (ordersSnap.empty) {
      return withCors(
        NextResponse.json(
          {
            success: false,
            error: "Orden no encontrada",
            code: "ORDER_NOT_FOUND",
            orderId: id
          },
          { status: 404 }
        )
      );
    }

    const orderDoc = ordersSnap.docs[0];
    const orderData = orderDoc.data();

    // Estructura de respuesta
    const order = {
      id: orderDoc.id, // ID del documento en Firestore
      orderId: orderData.orderId,
      userId: orderData.userId,
      status: orderData.status,
      total: orderData.total,
      createdAt: orderData.createdAt,
      updatedAt: orderData.updatedAt,
      
      customerInfo: {
        nombre: orderData.customerInfo?.nombre || "",
        email: orderData.customerInfo?.email || "",
        telefono: orderData.customerInfo?.telefono || "",
        dni: orderData.customerInfo?.dni || ""
      },
      
      deliveryInfo: {
        direccion: orderData.deliveryInfo?.direccion || "",
        ciudad: orderData.deliveryInfo?.ciudad || "",
        codigoPostal: orderData.deliveryInfo?.codigoPostal || "",
        metodoEntrega: orderData.deliveryInfo?.metodoEntrega || ""
      },
      
      items: (orderData.items || []).map(item => ({
        id: item.id || "",
        name: item.name || "",
        price: item.price || 0,
        quantity: item.quantity || 0,
        category: item.category || "",
        subcategory: item.subcategory || ""
      }))
    };

    console.log(`Orden ${id} encontrada con estado:`, orderData.status);

    return withCors(
      NextResponse.json({
        success: true,
        data: order,
        message: "Orden encontrada exitosamente"
      })
    );

  } catch (err) {
    console.error("Error en GET /api/orders/{id}:", {
      message: err.message,
      stack: err.stack,
      orderId: params?.id
    });

    // Manejar errores específicos
    if (err.code === "permission-denied") {
      return withCors(
        NextResponse.json(
          {
            success: false,
            error: "Error de permisos en la base de datos",
            code: "PERMISSION_DENIED"
          },
          { status: 403 }
        )
      );
    }

    if (err.code === "unavailable") {
      return withCors(
        NextResponse.json(
          {
            success: false,
            error: "Base de datos no disponible",
            code: "DATABASE_UNAVAILABLE"
          },
          { status: 503 }
        )
      );
    }

    // Error genérico
    return withCors(
      NextResponse.json(
        {
          success: false,
          error: "Error interno del servidor",
          code: "INTERNAL_SERVER_ERROR",
          details: err.message
        },
        { status: 500 }
      )
    );
  }
}
