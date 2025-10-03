"use client";
import React, { useEffect, useState, useMemo, useCallback } from "react";
import { computeLineBase, computeLineSubtotal, computeTotals } from "@/lib/pricing";
import { useParams, useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import {
  doc,
  getDoc,
  collection,
  getDocs,
  updateDoc,
  increment,
  serverTimestamp,
  addDoc,
} from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Printer, Download, Trash2 } from "lucide-react";
import { SelectorProductosPresupuesto } from "../page";
import FormularioVentaPresupuesto from "../page";
import { useAuth } from "@/provider/auth.provider";

// Agregar función utilitaria para fechas
function formatFechaLocal(dateString) {
  if (!dateString) return "-";
  if (dateString.includes("T")) {
    const dateObj = new Date(dateString);
    return dateObj.toLocaleDateString("es-AR");
  }
  const [year, month, day] = dateString.split("-");
  if (!year || !month || !day) return dateString;
  const dateObj = new Date(Number(year), Number(month) - 1, Number(day));
  return dateObj.toLocaleDateString("es-AR");
}

function calcularPrecioCorteMadera({
  alto,
  ancho,
  largo,
  precioPorPie,
  factor = 0.2734,
}) {
  if (
    [alto, ancho, largo, precioPorPie].some(
      (v) => typeof v !== "number" || v <= 0
    )
  ) {
    return 0;
  }
  const precio = factor * alto * ancho * largo * precioPorPie;
  // Redondear a centenas (múltiplos de 100)
  return Math.round(precio / 100) * 100;
}

// Función para calcular precio de machimbre (precio por pie × alto × largo × cantidad)
function calcularPrecioMachimbre({
  alto,
  largo,
  cantidad,
  precioPorPie,
}) {
  if (
    [alto, largo, cantidad, precioPorPie].some(
      (v) => typeof v !== "number" || v <= 0
    )
  ) {
    return 0;
  }
  // Nueva fórmula: (alto × largo) × precioPorPie × cantidad
  const metrosCuadrados = alto * largo;
  const precio = metrosCuadrados * precioPorPie * cantidad;
  // Redondear a centenas (múltiplos de 100)
  return Math.round(precio / 100) * 100;
}

