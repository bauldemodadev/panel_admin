"use client";
import React, { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";
import PrintDownloadButtons from "@/components/ui/print-download-buttons";

// Ejemplo del modal de vista previa actualizado
const ModalVistaPreviaActualizado = () => {
  const [openPrint, setOpenPrint] = useState(false);

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
          Modal de Vista Previa Actualizado
        </h2>
        
        <p className="text-gray-600 mb-6">
          Este es un ejemplo de cómo se ve el modal de vista previa después de agregar los botones de impresión y descarga PDF.
        </p>
        
        <Button onClick={() => setOpenPrint(true)} className="bg-blue-600 hover:bg-blue-700">
          Abrir Modal de Vista Previa
        </Button>
      </div>

      {/* Modal de Vista Previa */}
      <Dialog open={openPrint} onOpenChange={setOpenPrint}>
        <DialogContent className="max-w-6xl max-h-[90vh] w-full">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Printer className="w-5 h-5" />
              Vista Previa de Impresión - Obra
            </DialogTitle>
            <DialogDescription>
              Revise el documento antes de imprimir. Use los botones de acción para imprimir, descargar PDF o cerrar.
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 min-h-0">
            {/* Simulación del iframe con contenido */}
            <div className="w-full h-[70vh] border border-gray-200 rounded-lg bg-gray-50 flex items-center justify-center">
              <div className="text-center text-gray-500">
                <div className="text-4xl mb-4">📄</div>
                <p className="text-lg font-medium">Vista Previa del Documento</p>
                <p className="text-sm">Aquí se mostraría el contenido HTML generado</p>
                <p className="text-xs mt-2">(Simulación del iframe)</p>
              </div>
            </div>
          </div>
          
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setOpenPrint(false)}>
              Cerrar
            </Button>
            
            {/* Botones de impresión y descarga PDF */}
            <PrintDownloadButtons
              obra={obraEjemplo}
              presupuesto={presupuestoEjemplo}
              modoCosto="venta"
              movimientos={movimientosEjemplo}
              variant="default"
              size="sm"
            />
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="bg-gray-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-700 mb-4">
          Cambios Implementados:
        </h3>
        
        <div className="space-y-3 text-sm text-gray-600">
          <div className="flex items-start gap-2">
            <span className="text-green-600 font-bold">✓</span>
            <span>Se reemplazó el botón único de "Imprimir" por el componente <code className="bg-gray-200 px-2 py-1 rounded">PrintDownloadButtons</code></span>
          </div>
          
          <div className="flex items-start gap-2">
            <span className="text-green-600 font-bold">✓</span>
            <span>Ahora hay <strong>dos botones</strong>: "Imprimir" (gris) y "Descargar PDF" (verde)</span>
          </div>
          
          <div className="flex items-start gap-2">
            <span className="text-green-600 font-bold">✓</span>
            <span>El botón "Descargar PDF" genera un archivo PDF que mantiene exactamente el mismo formato visual</span>
          </div>
          
          <div className="flex items-start gap-2">
            <span className="text-green-600 font-bold">✓</span>
            <span>Se actualizó la descripción del modal para indicar que ahora se pueden hacer ambas acciones</span>
          </div>
          
          <div className="flex items-start gap-2">
            <span className="text-green-600 font-bold">✓</span>
            <span>Los botones se integran perfectamente con el diseño existente del modal</span>
          </div>
        </div>
        
        <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <h4 className="font-semibold text-blue-800 mb-2">Archivos Modificados:</h4>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• <code>app/[lang]/(dashboard)/obras/[id]/page.jsx</code> - Modal de obras</li>
            <li>• <code>app/[lang]/(dashboard)/obras/presupuesto/[id]/page.jsx</code> - Modal de presupuestos</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default ModalVistaPreviaActualizado;
