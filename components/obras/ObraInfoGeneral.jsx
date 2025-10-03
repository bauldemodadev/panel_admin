"use client";
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Icon } from "@iconify/react";

const ObraInfoGeneral = ({ 
  obra, 
  formatearFecha, 
  editando = false,
  // Estados editables
  tipoObra,
  prioridad,
  estadoObra,
  responsable,
  responsables,
  fechasEdit,
  ubicacionEdit,
  clienteId,
  cliente,
  clientes,
  usarDireccionCliente,
  // Setters
  setTipoObra,
  setPrioridad,
  setEstadoObra,
  setResponsable,
  setFechasEdit,
  setUbicacionEdit,
  setClienteId,
  setCliente,
  setUsarDireccionCliente
}) => {
  if (!obra) return null;

  const getEstadoColor = (estado) => {
    const estados = {
      pendiente_inicio: "bg-yellow-100 text-yellow-800",
      en_progreso: "bg-blue-100 text-blue-800",
      completada: "bg-green-100 text-green-800",
      cancelada: "bg-red-100 text-red-800",
      Activo: "bg-green-100 text-green-800",
      Inactivo: "bg-gray-100 text-gray-800"
    };
    return estados[estado] || "bg-gray-100 text-gray-800";
  };

  const getPrioridadColor = (prioridad) => {
    const prioridades = {
      baja: "bg-gray-100 text-gray-800",
      media: "bg-yellow-100 text-yellow-800",
      alta: "bg-red-100 text-red-800"
    };
    return prioridades[prioridad] || "bg-gray-100 text-gray-800";
  };

  const handleClienteChange = (clienteId) => {
    setClienteId(clienteId);
    if (clienteId) {
      const clienteSeleccionado = clientes.find(c => c.id === clienteId);
      setCliente(clienteSeleccionado);
      if (usarDireccionCliente && clienteSeleccionado) {
        setUbicacionEdit({
          direccion: clienteSeleccionado.direccion || "",
          localidad: clienteSeleccionado.localidad || "",
          provincia: clienteSeleccionado.provincia || "",
          barrio: clienteSeleccionado.barrio || "",
          area: clienteSeleccionado.area || "",
          lote: clienteSeleccionado.lote || "",
        });
      }
    } else {
      setCliente(null);
    }
  };

  const handleUsarDireccionClienteChange = (checked) => {
    setUsarDireccionCliente(checked);
    if (checked && cliente) {
      setUbicacionEdit({
        direccion: cliente.direccion || "",
        localidad: cliente.localidad || "",
        provincia: cliente.provincia || "",
        barrio: cliente.barrio || "",
        area: cliente.area || "",
        lote: cliente.lote || "",
      });
    }
  };

  // Obtener información del cliente desde la obra o desde el estado local
  const clienteInfo = cliente || obra.cliente;
  const mostrarSeccionCliente = obra.tipo === "obra" || obra.tipo === "presupuesto";
  const mostrarSeccionUbicacion = obra.tipo === "obra" || (obra.tipo === "presupuesto" && obra.cliente?.direccion);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Icon icon="heroicons:information-circle" className="w-5 h-5" />
          Información General
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Información básica de la obra */}
        <div className="space-y-4">
          <h4 className="font-medium text-gray-900">Datos de la {obra.tipo === "obra" ? "Obra" : "Presupuesto"}</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">Número de Pedido</p>
              <p className="font-medium">{obra.numeroPedido}</p>
            </div>
            
            <div>
              <p className="text-sm text-gray-500">Fecha</p>
              <p className="font-medium">{formatearFecha(obra.fecha)}</p>
            </div>
            
            <div>
              <p className="text-sm text-gray-500">Estado</p>
              {editando ? (
                <Select value={estadoObra} onValueChange={setEstadoObra}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pendiente_inicio">Pendiente de Inicio</SelectItem>
                    <SelectItem value="en_progreso">En Progreso</SelectItem>
                    <SelectItem value="completada">Completada</SelectItem>
                    <SelectItem value="cancelada">Cancelada</SelectItem>
                    <SelectItem value="Activo">Activo</SelectItem>
                    <SelectItem value="Inactivo">Inactivo</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <Badge className={getEstadoColor(estadoObra)}>
                  {estadoObra}
                </Badge>
              )}
            </div>
            
            {obra.tipo === "obra" && (
              <>
                <div>
                  <p className="text-sm text-gray-500">Tipo de Obra</p>
                  {editando ? (
                    <Input
                      value={tipoObra}
                      onChange={(e) => setTipoObra(e.target.value)}
                      placeholder="Tipo de obra"
                    />
                  ) : (
                    <p className="font-medium">{tipoObra || "No especificado"}</p>
                  )}
                </div>
                
                <div>
                  <p className="text-sm text-gray-500">Prioridad</p>
                  {editando ? (
                    <Select value={prioridad} onValueChange={setPrioridad}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="baja">Baja</SelectItem>
                        <SelectItem value="media">Media</SelectItem>
                        <SelectItem value="alta">Alta</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <Badge className={getPrioridadColor(prioridad)}>
                      {prioridad || "No especificada"}
                    </Badge>
                  )}
                </div>
                
                <div>
                  <p className="text-sm text-gray-500">Responsable</p>
                  {editando ? (
                    <Select value={responsable} onValueChange={setResponsable}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar responsable" />
                      </SelectTrigger>
                      <SelectContent>
                        {responsables.map((resp) => (
                          <SelectItem key={resp} value={resp}>{resp}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <p className="font-medium">{responsable || "No asignado"}</p>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Información del cliente - Mostrar tanto en obras como en presupuestos */}
        {mostrarSeccionCliente && (
          <>
            <Separator />
            <div className="space-y-4">
              <h4 className="font-medium text-gray-900">Información del Cliente</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <p className="text-sm text-gray-500">Cliente</p>
                  {editando && !cliente ? (
                    <Select value={clienteId} onValueChange={handleClienteChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar cliente" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Sin cliente</SelectItem>
                        {clientes.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.nombre} {c.cuit ? `(${c.cuit})` : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="space-y-1">
                      {clienteInfo ? (
                        <>
                          <p className="font-medium">{clienteInfo.nombre}</p>
                          {clienteInfo.cuit && <p className="text-sm text-gray-600">CUIT: {clienteInfo.cuit}</p>}
                          {clienteInfo.telefono && <p className="text-sm text-gray-600">Tel: {clienteInfo.telefono}</p>}
                          {clienteInfo.email && <p className="text-sm text-gray-600">Email: {clienteInfo.email}</p>}
                        </>
                      ) : (
                        <p className="text-gray-500">No especificado</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}

        {/* Fechas - Solo para obras */}
        {obra.tipo === "obra" && (
          <>
            <Separator />
            <div className="space-y-4">
              <h4 className="font-medium text-gray-900">Fechas</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Fecha de Inicio</p>
                  {editando ? (
                    <Input
                      type="date"
                      value={fechasEdit.inicio}
                      onChange={(e) => setFechasEdit(prev => ({ ...prev, inicio: e.target.value }))}
                    />
                  ) : (
                    <p className="font-medium">
                      {obra.fechas?.inicio ? formatearFecha(obra.fechas.inicio) : "No especificada"}
                    </p>
                  )}
                </div>
                <div>
                  <p className="text-sm text-gray-500">Fecha de Finalización</p>
                  {editando ? (
                    <Input
                      type="date"
                      value={fechasEdit.fin}
                      onChange={(e) => setFechasEdit(prev => ({ ...prev, fin: e.target.value }))}
                    />
                  ) : (
                    <p className="font-medium">
                      {obra.fechas?.fin ? formatearFecha(obra.fechas.fin) : "No especificada"}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
        
        {/* Ubicación - Mostrar tanto en obras como en presupuestos si hay información */}
        {mostrarSeccionUbicacion && (
          <>
            <Separator />
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-gray-900">Ubicación</h4>
                {editando && cliente && (
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="usarDireccionCliente"
                      checked={usarDireccionCliente}
                      onCheckedChange={handleUsarDireccionClienteChange}
                    />
                    <label htmlFor="usarDireccionCliente" className="text-sm text-gray-600">
                      Usar dirección del cliente
                    </label>
                  </div>
                )}
              </div>
              
              {editando && cliente && usarDireccionCliente && (
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-sm text-blue-800 font-medium">Usando dirección del cliente</p>
                  <p className="text-sm text-blue-700">{cliente.direccion || "Sin dirección"}</p>
                  <p className="text-sm text-blue-700">{cliente.localidad || ""} {cliente.provincia || ""}</p>
                  {(cliente.barrio || cliente.area || cliente.lote) && (
                    <div className="text-sm text-blue-700">
                      {cliente.barrio && <p>Barrio: {cliente.barrio}</p>}
                      {cliente.area && <p>Área: {cliente.area}</p>}
                      {cliente.lote && <p>Lote: {cliente.lote}</p>}
                    </div>
                  )}
                </div>
              )}
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <p className="text-sm text-gray-500">Dirección</p>
                  {editando ? (
                    <Input
                      value={ubicacionEdit.direccion || ""}
                      onChange={(e) => setUbicacionEdit(prev => ({ ...prev, direccion: e.target.value }))}
                      placeholder="Dirección de la obra"
                      disabled={usarDireccionCliente && cliente}
                    />
                  ) : (
                    <p className="font-medium">
                      {obra.ubicacion?.direccion || clienteInfo?.direccion || "No especificada"}
                    </p>
                  )}
                </div>
                <div>
                  <p className="text-sm text-gray-500">Localidad</p>
                  {editando ? (
                    <Input
                      value={ubicacionEdit.localidad || ""}
                      onChange={(e) => setUbicacionEdit(prev => ({ ...prev, localidad: e.target.value }))}
                      placeholder="Localidad"
                      disabled={usarDireccionCliente && cliente}
                    />
                  ) : (
                    <p className="font-medium">
                      {obra.ubicacion?.localidad || clienteInfo?.localidad || "No especificada"}
                    </p>
                  )}
                </div>
                <div>
                  <p className="text-sm text-gray-500">Provincia</p>
                  {editando ? (
                    <Input
                      value={ubicacionEdit.provincia || ""}
                      onChange={(e) => setUbicacionEdit(prev => ({ ...prev, provincia: e.target.value }))}
                      placeholder="Provincia"
                      disabled={usarDireccionCliente && cliente}
                    />
                  ) : (
                    <p className="font-medium">
                      {obra.ubicacion?.provincia || clienteInfo?.provincia || "No especificada"}
                    </p>
                  )}
                </div>
                <div>
                  <p className="text-sm text-gray-500">Barrio</p>
                  {editando ? (
                    <Input
                      value={ubicacionEdit.barrio || ""}
                      onChange={(e) => setUbicacionEdit(prev => ({ ...prev, barrio: e.target.value }))}
                      placeholder="Barrio"
                      disabled={usarDireccionCliente && cliente}
                    />
                  ) : (
                    <p className="font-medium">
                      {obra.ubicacion?.barrio || clienteInfo?.barrio || "No especificado"}
                    </p>
                  )}
                </div>
                <div>
                  <p className="text-sm text-gray-500">Área</p>
                  {editando ? (
                    <Input
                      value={ubicacionEdit.area || ""}
                      onChange={(e) => setUbicacionEdit(prev => ({ ...prev, area: e.target.value }))}
                      placeholder="Área"
                      disabled={usarDireccionCliente && cliente}
                    />
                  ) : (
                    <p className="font-medium">
                      {obra.ubicacion?.area || clienteInfo?.area || "No especificada"}
                    </p>
                  )}
                </div>
                <div>
                  <p className="text-sm text-gray-500">Lote</p>
                  {editando ? (
                    <Input
                      value={ubicacionEdit.lote || ""}
                      onChange={(e) => setUbicacionEdit(prev => ({ ...prev, lote: e.target.value }))}
                      placeholder="Lote"
                      disabled={usarDireccionCliente && cliente}
                    />
                  ) : (
                    <p className="font-medium">
                      {obra.ubicacion?.lote || clienteInfo?.lote || "No especificado"}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default ObraInfoGeneral;
