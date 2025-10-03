"use client";
import React, { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { addDoc, collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/provider/auth.provider";
import { FormularioVentaPresupuesto } from "@/components/ventas/FormularioVentaPresupuesto";

const getNextPresupuestoNumber = async () => {
  const snap = await getDocs(collection(db, "presupuestos"));
  let maxNum = 0;
  snap.docs.forEach((doc) => {
    const data = doc.data();
    if (data.numeroPedido && data.numeroPedido.startsWith("PRESU-")) {
      const num = parseInt(data.numeroPedido.replace("PRESU-", ""), 10);
      if (!isNaN(num) && num > maxNum) maxNum = num;
    }
  });
  return `PRESU-${String(maxNum + 1).padStart(5, "0")}`;
};

export default function CreatePresupuestoPage() {
  const router = useRouter();
  const params = useParams();
  const { lang } = params;
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (formData) => {
    setLoading(true);
    try {
      const nextNumeroPedido = await getNextPresupuestoNumber();
      const finalFormData = {
        ...formData,
        numeroPedido: nextNumeroPedido,
        fechaCreacion: new Date().toISOString(),
        vendedor: user?.email || "Usuario no identificado",
        tipo: "presupuesto",
      };
      const clean = JSON.parse(
        JSON.stringify(finalFormData, (k, v) => (v === undefined ? undefined : v))
      );
      const docRef = await addDoc(collection(db, "presupuestos"), clean);
      router.push(`/${lang}/presupuestos/${docRef.id}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="py-6">
      <FormularioVentaPresupuesto tipo="presupuesto" onClose={() => {}} onSubmit={handleSubmit} />
    </div>
  );
}


