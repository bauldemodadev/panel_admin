"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Icon } from "@iconify/react";
import { db } from "@/lib/firebase";
import { collection, getDocs } from "firebase/firestore";
import { useAuth } from "@/provider/auth.provider";

const SalesStats = () => {
  const { user } = useAuth();
  const hoyISO = new Date().toISOString().split("T")[0];
  const hace30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];
  const now = new Date();
  const inicioMesISO = new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .split("T")[0];
  const [fechaDesde, setFechaDesde] = useState(inicioMesISO);
  const [fechaHasta, setFechaHasta] = useState(hoyISO);
  const [rangoRapido, setRangoRapido] = useState("month");

  const [ventasData, setVentasData] = useState([]);
  const [presupuestosData, setPresupuestosData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [clientesData, setClientesData] = useState({});
  const COMMISSION_RATE = 2.5; // % comisión fija para todos los clientes

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

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const ventasSnap = await getDocs(collection(db, "ventas"));
        setVentasData(ventasSnap.docs.map((doc) => ({ ...doc.data(), id: doc.id })));
        const presupuestosSnap = await getDocs(collection(db, "presupuestos"));
        setPresupuestosData(
          presupuestosSnap.docs.map((doc) => ({ ...doc.data(), id: doc.id }))
        );
        const clientesSnap = await getDocs(collection(db, "clientes"));
        const map = {};
        clientesSnap.docs.forEach((d) => {
          map[d.id] = { id: d.id, ...d.data() };
        });
        setClientesData(map);
      } catch (error) {
        console.error("Error al cargar datos de estadísticas:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

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

  const ventasFiltradas = useMemo(() => {
    return (ventasData || []).filter((v) => isInRange(v.fecha || v.fechaCreacion));
  }, [ventasData, isInRange]);

  const presupuestosFiltrados = useMemo(() => {
    return (presupuestosData || []).filter((p) => isInRange(p.fecha || p.fechaCreacion));
  }, [presupuestosData, isInRange]);

  const kpis = useMemo(() => {
    const ventasCount = ventasFiltradas.length;
    const ventasMonto = ventasFiltradas.reduce((acc, v) => acc + (Number(v.total) || 0), 0);
    const ticketPromedio = ventasCount > 0 ? ventasMonto / ventasCount : 0;

    const estados = ventasFiltradas.reduce(
      (acc, v) => {
        const e = (v.estadoPago || "").toLowerCase();
        if (e === "pagado") acc.pagado += 1;
        else if (e === "parcial") acc.parcial += 1;
        else acc.pendiente += 1;
        return acc;
      },
      { pagado: 0, parcial: 0, pendiente: 0 }
    );

    const envios = ventasFiltradas.reduce(
      (acc, v) => {
        const t = v.tipoEnvio || "";
        if (t === "envio_domicilio") acc.domicilio += 1;
        else if (t === "retiro_local") acc.retiro += 1;
        else acc.otro += 1;
        return acc;
      },
      { domicilio: 0, retiro: 0, otro: 0 }
    );

    const formasPago = ventasFiltradas.reduce((acc, v) => {
      const f = (v.formaPago || "-").toLowerCase();
      acc[f] = (acc[f] || 0) + 1;
      return acc;
    }, {});

    const prodMap = new Map();
    ventasFiltradas.forEach((v) => {
      const lineas = Array.isArray(v.productos) && v.productos.length > 0 ? v.productos : (v.items || []);
      lineas.forEach((l) => {
        const key = l.id || l.nombre || "sin-id";
        const prev = prodMap.get(key) || { nombre: l.nombre || key, unidades: 0, monto: 0 };
        const unidades = Number(l.cantidad) || 0;
        const montoLinea = (() => {
          if (typeof l.subtotal === "number") return l.subtotal;
          const precio = Number(l.precio) || 0;
          if ((l.categoria === "Maderas") && (l.subcategoria === "machimbre" || l.subcategoria === "deck")) {
            return precio;
          }
          return precio * (unidades || 1);
        })();
        prev.unidades += unidades;
        prev.monto += montoLinea;
        prodMap.set(key, prev);
      });
    });
    const topProductos = Array.from(prodMap.values())
      .sort((a, b) => b.monto - a.monto)
      .slice(0, 5);

    const presupuestosCount = presupuestosFiltrados.length;
    const conversionAprox = presupuestosCount > 0 ? (ventasCount / presupuestosCount) * 100 : 0;

    return {
      ventasCount,
      ventasMonto,
      ticketPromedio,
      estados,
      envios,
      formasPago,
      topProductos,
      presupuestosCount,
      conversionAprox,
    };
  }, [ventasFiltradas, presupuestosFiltrados]);

  const nf = useMemo(() => new Intl.NumberFormat("es-AR"), []);

  // Visual helpers
  const totalFormasPago = useMemo(() => {
    return Object.values(kpis.formasPago || {}).reduce((acc, n) => acc + (Number(n) || 0), 0);
  }, [kpis.formasPago]);

  const estadosTotal = kpis.estados.pagado + kpis.estados.parcial + kpis.estados.pendiente;
  const enviosTotal = kpis.envios.domicilio + kpis.envios.retiro + kpis.envios.otro;

  const conversionPct = useMemo(() => {
    const raw = Number.isFinite(kpis.conversionAprox) ? kpis.conversionAprox : 0;
    return Math.max(0, Math.min(100, Math.round(raw)));
  }, [kpis.conversionAprox]);
  const conversionLabel = useMemo(() => Math.round(Number(kpis.conversionAprox) || 0), [kpis.conversionAprox]);

  const palette = ["#22c55e", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#84cc16"]; 
  const fpSegments = useMemo(() => {
    const entries = Object.entries(kpis.formasPago || {});
    const sorted = entries.sort((a, b) => (Number(b[1]) || 0) - (Number(a[1]) || 0));
    let offset = 0;
    const segments = sorted.map(([label, value], idx) => {
      const val = Number(value) || 0;
      const pct = totalFormasPago ? (val / totalFormasPago) * 100 : 0;
      const seg = { label, value: val, pct, offset, color: palette[idx % palette.length] };
      offset += pct;
      return seg;
    });
    return segments;
  }, [kpis.formasPago, totalFormasPago]);

  const estadosSegments = useMemo(() => {
    return [
      { label: "Pagado", value: kpis.estados.pagado || 0, color: "#10b981" },
      { label: "Parcial", value: kpis.estados.parcial || 0, color: "#f59e0b" },
      { label: "Pendiente", value: kpis.estados.pendiente || 0, color: "#ef4444" },
    ];
  }, [kpis.estados.pagado, kpis.estados.parcial, kpis.estados.pendiente]);

  const enviosSegments = useMemo(() => {
    return [
      { label: "Domicilio", value: kpis.envios.domicilio || 0, color: "#3b82f6" },
      { label: "Retiro", value: kpis.envios.retiro || 0, color: "#6366f1" },
      { label: "Otro", value: kpis.envios.otro || 0, color: "#64748b" },
    ];
  }, [kpis.envios.domicilio, kpis.envios.retiro, kpis.envios.otro]);

  // Clientes nuevos vs viejos (solo clientes que aparecen en ventas del rango)
  const clientesCounts = useMemo(() => {
    let nuevo = 0;
    let viejo = 0;
    const ids = new Set((ventasFiltradas || []).map((v) => v.clienteId).filter(Boolean));
    ids.forEach((id) => {
      const c = clientesData[id];
      if (!c) return;
      if (c.esClienteViejo) viejo += 1; else nuevo += 1;
    });
    return { nuevo, viejo };
  }, [ventasFiltradas, clientesData]);

  const clientesTotal = useMemo(() => clientesCounts.nuevo + clientesCounts.viejo, [clientesCounts]);

  const clientesSegments = useMemo(() => {
    return [
      { label: "Nuevos", value: clientesCounts.nuevo || 0, color: "#14b8a6" },
      { label: "Viejos", value: clientesCounts.viejo || 0, color: "#f97316" },
    ];
  }, [clientesCounts]);

  // Comisión sobre ventas (2.5% para todos los clientes)
  const comisionesPorTipoCliente = useMemo(() => {
    let totalVentasConCliente = 0;
    let ventasSinCliente = 0;
    let totalVentasProcesadas = 0;
    let ventasClienteNoEncontradoIds = [];
    
    ventasFiltradas.forEach((venta) => {
      let clienteEncontrado = null;
      
      // Buscar cliente por clienteId primero
      if (venta.clienteId) {
        clienteEncontrado = clientesData[venta.clienteId];
      }
      
      // Si no se encontró por clienteId, buscar por teléfono del objeto cliente
      if (!clienteEncontrado && venta.cliente && venta.cliente.telefono) {
        const telefono = venta.cliente.telefono;
        // Buscar en clientesData por teléfono
        for (const [clienteId, cliente] of Object.entries(clientesData)) {
          if (cliente.telefono === telefono) {
            clienteEncontrado = cliente;
            break;
          }
        }
      }
      
      // Si no se encontró por teléfono, buscar por CUIT del objeto cliente
      if (!clienteEncontrado && venta.cliente && venta.cliente.cuit) {
        const cuit = venta.cliente.cuit;
        // Buscar en clientesData por CUIT
        for (const [clienteId, cliente] of Object.entries(clientesData)) {
          if (cliente.cuit === cuit) {
            clienteEncontrado = cliente;
            break;
          }
        }
      }
      
      if (!clienteEncontrado) {
        ventasSinCliente++;
        ventasClienteNoEncontradoIds.push({
          id: venta.id,
          numeroPedido: venta.numeroPedido,
          cliente: venta.cliente,
          monto: venta.total
        });
        return;
      }
      
      const montoVenta = Number(venta.total) || 0;
      totalVentasProcesadas += montoVenta;
      totalVentasConCliente += montoVenta;
    });
    
    // Calcular comisión: 2.5% para todas las ventas con cliente
    const comisionTotal = totalVentasConCliente * (COMMISSION_RATE / 100);
    
    // Debug logs
    console.log('=== DEBUG COMISIONES ===');
    console.log('Total ventas filtradas:', ventasFiltradas.length);
    console.log('Total monto ventas filtradas:', kpis.ventasMonto);
    console.log('Total ventas procesadas:', totalVentasProcesadas);
    console.log('Total ventas con cliente:', totalVentasConCliente);
    console.log('Ventas con cliente no encontrado:', ventasClienteNoEncontradoIds);
    console.log('Comisión total (2.5%):', comisionTotal);
    console.log('========================');
    
    return {
      totalVentasConCliente,
      comisionTotal,
      ventasSinCliente,
      totalVentasProcesadas,
      ventasClienteNoEncontradoIds
    };
  }, [ventasFiltradas, clientesData, kpis.ventasMonto, COMMISSION_RATE]);

  // Eliminar cálculos anteriores que ya no se usan
  // const totalVendidoClientesNuevos = useMemo(() => {
  //   const idsNuevos = new Set(
  //     Object.entries(clientesData)
  //       .filter(([_, c]) => !c.esClienteViejo)
  //       .map(([id]) => id)
  //   );
  //   return ventasFiltradas
  //     .filter((v) => v.clienteId && idsNuevos.has(v.clienteId))
  //     .reduce((acc, v) => acc + (Number(v.total) || 0), 0);
  // }, [ventasFiltradas, clientesData]);

  // const ventasProporcionalesNuevos = useMemo(() => {
  //   const total = Number(kpis.ventasMonto) || 0;
  //   const propor = clientesTotal > 0 ? (clientesCounts.nuevo / clientesTotal) : 0;
  //   return total * propor;
  // }, [kpis.ventasMonto, clientesTotal, clientesCounts.nuevo]);

  // const comisionClientesNuevos = useMemo(() => {
  //   return ventasProporcionalesNuevos * 0.008;
  // }, [ventasProporcionalesNuevos]);

  const Chart = useMemo(() => dynamic(() => import("react-apexcharts"), { ssr: false }), []);

  // Apex options
  const conversionOptions = useMemo(() => ({
    chart: { toolbar: { show: false } },
    labels: ["Convertido", "Restante"],
    stroke: { width: 0 },
    legend: { show: false },
    dataLabels: { enabled: false },
    colors: ["#10b981", "#e5e7eb"],
    plotOptions: {
      pie: {
        donut: {
          size: "70%",
          labels: {
            show: true,
            name: { show: false },
            value: { show: false },
            total: {
              show: true,
              label: "",
              formatter: () => `${conversionPct}%`,
            },
          },
        },
      },
    },
  }), [conversionPct]);

  const estadosOptions = useMemo(() => ({
    chart: { toolbar: { show: false } },
    labels: estadosSegments.map((s) => s.label.toUpperCase()),
    stroke: { width: 0 },
    legend: { show: false },
    dataLabels: { enabled: false },
    colors: estadosSegments.map((s) => s.color),
    plotOptions: {
      pie: {
        donut: {
          size: "78%",
          labels: {
            show: true,
            name: { show: false },
            value: { show: false },
            total: {
              show: true,
              label: "Total",
              formatter: () => `${estadosTotal}`,
            },
          },
        },
      },
    },
  }), [estadosSegments, estadosTotal]);

  const enviosOptions = useMemo(() => ({
    chart: { toolbar: { show: false } },
    labels: enviosSegments.map((s) => s.label.toUpperCase()),
    stroke: { width: 0 },
    legend: { show: false },
    dataLabels: { enabled: false },
    colors: enviosSegments.map((s) => s.color),
    plotOptions: {
      pie: {
        donut: {
          size: "78%",
          labels: {
            show: true,
            name: { show: false },
            value: { show: false },
            total: {
              show: true,
              label: "Total",
              formatter: () => `${enviosTotal}`,
            },
          },
        },
      },
    },
  }), [enviosSegments, enviosTotal]);

  const clientesOptions = useMemo(() => ({
    chart: { toolbar: { show: false } },
    labels: clientesSegments.map((s) => s.label.toUpperCase()),
    stroke: { width: 0 },
    legend: { show: false },
    dataLabels: { enabled: false },
    colors: clientesSegments.map((s) => s.color),
    plotOptions: {
      pie: {
        donut: {
          size: "78%",
          labels: {
            show: true,
            name: { show: false },
            value: { show: false },
            total: {
              show: true,
              label: "Total",
              formatter: () => `${clientesTotal}`,
            },
          },
        },
      },
    },
  }), [clientesSegments, clientesTotal]);

  const formasPagoOptions = useMemo(() => ({
    chart: { toolbar: { show: false } },
    labels: fpSegments.map((s) => s.label.toUpperCase()),
    stroke: { width: 0 },
    legend: { show: false },
    dataLabels: { enabled: false },
    colors: fpSegments.map((s) => s.color),
    plotOptions: {
      pie: {
        donut: {
          size: "78%",
          labels: {
            show: true,
            name: { show: false },
            value: { show: false },
            total: {
              show: true,
              label: "Total",
              formatter: () => `${totalFormasPago}`,
            },
          },
        },
      },
    },
  }), [fpSegments, totalFormasPago]);

  const QuickRangeButton = ({ value, label, icon }) => (
    <button
      type="button"
      onClick={() => setRangoRapido(value)}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold border transition-all ${
        rangoRapido === value
          ? "bg-primary text-white border-primary shadow-sm"
          : "bg-card border-default-300 text-default-700 hover:bg-default-100"
      }`}
      aria-pressed={rangoRapido === value}
    >
      {icon ? <Icon icon={icon} className="w-3.5 h-3.5" /> : null}
      {label}
    </button>
  );

  const Skeleton = () => (
    <div className="animate-pulse space-y-4">
      <div className="h-9 w-64 bg-default-200 rounded" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="p-4 rounded-lg border bg-card">
            <div className="h-4 w-24 bg-default-200 rounded mb-3" />
            <div className="h-7 w-20 bg-default-200 rounded" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="p-4 rounded-lg border bg-card h-28" />
        ))}
      </div>
      <div className="p-4 rounded-lg border bg-card h-24" />
      <div className="p-4 rounded-lg border bg-card h-64" />
    </div>
  );

  return (
    <Card className="rounded-xl shadow-md border border-default-200/70">
      <CardHeader className="pb-3 border-b border-default-100/80 bg-gradient-to-r from-default-50 to-default-100 rounded-t-xl">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <CardTitle className="text-2xl font-bold text-default-900 flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-primary/10 text-primary">
              <Icon icon="heroicons:chart-bar" className="w-5 h-5" />
            </span>
            Estadísticas de Ventas
          </CardTitle>
          <div className="flex items-center gap-2">
            <QuickRangeButton value="month" label="Mes" icon="heroicons:calendar-days" />
            <QuickRangeButton value="7d" label="7d" icon="heroicons:bolt" />
            <QuickRangeButton value="30d" label="30d" icon="heroicons:calendar-days" />
            <QuickRangeButton value="90d" label="90d" icon="heroicons:clock" />
            <QuickRangeButton value="ytd" label="YTD" icon="heroicons:chart-pie" />
            <QuickRangeButton value="custom" label="Personalizado" icon="heroicons:adjustments-horizontal" />
          </div>
        </div>
        {rangoRapido === "custom" && (
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-sm text-default-600">Desde</span>
              <input type="date" value={fechaDesde} onChange={(e) => setFechaDesde(e.target.value)} className="border rounded-md px-2 py-1 h-9" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-default-600">Hasta</span>
              <input type="date" value={fechaHasta} onChange={(e) => setFechaHasta(e.target.value)} className="border rounded-md px-2 py-1 h-9" />
            </div>
          </div>
        )}
        {/* Comisión fija 0.8% - sin input editable */}
      </CardHeader>
      <CardContent className="pt-4 space-y-4">
        {loading ? (
          <Skeleton />
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Ventas */}
              <div className="p-4 rounded-xl border border-default-200 bg-gradient-to-br from-primary/5 to-primary/10 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm text-default-700">Ventas</div>
                  <span className="inline-flex w-8 h-8 items-center justify-center rounded-md bg-primary/15 text-primary">
                    <Icon icon="heroicons:shopping-cart" className="w-4 h-4" />
                  </span>
                </div>
                <div className="text-3xl font-extrabold tracking-tight">{kpis.ventasCount}</div>
              </div>
              {/* Monto */}
              <div className="p-4 rounded-xl border border-default-200 bg-gradient-to-br from-emerald-50 to-emerald-100/40 dark:from-emerald-900/20 dark:to-emerald-900/10 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm text-emerald-700 dark:text-emerald-300">Monto vendido</div>
                  <span className="inline-flex w-8 h-8 items-center justify-center rounded-md bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                    <Icon icon="heroicons:banknotes" className="w-4 h-4" />
                  </span>
                </div>
                <div className="text-3xl font-extrabold tracking-tight">$ {nf.format(kpis.ventasMonto)}</div>
              </div>
              {/* Ticket */}
              <div className="p-4 rounded-xl border border-default-200 bg-gradient-to-br from-indigo-50 to-indigo-100/40 dark:from-indigo-900/20 dark:to-indigo-900/10 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm text-indigo-700 dark:text-indigo-300">Ticket promedio</div>
                  <span className="inline-flex w-8 h-8 items-center justify-center rounded-md bg-indigo-500/15 text-indigo-600 dark:text-indigo-400">
                    <Icon icon="heroicons:chart-bar-square" className="w-4 h-4" />
                  </span>
                </div>
                <div className="text-3xl font-extrabold tracking-tight">$ {nf.format(Math.round(kpis.ticketPromedio))}</div>
              </div>
              {/* Presupuestos */}
              <div className="p-4 rounded-xl border border-default-200 bg-gradient-to-br from-amber-50 to-amber-100/40 dark:from-amber-900/20 dark:to-amber-900/10 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm text-amber-700 dark:text-amber-300">Presupuestos</div>
                  <span className="inline-flex w-8 h-8 items-center justify-center rounded-md bg-amber-500/15 text-amber-600 dark:text-amber-400">
                    <Icon icon="heroicons:document-text" className="w-4 h-4" />
                  </span>
                </div>
                <div className="text-3xl font-extrabold tracking-tight">{kpis.presupuestosCount}</div>
              </div>
              {/* Comisión por ventas (2.5% para todos) */}
              <div className="p-4 rounded-xl border border-default-200 bg-gradient-to-br from-fuchsia-50 to-fuchsia-100/40 dark:from-fuchsia-900/20 dark:to-fuchsia-900/10 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm text-fuchsia-700 dark:text-fuchsia-300">Comisión por ventas</div>
                  <span className="inline-flex w-8 h-8 items-center justify-center rounded-md bg-fuchsia-500/15 text-fuchsia-600 dark:text-fuchsia-400">
                    <Icon icon="heroicons:currency-dollar" className="w-4 h-4" />
                  </span>
                </div>
                <div className="text-3xl font-extrabold tracking-tight">$ {nf.format(Math.round(comisionesPorTipoCliente.comisionTotal))}</div>
                <div className="text-xs text-default-500 space-y-1">
                  <div>
                    <span className="font-semibold text-fuchsia-700">Tasa fija:</span> 2.5%
                  </div>
                  <div>
                    <span className="font-semibold text-fuchsia-700">Ventas con cliente:</span> ${nf.format(Math.round(comisionesPorTipoCliente.totalVentasConCliente))}
                  </div>
                  <div className="pt-1 border-t border-fuchsia-200">
                    <span className="font-semibold text-fuchsia-700">Total comisión:</span> ${nf.format(Math.round(comisionesPorTipoCliente.comisionTotal))}
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Estado de pago (donut) */}
              <div className="p-4 rounded-xl border border-default-200 bg-card shadow-sm">
                <div className="text-sm font-semibold mb-3">Estado de pago</div>
                <div className="flex items-center gap-6">
                  <div className="shrink-0 w-[200px] h-[200px]">
                    {typeof window !== "undefined" && (
                      <Chart
                        options={estadosOptions}
                        series={estadosSegments.map((s) => s.value)}
                        type="donut"
                        height={200}
                        width={200}
                      />
                    )}
                  </div>
                  <div className="flex-1 grid grid-cols-1 gap-2 text-sm">
                    {estadosSegments.map((seg) => {
                      const pct = estadosTotal ? Math.round((seg.value / estadosTotal) * 100) : 0;
                      const color = seg.color;
                      return (
                        <div key={seg.label} className="flex items-center justify-between gap-2">
                          <span className="inline-flex items-center gap-2 text-default-700">
                            <span className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
                            {seg.label}
                          </span>
                          <span className="font-semibold">{seg.value} ({pct}%)</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
              {/* Tipo de envío (donut) */}
              <div className="p-4 rounded-xl border border-default-200 bg-card shadow-sm">
                <div className="text-sm font-semibold mb-3">Tipo de envío</div>
                <div className="flex items-center gap-6">
                  <div className="shrink-0 w-[200px] h-[200px]">
                    {typeof window !== "undefined" && (
                      <Chart
                        options={enviosOptions}
                        series={enviosSegments.map((s) => s.value)}
                        type="donut"
                        height={200}
                        width={200}
                      />
                    )}
                  </div>
                  <div className="flex-1 grid grid-cols-1 gap-2 text-sm">
                    {enviosSegments.map((seg) => {
                      const pct = enviosTotal ? Math.round((seg.value / enviosTotal) * 100) : 0;
                      const color = seg.color;
                      return (
                        <div key={seg.label} className="flex items-center justify-between gap-2">
                          <span className="inline-flex items-center gap-2 text-default-700">
                            <span className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
                            {seg.label}
                          </span>
                          <span className="font-semibold">{seg.value} ({pct}%)</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
              {/* Formas de pago - donut segmentado (ubicado al lado de Tipo de envío) */}
              <div className="p-4 rounded-xl border border-default-200 bg-card shadow-sm">
                <div className="text-sm font-semibold mb-3">Formas de pago</div>
                {totalFormasPago === 0 ? (
                  <div className="text-default-500 text-sm">Sin datos</div>
                ) : (
                  <div className="flex items-center gap-6">
                    <div className="shrink-0 w-[200px] h-[200px]">
                      {typeof window !== "undefined" && (
                        <Chart
                          options={formasPagoOptions}
                          series={fpSegments.map((s) => s.value)}
                          type="donut"
                          height={200}
                          width={200}
                        />
                      )}
                    </div>
                    <div className="flex-1 grid grid-cols-1 gap-2 text-sm overflow-hidden">
                      {fpSegments.map((seg) => {
                        const pct = totalFormasPago ? Math.round((seg.value / totalFormasPago) * 100) : 0;
                        return (
                          <div key={seg.label} className="flex items-center justify-between gap-2">
                            <span className="inline-flex items-center gap-2 text-default-700 truncate">
                              <span className="w-2.5 h-2.5 rounded-full" style={{ background: seg.color }} />
                              <span className="truncate max-w-[220px]">{seg.label.toUpperCase()}</span>
                            </span>
                            <span className="font-semibold whitespace-nowrap">{seg.value} ({pct}%)</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
              {/* Clientes nuevos vs viejos */}
              <div className="p-4 rounded-xl border border-default-200 bg-card shadow-sm">
                <div className="text-sm font-semibold mb-3">Clientes (nuevos vs viejos)</div>
                {clientesTotal === 0 ? (
                  <div className="text-default-500 text-sm">Sin datos</div>
                ) : (
                  <div className="flex items-center gap-6">
                    <div className="shrink-0 w-[200px] h-[200px]">
                      {typeof window !== "undefined" && (
                        <Chart
                          options={clientesOptions}
                          series={clientesSegments.map((s) => s.value)}
                          type="donut"
                          height={200}
                          width={200}
                        />
                      )}
                    </div>
                    <div className="flex-1 grid grid-cols-1 gap-2 text-sm">
                      {clientesSegments.map((seg) => {
                        const pct = clientesTotal ? Math.round((seg.value / clientesTotal) * 100) : 0;
                        const color = seg.color;
                        return (
                          <div key={seg.label} className="flex items-center justify-between gap-2">
                            <span className="inline-flex items-center gap-2 text-default-700">
                              <span className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
                              {seg.label}
                            </span>
                            <span className="font-semibold">{seg.value} ({pct}%)</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Top productos (monto) */}
            {/* <div className="p-4 rounded-xl border border-default-200 bg-card shadow-sm">
              <div className="text-sm font-semibold mb-2">Top productos (monto)</div>
              {kpis.topProductos.length === 0 ? (
                <div className="text-default-500 text-sm">Sin datos en el rango</div>
              ) : (
                <div className="space-y-2">
                  {kpis.topProductos.map((p, idx) => (
                    <div
                      key={p.nombre}
                      className="flex items-center justify-between gap-4 p-3 rounded-lg border border-default-200 bg-default-50/50 hover:bg-default-100/60 shadow-sm transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="w-7 h-7 rounded-full bg-primary/10 text-primary ring-1 ring-primary/20 flex items-center justify-center text-xs font-bold">
                          {idx + 1}
                        </span>
                        <div className="truncate">
                          <div className="text-sm font-semibold truncate">{p.nombre}</div>
                          <div className="text-xs text-default-500">{p.unidades} unidades</div>
                        </div>
                      </div>
                      <div className="text-sm font-semibold whitespace-nowrap">$ {nf.format(Math.round(p.monto))}</div>
                    </div>
                  ))}
                </div>
              )}
            </div> */}
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default SalesStats;


