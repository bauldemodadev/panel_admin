"use client";

import * as React from "react";
import {
  flexRender,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { DataTablePagination } from "./data-table-pagination";
import { DataTableToolbar } from "./data-table-toolbar";
import { DataTableStats } from "./data-table-stats";
import { cn } from "@/lib/utils";
import { updateLeadInFirebase } from "@/lib/firebase";

export function DataTable({ columns, data }) {
  const [rowSelection, setRowSelection] = React.useState({});
  const [columnVisibility, setColumnVisibility] = React.useState({});
  const [columnFilters, setColumnFilters] = React.useState([]);
  const [sorting, setSorting] = React.useState([]);
  const [globalFilter, setGlobalFilter] = React.useState("");
  const [massEdit, setMassEdit] = React.useState({ estado: "", prioridad: "" });
  const [isUpdating, setIsUpdating] = React.useState(false);

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      columnVisibility,
      rowSelection,
      columnFilters,
      globalFilter,
    },
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    globalFilterFn: "includesString",
  });

  const filteredData = table
    .getFilteredRowModel()
    .rows.map((row) => row.original);
  const selectedRows = table.getSelectedRowModel().rows;
  const selectedLeads = selectedRows.map((row) => row.original);

  return (
    <div className="space-y-6">
      {/* Estadísticas */}
      <DataTableStats data={data} filteredData={filteredData} />

      {/* Toolbar y tabla */}
      <div className="space-y-4">
        <DataTableToolbar table={table} />
        {/* Barra de acciones masivas */}
        {selectedLeads.length > 0 && (
          <div className="flex items-center gap-4 p-4 bg-primary/10 border border-primary rounded mb-4 z-50">
            <span className="font-medium">
              {selectedLeads.length} seleccionados
            </span>
            <select
              className="border rounded px-2 py-1"
              value={massEdit.estado}
              onChange={(e) =>
                setMassEdit((m) => ({ ...m, estado: e.target.value }))
              }
            >
              <option value="">Cambiar estado</option>
              <option value="nuevo">Nuevo</option>
              <option value="en seguimiento">En seguimiento</option>
              <option value="contactado">Contactado</option>
            </select>
            <select
              className="border rounded px-2 py-1"
              value={massEdit.prioridad}
              onChange={(e) =>
                setMassEdit((m) => ({ ...m, prioridad: e.target.value }))
              }
            >
              <option value="">Cambiar prioridad</option>
              <option value="alta">Alta</option>
              <option value="media">Media</option>
              <option value="baja">Baja</option>
            </select>
            <button
              className="bg-primary text-white px-4 py-2 rounded disabled:opacity-50"
              onClick={async () => {
                setIsUpdating(true);
                for (const lead of selectedLeads) {
                  const updates = {};
                  if (massEdit.estado) updates.estado = massEdit.estado;
                  if (massEdit.prioridad)
                    updates.prioridad = massEdit.prioridad;
                  if (Object.keys(updates).length > 0) {
                    await updateLeadInFirebase(lead.id, updates);
                  }
                }
                setIsUpdating(false);
                table.resetRowSelection();
                setMassEdit({ estado: "", prioridad: "" });
                // Aquí podrías refrescar los datos si es necesario
              }}
              disabled={isUpdating || (!massEdit.estado && !massEdit.prioridad)}
            >
              {isUpdating ? "Actualizando..." : "Aplicar cambios"}
            </button>
          </div>
        )}
        <div className="rounded-md border border-border bg-card shadow-sm overflow-x-auto">
          <Table className="min-w-[600px] sm:min-w-full">
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow
                  key={headerGroup.id}
                  className="bg-muted/50 hover:bg-muted/50"
                >
                  {headerGroup.headers.map((header) => {
                    return (
                      <TableHead
                        key={header.id}
                        colSpan={header.colSpan}
                        className="font-semibold text-foreground"
                      >
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                      </TableHead>
                    );
                  })}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row, index) => (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && "selected"}
                    className={cn(
                      "hover:bg-muted/50 transition-colors",
                      index % 2 === 0 ? "bg-card" : "bg-muted/20",
                      row.getIsSelected() && "bg-primary/10"
                    )}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id} className="py-3">
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="h-32 text-center"
                  >
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <div className="text-muted-foreground text-lg font-medium">
                        No se encontraron resultados
                      </div>
                      <div className="text-muted-foreground/70 text-sm">
                        Intenta ajustar los filtros o la búsqueda
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        <DataTablePagination table={table} />
      </div>
    </div>
  );
}
