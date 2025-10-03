"use client";
import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { db } from "@/lib/firebase";
import {
  collection,
  getDocs,
  updateDoc,
  doc,
  query,
  orderBy,
} from "firebase/firestore";
import { Loader2, Pencil, TrendingUp, Package, Settings, CheckSquare, Square } from "lucide-react";
import { Icon } from "@iconify/react";

const PreciosPage = () => {
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState("");
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState("");
  const [filtroTipoMadera, setFiltroTipoMadera] = useState("");
  const [filtroSubCategoria, setFiltroSubCategoria] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTipo, setModalTipo] = useState("");
  const [editProd, setEditProd] = useState(null);
  const [editForm, setEditForm] = useState({
    costo: "",
    valorVenta: "",
  });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [porcentajeAumento, setPorcentajeAumento] = useState("");
  const [tipoMaderaSeleccionado, setTipoMaderaSeleccionado] = useState("");
  const [proveedorSeleccionado, setProveedorSeleccionado] = useState("");
  
  // Nuevos estados para selección múltiple
  const [productosSeleccionados, setProductosSeleccionados] = useState(new Set());
  const [modalSeleccionMultiple, setModalSeleccionMultiple] = useState(false);
  const [porcentajeSeleccionMultiple, setPorcentajeSeleccionMultiple] = useState("");
  const [modoActualizacion, setModoActualizacion] = useState("porcentaje"); // "porcentaje" o "valor"
  const [valorEspecifico, setValorEspecifico] = useState("");

  // Estados para paginación optimizada
  const [paginaActual, setPaginaActual] = useState(1);
  const [productosPorPagina, setProductosPorPagina] = useState(20);
  const [isLoadingPagination, setIsLoadingPagination] = useState(false);

  useEffect(() => {
    const fetchProductos = async () => {
      setLoading(true);
      try {
        const q = query(collection(db, "productos"), orderBy("nombre"));
        const snap = await getDocs(q);
        setProductos(snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
      } catch (error) {
        console.error("Error al cargar productos:", error);
        setMsg("Error al cargar productos: " + error.message);
      } finally {
        setLoading(false);
      }
    };
    fetchProductos();
  }, []);

  // Limpiar selección cuando cambian los filtros
  useEffect(() => {
    setProductosSeleccionados(new Set());
  }, [filtro, categoriaSeleccionada, filtroTipoMadera, filtroSubCategoria]);

  const categorias = [...new Set(productos.map((p) => p.categoria))].filter(
    Boolean
  );
  const tiposMadera = [
    ...new Set(
      productos
        .filter((p) => p.categoria === "Maderas" && p.tipoMadera)
        .map((p) => p.tipoMadera)
    ),
  ].filter(Boolean);
  
  // Obtener subcategorías de ferretería únicas
  const subCategoriasFerreteria = [
    ...new Set(
      productos
        .filter((p) => p.categoria === "Ferretería" && p.subCategoria)
        .map((p) => p.subCategoria)
    ),
  ].filter(Boolean);
  
  const proveedores = [
    ...new Set(productos.filter((p) => p.proveedor).map((p) => p.proveedor)),
  ].filter(Boolean);

  // Función para redondear a centenas (múltiplos de 100) - igual que en ventas
  const redondearDecimal = (numero) => {
    if (typeof numero !== 'number' || isNaN(numero)) return 0;
    
    // Redondear a centenas (múltiplos de 100) para consistencia con el sistema de ventas
    return Math.round(numero / 100) * 100;
  };

  // Función para validar y formatear números de entrada
  const validarNumero = (valor) => {
    if (!valor || valor === "") return null;
    const numero = Number(valor);
    if (isNaN(numero) || numero < 0) return null;
    return redondearDecimal(numero);
  };

  // Función para validar porcentaje
  const validarPorcentaje = (valor) => {
    if (!valor || valor === "") return null;
    const numero = Number(valor);
    if (isNaN(numero) || numero < -100 || numero > 100) return null;
    return numero;
  };

  // Función para calcular el porcentaje necesario para llegar a un valor objetivo
  const calcularPorcentajeParaObjetivo = (valorActual, valorObjetivo) => {
    if (!valorActual || !valorObjetivo || valorActual <= 0) return null;
    const porcentaje = ((valorObjetivo - valorActual) / valorActual) * 100;
    return redondearDecimal(porcentaje);
  };

  // Funciones para manejo de selección múltiple
  const handleSeleccionarProducto = (productoId) => {
    if (!productoId) return;
    
    setProductosSeleccionados(prev => {
      const nuevosSeleccionados = new Set(prev);
      if (nuevosSeleccionados.has(productoId)) {
        nuevosSeleccionados.delete(productoId);
      } else {
        nuevosSeleccionados.add(productoId);
      }
      return nuevosSeleccionados;
    });
  };

  const handleSeleccionarTodos = () => {
    if (productosPaginados.length === 0) return;
    
    setProductosSeleccionados(prev => {
      if (prev.size === productosPaginados.length) {
        return new Set();
      } else {
        return new Set(productosPaginados.map(p => p.id));
      }
    });
  };

  const handleActualizarSeleccionMultiple = async () => {
    if (productosSeleccionados.size === 0) {
      setMsg("Por favor selecciona productos.");
      return;
    }

    let porcentaje = null;
    let valorObjetivo = null;

    if (modoActualizacion === "porcentaje") {
      if (!porcentajeSeleccionMultiple) {
        setMsg("Por favor ingresa un porcentaje válido.");
        return;
      }
      porcentaje = validarPorcentaje(porcentajeSeleccionMultiple);
      if (porcentaje === null) {
        setMsg("Por favor ingresa un porcentaje válido entre -100 y 100.");
        return;
      }
    } else {
      if (!valorEspecifico) {
        setMsg("Por favor ingresa un valor específico.");
        return;
      }
      valorObjetivo = validarNumero(valorEspecifico);
      if (valorObjetivo === null) {
        setMsg("Por favor ingresa un valor válido mayor a 0.");
        return;
      }
    }

    setSaving(true);
    setMsg("");
    
    try {
      const productosAActualizar = productos.filter(p => productosSeleccionados.has(p.id));
      let actualizados = 0;
      let errores = 0;
      let sinCambios = 0;

      for (const producto of productosAActualizar) {
        try {
          const updates = {};
          
          if (producto.categoria === "Maderas" && producto.precioPorPie) {
            let nuevoPrecio;
            if (modoActualizacion === "porcentaje") {
              const factorAumento = porcentaje / 100;
              nuevoPrecio = redondearDecimal(producto.precioPorPie * (1 + factorAumento));
            } else {
              nuevoPrecio = redondearDecimal(valorObjetivo);
            }
            if (nuevoPrecio > 0) {
              updates.precioPorPie = nuevoPrecio;
            }
          } else if (producto.valorVenta) {
            let nuevoPrecio;
            if (modoActualizacion === "porcentaje") {
              const factorAumento = porcentaje / 100;
              nuevoPrecio = redondearDecimal(producto.valorVenta * (1 + factorAumento));
            } else {
              nuevoPrecio = redondearDecimal(valorObjetivo);
            }
            if (nuevoPrecio > 0) {
              updates.valorVenta = nuevoPrecio;
            }
          }

          if (Object.keys(updates).length > 0) {
            await updateDoc(doc(db, "productos", producto.id), updates);
            actualizados++;
          } else {
            sinCambios++;
          }
        } catch (error) {
          console.error(`Error al actualizar producto ${producto.id}:`, error);
          errores++;
        }
      }

      // Mensaje detallado del resultado
      let mensaje = `${actualizados} productos actualizados correctamente.`;
      if (sinCambios > 0) {
        mensaje += ` ${sinCambios} sin cambios (sin precio válido).`;
      }
      if (errores > 0) {
        mensaje += ` ${errores} errores.`;
      }
      setMsg(mensaje);

      // Limpiar selección y recargar productos
      setProductosSeleccionados(new Set());
      setPorcentajeSeleccionMultiple("");
      setValorEspecifico("");

      const q = query(collection(db, "productos"), orderBy("nombre"));
      const snap = await getDocs(q);
      setProductos(snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
      
      setTimeout(() => {
        setModalSeleccionMultiple(false);
      }, 2000);
    } catch (error) {
      console.error("Error general:", error);
      setMsg("Error al actualizar productos: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleEditarIndividual = (prod) => {
    if (!prod) return;
    
    setModalTipo("individual");
    setEditProd(prod);
    setEditForm({
      costo: prod.costo ? String(prod.costo) : "",
      valorVenta: prod.valorVenta ? String(prod.valorVenta) : "",
    });
    setMsg("");
    setModalOpen(true);
  };

  const handleActualizacionGlobal = (tipo) => {
    setModalTipo(tipo);
    setEditProd(null);
    setEditForm({ costo: "", valorVenta: "" });
    setPorcentajeAumento("");
    setTipoMaderaSeleccionado("");
    setProveedorSeleccionado("");
    setMsg("");
    setModalOpen(true);
  };

  // Función para abrir modal de selección múltiple
  const abrirModalSeleccionMultiple = () => {
    setModoActualizacion("porcentaje");
    setPorcentajeSeleccionMultiple("");
    setValorEspecifico("");
    setMsg("");
    setModalSeleccionMultiple(true);
  };

  const handleGuardarIndividual = async () => {
    if (!editProd) {
      setMsg("Error: No hay producto seleccionado.");
      return;
    }

    setSaving(true);
    setMsg("");
    
    try {
      const updates = {};
      
      if (editForm.costo !== "") {
        const costo = validarNumero(editForm.costo);
        if (costo !== null) {
          updates.costo = redondearDecimal(costo);
        } else {
          setMsg("Por favor ingresa un costo válido (número mayor o igual a 0).");
          setSaving(false);
          return;
        }
      }
      
      if (editForm.valorVenta !== "") {
        const valorVenta = validarNumero(editForm.valorVenta);
        if (valorVenta !== null) {
          updates.valorVenta = redondearDecimal(valorVenta);
        } else {
          setMsg("Por favor ingresa un precio de venta válido (número mayor o igual a 0).");
          setSaving(false);
          return;
        }
      }

      if (Object.keys(updates).length === 0) {
        setMsg("Por favor ingresa al menos un valor válido.");
        setSaving(false);
        return;
      }

      await updateDoc(doc(db, "productos", editProd.id), updates);
      setMsg("Precios actualizados correctamente.");

      const q = query(collection(db, "productos"), orderBy("nombre"));
      const snap = await getDocs(q);
      setProductos(snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
      
      setTimeout(() => {
        setModalOpen(false);
        setEditProd(null);
      }, 1000);
    } catch (error) {
      console.error("Error al guardar:", error);
      setMsg("Error al guardar: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleGuardarGlobal = async () => {
    if (!porcentajeAumento || (!tipoMaderaSeleccionado && !proveedorSeleccionado)) {
      setMsg("Por favor completa todos los campos requeridos.");
      return;
    }

    const porcentaje = validarPorcentaje(porcentajeAumento);
    if (porcentaje === null) {
      setMsg("Por favor ingresa un porcentaje válido entre -100 y 100.");
      return;
    }

    setSaving(true);
    setMsg("");
    
    try {
      let productosAActualizar = [];

      if (modalTipo === "maderas") {
        productosAActualizar = productos.filter(
          (p) => p.categoria === "Maderas" && p.tipoMadera === tipoMaderaSeleccionado
        );
      } else if (modalTipo === "proveedor") {
        productosAActualizar = productos.filter(
          (p) => p.proveedor === proveedorSeleccionado
        );
      }

      if (productosAActualizar.length === 0) {
        setMsg("No se encontraron productos para actualizar.");
        setSaving(false);
        return;
      }

      const factorAumento = porcentaje / 100;
      let actualizados = 0;
      let sinCambios = 0;

      for (const producto of productosAActualizar) {
        try {
          const updates = {};

          if (producto.valorVenta) {
            const nuevoPrecio = redondearDecimal(producto.valorVenta * (1 + factorAumento));
            if (nuevoPrecio > 0) {
              updates.valorVenta = nuevoPrecio;
            }
          }
          
          if (producto.precioPorPie) {
            const nuevoPrecio = redondearDecimal(producto.precioPorPie * (1 + factorAumento));
            if (nuevoPrecio > 0) {
              updates.precioPorPie = nuevoPrecio;
            }
          }

          if (Object.keys(updates).length > 0) {
            await updateDoc(doc(db, "productos", producto.id), updates);
            actualizados++;
          } else {
            sinCambios++;
          }
        } catch (error) {
          console.error(`Error al actualizar producto ${producto.id}:`, error);
        }
      }

      // Mensaje detallado del resultado
      let mensaje = `${actualizados} productos actualizados correctamente.`;
      if (sinCambios > 0) {
        mensaje += ` ${sinCambios} sin cambios (sin precio válido).`;
      }
      setMsg(mensaje);

      const q = query(collection(db, "productos"), orderBy("nombre"));
      const snap = await getDocs(q);
      setProductos(snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
      
      setTimeout(() => {
        setModalOpen(false);
      }, 1000);
    } catch (error) {
      console.error("Error general:", error);
      setMsg("Error al guardar: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  const productosFiltrados = productos.filter((p) => {
    // Función para normalizar texto (eliminar espacios y convertir a minúsculas)
    const normalizarTexto = (texto) => {
      if (!texto) return "";
      return texto.toLowerCase().replace(/\s+/g, '');
    };

    // Normalizar el término de búsqueda
    const filtroNormalizado = normalizarTexto(filtro);
    
    // Normalizar el nombre del producto
    const nombreNormalizado = normalizarTexto(p.nombre);
    
    // Normalizar la categoría
    const categoriaNormalizada = normalizarTexto(p.categoria);

    // Filtro por búsqueda de texto (ahora más flexible)
    const cumpleBusqueda =
      filtroNormalizado === "" ||
      nombreNormalizado.includes(filtroNormalizado) ||
      categoriaNormalizada.includes(filtroNormalizado);

    // Filtro por categoría principal
    const cumpleCategoria =
      !categoriaSeleccionada || p.categoria === categoriaSeleccionada;

    // Filtro específico por tipo de madera
    const cumpleTipoMadera =
      categoriaSeleccionada !== "Maderas" ||
      filtroTipoMadera === "" ||
      p.tipoMadera === filtroTipoMadera;

    // Filtro específico por subcategoría de ferretería
    const cumpleSubCategoria =
      categoriaSeleccionada !== "Ferretería" ||
      filtroSubCategoria === "" ||
      p.subCategoria === filtroSubCategoria;

    return cumpleBusqueda && cumpleCategoria && cumpleTipoMadera && cumpleSubCategoria;
  });

  // Productos paginados optimizados
  const productosPaginados = useMemo(() => {
    const inicio = (paginaActual - 1) * productosPorPagina;
    const fin = inicio + productosPorPagina;
    return productosFiltrados.slice(inicio, fin);
  }, [productosFiltrados, paginaActual, productosPorPagina]);

  // Cálculo de totales optimizados
  const totalProductos = productosFiltrados.length;
  const totalPaginas = Math.ceil(totalProductos / productosPorPagina);

  // Función para cambiar página con feedback visual
  const cambiarPagina = useCallback((nuevaPagina) => {
    if (nuevaPagina < 1 || nuevaPagina > totalPaginas) return;
    
    setIsLoadingPagination(true);
    setPaginaActual(nuevaPagina);
    
    // Simular un pequeño delay para mostrar el feedback visual
    setTimeout(() => {
      setIsLoadingPagination(false);
    }, 300);
  }, [totalPaginas]);

  // Resetear página cuando cambian los filtros
  useEffect(() => {
    setPaginaActual(1);
  }, [categoriaSeleccionada, filtro, filtroTipoMadera, filtroSubCategoria]);

  const getIconoCategoria = (categoria) => {
    switch (categoria) {
      case "Maderas":
        return "🌲";
      case "Ferretería":
        return "🔧";
      case "Herramientas":
        return "🛠️";
      case "Químicos":
        return "🧪";
      default:
        return "📦";
    }
  };

  const getColorCategoria = (categoria) => {
    switch (categoria) {
      case "Maderas":
        return "bg-orange-100 text-orange-800 border-orange-200";
      case "Ferretería":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "Herramientas":
        return "bg-green-100 text-green-800 border-green-200";
      case "Químicos":
        return "bg-purple-100 text-purple-800 border-purple-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  // Verificar si todos los productos paginados están seleccionados
  const todosSeleccionados = productosPaginados.length > 0 && 
    productosSeleccionados.size === productosPaginados.length;

  return (
    <div className="py-8 px-2 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Gestión de Precios</h1>
        <p className="text-lg text-gray-600">
          Sistema profesional de actualización de precios por categorías
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card className="border-2 border-orange-200 hover:border-orange-300 transition-colors">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                <Icon
                  icon="mdi:pine-tree"
                  className="w-6 h-6 text-orange-600"
                />
              </div>
              <div>
                <CardTitle className="text-lg">Maderas</CardTitle>
                <p className="text-sm text-gray-600">
                  Actualización por tipo de madera
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => handleActualizacionGlobal("maderas")}
              className="w-full bg-orange-600 hover:bg-orange-700"
            >
              <TrendingUp className="w-4 h-4 mr-2" />
              Actualizar Maderas
            </Button>
          </CardContent>
        </Card>

        <Card className="border-2 border-blue-200 hover:border-blue-300 transition-colors">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Icon
                  icon="mdi:package-variant"
                  className="w-6 h-6 text-blue-600"
                />
              </div>
              <div>
                <CardTitle className="text-lg">Proveedores</CardTitle>
                <p className="text-sm text-gray-600">
                  Actualización por proveedor
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => handleActualizacionGlobal("proveedor")}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              <Package className="w-4 h-4 mr-2" />
              Actualizar Proveedores
            </Button>
          </CardContent>
        </Card>

        <Card className="border-2 border-green-200 hover:border-green-300 transition-colors">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <Icon icon="mdi:tools" className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <CardTitle className="text-lg">Individual</CardTitle>
                <p className="text-sm text-gray-600">
                  Edición producto por producto
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => setCategoriaSeleccionada("")}
              className="w-full bg-green-600 hover:bg-green-700"
            >
              <Settings className="w-4 h-4 mr-2" />
              Ver Todos
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
              <CardTitle>Listado de Productos</CardTitle>
              <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
                <select
                  value={categoriaSeleccionada}
                  onChange={(e) => {
                    setCategoriaSeleccionada(e.target.value);
                    // Limpiar filtros específicos al cambiar categoría
                    setFiltroTipoMadera("");
                    setFiltroSubCategoria("");
                  }}
                  className="w-full md:w-48 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Todas las categorías</option>
                  {categorias.map((cat) => (
                    <option key={cat} value={cat}>
                      {getIconoCategoria(cat)} {cat}
                    </option>
                  ))}
                </select>
                <Input
                  placeholder="Buscar producto..."
                  value={filtro}
                  onChange={(e) => setFiltro(e.target.value)}
                  className="w-full md:w-64"
                />
              </div>
            </div>

            {/* Filtros específicos por categoría */}
            <div className="flex flex-col sm:flex-row gap-3">
              {/* Filtro de tipo de madera */}
              {categoriaSeleccionada === "Maderas" && tiposMadera.length > 0 && (
                <div className="flex-1">
                  <div className="flex bg-white rounded-lg p-1 shadow-sm border border-gray-200">
                    <button
                      type="button"
                      className={`rounded-full px-4 py-1 text-sm flex items-center gap-2 transition-all ${
                        filtroTipoMadera === ""
                          ? "bg-orange-600 text-white"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                      onClick={() => setFiltroTipoMadera("")}
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
                      >
                        {tipo}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Filtro de subcategoría de ferretería */}
              {categoriaSeleccionada === "Ferretería" &&
                subCategoriasFerreteria.length > 0 && (
                  <div className="flex-1">
                    <div className="flex bg-white rounded-lg p-1 shadow-sm border border-gray-200">
                      <button
                        type="button"
                        className={`rounded-md px-4 py-1 text-sm flex items-center gap-2 transition-all ${
                          filtroSubCategoria === ""
                            ? "bg-blue-600 text-white"
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                        }`}
                        onClick={() => setFiltroSubCategoria("")}
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
                        >
                          {subCategoria}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
            </div>

            {/* Indicador de productos filtrados y botón de selección múltiple */}
            <div className="flex items-center justify-between">
              <div className="flex gap-2">
                {productosSeleccionados.size > 0 && (
                  <Button
                    onClick={abrirModalSeleccionMultiple}
                    className="bg-purple-600 hover:bg-purple-700 text-white"
                    size="sm"
                  >
                    <TrendingUp className="w-4 h-4 mr-2" />
                    Actualizar {productosSeleccionados.size} productos
                  </Button>
                )}
                {(filtro || categoriaSeleccionada || filtroTipoMadera || filtroSubCategoria) && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setFiltro("");
                      setCategoriaSeleccionada("");
                      setFiltroTipoMadera("");
                      setFiltroSubCategoria("");
                    }}
                    className="text-xs"
                  >
                    Limpiar filtros
                  </Button>
                )}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {loading ? (
            <div className="flex justify-center items-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <div className="flex items-center justify-center">
                      <button
                        onClick={handleSeleccionarTodos}
                        className="p-1 hover:bg-gray-100 rounded"
                        disabled={productosPaginados.length === 0}
                      >
                        {todosSeleccionados ? (
                          <CheckSquare className="w-4 h-4 text-blue-600" />
                        ) : (
                          <Square className="w-4 h-4 text-gray-400" />
                        )}
                      </button>
                    </div>
                  </TableHead>
                  <TableHead>Producto</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead>Unidad</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead>Precio Actual</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="relative">
                {/* Overlay de carga durante la paginación */}
                {isLoadingPagination && (
                  <div className="absolute inset-0 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm z-10 flex items-center justify-center rounded-lg">
                    <div className="flex items-center gap-3 bg-white dark:bg-gray-700 px-4 py-3 rounded-lg shadow-lg border border-gray-200 dark:border-gray-600">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Cargando productos...
                      </span>
                    </div>
                  </div>
                )}
                
                {productosPaginados.map((p) => (
                  <TableRow key={p.id} className="hover:bg-gray-50">
                    <TableCell>
                      <div className="flex items-center justify-center">
                        <Checkbox
                          checked={productosSeleccionados.has(p.id)}
                          onCheckedChange={() => handleSeleccionarProducto(p.id)}
                          className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                        />
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{p.nombre}</div>
                        {p.tipoMadera && (
                          <Badge variant="outline" className="text-xs mt-1">
                            {p.tipoMadera}
                          </Badge>
                        )}
                        {p.proveedor && (
                          <Badge
                            variant="outline"
                            className="text-xs mt-1 ml-1"
                          >
                            {p.proveedor}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getColorCategoria(p.categoria)}>
                        {getIconoCategoria(p.categoria)} {p.categoria}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {p.unidadMedida ||
                        p.unidadVenta ||
                        p.unidadVentaHerraje ||
                        p.unidadVentaQuimico ||
                        p.unidadVentaHerramienta}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`font-medium ${
                          p.stock > 10
                            ? "text-green-600"
                            : p.stock > 0
                            ? "text-yellow-600"
                            : "text-red-600"
                        }`}
                      >
                        {p.stock || 0}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {p.valorVenta && (
                          <div>Venta: ${redondearDecimal(p.valorVenta).toFixed(2)}</div>
                        )}
                        {p.precioPorPie && (
                          <div>$/pie: ${redondearDecimal(p.precioPorPie).toFixed(2)}</div>
                        )}
                        {p.costo && (
                          <div className="text-gray-500">
                            Costo: ${redondearDecimal(p.costo).toFixed(2)}
                          </div>
                        )}
                        {!p.valorVenta && !p.precioPorPie && !p.costo && (
                          <div className="text-gray-400 italic">Sin precio</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEditarIndividual(p)}
                        className="bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100"
                      >
                        <Pencil className="w-4 h-4 mr-1" />
                        Editar
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          
          {/* Paginación profesional */}
          {productosFiltrados.length > 0 && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50">
              <div className="flex items-center gap-4">
                <div className="text-sm text-gray-600">
                  Mostrando <span className="font-semibold">
                    {((paginaActual - 1) * productosPorPagina) + 1}
                  </span> a <span className="font-semibold">
                    {Math.min(paginaActual * productosPorPagina, totalProductos)}
                  </span> de <span className="font-semibold">{totalProductos}</span> productos
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">Productos por página:</span>
                  <select
                    value={productosPorPagina}
                    onChange={(e) => {
                      setProductosPorPagina(Number(e.target.value));
                      setPaginaActual(1);
                    }}
                    className="px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => cambiarPagina(1)}
                  disabled={paginaActual === 1}
                  className="px-3 py-1"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                  </svg>
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => cambiarPagina(paginaActual - 1)}
                  disabled={paginaActual === 1}
                  className="px-3 py-1"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                  </svg>
                </Button>
                
                <div className="flex items-center gap-1">
                  {(() => {
                    const paginas = [];
                    const paginasAMostrar = 5;
                    const inicio = Math.max(1, paginaActual - Math.floor(paginasAMostrar / 2));
                    const fin = Math.min(totalPaginas, inicio + paginasAMostrar - 1);
                    
                    // Agregar primera página si no está incluida
                    if (inicio > 1) {
                      paginas.push(
                        <Button
                          key={1}
                          variant={paginaActual === 1 ? "default" : "outline"}
                          size="sm"
                          onClick={() => cambiarPagina(1)}
                          className="px-3 py-1"
                        >
                          1
                        </Button>
                      );
                      if (inicio > 2) {
                        paginas.push(
                          <span key="dots1" className="px-2 text-gray-500">...</span>
                        );
                      }
                    }
                    
                    // Agregar páginas del rango
                    for (let i = inicio; i <= fin; i++) {
                      paginas.push(
                        <Button
                          key={i}
                          variant={paginaActual === i ? "default" : "outline"}
                          size="sm"
                          onClick={() => cambiarPagina(i)}
                          className="px-3 py-1"
                        >
                          {i}
                        </Button>
                      );
                    }
                    
                    // Agregar última página si no está incluida
                    if (fin < totalPaginas) {
                      if (fin < totalPaginas - 1) {
                        paginas.push(
                          <span key="dots2" className="px-2 text-gray-500">...</span>
                        );
                      }
                      paginas.push(
                        <Button
                          key={totalPaginas}
                          variant={paginaActual === totalPaginas ? "default" : "outline"}
                          size="sm"
                          onClick={() => cambiarPagina(totalPaginas)}
                          className="px-3 py-1"
                        >
                          {totalPaginas}
                        </Button>
                      );
                    }
                    
                    return paginas;
                  })()}
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => cambiarPagina(paginaActual + 1)}
                  disabled={paginaActual === totalPaginas}
                  className="px-3 py-1"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                  </svg>
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => cambiarPagina(totalPaginas)}
                  disabled={paginaActual === totalPaginas}
                  className="px-3 py-1"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 5l7 7-7 7m-8 0l7-7-7-7" />
                  </svg>
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal para actualización de selección múltiple */}
      <Dialog open={modalSeleccionMultiple} onOpenChange={setModalSeleccionMultiple}>
        <DialogContent className="w-[95vw] max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Actualizar Productos Seleccionados
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-2">
            <div className="bg-purple-50 p-4 rounded-lg">
              <div className="font-bold text-lg mb-2">
                📊 Actualización Personalizada
              </div>
              <div className="text-sm text-gray-600">
                Se actualizarán {productosSeleccionados.size} productos seleccionados.
                {productos.filter(p => productosSeleccionados.has(p.id) && p.categoria === "Maderas").length > 0 && (
                  <div className="mt-2 text-purple-700">
                    • Maderas: se actualizará precioPorPie
                  </div>
                )}
                {productos.filter(p => productosSeleccionados.has(p.id) && p.categoria !== "Maderas").length > 0 && (
                  <div className="mt-1 text-purple-700">
                    • Otros: se actualizará valorVenta
                  </div>
                )}
              </div>
            </div>

            {/* Selector de modo de actualización */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Modo de Actualización
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setModoActualizacion("porcentaje")}
                  className={`flex-1 px-4 py-2 rounded-lg border transition-all ${
                    modoActualizacion === "porcentaje"
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  📊 Por Porcentaje
                </button>
                <button
                  type="button"
                  onClick={() => setModoActualizacion("valor")}
                  className={`flex-1 px-4 py-2 rounded-lg border transition-all ${
                    modoActualizacion === "valor"
                      ? "bg-green-600 text-white border-green-600"
                      : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  💰 Valor Específico
                </button>
              </div>
            </div>

            {/* Campo de entrada según el modo */}
            {modoActualizacion === "porcentaje" ? (
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Porcentaje de Aumento
                </label>
                <Input
                  type="number"
                  min={-100}
                  max={100}
                  step={0.1}
                  placeholder="Porcentaje de aumento (ej: 15 para 15%)"
                  value={porcentajeSeleccionMultiple}
                  onChange={(e) => {
                    const valor = e.target.value;
                    // Solo permitir números, punto decimal, signo negativo y backspace
                    if (valor === "" || /^-?\d*\.?\d{0,1}$/.test(valor)) {
                      setPorcentajeSeleccionMultiple(valor);
                    }
                  }}
                />
                <div className="text-xs text-gray-500">
                  💡 Para calcular el porcentaje correcto: 
                  <br />
                  • De 825 a 1000 = 21.21% (no 45.45%)
                  <br />
                  • Fórmula: ((valor objetivo - valor actual) / valor actual) × 100
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Valor Específico
                </label>
                <Input
                  type="number"
                  min={0}
                  step={0.01}
                  placeholder="Valor específico (ej: 1000)"
                  value={valorEspecifico}
                  onChange={(e) => {
                    const valor = e.target.value;
                    // Solo permitir números, punto decimal y backspace
                    if (valor === "" || /^\d*\.?\d{0,2}$/.test(valor)) {
                      setValorEspecifico(valor);
                    }
                  }}
                />
                <div className="text-xs text-gray-500">
                  💡 Todos los productos seleccionados tendrán este valor específico.
                  <br />
                  • Maderas: se actualizará precioPorPie
                  <br />
                  • Otros: se actualizará valorVenta
                </div>
              </div>
            )}

            {/* Resumen de la operación */}
            {(porcentajeSeleccionMultiple || valorEspecifico) && (
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="font-medium text-blue-800 mb-2">
                  Resumen de la operación:
                </div>
                <div className="text-sm text-blue-700">
                  <div>• Productos seleccionados: {productosSeleccionados.size}</div>
                  {modoActualizacion === "porcentaje" ? (
                    <div>• Aumento: {porcentajeSeleccionMultiple}%</div>
                  ) : (
                    <div>• Valor específico: ${valorEspecifico}</div>
                  )}
                  <div>• Maderas: {productos.filter(p => productosSeleccionados.has(p.id) && p.categoria === "Maderas").length} productos</div>
                  <div>• Otros: {productos.filter(p => productosSeleccionados.has(p.id) && p.categoria !== "Maderas").length} productos</div>
                </div>
              </div>
            )}

            {msg && (
              <div
                className={`p-3 rounded-lg text-sm ${
                  msg.startsWith("Error")
                    ? "bg-red-50 text-red-800 border border-red-200"
                    : "bg-green-50 text-green-800 border border-green-200"
                }`}
              >
                {msg}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalSeleccionMultiple(false)}>
              Cancelar
            </Button>
            <Button
              variant="default"
              onClick={handleActualizarSeleccionMultiple}
              disabled={saving || (modoActualizacion === "porcentaje" ? !porcentajeSeleccionMultiple : !valorEspecifico)}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Actualizando...
                </>
              ) : (
                `Aplicar ${modoActualizacion === "porcentaje" ? "Porcentaje" : "Valor Específico"}`
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {modalTipo === "individual" && (
        <Dialog open={modalOpen} onOpenChange={setModalOpen}>
          <DialogContent className="w-[95vw] max-w-[500px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Pencil className="w-5 h-5" />
                Editar Precios Individuales
              </DialogTitle>
            </DialogHeader>
            {editProd && (
              <div className="flex flex-col gap-4 py-2">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="font-bold text-lg mb-2">
                    {editProd.nombre}
                  </div>
                  <div className="text-sm text-gray-600">
                    Categoría: {editProd.categoria}
                    {editProd.tipoMadera && ` | Tipo: ${editProd.tipoMadera}`}
                    {editProd.proveedor &&
                      ` | Proveedor: ${editProd.proveedor}`}
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">
                      Costo
                    </label>
                    <Input
                      type="number"
                      min={0}
                      step={0.01}
                      placeholder="Ingrese el costo"
                      value={editForm.costo}
                      onChange={(e) => {
                        const valor = e.target.value;
                        // Solo permitir números, punto decimal y backspace
                        if (valor === "" || /^\d*\.?\d{0,2}$/.test(valor)) {
                          setEditForm((f) => ({ ...f, costo: valor }));
                        }
                      }}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">
                      Precio de Venta
                    </label>
                    <Input
                      type="number"
                      min={0}
                      step={0.01}
                      placeholder="Ingrese el precio de venta"
                      value={editForm.valorVenta}
                      onChange={(e) => {
                        const valor = e.target.value;
                        // Solo permitir números, punto decimal y backspace
                        if (valor === "" || /^\d*\.?\d{0,2}$/.test(valor)) {
                          setEditForm((f) => ({
                            ...f,
                            valorVenta: valor,
                          }));
                        }
                      }}
                    />
                  </div>
                </div>
                {msg && (
                  <div
                    className={`p-3 rounded-lg text-sm ${
                      msg.startsWith("Error")
                        ? "bg-red-50 text-red-800 border border-red-200"
                        : "bg-green-50 text-green-800 border border-green-200"
                    }`}
                  >
                    {msg}
                  </div>
                )}
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setModalOpen(false)}>
                Cancelar
              </Button>
              <Button
                variant="default"
                onClick={handleGuardarIndividual}
                disabled={saving}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  "Guardar Cambios"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {(modalTipo === "maderas" || modalTipo === "proveedor") && (
        <Dialog open={modalOpen} onOpenChange={setModalOpen}>
          <DialogContent className="w-[95vw] max-w-[500px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Actualización Global de Precios
              </DialogTitle>
            </DialogHeader>
            <div className="flex flex-col gap-4 py-2">
              <div className="bg-orange-50 p-4 rounded-lg">
                <div className="font-bold text-lg mb-2">
                  {modalTipo === "maderas"
                    ? "🌲 Actualización por Tipo de Madera"
                    : "📦 Actualización por Proveedor"}
                </div>
                <div className="text-sm text-gray-600">
                  {modalTipo === "maderas"
                    ? "Selecciona el tipo de madera y el porcentaje de aumento para actualizar todos los productos de ese tipo."
                    : "Selecciona el proveedor y el porcentaje de aumento para actualizar todos los productos de ese proveedor."}
                </div>
              </div>

              {modalTipo === "maderas" && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    Tipo de Madera
                  </label>
                  <select
                    value={tipoMaderaSeleccionado}
                    onChange={(e) => setTipoMaderaSeleccionado(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  >
                    <option value="">Seleccionar tipo de madera</option>
                    {tiposMadera.map((tipo) => (
                      <option key={tipo} value={tipo}>
                        🌲 {tipo}
                      </option>
                    ))}
                  </select>
                  {tipoMaderaSeleccionado && (
                    <div className="text-sm text-orange-600 bg-orange-50 p-2 rounded">
                      📊 Se actualizarán {productos.filter(p => p.categoria === "Maderas" && p.tipoMadera === tipoMaderaSeleccionado).length} productos de tipo "{tipoMaderaSeleccionado}"
                    </div>
                  )}
                </div>
              )}

              {modalTipo === "proveedor" && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    Proveedor
                  </label>
                  <select
                    value={proveedorSeleccionado}
                    onChange={(e) => setProveedorSeleccionado(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Seleccionar proveedor</option>
                    {proveedores.map((prov) => (
                      <option key={prov} value={prov}>
                        📦 {prov}
                      </option>
                    ))}
                  </select>
                  {proveedorSeleccionado && (
                    <div className="text-sm text-blue-600 bg-blue-50 p-2 rounded">
                      📊 Se actualizarán {productos.filter(p => p.proveedor === proveedorSeleccionado).length} productos del proveedor "{proveedorSeleccionado}"
                    </div>
                  )}
                </div>
              )}

              <Input
                type="number"
                min={-100}
                max={100}
                step={0.1}
                placeholder="Porcentaje de aumento (ej: 15 para 15%)"
                value={porcentajeAumento}
                onChange={(e) => {
                  const valor = e.target.value;
                  // Solo permitir números, punto decimal, signo negativo y backspace
                  if (valor === "" || /^-?\d*\.?\d{0,1}$/.test(valor)) {
                    setPorcentajeAumento(valor);
                  }
                }}
              />
              <div className="text-xs text-gray-500">
                💡 Para calcular el porcentaje correcto: 
                <br />
                • De 825 a 1000 = 21.21% (no 45.45%)
                <br />
                • Fórmula: ((valor objetivo - valor actual) / valor actual) × 100
              </div>

              {porcentajeAumento &&
                (tipoMaderaSeleccionado || proveedorSeleccionado) && (
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <div className="font-medium text-blue-800 mb-2">
                      Resumen de la operación:
                    </div>
                    <div className="text-sm text-blue-700">
                      <div>
                        • Tipo:{" "}
                        {modalTipo === "maderas"
                          ? tipoMaderaSeleccionado
                          : proveedorSeleccionado}
                      </div>
                      <div>• Aumento: {porcentajeAumento}%</div>
                      <div>
                        • Productos afectados:{" "}
                        {
                          productos.filter((p) =>
                            modalTipo === "maderas"
                              ? p.categoria === "Maderas" &&
                                p.tipoMadera === tipoMaderaSeleccionado
                              : p.proveedor === proveedorSeleccionado
                          ).length
                        }
                      </div>
                    </div>
                  </div>
                )}

              {msg && (
                <div
                  className={`p-3 rounded-lg text-sm ${
                    msg.startsWith("Error")
                      ? "bg-red-50 text-red-800 border border-red-200"
                      : "bg-green-50 text-green-800 border border-green-200"
                  }`}
                >
                  {msg}
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setModalOpen(false)}>
                Cancelar
              </Button>
              <Button
                variant="default"
                onClick={handleGuardarGlobal}
                disabled={
                  saving ||
                  !porcentajeAumento ||
                  (!tipoMaderaSeleccionado && !proveedorSeleccionado)
                }
                className="bg-orange-600 hover:bg-orange-700"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Actualizando...
                  </>
                ) : (
                  "Aplicar Actualización Global"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default PreciosPage;
