import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, updateDoc, limit } from "firebase/firestore";

function withCors(resp) {
  const headers = new Headers(resp.headers);
  headers.set("Access-Control-Allow-Origin", "*");
  headers.set("Access-Control-Allow-Methods", "POST,OPTIONS");
  headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  return new NextResponse(resp.body, { status: resp.status, headers });
}

export function OPTIONS() {
  return withCors(new NextResponse(null, { status: 204 }));
}

// POST /api/orders/{id}/mark-success - Marcar orden como exitosa
export async function POST(request, { params }) {
  try {
    const { id } = params;
    
    console.log("API POST /api/orders/{id}/mark-success llamada con ID:", id);

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

    // Validar Content-Type (opcional para este endpoint)
    const contentType = request.headers.get("content-type");
    let additionalData = {};
    
    if (contentType && contentType.includes("application/json")) {
      try {
        additionalData = await request.json();
        console.log("Datos adicionales recibidos:", additionalData);
      } catch (parseError) {
        console.log("No se pudieron parsear datos adicionales, continuando sin ellos");
      }
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

    // Verificar estado actual
    if (orderData.status === "success") {
      return withCors(
        NextResponse.json(
          {
            success: true,
            message: "La orden ya estaba marcada como exitosa",
            orderId: id,
            status: "success",
            previousStatus: orderData.status,
            updatedAt: orderData.updatedAt
          }
        )
      );
    }

    // Preparar datos de actualización
    const updateData = {
      status: "success",
      updatedAt: new Date().toISOString(),
      markedSuccessAt: new Date().toISOString(),
      previousStatus: orderData.status,
      // Agregar datos adicionales si se proporcionaron
      ...additionalData
    };

    // Actualizar la orden en Firestore
    await updateDoc(orderDoc.ref, updateData);

    console.log(`Orden ${id} marcada como exitosa. Estado anterior: ${orderData.status}`);

    // Obtener datos actualizados para la respuesta
    const updatedOrderData = {
      ...orderData,
      ...updateData
    };

    return withCors(
      NextResponse.json({
        success: true,
        message: "Orden marcada como exitosa correctamente",
        orderId: id,
        status: "success",
        previousStatus: orderData.status,
        updatedAt: updateData.updatedAt,
        markedSuccessAt: updateData.markedSuccessAt,
        data: {
          orderId: id,
          userId: updatedOrderData.userId,
          status: "success",
          total: updatedOrderData.total,
          customerInfo: updatedOrderData.customerInfo,
          deliveryInfo: updatedOrderData.deliveryInfo,
          items: updatedOrderData.items,
          itemsCount: (updatedOrderData.items || []).length
        }
      })
    );

  } catch (err) {
    console.error("Error en POST /api/orders/{id}/mark-success:", {
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

    if (err.code === "not-found") {
      return withCors(
        NextResponse.json(
          {
            success: false,
            error: "Documento de orden no encontrado para actualizar",
            code: "ORDER_NOT_FOUND_FOR_UPDATE",
            orderId: params?.id
          },
          { status: 404 }
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
