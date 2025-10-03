"use client";
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Icon } from "@iconify/react";
import { Plus, Trash2, AlertCircle, CheckCircle } from "lucide-react";

const ObraCobranza = ({ 
  movimientos, 
  onMovimientosChange, 
  editando, 
  formatearNumeroArgentino,
  totalObra = 0, // Total de la obra (presupuesto o gasto real)
  totalAbonado = 0, // Total ya abonado
  onEstadoPagoChange // Callback para actualizar estado de pago
}) => {
  const [nuevoMovimiento, setNuevoMovimiento] = useState({
    fecha: "",
    tipo: "pago",
    metodo: "efectivo",
    monto: "",
    nota: ""
  });

  const [error, setError] = useState("");

  // Calcular totales dinámicamente
  const totalCobrado = movimientos.reduce((acc, m) => {
    if (m.tipo === "pago") {
      return acc + Number(m.monto || 0);
    }
    return acc;
  }, 0);

  const saldoPendiente = Math.max(0, totalObra - totalCobrado);
  const estaPagado = saldoPendiente === 0;

  // Validar que el nuevo pago no exceda el saldo pendiente
  const validarPago = (monto) => {
    const montoNum = Number(monto) || 0;
    if (montoNum <= 0) {
      setError("El monto debe ser mayor a 0");
      return false;
    }
    if (montoNum > saldoPendiente) {
      setError(`El pago excede el saldo pendiente de ${formatearNumeroArgentino(saldoPendiente)}`);
      return false;
    }
    setError("");
    return true;
  };

  // Limpiar error cuando cambie el monto
  useEffect(() => {
    if (nuevoMovimiento.monto) {
      validarPago(nuevoMovimiento.monto);
    } else {
      setError("");
    }
  }, [nuevoMovimiento.monto, saldoPendiente]);

  // Actualizar estado de pago cuando se complete
  useEffect(() => {
    if (onEstadoPagoChange && estaPagado !== undefined) {
      onEstadoPagoChange(estaPagado);
    }
  }, [estaPagado, onEstadoPagoChange]);

  const handleAgregarMovimiento = () => {
    if (!nuevoMovimiento.fecha || !nuevoMovimiento.monto) return;
    
    if (!validarPago(nuevoMovimiento.monto)) return;
    
    const movimiento = {
      ...nuevoMovimiento,
      monto: Number(nuevoMovimiento.monto),
      id: Date.now(),
      timestamp: new Date().toISOString()
    };
    
    onMovimientosChange([...movimientos, movimiento]);
    setNuevoMovimiento({
      fecha: "",
      tipo: "pago",
      metodo: "efectivo",
      monto: "",
      nota: ""
    });
    setError("");
  };

  const handleEliminarMovimiento = (id) => {
    onMovimientosChange(movimientos.filter(m => m.id !== id));
  };

  const handleMontoChange = (e) => {
    const valor = e.target.value;
    setNuevoMovimiento(prev => ({ ...prev, monto: valor }));
  };

  // Formatear fecha para mostrar
  const formatearFecha = (fecha) => {
    if (!fecha) return "";
    try {
      return new Date(fecha).toLocaleDateString("es-AR");
    } catch {
      return fecha;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Icon icon="heroicons:banknotes" className="w-5 h-5" />
          Cobranza y Movimientos
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Resumen de Estado de Pago */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-xs text-blue-700 mb-1 font-medium uppercase tracking-wide">Total Obra</p>
            <p className="text-lg font-bold text-blue-800">
              {formatearNumeroArgentino(totalObra)}
            </p>
          </div>
          
          <div className="p-3 bg-green-50 rounded-lg border border-green-200">
            <p className="text-xs text-green-700 mb-1 font-medium uppercase tracking-wide">Total Abonado</p>
            <p className="text-lg font-bold text-green-800">
              {formatearNumeroArgentino(totalCobrado)}
            </p>
          </div>
          
          <div className="p-3 bg-orange-50 rounded-lg border border-orange-200">
            <p className="text-xs text-orange-700 mb-1 font-medium uppercase tracking-wide">Saldo Pendiente</p>
            <p className="text-lg font-bold text-orange-800">
              {formatearNumeroArgentino(saldoPendiente)}
            </p>
          </div>
        </div>

        {/* Formulario de Nuevo Pago */}
        {editando && saldoPendiente > 0 && (
          <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
            <h4 className="font-medium text-gray-900 mb-3">Agregar Nuevo Pago</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-5 gap-2 items-end">
              <Input
                type="date"
                value={nuevoMovimiento.fecha}
                onChange={(e) => setNuevoMovimiento(prev => ({ ...prev, fecha: e.target.value }))}
                placeholder="Fecha"
                className="h-10"
              />
              
              <Select
                value={nuevoMovimiento.tipo}
                onValueChange={(value) => setNuevoMovimiento(prev => ({ ...prev, tipo: value }))}
              >
                <SelectTrigger className="h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pago">Pago</SelectItem>
                  <SelectItem value="seña">Seña</SelectItem>
                  <SelectItem value="anticipo">Anticipo</SelectItem>
                </SelectContent>
              </Select>
              
              <Select
                value={nuevoMovimiento.metodo}
                onValueChange={(value) => setNuevoMovimiento(prev => ({ ...prev, metodo: value }))}
              >
                <SelectTrigger className="h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="efectivo">Efectivo</SelectItem>
                  <SelectItem value="transferencia">Transferencia</SelectItem>
                  <SelectItem value="cheque">Cheque</SelectItem>
                  <SelectItem value="tarjeta">Tarjeta</SelectItem>
                </SelectContent>
              </Select>
              
              <div className="relative">
                <Input
                  type="number"
                  value={nuevoMovimiento.monto}
                  onChange={handleMontoChange}
                  placeholder="Monto"
                  className={`h-10 pr-8 ${error ? 'border-red-500 focus:border-red-500' : ''}`}
                  max={saldoPendiente}
                  step="100"
                />
                {error && (
                  <div className="absolute -bottom-6 left-0 text-xs text-red-600">
                    {error}
                  </div>
                )}
              </div>
              
              <Button
                onClick={handleAgregarMovimiento}
                disabled={!nuevoMovimiento.fecha || !nuevoMovimiento.monto || !!error}
                className="flex items-center gap-2 h-10"
              >
                <Plus className="w-4 h-4" />
                Agregar
              </Button>
            </div>

            {/* Información de validación */}
            <div className="mt-3 text-xs text-gray-600">
              <p>Saldo pendiente: <strong>{formatearNumeroArgentino(saldoPendiente)}</strong></p>
              <p>El pago no puede exceder este monto</p>
            </div>
          </div>
        )}

        {/* Mensaje de Estado de Pago */}
        {estaPagado ? (
          <div className="p-4 bg-green-50 rounded-lg border border-green-200 text-center">
            <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
            <p className="text-green-800 font-medium">¡Obra Completamente Pagada!</p>
            <p className="text-sm text-green-700">No se pueden agregar más pagos</p>
          </div>
        ) : (
          <div className="p-4 bg-orange-50 rounded-lg border border-orange-200 text-center">
            <AlertCircle className="w-8 h-8 text-orange-600 mx-auto mb-2" />
            <p className="text-orange-800 font-medium">Obra Pendiente de Pago</p>
            <p className="text-sm text-orange-700">
              Saldo pendiente: <strong>{formatearNumeroArgentino(saldoPendiente)}</strong>
            </p>
          </div>
        )}

        {/* Tabla de Movimientos */}
        {movimientos.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="p-3 text-left font-medium text-gray-700">Fecha</th>
                  <th className="p-3 text-center font-medium text-gray-700">Tipo</th>
                  <th className="p-3 text-center font-medium text-gray-700">Método</th>
                  <th className="p-3 text-right font-medium text-gray-700">Monto</th>
                  <th className="p-3 text-left font-medium text-gray-700">Nota</th>
                  {editando && <th className="p-3 text-center font-medium text-gray-700">Acción</th>}
                </tr>
              </thead>
              <tbody>
                {movimientos.map((movimiento) => (
                  <tr key={movimiento.id} className="border-b hover:bg-gray-50">
                    <td className="p-3">{formatearFecha(movimiento.fecha)}</td>
                    <td className="p-3 text-center">
                      <Badge 
                        variant="outline"
                        className={`text-xs px-2 py-1 ${
                          movimiento.tipo === 'seña' ? 'border-yellow-300 text-yellow-700 bg-yellow-50' :
                          movimiento.tipo === 'pago' ? 'border-green-300 text-green-700 bg-green-50' :
                          'border-blue-300 text-blue-700 bg-blue-50'
                        }`}
                      >
                        {movimiento.tipo}
                      </Badge>
                    </td>
                    <td className="p-3 text-center capitalize">{movimiento.metodo}</td>
                    <td className="p-3 text-right font-semibold text-gray-900">
                      {formatearNumeroArgentino(movimiento.monto)}
                    </td>
                    <td className="p-3 text-gray-600">{movimiento.nota || "-"}</td>
                    {editando && (
                      <td className="p-3 text-center">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEliminarMovimiento(movimiento.id)}
                          className="text-red-600 hover:text-red-700 border-red-200 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Mensaje cuando no hay movimientos */}
        {movimientos.length === 0 && (
          <div className="text-center p-8 text-gray-500">
            <Icon icon="heroicons:banknotes" className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>No hay movimientos de cobranza registrados</p>
            <p className="text-sm">Agrega el primer pago cuando el cliente realice un abono</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ObraCobranza;
