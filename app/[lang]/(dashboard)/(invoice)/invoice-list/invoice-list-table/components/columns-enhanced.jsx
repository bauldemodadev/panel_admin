"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Icon } from "@iconify/react";
import Link from "next/link";
import { Trash2, Calendar, User, DollarSign, FileText, ShoppingCart, Clock, CheckCircle, AlertCircle, XCircle } from "lucide-react";

// Función para formatear fecha
const formatDate = (dateString) => {
  if (!dateString) return "-";
  try {
    const fecha = new Date(dateString);
    return (
      fecha.toLocaleDateString("es-AR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric"
      }) +
      " " +
      fecha.toLocaleTimeString("es-AR", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false
      })
    );
  } catch {
    return dateString;
  }
};

// Función para obtener el color del estado
const getStatusColor = (status) => {
  switch (status?.toLowerCase()) {
    case "pagado":
    case "paid":
    case "confirmed":
      return "bg-green-100 text-green-800 border-green-200";
    case "pendiente":
    case "pending":
    case "closed":
      return "bg-yellow-100 text-yellow-800 border-yellow-200";
    case "parcial":
      return "bg-blue-100 text-blue-800 border-blue-200";
    default:
      return "bg-gray-100 text-gray-800 border-gray-200";
  }
};

// Función para obtener el icono del estado
const getStatusIcon = (status) => {
  switch (status?.toLowerCase()) {
    case "pagado":
    case "paid":
    case "confirmed":
      return <CheckCircle className="w-4 h-4" />;
    case "pendiente":
    case "pending":
    case "closed":
      return <Clock className="w-4 h-4" />;
    case "parcial":
      return <AlertCircle className="w-4 h-4" />;
    default:
      return <XCircle className="w-4 h-4" />;
  }
};

