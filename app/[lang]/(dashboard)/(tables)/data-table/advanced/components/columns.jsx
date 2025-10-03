"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { DataTableColumnHeader } from "./data-table-column-header";
import { DataTableRowActions } from "./data-table-row-actions";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useMediaQuery } from "@/hooks/use-media-query";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import React from "react";
import Link from "next/link";

export function useResponsiveColumns(options = {}) {
  const isMobile = useMediaQuery("(max-width: 640px)");
  const [modalData, setModalData] = React.useState(null);

  // Columnas clave (siempre visibles)
  const baseColumns = [
    {
      accessorKey: "nombre",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Nombre" />
      ),
      cell: ({ row }) => {
        const id = row.original.id;
        const nombre = row.getValue("nombre");
        if (options.onNameClick) {
          return (
            <Link href={options.onNameClick(id)} className="text-primary underline hover:text-primary/80 font-semibold">
              {nombre}
            </Link>
          );
        }
        return (
          <span className="font-semibold text-foreground">{nombre}</span>
        );
      },
    },
    {
      accessorKey: "estado",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Estado" />
      ),
      cell: ({ row }) => {
        const estado = row.getValue("estado");
        const estadoColors = {
          Nuevo: "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700/50",
          "En seguimiento": "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-700/50",
          Contactado: "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700/50",
        };
        return (
          <Badge 
            className={cn(
              "font-medium",
              estadoColors[estado] || "bg-muted text-muted-foreground"
            )}
          >
            {estado}
          </Badge>
        );
      },
    },
    {
      accessorKey: "prioridad",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Prioridad" />
      ),
      cell: ({ row }) => {
        const prioridad = row.getValue("prioridad");
        const prioridadColors = {
          Alta: "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-700/50",
          Media: "bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-700/50",
          Baja: "bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600",
        };
        return (
          <Badge 
            className={cn(
              "font-medium",
              prioridadColors[prioridad] || "bg-muted text-muted-foreground"
            )}
          >
            {prioridad}
          </Badge>
        );
      },
    },
  ];

  // Columnas de detalles (solo desktop)
  const detailColumns = [
    {
      accessorKey: "email",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Email" />
      ),
      cell: ({ row }) => row.getValue("email"),
    },
    {
      accessorKey: "telefono",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Teléfono" />
      ),
      cell: ({ row }) => row.getValue("telefono"),
    },
    {
      accessorKey: "descripcion",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Descripción" />
      ),
      cell: ({ row }) => row.getValue("descripcion"),
    },
    {
      accessorKey: "fuente",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Fuente" />
      ),
      cell: ({ row }) => row.getValue("fuente"),
    },
    {
      accessorKey: "createdAt",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Fecha" />
      ),
      cell: ({ row }) => {
        const fecha = row.getValue("createdAt");
        return fecha ? format(new Date(fecha), "dd/MM/yyyy", { locale: es }) : "-";
      },
    },
  ];

  if (!isMobile) {
    // En desktop, mostrar todas las columnas (clave + detalles)
    return [
      ...baseColumns,
      ...detailColumns,
      {
        id: "acciones",
        header: () => <span>Acciones</span>,
        cell: ({ row }) => <DataTableRowActions row={row} />, // Acciones por fila si las tienes
        enableSorting: false,
        enableHiding: false,
      },
    ];
  }
  // En mobile, solo mostrar las columnas clave y el botón +
  return [
    ...baseColumns,
    {
      id: "ver-mas",
      header: () => <span>Más</span>,
      cell: ({ row }) => (
        <Dialog>
          <DialogTrigger asChild>
            <button
              className="bg-primary text-white rounded-full w-8 h-8 flex items-center justify-center hover:bg-primary/80"
              onClick={() => setModalData(row.original)}
            >
              +
            </button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Detalles del Lead</DialogTitle>
              <DialogDescription>
                <div className="space-y-2 text-left">
                  <div><b>ID:</b> {modalData?.id}</div>
                  <div><b>Nombre:</b> {modalData?.nombre}</div>
                  <div><b>Email:</b> {modalData?.email}</div>
                  <div><b>Teléfono:</b> {modalData?.telefono}</div>
                  <div><b>Descripción:</b> {modalData?.descripcion}</div>
                  <div><b>Estado:</b> {modalData?.estado}</div>
                  <div><b>Prioridad:</b> {modalData?.prioridad}</div>
                  <div><b>Fuente:</b> {modalData?.fuente}</div>
                  <div><b>Fecha:</b> {modalData?.createdAt}</div>
                </div>
              </DialogDescription>
            </DialogHeader>
          </DialogContent>
        </Dialog>
      ),
      enableSorting: false,
      enableHiding: false,
    },
  ];
}
