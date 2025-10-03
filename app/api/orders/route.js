import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, orderBy, limit, addDoc, doc, getDoc } from "firebase/firestore";

function withCors(resp) {
  const headers = new Headers(resp.headers);
  headers.set("Access-Control-Allow-Origin", "*");
  headers.set("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  return new NextResponse(resp.body, { status: resp.status, headers });
}

export function OPTIONS() {
  return withCors(new NextResponse(null, { status: 204 }));
}

// GET /api/orders?userId={email}
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    console.log("API /api/orders llamada con userId:", userId);

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

    // Buscar ventas directamente en la colección ventas por cliente.email
    // Primero sin orderBy para evitar problemas de índice compuesto
    const ventasQuery = query(
      collection(db, "ventas"),
      where("cliente.email", "==", userId)
    );

    const ventasSnap = await getDocs(ventasQuery);

    // Ordenar manualmente por fecha (más recientes primero)
    const ventasDocs = ventasSnap.docs.sort((a, b) => {
      const fechaA = a.data().fecha || a.data().creadoEn || "";
      const fechaB = b.data().fecha || b.data().creadoEn || "";
      return fechaB.localeCompare(fechaA);
    });

    const ventas = [];
    for (const doc of ventasDocs) {
      const venta = doc.data();

      // Buscar información de envío en la colección envios
      let envio = null;
      try {
        const envioQuery = query(
          collection(db, "envios"),
          where("numeroPedido", "==", venta.numeroPedido),
          limit(1)
        );
        const envioSnap = await getDocs(envioQuery);
        if (!envioSnap.empty) {
          const envioData = envioSnap.docs[0].data();
          envio = {
            id: envioSnap.docs[0].id,
            estado: envioData.estado || "pendiente",
            fechaEntrega: envioData.fechaEntrega || null,
            fechaCreacion: envioData.fechaCreacion || null,
            fechaActualizacion: envioData.fechaActualizacion || null,
            direccionEnvio: envioData.direccionEnvio || venta.cliente?.direccion || "",
            localidadEnvio: envioData.localidadEnvio || "",
            tipoEnvio: envioData.tipoEnvio || "",
            transportista: envioData.transportista || "",
            costoEnvio: envioData.costoEnvio || 0,
            prioridad: envioData.prioridad || "",
            historialEstados: envioData.historialEstados || [],
            creadoPor: envioData.creadoPor || "",
            ventaId: envioData.ventaId || "",
          };
        }
      } catch (envioError) {
        console.log("Error al buscar envío:", envioError.message);
      }

      // Estructura simplificada para ecommerce externo
      ventas.push({
        // Información básica del pedido
        id: doc.id,
        numeroPedido: venta.numeroPedido || doc.id,
        estado: venta.estadoPago || "pendiente",
        total: venta.total || 0,
        fecha: venta.fecha || null,
        fechaEntrega: venta.fechaEntrega || null,
        medioPago: venta.formaPago || "efectivo",

        // Productos simplificados (solo lo esencial)
        productos: await Promise.all((venta.productos || venta.items || []).map(async (producto) => {
          // Buscar imagen del producto desde la colección productos
          let imagen = "";
          try {
            const productoQuery = query(
              collection(db, "productos"),
              where("id", "==", producto.id),
              limit(1)
            );
            const productoSnap = await getDocs(productoQuery);
            if (!productoSnap.empty) {
              const productoData = productoSnap.docs[0].data();
              imagen = productoData.imagenes && productoData.imagenes.length > 0 
                ? productoData.imagenes[0] 
                : "";
            }
          } catch (productoError) {
            console.log("Error al buscar imagen del producto:", productoError.message);
          }

          return {
            id: producto.id || "",
            nombre: producto.nombre || "",
            cantidad: producto.cantidad || 0,
            precio: producto.precio || 0,
            unidad: producto.unidad || "",
            categoria: producto.categoria || "",
            imagen: imagen,
            // Solo dimensiones para maderas
            ...(producto.categoria === "Maderas" && {
              alto: producto.alto || 0,
              ancho: producto.ancho || 0,
              largo: producto.largo || 0,
              cepilladoAplicado: producto.cepilladoAplicado || false,
            }),
          };
        })),

        // Información de envío esencial
        envio: {
          estado: envio?.estado || "pendiente",
          direccion: envio?.direccionEnvio || venta.direccionEnvio || venta.cliente?.direccion || "",
          transportista: envio?.transportista || venta.transportista || "",
          fechaEntrega: envio?.fechaEntrega || venta.fechaEntrega || null,
        },

        // Cliente básico
        cliente: {
          nombre: venta.cliente?.nombre || "",
          telefono: venta.cliente?.telefono || "",
        },
      });
    }

    // Si no hay ventas, devolver array vacío en lugar de error
    if (ventas.length === 0) {
      return withCors(
        NextResponse.json({
          success: true,
          data: [],
          total: 0,
          mensaje: "No se encontraron ventas para este usuario",
          usuario: {
            email: userId,
          },
        })
      );
    }

    return withCors(
      NextResponse.json({
        success: true,
        data: ventas,
        total: ventas.length,
        usuario: {
          email: userId,
        },
      })
    );
  } catch (err) {
    console.error("Error en /api/orders:", {
      message: err.message,
      code: err.code,
      stack: err.stack,
      userId: userId
    });

    // Manejar errores específicos de Firestore
    if (err.code === "permission-denied") {
      return withCors(
        NextResponse.json(
          {
            error: "Error de permisos en la base de datos",
            message: "No se puede acceder a la colección de ventas",
            userId: userId
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
            userId: userId
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
            userId: userId
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
          userId: userId
        },
        { status: 500 }
      )
    );
  }
}

