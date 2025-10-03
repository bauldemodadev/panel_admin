"use client";
import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Filter, Search } from "lucide-react";

const CatalogoVentas = ({
  titulo = "Catálogo de productos",
  productos = [],
  productosPorCategoria = {},
  categorias = [],
  itemsSeleccionados = [],
  onAgregarProducto,
  onAgregarProductoManual,
  editando = false,
  maxProductos = 48,
  showFilters = true,
  showSearch = true,
  showPagination = true,
  productosPorPagina = 12
}) => {
  const [categoriaId, setCategoriaId] = useState("");
  const [busquedaProducto, setBusquedaProducto] = useState("");
  const [busquedaDefer, setBusquedaDefer] = useState("");
  const [paginaActual, setPaginaActual] = useState(1);
  const [isPending, startTransition] = React.useTransition();
  const [filtroTipoMadera, setFiltroTipoMadera] = useState("");
  const [filtroSubCategoria, setFiltroSubCategoria] = useState("");

  // Debounce para búsqueda
  useEffect(() => {
    const id = setTimeout(() => setBusquedaDefer(busquedaProducto), 100);
    return () => clearTimeout(id);
  }, [busquedaProducto]);

  // Reset al cambiar filtros
  useEffect(() => {
    setPaginaActual(1);
  }, [categoriaId, busquedaDefer, filtroTipoMadera, filtroSubCategoria]);

  // Normalizador de texto
  const normalizarTexto = useCallback((texto) => {
    if (!texto) return "";
    return texto.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "");
  }, []);

  // Obtener tipos de madera únicos
  const tiposMadera = useMemo(() => {
    if (categoriaId !== "Maderas") return [];
    const productosMadera = productosPorCategoria["Maderas"] || [];
    return [...new Set(productosMadera.map(p => p.tipoMadera).filter(Boolean))];
  }, [categoriaId, productosPorCategoria]);

  // Obtener subcategorías de ferretería únicas
  const subCategoriasFerreteria = useMemo(() => {
    if (categoriaId !== "Ferretería") return [];
    const productosFerreteria = productosPorCategoria["Ferretería"] || [];
    return [...new Set(productosFerreteria.map(p => p.subCategoria).filter(Boolean))];
  }, [categoriaId, productosPorCategoria]);

  // Filtro catálogo con deferred value
  const productosFiltrados = useMemo(() => {
    let fuente;
    const hayBusqueda = !!(busquedaDefer && busquedaDefer.trim() !== "");
    if (hayBusqueda) {
      if (categoriaId) {
        const localCat = productosPorCategoria[categoriaId] || [];
        fuente = localCat;
      } else {
        fuente = productos;
      }
    } else if (categoriaId) {
      fuente = productosPorCategoria[categoriaId];
    }
    if (!fuente) fuente = productos;

    const busq = normalizarTexto(busquedaDefer);
    return fuente
      .filter((prod) => {
        const nombre = normalizarTexto(prod.nombre);
        const unidad = normalizarTexto(prod.unidad || prod.unidadMedida || "");
        
        // Filtro por búsqueda de texto
        let cumpleBusqueda = busq === "";
        if (busq !== "") {
          if (busq.endsWith(".")) {
            const sinPunto = busq.slice(0, -1);
            cumpleBusqueda = nombre.startsWith(sinPunto) || unidad.startsWith(sinPunto);
          } else {
            cumpleBusqueda = nombre.includes(busq) || unidad.includes(busq);
          }
        }

        // Filtro por categoría seleccionada
        const cumpleCategoria = !categoriaId || prod.categoria === categoriaId;

        // Filtro específico por tipo de madera
        const cumpleTipoMadera = categoriaId !== "Maderas" || filtroTipoMadera === "" || prod.tipoMadera === filtroTipoMadera;

        // Filtro específico por subcategoría de ferretería
        const cumpleSubCategoria = categoriaId !== "Ferretería" || filtroSubCategoria === "" || prod.subCategoria === filtroSubCategoria;

        return cumpleCategoria && cumpleBusqueda && cumpleTipoMadera && cumpleSubCategoria;
      })
      .sort((a, b) => {
        // Ordenar por stock: primero los que tienen stock, luego los que no
        const stockA = Number(a.stock) || 0;
        const stockB = Number(b.stock) || 0;
        if (stockA > 0 && stockB === 0) return -1;
        if (stockA === 0 && stockB > 0) return 1;
        return 0;
      });
  }, [productos, productosPorCategoria, categoriaId, busquedaDefer, filtroTipoMadera, filtroSubCategoria, normalizarTexto]);

  // Paginación derivada
  const totalProductos = productosFiltrados.length;
  const totalPaginas = Math.ceil(totalProductos / productosPorPagina) || 1;
  const productosPaginados = useMemo(() => {
    const inicio = (paginaActual - 1) * productosPorPagina;
    const fin = inicio + productosPorPagina;
    return productosFiltrados.slice(inicio, fin);
  }, [productosFiltrados, paginaActual, productosPorPagina]);

  // Función para cambiar de página
  const cambiarPagina = useCallback((nuevaPagina) => {
    startTransition(() => {
      setPaginaActual(Math.max(1, Math.min(nuevaPagina, totalPaginas)));
    });
  }, [totalPaginas, startTransition]);

  // Función para formatear números argentinos
  const formatARNumber = (value) => {
    const num = Number(value || 0);
    if (Number.isNaN(num)) return "0";
    return num.toLocaleString("es-AR", { minimumFractionDigits: 0 });
  };

  if (!editando) {
    return null;
  }

  return (
    <section className="bg-card rounded-xl border border-default-200 shadow-sm overflow-hidden">
      {/* Header con estadísticas */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <svg
                className="w-6 h-6 text-blue-600 dark:text-blue-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Productos
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Selecciona los productos para tu venta
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onAgregarProductoManual}
              disabled={!editando}
              className="text-xs px-3 py-1 bg-green-50 text-green-700 border-green-200 hover:bg-green-100"
            >
              <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Agregar Ejemplo
            </Button>
            <div className="text-right">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {itemsSeleccionados.length}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                productos agregados
              </div>
            </div>
            {/* Indicador de rendimiento */}
            <div className="text-right">
              <div className="text-sm font-medium text-gray-600 dark:text-gray-400">
                {productosFiltrados.length} / {productosPorCategoria[categoriaId]?.length || 0}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                productos filtrados
              </div>
            </div>
          </div>
        </div>

        {/* Filtros mejorados */}
        <div className="flex flex-col gap-3">
          {/* Filtro de categorías */}
          <div className="flex-1">
            <div className="flex bg-white dark:bg-gray-800 rounded-lg p-1 shadow-sm border border-gray-200 dark:border-gray-600">
              {categorias.map((categoria) => (
                <button
                  key={categoria}
                  type="button"
                  className={`rounded-full px-4 py-1 text-sm flex items-center gap-2 transition-all ${
                    categoriaId === categoria
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                  onClick={() => {
                    if (categoriaId === categoria) {
                      setCategoriaId("");
                      setFiltroTipoMadera("");
                      setFiltroSubCategoria("");
                    } else {
                      setCategoriaId(categoria);
                      setFiltroTipoMadera("");
                      setFiltroSubCategoria("");
                    }
                  }}
                  disabled={!editando}
                >
                  {categoria}
                </button>
              ))}
            </div>
          </div>

          {/* Filtros específicos por categoría */}
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Filtro de tipo de madera */}
            {categoriaId === "Maderas" && tiposMadera.length > 0 && (
              <div className="flex-1">
                <div className="flex bg-white dark:bg-gray-800 rounded-lg p-1 shadow-sm border border-gray-200 dark:border-gray-600">
                  <button
                    type="button"
                    className={`rounded-full px-4 py-1 text-sm flex items-center gap-2 transition-all ${
                      filtroTipoMadera === ""
                        ? "bg-orange-600 text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                    onClick={() => setFiltroTipoMadera("")}
                    disabled={!editando}
                  >
                    Todos los tipos
                  </button>
                  {tiposMadera.map((tipo) => (
                    <button
                      key={tipo}
                      type="button"
                      className={`rounded-md px-4 py-1 text-sm flex items-center gap-2 transition-all ${
                        filtroTipoMadera === tipo
                          ? "bg-orange-600 text-white"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                      onClick={() => setFiltroTipoMadera(tipo)}
                      disabled={!editando}
                    >
                      {tipo}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Filtro de subcategoría de ferretería */}
            {categoriaId === "Ferretería" && subCategoriasFerreteria.length > 0 && (
              <div className="flex-1">
                <div className="flex bg-white dark:bg-gray-800 rounded-lg p-1 shadow-sm border border-gray-200 dark:border-gray-600">
                  <button
                    type="button"
                    className={`rounded-md px-4 py-1 text-sm flex items-center gap-2 transition-all ${
                      filtroSubCategoria === ""
                        ? "bg-blue-600 text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                    onClick={() => setFiltroSubCategoria("")}
                    disabled={!editando}
                  >
                    Todas las subcategorías
                  </button>
                  {subCategoriasFerreteria.map((subCategoria) => (
                    <button
                      key={subCategoria}
                      type="button"
                      className={`rounded-full px-4 py-1 text-sm flex items-center gap-2 transition-all ${
                        filtroSubCategoria === subCategoria
                          ? "bg-blue-600 text-white"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                      onClick={() => setFiltroSubCategoria(subCategoria)}
                      disabled={!editando}
                    >
                      {subCategoria}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Buscador mejorado */}
            <div className="flex-1 relative flex items-center gap-2">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg
                  className="h-5 w-5 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>
              <input
                type="text"
                placeholder="Buscar productos..."
                value={busquedaProducto}
                onChange={(e) => setBusquedaProducto(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                  }
                }}
                className="w-full pl-10 pr-10 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-card"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Lista de productos */}
      <div className="max-h-150 overflow-y-auto">
        {categorias.length === 0 ? (
          <div className="p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
              <svg
                className="w-8 h-8 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
              No hay categorías disponibles
            </h3>
            <p className="text-gray-500 dark:text-gray-400">
              Agrega productos a las categorías para comenzar
            </p>
          </div>
        ) : (!categoriaId && (!busquedaDefer || busquedaDefer.trim() === "")) ? (
          <div className="p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
              <svg
                className="w-8 h-8 text-blue-600 dark:text-blue-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
              Selecciona una categoría
            </h3>
            <p className="text-gray-500 dark:text-gray-400">
              Elige una categoría para ver los productos disponibles
            </p>
          </div>
        ) : productosFiltrados.length === 0 ? (
          <div className="p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-yellow-100 dark:bg-yellow-900/30 rounded-full flex items-center justify-center">
              <svg
                className="w-8 h-8 text-yellow-600 dark:text-yellow-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
              No se encontraron productos
            </h3>
            <p className="text-gray-500 dark:text-gray-400">
              Intenta cambiar los filtros o la búsqueda
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Grid de productos paginados */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4 relative">
              {/* Overlay de carga durante la paginación */}
              {isPending && (
                <div className="absolute inset-0 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm z-10 flex items-center justify-center rounded-lg">
                  <div className="flex items-center gap-3 bg-white dark:bg-gray-700 px-4 py-3 rounded-lg shadow-lg border border-gray-200 dark:border-gray-600">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Cargando productos...
                    </span>
                  </div>
                </div>
              )}

              {productosPaginados.map((prod) => {
                const yaAgregado = itemsSeleccionados.some((p) => p.id === prod.id);
                const precio = (() => {
                  if (prod.categoria === "Maderas") {
                    return prod.precioPorPie || 0;
                  } else if (prod.categoria === "Ferretería") {
                    return prod.valorVenta || 0;
                  } else {
                    return (
                      prod.precioUnidad ||
                      prod.precioUnidadVenta ||
                      prod.precioUnidadHerraje ||
                      prod.precioUnidadQuimico ||
                      prod.precioUnidadHerramienta ||
                      0
                    );
                  }
                })();

                return (
                  <div
                    key={prod.id}
                    className={`group relative dark:bg-gray-800 rounded-lg border-2 transition-all duration-200 hover:shadow-md h-full flex flex-col ${
                      yaAgregado
                        ? "border-green-200 bg-green-50 dark:bg-green-900/20 dark:border-green-700"
                        : "border-gray-200 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-500"
                    }`}
                  >
                    <div className="p-4 flex flex-col h-full">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-2">
                            <div
                              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                                prod.categoria === "Maderas"
                                  ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
                                  : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                              }`}
                            >
                              {prod.categoria === "Maderas" ? "🌲" : "🔧"}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                                {prod.nombre}
                              </h4>
                              {/* Información específica por categoría */}
                              {prod.categoria === "Maderas" && prod.tipoMadera && (
                                <div className="flex items-center gap-1 mt-1">
                                  <span className="text-xs text-orange-600 dark:text-orange-400 font-medium">
                                    🌲 {prod.tipoMadera}
                                  </span>
                                </div>
                              )}
                              {prod.categoria === "Ferretería" && prod.subCategoria && (
                                <div className="flex items-center gap-1 mt-1">
                                  <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                                    🔧 {prod.subCategoria}
                                  </span>
                                </div>
                              )}
                            </div>
                            {yaAgregado && (
                              <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
                                <svg
                                  className="w-4 h-4"
                                  fill="currentColor"
                                  viewBox="0 0 20 20"
                                >
                                  <path
                                    fillRule="evenodd"
                                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                    clipRule="evenodd"
                                  />
                                </svg>
                                <span className="text-xs font-medium">
                                  Agregado
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Información del producto */}
                      <div className="flex-1 space-y-2">
                        {/* Precio */}
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            Precio:
                          </span>
                          <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                            ${formatARNumber(precio)}
                          </span>
                        </div>

                        {/* Unidad de medida */}
                        {prod.unidadMedida && (
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              Unidad:
                            </span>
                            <span className="text-xs text-gray-700 dark:text-gray-300">
                              {prod.unidadMedida}
                            </span>
                          </div>
                        )}

                        {/* Stock */}
                        {prod.stock !== undefined && (
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              Stock:
                            </span>
                            <span
                              className={`text-xs font-medium ${
                                prod.stock > 10
                                  ? "text-green-600 dark:text-green-400"
                                  : prod.stock > 0
                                  ? "text-yellow-600 dark:text-yellow-400"
                                  : "text-red-600 dark:text-red-400"
                              }`}
                            >
                              {prod.stock > 0 ? prod.stock : "Sin stock"}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="mt-4">
                        <button
                          onClick={() => {
                            if (yaAgregado) return;
                            onAgregarProducto(prod);
                          }}
                          disabled={yaAgregado || (prod.stock !== undefined && prod.stock <= 0)}
                          className={`w-full py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                            yaAgregado 
                              ? "bg-green-100 text-green-700 cursor-not-allowed" 
                              : (prod.stock !== undefined && prod.stock <= 0)
                                ? "bg-red-100 text-red-700 cursor-not-allowed"
                                : "bg-blue-600 text-white hover:bg-blue-700"
                          }`}
                        >
                          {yaAgregado ? "Ya agregado" : (prod.stock !== undefined && prod.stock <= 0) ? "Sin stock" : "Agregar"}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Paginación */}
            {showPagination && totalPaginas > 1 && (
              <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-t border-gray-200">
                <div className="text-sm text-gray-700 flex items-center gap-2">
                  {isPending && (<div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600"></div>)}
                  <span>Mostrando {paginaActual}-{Math.min(paginaActual + productosPorPagina - 1, totalProductos)} de {totalProductos} productos</span>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => cambiarPagina(1)} disabled={paginaActual === 1 || isPending} className="p-2 rounded-md text-gray-500 hover:text-gray-700 disabled:opacity-50" title="Primera página">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7"/></svg>
                  </button>
                  <button onClick={() => cambiarPagina(Math.max(1, paginaActual - 1))} disabled={paginaActual === 1 || isPending} className="p-2 rounded-md text-gray-500 hover:text-gray-700 disabled:opacity-50" title="Página anterior">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"/></svg>
                  </button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, totalPaginas) }, (_, i) => {
                      let pageNum;
                      if (totalPaginas <= 5) pageNum = i + 1;
                      else if (paginaActual <= 3) pageNum = i + 1;
                      else if (paginaActual >= totalPaginas - 2) pageNum = totalPaginas - 4 + i;
                      else pageNum = paginaActual - 2 + i;
                      return (
                        <button key={pageNum} onClick={() => cambiarPagina(pageNum)} disabled={isPending} className={`px-3 py-1 rounded-md text-sm font-medium ${paginaActual === pageNum ? "bg-blue-600 text-white" : "text-gray-600 hover:text-gray-900"}`}>
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>
                  <button onClick={() => cambiarPagina(Math.min(totalPaginas, paginaActual + 1))} disabled={paginaActual === totalPaginas || isPending} className="p-2 rounded-md text-gray-500 hover:text-gray-700 disabled:opacity-50" title="Página siguiente">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"/></svg>
                  </button>
                  <button onClick={() => cambiarPagina(totalPaginas)} disabled={paginaActual === totalPaginas || isPending} className="p-2 rounded-md text-gray-500 hover:text-gray-700 disabled:opacity-50" title="Última página">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 5l7 7-7 7M5 5l7 7-7 7"/></svg>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
};

export default CatalogoVentas;
