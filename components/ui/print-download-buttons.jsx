"use client";
import React from "react";
import { Button } from "@/components/ui/button";
import { Printer, Download } from "lucide-react";
import { generarContenidoImpresion, descargarPDFDesdeIframe } from "@/lib/obra-utils";

const PrintDownloadButtons = ({ 
  obra, 
  presupuesto, 
  modoCosto, 
  movimientos = [],
  className = "",
  variant = "outline",
  size = "sm"
}) => {
  const handleImprimir = () => {
    const contenidoHTML = generarContenidoImpresion(obra, presupuesto, modoCosto, movimientos);
    const nuevaVentana = window.open('', '_blank');
    nuevaVentana.document.write(contenidoHTML);
    nuevaVentana.document.close();
    
    // Esperar a que se cargue el contenido antes de imprimir
    setTimeout(() => {
      nuevaVentana.print();
    }, 500);
  };

  const handleDescargarPDF = async () => {
    try {
      // Mostrar indicador de carga
      const button = event.target.closest('button');
      const originalText = button.innerHTML;
      button.innerHTML = '<div class="animate-spin rounded-full h-4 w-4 border-b-2 border-white mx-auto"></div> Generando PDF...';
      button.disabled = true;
      
      await descargarPDFDesdeIframe(obra, presupuesto, modoCosto, movimientos);
      
      // Restaurar botón
      button.innerHTML = originalText;
      button.disabled = false;
      
    } catch (error) {
      console.error('Error al descargar PDF:', error);
      
      // Restaurar botón
      const button = event.target.closest('button');
      button.innerHTML = '<Download className="h-4 w-4" /> Descargar PDF';
      button.disabled = false;
      
      // Fallback: mostrar mensaje de error
      alert('Error al generar el PDF. Intente nuevamente.');
    }
  };

  return (
    <div className={`flex gap-2 ${className}`}>
      <Button
        variant={variant}
        size={size}
        onClick={handleImprimir}
        className="flex items-center gap-2"
      >
        <Printer className="h-4 w-4" />
        Imprimir
      </Button>
      
      {/* Botón de descarga PDF temporalmente oculto
      <Button
        variant={variant}
        size={size}
        onClick={handleDescargarPDF}
        className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white"
      >
        <Download className="h-4 w-4" />
        Descargar PDF
      </Button>
      */}
    </div>
  );
};

export default PrintDownloadButtons;