// Función para formatear moneda
const formatCurrency = (amount) => {
  if (!amount || isNaN(amount)) return "0";
  return new Intl.NumberFormat("es-AR", {
    style: "decimal",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

// Columnas para la tabla de presupuestos
export const columnsPresupuestos = [
  {
    accessorKey: "numeroPedido",
    header: ({ column }) => (
      <div className="flex items-center gap-2">
        <FileText className="w-4 h-4 text-blue-600" />
        <span className="font-semibold">N° Pedido</span>
      </div>
    ),
    cell: ({ row }) => (
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-blue-200 rounded-lg flex items-center justify-center">
          <FileText className="w-5 h-5 text-blue-600" />
        </div>
        <div className="flex flex-col">
          <span className="font-mono text-sm font-semibold text-gray-900">
            {row.getValue("numeroPedido") || row.getValue("id")?.slice(-8)}
          </span>
        </div>
      </div>
    ),
    enableSorting: true,
  },
  {
    accessorKey: "cliente",
    header: ({ column }) => (
      <div className="flex items-center gap-2">
        <User className="w-4 h-4 text-indigo-600" />
        <span className="font-semibold">Cliente</span>
      </div>
    ),
    cell: ({ row }) => (
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-gradient-to-br from-indigo-100 to-indigo-200 rounded-full flex items-center justify-center">
          <span className="text-sm font-semibold text-indigo-700">
            {(row?.original?.cliente?.nombre || "C")[0].toUpperCase()}
          </span>
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-semibold text-gray-900 whitespace-nowrap">
            {(row?.original?.cliente?.nombre || "-").toUpperCase()}
          </span>
          <span className="text-xs text-gray-500 whitespace-nowrap">
            {row?.original?.cliente?.cuit || row?.original?.cliente?.email || "-"}
          </span>
        </div>
      </div>
    ),
    enableSorting: true,
  },
  {
    accessorKey: "fechaCreacion",
    header: ({ column }) => (
      <div className="flex items-center gap-2">
        <Calendar className="w-4 h-4 text-green-600" />
        <span className="font-semibold">Fecha</span>
      </div>
    ),
    cell: ({ row }) => {
      const fecha = row.getValue("fechaCreacion");
      return (
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-green-100 to-green-200 rounded-lg flex items-center justify-center">
            <Calendar className="w-4 h-4 text-green-600" />
          </div>
          <span className="text-sm font-medium text-gray-900">
            {formatDate(fecha)}
          </span>
        </div>
      );
    },
    enableSorting: true,
  },
  {
    accessorKey: "total",
    header: ({ column }) => (
      <div className="flex items-center gap-2">
        <DollarSign className="w-4 h-4 text-emerald-600" />
        <span className="font-semibold">Total</span>
      </div>
    ),
    cell: ({ row }) => (
      <div className="flex items-center gap-1">
        <div className="w-8 h-8 bg-gradient-to-br from-emerald-100 to-emerald-200 rounded-lg flex items-center justify-center">
          <DollarSign className="w-4 h-4 text-emerald-600" />
        </div>
        <span className="font-bold text-sm text-gray-900">
          {formatCurrency(row.getValue("total") || 0)}
        </span>
      </div>
    ),
    enableSorting: true,
  },
  {
    accessorKey: "vendedor",
    header: ({ column }) => (
      <div className="flex items-center gap-2">
        <User className="w-4 h-4 text-purple-600" />
        <span className="font-semibold">Vendedor</span>
      </div>
    ),
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 bg-gradient-to-br from-purple-100 to-purple-200 rounded-full flex items-center justify-center">
          <span className="text-xs font-semibold text-purple-700">
            {(row?.original?.vendedor || "V")[0].toUpperCase()}
          </span>
        </div>
        <span className="text-sm font-medium text-gray-700">
          {row?.original?.vendedor || "-"}
        </span>
      </div>
    ),
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

// Columnas para la tabla de ventas
export const columnsVentas = [
  {
    accessorKey: "numeroPedido",
    header: ({ column }) => (
      <div className="flex items-center gap-2">
        <ShoppingCart className="w-4 h-4 text-emerald-600" />
        <span className="font-semibold">N° Pedido</span>
      </div>
    ),
    cell: ({ row }) => (
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-gradient-to-br from-emerald-100 to-emerald-200 rounded-lg flex items-center justify-center">
          <ShoppingCart className="w-5 h-5 text-emerald-600" />
        </div>
        <div className="flex flex-col">
          <span className="font-mono text-sm font-semibold text-gray-900">
            {row.getValue("numeroPedido") || row.getValue("id")?.slice(-8)}
          </span>
        </div>
      </div>
    ),
    enableSorting: true,
  },
  {
    accessorKey: "cliente",
    header: ({ column }) => (
      <div className="flex items-center gap-2">
        <User className="w-4 h-4 text-indigo-600" />
        <span className="font-semibold">Cliente</span>
      </div>
    ),
    cell: ({ row }) => (
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-gradient-to-br from-indigo-100 to-indigo-200 rounded-full flex items-center justify-center">
          <span className="text-sm font-semibold text-indigo-700">
            {(row?.original?.cliente?.nombre || "C")[0].toUpperCase()}
          </span>
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-semibold text-gray-900 whitespace-nowrap">
            {(row?.original?.cliente?.nombre || "-").toUpperCase()}
          </span>
          <span className="text-xs text-gray-500 whitespace-nowrap">
            {row?.original?.cliente?.cuit || row?.original?.cliente?.email || "-"}
          </span>
        </div>
      </div>
    ),
    enableSorting: true,
  },
  {
    accessorKey: "fechaCreacion",
    header: ({ column }) => (
      <div className="flex items-center gap-2">
        <Calendar className="w-4 h-4 text-green-600" />
        <span className="font-semibold">Fecha</span>
      </div>
    ),
    cell: ({ row }) => {
      const fecha = row.getValue("fechaCreacion");
      return (
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-green-100 to-green-200 rounded-lg flex items-center justify-center">
            <Calendar className="w-4 h-4 text-green-600" />
          </div>
          <span className="text-sm font-medium text-gray-900">
            {formatDate(fecha)}
          </span>
        </div>
      );
    },
    enableSorting: true,
  },
  {
    accessorKey: "total",
    header: ({ column }) => (
      <div className="flex items-center gap-2">
        <DollarSign className="w-4 h-4 text-emerald-600" />
        <span className="font-semibold">Total</span>
      </div>
    ),
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 bg-gradient-to-br from-emerald-100 to-emerald-200 rounded-lg flex items-center justify-center">
          <DollarSign className="w-4 h-4 text-emerald-600" />
        </div>
        <span className="font-bold text-sm text-gray-900">
          {formatCurrency(row.getValue("total") || 0)}
        </span>
      </div>
    ),
    enableSorting: true,
  },
  {
    accessorKey: "estadoPago",
    header: ({ column }) => (
      <div className="flex items-center gap-2">
        <CheckCircle className="w-4 h-4 text-purple-600" />
        <span className="font-semibold">Estado</span>
      </div>
    ),
    cell: ({ row }) => {
      const status = row.getValue("estadoPago") || row.getValue("status");
      return (
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-purple-100 to-purple-200 rounded-lg flex items-center justify-center">
            {getStatusIcon(status)}
          </div>
          <Badge
            className={`rounded-full px-3 py-1 text-xs font-medium border ${getStatusColor(status)}`}
          >
            {status || "No especificado"}
          </Badge>
        </div>
      );
    },
    enableSorting: true,
  },
  {
    accessorKey: "montoAbonado",
    header: ({ column }) => (
      <div className="flex items-center gap-2">
        <DollarSign className="w-4 h-4 text-blue-600" />
        <span className="font-semibold">Abonado</span>
      </div>
    ),
    cell: ({ row }) => {
      // Calcular monto abonado desde el array pagos
      const pagos = row.original.pagos || [];
      const montoAbonado = Array.isArray(pagos) && pagos.length > 0 
        ? pagos.reduce((acc, pago) => acc + Number(pago.monto || 0), 0)
        : Number(row.original.montoAbonado || 0); // Fallback al campo antiguo
      
      const total = row.getValue("total") || 0;
      const porcentaje = total > 0 ? (montoAbonado / total) * 100 : 0;
      
      // Determinar el color basado en el estado de pago
      const estadoPago = row.original.estadoPago;
      let colorClase = "text-gray-900";
      let porcentajeColor = "text-gray-500";
      
      if (estadoPago === "pagado") {
        colorClase = "text-green-700";
        porcentajeColor = "text-green-600";
      } else if (estadoPago === "parcial") {
        colorClase = "text-blue-700";
        porcentajeColor = "text-blue-600";
      } else if (estadoPago === "pendiente") {
        colorClase = "text-red-700";
        porcentajeColor = "text-red-600";
      }
      
      return (
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-100 to-blue-200 rounded-lg flex items-center justify-center">
            <DollarSign className="w-4 h-4 text-blue-600" />
          </div>
          <div className="flex flex-col">
            <span className={`font-semibold text-sm ${colorClase}`}>
              {formatCurrency(montoAbonado)}
            </span>
            {/* <span className={`text-xs ${porcentajeColor}`}>
              {porcentaje.toFixed(0)}% del total
            </span> */}
          </div>
        </div>
      );
    },
    enableSorting: true,
  },
  {
    accessorKey: "vendedor",
    header: ({ column }) => (
      <div className="flex items-center gap-2">
        <User className="w-4 h-4 text-purple-600" />
        <span className="font-semibold">Vendedor</span>
      </div>
    ),
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 bg-gradient-to-br from-purple-100 to-purple-200 rounded-full flex items-center justify-center">
          <span className="text-xs font-semibold text-purple-700">
            {(row?.original?.vendedor || "V")[0].toUpperCase()}
          </span>
        </div>
        <span className="text-sm font-medium text-gray-700">
          {row?.original?.vendedor || "-"}
        </span>
      </div>
    ),
    enableSorting: true,
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
                new CustomEvent("deleteVenta", {
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
