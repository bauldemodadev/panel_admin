"use client";
import React, { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { addDoc, collection, doc, getDoc, increment, serverTimestamp, updateDoc, writeBatch, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/provider/auth.provider";
import { FormularioVentaPresupuesto } from "@/components/ventas/FormularioVentaPresupuesto";

const getNextVentaNumber = async () => {
  const snap = await getDocs(collection(db, "ventas"));
  let maxNum = 0;
  snap.docs.forEach((docSnap) => {
    const data = docSnap.data();
    if (data.numeroPedido && data.numeroPedido.startsWith("VENTA-")) {
      const num = parseInt(data.numeroPedido.replace("VENTA-", ""), 10);
      if (!isNaN(num) && num > maxNum) maxNum = num;
    }
  });
  return `VENTA-${String(maxNum + 1).padStart(5, "0")}`;
};

export default function CreateVentaPage() {
  const router = useRouter();
  const params = useParams();
  const { lang } = params;
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (formData) => {
    setLoading(true);
    try {
      const numeroPedido = await getNextVentaNumber();
      const venta = {
        ...formData,
        numeroPedido,
        fechaCreacion: new Date().toISOString(),
        vendedor: user?.email || "Usuario no identificado",
        tipo: "venta",
      };
      const cleanVenta = JSON.parse(
        JSON.stringify(venta, (k, v) => (v === undefined ? undefined : v))
      );
      const docRef = await addDoc(collection(db, "ventas"), cleanVenta);

      // Descontar stock y registrar movimientos (batch)
      const batch = writeBatch(db);
      for (const prod of cleanVenta.productos) {
        const productoRef = doc(db, "productos", prod.id);
        const productoSnap = await getDoc(productoRef);
        if (!productoSnap.exists()) continue;
        batch.update(productoRef, { stock: increment(-Math.abs(prod.cantidad)) });
        const movRef = doc(collection(db, "movimientos"));
        batch.set(movRef, {
          productoId: prod.id,
          tipo: "salida",
          cantidad: prod.cantidad,
          usuario: user?.email || "Sistema",
          fecha: serverTimestamp(),
          referencia: "venta",
          referenciaId: docRef.id,
          observaciones: "Salida por venta",
          productoNombre: prod.nombre,
        });
      }
      await batch.commit();

      // Crear envío si corresponde
      if (cleanVenta.tipoEnvio && cleanVenta.tipoEnvio !== "retiro_local") {
        const envio = {
          ventaId: docRef.id,
          clienteId: cleanVenta.clienteId,
          cliente: cleanVenta.cliente,
          fechaCreacion: new Date().toISOString(),
          fechaEntrega: cleanVenta.fechaEntrega,
          estado: "pendiente",
          prioridad: cleanVenta.prioridad || "media",
          vendedor: user?.email || "Usuario no identificado",
          direccionEnvio: cleanVenta.direccionEnvio,
          localidadEnvio: cleanVenta.localidadEnvio,
          tipoEnvio: cleanVenta.tipoEnvio,
          transportista: cleanVenta.transportista,
          costoEnvio: parseFloat(cleanVenta.costoEnvio) || 0,
          numeroFactura: cleanVenta.numeroFactura,
          numeroRemito: cleanVenta.numeroRemito,
          numeroPedido: cleanVenta.numeroPedido,
          totalVenta: cleanVenta.total,
          productos: cleanVenta.productos,
          cantidadTotal: cleanVenta.productos.reduce((acc, p) => acc + p.cantidad, 0),
          historialEstados: [
            {
              estado: "pendiente",
              fecha: new Date().toISOString(),
              comentario: "Envío creado automáticamente desde la venta",
            },
          ],
          observaciones: cleanVenta.observaciones,
          instruccionesEspeciales: "",
          fechaActualizacion: new Date().toISOString(),
          creadoPor: "sistema",
        };
        const cleanEnvio = Object.fromEntries(
          Object.entries(envio).filter(([_, v]) => v !== undefined)
        );
        await addDoc(collection(db, "envios"), cleanEnvio);
      }

      router.push(`/${lang}/ventas/${docRef.id}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="py-6">
      <FormularioVentaPresupuesto tipo="venta" onClose={() => {}} onSubmit={handleSubmit} />
    </div>
  );
}


