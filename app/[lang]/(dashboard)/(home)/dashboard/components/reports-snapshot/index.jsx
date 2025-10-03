"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ReportsChart from "./reports-chart";
import { useThemeStore } from "@/store";
import { useTheme } from "next-themes";
import { themes } from "@/config/themes";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import DashboardSelect from "@/components/dasboard-select";
import { cn } from "@/lib/utils";
import { useLeads } from "@/hooks/useLeads";
import { useState } from "react";

const ReportsSnapshot = () => {
  // Simulación de datos POS para maderera
  const [loading] = useState(false);
  // Datos simulados
  const ventasTotales = 152000; // en pesos
  const productosVendidos = 320;
  const ingresosPorCategoria = [
    { categoria: "Maderas", monto: 90000 },
    { categoria: "Tableros", monto: 40000 },
    { categoria: "Insumos", monto: 22000 },
  ];
  const stockBajo = [
    { producto: "Madera Pino 2x4", stock: 5 },
    { producto: "Tablero MDF 18mm", stock: 2 },
  ];
  const clientesNuevos = 12;

  // Series para gráficos (simulados)
  function getSeriesVentas() {
    // Ventas últimos 10 días
    return [{ data: [12, 15, 10, 18, 20, 22, 19, 25, 30, 31] }];
  }
  function getSeriesProductos() {
    // Productos vendidos últimos 10 días
    return [{ data: [20, 22, 18, 25, 30, 28, 32, 35, 40, 50] }];
  }
  function getSeriesCategorias() {
    // Ingresos por categoría
    return [
      { data: ingresosPorCategoria.map((c) => c.monto) },
    ];
  }
  function getSeriesClientes() {
    // Nuevos clientes últimos 10 días
    return [{ data: [1, 0, 2, 1, 3, 2, 1, 1, 0, 1] }];
  }

  const tabsTrigger = [
    {
      value: "ventas",
      text: "Ventas totales",
      total: `$${ventasTotales.toLocaleString()}`,
      color: "primary",
    },
    {
      value: "productos",
      text: "Productos vendidos",
      total: productosVendidos,
      color: "success",
    },
    {
      value: "categorias",
      text: "Ingresos por categoría",
      total: `$${ingresosPorCategoria.reduce((a, b) => a + b.monto, 0).toLocaleString()}`,
      color: "warning",
    },
    {
      value: "clientes",
      text: "Clientes nuevos",
      total: clientesNuevos,
      color: "info",
    },
  ];
  const tabsContentData = [
    {
      value: "ventas",
      series: getSeriesVentas(),
      color: "hsl(220, 90%, 56%)",
    },
    {
      value: "productos",
      series: getSeriesProductos(),
      color: "hsl(140, 70%, 45%)",
    },
    {
      value: "categorias",
      series: getSeriesCategorias(),
      color: "hsl(40, 90%, 60%)",
      categorias: ingresosPorCategoria,
    },
    {
      value: "clientes",
      series: getSeriesClientes(),
      color: "hsl(200, 90%, 60%)",
    },
  ];
  return (
    <Card>
      <CardHeader className="border-none pb-0">
        <div className="flex items-center gap-2 flex-wrap ">
          <div className="flex-1">
            <div className="text-xl font-semibold text-default-900 whitespace-nowrap">
              Estadísticas POS
            </div>
            <span className="text-xs text-default-600">
              Resumen de ventas y stock
            </span>
          </div>
          <div className="flex-none">
            <DashboardSelect />
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-1 md:p-5">
        {loading ? (
          <div className="p-8 text-center text-muted-foreground">
            Cargando datos...
          </div>
        ) : (
          <Tabs defaultValue="ventas">
            <TabsList className="grid grid-cols-2 lg:grid-cols-4 gap-2 md:gap-6 justify-start w-full bg-transparent h-full">
              {tabsTrigger.map((item, index) => (
                <TabsTrigger
                  key={`report-trigger-${index}`}
                  value={item.value}
                  className={cn(
                    "flex flex-col gap-1.5 p-4 overflow-hidden   items-start  relative before:absolute before:left-1/2 before:-translate-x-1/2 before:bottom-1 before:h-[2px] before:w-9 before:bg-primary/50 dark:before:bg-primary-foreground before:hidden data-[state=active]:shadow-none data-[state=active]:before:block",
                    {
                      "bg-primary/30 data-[state=active]:bg-primary/50 dark:bg-primary/70":
                        item.color === "primary",
                      "bg-warning/30 data-[state=active]:bg-warning/50 dark:bg-orange-500":
                        item.color === "warning",
                      "bg-success/30 data-[state=active]:bg-success/50 dark:bg-green-500":
                        item.color === "success",
                      "bg-info/30 data-[state=active]:bg-info/50 dark:bg-cyan-500 ":
                        item.color === "info",
                    }
                  )}
                >
                  <span className="text-sm text-default-800 dark:text-primary-foreground font-semibold capitalize relative z-10">
                    {item.text}
                  </span>
                  <span
                    className={`text-lg font-semibold text-${item.color}/80 dark:text-primary-foreground`}
                  >
                    {item.total}
                  </span>
                </TabsTrigger>
              ))}
            </TabsList>
            {/* datos de los charts */}
            {tabsContentData.map((item, index) => (
              <TabsContent key={`report-tab-${index}`} value={item.value}>
                <ReportsChart series={item.series} chartColor={item.color} />
                {/* Mostrar detalle de categorías si corresponde */}
                {item.value === "categorias" && (
                  <div className="mt-4">
                    <div className="font-semibold mb-2">Detalle por categoría:</div>
                    <ul className="text-sm">
                      {item.categorias.map((cat, i) => (
                        <li key={i}>
                          {cat.categoria}: <span className="font-bold">${cat.monto.toLocaleString()}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {/* Mostrar productos con stock bajo */}
                {item.value === "productos" && (
                  <div className="mt-4">
                    <div className="font-semibold mb-2">Productos con stock bajo:</div>
                    <ul className="text-sm">
                      {stockBajo.map((prod, i) => (
                        <li key={i}>
                          {prod.producto}: <span className="font-bold">{prod.stock} unidades</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </TabsContent>
            ))}
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
};

export default ReportsSnapshot;
