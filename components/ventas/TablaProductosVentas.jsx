"use client";
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

const TablaProductosVentas = ({
  titulo = "Productos seleccionados",
  items = [],
  editando = false,
  onQuitarProducto,
  onActualizarCampo,
  onActualizarNombreManual,
  formatearNumeroArgentino,
  showTotals = true,
  showDescripcionGeneral = false,
  descripcionGeneral = "",
  onDescripcionGeneralChange
}) => {
  if (items.length === 0) {
    return null;
  }

  // Calcular totales
  const subtotal = items.reduce((acc, p) => {
    if (p.categoria === "Maderas" && p.unidad === "M2") {
      return acc + (Number(p.precio) * (1 - Number(p.descuento || 0) / 100));
    } else {
      return acc + (Number(p.precio) * Number(p.cantidad) * (1 - Number(p.descuento || 0) / 100));
    }
  }, 0);
  const descuentoTotal = items.reduce((acc, p) => {
    const precio = Number(p.precio || 0);
    const descuento = Number(p.descuento || 0);
    if (p.categoria === "Maderas" && p.unidad === "M2") {
      return acc + (precio * descuento / 100);
    } else {
      return acc + (precio * Number(p.cantidad || 1) * descuento / 100);
    }
  }, 0);
  const total = subtotal - descuentoTotal;

  return (
    <>
      <section className="bg-card/60 rounded-xl p-0 border border-default-200 shadow-lg overflow-hidden ring-1 ring-default-200/60">
        <div className="flex items-center justify-between px-4 py-3 border-b bg-gradient-to-r from-default-50 to-default-100">
          <h3 className="text-base md:text-lg font-semibold text-default-900">{titulo}</h3>
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-default-200/60 text-default-700 border border-default-300">
            {items.length} producto{items.length !== 1 ? "s" : ""}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-[15px]">
            <thead className="sticky top-0 z-10 bg-default-50/80 backdrop-blur supports-[backdrop-filter]:bg-default-50/60">
              <tr className="border-b border-default-200">
                <th className="h-12 px-4 text-left align-middle text-xs font-semibold uppercase tracking-wide text-default-600">Categoría</th>
                <th className="h-12 px-4 text-left align-middle text-xs font-semibold uppercase tracking-wide text-default-600">Producto</th>
                <th className="h-12 px-4 text-center align-middle text-xs font-semibold uppercase tracking-wide text-default-600">Cant.</th>
                <th className="h-12 px-4 text-center align-middle text-xs font-semibold uppercase tracking-wide text-default-600">Cepillado</th>
                <th className="h-12 px-4 text-right align-middle text-xs font-semibold uppercase tracking-wide text-default-600">Precio unit.</th>
                <th className="h-12 px-4 text-center align-middle text-xs font-semibold uppercase tracking-wide text-default-600">Desc.</th>
                <th className="h-12 px-4 text-right align-middle text-xs font-semibold uppercase tracking-wide text-default-600">Subtotal</th>
                <th className="h-12 px-4 text-center align-middle text-xs font-semibold uppercase tracking-wide text-default-600">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-default-200">
              {items.map((p, idx) => (
                <tr
                  key={p.id}
                  className="border-b border-default-300 transition-colors data-[state=selected]:bg-muted"
                >
                  <td className="p-4 align-middle text-sm text-default-600">
                    {p.categoria && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-default-100 text-default-700 border border-default-200 text-[11px] font-medium">
                        {p.categoria}
                      </span>
                    )}
                  </td>
                  <td className="p-4 align-top text-sm text-default-600">
                    <div className="font-semibold text-default-900">
                      {p._esManual ? (
                        <input
                          type="text"
                          value={p.nombre || p.descripcion}
                          onChange={(e) => onActualizarNombreManual && onActualizarNombreManual(p.id, e.target.value)}
                          className="w-full px-2 py-1 border border-gray-300 uppercase rounded text-base font-bold bg-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-200"
                          disabled={!editando}
                          placeholder="Nombre del producto"
                        />
                      ) : (
                        <div>
                          {p.nombre}
                          {p.categoria === "Maderas" && p.subcategoria && (
                            <span className="font-semibold text-default-900">
                              {" "}
                              - {p.subcategoria.toUpperCase()}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    {/* Información específica por categoría */}
                    {p.categoria === "Ferretería" && p.subCategoria && (
                      <div className="flex items-center gap-1 mt-1">
                        <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                          {p.subCategoria}
                        </span>
                      </div>
                    )}

                    {/* Campos editables para maderas (ocultar cuando unidad es "Unidad") */}
                    {p.categoria === "Maderas" && p.unidad !== "Unidad" && (
                      <div className="mt-2 flex flex-wrap items-start gap-3">
                        {/* Sección de dimensiones (compacta) */}
                        <div className="inline-block w-fit rounded-md border border-orange-200/60 dark:border-orange-700/60 bg-orange-50/60 dark:bg-orange-900/20 p-1.5 align-top">
                          <div className="flex items-center gap-1.5 mb-1">
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-700 dark:bg-orange-800/40 dark:text-orange-300 text-sm font-semibold">
                              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" clipRule="evenodd"/></svg>
                              Dimensiones
                            </span>
                            {p.unidad === "M2" ? (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-orange-100 text-orange-700 dark:bg-orange-800/40 dark:text-orange-300 text-sm font-semibold">
                                  Total {(((p.alto || 0) * (p.largo || 0) * (p.cantidad || 1)).toFixed(2))} m²
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-orange-100 text-orange-700 dark:bg-orange-800/40 dark:text-orange-300 text-sm font-semibold">
                                  Volumen {(((p.alto || 0) * (p.ancho || 0) * (p.largo || 0)).toFixed(2))} m³
                                </span>
                              )}
                          </div>

                          {p.unidad === "M2" ? (
                            <div className="flex flex-wrap items-end gap-2">
                              <div className="flex flex-col gap-0.5">
                                <label className="text-[11px] font-semibold text-orange-700">Alto</label>
                                {editando ? (
                                  <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={p.alto === "" ? "" : p.alto || ""}
                                    onChange={(e) => onActualizarCampo && onActualizarCampo(p.id, "alto", e.target.value)}
                                    className="h-8 w-[68px] sm:w-[80px] rounded-sm border border-orange-300 dark:border-orange-600 bg-white dark:bg-gray-800 text-sm px-1.5 focus:border-orange-500 focus:ring-1 focus:ring-orange-200 dark:focus:ring-orange-800"
                                  />
                                ) : (
                                  <span className="text-sm font-medium text-orange-700 px-2 py-1">{p.alto || 0}</span>
                                )}
                              </div>
                              <div className="flex flex-col gap-0.5">
                                <label className="text-[11px] font-semibold text-orange-700">Largo</label>
                                {editando ? (
                                  <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={p.largo === "" ? "" : p.largo || ""}
                                    onChange={(e) => onActualizarCampo && onActualizarCampo(p.id, "largo", e.target.value)}
                                    className="h-8 w-[68px] sm:w-[80px] rounded-sm border border-orange-300 dark:border-orange-600 bg-white dark:bg-gray-800 text-sm px-1.5 focus:border-orange-500 focus:ring-1 focus:ring-orange-200 dark:focus:ring-orange-800"
                                  />
                                ) : (
                                  <span className="text-sm font-medium text-orange-700 px-2 py-1">{p.largo || 0}</span>
                                )}
                              </div>
                            </div>
                          ) : (
                            <div className="flex flex-wrap items-end gap-2">
                              <div className="flex flex-col gap-0.5">
                                <label className="text-[11px] font-semibold text-orange-700">Alto</label>
                                {editando ? (
                                  <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={p.alto === "" ? "" : p.alto || ""}
                                    onChange={(e) => onActualizarCampo && onActualizarCampo(p.id, "alto", e.target.value)}
                                    className="h-8 w-[68px] sm:w-[80px] rounded-sm border border-orange-300 dark:border-orange-600 bg-white dark:bg-gray-800 text-sm px-1.5 focus:border-orange-500 focus:ring-1 focus:ring-orange-200 dark:focus:ring-orange-800"
                                  />
                                ) : (
                                  <span className="text-sm font-medium text-orange-700 px-2 py-1">{p.alto || 0}</span>
                                )}
                              </div>
                              <div className="flex flex-col gap-0.5">
                                <label className="text-[11px] font-semibold text-orange-700">Ancho</label>
                                {editando ? (
                                  <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={p.ancho === "" ? "" : p.ancho || ""}
                                    onChange={(e) => onActualizarCampo && onActualizarCampo(p.id, "ancho", e.target.value)}
                                    className="h-8 w-[68px] sm:w-[80px] rounded-sm border border-orange-300 dark:border-orange-600 bg-white dark:bg-gray-800 text-sm px-1.5 focus:border-orange-500 focus:ring-1 focus:ring-orange-200 dark:focus:ring-orange-800"
                                  />
                                ) : (
                                  <span className="text-sm font-medium text-orange-700 px-2 py-1">{p.ancho || 0}</span>
                                )}
                              </div>
                              <div className="flex flex-col gap-0.5">
                                <label className="text-[11px] font-semibold text-orange-700">Largo</label>
                                {editando ? (
                                  <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={p.largo === "" ? "" : p.largo || ""}
                                    onChange={(e) => onActualizarCampo && onActualizarCampo(p.id, "largo", e.target.value)}
                                    className="h-8 w-[68px] sm:w-[80px] rounded-sm border border-orange-300 dark:border-orange-600 bg-white dark:bg-gray-800 text-sm px-1.5 focus:border-orange-500 focus:ring-1 focus:ring-orange-200 dark:focus:ring-orange-800"
                                  />
                                ) : (
                                  <span className="text-sm font-medium text-orange-700 px-2 py-1">{p.largo || 0}</span>
                                )}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Sección de precio por pie (compacta y no ancha) */}
                        <div className="inline-block w-fit p-1.5 bg-green-50 dark:bg-green-900/20 rounded-md border border-green-200 dark:border-green-700 align-top">
                          <div className="flex items-center gap-1 mb-1">
                            <svg
                              className="w-3 h-3 text-green-600 dark:text-green-400"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
                              <path
                                fillRule="evenodd"
                                d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z"
                                clipRule="evenodd"
                              />
                            </svg>
                            <span className="text-sm font-semibold text-green-700 dark:text-green-400">
                              Precio
                            </span>
                          </div>
                          {/* Precio compacto (más angosto) */}
                          <div className="inline-block w-fit">
                            <label className="block text-[11px] font-semibold text-green-700 dark:text-green-300 mb-0.5">Valor</label>
                            <div className="relative">
                              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-sm text-green-600 dark:text-green-400 font-medium">$</span>
                              {editando ? (
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={p.precioPorPie === "" ? "" : p.precioPorPie || ""}
                                  onChange={(e) => onActualizarCampo && onActualizarCampo(p.id, "precioPorPie", e.target.value)}
                                  className="h-8 w-[88px] pl-5 pr-2 text-sm border border-green-300 dark:border-green-600 rounded-md bg-white dark:bg-gray-800 focus:border-green-500 focus:ring-1 focus:ring-green-200 dark:focus:ring-green-800 focus:outline-none transition-colors tabular-nums"
                                  placeholder="0.00"
                                />
                              ) : (
                                <span className="text-sm font-medium text-green-700 px-2 py-1">${p.precioPorPie || 0}</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </td>
                  <td className="p-4 align-middle text-sm text-default-600">
                    <div className="flex items-center justify-center">
                      <div className="flex items-center bg-white dark:bg-gray-800 border border-default-300 dark:border-gray-700 rounded-lg overflow-hidden shadow-sm">
                        {editando && (
                          <button
                            type="button"
                            onClick={() => {
                              const nuevaCantidad = Math.max(1, Number(p.cantidad || 1) - 1);
                              onActualizarCampo && onActualizarCampo(p.id, "cantidad", nuevaCantidad);
                            }}
                            disabled={p.cantidad <= 1}
                            className="px-3 py-2 text-default-500 hover:text-default-900 hover:bg-default-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M20 12H4"
                              />
                            </svg>
                          </button>
                        )}

                        {editando ? (
                          <input
                            type="number"
                            min="1"
                            value={p.cantidad === "" ? "" : p.cantidad}
                            onChange={(e) => onActualizarCampo && onActualizarCampo(p.id, "cantidad", e.target.value)}
                            className="w-16 text-center text-base md:text-lg font-bold border-0 bg-transparent focus:ring-0 focus:outline-none text-gray-900 dark:text-gray-100 tabular-nums"
                          />
                        ) : (
                          <span className="w-16 text-center text-base md:text-lg font-bold text-gray-900 dark:text-gray-100 tabular-nums">{p.cantidad}</span>
                        )}

                        {editando && (
                          <button
                            type="button"
                            onClick={() => {
                              const nuevaCantidad = Number(p.cantidad || 1) + 1;
                              onActualizarCampo && onActualizarCampo(p.id, "cantidad", nuevaCantidad);
                            }}
                            className="px-3 py-2 text-default-500 hover:text-default-900 hover:bg-default-100 dark:hover:bg-gray-700 transition-colors"
                          >
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M12 4v16m8-8H4"
                              />
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="p-4 align-middle text-sm text-default-600">
                    {p.categoria === "Maderas" && p.unidad !== "Unidad" ? (
                      <div className="flex items-center justify-center">
                        {editando ? (
                          <input
                            type="checkbox"
                            checked={p.cepilladoAplicado || false}
                            onChange={(e) => onActualizarCampo && onActualizarCampo(p.id, "cepilladoAplicado", e.target.checked)}
                            className="w-4 h-4 text-blue-600 bg-white border-default-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 focus:ring-2"
                            title="Aplicar cepillado (+6.6%)"
                          />
                        ) : (
                          <span className="text-sm font-medium text-blue-600">{p.cepilladoAplicado ? "Sí" : "No"}</span>
                        )}
                      </div>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="p-4 align-middle text-sm text-default-600">
                    {editando && p._esManual ? (
                      <input
                        type="number"
                        min="0"
                        step="100"
                        value={p.precio === "" ? "" : p.precio}
                        onChange={(e) => onActualizarCampo && onActualizarCampo(p.id, "precio", e.target.value)}
                        className="w-24 ml-auto block text-right border border-default-300 rounded-md px-2 py-1 text-sm font-semibold bg-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-200 tabular-nums"
                        placeholder="0"
                      />
                    ) : (
                      <span className="block text-right font-semibold text-default-900 tabular-nums">{`${formatearNumeroArgentino ? formatearNumeroArgentino(p.precio) : p.precio.toLocaleString("es-AR")}`}</span>
                    )}
                  </td>
                  <td className="p-4 align-middle text-sm text-default-600">
                    {editando ? (
                      <div className="relative w-20 md:w-24 mx-auto">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={p.descuento === "" ? "" : p.descuento || ""}
                          onChange={(e) => onActualizarCampo && onActualizarCampo(p.id, "descuento", e.target.value)}
                          className="w-full text-center border border-default-300 rounded-md px-2 py-1 pr-6 bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-200"
                        />
                        <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs text-default-500">%</span>
                      </div>
                    ) : (
                      <span className="text-sm font-medium">{p.descuento || 0}%</span>
                    )}
                  </td>
                  <td className="p-4 align-middle text-right text-sm text-default-900 font-bold tabular-nums">
                    {formatearNumeroArgentino ? formatearNumeroArgentino(
                      // Para machimbres y deck, el precio ya incluye la cantidad
                      p.categoria === "Maderas" && p.unidad === "M2"
                        ? Number(p.precio) * (1 - Number(p.descuento || 0) / 100)
                        : Number(p.precio) * Number(p.cantidad) * (1 - Number(p.descuento || 0) / 100)
                    ) : (
                      p.categoria === "Maderas" && p.unidad === "M2"
                        ? Number(p.precio) * (1 - Number(p.descuento || 0) / 100)
                        : Number(p.precio) * Number(p.cantidad) * (1 - Number(p.descuento || 0) / 100)
                    ).toLocaleString("es-AR")}
                  </td>
                  <td className="p-4 align-middle text-center text-sm text-default-600">
                    <span className="group relative inline-flex">
                      <button
                        type="button"
                        aria-label="Eliminar producto"
                        onClick={() => onQuitarProducto && onQuitarProducto(p.id)}
                        disabled={!editando}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-red-200 text-red-600 hover:text-white hover:bg-red-600 hover:border-red-600 shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
                        title="Eliminar"
                      >
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                          <path d="M9 3a1 1 0 00-1 1v1H5.5a1 1 0 100 2H6v12a2 2 0 002 2h8a2 2 0 002-2V7h.5a1 1 0 100-2H16V4a1 1 0 00-1-1H9zm2 2h4v1h-4V5zm-1 5a1 1 0 112 0v7a1 1 0 11-2 0v-7zm5 0a1 1 0 112 0v7a1 1 0 11-2 0v-7z" />
                        </svg>
                      </button>
                      <span className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-default-900 text-white text-[10px] px-2 py-0.5 opacity-0 group-hover:opacity-100 transition-opacity">Eliminar</span>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Totales */}
      {showTotals && (
        <div className="flex justify-end">
          <div className="bg-primary/5 border border-primary/20 rounded-lg px-6 py-3 text-lg shadow-sm font-semibold flex gap-6">
            <div>
              Subtotal: <span className="font-bold">{formatearNumeroArgentino ? formatearNumeroArgentino(subtotal) : subtotal.toLocaleString("es-AR")}</span>
            </div>
            <div>
              Descuento: <span className="font-bold">{formatearNumeroArgentino ? formatearNumeroArgentino(descuentoTotal) : descuentoTotal.toLocaleString("es-AR")}</span>
            </div>
            <div>
              Total: <span className="font-bold text-primary">{formatearNumeroArgentino ? formatearNumeroArgentino(total) : total.toLocaleString("es-AR")}</span>
            </div>
          </div>
        </div>
      )}

      {/* Campo de descripción general */}
      {showDescripcionGeneral && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-lg">Descripción General</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="Escribe una descripción general, notas importantes, etc..."
              value={descripcionGeneral}
              onChange={(e) => onDescripcionGeneralChange && onDescripcionGeneralChange(e.target.value)}
              className="min-h-[100px] resize-none"
              rows={4}
            />
          </CardContent>
        </Card>
      )}
    </>
  );
};

export default TablaProductosVentas;