const VentaDetalle = () => {
  const params = useParams();
  const router = useRouter();
  const { id, lang } = params;
  const { user } = useAuth();
  const [venta, setVenta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editando, setEditando] = useState(false);
  const [ventaEdit, setVentaEdit] = useState(null);
  const [clientes, setClientes] = useState([]);
  const [productos, setProductos] = useState([]);
  const [loadingPrecios, setLoadingPrecios] = useState(false);
  const [errorForm, setErrorForm] = useState("");

  // Hook para pagosSimples si no hay array pagos
  const [pagosSimples, setPagosSimples] = useState([]);

  // 1. Agregar estado para loader y mensaje de éxito
  const [registrandoPago, setRegistrandoPago] = useState(false);
  const [pagoExitoso, setPagoExitoso] = useState(false);

  // Estados para borrado de pagos
  const [borrandoPago, setBorrandoPago] = useState(false);
  const [pagoABorrar, setPagoABorrar] = useState(null);
  const [mostrarConfirmacionBorrado, setMostrarConfirmacionBorrado] = useState(false);

  // Estados para filtros de productos
  const [categoriaId, setCategoriaId] = useState("");
  const [busquedaProducto, setBusquedaProducto] = useState("");
  const [filtroTipoMadera, setFiltroTipoMadera] = useState("");
  const [filtroSubCategoria, setFiltroSubCategoria] = useState("");

  // Estados para catálogo (idénticos a ventas/page.jsx)
  const [productosState, setProductosState] = useState([]);
  const [productosPorCategoria, setProductosPorCategoria] = useState({});
  const [categoriasState, setCategoriasState] = useState([]);

  // Sin búsqueda remota: todo se filtra en memoria (idéntico)
  const [paginaActual, setPaginaActual] = useState(1);
  const [productosPorPagina] = useState(12);
  const [busquedaDebounced, setBusquedaDebounced] = useState("");
  useEffect(() => {
    const id = setTimeout(() => setBusquedaDebounced(busquedaProducto), 100);
    return () => clearTimeout(id);
  }, [busquedaProducto]);
  const busquedaDefer = React.useDeferredValue(busquedaDebounced);
  const [isPending, startTransition] = React.useTransition();

  // Derivar categorías y agrupación desde los productos cargados (igual intención que ventas/page.jsx)
  useEffect(() => {
    if (!Array.isArray(productos) || productos.length === 0) {
      setProductosState([]);
      setProductosPorCategoria({});
      setCategoriasState([]);
      return;
    }
    setProductosState(productos);
    const agrupados = {};
    productos.forEach((p) => {
      (agrupados[p.categoria] = agrupados[p.categoria] || []).push(p);
    });
    setProductosPorCategoria(agrupados);
    setCategoriasState(Object.keys(agrupados));
  }, [productos]);

  useEffect(() => {
    const fetchVenta = async () => {
      try {
        console.log("=== DEBUG VENTA ===");
        console.log("Params completos:", params);
        console.log("ID extraído:", id);
        console.log("Lang extraído:", lang);
        console.log("URL actual:", window.location.href);

        if (!id) {
          console.error("No se encontró ID en los parámetros");
          setError("No se proporcionó ID de venta");
          setLoading(false);
          return;
        }

        const docRef = doc(db, "ventas", id);
        console.log("Referencia del documento:", docRef);

        const docSnap = await getDoc(docRef);
        console.log("Documento existe:", docSnap.exists());
        console.log("Datos del documento:", docSnap.data());

        if (docSnap.exists()) {
          const ventaData = { id: docSnap.id, ...docSnap.data() };
          console.log("Venta cargada exitosamente:", ventaData);
          setVenta(ventaData);
        } else {
          console.error("Venta no encontrada en Firebase");
          setError("La venta no existe en la base de datos");
        }
      } catch (error) {
        console.error("Error al cargar venta:", error);
        setError(`Error al cargar la venta: ${error.message}`);
      } finally {
        setLoading(false);
      }
    };

    fetchVenta();
  }, [id, lang, params]);

  // Cargar clientes y productos para selects y edición
  useEffect(() => {
    const fetchClientesYProductos = async () => {
      const snapClientes = await getDocs(collection(db, "clientes"));
      setClientes(
        snapClientes.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
      );
      const snapProductos = await getDocs(collection(db, "productos"));
      const productosData = snapProductos.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      console.log("=== DEBUG CARGA PRODUCTOS ===");
      console.log("Productos cargados:", productosData);
      console.log("Cantidad de productos:", productosData.length);
      setProductos(productosData);
    };
    fetchClientesYProductos();
  }, []);
  // Al activar edición, clonar venta
  useEffect(() => {
    if (editando && venta) {
      console.log("=== DEBUG Clonando venta para edición ===");
      console.log("venta original:", venta);
      console.log("venta.clienteId:", venta.clienteId);
      console.log("venta.cliente:", venta.cliente);

      const ventaClonada = JSON.parse(JSON.stringify(venta));

      // Asegurar que TODA la información del cliente se preserve
      if (venta.clienteId) {
        ventaClonada.clienteId = venta.clienteId;
      }
      if (venta.cliente) {
        ventaClonada.cliente = venta.cliente;
      }

      // Inicializar campos de pago para el formulario
      ventaClonada.nuevoPagoMonto = "";
      ventaClonada.nuevoPagoMetodo = "";

      // Verificar que los datos se copiaron correctamente
      console.log("venta clonada:", ventaClonada);
      console.log("ventaClonada.clienteId:", ventaClonada.clienteId);
      console.log("ventaClonada.cliente:", ventaClonada.cliente);
      console.log("ventaClonada.nuevoPagoMonto:", ventaClonada.nuevoPagoMonto);
      console.log("ventaClonada.nuevoPagoMetodo:", ventaClonada.nuevoPagoMetodo);

      setVentaEdit(ventaClonada);
    }
  }, [editando, venta]);
  // Al activar edición, inicializar pagosSimples si no hay array pagos
  useEffect(() => {
    if (editando && venta && !Array.isArray(venta.pagos)) {
      setPagosSimples(
        [
          venta.montoAbonado > 0
            ? {
                fecha: venta.fecha || new Date().toISOString().split("T")[0],
                monto: Number(venta.montoAbonado),
                metodo: venta.formaPago || "-",
                usuario: "-",
              }
            : null,
        ].filter(Boolean)
      );
    }
  }, [editando, venta]);
  // Función para actualizar precios
  const handleActualizarPrecios = async () => {
    setLoadingPrecios(true);
    try {
      // Obtener productos actualizados desde Firebase
      const productosSnap = await getDocs(collection(db, "productos"));
      const productosActualizados = productosSnap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      // Actualizar precios de productos en ventaEdit
      const productosConPreciosActualizados = (ventaEdit.productos || []).map(
        (productoVenta) => {
          const productoActualizado = productosActualizados.find(
            (p) => p.id === productoVenta.id
          );
          if (productoActualizado) {
            let nuevoPrecio = 0;
            if (productoActualizado.categoria === "Maderas") {
              // Calcular precio para maderas
              const alto = Number(productoActualizado.alto) || 0;
              const ancho = Number(productoActualizado.ancho) || 0;
              const largo = Number(productoActualizado.largo) || 0;
              const precioPorPie =
                Number(productoActualizado.precioPorPie) || 0;

              if (alto > 0 && ancho > 0 && largo > 0 && precioPorPie > 0) {
                nuevoPrecio = 0.2734 * alto * ancho * largo * precioPorPie;
                nuevoPrecio = Math.round(nuevoPrecio * 100) / 100;
              }
            } else if (productoActualizado.categoria === "Ferretería") {
              nuevoPrecio = productoActualizado.valorVenta || 0;
            } else {
              nuevoPrecio =
                productoActualizado.precioUnidad ||
                productoActualizado.precioUnidadVenta ||
                productoActualizado.precioUnidadHerraje ||
                productoActualizado.precioUnidadQuimico ||
                productoActualizado.precioUnidadHerramienta ||
                0;
            }

            return {
              ...productoVenta,
              precio: nuevoPrecio,
            };
          }
          return productoVenta;
        }
      );

      setVentaEdit((prev) => ({
        ...prev,
        productos: productosConPreciosActualizados,
      }));

      setProductos(productosActualizados);
    } catch (error) {
      console.error("Error al actualizar precios:", error);
    } finally {
      setLoadingPrecios(false);
    }
  };

  // Función para recalcular precios de productos de madera cuando cambia el checkbox de cepillado
  const recalcularPreciosMadera = (productoId, aplicarCepillado) => {
    setVentaEdit((prev) => ({
      ...prev,
      productos: (prev.productos || []).map((p) => {
        if (p.id === productoId && p.categoria === "Maderas") {
          let precioBase;

          if (p.unidad === "M2") {
            // Para machimbres/deck: usar la fórmula específica
            precioBase = calcularPrecioMachimbre({
              alto: p.alto,
              largo: p.largo,
              cantidad: p.cantidad || 1,
              precioPorPie: p.precioPorPie,
            });
          } else {
            // Para otras maderas: usar la fórmula estándar
            precioBase = 0.2734 * p.alto * p.ancho * p.largo * p.precioPorPie;
          }

          // Aplicar cepillado si está habilitado
          const precioFinal = aplicarCepillado
            ? precioBase * 1.066
            : precioBase;

          // Redondear a centenas (múltiplos de 100)
          const precioRedondeado = Math.round(precioFinal / 100) * 100;

          return {
            ...p,
            precio: precioRedondeado,
            cepilladoAplicado: aplicarCepillado,
          };
        }
        return p;
      }),
    }));
  };

  // Función para recalcular precio cuando se cambia el precio por pie
  const handlePrecioPorPieChange = (id, nuevoPrecioPorPie) => {
    setVentaEdit((prev) => ({
      ...prev,
      productos: (prev.productos || []).map((p) => {
        if (p.id === id && p.categoria === "Maderas") {
          let precioBase;

          if (p.unidad === "M2") {
            // Para machimbres/deck: usar la fórmula específica
            precioBase = calcularPrecioMachimbre({
              alto: p.alto,
              largo: p.largo,
              cantidad: p.cantidad || 1,
              precioPorPie: Number(nuevoPrecioPorPie),
            });
          } else {
            // Para otras maderas: usar la fórmula estándar
            precioBase = 0.2734 * p.alto * p.ancho * p.largo * Number(nuevoPrecioPorPie);
          }

          // Aplicar cepillado si está habilitado para este producto específico
          const precioFinal = p.cepilladoAplicado
            ? precioBase * 1.066
            : precioBase;

          // Redondear a centenas (múltiplos de 100)
          const precioRedondeado = Math.round(precioFinal / 100) * 100;

          return {
            ...p,
            precioPorPie: Number(nuevoPrecioPorPie),
            precio: precioRedondeado,
          };
        }
        return p;
      }),
    }));
  };

  // Función para formatear números en formato argentino
  const formatearNumeroArgentino = (numero) => {
    if (numero === null || numero === undefined || isNaN(numero)) return "0";
    return Number(numero).toLocaleString("es-AR");
  };

  // Función para obtener información completa del producto desde la base de datos
  const getProductoCompleto = (productoId) => {
    return productos.find((p) => p.id === productoId);
  };

  // Obtener tipos de madera únicos
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

  // Función para normalizar texto (optimizada)
  const normalizarTexto = useCallback((texto) => {
    if (!texto) return "";
    return texto.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "");
  }, []);

  

  // Filtrado idéntico a ventas/page.jsx
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
      // derivar agrupación local
      const agrupados = productos.reduce((acc, p) => {
        (acc[p.categoria] = acc[p.categoria] || []).push(p);
        return acc;
      }, {});
      fuente = agrupados[categoriaId];
    }
    if (!fuente) return [];

    const busquedaNormalizada = normalizarTexto(busquedaDefer);
    return fuente
      .filter((prod) => {
        const nombreNormalizado = normalizarTexto(prod.nombre);
        const unidadNormalizada = normalizarTexto(prod.unidadMedida || "");
        let cumpleBusqueda = busquedaNormalizada === "";
        if (busquedaNormalizada !== "") {
          if (busquedaNormalizada.endsWith(".")) {
            const busquedaSinPunto = busquedaNormalizada.slice(0, -1);
          cumpleBusqueda = 
              nombreNormalizado.startsWith(busquedaSinPunto) ||
              unidadNormalizada.startsWith(busquedaSinPunto);
        } else {
          cumpleBusqueda = 
              nombreNormalizado.includes(busquedaNormalizada) ||
              unidadNormalizada.includes(busquedaNormalizada);
        }
      }
        const cumpleCategoria = !categoriaId || prod.categoria === categoriaId;
      const cumpleTipoMadera =
        categoriaId !== "Maderas" ||
        filtroTipoMadera === "" ||
        prod.tipoMadera === filtroTipoMadera;
      const cumpleSubCategoria =
        categoriaId !== "Ferretería" ||
        filtroSubCategoria === "" ||
        prod.subCategoria === filtroSubCategoria;
        return (
          cumpleCategoria && cumpleBusqueda && cumpleTipoMadera && cumpleSubCategoria
        );
      })
      .sort((a, b) => {
      const stockA = Number(a.stock) || 0;
      const stockB = Number(b.stock) || 0;
        if (stockA > 0 && stockB === 0) return -1;
        if (stockA === 0 && stockB > 0) return 1;
      return 0;
    });
  }, [productos, productosPorCategoria, categoriaId, busquedaDefer, filtroTipoMadera, filtroSubCategoria, normalizarTexto]);

  const totalProductos = productosFiltrados.length;
  const totalPaginas = Math.ceil(totalProductos / productosPorPagina);
  const productosPaginados = useMemo(() => {
    const inicio = (paginaActual - 1) * productosPorPagina;
    const fin = inicio + productosPorPagina;
    return productosFiltrados.slice(inicio, fin);
  }, [productosFiltrados, paginaActual, productosPorPagina]);

  const cambiarPagina = useCallback((nuevaPagina) => {
    startTransition(() => {
      setPaginaActual(Math.max(1, Math.min(nuevaPagina, totalPaginas)));
    });
  }, [totalPaginas, startTransition]);

  useEffect(() => {
    setPaginaActual(1);
  }, [categoriaId, busquedaDefer, filtroTipoMadera, filtroSubCategoria]);

  // Funciones para manejar cambios en productos
  const handleDecrementarCantidad = (id) => {
    setVentaEdit((prev) => ({
      ...prev,
      productos: prev.productos.map((p) => {
        if (p.id === id) {
          const nuevaCantidad = Math.max(1, p.cantidad - 1);
          
          // Si es M2, recalcular precio por m²
          if (p.categoria === "Maderas" && p.unidad === "M2") {
            const precioBase = calcularPrecioMachimbre({
              alto: p.alto,
              largo: p.largo,
              cantidad: nuevaCantidad,
              precioPorPie: p.precioPorPie,
            });

            const precioFinal = p.cepilladoAplicado
              ? precioBase * 1.066
              : precioBase;

            const precioRedondeado = Math.round(precioFinal / 100) * 100;

            return {
              ...p,
              cantidad: nuevaCantidad,
              precio: precioRedondeado,
            };
          }
          // Para otros productos, solo cambiar cantidad
          return { ...p, cantidad: nuevaCantidad };
        }
        return p;
      }),
    }));
  };

  const handleIncrementarCantidad = (id) => {
    setVentaEdit((prev) => ({
      ...prev,
      productos: prev.productos.map((p) => {
        if (p.id === id) {
          const nuevaCantidad = p.cantidad + 1;
          
          // Si es M2, recalcular precio por m²
          if (p.categoria === "Maderas" && p.unidad === "M2") {
            const precioBase = calcularPrecioMachimbre({
              alto: p.alto,
              largo: p.largo,
              cantidad: nuevaCantidad,
              precioPorPie: p.precioPorPie,
            });

            const precioFinal = p.cepilladoAplicado
              ? precioBase * 1.066
              : precioBase;

            const precioRedondeado = Math.round(precioFinal / 100) * 100;

            return {
              ...p,
              cantidad: nuevaCantidad,
              precio: precioRedondeado,
            };
          }
          // Para otros productos, solo cambiar cantidad
          return { ...p, cantidad: nuevaCantidad };
        }
        return p;
      }),
    }));
  };

  const handleCantidadChange = (id, cantidad) => {
    setVentaEdit((prev) => ({
      ...prev,
      productos: prev.productos.map((p) => {
        if (p.id === id) {
          // Si es M2, recalcular precio por m²
          if (p.categoria === "Maderas" && p.unidad === "M2") {
            const precioBase = calcularPrecioMachimbre({
              alto: p.alto,
              largo: p.largo,
              cantidad: Number(cantidad),
              precioPorPie: p.precioPorPie,
            });

            const precioFinal = p.cepilladoAplicado
              ? precioBase * 1.066
              : precioBase;

            const precioRedondeado = Math.round(precioFinal / 100) * 100;

            return {
              ...p,
              cantidad: Number(cantidad),
              precio: precioRedondeado,
            };
          }
          // Para otros productos, solo cambiar cantidad
          return { ...p, cantidad: Number(cantidad) };
        }
        return p;
      }),
    }));
  };

  const handleDescuentoChange = (id, descuento) => {
    setVentaEdit((prev) => ({
      ...prev,
      productos: prev.productos.map((p) =>
        p.id === id ? { ...p, descuento: Number(descuento) } : p
      ),
    }));
  };

  // Permitir editar el nombre del producto cuando sea un producto manual/especial
  const handleNombreChange = (id, nombre) => {
    setVentaEdit((prev) => ({
      ...prev,
      productos: prev.productos.map((p) =>
        p.id === id ? { ...p, nombre } : p
      ),
    }));
  };

  // Permitir editar el precio unitario cuando el producto lo admita (p.esEditable)
  const handlePrecioChange = (id, precio) => {
    const parsed = precio === "" ? "" : Number(precio);
    setVentaEdit((prev) => ({
      ...prev,
      productos: prev.productos.map((p) =>
        p.id === id ? { ...p, precio: parsed === "" ? 0 : parsed } : p
      ),
    }));
  };

  const handleQuitarProducto = (id) => {
    setVentaEdit((prev) => ({
      ...prev,
      productos: prev.productos.filter((p) => p.id !== id),
    }));
  };

  // Función para manejar cambios en alto para machimbre/deck
  const handleAltoChange = (id, nuevoAlto) => {
    setVentaEdit((prev) => ({
      ...prev,
      productos: (prev.productos || []).map((p) => {
        if (
          p.id === id &&
          p.categoria === "Maderas" && p.unidad !== "M2"
        ) {
          const precioBase = calcularPrecioMachimbre({
            alto: Number(nuevoAlto),
            largo: p.largo,
            cantidad: p.cantidad || 1,
            precioPorPie: p.precioPorPie,
          });

          const precioFinal = p.cepilladoAplicado
            ? precioBase * 1.066
            : precioBase;

          const precioRedondeado = Math.round(precioFinal / 100) * 100;

          return {
            ...p,
            alto: Number(nuevoAlto),
            precio: precioRedondeado,
          };
        }
        return p;
      }),
    }));
  };

  // Función para manejar cambios en ancho para machimbre/deck
  const handleAnchoChange = (id, nuevoAncho) => {
    setVentaEdit((prev) => ({
      ...prev,
      productos: (prev.productos || []).map((p) => {
        if (
          p.id === id &&
          p.categoria === "Maderas" && p.unidad !== "M2"
        ) {
          const precioBase = calcularPrecioMachimbre({
            alto: Number(nuevoAncho),
            largo: p.largo,
            cantidad: p.cantidad || 1,
            precioPorPie: p.precioPorPie,
          });

          const precioFinal = p.cepilladoAplicado
            ? precioBase * 1.066
            : precioBase;

          const precioRedondeado = Math.round(precioFinal / 100) * 100;

          return {
            ...p,
            ancho: Number(nuevoAncho),
            precio: precioRedondeado,
          };
        }
        return p;
      }),
    }));
  };

  // Función para manejar cambios en largo para machimbre/deck
  const handleLargoChange = (id, nuevoLargo) => {
    setVentaEdit((prev) => ({
      ...prev,
      productos: (prev.productos || []).map((p) => {
        if (
          p.id === id &&
          p.categoria === "Maderas" && p.unidad !== "M2"
        ) {
          const precioBase = calcularPrecioMachimbre({
            alto: p.alto,
            largo: Number(nuevoLargo),
            cantidad: p.cantidad || 1,
            precioPorPie: p.precioPorPie,
          });

          const precioFinal = p.cepilladoAplicado
            ? precioBase * 1.066
            : precioBase;

          const precioRedondeado = Math.round(precioFinal / 100) * 100;

          return {
            ...p,
            largo: Number(nuevoLargo),
            precio: precioRedondeado,
          };
        }
        return p;
      }),
    }));
  };


  // Funciones para manejar cambios en dimensiones para maderas normales (no machimbre/deck)
  const handleAltoChangeMadera = (id, nuevoAlto) => {
    setVentaEdit((prev) => ({
      ...prev,
      productos: (prev.productos || []).map((p) => {
        if (p.id === id && p.categoria === "Maderas" && p.unidad !== "M2") {
          const alto = Number(nuevoAlto);
          const ancho = Number(p.ancho);
          const largo = Number(p.largo);
          const precioPorPie = Number(p.precioPorPie);
          let precioBase = 0;
          if (alto > 0 && ancho > 0 && largo > 0 && precioPorPie > 0) {
            precioBase = 0.2734 * alto * ancho * largo * precioPorPie;
          }
          const precioFinal = p.cepilladoAplicado ? precioBase * 1.066 : precioBase;
          const precioRedondeado = Math.round(precioFinal / 100) * 100;
          return { ...p, alto, precio: precioRedondeado };
        }
        return p;
      }),
    }));
  };

  const handleAnchoChangeMadera = (id, nuevoAncho) => {
    setVentaEdit((prev) => ({
      ...prev,
      productos: (prev.productos || []).map((p) => {
        if (p.id === id && p.categoria === "Maderas" && p.unidad !== "M2") {
          const alto = Number(p.alto);
          const ancho = Number(nuevoAncho);
          const largo = Number(p.largo);
          const precioPorPie = Number(p.precioPorPie);
          let precioBase = 0;
          if (alto > 0 && ancho > 0 && largo > 0 && precioPorPie > 0) {
            precioBase = 0.2734 * alto * ancho * largo * precioPorPie;
          }
          const precioFinal = p.cepilladoAplicado ? precioBase * 1.066 : precioBase;
          const precioRedondeado = Math.round(precioFinal / 100) * 100;
          return { ...p, ancho, precio: precioRedondeado };
        }
        return p;
      }),
    }));
  };

  const handleLargoChangeMadera = (id, nuevoLargo) => {
    setVentaEdit((prev) => ({
      ...prev,
      productos: (prev.productos || []).map((p) => {
        if (p.id === id && p.categoria === "Maderas" && p.unidad !== "M2") {
          const alto = Number(p.alto);
          const ancho = Number(p.ancho);
          const largo = Number(nuevoLargo);
          const precioPorPie = Number(p.precioPorPie);
          let precioBase = 0;
          if (alto > 0 && ancho > 0 && largo > 0 && precioPorPie > 0) {
            precioBase = 0.2734 * alto * ancho * largo * precioPorPie;
          }
          const precioFinal = p.cepilladoAplicado ? precioBase * 1.066 : precioBase;
          const precioRedondeado = Math.round(precioFinal / 100) * 100;
          return { ...p, largo, precio: precioRedondeado };
        }
        return p;
      }),
    }));
  };

  // Wrapper para precio por pie en maderas normales para mantener la API de la nueva tabla
  const handlePrecioPorPieChangeMadera = (id, nuevoPrecioPorPie) => {
    // Reutiliza la lógica existente que ya diferencia por subcategoría
    handlePrecioPorPieChange(id, nuevoPrecioPorPie);
  };



  // Guardar cambios en Firestore
  const handleGuardarCambios = async () => {
    setErrorForm("");

    // Debug logs para entender qué está pasando
    console.log("=== DEBUG handleGuardarCambios ===");
    console.log("ventaEdit:", ventaEdit);
    console.log("ventaEdit.clienteId:", ventaEdit.clienteId);
    console.log("ventaEdit.cliente:", ventaEdit.cliente);
    console.log("ventaEdit.cliente?.nombre:", ventaEdit.cliente?.nombre);
    console.log("venta original:", venta);
    console.log("venta.clienteId:", venta.clienteId);
    console.log("venta.cliente:", venta.cliente);

    // Validación robusta del cliente (sin bloquear por falta de clienteId)
    if (!ventaEdit.clienteId) {
      console.log("Advertencia: No hay clienteId en ventaEdit, generando fallback...");
      // Priorizar: id → CUIT → teléfono → email → id de venta → 'sin-id'
      const telefonoLimpio = (
        (ventaEdit.cliente?.telefono || venta.cliente?.telefono || "") + ""
      )
        .replace(/\D/g, "")
        .trim();
      const fallbackId =
        venta.clienteId ||
        ventaEdit.cliente?.cuit ||
        venta.cliente?.cuit ||
        (telefonoLimpio || undefined) ||
        ventaEdit.cliente?.email ||
        ventaEdit.id ||
        "sin-id";
      ventaEdit.clienteId = fallbackId;
      console.log("clienteId asignado (fallback):", ventaEdit.clienteId);
    }

    if (!ventaEdit.cliente) {
      console.log("Advertencia: No hay objeto cliente en ventaEdit, armando objeto mínimo...");
      ventaEdit.cliente =
        venta.cliente || {
          nombre: ventaEdit.clienteId || "Cliente",
          cuit: ventaEdit.clienteId || "",
          direccion: "",
          telefono: "",
          email: "",
        };
      console.log("cliente asignado:", ventaEdit.cliente);
    }

    if (!ventaEdit.cliente?.nombre) {
      // Evitar confusión por nombres repetidos: priorizar teléfono o CUIT si existen
      const telefonoLimpio = (
        (ventaEdit.cliente?.telefono || venta.cliente?.telefono || "") + ""
      )
        .replace(/\D/g, "")
        .trim();
      ventaEdit.cliente.nombre =
        (telefonoLimpio ? `Cliente ${telefonoLimpio}` : undefined) ||
        ventaEdit.cliente?.cuit ||
        venta.cliente?.nombre ||
        ventaEdit.clienteId ||
        "Cliente sin nombre";
      console.log("Nombre de cliente asignado:", ventaEdit.cliente.nombre);
    }

    console.log("✅ Validación del cliente exitosa");
    console.log("clienteId final:", ventaEdit.clienteId);
    console.log("cliente final:", ventaEdit.cliente);

    if (!ventaEdit.productos?.length && !ventaEdit.items?.length) {
      setErrorForm("Agrega al menos un producto.");
      return;
    }
    for (const p of ventaEdit.productos || ventaEdit.items) {
      if (!p.cantidad || p.cantidad <= 0) {
        setErrorForm("Todas las cantidades deben ser mayores a 0.");
        return;
      }
      if (p.descuento < 0 || p.descuento > 100) {
        setErrorForm("El descuento debe ser entre 0 y 100%.");
        return;
      }
    }

    const productosArr = ventaEdit.productos || ventaEdit.items;
    const { subtotal, descuentoTotal, total: totalSinEnvio } = computeTotals(productosArr);

    // Calcular costo de envío solo si no es retiro local
    const costoEnvioCalculado =
      ventaEdit.tipoEnvio &&
      ventaEdit.tipoEnvio !== "retiro_local" &&
      ventaEdit.costoEnvio !== undefined &&
      ventaEdit.costoEnvio !== "" &&
      !isNaN(Number(ventaEdit.costoEnvio))
        ? Number(ventaEdit.costoEnvio)
        : 0;

    const total = totalSinEnvio + costoEnvioCalculado;
    const totalAbonado = (ventaEdit.pagos || []).reduce(
      (acc, p) => acc + Number(p.monto),
      0
    );

    if (totalAbonado >= total) {
      ventaEdit.estadoPago = "pagado";
    } else if (totalAbonado > 0) {
      ventaEdit.estadoPago = "parcial";
    } else {
      ventaEdit.estadoPago = "pendiente";
    }

    // Guardar correctamente los pagos del saldo pendiente
    console.log("=== DEBUG MANEJO DE PAGOS ===");
    console.log("ventaEdit.pagos:", ventaEdit.pagos);
    console.log("Array.isArray(ventaEdit.pagos):", Array.isArray(ventaEdit.pagos));
    console.log("pagosSimples:", pagosSimples);
    console.log("ventaEdit.montoAbonado:", ventaEdit.montoAbonado);
    
    if (Array.isArray(ventaEdit.pagos) && ventaEdit.pagos.length > 0) {
      console.log("✅ Usando array de pagos existente");
      delete ventaEdit.montoAbonado;
    } else if (!Array.isArray(ventaEdit.pagos) && pagosSimples.length > 0) {
      console.log("✅ Convirtiendo pagosSimples a array de pagos");
      ventaEdit.pagos = pagosSimples;
      delete ventaEdit.montoAbonado;
    } else if (!Array.isArray(ventaEdit.pagos) && ventaEdit.montoAbonado > 0) {
      console.log("✅ Creando array de pagos desde montoAbonado");
      ventaEdit.pagos = [
        {
          fecha: new Date().toISOString().split("T")[0],
          monto: Number(ventaEdit.montoAbonado),
          metodo: ventaEdit.formaPago || "-",
          usuario: "-",
        },
      ];
      delete ventaEdit.montoAbonado;
    } else {
      console.log("⚠️ No se encontraron pagos para procesar");
    }
    
    console.log("Pagos finales:", ventaEdit.pagos);

    // Asegurar que la información del cliente se preserve
    if (!ventaEdit.cliente && venta.cliente) {
      ventaEdit.cliente = venta.cliente;
    }
    if (!ventaEdit.clienteId && venta.clienteId) {
      ventaEdit.clienteId = venta.clienteId;
    }

    // ===== LÓGICA PROFESIONAL PARA MANEJAR CAMBIOS =====

    // 1. Detectar cambios en productos y cantidades
    const productosOriginales = venta.productos || venta.items || [];
    const productosNuevos = productosArr;

    console.log("=== ANÁLISIS DE CAMBIOS ===");
    console.log("Productos originales:", productosOriginales);
    console.log("Productos nuevos:", productosNuevos);

    // Crear mapas para comparación eficiente
    const productosOriginalesMap = new Map();
    productosOriginales.forEach((p) => productosOriginalesMap.set(p.id, p));

    const productosNuevosMap = new Map();
    productosNuevos.forEach((p) => productosNuevosMap.set(p.id, p));

    // 2. Manejar cambios de stock y movimientos
    const cambiosStock = [];

    // Productos que se agregaron o aumentaron cantidad
    for (const [productoId, productoNuevo] of productosNuevosMap) {
      const productoOriginal = productosOriginalesMap.get(productoId);

      if (!productoOriginal) {
        // Producto nuevo agregado
        cambiosStock.push({
          productoId,
          tipo: "nuevo",
          cantidadOriginal: 0,
          cantidadNueva: productoNuevo.cantidad,
          diferencia: productoNuevo.cantidad,
        });
      } else {
        // Producto existente con posible cambio de cantidad
        const diferencia = productoNuevo.cantidad - productoOriginal.cantidad;
        if (diferencia !== 0) {
          cambiosStock.push({
            productoId,
            tipo: "modificado",
            cantidadOriginal: productoOriginal.cantidad,
            cantidadNueva: productoNuevo.cantidad,
            diferencia,
          });
        }
      }
    }

    // Productos que se eliminaron o redujeron cantidad
    for (const [productoId, productoOriginal] of productosOriginalesMap) {
      if (!productosNuevosMap.has(productoId)) {
        // Producto eliminado
        cambiosStock.push({
          productoId,
          tipo: "eliminado",
          cantidadOriginal: productoOriginal.cantidad,
          cantidadNueva: 0,
          diferencia: -productoOriginal.cantidad,
        });
      }
    }

    console.log("Cambios de stock detectados:", cambiosStock);

    // 3. Aplicar cambios de stock y registrar movimientos
    for (const cambio of cambiosStock) {
      try {
        const productoRef = doc(db, "productos", cambio.productoId);

        // Verificar que el producto existe
        const productoSnap = await getDocs(collection(db, "productos"));
        const existe = productoSnap.docs.find(
          (d) => d.id === cambio.productoId
        );

        if (!existe) {
          console.warn(
            `Producto ${cambio.productoId} no existe en el catálogo`
          );
          continue;
        }

        // Actualizar stock
        await updateDoc(productoRef, {
          stock: increment(-cambio.diferencia),
        });

        // Registrar movimiento
        const tipoMovimiento = cambio.diferencia > 0 ? "salida" : "entrada";
        const cantidadMovimiento = Math.abs(cambio.diferencia);

        await addDoc(collection(db, "movimientos"), {
          productoId: cambio.productoId,
          tipo: tipoMovimiento,
          cantidad: cantidadMovimiento,
          usuario: "Sistema",
          fecha: serverTimestamp(),
          referencia: "edicion_venta",
          referenciaId: ventaEdit.id,
          observaciones: `Ajuste por edición de venta - ${cambio.tipo}: ${cambio.cantidadOriginal} → ${cambio.cantidadNueva}`,
          productoNombre: existe.data().nombre || "Producto desconocido",
        });

        console.log(
          `✅ Stock actualizado para producto ${cambio.productoId}: ${cambio.diferencia}`
        );
      } catch (error) {
        console.error(
          `Error actualizando stock para producto ${cambio.productoId}:`,
          error
        );
      }
    }

    // 4. Manejar cambios de envío de manera más robusta
    const tipoEnvioOriginal = venta.tipoEnvio || "retiro_local";
    const tipoEnvioNuevo = ventaEdit.tipoEnvio || "retiro_local";
    const costoEnvioOriginal = Number(venta.costoEnvio) || 0;
    const costoEnvioNuevo = costoEnvioCalculado;

    console.log("=== ANÁLISIS DE ENVÍO ===");
    console.log("Tipo envío original:", tipoEnvioOriginal);
    console.log("Tipo envío nuevo:", tipoEnvioNuevo);
    console.log("Costo envío original:", costoEnvioOriginal);
    console.log("Costo envío nuevo:", costoEnvioNuevo);

    // Buscar envío existente
    const enviosSnap = await getDocs(collection(db, "envios"));
    const envioExistente = enviosSnap.docs.find(
      (e) => e.data().ventaId === ventaEdit.id
    );

    // Lógica mejorada para manejar cambios de envío
    if (tipoEnvioNuevo !== "retiro_local") {
      // Crear nuevo envío o actualizar existente
      const envioData = {
        ventaId: ventaEdit.id,
        clienteId: ventaEdit.clienteId,
        cliente: ventaEdit.cliente,
        fechaCreacion: envioExistente
          ? envioExistente.data().fechaCreacion
          : new Date().toISOString(),
        fechaEntrega: ventaEdit.fechaEntrega,
        estado: envioExistente ? envioExistente.data().estado : "pendiente",
        prioridad: ventaEdit.prioridad || "media",
        vendedor: ventaEdit.vendedor,
        direccionEnvio:
          ventaEdit.usarDireccionCliente !== false
            ? ventaEdit.cliente?.direccion
            : ventaEdit.direccionEnvio,
        localidadEnvio:
          ventaEdit.usarDireccionCliente !== false
            ? ventaEdit.cliente?.localidad
            : ventaEdit.localidadEnvio,
        tipoEnvio: ventaEdit.tipoEnvio,
        transportista: ventaEdit.transportista,
        costoEnvio: costoEnvioNuevo,
        numeroPedido: ventaEdit.numeroPedido,
        totalVenta: total,
        productos: productosArr,
        cantidadTotal: productosArr.reduce((acc, p) => acc + p.cantidad, 0),
        historialEstados: envioExistente
          ? [
              ...(envioExistente.data().historialEstados || []),
              {
                estado: "actualizado",
                fecha: new Date().toISOString(),
                comentario: "Envío actualizado desde edición de venta",
              },
            ]
          : [
              {
                estado: "pendiente",
                fecha: new Date().toISOString(),
                comentario: "Envío creado desde edición de venta",
              },
            ],
        observaciones: ventaEdit.observaciones,
        instruccionesEspeciales: "",
        fechaActualizacion: new Date().toISOString(),
        creadoPor: "sistema",
      };

      const cleanEnvioData = Object.fromEntries(
        Object.entries(envioData).filter(
          ([_, v]) => v !== undefined && v !== null && v !== ""
        )
      );

      if (envioExistente) {
        // Actualizar envío existente
        await updateDoc(doc(db, "envios", envioExistente.id), cleanEnvioData);
        console.log("✅ Envío actualizado:", envioExistente.id);
      } else {
        // Crear nuevo envío
        await addDoc(collection(db, "envios"), cleanEnvioData);
        console.log("✅ Nuevo envío creado");
      }
    } else if (tipoEnvioNuevo === "retiro_local" && envioExistente) {
      // Eliminar envío si cambió a retiro local
      await updateDoc(doc(db, "envios", envioExistente.id), {
        estado: "cancelado",
        fechaActualizacion: new Date().toISOString(),
        historialEstados: [
          ...(envioExistente.data().historialEstados || []),
          {
            estado: "cancelado",
            fecha: new Date().toISOString(),
            comentario: "Envío cancelado - cambiado a retiro local",
          },
        ],
      });
      console.log("✅ Envío cancelado por cambio a retiro local");
    }

    // 5. Actualizar la venta con los nuevos totales calculados correctamente
    const ventaActualizada = {
      ...ventaEdit,
      subtotal,
      descuentoTotal,
      total,
      productos: productosArr,
      items: productosArr,
      // Asegurar que el costo de envío se guarde correctamente
      costoEnvio: costoEnvioNuevo,
      // Limpiar campos de envío si es retiro local
      ...(tipoEnvioNuevo === "retiro_local" && {
        costoEnvio: 0,
        direccionEnvio: "",
        localidadEnvio: "",
        transportista: "",
        rangoHorario: "",
        prioridad: "",
      }),
    };

    const docRef = doc(db, "ventas", ventaEdit.id);
    await updateDoc(docRef, ventaActualizada);

    // Actualizar el estado local
    setVenta(ventaActualizada);
    setEditando(false);
    
    // Limpiar campos de pago
    setVentaEdit((prev) => ({
      ...prev,
      nuevoPagoMonto: "",
      nuevoPagoMetodo: "",
    }));

    console.log("✅ Venta actualizada exitosamente");
    console.log("Total final:", total);
    console.log("Costo envío final:", costoEnvioNuevo);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="">Cargando venta...</p>
          <p className="text-sm text-gray-500 mt-2">ID: {id}</p>
          <p className="text-sm text-gray-500">Lang: {lang}</p>
        </div>
      </div>
    );
  }

  if (error || !venta) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center max-w-md">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">
            Venta no encontrada
          </h2>
          <p className=" mb-4">
            {error || "La venta que buscas no existe o ha sido eliminada."}
          </p>
          <div className="bg-gray-100 rounded-lg p-4 mb-6 text-left">
            <p className="text-sm text-gray-700">
              <strong>ID buscado:</strong> {id}
            </p>
            <p className="text-sm text-gray-700">
              <strong>Lang:</strong> {lang}
            </p>
            <p className="text-sm text-gray-700">
              <strong>URL:</strong> {window.location.href}
            </p>
            <p className="text-sm text-gray-700">
              <strong>Params:</strong> {JSON.stringify(params)}
            </p>
          </div>
          <div className="flex gap-3 justify-center">
            <Button onClick={() => router.back()} className="no-print">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver
            </Button>
            <Button
              variant="outline"
              onClick={() => router.push(`/${lang}/ventas`)}
              className="no-print"
            >
              Ver todas las ventas
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Función para imprimir
  const handlePrint = () => {
    window.print();
  };

  // Función para imprimir versión empleado (sin precios)
  const handlePrintEmpleado = () => {
    // Agregar clase al body para identificar modo empleado
    document.body.classList.add("print-empleado");
    window.print();
    // Remover clase después de imprimir
    setTimeout(() => {
      document.body.classList.remove("print-empleado");
    }, 1000);
  };

  // Función para obtener el estado del pago
  const getEstadoPagoColor = (estado) => {
    switch (estado) {
      case "pagado":
        return "bg-green-100 text-green-800";
      case "pendiente":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const estadoPago = venta.estadoPago || "pendiente";
  // Calcular monto abonado correctamente: priorizar array pagos, sino usar montoAbonado
  const montoAbonado =
    Array.isArray(venta.pagos) && venta.pagos.length > 0
      ? venta.pagos.reduce((acc, p) => acc + Number(p.monto), 0)
      : Number(venta.montoAbonado || 0);
  const saldoPendiente = (venta.total || 0) - montoAbonado;

  // Usar el estadoPago de la base de datos, no recalcular
  // Solo recalcular si no existe estadoPago en la BD
  const estadoPagoFinal =
    venta.estadoPago ||
    (() => {
      const montoAbonadoReal =
        Array.isArray(venta.pagos) && venta.pagos.length > 0
          ? venta.pagos.reduce((acc, p) => acc + Number(p.monto), 0)
          : Number(venta.montoAbonado || 0);

      return montoAbonadoReal >= (venta.total || 0)
        ? "pagado"
        : montoAbonadoReal > 0
        ? "parcial"
        : "pendiente";
    })();

  // Función para borrar pago del historial (solo para admin@admin.com)
  const handleBorrarPago = async (pagoIndex) => {
    if (user?.email !== "admin@admin.com") {
      console.log("Usuario no autorizado para borrar pagos");
      return;
    }

    setBorrandoPago(true);
    setPagoABorrar(pagoIndex);

    try {
      // Simular delay para UX
      await new Promise((res) => setTimeout(res, 500));

      // Crear nueva lista de pagos sin el pago a borrar
      const nuevosPagos = venta.pagos.filter((_, index) => index !== pagoIndex);

      // Actualizar la venta en el estado local
      const ventaActualizada = {
        ...venta,
        pagos: nuevosPagos,
      };

      // Actualizar en Firebase
      const docRef = doc(db, "ventas", venta.id);
      await updateDoc(docRef, {
        pagos: nuevosPagos,
      });

      // Actualizar estado local
      setVenta(ventaActualizada);

      console.log("✅ Pago borrado exitosamente");
    } catch (error) {
      console.error("Error al borrar pago:", error);
    } finally {
      setBorrandoPago(false);
      setPagoABorrar(null);
    }
  };

  // Función para confirmar borrado de pago
  const confirmarBorradoPago = (pagoIndex) => {
    if (user?.email !== "admin@admin.com") {
      return;
    }
    setPagoABorrar(pagoIndex);
    setMostrarConfirmacionBorrado(true);
  };

  return (
    <div className="min-h-screen py-8">
      <style>{`
    select {
      background: #fff !important;
      border: 1px solid #d1d5db !important;
      border-radius: 6px !important;
      padding: 8px 12px !important;
      font-size: 1rem !important;
      color: #222 !important;
      outline: none !important;
      box-shadow: none !important;
      transition: border 0.2s;
    }
    select:focus {
      border: 1.5px solid #2563eb !important;
      box-shadow: 0 0 0 2px #2563eb22 !important;
    }
    @keyframes fade-in {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .animate-fade-in {
      animation: fade-in 0.5s;
    }
    #venta-print .sello-pendiente { color: #b91c1c; border-color: #b91c1c; }
    #venta-print .sello-parcial { color: #b45309; border-color: #b45309; }
    #venta-print .sello-pagado { color: #065f46; border-color: #065f46; }
    @media print {
      @page { 
        margin: 20px !important; 
        size: A4;
      }
      body { 
        margin: 0 !important; 
        padding: 0 !important; 
      }
      body * { visibility: hidden !important; }
      #venta-print, #venta-print * { visibility: visible !important; }
      #venta-print .no-print, #venta-print .no-print * { display: none !important; }
      #venta-print {
        position: absolute !important;
        top: 0 !important;
        left: 0 !important;
        margin: 0 !important;
        padding: 0 !important;
        width: 100% !important;
        background: white !important;
      }
      /* Layout 2 columnas con espaciado sutil para legibilidad */
      #venta-print .grid { 
        display: grid !important;
        grid-template-columns: 1fr 1fr !important;
        gap: 16px !important;
        margin-bottom: 12px !important;
      }
      /* Tarjetas sin sombras pero con separación mínima */
      #venta-print .bg-card {
        background: #fff !important;
        padding: 8px !important;
        border-radius: 6px !important;
        box-shadow: none !important;
        border: 1px solid #e5e7eb !important;
      }
      /* Reducir tamaños de fuente para que quepa todo */
      #venta-print h3 {
        font-size: 14px !important;
        margin-bottom: 8px !important;
      }
      #venta-print .text-sm { font-size: 11px !important; }
      #venta-print h3 { margin: 0 0 6px 0 !important; }
      #venta-print .space-y-2 > div { margin-bottom: 3px !important; }
      /* Reducir espaciados utilitarios en impresión, no eliminarlos */
      #venta-print .p-6, 
      #venta-print .p-4 { padding: 8px !important; }
      #venta-print .px-4 { padding-left: 8px !important; padding-right: 8px !important; }
      #venta-print .py-4 { padding-top: 8px !important; padding-bottom: 8px !important; }
      #venta-print .mb-6 { margin-bottom: 10px !important; }
      #venta-print .mb-4 { margin-bottom: 8px !important; }
      #venta-print .mt-6 { margin-top: 10px !important; }
      #venta-print .mt-4 { margin-top: 8px !important; }
      /* Compactar tabla de productos */
      #venta-print table th, 
      #venta-print table td { padding-top: 6px !important; padding-bottom: 6px !important; }
      #venta-print .border-b { border-bottom: 1px solid #e5e7eb !important; }
      
      /* Estilos específicos para impresión de empleados */
      body.print-empleado #venta-print .precio-empleado,
      body.print-empleado #venta-print .subtotal-empleado,
      body.print-empleado #venta-print .total-empleado,
      body.print-empleado #venta-print .descuento-empleado,
      body.print-empleado #venta-print .costo-envio-empleado,
      body.print-empleado #venta-print .monto-abonado-empleado,
      body.print-empleado #venta-print .saldo-pendiente-empleado,
      body.print-empleado #venta-print .estado-pago-empleado,
      body.print-empleado #venta-print .forma-pago-empleado,
      body.print-empleado #venta-print .historial-pagos-empleado {
        display: none !important;
      }
      
      /* Mostrar mensaje para empleados */
      body.print-empleado #venta-print .mensaje-empleado {
        display: block !important;
        background: #f0f9ff !important;
        border: 2px solid #0ea5e9 !important;
        padding: 15px !important;
        margin: 20px 0 !important;
        border-radius: 8px !important;
        text-align: center !important;
        font-weight: bold !important;
        color: #0c4a6e !important;
      }
      
      /* Ocultar mensaje en impresión normal */
      body:not(.print-empleado) #venta-print .mensaje-empleado {
        display: none !important;
      }
      
    }
  `}</style>
      <div id="venta-print" className="mx-auto px-4">
        {/* Header profesional igual al de presupuesto */}
        <div
          className="flex items-center gap-4 border-b pb-4 mb-6 print-header"
          style={{ marginBottom: 32 }}
        >
          <img
            src="/logo-maderera.png"
            alt="Logo Maderera"
            style={{ height: 60, width: "auto" }}
          />
          <div>
            <h1 className="text-2xl font-bold " style={{ letterSpacing: 1 }}>
              Maderas Caballero
            </h1>
            <div className=" text-sm">Venta / Comprobante</div>
            <div className="text-gray-500 text-xs">
              www.caballeromaderas.com
            </div>
          </div>
          <div className="ml-auto text-right">
            <div className="text-xs text-gray-500">
              Fecha: {venta?.fecha ? formatFechaLocal(venta.fecha) : "-"}
            </div>
            <div className="text-xs text-gray-500">
              N°: {venta?.numeroPedido || venta?.id?.slice(-8)}
            </div>
          </div>
        </div>
        {/* Header con botones */}
        <div className="bg-card rounded-lg shadow-sm p-6 mb-6 no-print">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
            <div className="flex-1">
              <h1 className="text-2xl lg:text-3xl font-bold">
                N°: {venta?.numeroPedido || venta?.id?.slice(-8)}
              </h1>
              {/* Mostrar observaciones si existen */}
              {venta.observaciones && (
                <p className="text-gray-600 mt-1 whitespace-pre-line">
                  {venta.observaciones}
                </p>
              )}
            </div>
            <div className="flex flex-wrap gap-2 lg:gap-3 w-full lg:w-auto">
              <Button
                variant="outline"
                onClick={() => router.back()}
                className="no-print flex-1 lg:flex-none text-sm lg:text-base"
              >
                <ArrowLeft className="w-4 h-4 mr-1 lg:mr-2" />
                <span className="hidden sm:inline">Volver</span>
              </Button>
              <Button
                onClick={handlePrint}
                className="no-print flex-1 lg:flex-none text-sm lg:text-base"
              >
                <span className="hidden sm:inline">Imprimir</span>
                <span className="sm:hidden">🖨️</span>
              </Button>
              <Button
                onClick={handlePrintEmpleado}
                variant="outline"
                className="no-print flex-1 lg:flex-none text-sm lg:text-base"
              >
                <span className="hidden sm:inline">Imprimir Empleado</span>
                <span className="sm:hidden">👷</span>
              </Button>
              {!editando && (
                <Button
                  onClick={() => setEditando(true)}
                  className="no-print flex-1 lg:flex-none text-sm lg:text-base"
                >
                  <span className="hidden sm:inline">Editar</span>
                  <span className="sm:hidden">✏️</span>
                </Button>
              )}
            </div>
          </div>
        </div>
        {/* 1. Información del cliente y venta */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
          <div className="bg-card rounded-lg shadow-sm p-6 mb-4 flex flex-col gap-4">
            <h3 className="font-semibold text-lg mb-2 ">
              Información del Cliente
            </h3>
            <div className="space-y-2 text-sm">
              <div>
                <span className="font-medium">Nombre:</span>{" "}
                {venta.cliente?.nombre || "-"}
              </div>
              <div>
                <span className="font-medium">CUIT / DNI:</span>{" "}
                {venta.cliente?.cuit || "-"}
              </div>
                <div>
                  <span className="font-medium">Dirección:</span>{" "}
                  {venta.usarDireccionCliente === false
                    ? (venta.direccionEnvio || "-")
                    : (venta.cliente?.direccion || "-")}
                </div>
                <div>
                  <span className="font-medium">Localidad:</span>{" "}
                  {venta.usarDireccionCliente === false
                    ? (venta.localidadEnvio || "-")
                    : (venta.cliente?.localidad || "-")}
                </div>
              <div>
                <span className="font-medium">Teléfono:</span>{" "}
                {venta.cliente?.telefono || "-"}
              </div>
              {venta.cliente?.partido && (
                <div>
                  <span className="font-medium">Partido:</span>{" "}
                  {venta.cliente.partido}
                </div>
              )}
              {venta.cliente?.barrio && (
                <div>
                  <span className="font-medium">Barrio:</span>{" "}
                  {venta.cliente.barrio}
                </div>
              )}
              {venta.cliente?.area && (
                <div>
                  <span className="font-medium">Área:</span>{" "}
                  {venta.cliente.area}
                </div>
              )}
              {venta.cliente?.lote && (
                <div>
                  <span className="font-medium">Lote:</span>{" "}
                  {venta.cliente.lote}
                </div>
              )}
              {venta.cliente?.descripcion && (
                <div>
                  <span className="font-medium">Descripción:</span>{" "}
                  {venta.cliente.descripcion}
                </div>
              )}
              <div>
                <span className="font-medium">Email:</span>{" "}
                {venta.cliente?.email || "-"}
              </div>
            </div>
          </div>
          {venta.tipoEnvio && venta.tipoEnvio !== "retiro_local" ? (
            <div className="bg-card rounded-lg shadow-sm p-6 mb-6 flex flex-col gap-4">
              <h3 className="font-semibold text-lg mb-2 ">
                Información de Envío y Pago
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="font-medium">Tipo de envío:</span>{" "}
                    {venta.tipoEnvio === "envio_domicilio"
                      ? "Envío a Domicilio"
                      : venta.tipoEnvio}
                  </div>
                  <div>
                    <span className="font-medium">Transportista:</span>{" "}
                    {venta.transportista || "-"}
                  </div>
                  <div>
                    <span className="font-medium">Dirección:</span>{" "}
                    {venta.usarDireccionCliente === false
                      ? (venta.direccionEnvio || "-")
                      : (venta.cliente?.direccion || "-")}
                  </div>
                  <div>
                    <span className="font-medium">Localidad:</span>{" "}
                    {venta.usarDireccionCliente === false
                      ? (venta.localidadEnvio || "-")
                      : (venta.cliente?.localidad || "-")}
                  </div>
                  <div>
                    <span className="font-medium">Fecha de envío:</span>{" "}
                    {formatFechaLocal(venta.fechaEntrega)}
                  </div>
                  <div>
                    <span className="font-medium">Rango horario:</span>{" "}
                    {venta.rangoHorario || "-"}
                  </div>
                  <div className="no-print">
                    <span className="font-medium">Prioridad:</span>{" "}
                    {venta.prioridad || "-"}
                  </div>
                  <div className="no-print">
                    <span className="font-medium">Vendedor:</span>{" "}
                    {venta.vendedor || "-"}
                  </div>
                </div>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="font-medium">Forma de pago:</span>{" "}
                    <span className="forma-pago-empleado">
                      {venta.formaPago || "-"}
                    </span>
                  </div>
                  {venta.costoEnvio !== undefined &&
                    Number(venta.costoEnvio) > 0 && (
                      <div className="costo-envio-empleado">
                        <span className="font-medium">Costo de envío:</span> $
                        {Number(venta.costoEnvio).toLocaleString("es-AR", {
                          minimumFractionDigits: 2,
                        })}
                      </div>
                    )}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-card rounded-lg shadow-sm p-6 mb-4 flex flex-col gap-4">
              <h3 className="font-semibold text-lg mb-2 ">
                Información de Envío y Pago
              </h3>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="font-medium">Tipo de entrega:</span> Retiro
                  en local
                </div>
                <div>
                  <span className="font-medium">Fecha de retiro:</span>{" "}
                  {formatFechaLocal(venta.fechaEntrega)}
                </div>
                <div>
                  <span className="font-medium">Vendedor:</span>{" "}
                  {venta.vendedor || "-"}
                </div>
                <div>
                  <span className="font-medium">Forma de pago:</span>{" "}
                  {venta.formaPago || "-"}
                </div>
                {/* Estado de la venta */}
                <div className="estado-pago-empleado space-y-2 text-sm">
                  <div>
                    <span className="font-medium">Estado de la venta:</span>{" "}
                    {(() => {
                      // Usar el estadoPago de la base de datos, no recalcular
                      const estadoPago = venta.estadoPago || "pendiente";

                      if (estadoPago === "pagado") {
                        return (
                          <span className="text-green-700 font-bold ml-2">
                            Pagado
                          </span>
                        );
                      } else if (estadoPago === "parcial") {
                        return (
                          <span className="text-yellow-700 font-bold ml-2">
                            Parcial
                          </span>
                        );
                      } else {
                        return (
                          <span className="text-red-700 font-bold ml-2">
                            Pendiente
                          </span>
                        );
                      }
                    })()}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 3. Información de Pagos */}
        <div className="bg-card rounded-lg shadow-sm p-6 mb-4">
          <h3 className="font-semibold text-lg mb-4 ">Información de Pagos</h3>

          {/* Estado de pago */}
          <div className="mb-4 bg-card rounded-lg no-print">
            <div className="flex justify-between">
              <span className="font-medium">Estado de pago:</span>
              <span
                className={`px-3 py-1 rounded-full text-sm font-semibold ${
                  venta.estadoPago === "pagado"
                    ? "bg-green-100 text-green-800"
                    : venta.estadoPago === "parcial"
                    ? "bg-yellow-100 text-yellow-800"
                    : "bg-red-100 text-red-800"
                }`}
              >
                {venta.estadoPago === "pagado"
                  ? "Pagado"
                  : venta.estadoPago === "parcial"
                  ? "Pago Parcial"
                  : "Pendiente"}
              </span>
            </div>
          </div>

          {/* Detalles de pagos */}
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="">Total de la venta:</span>
              <span className="font-semibold total-empleado">
                ${formatearNumeroArgentino(venta.total || 0)}
              </span>
            </div>

            <div className="flex justify-between">
              <span className="">Monto abonado:</span>
              <span className="font-semibold text-green-600 monto-abonado-empleado">
                ${formatearNumeroArgentino(montoAbonado)}
              </span>
            </div>

            {saldoPendiente > 0 && (
              <div className="flex justify-between border-t pt-2">
                <span className="">Saldo pendiente:</span>
                <span className="font-semibold text-red-600 saldo-pendiente-empleado">
                  ${formatearNumeroArgentino(saldoPendiente)}
                </span>
              </div>
            )}
          </div>

          {/* Historial de pagos */}
          <div className="mt-4 historial-pagos-empleado">
            <h4 className="font-medium mb-2">Historial de pagos:</h4>
            {Array.isArray(venta.pagos) && venta.pagos.length > 0 ? (
              <div className="bg-card rounded-lg p-3">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-card border-b">
                      <th className="text-left py-1">Fecha</th>
                      <th className="text-left py-1">Método</th>
                      <th className="text-right py-1">Monto</th>
                      {user?.email === "admin@admin.com" && (
                        <th className="text-center py-1">Acciones</th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {venta.pagos.map((pago, idx) => (
                      <tr key={idx} className="border-b border-gray-200">
                        <td className="py-1">{formatFechaLocal(pago.fecha)}</td>
                        <td className="py-1">{pago.metodo}</td>
                        <td className="py-1 text-right">
                          ${Number(pago.monto).toFixed(2)}
                        </td>
                        {user?.email === "admin@admin.com" && (
                          <td className="py-1 text-center">
                            <button
                              type="button"
                              onClick={() => confirmarBorradoPago(idx)}
                              disabled={borrandoPago}
                              className={`p-1 rounded text-red-600 hover:text-red-800 hover:bg-red-50 transition-colors ${
                                borrandoPago && pagoABorrar === idx
                                  ? "opacity-50 cursor-not-allowed"
                                  : ""
                              }`}
                              title="Borrar pago"
                            >
                              {borrandoPago && pagoABorrar === idx ? (
                                <svg
                                  className="animate-spin h-4 w-4"
                                  viewBox="0 0 24 24"
                                >
                                  <circle
                                    className="opacity-25"
                                    cx="12"
                                    cy="12"
                                    r="10"
                                    stroke="currentColor"
                                    strokeWidth="4"
                                    fill="none"
                                  />
                                  <path
                                    className="opacity-75"
                                    fill="currentColor"
                                    d="M4 12a8 8 0 018-8v8z"
                                  />
                                </svg>
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-sm text-gray-600">Sin pagos registrados</div>
            )}
          </div>
        </div>

        {/* Productos y Servicios */}
        {(Array.isArray(venta.productos) && venta.productos.length > 0) ||
        (Array.isArray(venta.items) && venta.items.length > 0) ? (
          <div className="bg-card rounded-lg shadow-sm p-6 mb-4">
            <h3 className="font-semibold text-lg mb-4 ">
              Productos y Servicios
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-card border-b">
                    <th className="text-left p-3 font-medium">Producto</th>
                    <th className="text-center p-3 font-medium">Cantidad</th>
                    <th className="text-center p-3 font-medium">Cepillado</th>
                    <th className="text-right p-3 font-medium precio-empleado">
                      Precio Unit.
                    </th>
                    <th className="text-right p-3 font-medium descuento-empleado">
                      Descuento
                    </th>
                    <th className="text-right p-3 font-medium subtotal-empleado">
                      Subtotal
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {(venta.productos || venta.items).map((producto, idx) => (
                    <tr key={idx} className="border-b hover:bg-card">
                      <td className="p-3 font-medium">
                        {producto.descripcion ||
                          producto.nombre ||
                          "Producto sin nombre"}
                      </td>
                      <td className="p-3 text-center">
                        {Number(producto.cantidad)}
                      </td>
                      <td className="p-3 text-center">
                        {producto.categoria === "Maderas" ? (
                          producto.cepilladoAplicado ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-100 text-green-700 text-xs font-medium">
                              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                              </svg>
                              Sí
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-gray-100 text-gray-600 text-xs font-medium">
                              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"/>
                              </svg>
                              No
                            </span>
                          )
                        ) : (
                          <span className="text-gray-400 text-xs">-</span>
                        )}
                      </td>
                      <td className="p-3 text-right precio-empleado">
                        ${formatearNumeroArgentino(Number(producto.precio))}
                      </td>
                      <td className="p-3 text-right descuento-empleado">
                        {Number(producto.descuento || 0).toFixed(2)}%
                      </td>
                      <td className="p-3 text-right font-medium subtotal-empleado">
                        $
                        {formatearNumeroArgentino(
                          (() => {
                            // Para productos de categoría "Eventual", calcular directamente precio × cantidad
                            if (producto.categoria === "Eventual") {
                              return Number(producto.precio) * Number(producto.cantidad);
                            }
                            // Para otros productos, usar la función computeLineSubtotal
                            return computeLineSubtotal({
                              precio: producto.precio,
                              cantidad: producto.cantidad,
                              descuento: producto.descuento,
                              subcategoria: producto.subcategoria,
                              subCategoria: producto.subCategoria,
                              nombre: producto.nombre,
                              descripcion: producto.descripcion,
                            });
                          })()
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Totales (recalculados desde items para consistencia) */}
            {(() => {
              const items = (venta.productos && venta.productos.length > 0) ? venta.productos : (venta.items || []);
              const { subtotal, descuentoTotal, total } = computeTotals(items);
              const envio = venta.costoEnvio !== undefined && venta.costoEnvio !== "" && !isNaN(Number(venta.costoEnvio)) ? Number(venta.costoEnvio) : 0;
              const descuentoEfectivo = venta?.pagoEnEfectivo ? subtotal * 0.1 : 0;
              const totalFinal = total + envio - descuentoEfectivo;
              return (
                <div className="mt-6 flex justify-end">
                  <div className="bg-card rounded-lg p-4 min-w-[300px]">
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between subtotal-empleado">
                        <span>Subtotal:</span>
                        <span>$ {subtotal.toLocaleString("es-AR", { minimumFractionDigits: 2 })}</span>
                      </div>
                      <div className="flex justify-between descuento-empleado">
                        <span>Descuento total:</span>
                        <span>$ {descuentoTotal.toLocaleString("es-AR", { minimumFractionDigits: 2 })}</span>
                      </div>
                      {descuentoEfectivo > 0 && (
                        <div className="flex justify-between descuento-empleado">
                          <span>Descuento (Efectivo 10%):</span>
                          <span className="text-green-600">$ {descuentoEfectivo.toLocaleString("es-AR", { minimumFractionDigits: 2 })}</span>
                        </div>
                      )}
                      {envio > 0 && (
                        <div className="flex justify-between costo-envio-empleado">
                          <span>Cotización de envío:</span>
                          <span>$ {envio.toLocaleString("es-AR", { minimumFractionDigits: 2 })}</span>
                        </div>
                      )}
                      <div className="border-t pt-2 flex justify-between font-bold text-lg total-empleado">
                        <span>Total:</span>
                        <span className="text-primary">$ {totalFinal.toLocaleString("es-AR", { minimumFractionDigits: 2 })}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        ) : null}

        {/* 5. Observaciones */}
        {venta.observaciones && (
          <div className="bg-card rounded-lg shadow-sm p-6 mb-4 flex flex-col gap-2">
            <h3 className="font-semibold text-lg mb-2 ">Observaciones</h3>
            <p className="text-gray-700 whitespace-pre-wrap">
              {venta.observaciones}
            </p>
          </div>
        )}

        {/* 8. Edición: cada bloque editable en su propia tarjeta, alineado y con labels claros */}
        {editando && ventaEdit && (
          <div className="flex flex-col gap-8 mt-8">
            {/* Información de envío */}
            <section className="space-y-4 bg-card rounded-lg p-4 border border-gray-200 shadow-sm">
              <h3 className="text-lg font-semibold  mb-2">
                Información de envío
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="block">
                  <span className="text-sm font-medium">Tipo de envío</span>
                  <select
                    className="w-full px-3 flex [&>svg]:h-5 [&>svg]:w-5 justify-between items-center read-only:bg-background disabled:cursor-not-allowed disabled:opacity-50 transition duration-300 border-default-300 text-default-500 focus:outline-hidden focus:border-default-500/50 disabled:bg-default-200 placeholder:text-accent-foreground/50 [&>svg]:stroke-default-600 border rounded-lg h-10 text-sm"
                    value={ventaEdit.tipoEnvio || ""}
                    onChange={(e) => {
                      const nuevoTipoEnvio = e.target.value;
                      setVentaEdit((prev) => {
                        const updated = { ...prev, tipoEnvio: nuevoTipoEnvio };

                        // Si cambia de envío a retiro local, limpiar costo de envío
                        if (nuevoTipoEnvio === "retiro_local") {
                          updated.costoEnvio = "";
                          updated.direccionEnvio = "";
                          updated.localidadEnvio = "";
                          updated.transportista = "";
                          updated.rangoHorario = "";
                          updated.prioridad = "";
                        }

                        // Si cambia de retiro local a envío, inicializar campos
                        if (
                          nuevoTipoEnvio !== "retiro_local" &&
                          prev.tipoEnvio === "retiro_local"
                        ) {
                          updated.usarDireccionCliente = true;
                          updated.costoEnvio = "0";
                        }

                        return updated;
                      });
                    }}
                  >
                    <option value="">Selecciona...</option>
                    <option value="retiro_local">Retiro en local</option>
                    <option value="envio_domicilio">Envío a domicilio</option>
                  </select>
                </label>
                {ventaEdit.tipoEnvio &&
                  ventaEdit.tipoEnvio !== "retiro_local" && (
                    <>
                      <label className="block col-span-2">
                        <span className="text-sm font-medium">
                          ¿Usar dirección del cliente?
                        </span>
                        <input
                          type="checkbox"
                          className="ml-2"
                          checked={ventaEdit.usarDireccionCliente !== false}
                          onChange={(e) =>
                            setVentaEdit({
                              ...ventaEdit,
                              usarDireccionCliente: e.target.checked,
                            })
                          }
                        />
                      </label>
                      {ventaEdit.usarDireccionCliente === false ? (
                        <>
                          <input
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                            value={ventaEdit.direccionEnvio || ""}
                            onChange={(e) =>
                              setVentaEdit({
                                ...ventaEdit,
                                direccionEnvio: e.target.value,
                              })
                            }
                            placeholder="Dirección de envío"
                          />
                          <input
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                            value={ventaEdit.localidadEnvio || ""}
                            onChange={(e) =>
                              setVentaEdit({
                                ...ventaEdit,
                                localidadEnvio: e.target.value,
                              })
                            }
                            placeholder="Localidad/Ciudad"
                          />
                        </>
                      ) : (
                        <>
                          <input
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                            value={ventaEdit.cliente?.direccion || ""}
                            readOnly
                            placeholder="Dirección del cliente"
                          />
                          <input
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                            value={ventaEdit.cliente?.localidad || ""}
                            readOnly
                            placeholder="Localidad del cliente"
                          />
                        </>
                      )}
                      <select
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        value={ventaEdit.transportista || ""}
                        onChange={(e) =>
                          setVentaEdit({
                            ...ventaEdit,
                            transportista: e.target.value,
                          })
                        }
                      >
                        <option value="">Transportista...</option>
                        <option value="camion">camion</option>
                        <option value="camioneta 1">camioneta 1</option>
                        <option value="camioneta 2">camioneta 2</option>
                      </select>
                      <input
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        value={ventaEdit.costoEnvio || ""}
                        onChange={(e) =>
                          setVentaEdit({
                            ...ventaEdit,
                            costoEnvio: e.target.value,
                          })
                        }
                        placeholder="Costo de envío"
                        type="number"
                        min="0"
                        step="0.01"
                      />
                      <input
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        type="date"
                        value={ventaEdit.fechaEntrega || ""}
                        onChange={(e) =>
                          setVentaEdit({
                            ...ventaEdit,
                            fechaEntrega: e.target.value,
                          })
                        }
                        placeholder="Fecha de entrega"
                      />
                      <input
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        value={ventaEdit.rangoHorario || ""}
                        onChange={(e) =>
                          setVentaEdit({
                            ...ventaEdit,
                            rangoHorario: e.target.value,
                          })
                        }
                        placeholder="Rango horario (ej: 8-12, 14-18)"
                      />
                    </>
                  )}
                {/* Solo mostrar fecha de retiro si es retiro local */}
                {ventaEdit.tipoEnvio === "retiro_local" && (
                  <input
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    type="date"
                    value={ventaEdit.fechaEntrega || ""}
                    onChange={(e) =>
                      setVentaEdit({
                        ...ventaEdit,
                        fechaEntrega: e.target.value,
                      })
                    }
                    placeholder="Fecha de retiro"
                  />
                )}
              </div>
            </section>

            {/* Información adicional */}
            <section className="space-y-4 bg-card rounded-lg p-4 border border-gray-200 shadow-sm">
              <h3 className="text-lg font-semibold  mb-2">
                Información adicional
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="block">
                  <span className="text-sm font-medium">
                    Vendedor responsable
                  </span>
                  <input
                    type="text"
                    value={ventaEdit.vendedor || ""}
                    readOnly
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600 cursor-not-allowed"
                    placeholder="Vendedor (no editable)"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    El vendedor no se puede modificar una vez creada la venta
                  </p>
                </label>
                <label className="block">
                  <span className="text-sm font-medium">Prioridad</span>
                  <select
                    className="w-full px-3 flex [&>svg]:h-5 [&>svg]:w-5 justify-between items-center read-only:bg-background disabled:cursor-not-allowed disabled:opacity-50 transition duration-300 border-default-300 text-default-500 focus:outline-hidden focus:border-default-500/50 disabled:bg-default-200 placeholder:text-accent-foreground/50 [&>svg]:stroke-default-600 border rounded-lg h-10 text-sm"
                    value={ventaEdit.prioridad || ""}
                    onChange={(e) =>
                      setVentaEdit({ ...ventaEdit, prioridad: e.target.value })
                    }
                  >
                    <option value="">Selecciona...</option>
                    <option value="alta">Alta</option>
                    <option value="media">Media</option>
                    <option value="baja">Baja</option>
                  </select>
                </label>
                <label className="block col-span-2">
                  <span className="text-sm font-medium">Observaciones</span>
                  <textarea
                    className="w-full px-3 flex [&>svg]:h-5 [&>svg]:w-5 justify-between items-center read-only:bg-background disabled:cursor-not-allowed disabled:opacity-50 transition duration-300 border-default-300 text-default-500 focus:outline-hidden focus:border-default-500/50 disabled:bg-default-200 placeholder:text-accent-foreground/50 [&>svg]:stroke-default-600 border rounded-lg h-10 text-sm"
                    value={ventaEdit.observaciones || ""}
                    onChange={(e) =>
                      setVentaEdit({
                        ...ventaEdit,
                        observaciones: e.target.value,
                      })
                    }
                    placeholder="Observaciones"
                  />
                </label>
              </div>
            </section>

            {/* Editar productos de la venta - BLOQUE COPIADO Y ADAPTADO */}
            <div className="bg-card rounded-lg shadow-sm p-6 mb-6">
              <h3 className="font-semibold text-lg mb-4 ">
                Editar productos de la venta
              </h3>
              {/* --- INICIO BLOQUE COPIADO DE ventas/page.jsx --- */}
              <section className="bg-card rounded-xl border border-default-200 shadow-sm overflow-hidden">
                {/* Header con estadísticas */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <svg
                          className="w-6 h-6 text-blue-600"
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
                        <h3 className="text-lg font-semibold ">Productos</h3>
                        <p className="text-sm ">
                          Selecciona los productos para tu venta
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-blue-600">
                        {(ventaEdit.productos || []).length}
                      </div>
                      <div className="text-xs text-gray-500">
                        productos agregados
                      </div>
                    </div>
                  </div>
                  {/* Filtros mejorados */}
                  <div className="flex flex-col gap-3">
                    {/* Filtro de categorías */}
                    <div className="flex-1">
                      <div className="flex bg-card rounded-lg p-1 shadow-sm border border-gray-200">
                        {categoriasState.map((categoria) => (
                          <button
                            key={categoria}
                            type="button"
                            className={`rounded-full px-4 py-1 text-sm flex items-center gap-2 transition-all ${
                              categoriaId === categoria
                                ? "bg-blue-600 text-white"
                                : "bg-gray-100 text-gray-700"
                            }`}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
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
                          <div className="flex bg-card rounded-lg p-1 shadow-sm border border-gray-200">
                            <button
                              type="button"
                              className={`rounded-full px-4 py-1 text-sm flex items-center gap-2 transition-all ${
                                filtroTipoMadera === ""
                                  ? "bg-orange-600 text-white"
                                  : "bg-gray-100 text-gray-700"
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
                                    : "bg-gray-100 text-gray-700"
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
                      {categoriaId === "Ferretería" &&
                        subCategoriasFerreteria.length > 0 && (
                          <div className="flex-1">
                            <div className="flex bg-card rounded-lg p-1 shadow-sm border border-gray-200">
                              <button
                                type="button"
                                className={`rounded-md px-4 py-1 text-sm flex items-center gap-2 transition-all ${
                                  filtroSubCategoria === ""
                                    ? "bg-blue-600 text-white"
                                    : "bg-gray-100 text-gray-700"
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
                                      : "bg-gray-100 text-gray-700"
                                  }`}
                                  onClick={() =>
                                    setFiltroSubCategoria(subCategoria)
                                  }
                                >
                                  {subCategoria}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                      {/* Buscador mejorado */}
                      <div className="flex-1 relative">
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
                          className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-card"
                        />
                      </div>
                    </div>
                  </div>
                </div>
                {/* Lista de productos (alineada a ventas/page.jsx) */}
                <div className="max-h-150 overflow-y-auto">
                  {!categoriaId ? (
                        <div className="p-8 text-center">
                          <div className="w-16 h-16 mx-auto mb-4 bg-blue-100 rounded-full flex items-center justify-center">
                        <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </div>
                      <h3 className="text-lg font-medium  mb-2">Selecciona una categoría</h3>
                      <p className="text-gray-500">Elige una categoría para ver los productos disponibles</p>
                        </div>
                  ) : productosFiltrados.length === 0 ? (
                        <div className="p-8 text-center">
                          <div className="w-16 h-16 mx-auto mb-4 bg-yellow-100 rounded-full flex items-center justify-center">
                        <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                          </div>
                      <h3 className="text-lg font-medium  mb-2">No se encontraron productos</h3>
                      <p className="text-gray-500">Intenta cambiar los filtros o la búsqueda</p>
                        </div>
                  ) : (
                    <div className="space-y-4">
                        {/* Indicador de rendimiento */}
                        <div className="px-4 py-2 bg-blue-50 dark:bg-blue-900/20 border-b border-blue-200 dark:border-blue-700">
                          <div className="flex items-center justify-between text-sm">
                          <span className="text-blue-700 dark:text-blue-300">Mostrando {productosPaginados.length} de {totalProductos} productos filtrados</span>
                          <span className="text-blue-600 dark:text-blue-400 font-medium">Página {paginaActual} de {totalPaginas}</span>
                          </div>
                        </div>

                        {/* Grid de productos paginados */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 relative">
                          {/* Overlay de carga durante la paginación */}
                        {isPending && (
                            <div className="absolute inset-0 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm z-10 flex items-center justify-center rounded-lg">
                              <div className="flex items-center gap-3 bg-white dark:bg-gray-700 px-4 py-3 rounded-lg shadow-lg border border-gray-200 dark:border-gray-600">
                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Cargando productos...</span>
                              </div>
                            </div>
                          )}

                          {productosPaginados.map((prod) => {
                          const yaAgregado = (ventaEdit.productos || []).some((p) => p.id === prod.id);
                          const precio = (() => {
                            if (prod.categoria === "Maderas") return prod.precioPorPie || 0;
                            if (prod.categoria === "Ferretería") return prod.valorVenta || 0;
                            return (
                              prod.precioUnidad ||
                              prod.precioUnidadVenta ||
                              prod.precioUnidadHerraje ||
                              prod.precioUnidadQuimico ||
                              prod.precioUnidadHerramienta ||
                              0
                            );
                          })();

                          return (
                            <div key={prod.id} className={`group relative dark:bg-gray-800 rounded-lg border-2 transition-all duration-200 hover:shadow-md h-full flex flex-col ${yaAgregado ? "border-green-200 bg-green-50 dark:bg-green-900/20 dark:border-green-700" : "border-gray-200 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-500"}`}>
                              <div className="p-4 flex flex-col h-full">
                                <div className="flex items-start justify-between mb-3">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-3 mb-2">
                                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${prod.categoria === "Maderas" ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"}`}>
                                        {prod.categoria === "Maderas" ? "🌲" : "🔧"}
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{prod.nombre}</h4>
                                        {prod.categoria === "Maderas" && prod.tipoMadera && (
                                            <div className="flex items-center gap-1 mt-1">
                                            <span className="text-xs text-orange-600 dark:text-orange-400 font-medium">🌲 {prod.tipoMadera}</span>
                                            </div>
                                          )}
                                        {prod.categoria === "Ferretería" && prod.subCategoria && (
                                            <div className="flex items-center gap-1 mt-1">
                                            <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">🔧 {prod.subCategoria}</span>
                                          </div>
                                        )}
                                      </div>
                                      {yaAgregado && (
                                        <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
                                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg>
                                          <span className="text-xs font-medium">Agregado</span>
                                        </div>
                                      )}
                                    </div>
                                      </div>
                                      </div>

                                {/* Información del producto */}
                                <div className="flex-1 space-y-2">
                                  <div className="flex items-center justify-between">
                                    <span className="text-xs text-gray-500 dark:text-gray-400">Precio:</span>
                                    <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">${formatearNumeroArgentino(precio)}</span>
                                      </div>
                                  {prod.unidadMedida && (
                                    <div className="flex items-center justify-between">
                                      <span className="text-xs text-gray-500 dark:text-gray-400">Unidad:</span>
                                      <span className="text-xs text-gray-700 dark:text-gray-300">{prod.unidadMedida}</span>
                                    </div>
                                  )}
                                  {prod.stock !== undefined && (
                                    <div className="flex items-center justify-between">
                                      <span className="text-xs text-gray-500 dark:text-gray-400">Stock:</span>
                                      <span className={`text-xs font-medium ${prod.stock > 10 ? "text-green-600 dark:text-green-400" : prod.stock > 0 ? "text-yellow-600 dark:text-yellow-400" : "text-red-600 dark:text-red-400"}`}>{prod.stock} unidades</span>
                                  </div>
                                  )}
                                </div>

                                {/* Botón de agregar */}
                                <div className="mt-4">
                                      <button
                                    onClick={() => {
                                      if (yaAgregado) return;
                                      if (prod.categoria === "Maderas") {
                                        const alto = Number(prod.alto) || 0;
                                        const ancho = Number(prod.ancho) || 0;
                                        const largo = Number(prod.largo) || 0;
                                        const precioPorPie = Number(prod.precioPorPie) || 0;
                                        if (alto > 0 && ancho > 0 && largo > 0 && precioPorPie > 0) {
                                          const precioCalc = calcularPrecioCorteMadera({ alto, ancho, largo, precioPorPie });
                                          setVentaEdit((prev) => ({
                                            ...prev,
                                            productos: [
                                              ...(prev.productos || []),
                                              {
                                                id: prod.id,
                                                nombre: prod.nombre,
                                                precio: precioCalc,
                                                unidad: prod.unidadMedida,
                                                stock: prod.stock,
                                                cantidad: 1,
                                                descuento: 0,
                                                categoria: prod.categoria,
                                                alto,
                                                ancho,
                                                largo,
                                                precioPorPie,
                                                cepilladoAplicado: false,
                                                tipoMadera: prod.tipoMadera || "",
                                                subcategoria: prod.subcategoria || prod.subCategoria || "",
                                              },
                                            ],
                                          }));
                                        } else {
                                          console.warn("El producto de madera no tiene dimensiones válidas.");
                                        }
                                      } else if (prod.categoria === "Ferretería") {
                                          setVentaEdit((prev) => ({
                                            ...prev,
                                          productos: [
                                            ...(prev.productos || []),
                                            {
                                              id: prod.id,
                                              nombre: prod.nombre,
                                              precio: prod.valorVenta || 0,
                                              unidad: prod.unidadMedida || prod.unidadVenta,
                                              stock: prod.stock,
                                              cantidad: 1,
                                              descuento: 0,
                                              categoria: prod.categoria,
                                            },
                                          ],
                                        }));
                                      } else {
                                        const precioOtro = (
                                          prod.precioUnidad || prod.precioUnidadVenta || prod.precioUnidadHerraje || prod.precioUnidadQuimico || prod.precioUnidadHerramienta || 0
                                        );
                                        setVentaEdit((prev) => ({
                                          ...prev,
                                          productos: [
                                            ...(prev.productos || []),
                                            {
                                              id: prod.id,
                                              nombre: prod.nombre,
                                              precio: precioOtro,
                                              unidad: prod.unidadMedida || prod.unidadVenta,
                                              stock: prod.stock,
                                              cantidad: 1,
                                              descuento: 0,
                                              categoria: prod.categoria,
                                            },
                                          ],
                                        }));
                                      }
                                    }}
                                    disabled={yaAgregado || loadingPrecios}
                                    className={`w-full py-2 px-3 rounded-md text-sm font-medium transition-colors ${yaAgregado ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 cursor-not-allowed" : "bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"}`}
                                  >
                                    {yaAgregado ? "Ya agregado" : "Agregar"}
                                    </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Controles de paginación */}
                      {totalPaginas > 1 && (
                        <div className="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
                          {/* Información de página */}
                          <div className="text-sm text-gray-700 dark:text-gray-300 flex items-center gap-2">
                            {isPending && (<div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600"></div>)}
                            <span>Mostrando {paginaActual}-{Math.min(paginaActual + productosPorPagina - 1, totalProductos)} de {totalProductos} productos</span>
                          </div>
                          {/* Controles de navegación */}
                          <div className="flex items-center gap-2">
                            <button onClick={() => cambiarPagina(1)} disabled={paginaActual === 1 || isPending} className={`p-2 rounded-md transition-all duration-200 ${isPending ? "text-gray-300 dark:text-gray-600 cursor-not-allowed" : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"}`} title="Primera página">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7"/></svg>
                            </button>
                            <button onClick={() => cambiarPagina(paginaActual - 1)} disabled={paginaActual === 1 || isPending} className={`p-2 rounded-md transition-all duration-200 ${isPending ? "text-gray-300 dark:text-gray-600 cursor-not-allowed" : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"}`} title="Página anterior">
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
                                  <button key={pageNum} onClick={() => cambiarPagina(pageNum)} disabled={isPending} className={`px-3 py-1 text-sm rounded-md transition-colors ${isPending ? "text-gray-300 dark:text-gray-600 cursor-not-allowed" : paginaActual === pageNum ? "bg-blue-600 text-white" : "text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"}`}>
                                    {pageNum}
                                  </button>
                                );
                              })}
                            </div>
                            <button onClick={() => cambiarPagina(paginaActual + 1)} disabled={paginaActual === totalPaginas || isPending} className={`p-2 rounded-md transition-all duration-200 ${isPending ? "text-gray-300 dark:text-gray-600 cursor-not-allowed" : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"}`} title="Página siguiente">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"/></svg>
                            </button>
                            <button onClick={() => cambiarPagina(totalPaginas)} disabled={paginaActual === totalPaginas || isPending} className={`p-2 rounded-md transition-all duration-200 ${isPending ? "text-gray-300 dark:text-gray-600 cursor-not-allowed" : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"}`} title="Última página">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 5l7 7-7 7m-8 0l7-7-7-7"/></svg>
                            </button>
                          </div>
                        </div>
                      )}
                        </div>
                      )}
              </div>
            </section>

              {/* Tabla de productos seleccionados - diseño EXACTO de ventas/page.jsx */}
              {(ventaEdit.productos || []).length > 0 && (
                <section className="mt-4 bg-card/60 rounded-xl p-0 border border-default-200 shadow-lg overflow-hidden ring-1 ring-default-200/60">
                  <div className="flex items-center justify-between px-4 py-3 border-b bg-gradient-to-r from-default-50 to-default-100">
                    <h3 className="text-base md:text-lg font-semibold text-default-900">Productos Seleccionados</h3>
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-default-200/60 text-default-700 border border-default-300">
                      {(ventaEdit.productos || []).length} producto{(ventaEdit.productos || []).length !== 1 ? "s" : ""}
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
                        {(ventaEdit.productos || []).map((p, idx) => (
                          <tr key={p.id} className="border-b border-default-300 transition-colors data-[state=selected]:bg-muted">
                            <td className="p-4 align-middle text-sm text-default-600">
                              {p.categoria && (
                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-default-100 text-default-700 border border-default-200 text-[11px] font-medium">
                                  {p.categoria}
                                </span>
                              )}
                            </td>
                            <td className="p-4 align-top text-sm text-default-600">
                              <div className="font-semibold text-default-900">
                                {p.esEditable ? (
                                  <input
                                    type="text"
                                    value={p.nombre}
                                    onChange={(e) => handleNombreChange(p.id, e.target.value)}
                                    className="w-full px-2 py-1 border border-gray-300 uppercase rounded text-base font-bold bg-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-200"
                                    disabled={loadingPrecios}
                                    placeholder="Nombre del producto"
                                  />
                                ) : (
                                  <div>
                                    {p.nombre}
                                    {p.categoria === "Maderas" && p.tipoMadera && (
                                      <span className="font-semibold text-default-900"> {" "}- {p.tipoMadera.toUpperCase()}</span>
                                    )}
                                  </div>
                                )}
                              </div>
                              {p.categoria === "Ferretería" && p.subCategoria && (
                                <div className="flex items-center gap-1 mt-1">
                                  <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">{p.subCategoria}</span>
                                </div>
                              )}

                              {p.categoria === "Maderas" && p.unidad !== "Unidad" && (
                                <div className="mt-2 flex flex-wrap items-start gap-3">
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
                                          <input type="number" min="0" step="0.01" value={p.alto === "" ? "" : p.alto || ""} onChange={(e) => handleAltoChange(p.id, e.target.value)} className="h-8 w-[68px] sm:w-[80px] rounded-sm border border-orange-300 dark:border-orange-600 bg-white dark:bg-gray-800 text-sm px-1.5 focus:border-orange-500 focus:ring-1 focus:ring-orange-200 dark:focus:ring-orange-800" disabled={loadingPrecios} />
                                        </div>
                                        <div className="flex flex-col gap-0.5">
                                          <label className="text-[11px] font-semibold text-orange-700">Largo</label>
                                          <input type="number" min="0" step="0.01" value={p.largo === "" ? "" : p.largo || ""} onChange={(e) => handleLargoChange(p.id, e.target.value)} className="h-8 w-[68px] sm:w-[80px] rounded-sm border border-orange-300 dark:border-orange-600 bg-white dark:bg-gray-800 text-sm px-1.5 focus:border-orange-500 focus:ring-1 focus:ring-orange-200 dark:focus:ring-orange-800" disabled={loadingPrecios} />
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="flex flex-wrap items-end gap-2">
                                        <div className="flex flex-col gap-0.5">
                                          <label className="text-[11px] font-semibold text-orange-700">Alto</label>
                                          <input type="number" min="0" step="0.01" value={p.alto === "" ? "" : p.alto || ""} onChange={(e) => handleAltoChangeMadera(p.id, e.target.value)} className="h-8 w-[68px] sm:w-[80px] rounded-sm border border-orange-300 dark:border-orange-600 bg-white dark:bg-gray-800 text-sm px-1.5 focus:border-orange-500 focus:ring-1 focus:ring-orange-200 dark:focus:ring-orange-800" disabled={loadingPrecios} />
                                        </div>
                                        <div className="flex flex-col gap-0.5">
                                          <label className="text-[11px] font-semibold text-orange-700">Ancho</label>
                                          <input type="number" min="0" step="0.01" value={p.ancho === "" ? "" : p.ancho || ""} onChange={(e) => handleAnchoChangeMadera(p.id, e.target.value)} className="h-8 w-[68px] sm:w-[80px] rounded-sm border border-orange-300 dark:border-orange-600 bg-white dark:bg-gray-800 text-sm px-1.5 focus:border-orange-500 focus:ring-1 focus:ring-orange-200 dark:focus:ring-orange-800" disabled={loadingPrecios} />
                                        </div>
                                        <div className="flex flex-col gap-0.5">
                                          <label className="text-[11px] font-semibold text-orange-700">Largo</label>
                                          <input type="number" min="0" step="0.01" value={p.largo === "" ? "" : p.largo || ""} onChange={(e) => handleLargoChangeMadera(p.id, e.target.value)} className="h-8 w-[68px] sm:w-[80px] rounded-sm border border-orange-300 dark:border-orange-600 bg-white dark:bg-gray-800 text-sm px-1.5 focus:border-orange-500 focus:ring-1 focus:ring-orange-200 dark:focus:ring-orange-800" disabled={loadingPrecios} />
                                        </div>
                                      </div>
                                    )}
                                  </div>

                                  <div className="inline-block w-fit p-1.5 bg-green-50 dark:bg-green-900/20 rounded-md border border-green-200 dark:border-green-700 align-top">
                                    <div className="flex items-center gap-1 mb-1">
                                      <svg className="w-3 h-3 text-green-600 dark:text-green-400" fill="currentColor" viewBox="0 0 20 20"><path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" /><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd"/></svg>
                                      <span className="text-sm font-semibold text-green-700 dark:text-green-400">Precio</span>
                                    </div>
                                    <div className="inline-block w-fit">
                                      <label className="block text-[11px] font-semibold text-green-700 dark:text-green-300 mb-0.5">Valor</label>
                                      <div className="relative">
                                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-sm text-green-600 dark:text-green-400 font-medium">$</span>
                                        <input type="number" min="0" step="0.01" value={p.precioPorPie === "" ? "" : p.precioPorPie || ""} onChange={(e) => {
                                          if (p.unidad === "M2") {
                                            handlePrecioPorPieChange(p.id, e.target.value);
                                          } else {
                                            handlePrecioPorPieChangeMadera(p.id, e.target.value);
                                          }
                                        }} className="h-8 w-[88px] pl-5 pr-2 text-sm border border-green-300 dark:border-green-600 rounded-md bg-white dark:bg-gray-800 focus:border-green-500 focus:ring-1 focus:ring-green-200 dark:focus:ring-green-800 focus:outline-none transition-colors tabular-nums" disabled={loadingPrecios} placeholder="0.00" />
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </td>
                            <td className="p-4 align-middle text-sm text-default-600">
                              <div className="flex items-center justify-center">
                                <div className="flex items-center bg-white dark:bg-gray-800 border border-default-300 dark:border-gray-700 rounded-lg overflow-hidden shadow-sm">
                                  <button type="button" onClick={() => handleDecrementarCantidad(p.id)} disabled={loadingPrecios || p.cantidad <= 1} className="px-3 py-2 text-default-500 hover:text-default-900 hover:bg-default-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 12H4" /></svg>
                                  </button>
                                  <input type="number" min={1} value={p.cantidad === "" ? "" : p.cantidad} onChange={(e) => handleCantidadChange(p.id, e.target.value)} className="w-16 text-center text-base md:text-lg font-bold border-0 bg-transparent focus:ring-0 focus:outline-none text-gray-900 dark:text-gray-100 tabular-nums" disabled={loadingPrecios} />
                                  <button type="button" onClick={() => handleIncrementarCantidad(p.id)} disabled={loadingPrecios} className="px-3 py-2 text-default-500 hover:text-default-900 hover:bg-default-100 dark:hover:bg-gray-700 transition-colors">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
                                  </button>
                                </div>
                              </div>
                            </td>
                            <td className="p-4 align-middle text-sm text-default-600">
                              {p.categoria === "Maderas" ? (
                                <div className="flex items-center justify-center">
                                  <input type="checkbox" checked={p.cepilladoAplicado || false} onChange={(e) => { recalcularPreciosMadera(p.id, e.target.checked); }} className="w-4 h-4 text-blue-600 bg-white border-default-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 focus:ring-2" disabled={loadingPrecios} title="Aplicar cepillado (+6.6%)" />
                                </div>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </td>
                            <td className="p-4 align-middle text-sm text-default-600">
                              {p.esEditable ? (
                                <input type="number" min="0" step="100" value={p.precio === "" ? "" : p.precio} onChange={(e) => handlePrecioChange(p.id, e.target.value)} className="w-24 ml-auto block text-right border border-default-300 rounded-md px-2 py-1 text-sm font-semibold bg-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-200 tabular-nums" disabled={loadingPrecios} placeholder="0" />
                              ) : (
                                <span className="block text-right font-semibold text-default-900 tabular-nums">
                                  {venta?.pagoEnEfectivo 
                                    ? `$${formatearNumeroArgentino(Number(p.precio) * 0.9)}`
                                    : `$${formatearNumeroArgentino(p.precio)}`
                                  }
                                </span>
                              )}
                            </td>
                            <td className="p-4 align-middle text-sm text-default-600">
                              <div className="relative w-20 md:w-24 mx-auto">
                                <input type="number" min={0} max={100} value={p.descuento === "" ? "" : p.descuento || ""} onChange={(e) => handleDescuentoChange(p.id, e.target.value)} className="w-full text-center border border-default-300 rounded-md px-2 py-1 pr-6 bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-200" disabled={loadingPrecios} />
                                <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs text-default-500">%</span>
                              </div>
                            </td>
                            <td className="p-4 align-middle text-right text-sm text-default-900 font-bold tabular-nums">
                              ${formatearNumeroArgentino(
                                (() => {
                                  let subtotalBase;
                                  // Para productos de categoría "Eventual", calcular directamente precio × cantidad × (1 - descuento)
                                  if (p.categoria === "Eventual") {
                                    subtotalBase = Number(p.precio) * Number(p.cantidad);
                                  } else {
                                    // Para otros productos, usar la función computeLineBase
                                    subtotalBase = computeLineBase(p);
                                  }
                                  
                                  // Aplicar descuento individual
                                  const subtotalConDescuento = subtotalBase * (1 - Number(p.descuento || 0) / 100);
                                  
                                  // Si es pago en efectivo, aplicar descuento adicional del 10%
                                  return venta?.pagoEnEfectivo 
                                    ? Math.round(subtotalConDescuento * 0.9)
                                    : Math.round(subtotalConDescuento);
                                })()
                              )}
                            </td>
                            <td className="p-4 align-middle text-center text-sm text-default-600">
                              <span className="group relative inline-flex">
                                <button type="button" aria-label="Eliminar producto" onClick={() => handleQuitarProducto(p.id)} disabled={loadingPrecios} className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-red-200 text-red-600 hover:text-white hover:bg-red-600 hover:border-red-600 shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50" title="Eliminar">
                                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M9 3a1 1 0 00-1 1v1H5.5a1 1 0 100 2H6v12a2 2 0 002 2h8a2 2 0 002-2V7h.5a1 1 0 100-2H16V4a1 1 0 00-1-1H9zm2 2h4v1h-4V5zm-1 5a1 1 0 112 0v7a1 1 0 11-2 0v-7zm5 0a1 1 0 112 0v7a1 1 0 11-2 0v-7z" /></svg>
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
              )}

              {/* Totales y botones por debajo de la tabla */}
              {(ventaEdit.productos || []).length > 0 && (
                <div className="flex flex-col items-end gap-2 mt-4">
                  {(() => {
                    const { subtotal, descuentoTotal, total } = computeTotals(ventaEdit.productos || []);
                    const envio = ventaEdit.tipoEnvio && ventaEdit.tipoEnvio !== "retiro_local" ? Number(ventaEdit.costoEnvio) || 0 : 0;
                    const descuentoEfectivo = venta?.pagoEnEfectivo ? subtotal * 0.1 : 0;
                    const totalFinal = total + envio - descuentoEfectivo;
                    return (
                      <div className="bg-primary/5 border border-primary/20 rounded-lg px-6 py-3 flex flex-col md:flex-row gap-4 md:gap-8 text-lg shadow-sm w-full md:w-auto font-semibold">
                        <div>
                          Subtotal: <span className="font-bold">${formatearNumeroArgentino(subtotal)}</span>
                        </div>
                        <div>
                          Descuento: <span className="font-bold">${formatearNumeroArgentino(descuentoTotal)}</span>
                        </div>
                        {descuentoEfectivo > 0 && (
                          <div>
                            Descuento (Efectivo 10%): <span className="font-bold text-green-600">${formatearNumeroArgentino(descuentoEfectivo)}</span>
                          </div>
                        )}
                        {envio > 0 && (
                          <div>
                            Costo de envío: <span className="font-bold">${formatearNumeroArgentino(envio)}</span>
                          </div>
                        )}
                        <div>
                          Total: <span className="font-bold text-primary">${formatearNumeroArgentino(totalFinal)}</span>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              {(() => {
                // Cálculo limpio y UI mejorada para pagos pendientes
                const totalesEdicion = computeTotals(ventaEdit.productos || []);
                const subtotal = totalesEdicion.subtotal;
                const descuento = totalesEdicion.descuentoTotal;

                // Calcular costo de envío basado en el tipo de envío actual
                const envio =
                  ventaEdit.tipoEnvio && ventaEdit.tipoEnvio !== "retiro_local"
                    ? Number(ventaEdit.costoEnvio) || 0
                    : 0;

                const descuentoEfectivo = venta?.pagoEnEfectivo ? subtotal * 0.1 : 0;
                const total = subtotal - descuento - descuentoEfectivo + envio;
                const abonado = Array.isArray(ventaEdit.pagos)
                  ? ventaEdit.pagos.reduce((acc, p) => acc + Number(p.monto), 0)
                  : Number(ventaEdit.montoAbonado || 0);
                const saldo = total - abonado;

                if (saldo > 0) {
                  // Validar que los campos estén inicializados
                  const montoValido = ventaEdit.nuevoPagoMonto && 
                    Number(ventaEdit.nuevoPagoMonto) > 0 && 
                    Number(ventaEdit.nuevoPagoMonto) <= saldo;
                  const metodoValido = ventaEdit.nuevoPagoMetodo && 
                    ventaEdit.nuevoPagoMetodo.trim() !== "";
                  const botonHabilitado = !registrandoPago && montoValido && metodoValido;

                  return (
                    <div className="rounded-lg border border-yellow-300/70 bg-yellow-50/70 p-3 my-3 w-full max-w-xl ml-auto">
                      {/* Encabezado con jerarquía tipográfica */}
                      <div className="mb-2">
                        <div className="flex items-baseline gap-2">
                          <span className="text-lg text-yellow-900">Saldo pendiente</span>
                          <span className="text-lg font-extrabold text-yellow-900">${formatearNumeroArgentino(saldo)}</span>
                        </div>
                        <div className="mt-1 text-lg font-medium text-green-700">Abonado ${formatearNumeroArgentino(abonado)}</div>
                      </div>

                      {/* Línea de captura: monto + método + acción */}
                      <div className="flex flex-col md:flex-row md:items-center gap-2">
                        <input
                          type="number"
                          min={1}
                          max={saldo}
                          step="0.01"
                          placeholder="0,00"
                          className={`flex-1 h-9 border rounded-md px-3 text-sm ${ventaEdit.nuevoPagoMonto && !montoValido ? 'border-red-500 bg-red-50' : 'border-yellow-300 bg-white'}`}
                          value={ventaEdit.nuevoPagoMonto || ""}
                          onChange={(e) => {
                            const valor = e.target.value;
                            setVentaEdit((prev) => ({
                              ...prev,
                              nuevoPagoMonto: valor,
                            }));
                          }}
                          disabled={registrandoPago}
                        />
                        <select
                          className={`h-9 w-full md:w-44 border rounded-md px-2 text-sm ${ventaEdit.nuevoPagoMetodo && !metodoValido ? 'border-red-500 bg-red-50' : 'border-yellow-300 bg-white'}`}
                          value={ventaEdit.nuevoPagoMetodo || ""}
                          onChange={(e) => {
                            const valor = e.target.value;
                            setVentaEdit((prev) => ({
                              ...prev,
                              nuevoPagoMetodo: valor,
                            }));
                          }}
                          disabled={registrandoPago}
                        >
                          <option value="">Selecciona...</option>
                          <option value="efectivo">Efectivo</option>
                          <option value="transferencia">Transferencia</option>
                          <option value="tarjeta">Tarjeta</option>
                          <option value="cheque">Cheque</option>
                          <option value="otro">Otro</option>
                        </select>
                        <button
                          type="button"
                          className={`h-9 px-3 inline-flex items-center justify-center rounded-md text-sm font-semibold transition-colors ${botonHabilitado ? 'bg-green-600 text-white hover:bg-green-700' : 'bg-gray-300 text-gray-600 cursor-not-allowed'}`}
                          onClick={async () => {
                            if (!botonHabilitado) {
                              return;
                            }

                            setRegistrandoPago(true);
                            
                            try {
                              await new Promise((res) => setTimeout(res, 400));
                              
                              if (Array.isArray(ventaEdit.pagos)) {
                                setVentaEdit((prev) => ({
                                  ...prev,
                                  pagos: [
                                    ...prev.pagos,
                                    {
                                      fecha: new Date()
                                        .toISOString()
                                        .split("T")[0],
                                      monto: Number(prev.nuevoPagoMonto),
                                      metodo: prev.nuevoPagoMetodo,
                                      usuario: "usuario",
                                    },
                                  ],
                                  nuevoPagoMonto: "",
                                  nuevoPagoMetodo: "",
                                }));
                              } else {
                                setVentaEdit((prev) => ({
                                  ...prev,
                                  pagos: [
                                    {
                                      fecha: new Date()
                                        .toISOString()
                                        .split("T")[0],
                                      monto: Number(prev.nuevoPagoMonto),
                                      metodo: prev.nuevoPagoMetodo,
                                      usuario: "usuario",
                                    },
                                  ],
                                  nuevoPagoMonto: "",
                                  nuevoPagoMetodo: "",
                                }));
                              }
                              setPagoExitoso(true);
                              setTimeout(() => setPagoExitoso(false), 1800);
                            } catch (error) {
                              console.error("Error al registrar pago:", error);
                            } finally {
                              setRegistrandoPago(false);
                            }
                          }}
                          disabled={!botonHabilitado}
                        >
                          {registrandoPago ? (
                            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>
                          ) : (
                            'Registrar pago'
                          )}
                        </button>
                      </div>
                      {/* Mensajes de validación compactos */}
                      {ventaEdit.nuevoPagoMonto && !montoValido && (
                        <div className="mt-2 text-xs text-red-600">{Number(ventaEdit.nuevoPagoMonto) <= 0 ? 'El monto debe ser mayor a 0' : Number(ventaEdit.nuevoPagoMonto) > saldo ? `No puede superar $${formatearNumeroArgentino(saldo)}` : 'Monto inválido'}</div>
                      )}
                      {ventaEdit.nuevoPagoMetodo && !metodoValido && (
                        <div className="mt-1 text-xs text-red-600">Selecciona un método válido</div>
                      )}
                      {pagoExitoso && (<div className="mt-2 text-xs text-green-700 font-semibold">¡Pago registrado!</div>)}
                    </div>
                  );
                }
                return null;
              })()}
              <div className="flex flex-wrap gap-2 mt-6">
                <Button
                  variant="default"
                  onClick={handleGuardarCambios}
                  disabled={loadingPrecios}
                  className="no-print flex-1 lg:flex-none text-sm lg:text-base"
                >
                  <span className="hidden sm:inline">Guardar cambios</span>
                  <span className="sm:hidden">💾</span>
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setEditando(false)}
                  disabled={loadingPrecios}
                  className="no-print flex-1 lg:flex-none text-sm lg:text-base"
                >
                  <span className="hidden sm:inline">Cancelar</span>
                  <span className="sm:hidden">❌</span>
                </Button>
              </div>
              {errorForm && (
                <div className="text-red-500 mt-2">{errorForm}</div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Modal de confirmación para borrar pago */}
      {mostrarConfirmacionBorrado && pagoABorrar !== null && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Confirmar borrado
                </h3>
                <p className="text-sm text-gray-600">
                  ¿Estás seguro de que quieres borrar este pago?
                </p>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-3 mb-4">
              <div className="text-sm text-gray-700">
                <div className="font-medium">Detalles del pago:</div>
                <div className="mt-1">
                  <span className="text-gray-600">Fecha:</span>{" "}
                  {formatFechaLocal(venta.pagos[pagoABorrar].fecha)}
                </div>
                <div>
                  <span className="text-gray-600">Método:</span>{" "}
                  {venta.pagos[pagoABorrar].metodo}
                </div>
                <div>
                  <span className="text-gray-600">Monto:</span>{" "}
                  <span className="font-semibold text-red-600">
                    ${Number(venta.pagos[pagoABorrar].monto).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => {
                  setMostrarConfirmacionBorrado(false);
                  setPagoABorrar(null);
                }}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={async () => {
                  setMostrarConfirmacionBorrado(false);
                  await handleBorrarPago(pagoABorrar);
                }}
                disabled={borrandoPago}
                className={`px-4 py-2 text-white rounded-lg transition-colors ${
                  borrandoPago
                    ? "bg-red-400 cursor-not-allowed"
                    : "bg-red-600 hover:bg-red-700"
                }`}
              >
                {borrandoPago ? (
                  <div className="flex items-center gap-2">
                    <svg
                      className="animate-spin h-4 w-4"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="none"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8v8z"
                      />
                    </svg>
                    Borrando...
                  </div>
                ) : (
                  "Borrar pago"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VentaDetalle;
