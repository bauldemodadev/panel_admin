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
import { useRouter, useParams } from "next/navigation";
import { Icon } from "@iconify/react";

export function DataTable({ columns, data }) {
  const [rowSelection, setRowSelection] = React.useState({});
  const [columnVisibility, setColumnVisibility] = React.useState({});
  const [columnFilters, setColumnFilters] = React.useState([]);
  const [sorting, setSorting] = React.useState([
    {
      id: "fechaCreacion",
      desc: true,
    },
  ]);
  const [globalFilter, setGlobalFilter] = React.useState("");
  const router = useRouter();
  const params = useParams();
  const { lang } = params;

  // console.log("DataTable data:", data);

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
  });

  // Función para manejar el click en la fila
  const handleRowClick = (row) => {
    const tipo = row.original?.tipo || 'documento';
    const id = row.original?.id;
    const numeroPedido = row.original?.numeroPedido;
    
    // Si tiene numeroPedido, es del contexto de obras-proyectos
    if (numeroPedido && numeroPedido.startsWith('OBRA-')) {
      router.push(`/${lang}/obras/${id}`);
    } else if (tipo === 'presupuesto') {
      router.push(`/${lang}/presupuestos/${id}`);
    } else if (tipo === 'venta') {
      router.push(`/${lang}/ventas/${id}`);
    }
  };

  return (
    <div className="w-full bg-card">
      <div className="p-4 bg-card">
        <DataTableToolbar table={table} />
      </div>
      <div className="overflow-x-auto">
        <Table className="w-full bg-card">
          <TableHeader className="bg-gray-100 bg-card">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="bg-gray-100 bg-card">
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className="px-4 py-2 text-left text-gray-700 dark:text-gray-200 font-semibold"
                  >
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                  className="border-b border-default-300 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 bg-card transition-colors"
                  onClick={() => handleRowClick(row)}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      className="px-4 py-2 text-gray-700 dark:text-gray-200"
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center text-gray-400 dark:text-gray-500">
                  No hay resultados.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      {/* Paginador sin borde */}
      <div className="p-4 bg-card">
        <DataTablePagination table={table} />
      </div>
    </div>
  );
}
