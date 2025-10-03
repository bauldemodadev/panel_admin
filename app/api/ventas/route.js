import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { collection, addDoc, query, where, getDocs, limit } from "firebase/firestore";

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

// POST /api/ventas - Recibir ventas del ecommerce externo
export async function POST(request) {
  try {
    console.log("API /api/ventas llamada");

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
    const body = await request.json();
    console.log("Datos recibidos:", JSON.stringify(body, null, 2));

    // Validar estructura básica
    if (!body.success || !body.data || !Array.isArray(body.data)) {
      return withCors(
        NextResponse.json(
          {
            success: false,
            error: "Estructura de datos inválida. Se espera {success: true, data: []}",
            code: "INVALID_DATA_STRUCTURE"
          },
          { status: 400 }
        )
      );
    }

    const ventas = body.data;
    
    if (ventas.length === 0) {
      return withCors(
        NextResponse.json(
          {
            success: false,
            error: "No se recibieron ventas para procesar",
            code: "NO_VENTAS"
          },
          { status: 400 }
        )
      );
    }

    // Validar usuario
    if (!body.usuario || !body.usuario.email) {
      return withCors(
        NextResponse.json(
          {
            success: false,
            error: "Email de usuario requerido",
            code: "MISSING_USER_EMAIL"
          },
          { status: 400 }
        )
      );
    }

    const emailUsuario = body.usuario.email;
    console.log("Procesando ventas para usuario:", emailUsuario);

    const ventasGuardadas = [];
    const errores = [];

    // Procesar cada venta
    for (const ventaData of ventas) {
      try {
        // Validar campos requeridos de la venta
        const camposRequeridos = ['numeroPedido', 'estado', 'total', 'fecha'];
        const camposFaltantes = camposRequeridos.filter(campo => !ventaData[campo]);
        
        if (camposFaltantes.length > 0) {
          errores.push({
            numeroPedido: ventaData.numeroPedido || 'N/A',
            error: `Campos faltantes: ${camposFaltantes.join(', ')}`,
            code: "MISSING_REQUIRED_FIELDS"
          });
          continue;
        }

        // Validar productos
        if (!ventaData.productos || !Array.isArray(ventaData.productos) || ventaData.productos.length === 0) {
          errores.push({
            numeroPedido: ventaData.numeroPedido,
            error: "La venta debe tener al menos un producto",
            code: "NO_PRODUCTS"
          });
          continue;
        }

        // Validar cliente
        if (!ventaData.cliente || !ventaData.cliente.nombre) {
          errores.push({
            numeroPedido: ventaData.numeroPedido,
            error: "Información de cliente requerida",
            code: "MISSING_CLIENT_INFO"
          });
          continue;
        }

        // Verificar si la venta ya existe
        const ventaExistenteQuery = query(
          collection(db, "ventas"),
          where("numeroPedido", "==", ventaData.numeroPedido),
          limit(1)
        );
        
        const ventaExistenteSnap = await getDocs(ventaExistenteQuery);
        
        if (!ventaExistenteSnap.empty) {
          console.log(`Venta ${ventaData.numeroPedido} ya existe, omitiendo...`);
          ventasGuardadas.push({
            id: ventaExistenteSnap.docs[0].id,
            numeroPedido: ventaData.numeroPedido,
            status: "already_exists"
          });
          continue;
        }

        // Preparar datos para Firestore
        const ventaParaFirestore = {
          // Información básica
          numeroPedido: ventaData.numeroPedido,
          estadoPago: ventaData.estado || "pendiente",
          total: ventaData.total,
          fecha: ventaData.fecha,
          fechaEntrega: ventaData.fechaEntrega || null,
          formaPago: ventaData.medioPago || "efectivo",
          
          // Cliente
          cliente: {
            email: emailUsuario,
            nombre: ventaData.cliente.nombre,
            telefono: ventaData.cliente.telefono || "",
            direccion: ventaData.envio?.direccion || ""
          },
          
          // Productos (mantener estructura original)
          productos: ventaData.productos.map(producto => ({
            id: producto.id || "",
            nombre: producto.nombre || "",
            cantidad: producto.cantidad || 0,
            precio: producto.precio || 0,
            unidad: producto.unidad || "",
            categoria: producto.categoria || "",
            imagen: producto.imagen || "",
            // Dimensiones para maderas
            alto: producto.alto || 0,
            ancho: producto.ancho || 0,
            largo: producto.largo || 0,
            cepilladoAplicado: producto.cepilladoAplicado || false
          })),
          
          // Información de envío
          estadoEnvio: ventaData.envio?.estado || "pendiente",
          direccionEnvio: ventaData.envio?.direccion || "",
          transportista: ventaData.envio?.transportista || "",
          fechaEntregaEnvio: ventaData.envio?.fechaEntrega || null,
          
          // Metadatos
          origen: "ecommerce_externo",
          creadoEn: new Date().toISOString(),
          actualizadoEn: new Date().toISOString(),
          
          // ID original del ecommerce externo (si existe)
          idExterno: ventaData.id || null
        };

        // Guardar en Firestore
        const docRef = await addDoc(collection(db, "ventas"), ventaParaFirestore);
        
        console.log(`Venta ${ventaData.numeroPedido} guardada con ID:`, docRef.id);
        
        ventasGuardadas.push({
          id: docRef.id,
          numeroPedido: ventaData.numeroPedido,
          status: "created"
        });

      } catch (ventaError) {
        console.error(`Error procesando venta ${ventaData.numeroPedido}:`, ventaError);
        errores.push({
          numeroPedido: ventaData.numeroPedido || 'N/A',
          error: ventaError.message,
          code: "VENTA_PROCESSING_ERROR"
        });
      }
    }

    // Preparar respuesta
    const respuesta = {
      success: true,
      message: `Procesadas ${ventasGuardadas.length} ventas correctamente`,
      ventas: ventasGuardadas,
      total: ventasGuardadas.length,
      usuario: {
        email: emailUsuario
      }
    };

    // Agregar errores si los hay
    if (errores.length > 0) {
      respuesta.errores = errores;
      respuesta.message += `, ${errores.length} errores encontrados`;
    }

    console.log("Respuesta final:", respuesta);

    return withCors(NextResponse.json(respuesta));

  } catch (err) {
    console.error("Error en /api/ventas:", {
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
