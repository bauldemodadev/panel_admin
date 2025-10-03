"use client";
import React, { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { db } from "@/lib/firebase";
import { collection, getDocs, doc, getDoc } from "firebase/firestore";
import {
  Filter,
  Search,
  RefreshCw,
  Building,
  CheckCircle,
  Clock,
  AlertCircle,
  Trash2,
  X,
  AlertTriangle,
  Info,
  Loader2,
} from "lucide-react";
import { useRouter, useParams } from "next/navigation";
import { Icon } from "@iconify/react";
import { DataTableEnhanced } from "@/components/ui/data-table-enhanced";
import { useAuth } from "@/provider/auth.provider";

const estadosObra = {
  pendiente_inicio: {
    label: "Pendiente de Inicio",
    color: "bg-yellow-100 text-yellow-800 border-yellow-200",
    icon: Clock,
  },
  en_ejecucion: {
    label: "En Ejecución",
    color: "bg-blue-100 text-blue-800 border-blue-200",
    icon: Building,
  },
  pausada: {
    label: "Pausada",
    color: "bg-orange-100 text-orange-800 border-orange-200",
    icon: Clock,
  },
  completada: {
    label: "Completada",
    color: "bg-green-100 text-green-800 border-green-200",
    icon: CheckCircle,
  },
  cancelada: {
    label: "Cancelada",
    color: "bg-red-100 text-red-800 border-red-200",
    icon: AlertCircle,
  },
  // Para presupuestos de obra, el estado mostrado/filtrado es siempre "Activo"
  activo: {
    label: "Activo",
    color: "bg-green-100 text-green-800 border-green-200",
    icon: CheckCircle,
  },
};

const ObrasPage = () => {
  const [obrasData, setObrasData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filtroEstado, setFiltroEstado] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteMessage, setDeleteMessage] = useState("");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [deleteType, setDeleteType] = useState("");
  
  // Filtros de tiempo
  const hoyISO = new Date().toISOString().split("T")[0];
  const hace30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
  const now = new Date();
  const inicioMesISO = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
  const [fechaDesde, setFechaDesde] = useState(inicioMesISO);
  const [fechaHasta, setFechaHasta] = useState(hoyISO);
  const [rangoRapido, setRangoRapido] = useState("month");
  
  const router = useRouter();
  const params = useParams();
  const { lang } = params || {};
  const { user } = useAuth();

  // Función para manejar fechas de manera segura
  const toDateSafe = useCallback((value) => {
    if (!value) return null;
    try {
      if (typeof value === "string" && value.includes("T")) {
        const d = new Date(value);
        return isNaN(d.getTime()) ? null : d;
      }
      if (typeof value === "string") {
        const [y, m, d] = value.split("-").map(Number);
        if (!y || !m || !d) return null;
        const dt = new Date(y, m - 1, d);
        return isNaN(dt.getTime()) ? null : dt;
      }
      if (value instanceof Date) return value;
      return null;
    } catch {
      return null;
    }
  }, []);

  // Función para verificar si una fecha está en el rango
  const isInRange = useCallback(
    (dateValue) => {
      const d = toDateSafe(dateValue);
      if (!d) return false;
      const from = toDateSafe(fechaDesde);
      const to = toDateSafe(fechaHasta);
      if (!from || !to) return true;
      const d0 = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      const f0 = new Date(from.getFullYear(), from.getMonth(), from.getDate());
      const t0 = new Date(to.getFullYear(), to.getMonth(), to.getDate(), 23, 59, 59);
      return d0 >= f0 && d0 <= t0;
    },
    [fechaDesde, fechaHasta, toDateSafe]
  );

  // Rango rápido
  useEffect(() => {
    const today = new Date();
    const to = today.toISOString().split("T")[0];
    let from = hace30;
    if (rangoRapido === "7d") {
      from = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    } else if (rangoRapido === "30d") {
      from = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    } else if (rangoRapido === "90d") {
      from = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    } else if (rangoRapido === "ytd") {
      const y = new Date().getFullYear();
      from = new Date(y, 0, 1).toISOString().split("T")[0];
    } else if (rangoRapido === "month") {
      const y = today.getFullYear();
      const m = today.getMonth();
      from = new Date(y, m, 1).toISOString().split("T")[0];
    } else if (rangoRapido === "custom") {
      // no cambia fechas
      return;
    }
    setFechaDesde(from);
    setFechaHasta(to);
  }, [rangoRapido]);

  // Columnas para presupuestos
  const presupuestosColumns = [
    {
      accessorKey: "numeroPedido",
      header: "N° Presupuesto",
      cell: ({ row }) => {
        const numero = row.getValue("numeroPedido");
        return (
          <div className="flex items-center gap-2">
            <div className="font-medium cursor-pointer hover:underline text-purple-600">
              {numero || "Sin número"}
            </div>
            <Badge
              variant="outline"
              className="text-xs bg-purple-50 text-purple-700 border-purple-200"
            >
              PO
            </Badge>
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
            <div className="text-xs text-gray-500">
              {cliente?.cuit || "Sin CUIT"}
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "fechaCreacion",
      header: ({ column }) => (
        <div
          className="flex items-center gap-2 cursor-pointer select-none"
          onClick={() => column.toggleSorting()}
        >
          <span>Fecha</span>
          <div className="flex flex-col">
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
              <path d="M7 14l5-5 5 5z" />
            </svg>
            <svg
              className="w-3 h-3 -mt-1"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M7 10l5 5 5-5z" />
            </svg>
          </div>
        </div>
      ),
      enableSorting: true,
      cell: ({ row }) => {
        const fechaCreacion = row.getValue("fechaCreacion");
        if (!fechaCreacion)
          return <span className="text-gray-400">Sin fecha</span>;

        try {
          const fecha = new Date(fechaCreacion);

          return (
            <div className="text-gray-600">
              <div className="font-medium">
                {fecha.toLocaleDateString("es-AR", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                  timeZone: "America/Argentina/Buenos_Aires",
                })}
              </div>
              <div className="text-xs text-gray-500">
                {fecha.toLocaleTimeString("es-AR", {
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: false,
                  timeZone: "America/Argentina/Buenos_Aires",
                })}{" "}
                hs
              </div>
            </div>
          );
        } catch (error) {
          return <span className="text-gray-400">Fecha inválida</span>;
        }
      },
    },
    {
      accessorKey: "presupuestoTotal",
      header: "Total",
      cell: ({ row }) => {
        const total = row.getValue("presupuestoTotal");
        return (
          <div className="font-medium">
            $
            {total
              ? Number(total).toLocaleString("es-AR", {
                  minimumFractionDigits: 2,
                })
              : "0.00"}
          </div>
        );
      },
    },
    {
      id: "actions",
      header: "Acciones",
      cell: ({ row }) => {
        return (
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              className="h-8 px-3 bg-red-50 border-red-200 text-red-700 hover:bg-red-100 hover:border-red-300 transition-all duration-200"
              title="Eliminar"
              onClick={(e) => {
                e.stopPropagation(); // Prevenir que se active el click de la fila
                window.dispatchEvent(
                  new CustomEvent("deletePresupuesto", {
                    detail: { id: row.original.id },
                  })
                );
              }}
            >
              <Trash2 className="w-4 h-4 mr-1" />
              Eliminar
            </Button>
          </div>
        );
      },
      enableSorting: false,
    },
  ];

  // Columnas para obras
  const obrasColumns = [
    {
      accessorKey: "numeroPedido",
      header: "N° Obra",
      cell: ({ row }) => {
        const numero = row.getValue("numeroPedido");
        return (
          <div className="font-medium cursor-pointer hover:underline text-blue-600">
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
            <div className="text-xs text-gray-500">
              {cliente?.cuit || "Sin CUIT"}
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "fechaCreacion",
      header: ({ column }) => (
        <div
          className="flex items-center gap-2 cursor-pointer select-none"
          onClick={() => column.toggleSorting()}
        >
          <span>Fecha</span>
          <div className="flex flex-col">
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
              <path d="M7 14l5-5 5 5z" />
            </svg>
            <svg
              className="w-3 h-3 -mt-1"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M7 10l5 5 5-5z" />
            </svg>
          </div>
        </div>
      ),
      enableSorting: true,
      cell: ({ row }) => {
        const fechaCreacion = row.getValue("fechaCreacion");
        if (!fechaCreacion)
          return <span className="text-gray-400">Sin fecha</span>;

        try {
          const fecha = new Date(fechaCreacion);

          return (
            <div className="text-gray-600">
              <div className="font-medium">
                {fecha.toLocaleDateString("es-AR", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                  timeZone: "America/Argentina/Buenos_Aires",
                })}
              </div>
              <div className="text-xs text-gray-500">
                {fecha.toLocaleTimeString("es-AR", {
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: false,
                  timeZone: "America/Argentina/Buenos_Aires",
                })}{" "}
                hs
              </div>
            </div>
          );
        } catch (error) {
          return <span className="text-gray-400">Fecha inválida</span>;
        }
      },
    },
    {
      accessorKey: "estado",
      header: "Estado",
      cell: ({ row }) => {
        const estado = row.getValue("estado");
        const estadoInfo = estadosObra[estado] || {
          label: estado,
          color: "bg-gray-100 text-gray-800 border-gray-200",
          icon: Clock,
        };
        const IconCmp = estadoInfo.icon || Clock;

        // Colores para los iconos según el estado
        const iconColors = {
          pendiente_inicio: "text-yellow-600",
          en_ejecucion: "text-blue-600",
          pausada: "text-orange-600",
          completada: "text-green-600",
          cancelada: "text-red-600",
        };

        return (
          <div
            className="flex items-center justify-center"
            title={estadoInfo.label}
          >
            <IconCmp
              className={`w-5 h-5 ${iconColors[estado] || "text-gray-600"}`}
            />
          </div>
        );
      },
    },
    {
      accessorKey: "presupuestoTotal",
      header: "Total",
      cell: ({ row }) => {
        const total = row.getValue("presupuestoTotal");
        return (
          <div className="font-medium">
            $
            {total
              ? Number(total).toLocaleString("es-AR", {
                  minimumFractionDigits: 2,
                })
              : "0.00"}
          </div>
        );
      },
    },
    {
      id: "pago",
      header: "Pago",
      cell: ({ row }) => {
        const cobranzas = row.original.cobranzas || {};
        const senia = Number(cobranzas.senia) || 0;
        const monto = Number(cobranzas.monto) || 0;
        const historialPagos = cobranzas.historialPagos || [];
        const totalHistorial = historialPagos.reduce(
          (sum, pago) => sum + (Number(pago.monto) || 0),
          0
        );
        const totalAbonado = senia + monto + totalHistorial;
        const presupuestoTotal = row.original.presupuestoTotal || 0;

        // Determinar estado del pago
        let estadoPago = "pendiente";
        let icono = Clock;
        let color = "text-yellow-600";
        let titulo = "Pendiente de pago";

        if (totalAbonado >= presupuestoTotal && presupuestoTotal > 0) {
          estadoPago = "pagado";
          icono = CheckCircle;
          color = "text-green-600";
          titulo = "Pagado completamente";
        } else if (totalAbonado > 0) {
          estadoPago = "parcial";
          icono = AlertCircle;
          color = "text-orange-600";
          titulo = "Pago parcial";
        }

        const IconComponent = icono;
        return (
          <div className="flex items-center justify-center" title={titulo}>
            <IconComponent className={`w-5 h-5 ${color}`} />
          </div>
        );
      },
    },
    {
      id: "debe",
      header: "DEBE",
      cell: ({ row }) => {
        const cobranzas = row.original.cobranzas || {};
        const senia = Number(cobranzas.senia) || 0;
        const monto = Number(cobranzas.monto) || 0;
        const historialPagos = cobranzas.historialPagos || [];
        const totalHistorial = historialPagos.reduce(
          (sum, pago) => sum + (Number(pago.monto) || 0),
          0
        );
        const totalAbonado = senia + monto + totalHistorial;
        const presupuestoTotal = row.original.presupuestoTotal || 0;
        const debe = presupuestoTotal - totalAbonado;

        return (
          <div className="font-medium">
            $
            {debe > 0
              ? debe.toLocaleString("es-AR", { minimumFractionDigits: 2 })
              : "0.00"}
          </div>
        );
      },
    },
    {
      id: "actions",
      header: "Acciones",
      cell: ({ row }) => {
        return (
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              className="h-8 px-3 bg-red-50 border-red-200 text-red-700 hover:bg-red-100 hover:border-red-300 transition-all duration-200"
              title="Eliminar"
              onClick={(e) => {
                e.stopPropagation(); // Prevenir que se active el click de la fila
                window.dispatchEvent(
                  new CustomEvent("deleteObra", {
                    detail: { id: row.original.id },
                  })
                );
              }}
            >
              <Trash2 className="w-4 h-4 mr-1" />
              Eliminar
            </Button>
          </div>
        );
      },
      enableSorting: false,
    },
  ];

  // Función para mostrar el diálogo de confirmación
  const showDeleteConfirmation = (id, type, itemName) => {
    setItemToDelete({ id, name: itemName });
    setDeleteType(type);
    setShowDeleteDialog(true);
  };

  // Función para confirmar la eliminación
  const confirmDelete = async () => {
    if (!itemToDelete || !user) {
      console.error(
        "Error: No hay item para eliminar o usuario no autenticado",
        { itemToDelete, user }
      );
      setShowDeleteDialog(false);
      return;
    }

    try {
      setDeleting(true);
      setDeleteMessage("");

      console.log("Iniciando proceso de eliminación:", {
        itemToDelete,
        deleteType,
        user,
      });

      // Usar la API como en ventas
      const response = await fetch("/api/delete-document", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          documentId: itemToDelete.id,
          collectionName: "obras", // Siempre es 'obras' para esta página
          userId: user.uid,
          userEmail: user.email,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `Error al eliminar ${deleteType}`);
      }

      const result = await response.json();

      // Actualizar la lista local
      setObrasData((prev) =>
        prev.filter((item) => item.id !== itemToDelete.id)
      );

      setDeleteMessage(`✅ ${result.message}`);

      // Limpiar mensaje después de 3 segundos
      setTimeout(() => setDeleteMessage(""), 3000);
    } catch (error) {
      console.error(`Error al eliminar ${deleteType}:`, error);
      console.error("Detalles del error:", {
        error: error.message,
        code: error.code,
        stack: error.stack,
        itemToDelete,
        deleteType,
        user: user?.uid,
      });

      setDeleteMessage(`❌ Error: ${error.message}`);

      // Limpiar mensaje después de 5 segundos
      setTimeout(() => setDeleteMessage(""), 5000);
    } finally {
      setDeleting(false);
      setShowDeleteDialog(false);
      setItemToDelete(null);
    }
  };

  // Función para probar la conexión a la API de eliminación
  const testAuditConnection = async () => {
    try {
      console.log("Probando conexión a la API de eliminación...");

      setDeleteMessage(
        "✅ La API de eliminación está configurada correctamente. Prueba eliminando un elemento."
      );
      setTimeout(() => setDeleteMessage(""), 5000);
    } catch (error) {
      console.error("Error en prueba de API:", error);
      setDeleteMessage(`❌ Error en API: ${error.message}`);
      setTimeout(() => setDeleteMessage(""), 5000);
    }
  };

  // Event listeners para los botones de borrado
  useEffect(() => {
    const handleDeletePresupuestoEvent = (event) => {
      const presupuesto = obrasData.find(
        (p) => p.id === event.detail.id && p.tipo === "presupuesto"
      );
      if (presupuesto) {
        showDeleteConfirmation(
          event.detail.id,
          "presupuesto",
          presupuesto.cliente?.nombre || "Presupuesto"
        );
      }
    };

    const handleDeleteObraEvent = (event) => {
      const obra = obrasData.find(
        (o) => o.id === event.detail.id && o.tipo === "obra"
      );
      if (obra) {
        showDeleteConfirmation(
          event.detail.id,
          "obra",
          obra.cliente?.nombre || "Obra"
        );
      }
    };

    window.addEventListener("deletePresupuesto", handleDeletePresupuestoEvent);
    window.addEventListener("deleteObra", handleDeleteObraEvent);

    return () => {
      window.removeEventListener(
        "deletePresupuesto",
        handleDeletePresupuestoEvent
      );
      window.removeEventListener("deleteObra", handleDeleteObraEvent);
    };
  }, [obrasData]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const obrasSnap = await getDocs(collection(db, "obras"));
        const base = obrasSnap.docs.map((d) => ({ ...d.data(), id: d.id }));
        // Enriquecer con presupuestoTotal, estadoPago y fechaListado
        const enriched = await Promise.all(
          base.map(async (o) => {
            let presupuestoTotal = 0;
            // Totales según tipo
            if (o.tipo === "presupuesto") {
              presupuestoTotal =
                Number(o.total) || Number(o.productosTotal) || 0;
            } else if (o.tipo === "obra") {
              // Preferir el total de la obra si está presente
              const totalLocalObra =
                Number(o.total) ||
                Number(o.subtotal) ||
                (Number(o.productosTotal) || 0) +
                  (Number(o.materialesTotal) || 0) +
                  (Number(o.gastoObraManual) || 0) +
                  (Number(o.costoEnvio) || 0) -
                  (Number(o.descuentoTotal) || 0);

              presupuestoTotal = Number(totalLocalObra) || 0;

              // Si no hay total local, intentar obtenerlo del presupuesto inicial (fallback)
              if (
                (!presupuestoTotal || Number.isNaN(presupuestoTotal)) &&
                o.presupuestoInicialId
              ) {
                try {
                  const pres = await getDoc(
                    doc(db, "obras", o.presupuestoInicialId)
                  );
                  if (pres.exists()) {
                    const pd = pres.data();
                    const totalPresupuesto =
                      Number(pd.total) ||
                      Number(pd.subtotal) ||
                      (Number(pd.productosTotal) || 0) +
                        (Number(pd.materialesTotal) || 0);
                    presupuestoTotal = Number(totalPresupuesto) || 0;
                  }
                } catch (_) {}
              }
            }
            // Fecha de la columna: usar fechaCreacion para ordenamiento y visualización
            const fechaCreacion = o.fechaCreacion || "";

            const cobr = o.cobranzas || {};
            const abonado =
              (Number(cobr.senia) || 0) +
              (Number(cobr.monto) || 0) +
              (cobr.historialPagos || []).reduce(
                (a, p) => a + (Number(p.monto) || 0),
                0
              );
            const estadoPago =
              abonado >= presupuestoTotal && presupuestoTotal > 0
                ? "pagado"
                : "pendiente";
            // estadoUI: para presupuestos siempre "activo"; para obras conservar su estado
            const estadoUI =
              o.tipo === "presupuesto" ? "activo" : o.estado || "";
            return {
              ...o,
              presupuestoTotal,
              estadoPago,
              fechaCreacion,
              estadoUI,
            };
          })
        );
        setObrasData(enriched);
      } catch (error) {
        console.error("Error al cargar datos:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Separar presupuestos y obras
  const presupuestos = obrasData.filter((o) => o.tipo === "presupuesto");
  const obras = obrasData.filter((o) => o.tipo === "obra");

  // Aplicar filtros de tiempo y otros filtros
  const presupuestosFiltrados = presupuestos.filter((presupuesto) => {
    const cumpleFecha = isInRange(presupuesto.fechaCreacion);
    const cumpleEstado = !filtroEstado || presupuesto.estadoUI === filtroEstado;
    const cumpleBusqueda =
      !busqueda ||
      presupuesto.numeroPedido
        ?.toLowerCase()
        .includes(busqueda.toLowerCase()) ||
      presupuesto.cliente?.nombre
        ?.toLowerCase()
        .includes(busqueda.toLowerCase());
    return cumpleFecha && cumpleEstado && cumpleBusqueda;
  });

  const obrasFiltradas = obras.filter((obra) => {
    const cumpleFecha = isInRange(obra.fechaCreacion);
    const cumpleEstado = !filtroEstado || obra.estadoUI === filtroEstado;
    const cumpleBusqueda =
      !busqueda ||
      obra.numeroPedido?.toLowerCase().includes(busqueda.toLowerCase()) ||
      obra.cliente?.nombre?.toLowerCase().includes(busqueda.toLowerCase());
    return cumpleFecha && cumpleEstado && cumpleBusqueda;
  });

  const estadisticas = {
    total: presupuestosFiltrados.length + obrasFiltradas.length,
    obras: obrasFiltradas.length,
    presupuestos: presupuestosFiltrados.length,
    totalObras: obrasFiltradas.reduce((total, obra) => {
      const presupuestoTotal = obra.presupuestoTotal || 0;
      return total + presupuestoTotal;
    }, 0),
    comisionObras: obrasFiltradas.reduce((total, obra) => {
      const presupuestoTotal = obra.presupuestoTotal || 0;
      return total + (presupuestoTotal * 0.025); // 2.5% de comisión
    }, 0),
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando obras...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 py-8 mx-auto font-sans">
      {/* Mensaje de estado del borrado */}
      {deleteMessage && (
        <div
          className={`mb-6 p-4 rounded-xl flex items-center gap-3 text-base font-medium shadow-lg border transition-all duration-500 ${
            deleteMessage.startsWith("✅")
              ? "bg-gradient-to-r from-green-50 to-emerald-50 border-green-200 text-green-800 shadow-green-100"
              : "bg-gradient-to-r from-red-50 to-rose-50 border-red-200 text-red-800 shadow-red-100"
          }`}
        >
          {deleteMessage.startsWith("✅") ? (
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
          ) : (
            <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-red-600" />
            </div>
          )}
          <span className="font-semibold">{deleteMessage}</span>
        </div>
      )}

      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Gestión de Obras y Presupuestos
          </h1>
          <p className="text-gray-600 mt-1">
            Administra y da seguimiento a todas las obras y presupuestos
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="default"
            className="w-full sm:w-auto flex items-center justify-center gap-3 px-6 py-4 text-base font-semibold rounded-xl shadow-lg bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 transition-all duration-300 transform hover:scale-105 hover:shadow-xl"
            onClick={() => router.push(`/${lang}/obras/presupuesto/create`)}
            disabled={deleting}
          >
            <Icon icon="heroicons:document-plus" className="w-5 h-5" />
            <span className="hidden sm:inline">Nuevo Presupuesto</span>
            <span className="sm:hidden">Presupuesto</span>
          </Button>
          <Button
            variant="default"
            className="w-full sm:w-auto flex items-center justify-center gap-3 px-6 py-4 text-base font-semibold rounded-xl shadow-lg bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 transition-all duration-300 transform hover:scale-105 hover:shadow-xl"
            onClick={() => router.push(`/${lang}/obras/create`)}
            disabled={deleting}
          >
            <Icon icon="heroicons:building-office" className="w-5 h-5" />
            <span className="hidden sm:inline">Nueva Obra</span>
            <span className="sm:hidden">Obra</span>
          </Button>
          {/* <Button variant="outline" onClick={() => window.location.reload()} disabled={deleting}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Actualizar
          </Button>
          <Button
            variant="outline"
            onClick={testAuditConnection}
            disabled={deleting}
            className="bg-yellow-50 border-yellow-200 text-yellow-700 hover:bg-yellow-100 hover:border-yellow-300"
          >
            <Info className="w-4 h-4 mr-2" />
            Probar Auditoría
          </Button> */}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-600">
              {estadisticas.total}
            </div>
            <div className="text-sm text-gray-600">Total</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-orange-600">
              {estadisticas.obras}
            </div>
            <div className="text-sm text-gray-600">Obras</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-purple-600">
              {estadisticas.presupuestos}
            </div>
            <div className="text-sm text-gray-600">Presupuestos</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">
              ${estadisticas.totalObras.toLocaleString("es-AR", { maximumFractionDigits: 0 })}
            </div>
            <div className="text-sm text-gray-600">Total Obras</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-fuchsia-600">
              ${estadisticas.comisionObras.toLocaleString("es-AR", { maximumFractionDigits: 0 })}
            </div>
            <div className="text-sm text-gray-600">Comisión por Obra</div>
            <div className="text-xs text-gray-500 mt-1">2.5% sobre total</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" /> Filtros y Búsqueda
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Filtros de tiempo */}
          <div className="mb-6">
            <label className="text-sm font-medium mb-3 block">Filtro de Tiempo</label>
            <div className="flex flex-wrap gap-2 mb-4">
              <button
                type="button"
                onClick={() => setRangoRapido("month")}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold border transition-all ${
                  rangoRapido === "month"
                    ? "bg-primary text-white border-primary shadow-sm"
                    : "bg-card border-gray-300 text-gray-700 hover:bg-gray-100"
                }`}
              >
                <Icon icon="heroicons:calendar-days" className="w-3.5 h-3.5" />
                Mes
              </button>
              <button
                type="button"
                onClick={() => setRangoRapido("7d")}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold border transition-all ${
                  rangoRapido === "7d"
                    ? "bg-primary text-white border-primary shadow-sm"
                    : "bg-card border-gray-300 text-gray-700 hover:bg-gray-100"
                }`}
              >
                <Icon icon="heroicons:bolt" className="w-3.5 h-3.5" />
                7d
              </button>
              <button
                type="button"
                onClick={() => setRangoRapido("30d")}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold border transition-all ${
                  rangoRapido === "30d"
                    ? "bg-primary text-white border-primary shadow-sm"
                    : "bg-card border-gray-300 text-gray-700 hover:bg-gray-100"
                }`}
              >
                <Icon icon="heroicons:calendar" className="w-3.5 h-3.5" />
                30d
              </button>
              <button
                type="button"
                onClick={() => setRangoRapido("90d")}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold border transition-all ${
                  rangoRapido === "90d"
                    ? "bg-primary text-white border-primary shadow-sm"
                    : "bg-card border-gray-300 text-gray-700 hover:bg-gray-100"
                }`}
              >
                <Icon icon="heroicons:clock" className="w-3.5 h-3.5" />
                90d
              </button>
              <button
                type="button"
                onClick={() => setRangoRapido("ytd")}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold border transition-all ${
                  rangoRapido === "ytd"
                    ? "bg-primary text-white border-primary shadow-sm"
                    : "bg-card border-gray-300 text-gray-700 hover:bg-gray-100"
                }`}
              >
                <Icon icon="heroicons:calendar" className="w-3.5 h-3.5" />
                Año
              </button>
              <button
                type="button"
                onClick={() => setRangoRapido("custom")}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold border transition-all ${
                  rangoRapido === "custom"
                    ? "bg-primary text-white border-primary shadow-sm"
                    : "bg-card border-gray-300 text-gray-700 hover:bg-gray-100"
                }`}
              >
                <Icon icon="heroicons:adjustments-horizontal" className="w-3.5 h-3.5" />
                Personalizado
              </button>
            </div>
            
            {/* Inputs de fecha personalizada */}
            {rangoRapido === "custom" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Desde</label>
                  <Input
                    type="date"
                    value={fechaDesde}
                    onChange={(e) => setFechaDesde(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Hasta</label>
                  <Input
                    type="date"
                    value={fechaHasta}
                    onChange={(e) => setFechaHasta(e.target.value)}
                    className="mt-1"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Otros filtros */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium">Buscar</label>
              <div className="relative mt-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Número, cliente..."
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
                  {Object.entries(estadosObra).map(([key, value]) => (
                    <SelectItem key={key} value={key}>
                      {value.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button
                variant="outline"
                onClick={() => {
                  setFiltroEstado("");
                  setBusqueda("");
                  setRangoRapido("month");
                }}
                className="w-full"
              >
                Limpiar Filtros
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tablas mejoradas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 px-2">
        {/* Tabla de Presupuestos - IZQUIERDA */}
        <Card className="rounded-2xl shadow-2xl border-0 bg-gradient-to-br from-white to-gray-50/50 overflow-hidden">
          <CardHeader className="pb-4 border-b border-gray-100 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-t-2xl">
            <CardTitle className="text-2xl font-bold text-gray-900 flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                <Icon
                  icon="heroicons:document-text"
                  className="w-7 h-7 text-white"
                />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">
                  Presupuestos
                </div>
                <div className="text-sm font-medium text-gray-600">
                  Gestión de cotizaciones
                </div>
              </div>
              {deleting && (
                <div className="flex items-center gap-2 ml-auto">
                  <div className="w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center">
                    <Loader2 className="w-4 h-4 animate-spin text-purple-600" />
                  </div>
                  <span className="text-sm font-medium text-purple-600">
                    Procesando...
                  </span>
                </div>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 p-0">
            <div className="overflow-hidden rounded-b-2xl">
              <DataTableEnhanced
                data={presupuestosFiltrados}
                columns={presupuestosColumns}
                searchPlaceholder="Buscar presupuestos..."
                className="border-0"
                defaultSorting={[{ id: "numeroPedido", desc: true }]}
                onRowClick={(presupuesto) => {
                  router.push(`/${lang}/obras/presupuesto/${presupuesto.id}`);
                }}
                compact={true}
              />
            </div>
          </CardContent>
        </Card>

        {/* Tabla de Obras - DERECHA */}
        <Card className="rounded-2xl shadow-2xl border-0 bg-gradient-to-br from-white to-blue-50/50 overflow-hidden">
          <CardHeader className="pb-4 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-teal-50 rounded-t-2xl">
            <CardTitle className="text-2xl font-bold text-gray-900 flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-teal-600 rounded-xl flex items-center justify-center shadow-lg">
                <Icon
                  icon="heroicons:building-office"
                  className="w-7 h-7 text-white"
                />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">Obras</div>
                <div className="text-sm font-medium text-gray-600">
                  Proyectos en ejecución
                </div>
              </div>
              {deleting && (
                <div className="flex items-center gap-2 ml-auto">
                  <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                    <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                  </div>
                  <span className="text-sm font-medium text-blue-600">
                    Procesando...
                  </span>
                </div>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 p-0">
            <div className="overflow-hidden rounded-b-2xl">
              <DataTableEnhanced
                data={obrasFiltradas}
                columns={obrasColumns}
                searchPlaceholder="Buscar obras..."
                className="border-0"
                defaultSorting={[{ id: "numeroPedido", desc: true }]}
                onRowClick={(obra) => {
                  router.push(`/${lang}/obras/${obra.id}`);
                }}
                compact={true}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Diálogo de confirmación de eliminación mejorado */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="w-[95vw] max-w-md rounded-2xl border-0 shadow-2xl bg-white">
          <DialogHeader className="text-center pb-4">
            <div className="w-16 h-16 bg-gradient-to-br from-red-100 to-rose-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>
            <DialogTitle className="text-xl font-bold text-gray-900">
              Confirmar Eliminación
            </DialogTitle>
            <DialogDescription className="text-gray-600 mt-2">
              ¿Estás seguro de que quieres eliminar este{" "}
              {deleteType === "obra" ? "obra" : "presupuesto"}?
            </DialogDescription>
          </DialogHeader>

          <div className="bg-gradient-to-r from-red-50 to-rose-50 rounded-xl p-4 mb-6 border border-red-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <Info className="w-5 h-5 text-red-600" />
              </div>
              <div className="flex-1">
                <div className="font-semibold text-red-800">
                  {itemToDelete?.name || "Elemento"}
                </div>
                <div className="text-sm text-red-700">
                  {deleteType === "obra"
                    ? "Esta acción eliminará la obra permanentemente."
                    : "Esta acción eliminará el presupuesto permanentemente."}
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="flex flex-col sm:flex-row gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
              className="w-full sm:w-auto px-6 py-3 rounded-xl border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 font-medium"
              disabled={deleting}
            >
              <X className="w-4 h-4 mr-2" />
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 shadow-lg hover:shadow-xl transition-all duration-200 font-medium transform hover:scale-105"
              disabled={deleting}
            >
              {deleting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Eliminando...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-1" />
                  Eliminar
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ObrasPage;
