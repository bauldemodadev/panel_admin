"use client";
import {
  X,
  Plus,
  Search,
  Filter,
  Calendar,
  Users,
  Target,
  RefreshCw,
  Kanban,
} from "lucide-react";
import { useState, useMemo } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DataTableViewOptions } from "./data-table-view-options";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarIcon } from "@/components/ui/calendar";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import ReactDatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import Link from "next/link";

// Componente para seleccionar fechas individuales (Desde y Hasta) usando react-datepicker
function DatePickers({ dateRange, setDateRange }) {
  return (
    <div className="flex gap-2 items-end">
      <div>
        <label className="block text-xs mb-1">Desde</label>
        <ReactDatePicker
          selected={dateRange.from}
          onChange={(date) => setDateRange((r) => ({ ...r, from: date }))}
          selectsStart
          startDate={dateRange.from}
          endDate={dateRange.to}
          dateFormat="dd/MM/yyyy"
          placeholderText="Desde"
          className="h-9 w-[120px] rounded border border-border bg-background text-foreground px-2"
          locale={es}
        />
      </div>
      <div>
        <label className="block text-xs mb-1">Hasta</label>
        <ReactDatePicker
          selected={dateRange.to}
          onChange={(date) => setDateRange((r) => ({ ...r, to: date }))}
          selectsEnd
          startDate={dateRange.from}
          endDate={dateRange.to}
          minDate={dateRange.from}
          dateFormat="dd/MM/yyyy"
          placeholderText="Hasta"
          className="h-9 w-[120px] rounded border border-border bg-background text-foreground px-2"
          locale={es}
        />
      </div>
      {(dateRange.from || dateRange.to) && (
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setDateRange({ from: undefined, to: undefined })}
          title="Limpiar filtro de fecha"
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}

export function DataTableToolbar({ table }) {
  const [globalFilter, setGlobalFilter] = useState("");
  const [isFiltered, setIsFiltered] = useState(false);
  const [dateRange, setDateRange] = useState({
    from: undefined,
    to: undefined,
  });

  const isFilteredState =
    table.getState().columnFilters.length > 0 ||
    globalFilter ||
    dateRange.from ||
    dateRange.to;

  // Estados únicos para filtros
  const estados = useMemo(() => {
    const uniqueEstados = [
      ...new Set(table.options.data.map((item) => item.estado)),
    ];
    return uniqueEstados;
  }, [table.options.data]);

  const prioridades = useMemo(() => {
    const uniquePrioridades = [
      ...new Set(table.options.data.map((item) => item.prioridad)),
    ];
    return uniquePrioridades;
  }, [table.options.data]);

  const proyectos = useMemo(() => {
    const uniqueProyectos = [
      ...new Set(table.options.data.map((item) => item.proyecto)),
    ];
    return uniqueProyectos;
  }, [table.options.data]);

  // Colores para estados con soporte dark/light
  const estadoColors = {
    nuevo:
      "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700/50",
    "en seguimiento":
      "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-700/50",
    contactado:
      "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700/50",
  };

  // Colores para prioridades con soporte dark/light
  const prioridadColors = {
    alta: "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-700/50",
    media:
      "bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-700/50",
    baja: "bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600",
  };

  // Handler para crear un nuevo lead temporal
  const handleAddLead = () => {
    const id = `LEAD-TEMP-${Math.floor(Math.random() * 100000)}`;
    const newLead = {
      id,
      nombre: "Nuevo Lead",
      email: "",
      telefono: "",
      mensaje: "",
      estado: "nuevo",
      origen: "Meta",
      prioridad: "media",
      fecha: new Date().toISOString().slice(0, 10),
      proyecto: "",
    };

    table.options.data.unshift(newLead);
    table.setOptions({
      ...table.options,
      data: [...table.options.data],
    });
  };

  // Handler para búsqueda global
  const handleGlobalFilter = (value) => {
    setGlobalFilter(value);
    table.setGlobalFilter(value);
  };

  // Handler para limpiar todos los filtros
  const handleClearFilters = () => {
    setGlobalFilter("");
    setDateRange({ from: undefined, to: undefined });
    table.resetColumnFilters();
    table.setGlobalFilter("");
  };

  // Handler para filtro de fecha
  const handleDateFilter = (range) => {
    setDateRange(range);
    // Aquí podrías implementar el filtro de fecha en la tabla si lo deseas
  };

  return (
    <div className="space-y-4">
      {/* Búsqueda global y acciones principales */}
      <Card className="border border-border bg-gradient-to-r from-slate-50 to-gray-50 dark:from-slate-900/50 dark:to-gray-900/50">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4 md:gap-6">
            {/* Búsqueda global */}
            <div className="relative flex-1 min-w-[200px] w-full md:w-auto">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar en todos los campos..."
                value={globalFilter}
                onChange={(event) => handleGlobalFilter(event.target.value)}
                className="pl-10 h-10 border-border bg-background text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-primary w-full"
              />
            </div>

            {/* Botones de acción */}
            <div className="flex flex-wrap gap-2 w-full md:w-auto justify-start md:justify-end">
              <Button
                variant="outline"
                className="border-border hover:bg-accent w-full md:w-auto"
              >
                <Filter className="h-4 w-4 mr-2" />
                Exportar
              </Button>

              <Link href="/leads/kanban" className="w-full md:w-auto">
                <Button
                  variant="outline"
                  className="border-primary/30 text-primary hover:bg-primary/10 w-full md:w-auto"
                >
                  <Kanban className="h-4 w-4 mr-2" />
                  Ver Asignacion
                </Button>
              </Link>
              <Button
                variant="outline"
                onClick={handleClearFilters}
                disabled={!isFilteredState}
                className="h-10 px-4 border-border hover:bg-accent text-foreground w-full md:w-auto"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Limpiar
              </Button>
              <Button
                variant="default"
                onClick={handleAddLead}
                className="h-10 px-4 bg-primary hover:bg-primary/90 text-primary-foreground w-full md:w-auto"
              >
                <Plus className="h-4 w-4 mr-2" />
                Nuevo Lead
              </Button>
              <div className="w-full md:w-auto">
                <DataTableViewOptions table={table} />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filtros avanzados */}
      <Card className="border border-border bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Filter className="h-5 w-5 text-primary" />
            Filtros Avanzados
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Primera fila de filtros */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Filtro por nombre */}
            <div className="space-y-2 w-full">
              <label className="text-sm font-medium text-foreground">
                Nombre
              </label>
              <Input
                placeholder="Filtrar por nombre..."
                value={table.getColumn("nombre")?.getFilterValue() ?? ""}
                onChange={(event) =>
                  table.getColumn("nombre")?.setFilterValue(event.target.value)
                }
                className="h-9 border-border bg-background text-foreground placeholder:text-muted-foreground focus:border-primary w-full"
              />
            </div>
            {/* Filtro por teléfono */}
            <div className="space-y-2 w-full">
              <label className="text-sm font-medium text-foreground">
                Teléfono
              </label>
              <Input
                placeholder="Filtrar por teléfono..."
                value={table.getColumn("telefono")?.getFilterValue() ?? ""}
                onChange={(event) =>
                  table
                    .getColumn("telefono")
                    ?.setFilterValue(event.target.value)
                }
                className="h-9 border-border bg-background text-foreground placeholder:text-muted-foreground focus:border-primary w-full"
              />
            </div>
            {/* Filtro por fuente */}
            <div className="space-y-2 w-full">
              <label className="text-sm font-medium text-foreground">
                Fuente
              </label>
              <Input
                placeholder="Filtrar por fuente..."
                value={table.getColumn("fuente")?.getFilterValue() ?? ""}
                onChange={(event) =>
                  table.getColumn("fuente")?.setFilterValue(event.target.value)
                }
                className="h-9 border-border bg-background text-foreground placeholder:text-muted-foreground focus:border-primary w-full"
              />
            </div>
            {/* Filtro por fecha mejorado */}
            <div className="space-y-2 w-full">
              <label className="text-sm font-medium text-foreground">
                Fecha
              </label>
              <DatePickers
                dateRange={dateRange}
                setDateRange={handleDateFilter}
              />
            </div>
          </div>

          {/* Segunda fila de filtros */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Filtro por estado */}
            <div className="space-y-2 w-full">
              <label className="text-sm font-medium text-foreground">
                Estado
              </label>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => table.getColumn("estado")?.setFilterValue("")}
                  className={cn(
                    "h-8 text-xs border-border",
                    !table.getColumn("estado")?.getFilterValue()
                      ? "bg-primary/10 border-primary/30 text-primary"
                      : "hover:bg-accent"
                  )}
                >
                  Todos
                </Button>
                {estados.map((estado) => (
                  <Button
                    key={estado}
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      table.getColumn("estado")?.setFilterValue(estado)
                    }
                    className={cn(
                      "h-8 text-xs border-border",
                      table.getColumn("estado")?.getFilterValue() === estado
                        ? "bg-primary/10 border-primary/30 text-primary"
                        : "hover:bg-accent"
                    )}
                  >
                    <Badge
                      className={cn(
                        "mr-1 text-xs",
                        estadoColors[estado] || "bg-muted text-muted-foreground"
                      )}
                    >
                      {estado}
                    </Badge>
                  </Button>
                ))}
              </div>
            </div>

            {/* Filtro por prioridad */}
            <div className="space-y-2 w-full">
              <label className="text-sm font-medium text-foreground">
                Prioridad
              </label>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    table.getColumn("prioridad")?.setFilterValue("")
                  }
                  className={cn(
                    "h-8 text-xs border-border",
                    !table.getColumn("prioridad")?.getFilterValue()
                      ? "bg-primary/10 border-primary/30 text-primary"
                      : "hover:bg-accent"
                  )}
                >
                  Todas
                </Button>
                {prioridades.map((prioridad) => (
                  <Button
                    key={prioridad}
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      table.getColumn("prioridad")?.setFilterValue(prioridad)
                    }
                    className={cn(
                      "h-8 text-xs border-border",
                      table.getColumn("prioridad")?.getFilterValue() ===
                        prioridad
                        ? "bg-primary/10 border-primary/30 text-primary"
                        : "hover:bg-accent"
                    )}
                  >
                    <Badge
                      className={cn(
                        "mr-1 text-xs",
                        prioridadColors[prioridad] ||
                          "bg-muted text-muted-foreground"
                      )}
                    >
                      {prioridad}
                    </Badge>
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
