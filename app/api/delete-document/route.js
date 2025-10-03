import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, deleteDoc, updateDoc, increment, getDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore';

export async function DELETE(request) {
  try {
    const { documentId, collectionName, userId, userEmail } = await request.json();
    
    if (!documentId || !collectionName || !userId || !userEmail) {
      return NextResponse.json(
        { error: 'Faltan parámetros requeridos' },
        { status: 400 }
      );
    }

    // Verificar que la colección sea válida
    if (!['presupuestos', 'ventas', 'obras'].includes(collectionName)) {
      return NextResponse.json(
        { error: 'Colección no válida' },
        { status: 400 }
      );
    }

    // Obtener el documento antes de borrarlo para auditoría
    const docRef = doc(db, collectionName, documentId);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      return NextResponse.json(
        { error: 'Documento no encontrado' },
        { status: 404 }
      );
    }

    const documentData = docSnap.data();

    // Si es una venta, reponer el stock de los productos y registrar movimientos
    if (collectionName === 'ventas' && documentData.productos) {
      const batch = [];
      const movimientosBatch = [];
      
      for (const producto of documentData.productos) {
        if (producto.id && producto.cantidad) {
          const productoRef = doc(db, 'productos', producto.id);
          
          // Reponer stock solo si el producto existe
          try {
            const productoSnap = await getDoc(productoRef);
            if (productoSnap.exists()) {
              const productoData = productoSnap.data();
              const stockActual = Number(productoData.stock) || 0;
              const cantidadRepuesta = Number(producto.cantidad);
              const nuevoStock = stockActual + cantidadRepuesta;
              
              // Actualizar stock
              batch.push(
                updateDoc(productoRef, {
                  stock: increment(cantidadRepuesta)
                })
              );
              
              // Crear movimiento de entrada para reposición
              const movRef = doc(collection(db, "movimientos"));
              movimientosBatch.push(
                addDoc(collection(db, "movimientos"), {
                  productoId: producto.id,
                  tipo: "entrada",
                  cantidad: cantidadRepuesta,
                  usuario: userEmail,
                  usuarioUid: userId,
                  usuarioEmail: userEmail,
                  fecha: serverTimestamp(),
                  referencia: "reposicion_stock_venta_eliminada",
                  referenciaId: documentId,
                  observaciones: `Reposición automática de stock por eliminación de venta - Producto: ${producto.nombre || productoData.nombre}`,
                  productoNombre: producto.nombre || productoData.nombre,
                  stockAntes: stockActual,
                  stockDelta: cantidadRepuesta,
                  stockDespues: nuevoStock,
                  categoria: productoData.categoria || "Sin categoría",
                  origen: "sistema_eliminacion"
                })
              );
            }
          } catch (error) {
            console.error(`Error al reponer stock del producto ${producto.id}:`, error);
          }
        }
      }
      
      // Ejecutar todas las actualizaciones de stock
      if (batch.length > 0) {
        try {
          await Promise.all(batch);
          console.log(`✅ Stock repuesto para ${batch.length} productos`);
        } catch (error) {
          console.error('Error al reponer stock:', error);
          // Continuar con el borrado aunque falle la reposición de stock
        }
      }
      
      // Registrar movimientos de reposición
      if (movimientosBatch.length > 0) {
        try {
          await Promise.all(movimientosBatch);
          console.log(`✅ Movimientos registrados para ${movimientosBatch.length} productos`);
        } catch (error) {
          console.error('Error al registrar movimientos:', error);
          // Continuar aunque falle el registro de movimientos
        }
      }
    }

    // Si es una obra, verificar si tiene productos asociados y reponer stock si es necesario
    if (collectionName === 'obras' && documentData.productos) {
      const batch = [];
      const movimientosBatch = [];
      
      for (const producto of documentData.productos) {
        if (producto.id && producto.cantidad) {
          const productoRef = doc(db, 'productos', producto.id);
          
          // Reponer stock solo si el producto existe
          try {
            const productoSnap = await getDoc(productoRef);
            if (productoSnap.exists()) {
              const productoData = productoSnap.data();
              const stockActual = Number(productoData.stock) || 0;
              const cantidadRepuesta = Number(producto.cantidad);
              const nuevoStock = stockActual + cantidadRepuesta;
              
              // Actualizar stock
              batch.push(
                updateDoc(productoRef, {
                  stock: increment(cantidadRepuesta)
                })
              );
              
              // Crear movimiento de entrada para reposición
              movimientosBatch.push(
                addDoc(collection(db, "movimientos"), {
                  productoId: producto.id,
                  tipo: "entrada",
                  cantidad: cantidadRepuesta,
                  usuario: userEmail,
                  usuarioUid: userId,
                  usuarioEmail: userEmail,
                  fecha: serverTimestamp(),
                  referencia: "reposicion_stock_obra_eliminada",
                  referenciaId: documentId,
                  observaciones: `Reposición automática de stock por eliminación de obra - Producto: ${producto.nombre || productoData.nombre}`,
                  productoNombre: producto.nombre || productoData.nombre,
                  stockAntes: stockActual,
                  stockDelta: cantidadRepuesta,
                  stockDespues: nuevoStock,
                  categoria: productoData.categoria || "Sin categoría",
                  origen: "sistema_eliminacion"
                })
              );
            }
          } catch (error) {
            console.error(`Error al reponer stock del producto ${producto.id}:`, error);
          }
        }
      }
      
      // Ejecutar todas las actualizaciones de stock
      if (batch.length > 0) {
        try {
          await Promise.all(batch);
          console.log(`✅ Stock repuesto para ${batch.length} productos de obra`);
        } catch (error) {
          console.error('Error al reponer stock de obra:', error);
          // Continuar con el borrado aunque falle la reposición de stock
        }
      }
      
      // Registrar movimientos de reposición
      if (movimientosBatch.length > 0) {
        try {
          await Promise.all(movimientosBatch);
          console.log(`✅ Movimientos registrados para ${movimientosBatch.length} productos de obra`);
        } catch (error) {
          console.error('Error al registrar movimientos de obra:', error);
          // Continuar aunque falle el registro de movimientos
        }
      }
    }

    // Crear registro de auditoría
    const auditoriaData = {
      accion: 'ELIMINACION',
      coleccion: collectionName,
      documentoId: documentId,
      datosEliminados: documentData,
      usuarioId: userId,
      usuarioEmail: userEmail,
      fechaEliminacion: serverTimestamp(),
      ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'desconocida',
      userAgent: request.headers.get('user-agent') || 'desconocido'
    };

    // Guardar auditoría en colección separada
    await addDoc(collection(db, 'auditoria'), auditoriaData);

    // Borrar el documento
    await deleteDoc(docRef);

    return NextResponse.json({
      success: true,
      message: `${collectionName === 'presupuestos' ? 'Presupuesto' : collectionName === 'ventas' ? 'Venta' : 'Obra'} eliminado exitosamente`,
      auditoriaId: auditoriaData.fechaEliminacion
    });

  } catch (error) {
    console.error('Error al eliminar documento:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
