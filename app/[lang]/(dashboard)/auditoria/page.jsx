"use client";
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Icon } from "@iconify/react";
import { useAuth } from "@/provider/auth.provider";
import { useParams, useRouter } from "next/navigation";
import { Loader2, AlertCircle, CheckCircle, Trash2, Eye, Clock } from "lucide-react";

const AuditoriaPage = () => {
  const { user } = useAuth();
  const [auditoria, setAuditoria] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("todos");
  const router = useRouter();
  const params = useParams();
  const { lang } = params;

  useEffect(() => {
    if (user) {
      cargarAuditoria();
    }
  }, [user, filtroTipo]);

  const cargarAuditoria = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(`/api/auditoria?tipo=${filtroTipo}&limit=100`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al cargar auditoría');
      }

      const result = await response.json();
      setAuditoria(result.data);

    } catch (error) {
      console.error('Error al cargar auditoría:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const formatearFecha = (fechaString) => {
    if (!fechaString) return "-";
    try {
      const fecha = new Date(fechaString);
      return fecha.toLocaleDateString("es-AR", {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    } catch {
      return fechaString;
    }
  };

  const obtenerColorTipo = (tipo) => {
    switch (tipo) {
      case 'presupuestos':
        return 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700';
      case 'ventas':
        return 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-900/30 dark:text-gray-300 dark:border-gray-700';
    }
  };

  const obtenerIconoTipo = (tipo) => {
    switch (tipo) {
      case 'presupuestos':
        return 'heroicons:document-text';
      case 'ventas':
        return 'heroicons:shopping-cart';
      default:
        return 'heroicons:document';
    }
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Acceso Denegado</h2>
          <p className="text-gray-600">Debes iniciar sesión para ver esta página.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 py-8 mx-auto font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 px-2">
        <div>
          <h1 className="text-3xl font-bold text-primary flex items-center gap-3">
            <Icon
              icon="heroicons:clipboard-document-list"
              className="w-8 h-8"
            />
            Historial de Auditoría
          </h1>
          <p className="text-base text-default-600 mt-2">
            Registro de todas las eliminaciones de presupuestos y ventas
          </p>
        </div>
        
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => router.push(`/${lang}/ventas`)}
            className="flex items-center gap-2"
          >
            <Icon icon="heroicons:arrow-left" className="w-4 h-4" />
            Volver
          </Button>
          
          <Button
            variant="default"
            onClick={cargarAuditoria}
            disabled={loading}
            className="flex items-center gap-2"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Icon icon="heroicons:arrow-path" className="w-4 h-4" />
            )}
            Actualizar
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <div className="px-2">
        <Card className="rounded-xl shadow-lg border border-default-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Icon icon="heroicons:funnel" className="w-5 h-5" />
              Filtros
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              <Button
                variant={filtroTipo === "todos" ? "default" : "outline"}
                onClick={() => setFiltroTipo("todos")}
                size="sm"
              >
                <Icon icon="heroicons:document" className="w-4 h-4 mr-2" />
                Todos los documentos
              </Button>
              <Button
                variant={filtroTipo === "presupuestos" ? "default" : "outline"}
                onClick={() => setFiltroTipo("presupuestos")}
                size="sm"
              >
                <Icon icon="heroicons:document-text" className="w-4 h-4 mr-2" />
                Solo Presupuestos
              </Button>
              <Button
                variant={filtroTipo === "ventas" ? "default" : "outline"}
                onClick={() => setFiltroTipo("ventas")}
                size="sm"
              >
                <Icon icon="heroicons:shopping-cart" className="w-4 h-4 mr-2" />
                Solo Ventas
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Mensaje de error */}
      {error && (
        <div className="px-2">
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <span className="font-medium">Error: {error}</span>
          </div>
        </div>
      )}

      {/* Lista de auditoría */}
      <div className="px-2">
        <Card className="rounded-xl shadow-lg border border-default-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Icon icon="heroicons:clock" className="w-5 h-5" />
              Registro de Eliminaciones
              <Badge variant="secondary" className="ml-2">
                {auditoria.length} registros
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="flex items-center gap-3">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  <span className="text-lg text-gray-600">Cargando auditoría...</span>
                </div>
              </div>
            ) : auditoria.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
                  <Icon icon="heroicons:clipboard-document-list" className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                  No hay registros de auditoría
                </h3>
                <p className="text-gray-500 dark:text-gray-400">
                  {filtroTipo === "todos" 
                    ? "No se han eliminado documentos aún"
                    : `No se han eliminado ${filtroTipo} aún`
                  }
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {auditoria.map((registro) => (
                  <div
                    key={registro.id}
                    className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${obtenerColorTipo(registro.coleccion)}`}>
                          <Icon 
                            icon={obtenerIconoTipo(registro.coleccion)} 
                            className="w-5 h-5" 
                          />
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900 dark:text-gray-100">
                            {registro.coleccion === 'presupuestos' ? 'Presupuesto' : 'Venta'} Eliminado
                          </h4>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            ID: {registro.documentoId?.slice(-8) || 'N/A'}
                          </p>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <Badge variant="destructive" className="mb-2">
                          <Trash2 className="w-3 h-3 mr-1" />
                          Eliminado
                        </Badge>
                        <div className="text-xs text-gray-500">
                          {formatearFecha(registro.fechaEliminacion)}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <h5 className="font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                          <Icon icon="heroicons:user" className="w-4 h-4" />
                          Usuario Responsable
                        </h5>
                        <div className="bg-gray-50 dark:bg-gray-800 rounded p-2">
                          <p className="font-medium">{registro.usuarioEmail || 'N/A'}</p>
                          <p className="text-xs text-gray-500">ID: {registro.usuarioId || 'N/A'}</p>
                        </div>
                      </div>

                      <div>
                        <h5 className="font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                          <Icon icon="heroicons:information-circle" className="w-4 h-4" />
                          Información del Documento
                        </h5>
                        <div className="bg-gray-50 dark:bg-gray-800 rounded p-2">
                          {registro.datosEliminados?.cliente?.nombre && (
                            <p className="font-medium">
                              Cliente: {registro.datosEliminados.cliente.nombre}
                            </p>
                          )}
                          {registro.datosEliminados?.total && (
                            <p className="text-green-600 font-medium">
                              Total: ${Number(registro.datosEliminados.total).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                            </p>
                          )}
                          {registro.datosEliminados?.vendedor && (
                            <p className="text-xs text-gray-500">
                              Vendedor: {registro.datosEliminados.vendedor}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                                         {registro.coleccion === 'ventas' && (
                       <div className="mt-3 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg">
                         <div className="flex items-start gap-2 text-green-800 dark:text-green-200">
                           <CheckCircle className="w-4 h-4 mt-0.5" />
                           <div className="flex flex-col gap-2 flex-1">
                             <div>
                               <span className="text-sm font-medium">
                                 Stock repuesto automáticamente para todos los productos
                               </span>
                               <span className="text-xs text-green-700 dark:text-green-300 block mt-1">
                                 Movimientos de entrada registrados en la colección "Movimientos"
                               </span>
                             </div>
                             
                             {/* Lista de productos repuestos */}
                             {registro.datosEliminados?.productos && (
                               <div className="bg-green-100 dark:bg-green-800/30 rounded p-2 border border-green-200 dark:border-green-700">
                                 <span className="text-xs font-medium text-green-800 dark:text-green-200 mb-2 block">
                                   Productos repuestos:
                                 </span>
                                 <div className="space-y-1">
                                   {registro.datosEliminados.productos.map((prod, idx) => (
                                     <div key={idx} className="text-xs text-green-700 dark:text-green-300 flex justify-between">
                                       <span className="truncate max-w-[200px]">{prod.nombre || `Producto ${idx + 1}`}</span>
                                       <span className="font-medium">+{prod.cantidad || 0}</span>
                                     </div>
                                   ))}
                                 </div>
                               </div>
                             )}
                           </div>
                         </div>
                       </div>
                     )}

                    <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>IP: {registro.ip || 'N/A'}</span>
                        <span>User Agent: {registro.userAgent?.substring(0, 50) || 'N/A'}...</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AuditoriaPage;
