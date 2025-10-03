"use client";
import React, { useState, useMemo } from "react";
import {
  flexRender,
  getCoreRowModel,
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Search,
  Filter,
  RefreshCw,
} from "lucide-react";

export function DataTableEnhanced({
  data,
  columns,
  searchPlaceholder = "Buscar...",
  showSearch = true,
  showPagination = true,
  showPageSize = true,
  className = "",
  defaultSorting = [],
  onRowClick,
  compact = false, // Nueva prop para tablas compactas
}) {
  const [sorting, setSorting] = useState(defaultSorting);
  const [columnFilters, setColumnFilters] = useState([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [rowSelection, setRowSelection] = useState({});

  // Función de filtrado global personalizada que busca en campos anidados
  const globalFilterFn = useMemo(() => {
    return (row, columnId, filterValue) => {
      if (!filterValue) return true;
      
      const searchValue = filterValue.toLowerCase();
      const rowData = row.original;
      
      // Buscar en todos los campos de la fila
      for (const column of columns) {
        if (column.accessorKey) {
          const value = getNestedValue(rowData, column.accessorKey);
          if (value && String(value).toLowerCase().includes(searchValue)) {
            return true;
          }
        }
      }
      
      return false;
    };
  }, [columns]);

  // Función auxiliar para obtener valores anidados (ej: cliente.nombre)
  const getNestedValue = (obj, path) => {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : null;
    }, obj);
  };

  // Filtrar datos localmente antes de pasarlos a la tabla
  const filteredData = useMemo(() => {
    if (!globalFilter) return data;
    
    const searchValue = globalFilter.toLowerCase();
    return data.filter(row => {
      // Buscar en campos específicos que sabemos que existen
      const searchableFields = [
        row.numeroPedido,
        row.cliente?.nombre,
        row.cliente?.cuit,
        row.cliente?.email,
        row.fechaCreacion,
        row.total,
        row.vendedor,
        row.estadoPago,
        row.estado,
        row.tipoEnvio,
        row.costoEnvio
      ];
      
      return searchableFields.some(field => 
        field && String(field).toLowerCase().includes(searchValue)
      );
    });
  }, [data, globalFilter]);

  const table = useReactTable({
    data: filteredData,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      columnFilters,
      rowSelection,
    },
    // Configurar el filtrado global personalizado
    globalFilterFn,
  });

  const totalRows = table.getFilteredRowModel().rows.length;
  const currentPage = table.getState().pagination.pageIndex + 1;
  const totalPages = table.getPageCount();
  const pageSize = table.getState().pagination.pageSize;

  return (
    <div className={`w-full ${className}`}>
      {/* Header con controles */}
      <div className={`flex flex-col sm:flex-row items-start sm:items-center justify-between ${
        compact ? "gap-2" : "gap-4"
      } ${
        compact ? "p-3" : "p-6"
      } bg-gradient-to-r from-gray-50 to-gray-100/50 border-b border-gray-200`}>
        <div className={`flex items-center ${
          compact ? "gap-2" : "gap-3"
        }`}>
          <div className={`${
            compact ? "w-8 h-8" : "w-10 h-10"
          } bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center`}>
            <Filter className={`${
              compact ? "w-4 h-4" : "w-5 h-5"
            } text-white`} />
          </div>
          <div>
            <h3 className={`${
              compact ? "text-base" : "text-lg"
            } font-semibold text-gray-900`}>
              {totalRows} {totalRows === 1 ? 'registro' : 'registros'}
            </h3>
            <p className={`${
              compact ? "text-xs" : "text-sm"
            } text-gray-600`}>
              Página {currentPage} de {totalPages}
            </p>
          </div>
        </div>

        <div className={`flex items-center ${
          compact ? "gap-2" : "gap-3"
        }`}>
          {showSearch && (
            <div className="relative">
              <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${
                compact ? "w-3 h-3" : "w-4 h-4"
              } text-gray-400`} />
              <Input
                placeholder={searchPlaceholder}
                value={globalFilter ?? ""}
                onChange={(event) => setGlobalFilter(event.target.value)}
                className={`pl-10 ${
                  compact ? "w-48 h-8" : "w-64"
                } bg-white border-gray-300 focus:border-blue-500 focus:ring-blue-500`}
              />
            </div>
          )}

          <Button
            variant="outline"
            size={compact ? "sm" : "sm"}
            onClick={() => {
              table.resetColumnFilters();
              setGlobalFilter("");
            }}
            className={`bg-white border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400 ${
              compact ? "h-8 px-3 text-xs" : ""
            }`}
          >
            <RefreshCw className={`${
              compact ? "w-3 h-3" : "w-4 h-4"
            } mr-2`} />
            Limpiar
          </Button>


        </div>
      </div>

      {/* Tabla */}
      <div className="relative overflow-hidden">
        <div className="overflow-x-auto">
          <Table className="w-full">
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id} className="bg-gradient-to-r from-gray-50 to-gray-100/50 hover:bg-gray-100/70">
                  {headerGroup.headers.map((header) => (
                    <TableHead
                      key={header.id}
                      className={`${
                        compact 
                          ? "px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-b border-gray-200" 
                          : "px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-b border-gray-200"
                      }`}
                    >
                      {header.isPlaceholder ? null : (
                        <div className={`flex items-center ${
                          compact ? "gap-1" : "gap-2"
                        }`}>
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                          {header.column.getCanSort() && (
                            <div className="flex flex-col">
                              <button
                                onClick={header.column.getToggleSortingHandler()}
                                className="w-3 h-3 text-gray-400 hover:text-gray-600 transition-colors"
                              >
                                {{
                                  asc: "↑",
                                  desc: "↓",
                                }[header.column.getIsSorted()] ?? "↕"}
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row, rowIndex) => (
                                     <TableRow
                     key={row.id}
                     data-state={row.getIsSelected() && "selected"}
                     className={`border-b border-gray-100 transition-all duration-200 hover:bg-gradient-to-r hover:from-blue-50/30 hover:to-indigo-50/30 cursor-pointer ${
                       rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'
                     }`}
                     onClick={() => onRowClick && onRowClick(row.original)}
                   >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell
                        key={cell.id}
                        className={`${
                          compact 
                            ? "px-3 py-2 text-xs text-gray-900 border-r border-gray-100 last:border-r-0" 
                            : "px-6 py-4 text-sm text-gray-900 border-r border-gray-100 last:border-r-0"
                        }`}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="h-24 text-center text-gray-500"
                  >
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                        <Search className="w-6 h-6 text-gray-400" />
                      </div>
                      <p className="text-sm font-medium">No se encontraron resultados</p>
                      <p className="text-xs text-gray-400">
                        Intenta ajustar los filtros de búsqueda
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Paginación mejorada */}
      {showPagination && (
        <div className={`flex flex-col sm:flex-row items-center justify-between ${
          compact ? "gap-2" : "gap-4"
        } ${
          compact ? "p-3" : "p-6"
        } bg-gradient-to-r from-gray-50 to-gray-100/50 border-t border-gray-200`}>
          <div className={`flex items-center gap-4 ${
            compact ? "text-xs" : "text-sm"
          } text-gray-700`}>
            <span>
              Mostrando {table.getState().pagination.pageIndex * pageSize + 1} a{" "}
              {Math.min(
                (table.getState().pagination.pageIndex + 1) * pageSize,
                totalRows
              )}{" "}
              de {totalRows} resultados
            </span>

            {showPageSize && (
              <div className="flex items-center gap-2">
                <span className={`${
                  compact ? "text-xs" : "text-sm"
                } text-gray-600`}>Mostrar:</span>
                <Select
                  value={`${pageSize}`}
                  onValueChange={(value) => {
                    table.setPageSize(Number(value));
                  }}
                >
                  <SelectTrigger className={`${
                    compact ? "w-16 h-6" : "w-20 h-8"
                  } bg-white border-gray-300`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[10, 20, 30, 40, 50].map((pageSize) => (
                      <SelectItem key={pageSize} value={`${pageSize}`}>
                        {pageSize}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div className={`flex items-center ${
            compact ? "gap-1" : "gap-2"
          }`}>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.setPageIndex(0)}
              disabled={!table.getCanPreviousPage()}
              className={`bg-white border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400 disabled:opacity-50 disabled:cursor-not-allowed ${
                compact ? "h-7 w-7" : ""
              }`}
            >
              <ChevronsLeft className={`${
                compact ? "w-3 h-3" : "w-4 h-4"
              }`} />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className={`bg-white border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400 disabled:opacity-50 disabled:cursor-not-allowed ${
                compact ? "h-7 w-7" : ""
              }`}
            >
              <ChevronLeft className={`${
                compact ? "w-3 h-3" : "w-4 h-4"
              }`} />
            </Button>

            <div className={`flex items-center ${
              compact ? "gap-0.5" : "gap-1"
            }`}>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }

                return (
                  <Button
                    key={pageNum}
                    variant={currentPage === pageNum ? "default" : "outline"}
                    size="sm"
                    onClick={() => table.setPageIndex(pageNum - 1)}
                    className={`${
                      compact ? "w-6 h-6 text-xs" : "w-8 h-8"
                    } ${
                      currentPage === pageNum
                        ? "bg-blue-600 text-white hover:bg-blue-700"
                        : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400"
                    }`}
                  >
                    {pageNum}
                  </Button>
                );
              })}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className={`bg-white border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400 disabled:opacity-50 disabled:cursor-not-allowed ${
                compact ? "h-7 w-7" : ""
              }`}
            >
              <ChevronRight className={`${
                compact ? "w-3 h-3" : "w-4 h-4"
              }`} />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.setPageIndex(table.getPageCount() - 1)}
              disabled={!table.getCanNextPage()}
              className={`bg-white border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400 disabled:opacity-50 disabled:cursor-not-allowed ${
                compact ? "h-7 w-7" : ""
              }`}
            >
              <ChevronsRight className={`${
                compact ? "w-3 h-3" : "w-4 h-4"
              }`} />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
