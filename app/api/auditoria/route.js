import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, orderBy, limit, where } from 'firebase/firestore';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const tipo = searchParams.get('tipo'); // 'presupuestos', 'ventas', o 'todos'
    const limitCount = parseInt(searchParams.get('limit') || '50');
    
    let q = query(collection(db, 'auditoria'), orderBy('fechaEliminacion', 'desc'));
    
    // Filtrar por tipo si se especifica
    if (tipo && tipo !== 'todos') {
      q = query(q, where('coleccion', '==', tipo));
    }
    
    // Limitar resultados
    q = query(q, limit(limitCount));
    
    const snapshot = await getDocs(q);
    const auditoria = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      fechaEliminacion: doc.data().fechaEliminacion?.toDate?.()?.toISOString() || doc.data().fechaEliminacion
    }));
    
    return NextResponse.json({
      success: true,
      data: auditoria,
      total: auditoria.length
    });
    
  } catch (error) {
    console.error('Error al obtener auditoría:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
