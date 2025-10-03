"use client";
import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Icon } from "@iconify/react";
import { 
  Plus, 
  Trash2, 
  Search, 
  Filter, 
  Edit3, 
  Check, 
  X,
  Save
} from "lucide-react";
import { db } from "@/lib/firebase";
import { doc, updateDoc, collection, getDocs } from "firebase/firestore";

const PresupuestoDetalle = ({
  obra,
  editando,
  formatearNumeroArgentino,
  onObraUpdate,
  onGuardarRef,
  shouldSave,
  onResetShouldSave
}) => {
  // Estados para bloques
  const [bloques, setBloques] = useState([]);
  const [bloqueActivo, setBloqueActivo] = useState(0);
  const [editandoNombreBloque, setEditandoNombreBloque] = useState(null);
  const [nuevoNombreBloque, setNuevoNombreBloque] = useState("");
  // const [descripcionGeneral, setDescripcionGeneral] = useState("");

  // Debug: Log de props recibidas
  console.log("🔍 PresupuestoDetalle props - editando:", editando, "shouldSave:", shouldSave);

  // Estados para catálogo de productos
  const [productosObra, setProductosObra] = useState([]);
  const [productosObraPorCategoria, setProductosObraPorCategoria] = useState({});
  const [categoriasObra, setCategoriasObra] = useState([]);
  const [categoriaObraId, setCategoriaObraId] = useState("");
  const [busquedaProductoObra, setBusquedaProductoObra] = useState("");
  const [busquedaDebounced, setBusquedaDebounced] = useState("");
  const [paginaActual, setPaginaActual] = useState(1);
  const [productosPorPagina] = useState(12);

  // Inicializar datos cuando se carga la obra
  useEffect(() => {
    if (obra) {
      if (obra.bloques && obra.bloques.length > 0) {
        setBloques(obra.bloques);
      } else {
        // Crear un bloque inicial si no hay bloques
        const bloqueInicial = {
          id: `presupuesto-${Date.now()}`,
          nombre: "Bloque 1",
          productos: [],
          estaCerrado: false,
          descripcion: ""
        };
        setBloques([bloqueInicial]);
      }
      // setDescripcionGeneral(obra.descripcionGeneral || "");
    }
  }, [obra]);



  // Cargar catálogo de productos de obra
  useEffect(() => {
    if (editando) {
      const cargarProductosObra = async () => {
        try {
          const snapProd = await getDocs(collection(db, "productos_obras"));
          const prods = snapProd.docs.map((d) => ({ id: d.id, ...d.data() }));
          setProductosObra(prods);
          
          const agrupados = {};
          prods.forEach((p) => {
            const cat = p.categoria || "Sin categoría";
            (agrupados[cat] = agrupados[cat] || []).push(p);
          });
          setProductosObraPorCategoria(agrupados);
          setCategoriasObra(Object.keys(agrupados));
        } catch (error) {
          console.error("Error cargando productos de obra:", error);
        }
      };
      cargarProductosObra();
    }
  }, [editando]);

  // Búsqueda debounced
  useEffect(() => {
    const timer = setTimeout(() => setBusquedaDebounced(busquedaProductoObra), 150);
    return () => clearTimeout(timer);
  }, [busquedaProductoObra]);

  // Resetear página cuando cambien los filtros
  useEffect(() => {
    setPaginaActual(1);
  }, [categoriaObraId, busquedaDebounced]);

  // Función para calcular precio de productos de obra
  const calcularPrecioProductoObra = ({ unidadMedida, alto, largo, valorVenta, cantidad }) => {
    const u = String(unidadMedida || "").toUpperCase();
    const altoNum = Number(alto) || 0;
    const largoNum = Number(largo) || 0;
    const valorNum = Number(valorVenta) || 0;
    const cantNum = Number(cantidad) || 1;

    if (u === "M2") {
      return Math.round(altoNum * largoNum * valorNum * cantNum);
    }
    if (u === "ML") {
      return Math.round(largoNum * valorNum * cantNum);
    }
    return Math.round(valorNum * cantNum);
  };

  // Funciones para manejar bloques
  const agregarBloque = () => {
    const nuevoBloque = {
      id: `presupuesto-${Date.now()}`,
      nombre: `Bloque ${bloques.length + 1}`,
      productos: [],
      estaCerrado: false,
      descripcion: ""
    };
    setBloques(prev => [...prev, nuevoBloque]);
    setBloqueActivo(bloques.length);
  };

  const eliminarBloque = (bloqueIndex) => {
    if (bloques.length <= 1) return;
    
    setBloques(prev => prev.filter((_, index) => index !== bloqueIndex));
    
    if (bloqueActivo >= bloqueIndex) {
      setBloqueActivo(prev => Math.max(0, prev - 1));
    }
  };

  const actualizarNombreBloque = (bloqueIndex, nuevoNombre) => {
    setBloques(prev => prev.map((bloque, index) => 
      index === bloqueIndex ? { ...bloque, nombre: nuevoNombre } : bloque
    ));
  };

  const cerrarBloque = (bloqueIndex) => {
    setBloques(prev => prev.map((bloque, index) => 
      index === bloqueIndex ? { ...bloque, estaCerrado: true } : bloque
    ));
  };

  const abrirBloque = (bloqueIndex) => {
    setBloques(prev => prev.map((bloque, index) => 
      index === bloqueIndex ? { ...bloque, estaCerrado: false } : bloque
    ));
  };

  const actualizarDescripcionBloque = (bloqueIndex, descripcion) => {
    setBloques(prev => prev.map((bloque, index) => 
      index === bloqueIndex ? { ...bloque, descripcion } : bloque
    ));
  };

  // Funciones para manejar productos en bloques
  const agregarProducto = (prod) => {
    const bloqueActual = bloques[bloqueActivo];
    if (!bloqueActual || bloqueActual.estaCerrado) return;
    
    const ya = bloqueActual.productos.some((x) => x.id === prod.id);
    if (ya) return;
    
    const unidadMedida = prod.unidadMedida || "UN";
    const valorVenta = Number(prod.valorVenta) || 0;
    const nuevo = {
      id: prod.id,
      nombre: prod.nombre,
      categoria: prod.categoria || "",
      subCategoria: prod.subCategoria || prod.subcategoria || "",
      unidadMedida,
      valorVenta,
      alto: 1,
      largo: 1,
      cantidad: 1,
      descuento: 0,
      descripcion: "",
    };
    
    const precio = calcularPrecioProductoObra({
      unidadMedida,
      alto: nuevo.alto,
      largo: nuevo.largo,
      valorVenta: nuevo.valorVenta,
      cantidad: nuevo.cantidad,
    });
    nuevo.precio = precio;
    
    setBloques(prev => prev.map((bloque, index) => 
      index === bloqueActivo 
        ? { ...bloque, productos: [...bloque.productos, nuevo] }
        : bloque
    ));
  };

  const agregarProductoManual = () => {
    const bloqueActual = bloques[bloqueActivo];
    if (!bloqueActual || bloqueActual.estaCerrado) return;
    
    const nuevo = {
      id: `manual-${Date.now()}`,
      nombre: "Nuevo ítem",
      categoria: "Manual",
      subCategoria: "",
      unidadMedida: "UN",
      valorVenta: 0,
      alto: 1,
      largo: 1,
      cantidad: 1,
      descuento: 0,
      descripcion: "",
      _esManual: true,
    };
    
    nuevo.precio = calcularPrecioProductoObra({ 
      unidadMedida: nuevo.unidadMedida, 
      alto: nuevo.alto, 
      largo: nuevo.largo, 
      valorVenta: nuevo.valorVenta, 
      cantidad: nuevo.cantidad 
    });
    
    setBloques(prev => prev.map((bloque, index) => 
      index === bloqueActivo 
        ? { ...bloque, productos: [nuevo, ...bloque.productos] }
        : bloque
    ));
  };

  const quitarProducto = (id) => {
    setBloques(prev => prev.map((bloque, index) => 
      index === bloqueActivo 
        ? { ...bloque, productos: bloque.productos.filter((p) => p.id !== id) }
        : bloque
    ));
  };

  const actualizarCampo = (id, campo, valor) => {
    setBloques(prev => prev.map((bloque, bloqueIndex) => 
      bloqueIndex === bloqueActivo 
        ? {
            ...bloque,
            productos: bloque.productos.map((p) => {
      if (p.id !== id) return p;
      
              const actualizado = { ...p };
              
              if (campo === "unidadMedida") {
                actualizado.unidadMedida = valor;
              } else if (campo === "descuento") {
                actualizado[campo] = Number(valor) || 0;
              } else if (campo === "valorVenta") {
                actualizado[campo] = valor === "" ? "" : Number(valor);
              } else if (campo === "descripcion") {
                actualizado[campo] = valor;
              } else {
                actualizado[campo] = valor === "" ? "" : Number(valor);
              }
              
              if (campo !== "descripcion") {
                const alto = Number(actualizado.alto) || 0;
                const largo = Number(actualizado.largo) || 0;
                const cantidad = Number(actualizado.cantidad) || 1;
                const valorVenta = Number(actualizado.valorVenta) || 0;
                
        const precioBase = calcularPrecioProductoObra({
          unidadMedida: actualizado.unidadMedida,
                  alto,
                  largo,
                  valorVenta,
                  cantidad,
        });
        actualizado.precio = Math.round(precioBase);
      }
      
      return actualizado;
            })
          }
        : bloque
    ));
  };

  const actualizarNombreManual = (id, nombre) => {
    setBloques(prev => prev.map((bloque, bloqueIndex) => 
      bloqueIndex === bloqueActivo 
        ? {
            ...bloque,
            productos: bloque.productos.map((p) => (p.id === id ? { ...p, nombre } : p))
          }
        : bloque
    ));
  };

  // Cálculos de totales por bloque
  const totalesPorBloque = useMemo(() => {
    return bloques.map(bloque => {
      const subtotal = bloque.productos.reduce((acc, p) => acc + Number(p.precio || 0), 0);
      const descuentoTotal = bloque.productos.reduce((acc, p) => acc + Number(p.precio || 0) * (Number(p.descuento || 0) / 100), 0);
      const descuentoEfectivo = obra?.pagoEnEfectivo ? subtotal * 0.1 : 0;
      const total = subtotal - descuentoTotal - descuentoEfectivo;
      return { subtotal, descuentoTotal, descuentoEfectivo, total };
    });
  }, [bloques, obra?.pagoEnEfectivo]);

  // Totales generales removidos: solo por bloque

  // Bloque actual
  const bloqueActual = bloques[bloqueActivo];
  const itemsSeleccionados = bloqueActual?.productos || [];

  // Función para guardar cambios
  const guardarCambios = useCallback(async () => {
    console.log("🔄 Iniciando guardado de cambios...");
    try {
      const obraRef = doc(db, "obras", obra.id);
      
      // Actualizar bloques con totales calculados
      const bloquesActualizados = bloques.map((bloque, index) => {
        const totales = totalesPorBloque[index];
        return {
          ...bloque,
          subtotal: totales.subtotal,
          descuentoTotal: totales.descuentoTotal,
          descuentoEfectivo: totales.descuentoEfectivo,
          total: totales.total,
        };
      });

      const updateData = {
        bloques: bloquesActualizados,
        fechaModificacion: new Date().toISOString(),
      };

      await updateDoc(obraRef, updateData);
      console.log("✅ Datos guardados en Firestore:", updateData);

      // Actualizar el estado local de la obra directamente
      const obraActualizada = {
        ...obra,
        ...updateData
      };
      
      // Notificar al componente padre para actualizar el estado
      if (onObraUpdate) {
        onObraUpdate(obraActualizada);
        console.log("✅ Estado local actualizado");
      }

    } catch (error) {
      console.error("Error guardando cambios:", error);
      alert("Error al guardar los cambios");
    }
  }, [obra, bloques, totalesPorBloque, onObraUpdate]);

  // Ejecutar guardado solo cuando shouldSave sea true
  useEffect(() => {
    console.log("🔍 useEffect shouldSave ejecutado - shouldSave:", shouldSave);
    if (shouldSave) {
      console.log("🔄 Guardando desde shouldSave...");
      guardarCambios();
      // Resetear el flag después de guardar
      if (onResetShouldSave) {
        setTimeout(() => onResetShouldSave(), 100);
      }
    }
  }, [shouldSave, onResetShouldSave, guardarCambios]);

  // Filtros para productos
  const fuenteProductos = busquedaDebounced
    ? (categoriaObraId ? (productosObraPorCategoria[categoriaObraId] || []) : productosObra)
    : (categoriaObraId ? productosObraPorCategoria[categoriaObraId] : productosObra);

  const productosFiltrados = fuenteProductos?.filter((prod) => {
    if (!busquedaDebounced) return true;
    const q = busquedaDebounced.toLowerCase();
    return String(prod.nombre || "").toLowerCase().includes(q) || 
           String(prod.unidadMedida || "").toLowerCase().includes(q);
  }).slice(0, 48) || [];

  // Si no está en modo edición, mostrar solo la visualización
  if (!editando) {
    return (
      <div className="space-y-6">
        {bloques.map((bloque, index) => (
          <Card key={bloque.id}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-lg font-semibold">{bloque.nombre}</span>
                  <span className="text-sm text-gray-500">
                    {bloque.productos?.length || 0} producto{(bloque.productos?.length || 0) !== 1 ? 's' : ''}
                  </span>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-500">Total del Bloque</div>
                  <div className="text-lg font-bold text-green-600">
                    ${formatearNumeroArgentino(bloque.total || 0)}
                  </div>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Totales del bloque */}
              <div className={`grid gap-4 mb-4 p-4 bg-gray-50 rounded-lg ${obra?.pagoEnEfectivo ? 'grid-cols-4' : 'grid-cols-3'}`}>
                <div className="text-center">
                  <div className="text-sm text-gray-500">Subtotal</div>
                  <div className="font-semibold">${formatearNumeroArgentino(bloque.subtotal || 0)}</div>
                </div>
                <div className="text-center">
                  <div className="text-sm text-gray-500">Descuento</div>
                  <div className="font-semibold text-orange-600">${formatearNumeroArgentino(bloque.descuentoTotal || 0)}</div>
                </div>
                {obra?.pagoEnEfectivo && (
                  <div className="text-center">
                    <div className="text-sm text-gray-500">Descuento (Efectivo 10%)</div>
                    <div className="font-semibold text-green-600">${formatearNumeroArgentino(bloque.descuentoEfectivo || 0)}</div>
                  </div>
                )}
                <div className="text-center">
                  <div className="text-sm text-gray-500">Total</div>
                  <div className="font-bold text-green-600">${formatearNumeroArgentino(bloque.total || 0)}</div>
                </div>
              </div>

              {/* Productos del bloque */}
              {bloque.productos && bloque.productos.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="p-2 text-left">Producto</th>
                        <th className="p-2 text-center">Cant.</th>
                        <th className="p-2 text-center">Unidad</th>
                        <th className="p-2 text-center">Alto</th>
                        <th className="p-2 text-center">Largo</th>
                        <th className="p-2 text-right">Valor Unit.</th>
                        <th className="p-2 text-center">Desc. %</th>
                        <th className="p-2 text-right">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bloque.productos.map((producto) => {
                        let subtotal = Number(producto.precio || 0) * (1 - Number(producto.descuento || 0) / 100);
                        // Si es pago en efectivo, aplicar descuento adicional del 10%
                        if (obra?.pagoEnEfectivo) {
                          subtotal = subtotal * 0.9;
                        }
                        return (
                          <React.Fragment key={producto.id}>
                            <tr className="border-b">
                              <td className="p-2">
                                <div className="font-medium">{producto.nombre}</div>
                                <div className="text-xs text-gray-500">{producto.categoria}</div>
                              </td>
                              <td className="p-2 text-center">{producto.cantidad}</td>
                              <td className="p-2 text-center">
                                <Badge variant="outline">{producto.unidadMedida}</Badge>
                              </td>
                              <td className="p-2 text-center">
                                {producto.unidadMedida === "M2" ? producto.alto : "-"}
                              </td>
                              <td className="p-2 text-center">
                                {(producto.unidadMedida === "M2" || producto.unidadMedida === "ML") ? producto.largo : "-"}
                              </td>
                              <td className="p-2 text-right">
                                ${formatearNumeroArgentino(
                                  obra?.pagoEnEfectivo 
                                    ? Number(producto.valorVenta) * 0.9
                                    : producto.valorVenta
                                )}
                              </td>
                              <td className="p-2 text-center">{producto.descuento}%</td>
                              <td className="p-2 text-right font-semibold">${formatearNumeroArgentino(subtotal)}</td>
                            </tr>
                            {producto.descripcion && (
                              <tr className="border-b bg-gray-50">
                                <td colSpan={8} className="p-2">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-medium text-gray-600 w-20">Descripción:</span>
                                    <span className="text-xs text-gray-700">{producto.descripcion}</span>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Icon icon="heroicons:cube" className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                  <p>No hay productos en este bloque</p>
                </div>
              )}

              {/* Descripción si existe */}
              {bloque.descripcion && (
                <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Icon icon="heroicons:document-text" className="w-4 h-4 text-blue-600" />
                    <span className="text-sm font-medium text-blue-800">Descripción</span>
                  </div>
                  <p className="text-sm text-blue-700">{bloque.descripcion}</p>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  // Modo edición
  return (
    <div className="space-y-6">
      {/* Gestión de Bloques */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Icon icon="heroicons:squares-2x2" className="w-5 h-5" />
              Gestión de Bloques
            </div>
            <Button onClick={agregarBloque} variant="outline" size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Agregar Bloque
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2 mb-4">
            {bloques.map((bloque, index) => (
              <div
                key={bloque.id}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border-2 cursor-pointer transition-all ${
                  index === bloqueActivo
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
                onClick={() => setBloqueActivo(index)}
              >
                {editandoNombreBloque === index ? (
                  <div className="flex items-center gap-2">
                    <Input
                      value={nuevoNombreBloque}
                      onChange={(e) => setNuevoNombreBloque(e.target.value)}
                      className="h-8 w-32"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          actualizarNombreBloque(index, nuevoNombreBloque);
                          setEditandoNombreBloque(null);
                          setNuevoNombreBloque("");
                        }
                        if (e.key === "Escape") {
                          setEditandoNombreBloque(null);
                          setNuevoNombreBloque("");
                        }
                      }}
                      autoFocus
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        actualizarNombreBloque(index, nuevoNombreBloque);
                        setEditandoNombreBloque(null);
                        setNuevoNombreBloque("");
                      }}
                    >
                      <Check className="w-3 h-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditandoNombreBloque(null);
                        setNuevoNombreBloque("");
                      }}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                ) : (
                  <>
                    <span className="font-medium">{bloque.nombre}</span>
                    <span className="text-xs text-gray-500">
                      ({bloque.productos.length} productos)
                    </span>
                    {bloque.estaCerrado && (
                      <Badge variant="secondary" className="text-xs">
                        <Check className="w-3 h-3 mr-1" />
                        Cerrado
                      </Badge>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditandoNombreBloque(index);
                        setNuevoNombreBloque(bloque.nombre);
                      }}
                    >
                      <Edit3 className="w-3 h-3" />
                    </Button>
                    {bloques.length > 1 && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          eliminarBloque(index);
                        }}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>

          {/* Información del bloque activo */}
          {bloqueActual && (
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-lg">{bloqueActual.nombre}</h3>
                <div className="flex gap-2">
                  {bloqueActual.estaCerrado ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => abrirBloque(bloqueActivo)}
                    >
                      <X className="w-4 h-4 mr-2" />
                      Abrir Bloque
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => cerrarBloque(bloqueActivo)}
                    >
                      <Check className="w-4 h-4 mr-2" />
                      Cerrar Bloque
                    </Button>
                  )}
                </div>
              </div>
              
              <div className={`grid gap-4 text-sm ${obra?.pagoEnEfectivo ? 'grid-cols-4' : 'grid-cols-3'}`}>
                <div className="text-center">
                  <div className="text-gray-500">Subtotal</div>
                  <div className="font-semibold">${formatearNumeroArgentino(totalesPorBloque[bloqueActivo]?.subtotal || 0)}</div>
                </div>
                <div className="text-center">
                  <div className="text-gray-500">Descuento</div>
                  <div className="font-semibold text-orange-600">${formatearNumeroArgentino(totalesPorBloque[bloqueActivo]?.descuentoTotal || 0)}</div>
                </div>
                {obra?.pagoEnEfectivo && (
                  <div className="text-center">
                    <div className="text-gray-500">Descuento (Efectivo 10%)</div>
                    <div className="font-semibold text-green-600">${formatearNumeroArgentino(totalesPorBloque[bloqueActivo]?.descuentoEfectivo || 0)}</div>
                  </div>
                )}
                <div className="text-center">
                  <div className="text-gray-500">Total</div>
                  <div className="font-bold text-green-600">${formatearNumeroArgentino(totalesPorBloque[bloqueActivo]?.total || 0)}</div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Catálogo de Productos */}
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
            <Icon icon="heroicons:cube" className="w-5 h-5" />
            Catálogo de Productos
        </CardTitle>
      </CardHeader>
        <CardContent>
          <div className="flex gap-2 items-center mb-4">
              <div className="flex-1">
                <Input
                  placeholder="Buscar productos..."
                  value={busquedaProductoObra}
                  onChange={(e) => setBusquedaProductoObra(e.target.value)}
                  className="flex-1"
                />
              </div>
              <Select value={categoriaObraId} onValueChange={setCategoriaObraId}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Todas las categorías" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todas las categorías</SelectItem>
                  {categoriasObra.map((cat) => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            <Button onClick={agregarProductoManual} variant="outline">
                <Plus className="w-4 h-4 mr-2" />
                Ítem Manual
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4 border rounded-lg">
              {productosFiltrados.map((prod) => {
              const yaAgregado = itemsSeleccionados.some((p) => p.id === prod.id);
                const precio = Number(prod.valorVenta) || 0;
                
                return (
                  <div key={prod.id} className={`group relative rounded-lg border-2 transition-all duration-200 hover:shadow-md h-full flex flex-col ${
                    yaAgregado ? "border-green-200 bg-green-50" : "border-gray-200 hover:border-blue-300"
                  }`}>
                    <div className="p-4 flex flex-col h-full">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-2">
                            <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold bg-blue-100 text-blue-700">
                              🏗️
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="text-sm font-semibold truncate">{prod.nombre}</h4>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-500">Precio:</span>
                          <span className="text-sm font-semibold">{formatearNumeroArgentino(precio)}</span>
                        </div>
                      </div>
                      <div className="mt-4">
                        <button
                        onClick={() => { if (!yaAgregado) agregarProducto(prod); }}
                          disabled={yaAgregado}
                          className={`w-full py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                            yaAgregado 
                              ? "bg-green-100 text-green-700 cursor-not-allowed" 
                              : "bg-blue-600 text-white hover:bg-blue-700"
                          }`}
                        >
                          {yaAgregado ? "Ya agregado" : "Agregar"}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
        </CardContent>
      </Card>

      {/* Productos Seleccionados */}
      {itemsSeleccionados.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Icon icon="heroicons:clipboard-document-list" className="w-5 h-5" />
              Productos del Bloque: {bloqueActual?.nombre}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="p-2 text-left">Producto</th>
                    <th className="p-2 text-center">Cant.</th>
                    <th className="p-2 text-center">Unidad</th>
                    <th className="p-2 text-center">Alto</th>
                    <th className="p-2 text-center">Largo</th>
                    <th className="p-2 text-right">Valor Unit.</th>
                    <th className="p-2 text-center">Desc. %</th>
                    <th className="p-2 text-right">Subtotal</th>
                    <th className="p-2 text-center">Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {itemsSeleccionados.map((p) => {
                    const u = String(p.unidadMedida || "UN").toUpperCase();
                    const sub = Number(p.precio || 0) * (1 - Number(p.descuento || 0) / 100);
                    const requiereAlto = u === "M2";
                    const requiereLargo = u === "M2" || u === "ML";
                    
                    return (
                      <React.Fragment key={p.id}>
                        <tr className="border-b">
                          <td className="p-2">
                            <div className="font-medium">
                              {p._esManual ? (
                                <Input
                                  value={p.nombre}
                                  onChange={(e) => actualizarNombreManual(p.id, e.target.value)}
                                  className="h-8"
                                />
                              ) : (
                                p.nombre
                              )}
                            </div>
                            <div className="text-xs text-gray-500">{p.categoria}</div>
                          </td>
                          
                          <td className="p-2 text-center">
                            <Input
                              type="number"
                              min={1}
                              value={p.cantidad}
                              onChange={(e) => actualizarCampo(p.id, "cantidad", e.target.value)}
                              className="w-20 mx-auto"
                            />
                          </td>
                          
                          <td className="p-2 text-center">
                            {p._esManual ? (
                              <Select
                                value={u}
                                onValueChange={(v) => actualizarCampo(p.id, "unidadMedida", v)}
                              >
                                <SelectTrigger className="w-24 mx-auto h-8">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="UN">UN</SelectItem>
                                  <SelectItem value="M2">M2</SelectItem>
                                  <SelectItem value="ML">ML</SelectItem>
                                </SelectContent>
                              </Select>
                            ) : (
                              <Badge variant="outline">{u}</Badge>
                            )}
                          </td>
                          
                          <td className="p-2 text-center">
                            {requiereAlto ? (
                                <Input
                                  type="number"
                                  min={0}
                                  step="0.01"
                                  value={p.alto}
                                onChange={(e) => actualizarCampo(p.id, "alto", e.target.value)}
                                  className="w-24 mx-auto"
                                />
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          
                          <td className="p-2 text-center">
                            {requiereLargo ? (
                                <Input
                                  type="number"
                                  min={0}
                                  step="0.01"
                                  value={p.largo}
                                onChange={(e) => actualizarCampo(p.id, "largo", e.target.value)}
                                  className="w-24 mx-auto"
                                />
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          
                          <td className="p-2 text-right">
                            {p._esManual ? (
                              <div className="relative w-28 ml-auto">
                                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-sm text-default-500">$</span>
                                <Input
                                  type="number"
                                  min={0}
                                  step="0.01"
                                  value={p.valorVenta || 0}
                                  onChange={(e) => actualizarCampo(p.id, "valorVenta", e.target.value)}
                                  className="pl-5 pr-2 h-8 text-right"
                                />
                              </div>
                            ) : (
                              formatearNumeroArgentino(p.valorVenta || 0)
                            )}
                          </td>
                          
                          <td className="p-2 text-center">
                              <Input
                                type="number"
                                min={0}
                                max={100}
                                value={p.descuento}
                              onChange={(e) => actualizarCampo(p.id, "descuento", e.target.value)}
                                className="w-20 mx-auto"
                              />
                          </td>
                          
                          <td className="p-2 text-right font-semibold">
                            {formatearNumeroArgentino(Math.round(sub))}
                          </td>
                          
                            <td className="p-2 text-center">
                              <Button
                                variant="outline"
                                size="sm"
                              onClick={() => quitarProducto(p.id)}
                              >
                                Quitar
                              </Button>
                            </td>
                        </tr>
                        {/* Fila adicional para descripción del producto */}
                        <tr className="border-b bg-gray-50">
                          <td colSpan={9} className="p-2">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-medium text-gray-600 w-20">Descripción:</span>
                                <Textarea
                                  placeholder="Escribe una descripción específica para este producto..."
                                  value={p.descripcion || ""}
                                onChange={(e) => actualizarCampo(p.id, "descripcion", e.target.value)}
                                  className="flex-1 min-h-[60px] resize-none"
                                  rows={2}
                                />
                            </div>
                          </td>
                        </tr>
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Descripción del Presupuesto (Bloque) - siempre visible en edición */}
      {bloqueActual && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Icon icon="heroicons:document-text" className="w-5 h-5" />
              Descripción del Presupuesto (Bloque actual)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="Escribe una descripción para este presupuesto (bloque) que aparecerá en la impresión"
              value={bloqueActual?.descripcion || ""}
              onChange={(e) => actualizarDescripcionBloque(bloqueActivo, e.target.value)}
              className="min-h-[80px] resize-none"
              rows={3}
              disabled={bloqueActual?.estaCerrado}
            />
          </CardContent>
        </Card>
      )}

      {/* Descripción general removida: se usa descripción por bloque */}

            {/* Botón de Guardar */}
      <div className="flex justify-end">
        <Button 
          onClick={() => {
            console.log("🔘 Botón Guardar Cambios clickeado");
            guardarCambios();
          }} 
          className="flex items-center gap-2"
        >
          <Save className="w-4 h-4" />
          Guardar Cambios
        </Button>
      </div>
            </div>
  );
};

export default PresupuestoDetalle;