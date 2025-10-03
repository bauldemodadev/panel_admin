"use client";
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { descargarPDFDesdeIframe, descargarPDFRobusto, descargarPDF } from "@/lib/obra-utils";

// Componente de prueba para verificar la generación de PDF
const TestPDFGeneration = () => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState("");

  // Datos de ejemplo para una obra
  const obraEjemplo = {
    tipo: "obra",
    numeroPedido: "OB-001",
    cliente: {
      nombre: "Juan Pérez",
      email: "juan@ejemplo.com",
      telefono: "123-456-789",
      direccion: "Av. Principal 123",
      cuit: "20-12345678-9"
    },
    estado: "en_progreso",
    nombreObra: "Construcción de Deck",
    tipoObra: "Exterior",
    prioridad: "Alta",
    responsable: "Carlos López",
    fechas: {
      inicio: "2024-01-15",
      fin: "2024-02-15"
    },
    ubicacion: {
      direccion: "Calle Secundaria 456",
      localidad: "Buenos Aires",
      provincia: "Buenos Aires"
    },
    materialesCatalogo: [
      {
        nombre: "Machimbre de Pino",
        categoria: "Maderas",
        subcategoria: "machimbre",
        precio: 1500,
        descuento: 10,
        alto: 2.5,
        largo: 3.0,
        cantidad: 10,
        unidad: "M2"
      }
    ],
    gastoObraManual: 5000
  };

  const presupuestoEjemplo = {
    subtotal: 15000,
    descuentoTotal: 1500,
    total: 13500,
    productos: [
      {
        nombre: "Machimbre de Pino",
        categoria: "Maderas",
        subCategoria: "machimbre",
        valorVenta: 1500,
        descuento: 10,
        precio: 15000,
        alto: 2.5,
        largo: 3.0,
        cantidad: 10,
        unidadMedida: "M2"
      }
    ]
  };

  const movimientosEjemplo = [
    {
      fecha: "2024-01-20",
      tipo: "pago",
      metodo: "transferencia",
      monto: 5000,
      nota: "Pago inicial"
    }
  ];

  const testPDFGeneration = async (funcion, nombre) => {
    setLoading(true);
    setResult(`Probando ${nombre}...`);
    
    try {
      const startTime = Date.now();
      
      await funcion(obraEjemplo, presupuestoEjemplo, "venta", movimientosEjemplo);
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      setResult(`✅ ${nombre} exitoso en ${duration}ms`);
      
    } catch (error) {
      console.error(`Error en ${nombre}:`, error);
      setResult(`❌ Error en ${nombre}: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">
          Prueba de Generación de PDF
        </h2>
        
        <p className="text-gray-600 mb-6">
          Este componente permite probar las diferentes funciones de generación de PDF para identificar cuál funciona mejor.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Button
            onClick={() => testPDFGeneration(descargarPDF, "descargarPDF (Básica)")}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700"
          >
            Probar PDF Básico
          </Button>
          
          <Button
            onClick={() => testPDFGeneration(descargarPDFRobusto, "descargarPDFRobusto")}
            disabled={loading}
            className="bg-green-600 hover:bg-green-700"
          >
            Probar PDF Robusto
          </Button>
          
          <Button
            onClick={() => testPDFGeneration(descargarPDFDesdeIframe, "descargarPDFDesdeIframe")}
            disabled={loading}
            className="bg-purple-600 hover:bg-purple-700"
          >
            Probar PDF desde Iframe
          </Button>
        </div>
        
        {loading && (
          <div className="flex items-center justify-center p-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2 text-gray-600">Generando PDF...</span>
          </div>
        )}
        
        {result && (
          <Card className="mt-4">
            <CardHeader>
              <CardTitle>Resultado de la Prueba</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm font-mono bg-gray-100 p-3 rounded">
                {result}
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="bg-gray-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-700 mb-4">
          Funciones Disponibles:
        </h3>
        
        <div className="space-y-3 text-sm text-gray-600">
          <div className="flex items-start gap-2">
            <span className="text-blue-600 font-bold">1.</span>
            <span><strong>descargarPDF</strong> - Función básica original (puede generar PDFs en blanco)</span>
          </div>
          
          <div className="flex items-start gap-2">
            <span className="text-green-600 font-bold">2.</span>
            <span><strong>descargarPDFRobusto</strong> - Usa ventana oculta para renderizar contenido</span>
          </div>
          
          <div className="flex items-start gap-2">
            <span className="text-purple-600 font-bold">3.</span>
            <span><strong>descargarPDFDesdeIframe</strong> - Usa el iframe del modal (más confiable)</span>
          </div>
        </div>
        
        <div className="mt-6 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
          <h4 className="font-semibold text-yellow-800 mb-2">Recomendación:</h4>
          <p className="text-sm text-yellow-700">
            La función <strong>descargarPDFDesdeIframe</strong> es la más confiable porque usa el contenido ya renderizado 
            en el modal de vista previa, evitando problemas de contenido en blanco.
          </p>
        </div>
      </div>
    </div>
  );
};

export default TestPDFGeneration;
