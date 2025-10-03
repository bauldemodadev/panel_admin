"use client";
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { DataTable } from "../(invoice)/invoice-list/invoice-list-table/components/data-table";
import { db } from "@/lib/firebase";
import { collection, getDocs, doc, updateDoc } from "firebase/firestore";
import { Clock, CheckCircle, AlertCircle, Filter, Search, RefreshCw } from "lucide-react";

// Estados de envío con colores y descripciones
const estadosEnvio = {
  pendiente: { 
    label: "Pendiente", 
    color: "bg-yellow-100 text-yellow-800 border-yellow-200",
    icon: Clock,
    description: "Envío creado, pendiente de entrega"
  },
  entregado: { 
    label: "Entregado", 
    color: "bg-green-100 text-green-800 border-green-200",
    icon: CheckCircle,
    description: "Envío entregado exitosamente"
  },
  cancelado: { 
    label: "Cancelado", 
    color: "bg-red-100 text-red-800 border-red-200",
    icon: AlertCircle,
    description: "Envío cancelado"
  },
};

// Componente para ver detalles del envío
function DetalleEnvio({ envio, onClose }) {
  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="w-[800px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Detalle de Envío - N° {envio.numeroPedido}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Información básica */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h3 className="font-semibold mb-2">Información del Cliente</h3>
              <div className="space-y-1 text-sm">
                <div><strong>Nombre:</strong> {envio.cliente?.nombre}</div>
                <div><strong>CUIT:</strong> {envio.cliente?.cuit}</div>
                <div><strong>Teléfono:</strong> {envio.cliente?.telefono}</div>
                <div><strong>Email:</strong> {envio.cliente?.email}</div>
              </div>
            </div>
            
            <div>
              <h3 className="font-semibold mb-2">Información de Envío</h3>
              <div className="space-y-1 text-sm">
                <div><strong>Dirección:</strong> {envio.direccionEnvio}</div>
                <div><strong>Localidad:</strong> {envio.localidadEnvio}</div>
                <div><strong>CP:</strong> {envio.codigoPostal}</div>
                <div><strong>Tipo:</strong> {envio.tipoEnvio}</div>
                <div><strong>Transportista:</strong> {envio.transportista}</div>
              </div>
            </div>
          </div>
          
          {/* Estado y seguimiento */}
          <div>
            <h3 className="font-semibold mb-2">Estado y Seguimiento</h3>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className={estadosEnvio[envio.estado]?.color}>
                  {estadosEnvio[envio.estado]?.label}
                </Badge>
                <Badge variant="outline" className={envio.prioridad === 'alta' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}>
                  Prioridad {envio.prioridad}
                </Badge>
              </div>
              
              <div className="text-sm text-gray-600">
                {estadosEnvio[envio.estado]?.description}
              </div>
            </div>
          </div>
          
          {/* Productos */}
          <div>
            <h3 className="font-semibold mb-2">Productos</h3>
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="p-2 text-left">Producto</th>
                    <th className="p-2 text-center">Cantidad</th>
                    <th className="p-2 text-right">Precio</th>
                    <th className="p-2 text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {envio.productos?.map((producto, index) => (
                    <tr key={index} className="border-t">
                      <td className="p-2">{producto.nombre}</td>
                      <td className="p-2 text-center">{producto.cantidad}</td>
                      <td className="p-2 text-right">${producto.precio}</td>
                      <td className="p-2 text-right">${(producto.precio * producto.cantidad).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          
          {/* Historial de estados */}
          <div>
            <h3 className="font-semibold mb-2">Historial de Estados</h3>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {envio.historialEstados?.map((historial, index) => (
                <div key={index} className="flex items-start gap-3 p-2 bg-gray-50 rounded">
                  <Badge variant="outline" className={estadosEnvio[historial.estado]?.color}>
                    {estadosEnvio[historial.estado]?.label}
                  </Badge>
                  <div className="flex-1">
                    <div className="text-sm font-medium">{historial.comentario}</div>
                    <div className="text-xs text-gray-500">
                      {new Date(historial.fecha).toLocaleString('es-AR')}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Modal de edición de envío
function EditarEnvioModal({ envio, onClose, onUpdate, transportistas }) {
  const [nuevoTransportista, setNuevoTransportista] = useState(envio.transportista || "");
  const [nuevoEstado, setNuevoEstado] = useState(envio.estado);
  const [comentario, setComentario] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleGuardar = async () => {
    if (!nuevoTransportista || !nuevoEstado) return;
    setIsSubmitting(true);
    try {
      const envioRef = doc(db, "envios", envio.id);
      let nuevoHistorial = envio.historialEstados || [];
      if (nuevoEstado !== envio.estado) {
        nuevoHistorial = [
          ...nuevoHistorial,
          {
            estado: nuevoEstado,
            fecha: new Date().toISOString(),
            comentario: comentario || `Estado cambiado a ${estadosEnvio[nuevoEstado]?.label || nuevoEstado}`,
            cambiadoPor: "usuario",
          }
        ];
      }
      await updateDoc(envioRef, {
        transportista: nuevoTransportista,
        estado: nuevoEstado,
        historialEstados: nuevoHistorial,
        fechaActualizacion: new Date().toISOString(),
      });
      onUpdate();
      onClose();
    } catch (e) {
      alert("Error al guardar cambios: " + e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="w-[500px]">
        <DialogHeader>
          <DialogTitle>Editar Envío N° {envio.numeroPedido}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Transportista</label>
            <select className="border rounded px-2 py-2 w-full mt-1" value={nuevoTransportista} onChange={e => setNuevoTransportista(e.target.value)}>
              <option value="">Seleccionar transportista</option>
              {transportistas.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium">Estado</label>
            <select className="border rounded px-2 py-2 w-full mt-1" value={nuevoEstado} onChange={e => setNuevoEstado(e.target.value)}>
              {Object.entries(estadosEnvio).map(([key, value]) => (
                <option key={key} value={key}>{value.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium">Comentario (opcional)</label>
            <Textarea value={comentario} onChange={e => setComentario(e.target.value)} placeholder="Comentario sobre el cambio..." />
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleGuardar} disabled={isSubmitting || !nuevoTransportista || !nuevoEstado}>
            {isSubmitting ? "Guardando..." : "Guardar cambios"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

const EnviosPage = () => {
  // Hooks y estados
  const [enviosData, setEnviosData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtroEstado, setFiltroEstado] = useState("");
  const [filtroPrioridad, setFiltroPrioridad] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [envioSeleccionado, setEnvioSeleccionado] = useState(null);
  const [mostrarDetalle, setMostrarDetalle] = useState(false);
  const [mostrarEditar, setMostrarEditar] = useState(false);
  const [envioEdit, setEnvioEdit] = useState(null);
  const transportistas = ["camion", "camioneta 1", "camioneta 2", "otro"];

  // Filtro predeterminado a 'pendiente' al cargar
  useEffect(() => {
    setFiltroEstado("pendiente");
  }, []);

  const handleEditarEnvio = (envio) => {
    setEnvioEdit(envio);
    setMostrarEditar(true);
  };
  
  const handleVerDetalle = (envio) => {
    setEnvioSeleccionado(envio);
    setMostrarDetalle(true);
  };

  // Columnas para la tabla de envíos
  const enviosColumns = [
    {
      accessorKey: "numeroPedido",
      header: "N° Pedido",
      cell: ({ row }) => {
        const numero = row.getValue("numeroPedido");
        return (
          <div className="font-medium text-primary cursor-pointer hover:underline">
            {numero || "Sin número"}
          </div>
        );
      },
    },
    {
      accessorKey: "cliente",
      header: "Cliente",
      cell: ({ row }) => {
        const cliente = row.original.cliente;
        return (
          <div>
            <div className="font-medium">{cliente?.nombre || "Sin nombre"}</div>
            <div className="text-xs text-gray-500">{cliente?.cuit || "Sin CUIT"}</div>
          </div>
        );
      },
    },
    {
      accessorKey: "fechaEntrega",
      header: "Fecha Entrega",
      cell: ({ row }) => {
        const fecha = row.getValue("fechaEntrega");
        const fechaCreacion = row.original.fechaCreacion;
        if (!fecha) return <span className="text-gray-400">Sin fecha</span>;
        
        // Corregir el cálculo de la fecha para evitar el problema de zona horaria
        const fechaEntrega = new Date(fecha + 'T00:00:00');
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0); // Resetear la hora para comparar solo fechas
        
        const diasRestantes = Math.ceil((fechaEntrega - hoy) / (1000 * 60 * 60 * 24));
        let color = "text-gray-600";
        if (diasRestantes < 0) color = "text-red-600 font-semibold";
        else if (diasRestantes <= 2) color = "text-orange-600 font-semibold";
        else if (diasRestantes <= 7) color = "text-yellow-600";
        return (
          <div className={color}>
            {fechaEntrega.toLocaleDateString('es-AR')}
            {diasRestantes < 0 && <div className="text-xs text-red-500">Vencido</div>}
            {diasRestantes >= 0 && diasRestantes <= 7 && (
              <div className="text-xs">{diasRestantes === 0 ? "Hoy" : `${diasRestantes} días`}</div>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "estado",
      header: "Estado",
      cell: ({ row }) => {
        const estado = row.getValue("estado");
        const estadoInfo = estadosEnvio[estado] || { 
          label: estado, 
          color: "bg-gray-100 text-gray-800 border-gray-200" 
        };
        const Icon = estadoInfo.icon || Clock;
        return (
          <div className="flex items-center gap-2">
            <Icon className="w-4 h-4" />
            <Badge variant="outline" className={estadoInfo.color}>
              {estadoInfo.label}
            </Badge>
          </div>
        );
      },
    },
    {
      accessorKey: "prioridad",
      header: "Prioridad",
      cell: ({ row }) => {
        const prioridad = row.getValue("prioridad");
        const prioridades = {
          alta: { label: "Alta", color: "bg-red-100 text-red-800 border-red-200" },
          media: { label: "Media", color: "bg-yellow-100 text-yellow-800 border-yellow-200" },
          baja: { label: "Baja", color: "bg-green-100 text-green-800 border-green-200" },
        };
        const prioridadInfo = prioridades[prioridad] || { 
          label: prioridad, 
          color: "bg-gray-100 text-gray-800 border-gray-200" 
        };
        return (
          <Badge variant="outline" className={prioridadInfo.color}>
            {prioridadInfo.label}
          </Badge>
        );
      },
    },
    {
      accessorKey: "tipoEnvio",
      header: "Tipo Envío",
      cell: ({ row }) => {
        const tipo = row.getValue("tipoEnvio");
        const tipos = {
          retiro_local: "Retiro Local",
          envio_domicilio: "Domicilio",
          envio_obra: "Obra",
          transporte_propio: "Transporte Propio",
        };
        return tipos[tipo] || tipo;
      },
    },
    {
      accessorKey: "transportista",
      header: "Transportista",
      cell: ({ row }) => {
        const transportista = row.getValue("transportista");
        return transportista || <span className="text-gray-400">Sin asignar</span>;
      },
    },
    {
      accessorKey: "totalVenta",
      header: "Total",
      cell: ({ row }) => {
        const total = row.getValue("totalVenta");
        const costoEnvio = row.original.costoEnvio || 0;
        const totalConEnvio = parseFloat(total) + parseFloat(costoEnvio);
        return (
          <div>
            <div className="font-medium">${parseFloat(total).toFixed(2)}</div>
            {costoEnvio > 0 && (
              <div className="text-xs text-gray-500">+ ${costoEnvio.toFixed(2)} envío</div>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "vendedor",
      header: "Vendedor",
      cell: ({ row }) => {
        const vendedor = row.getValue("vendedor");
        return vendedor || <span className="text-gray-400">Sin asignar</span>;
      },
    },
    {
      id: "acciones",
      header: "Acciones",
      cell: ({ row }) => {
        const envio = row.original;
        return (
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleVerDetalle(envio)}
            >
              Ver
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleEditarEnvio(envio)}
            >
              Editar
            </Button>
          </div>
        );
      },
    },
  ];

  const cargarEnvios = async () => {
    try {
      setLoading(true);
      const enviosSnap = await getDocs(collection(db, "envios"));
      const envios = enviosSnap.docs.map(doc => ({ ...doc.data(), id: doc.id }));
      setEnviosData(envios);
    } catch (error) {
      console.error("Error al cargar envíos:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarEnvios();
  }, []);

  // Filtrar envíos
  const enviosFiltrados = enviosData.filter(envio => {
    const cumpleEstado = !filtroEstado || envio.estado === filtroEstado;
    const cumplePrioridad = !filtroPrioridad || envio.prioridad === filtroPrioridad;
    const cumpleBusqueda = !busqueda || 
      envio.numeroPedido?.toLowerCase().includes(busqueda.toLowerCase()) ||
      envio.cliente?.nombre?.toLowerCase().includes(busqueda.toLowerCase()) ||
      envio.vendedor?.toLowerCase().includes(busqueda.toLowerCase()) ||
      envio.transportista?.toLowerCase().includes(busqueda.toLowerCase());
    
    return cumpleEstado && cumplePrioridad && cumpleBusqueda;
  });

  const handleActualizarEnvio = () => {
    cargarEnvios();
  };

  // Estadísticas
  const estadisticas = {
    total: enviosData.length,
    pendientes: enviosData.filter(e => e.estado === 'pendiente').length,
    entregados: enviosData.filter(e => e.estado === 'entregado').length,
    cancelados: enviosData.filter(e => e.estado === 'cancelado').length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando envíos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 py-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gestión de Envíos</h1>
          <p className="text-gray-600 mt-1">Administra y da seguimiento a todos los envíos</p>
        </div>
        <Button variant="outline" onClick={cargarEnvios}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Actualizar
        </Button>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-600">{estadisticas.total}</div>
            <div className="text-sm text-gray-600">Total Envíos</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-yellow-600">{estadisticas.pendientes}</div>
            <div className="text-sm text-gray-600">Pendientes</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">{estadisticas.entregados}</div>
            <div className="text-sm text-gray-600">Entregados</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-red-600">{estadisticas.cancelados}</div>
            <div className="text-sm text-gray-600">Cancelados</div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filtros y Búsqueda
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium">Buscar</label>
              <div className="relative mt-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Pedido, cliente, vendedor..."
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div>
              <label className="text-sm font-medium">Estado</label>
              <Select value={filtroEstado} onValueChange={setFiltroEstado}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Todos los estados" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todos los estados</SelectItem>
                  {Object.entries(estadosEnvio).map(([key, value]) => (
                    <SelectItem key={key} value={key}>
                      {value.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="text-sm font-medium">Prioridad</label>
              <Select value={filtroPrioridad} onValueChange={setFiltroPrioridad}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Todas las prioridades" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todas las prioridades</SelectItem>
                  <SelectItem value="alta">Alta</SelectItem>
                  <SelectItem value="media">Media</SelectItem>
                  <SelectItem value="baja">Baja</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-end">
              <Button 
                variant="outline" 
                onClick={() => {
                  setFiltroEstado("");
                  setFiltroPrioridad("");
                  setBusqueda("");
                }}
                className="w-full"
              >
                Limpiar Filtros
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabla de envíos */}
      <Card>
        <CardHeader>
          <CardTitle>
            Envíos ({enviosFiltrados.length} de {enviosData.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable data={enviosFiltrados} columns={enviosColumns} />
        </CardContent>
      </Card>

      {/* Modales */}

      {mostrarDetalle && envioSeleccionado && (
        <DetalleEnvio
          envio={envioSeleccionado}
          onClose={() => {
            setMostrarDetalle(false);
            setEnvioSeleccionado(null);
          }}
        />
      )}
      {mostrarEditar && envioEdit && (
        <EditarEnvioModal
          envio={envioEdit}
          onClose={() => { setMostrarEditar(false); setEnvioEdit(null); }}
          onUpdate={handleActualizarEnvio}
          transportistas={transportistas}
        />
      )}
    </div>
  );
};

export default EnviosPage;
