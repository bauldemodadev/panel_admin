"use client";
import React from "react";
import PrintDownloadButtons from "@/components/ui/print-download-buttons";

// Ejemplo de uso del componente PrintDownloadButtons
const EjemploUsoBotones = () => {
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

  return (
    <div className="p-6 space-y-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">
          Ejemplo de Botones de Impresión y Descarga
        </h2>
        
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-700 mb-2">
              Botones por defecto:
            </h3>
            <PrintDownloadButtons
              obra={obraEjemplo}
              presupuesto={presupuestoEjemplo}
              modoCosto="venta"
              movimientos={movimientosEjemplo}
            />
          </div>
          
          <div>
            <h3 className="text-lg font-semibold text-gray-700 mb-2">
              Botones con variante sólida:
            </h3>
            <PrintDownloadButtons
              obra={obraEjemplo}
              presupuesto={presupuestoEjemplo}
              modoCosto="venta"
              movimientos={movimientosEjemplo}
              variant="default"
              size="md"
            />
          </div>
          
          <div>
            <h3 className="text-lg font-semibold text-gray-700 mb-2">
              Botones grandes:
            </h3>
            <PrintDownloadButtons
              obra={obraEjemplo}
              presupuesto={presupuestoEjemplo}
              modoCosto="venta"
              movimientos={movimientosEjemplo}
              variant="outline"
              size="lg"
              className="justify-center"
            />
          </div>
        </div>
        
        <div className="mt-8 p-4 bg-gray-50 rounded-lg">
          <h4 className="font-semibold text-gray-700 mb-2">Instrucciones de uso:</h4>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• <strong>Botón Imprimir:</strong> Abre una nueva ventana con el formato y ejecuta la impresión</li>
            <li>• <strong>Botón Descargar PDF:</strong> Genera y descarga un archivo PDF del documento</li>
            <li>• El PDF mantiene exactamente el mismo formato visual que se ve en pantalla</li>
            <li>• El nombre del archivo se genera automáticamente basado en el tipo y número de pedido</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default EjemploUsoBotones;
