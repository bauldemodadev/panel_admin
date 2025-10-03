"use client";
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Icon } from "@iconify/react";

const ObraResumenFinanciero = ({ 
  obra, 
  presupuesto, 
  modoCosto, 
  formatearNumeroArgentino 
}) => {
  if (!obra) return null;

  // Calcular total según tipo y modo
  const calcularTotal = () => {
    if (obra.tipo === "presupuesto") {
      return obra.total || 0;
    }
    
    if (modoCosto === "presupuesto" && presupuesto) {
      return presupuesto.total || 0;
    }
    
    // Modo gasto real para obra - solo gasto manual
    return Number(obra.gastoObraManual) || 0;
  };

  // Calcular total de abonos del cliente
  const calcularTotalAbonado = () => {
    if (obra.tipo === "presupuesto" || !obra.cobranzas?.historialPagos) {
      return 0;
    }
    
    return obra.cobranzas.historialPagos.reduce((total, pago) => {
      if (pago.tipo === "pago") {
        return total + (Number(pago.monto) || 0);
      }
      return total;
    }, 0);
  };

  // Calcular saldo pendiente
  const calcularSaldoPendiente = () => {
    if (obra.tipo === "presupuesto") return 0;
    return Math.max(0, calcularTotal() - calcularTotalAbonado());
  };

  const total = calcularTotal();
  const totalAbonado = calcularTotalAbonado();
  const saldoPendiente = calcularSaldoPendiente();

  return (
    <Card className="border-0 shadow-sm bg-gradient-to-br from-slate-50 to-white">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg font-semibold text-slate-800">
          <Icon icon="heroicons:currency-dollar" className="w-5 h-5 text-emerald-600" />
          Resumen Financiero
        </CardTitle>
      </CardHeader>
      
      <CardContent className="pt-0">
        <div className="space-y-4">
          {/* TOTAL PRINCIPAL - Destacado */}
          <div className="text-center p-4 bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl border-2 border-emerald-200 shadow-sm">
            <p className="text-sm text-emerald-700 mb-2 font-medium uppercase tracking-wide">
              {obra.tipo === "presupuesto" ? "Total Presupuesto" : "Total Obra"}
            </p>
            <p className="text-2xl font-bold text-emerald-800">
              {formatearNumeroArgentino(total)}
            </p>
          </div>

          {/* SECCIÓN PRESUPUESTO */}
          {obra.tipo === "presupuesto" && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="text-center p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <p className="text-xs text-slate-600 mb-1 font-medium uppercase tracking-wide">Subtotal</p>
                  <p className="text-sm font-semibold text-slate-800">
                    {formatearNumeroArgentino(obra.subtotal || 0)}
                  </p>
                </div>
                
                <div className="text-center p-3 bg-red-50 rounded-lg border border-red-200">
                  <p className="text-xs text-red-700 mb-1 font-medium uppercase tracking-wide">Descuento</p>
                  <p className="text-sm font-semibold text-red-800">
                    {formatearNumeroArgentino(obra.descuentoTotal || 0)}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* SECCIÓN OBRA */}
          {obra.tipo === "obra" && (
            <div className="space-y-3">
              {/* Modo de Cálculo */}
              <div className="text-center p-3 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-xs text-blue-700 mb-2 font-medium uppercase tracking-wide">Modo de Cálculo</p>
                <Badge 
                  variant={modoCosto === "presupuesto" ? "default" : "secondary"}
                  className="text-xs px-3 py-1.5 h-7 font-medium"
                >
                  {modoCosto === "presupuesto" ? "Presupuesto Inicial" : "Gasto Real"}
                </Badge>
              </div>

              {/* Gasto Manual */}
              <div className="text-center p-3 bg-amber-50 rounded-lg border border-amber-200">
                <p className="text-xs text-amber-700 mb-1 font-medium uppercase tracking-wide">Gasto Manual</p>
                <p className="text-sm font-semibold text-amber-800">
                  {formatearNumeroArgentino(obra.gastoObraManual || 0)}
                </p>
              </div>

              {/* Estado de Cobranzas */}
              {obra.cobranzas?.historialPagos && (
                <div className="space-y-3">
                  <div className="text-center p-3 bg-green-50 rounded-lg border border-green-200">
                    <p className="text-xs text-green-700 mb-1 font-medium uppercase tracking-wide">Total Abonado</p>
                    <p className="text-lg font-bold text-green-800">
                      {formatearNumeroArgentino(totalAbonado)}
                    </p>
                  </div>

                  <div className="text-center p-3 bg-orange-50 rounded-lg border border-orange-200">
                    <p className="text-xs text-orange-700 mb-1 font-medium uppercase tracking-wide">Saldo Pendiente</p>
                    <p className="text-lg font-bold text-orange-800">
                      {formatearNumeroArgentino(saldoPendiente)}
                    </p>
                  </div>

                  {/* Indicador de Estado de Pago */}
                  <div className="text-center p-2 bg-slate-50 rounded-lg border border-slate-200">
                    <Badge 
                      variant={saldoPendiente === 0 ? "default" : "secondary"}
                      className="text-xs px-2 py-1 h-6"
                    >
                      {saldoPendiente === 0 ? "✅ Pagado" : "⏳ Pendiente"}
                    </Badge>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* Información del Presupuesto Inicial (solo para obras) */}
        {obra.tipo === "obra" && presupuesto && (
          <div className="mt-4 p-3 bg-gradient-to-r from-indigo-50 to-blue-50 rounded-lg border border-indigo-200">
            <p className="text-xs text-indigo-800 font-medium text-center">
              <span className="font-semibold">Presupuesto Inicial:</span> {presupuesto.numeroPedido} - 
              {formatearNumeroArgentino(presupuesto.total || 0)}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ObraResumenFinanciero;
