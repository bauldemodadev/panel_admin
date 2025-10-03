"use client";
import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Filter, Search } from "lucide-react";

const CatalogoObras = ({
  titulo = "Catálogo de productos (obras)",
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

  // Debounce para búsqueda
  useEffect(() => {
    const id = setTimeout(() => setBusquedaDefer(busquedaProducto), 100);
    return () => clearTimeout(id);
  }, [busquedaProducto]);

  // Reset al cambiar filtros
  useEffect(() => {
    setPaginaActual(1);
  }, [categoriaId, busquedaDefer]);

  // Normalizador de texto
  const normalizarTexto = useCallback((texto) => {
    if (!texto) return "";
    return texto.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "");
  }, []);

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
        const unidad = normalizarTexto(prod.unidadMedida || "");
        if (busq === "") return true;
        if (busq.endsWith(".")) {
          const sinPunto = busq.slice(0, -1);
          return nombre.startsWith(sinPunto) || unidad.startsWith(sinPunto);
        }
        return nombre.includes(busq) || unidad.includes(busq);
      });
  }, [productos, productosPorCategoria, categoriaId, busquedaDefer, normalizarTexto]);

  // Paginación derivada
  const totalProductos = productosFiltrados.length;
  const totalPaginas = Math.ceil(totalProductos / productosPorPagina) || 1;
  const productosPaginados = useMemo(() => {
    const inicio = (paginaActual - 1) * productosPorPagina;
    const fin = inicio + productosPorPagina;
    return productosFiltrados.slice(inicio, fin);
  }, [productosFiltrados, paginaActual, productosPorPagina]);

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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Filter className="w-5 h-5" /> {titulo}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Agregar ítem manual: botón que agrega fila editable en la tabla */}
        <div className="flex justify-end">
          <Button variant="outline" onClick={onAgregarProductoManual}>
            Agregar ítem manual
          </Button>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <div className="flex bg-white rounded-lg p-1 shadow-sm border border-gray-200">
              {categorias.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  className={`rounded-full px-4 py-1 text-sm mr-2 ${categoriaId === cat ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
                  onClick={() => setCategoriaId((prev) => (prev === cat ? "" : cat))}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
          <div className="flex-1 relative flex items-center gap-2">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Buscar productos..."
              value={busquedaProducto}
              onChange={(e) => setBusquedaProducto(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }}
              className="w-full pl-10 pr-10 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-card"
            />
          </div>
        </div>
        
        {/* Lista de productos con paginación, estilo ventas */}
        <div className="max-h-150 overflow-y-auto">
          {categorias.length === 0 ? (
            <div className="p-8 text-center text-gray-500">No hay categorías disponibles</div>
          ) : !categoriaId && (!busquedaDefer || busquedaDefer.trim() === "") ? (
            <div className="p-8 text-center">
              <h3 className="text-lg font-medium mb-2">Selecciona una categoría</h3>
              <p className="text-gray-500">Elige una categoría para ver los productos disponibles</p>
            </div>
          ) : productosFiltrados.length === 0 ? (
            <div className="p-8 text-center">
              <h3 className="text-lg font-medium mb-2">No se encontraron productos</h3>
              <p className="text-gray-500">Intenta cambiar los filtros o la búsqueda</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4 relative">
                {isPending && (
                  <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-10 flex items-center justify-center rounded-lg">
                    <div className="flex items-center gap-3 bg-white px-4 py-3 rounded-lg shadow-lg border border-gray-200">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                      <span className="text-sm font-medium text-gray-700">Cargando productos...</span>
                    </div>
                  </div>
                )}

                {productosPaginados.map((prod) => {
                  const yaAgregado = itemsSeleccionados.some((p) => p.id === prod.id);
                  const precio = Number(prod.valorVenta) || 0;
                  return (
                    <div key={prod.id} className={`group relative rounded-lg border-2 transition-all duration-200 hover:shadow-md h-full flex flex-col ${yaAgregado ? "border-green-200 bg-green-50" : "border-gray-200 hover:border-blue-300"}`}>
                      <div className="p-4 flex flex-col h-full">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 mb-2">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold bg-blue-100 text-blue-700`}>
                                🏗️
                              </div>
                              <div className="flex-1 min-w-0">
                                <h4 className="text-sm font-semibold truncate">{prod.nombre}</h4>
                                {prod.subCategoria && (
                                  <div className="text-xs text-blue-600 mt-1">{prod.subCategoria}</div>
                                )}
                              </div>
                              {yaAgregado && (
                                <div className="flex items-center gap-1 text-green-600">
                                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg>
                                  <span className="text-xs font-medium">Agregado</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex-1 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-500">Precio:</span>
                            <span className="text-sm font-semibold">$ {formatARNumber(precio)}</span>
                          </div>
                          {prod.unidadMedida && (
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-gray-500">Unidad:</span>
                              <span className="text-xs text-gray-700">{prod.unidadMedida}</span>
                            </div>
                          )}
                        </div>

                        <div className="mt-4">
                          <button
                            onClick={() => {
                              if (yaAgregado) return;
                              onAgregarProducto(prod);
                            }}
                            disabled={yaAgregado}
                            className={`w-full py-2 px-3 rounded-md text-sm font-medium transition-colors ${yaAgregado ? "bg-green-100 text-green-700 cursor-not-allowed" : "bg-blue-600 text-white hover:bg-blue-700"}`}
                          >
                            {yaAgregado ? "Ya agregado" : "Agregar"}
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
                    <button onClick={() => startTransition(() => setPaginaActual(1))} disabled={paginaActual === 1 || isPending} className="p-2 rounded-md text-gray-500 hover:text-gray-700 disabled:opacity-50" title="Primera página">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7"/></svg>
                    </button>
                    <button onClick={() => startTransition(() => setPaginaActual(Math.max(1, paginaActual - 1)))} disabled={paginaActual === 1 || isPending} className="p-2 rounded-md text-gray-500 hover:text-gray-700 disabled:opacity-50" title="Página anterior">
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
                          <button key={pageNum} onClick={() => startTransition(() => setPaginaActual(pageNum))} disabled={isPending} className={`px-3 py-1 rounded-md text-sm font-medium ${paginaActual === pageNum ? "bg-blue-600 text-white" : "text-gray-600 hover:text-gray-900"}`}>
                            {pageNum}
                          </button>
                        );
                      })}
                    </div>
                    <button onClick={() => startTransition(() => setPaginaActual(Math.min(totalPaginas, paginaActual + 1)))} disabled={paginaActual === totalPaginas || isPending} className="p-2 rounded-md text-gray-500 hover:text-gray-700 disabled:opacity-50" title="Página siguiente">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"/></svg>
                    </button>
                    <button onClick={() => startTransition(() => setPaginaActual(totalPaginas))} disabled={paginaActual === totalPaginas || isPending} className="p-2 rounded-md text-gray-500 hover:text-gray-700 disabled:opacity-50" title="Última página">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 5l7 7-7 7M5 5l7 7-7 7"/></svg>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default CatalogoObras;