// POST /api/orders - Crear nueva orden en colección orders
export async function POST(request) {
  try {
    console.log("API POST /api/orders llamada");

    // Validar Content-Type
    const contentType = request.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      return withCors(
        NextResponse.json(
          {
            success: false,
            error: "Content-Type debe ser application/json",
            code: "INVALID_CONTENT_TYPE"
          },
          { status: 400 }
        )
      );
    }

    // Parsear el body
    const orderData = await request.json();
    console.log("Datos de orden recibidos:", JSON.stringify(orderData, null, 2));

    // Validar campos requeridos
    const camposRequeridos = ['orderId', 'userId', 'customerInfo', 'deliveryInfo', 'items', 'total', 'status'];
    const camposFaltantes = camposRequeridos.filter(campo => !orderData[campo]);
    
    if (camposFaltantes.length > 0) {
      return withCors(
        NextResponse.json(
          {
            success: false,
            error: `Campos requeridos faltantes: ${camposFaltantes.join(', ')}`,
            code: "MISSING_REQUIRED_FIELDS"
          },
          { status: 400 }
        )
      );
    }

    // Validar estructura de customerInfo
    if (!orderData.customerInfo.nombre || !orderData.customerInfo.email) {
      return withCors(
        NextResponse.json(
          {
            success: false,
            error: "customerInfo debe incluir nombre y email",
            code: "INVALID_CUSTOMER_INFO"
          },
          { status: 400 }
        )
      );
    }

    // Validar items
    if (!Array.isArray(orderData.items) || orderData.items.length === 0) {
      return withCors(
        NextResponse.json(
          {
            success: false,
            error: "La orden debe tener al menos un item",
            code: "NO_ITEMS"
          },
          { status: 400 }
        )
      );
    }

    // Validar cada item
    for (let i = 0; i < orderData.items.length; i++) {
      const item = orderData.items[i];
      const itemRequired = ['id', 'name', 'price', 'quantity'];
      const itemMissing = itemRequired.filter(field => item[field] === undefined || item[field] === null);
      
      if (itemMissing.length > 0) {
        return withCors(
          NextResponse.json(
            {
              success: false,
              error: `Item ${i + 1} faltan campos: ${itemMissing.join(', ')}`,
              code: "INVALID_ITEM"
            },
            { status: 400 }
          )
        );
      }
    }

    // Verificar si la orden ya existe
    const orderRef = doc(db, "orders", orderData.orderId);
    const orderSnap = await getDoc(orderRef);
    
    if (orderSnap.exists()) {
      return withCors(
        NextResponse.json(
          {
            success: false,
            error: "La orden con este ID ya existe",
            code: "ORDER_EXISTS",
            orderId: orderData.orderId
          },
          { status: 409 }
        )
      );
    }

    // Preparar datos para Firestore
    const orderForFirestore = {
      // Información básica
      orderId: orderData.orderId,
      userId: orderData.userId,
      total: orderData.total,
      status: orderData.status,
      createdAt: orderData.createdAt || new Date().toISOString(),
      
      // Información del cliente
      customerInfo: {
        nombre: orderData.customerInfo.nombre,
        email: orderData.customerInfo.email,
        telefono: orderData.customerInfo.telefono || "",
        dni: orderData.customerInfo.dni || ""
      },
      
      // Información de entrega
      deliveryInfo: {
        direccion: orderData.deliveryInfo.direccion,
        ciudad: orderData.deliveryInfo.ciudad || "",
        codigoPostal: orderData.deliveryInfo.codigoPostal || "",
        metodoEntrega: orderData.deliveryInfo.metodoEntrega || ""
      },
      
      // Items de la orden
      items: orderData.items.map(item => ({
        id: item.id,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        category: item.category || "",
        subcategory: item.subcategory || ""
      })),
      
      // Metadatos
      createdBy: "internal_api",
      updatedAt: new Date().toISOString()
    };

    // Guardar en Firestore
    await addDoc(collection(db, "orders"), orderForFirestore);
    
    console.log(`Orden ${orderData.orderId} creada exitosamente`);

    return withCors(
      NextResponse.json({
        success: true,
        message: "Orden creada correctamente",
        orderId: orderData.orderId,
        data: {
          orderId: orderData.orderId,
          userId: orderData.userId,
          status: orderData.status,
          total: orderData.total,
          itemsCount: orderData.items.length
        }
      })
    );

  } catch (err) {
    console.error("Error en POST /api/orders:", {
      message: err.message,
      stack: err.stack
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
