"use client";
import React, { useEffect, useState, useMemo, useCallback } from "react";
import { isMachimbreOrDeck, computeLineBase, computeTotals } from "@/lib/pricing";
import { useParams, useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { useAuth } from "@/provider/auth.provider";
import {
  doc,
  getDoc,
  collection,
  getDocs,
  updateDoc,
  setDoc,
  addDoc,
  increment,
  serverTimestamp,
} from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Printer, Download } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import FormularioVentaPresupuesto, {
  SelectorProductosPresupuesto,
} from "../../ventas/page";

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

// Función para calcular fecha de vencimiento (7 días después de la emisión)
function calcularFechaVencimiento(fechaEmision) {
  if (!fechaEmision) return null;

  const fecha = new Date(fechaEmision);
  fecha.setDate(fecha.getDate() + 7); // Agregar 7 días

  return fecha.toISOString().split("T")[0]; // Formato YYYY-MM-DD
}

const PresupuestoDetalle = () => {
  const params = useParams();
  const router = useRouter();
  const { id, lang } = params;
  const { user } = useAuth();
  const [presupuesto, setPresupuesto] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // 1. Importaciones necesarias para edición, modal y Firestore
  const [editando, setEditando] = useState(false);
  const [presupuestoEdit, setPresupuestoEdit] = useState(null);
  const [openVenta, setOpenVenta] = useState(false);
  const [ventaForm, setVentaForm] = useState(null);
  const [clientes, setClientes] = useState([]);
  const [productos, setProductos] = useState([]);
  const [loadingPrecios, setLoadingPrecios] = useState(false);
  const [errorForm, setErrorForm] = useState("");
  // Eliminar el estado global de cepillado automático
  // const [cepilladoAutomatico, setCepilladoAutomatico] = useState(false);

  // Estado para conversión a venta
  const [convirtiendoVenta, setConvirtiendoVenta] = useState(false);

  // Estado para pago en efectivo
  const [pagoEnEfectivo, setPagoEnEfectivo] = useState(false);

  // Estados para filtros de productos
  const [categoriaId, setCategoriaId] = useState("");
  const [busquedaProducto, setBusquedaProducto] = useState("");
  const [filtroTipoMadera, setFiltroTipoMadera] = useState("");
  const [filtroSubCategoria, setFiltroSubCategoria] = useState("");
  // Búsqueda local con debounce + deferred (alineado a ventas)
  const [busquedaDebounced, setBusquedaDebounced] = useState("");
  useEffect(() => {
    const id = setTimeout(() => setBusquedaDebounced(busquedaProducto), 100);
    return () => clearTimeout(id);
  }, [busquedaProducto]);
  const busquedaDefer = React.useDeferredValue(busquedaDebounced);

  // Catálogo y paginación (alineado a ventas)
  const [paginaActual, setPaginaActual] = useState(1);
  const [productosPorPagina] = useState(12);
  const [isPending, startTransition] = React.useTransition();

  // Derivar categorías y agrupación desde los productos cargados
  const [productosState, setProductosState] = useState([]);
  const [productosPorCategoriaState, setProductosPorCategoriaState] = useState({});
  const [categoriasState, setCategoriasState] = useState([]);
  useEffect(() => {
    if (!Array.isArray(productos) || productos.length === 0) {
      setProductosState([]);
      setProductosPorCategoriaState({});
      setCategoriasState([]);
      return;
    }
    setProductosState(productos);
    const agrupados = {};
    productos.forEach((p) => {
      (agrupados[p.categoria] = agrupados[p.categoria] || []).push(p);
    });
    setProductosPorCategoriaState(agrupados);
    setCategoriasState(Object.keys(agrupados));
  }, [productos]);

  // Estado para nuevo cliente en presupuestos
  const [openNuevoCliente, setOpenNuevoCliente] = useState(false);
  const [nuevoCliente, setNuevoCliente] = useState({
    nombre: "",
    direccion: "",
    telefono: "",
    cuit: "",
    partido: "",
    barrio: "",
    area: "",
    lote: "",
    descripcion: "",
    esClienteViejo: false, // Nuevo campo para diferenciar
  });

  useEffect(() => {
    const fetchPresupuesto = async () => {
      try {
        console.log("=== DEBUG PRESUPUESTO ===");
        console.log("Params completos:", params);
        console.log("ID extraído:", id);
        console.log("Lang extraído:", lang);
        console.log("URL actual:", window.location.href);

        if (!id) {
          console.error("No se encontró ID en los parámetros");
          setError("No se proporcionó ID de presupuesto");
          setLoading(false);
          return;
        }

        const docRef = doc(db, "presupuestos", id);
        console.log("Referencia del documento:", docRef);

        const docSnap = await getDoc(docRef);
        console.log("Documento existe:", docSnap.exists());
        console.log("Datos del documento:", docSnap.data());

        if (docSnap.exists()) {
          const presupuestoData = { id: docSnap.id, ...docSnap.data() };
          console.log("Presupuesto cargado exitosamente:", presupuestoData);
          setPresupuesto(presupuestoData);
        } else {
          console.error("Presupuesto no encontrado en Firebase");
          setError("El presupuesto no existe en la base de datos");
        }
      } catch (error) {
        console.error("Error al cargar presupuesto:", error);
        setError(`Error al cargar el presupuesto: ${error.message}`);
      } finally {
        setLoading(false);
      }
    };

    fetchPresupuesto();
  }, [id, lang, params]);

  // 3. Cargar clientes y productos para selects y actualización de precios
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
      console.log("=== DEBUG PRESUPUESTO CARGA PRODUCTOS ===");
      console.log("Productos cargados:", productosData);
      console.log("Cantidad de productos:", productosData.length);
      setProductos(productosData);
    };
    fetchClientesYProductos();
  }, []);

  // 4. Al activar edición, clonar presupuesto
  useEffect(() => {
    console.log("=== DEBUG USEEFFECT EDICIÓN PRESUPUESTO ===");
    console.log("editando:", editando);
    console.log("presupuesto:", presupuesto);
    if (editando && presupuesto) {
      console.log("Clonando presupuesto para edición");
      const presupuestoClonado = JSON.parse(JSON.stringify(presupuesto));
      // Asegurar que clienteId y cliente estén presentes
      if (!presupuestoClonado.clienteId && presupuestoClonado.cliente?.cuit) {
        presupuestoClonado.clienteId = presupuestoClonado.cliente.cuit;
      }
      if (!presupuestoClonado.cliente && presupuestoClonado.clienteId) {
        const clienteObj = clientes.find(
          (c) =>
            c.id === presupuestoClonado.clienteId ||
            c.cuit === presupuestoClonado.clienteId
        );
        if (clienteObj) presupuestoClonado.cliente = clienteObj;
      }

      // Enriquecer productos con información de la base de datos
      if (presupuestoClonado.productos && productos.length > 0) {
        presupuestoClonado.productos = presupuestoClonado.productos.map(
          (productoPresupuesto) => {
            const productoDB = productos.find(
              (p) => p.id === productoPresupuesto.id
            );
            if (productoDB) {
              return {
                ...productoPresupuesto,
                // Preservar campos específicos de categoría
                tipoMadera:
                  productoDB.tipoMadera || productoPresupuesto.tipoMadera || "",
                subcategoria:
                  productoDB.categoria === "Maderas"
                    ? productoDB.subcategoria ||
                      productoDB.subCategoria ||
                      productoPresupuesto.subcategoria ||
                      productoPresupuesto.subCategoria ||
                      ""
                    : productoDB.subCategoria ||
                      productoDB.subcategoria ||
                      productoPresupuesto.subCategoria ||
                      productoPresupuesto.subcategoria ||
                      "",
                // Actualizar dimensiones para maderas si no están presentes
                alto: Number(productoDB.alto) || productoPresupuesto.alto || 0,
                ancho:
                  Number(productoDB.ancho) || productoPresupuesto.ancho || 0,
                largo:
                  Number(productoDB.largo) || productoPresupuesto.largo || 0,
                precioPorPie:
                  Number(productoDB.precioPorPie) ||
                  productoPresupuesto.precioPorPie ||
                  0,
              };
            }
            return productoPresupuesto;
          }
        );
      }

      console.log("presupuestoClonado:", presupuestoClonado);
      setPresupuestoEdit(presupuestoClonado);
    }
  }, [editando, presupuesto, clientes, productos]);

  // 5. Función para manejar pago en efectivo
  const handlePagoEnEfectivoChange = (checked) => {
    setPagoEnEfectivo(checked);
    
    // Si se activa el pago en efectivo, setear forma de pago a "efectivo"
    if (checked && presupuestoEdit) {
      setPresupuestoEdit({
        ...presupuestoEdit,
        formaPago: "efectivo"
      });
    }
  };

  // 6. Función para actualizar precios
  const handleActualizarPrecios = async () => {
    setLoadingPrecios(true);
    try {
      // Obtener productos actualizados desde Firebase
      const productosSnap = await getDocs(collection(db, "productos"));
      const productosActualizados = productosSnap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      // Actualizar precios de productos en presupuestoEdit
      const productosConPreciosActualizados = (
        presupuestoEdit.productos || []
      ).map((productoPresupuesto) => {
        const productoActualizado = productosActualizados.find(
          (p) => p.id === productoPresupuesto.id
        );
        if (productoActualizado) {
          let nuevoPrecio = 0;
          if (productoActualizado.categoria === "Maderas") {
            // Calcular precio para maderas
            const alto = Number(productoActualizado.alto) || 0;
            const ancho = Number(productoActualizado.ancho) || 0;
            const largo = Number(productoActualizado.largo) || 0;
            const precioPorPie = Number(productoActualizado.precioPorPie) || 0;

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
            ...productoPresupuesto,
            precio: nuevoPrecio,
            // Preservar campos específicos de categoría
            tipoMadera:
              productoActualizado.tipoMadera ||
              productoPresupuesto.tipoMadera ||
              "",
            subCategoria:
              productoActualizado.subCategoria ||
              productoPresupuesto.subCategoria ||
              "",
            // Actualizar dimensiones para maderas
            alto:
              Number(productoActualizado.alto) || productoPresupuesto.alto || 0,
            ancho:
              Number(productoActualizado.ancho) ||
              productoPresupuesto.ancho ||
              0,
            largo:
              Number(productoActualizado.largo) ||
              productoPresupuesto.largo ||
              0,
            precioPorPie:
              Number(productoActualizado.precioPorPie) ||
              productoPresupuesto.precioPorPie ||
              0,
          };
        }
        return productoPresupuesto;
      });

      setPresupuestoEdit((prev) => ({
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
  // Función helper para manejar valores numéricos
  const parseNumericValue = (value) => {
    if (value === "" || value === null || value === undefined) {
      return "";
    }
    const num = Number(value);
    return isNaN(num) ? "" : num;
  };

  const recalcularPreciosMadera = (productoId, aplicarCepillado) => {
    setPresupuestoEdit((prev) => ({
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
    const parsedPrecioPorPie = parseNumericValue(nuevoPrecioPorPie);

    setPresupuestoEdit((prev) => ({
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
              precioPorPie: parsedPrecioPorPie === "" ? 0 : parsedPrecioPorPie,
            });
          } else {
            // Para otras maderas: usar la fórmula estándar
            precioBase =
              0.2734 *
              p.alto *
              p.ancho *
              p.largo *
              (parsedPrecioPorPie === "" ? 0 : parsedPrecioPorPie);
          }

          // Aplicar cepillado si está habilitado para este producto específico
          const precioFinal = p.cepilladoAplicado
            ? precioBase * 1.066
            : precioBase;

          // Redondear a centenas (múltiplos de 100)
          const precioRedondeado = Math.round(precioFinal / 100) * 100;

          return {
            ...p,
            precioPorPie: parsedPrecioPorPie,
            precio: precioRedondeado,
          };
        }
        return p;
      }),
    }));
  };

  // Funciones para manejar cambios en machimbres/deck
  // Función para manejar cambios en alto para machimbre/deck
  const handleAltoChange = (id, nuevoAlto) => {
    const parsedAlto = parseNumericValue(nuevoAlto);

    setPresupuestoEdit((prev) => ({
      ...prev,
      productos: (prev.productos || []).map((p) => {
        if (
          p.id === id &&
          p.categoria === "Maderas" &&
          p.unidad === "M2"
        ) {
          const precioBase = calcularPrecioMachimbre({
            alto: parsedAlto === "" ? 0 : parsedAlto,
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
            alto: parsedAlto,
            precio: precioRedondeado,
          };
        }
        return p;
      }),
    }));
  };

  // Función para manejar cambios en ancho para machimbre/deck
  const handleAnchoChange = (id, nuevoAncho) => {
    const parsedAncho = parseNumericValue(nuevoAncho);

    setPresupuestoEdit((prev) => ({
      ...prev,
      productos: (prev.productos || []).map((p) => {
        if (
          p.id === id &&
          p.categoria === "Maderas" &&
          p.unidad === "M2"
        ) {
          const precioBase = calcularPrecioMachimbre({
            alto: p.alto,
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
            ancho: parsedAncho,
            precio: precioRedondeado,
          };
        }
        return p;
      }),
    }));
  };

  // Función para manejar cambios en largo para machimbre/deck
  const handleLargoChange = (id, nuevoLargo) => {
    const parsedLargo = parseNumericValue(nuevoLargo);

    setPresupuestoEdit((prev) => ({
      ...prev,
      productos: (prev.productos || []).map((p) => {
        if (
          p.id === id &&
          p.categoria === "Maderas" &&
          p.unidad === "M2"
        ) {
          const precioBase = calcularPrecioMachimbre({
            alto: p.alto,
            largo: parsedLargo === "" ? 0 : parsedLargo,
            cantidad: p.cantidad || 1,
            precioPorPie: p.precioPorPie,
          });

          const precioFinal = p.cepilladoAplicado
            ? precioBase * 1.066
            : precioBase;

          const precioRedondeado = Math.round(precioFinal / 100) * 100;

          return {
            ...p,
            largo: parsedLargo,
            precio: precioRedondeado,
          };
        }
        return p;
      }),
    }));
  };

  // Funciones para manejar cambios en dimensiones para maderas normales (no machimbres/deck)
  const handleAltoChangeMadera = (id, nuevoAlto) => {
    const parsedAlto = parseNumericValue(nuevoAlto);

    setPresupuestoEdit((prev) => ({
      ...prev,
      productos: (prev.productos || []).map((p) => {
        if (
          p.id === id &&
          p.categoria === "Maderas" &&
          p.unidad !== "M2"
        ) {
          const precioBase = calcularPrecioCorteMadera({
            alto: parsedAlto === "" ? 0 : parsedAlto,
            ancho: p.ancho,
            largo: p.largo,
            precioPorPie: p.precioPorPie,
          });

          const precioFinal = p.cepilladoAplicado
            ? precioBase * 1.066
            : precioBase;

          const precioRedondeado = Math.round(precioFinal / 100) * 100;

          return {
            ...p,
            alto: parsedAlto,
            precio: precioRedondeado,
          };
        }
        return p;
      }),
    }));
  };

  const handleAnchoChangeMadera = (id, nuevoAncho) => {
    const parsedAncho = parseNumericValue(nuevoAncho);

    setPresupuestoEdit((prev) => ({
      ...prev,
      productos: (prev.productos || []).map((p) => {
        if (
          p.id === id &&
          p.categoria === "Maderas" && p.unidad !== "M2"
        ) {
          const precioBase = calcularPrecioCorteMadera({
            alto: p.alto,
            ancho: parsedAncho === "" ? 0 : parsedAncho,
            largo: p.largo,
            precioPorPie: p.precioPorPie,
          });

          const precioFinal = p.cepilladoAplicado
            ? precioBase * 1.066
            : precioBase;

          const precioRedondeado = Math.round(precioFinal / 100) * 100;

          return {
            ...p,
            ancho: parsedAncho,
            precio: precioRedondeado,
          };
        }
        return p;
      }),
    }));
  };

  const handleLargoChangeMadera = (id, nuevoLargo) => {
    const parsedLargo = parseNumericValue(nuevoLargo);

    setPresupuestoEdit((prev) => ({
      ...prev,
      productos: (prev.productos || []).map((p) => {
        if (
          p.id === id &&
          p.categoria === "Maderas" && p.unidad !== "M2"
        ) {
          const precioBase = calcularPrecioCorteMadera({
            alto: p.alto,
            ancho: p.ancho,
            largo: parsedLargo === "" ? 0 : parsedLargo,
            precioPorPie: p.precioPorPie,
          });

          const precioFinal = p.cepilladoAplicado
            ? precioBase * 1.066
            : precioBase;

          const precioRedondeado = Math.round(precioFinal / 100) * 100;

          return {
            ...p,
            largo: parsedLargo,
            precio: precioRedondeado,
          };
        }
        return p;
      }),
    }));
  };

  const handlePrecioPorPieChangeMadera = (id, nuevoPrecioPorPie) => {
    const parsedPrecioPorPie = parseNumericValue(nuevoPrecioPorPie);

    setPresupuestoEdit((prev) => ({
      ...prev,
      productos: (prev.productos || []).map((p) => {
        if (
          p.id === id &&
          p.categoria === "Maderas" && p.unidad !== "M2"
        ) {
          const precioBase = calcularPrecioCorteMadera({
            alto: p.alto,
            ancho: p.ancho,
            largo: p.largo,
            precioPorPie: parsedPrecioPorPie === "" ? 0 : parsedPrecioPorPie,
          });

          const precioFinal = p.cepilladoAplicado
            ? precioBase * 1.066
            : precioBase;

          const precioRedondeado = Math.round(precioFinal / 100) * 100;

          return {
            ...p,
            precioPorPie: parsedPrecioPorPie,
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

  // Función para calcular precio de corte de madera
  function calcularPrecioCorteMadera({
    alto,
    ancho,
    largo,
    precioPorPie,
    factor = 0.2734,
  }) {
    if (!alto || !ancho || !largo || !precioPorPie) return 0;
    const precio = factor * alto * ancho * largo * precioPorPie;
    return Math.round(precio * 100) / 100;
  }

  // Centralizado en lib/pricing

  // Función para calcular precio de machimbre (precio por pie × alto × largo × cantidad)
  function calcularPrecioMachimbre({ alto, largo, cantidad, precioPorPie }) {
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
    return texto
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  }, []);

  // Productos filtrados (idéntico a ventas)
  const productosFiltrados = useMemo(() => {
    let fuente;
    const hayBusqueda = !!(busquedaDefer && busquedaDefer.trim() !== "");
    if (hayBusqueda) {
      if (categoriaId) {
        const localCat = productosPorCategoriaState[categoriaId] || [];
        fuente = localCat;
      } else {
        fuente = productosState;
      }
    } else if (categoriaId) {
      fuente = productosPorCategoriaState[categoriaId];
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
  }, [productosState, productosPorCategoriaState, categoriaId, busquedaDefer, filtroTipoMadera, filtroSubCategoria, normalizarTexto]);

  // Productos paginados optimizados
  const productosPaginados = useMemo(() => {
    const inicio = (paginaActual - 1) * productosPorPagina;
    const fin = inicio + productosPorPagina;
    return productosFiltrados.slice(inicio, fin);
  }, [productosFiltrados, paginaActual, productosPorPagina]);

  // Cálculo de totales optimizados
  const totalProductos = productosFiltrados.length;
  const totalPaginas = Math.ceil(totalProductos / productosPorPagina);

  // Función para cambiar página (transición no bloqueante)
  const cambiarPagina = useCallback(
    (nuevaPagina) => {
      if (nuevaPagina < 1 || nuevaPagina > totalPaginas) return;
      startTransition(() => {
        setPaginaActual(nuevaPagina);
      });
    },
    [totalPaginas, startTransition]
  );

  // Resetear página cuando cambian los filtros (usar valor deferred)
  useEffect(() => {
    setPaginaActual(1);
  }, [categoriaId, busquedaDefer, filtroTipoMadera, filtroSubCategoria]);

  // Función auxiliar para limpiar valores undefined de un objeto
  const removeUndefined = (obj) => {
    if (obj === null || typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) return obj.map(removeUndefined);
    return Object.fromEntries(
      Object.entries(obj)
        .filter(([_, v]) => v !== undefined)
        .map(([k, v]) => [k, removeUndefined(v)])
    );
  };

  // 6. Guardar cambios en Firestore
  const handleGuardarCambios = async () => {
    setErrorForm("");
    // Validaciones mejoradas de cliente
    if (
      !presupuestoEdit.cliente ||
      !presupuestoEdit.cliente.nombre ||
      presupuestoEdit.cliente.nombre.trim() === ""
    ) {
      setErrorForm("Selecciona un cliente válido.");
      return;
    }
    if (!presupuestoEdit.productos?.length && !presupuestoEdit.items?.length) {
      setErrorForm("Agrega al menos un producto.");
      return;
    }
    for (const p of presupuestoEdit.productos || presupuestoEdit.items) {
      if (!p.cantidad || p.cantidad <= 0) {
        setErrorForm("Todas las cantidades deben ser mayores a 0.");
        return;
      }
      if (p.descuento < 0 || p.descuento > 100) {
        setErrorForm("El descuento debe ser entre 0 y 100%.");
        return;
      }
    }
    try {
      // Recalcular totales
      const productosArr = presupuestoEdit.productos || presupuestoEdit.items;
      const { subtotal, descuentoTotal, total: totalCalc } = computeTotals(productosArr);
      const costoEnvioCalculado =
        presupuestoEdit.tipoEnvio &&
        presupuestoEdit.tipoEnvio !== "retiro_local" &&
        presupuestoEdit.costoEnvio !== undefined &&
        presupuestoEdit.costoEnvio !== "" &&
        !isNaN(Number(presupuestoEdit.costoEnvio))
          ? Number(presupuestoEdit.costoEnvio)
          : 0;
      const descuentoEfectivo = pagoEnEfectivo ? subtotal * 0.1 : 0;
      const total = totalCalc + costoEnvioCalculado - descuentoEfectivo; 
      let numeroPedido = presupuestoEdit.numeroPedido;
      if (!numeroPedido) {
        numeroPedido = await getNextPresupuestoNumber();
      }
      
      // Preparar datos para guardar
      const dataToSave = {
        ...presupuestoEdit,
        subtotal,
        descuentoTotal,
        descuentoEfectivo,
        pagoEnEfectivo,
        total,
        costoEnvio: costoEnvioCalculado,
        productos: productosArr,
        items: productosArr,
        numeroPedido,
        fechaActualizacion: new Date().toISOString(),
      };
      
      // Limpiar valores undefined antes de guardar
      const cleanData = removeUndefined(dataToSave);
      
      const docRef = doc(db, "presupuestos", presupuestoEdit.id);
      await updateDoc(docRef, cleanData);
      
      setPresupuesto({
        ...presupuestoEdit,
        subtotal,
        descuentoTotal,
        descuentoEfectivo,
        pagoEnEfectivo,
        total,
        costoEnvio: costoEnvioCalculado,
        productos: productosArr,
        items: productosArr,
        numeroPedido,
        fechaActualizacion: new Date().toISOString(),
      });
      setEditando(false);
      setErrorForm("");
    } catch (error) {
      console.error("Error al guardar cambios:", error);
      setErrorForm(`Error al guardar: ${error.message}`);
    }
  };

  // 7. Modal para convertir a venta
  const handleAbrirVenta = () => {
    setVentaForm({ ...presupuestoEdit });
    setOpenVenta(true);
  };
  const handleGuardarVenta = async (ventaData) => {
    // Validaciones y lógica similar a ventas/page.jsx
    // ...
    setOpenVenta(false);
    // Redirigir a la venta creada o mostrar mensaje de éxito
  };

  // Modal para nuevo cliente en presupuestos
  const handleNuevoClienteSubmit = async (e) => {
    e.preventDefault();
    try {
      const clienteObj = {
        ...nuevoCliente,
        esClienteViejo: nuevoCliente.esClienteViejo || false,
      };
      const docRef = await addDoc(collection(db, "clientes"), clienteObj);
      setClientes((prev) => [...prev, { id: docRef.id, ...clienteObj }]);
      setNuevoCliente({
        nombre: "",
        direccion: "",
        telefono: "",
        cuit: "",
        partido: "",
        barrio: "",
        area: "",
        lote: "",
        descripcion: "",
        esClienteViejo: false,
      });
      setOpenNuevoCliente(false);
    } catch (error) {
      console.error("Error al guardar nuevo cliente:", error);
      alert("Error al guardar cliente: " + error.message);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando presupuesto...</p>
          <p className="text-sm text-gray-500 mt-2">ID: {id}</p>
          <p className="text-sm text-gray-500">Lang: {lang}</p>
        </div>
      </div>
    );
  }

  if (error || !presupuesto) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center max-w-md">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">
            Presupuesto no encontrado
          </h2>
          <p className="text-gray-600 mb-4">
            {error ||
              "El presupuesto que buscas no existe o ha sido eliminado."}
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
            <Button onClick={() => router.back()}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver
            </Button>
            <Button
              variant="outline"
              onClick={() => router.push(`/${lang}/presupuestos`)}
            >
              Ver todos los presupuestos
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Función para formatear fecha
  const formatDate = (dateString) => {
    if (!dateString) return "-";
    try {
      // Mostrar en formato argentino y ajustar a la zona horaria de Buenos Aires
      const dateObj = new Date(dateString);
      return dateObj.toLocaleDateString("es-AR", {
        timeZone: "America/Argentina/Buenos_Aires",
      });
    } catch {
      return dateString;
    }
  };

  // Eliminar el cálculo de fecha de vencimiento automática

  // Función para imprimir
  const handlePrint = () => {
    window.print();
  };

  // Utilidades para asegurar arrays y números seguros
  function safeArray(val) {
    return Array.isArray(val) ? val : [];
  }
  function safeNumber(val) {
    const n = Number(val);
    return isNaN(n) ? 0 : n;
  }

  // Función para obtener información completa del producto desde la base de datos
  const getProductoCompleto = (productoId) => {
    return productos.find((p) => p.id === productoId);
  };

  return (
    <div className="min-h-screen py-8">
      <style>{`
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
      #presupuesto-print, #presupuesto-print * { visibility: visible !important; }
      #presupuesto-print .no-print, #presupuesto-print .no-print * { display: none !important; }
      #presupuesto-print {
        position: absolute !important;
        top: 0 !important;
        left: 0 !important;
        margin: 0 !important;
        padding: 0 !important;
        width: 100% !important;
        background: white !important;
      }
      /* Layout 2 columnas con espaciado sutil para legibilidad (igual a ventas) */
      #presupuesto-print .grid { 
        display: grid !important;
        grid-template-columns: 1fr 1fr !important;
        gap: 16px !important;
        margin-bottom: 12px !important;
      }
      /* Tarjetas sin sombras pero con separación mínima */
      #presupuesto-print .bg-card {
        background: #fff !important;
        padding: 8px !important;
        border-radius: 6px !important;
        box-shadow: none !important;
        border: 1px solid #e5e7eb !important;
      }
      /* Reducir tamaños de fuente para que quepa todo */
      #presupuesto-print h3 {
        font-size: 14px !important;
        margin-bottom: 8px !important;
      }
      #presupuesto-print .text-sm { font-size: 11px !important; }
      #presupuesto-print h3 { margin: 0 0 6px 0 !important; }
      #presupuesto-print .space-y-2 > div { margin-bottom: 3px !important; }
      /* Reducir espaciados utilitarios en impresión */
      #presupuesto-print .p-6, 
      #presupuesto-print .p-4 { padding: 8px !important; }
      #presupuesto-print .px-4 { padding-left: 8px !important; padding-right: 8px !important; }
      #presupuesto-print .py-4 { padding-top: 8px !important; padding-bottom: 8px !important; }
      #presupuesto-print .mb-6 { margin-bottom: 10px !important; }
      #presupuesto-print .mb-4 { margin-bottom: 8px !important; }
      #presupuesto-print .mt-6 { margin-top: 10px !important; }
      #presupuesto-print .mt-4 { margin-top: 8px !important; }
      /* Compactar tabla de productos */
      #presupuesto-print table th, 
      #presupuesto-print table td { padding-top: 6px !important; padding-bottom: 6px !important; }
      #presupuesto-print .border-b { border-bottom: 1px solid #e5e7eb !important; }

      /* Estilos específicos para impresión de empleados (compatibles con ventas) */
      body.print-empleado #presupuesto-print .precio-empleado,
      body.print-empleado #presupuesto-print .subtotal-empleado,
      body.print-empleado #presupuesto-print .total-empleado,
      body.print-empleado #presupuesto-print .descuento-empleado,
      body.print-empleado #presupuesto-print .costo-envio-empleado,
      body.print-empleado #presupuesto-print .monto-abonado-empleado,
      body.print-empleado #presupuesto-print .saldo-pendiente-empleado,
      body.print-empleado #presupuesto-print .estado-pago-empleado,
      body.print-empleado #presupuesto-print .forma-pago-empleado,
      body.print-empleado #presupuesto-print .historial-pagos-empleado {
        display: none !important;
      }

      /* Mostrar/ocultar mensaje empleados (si existiera) */
      body.print-empleado #presupuesto-print .mensaje-empleado {
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
      body:not(.print-empleado) #presupuesto-print .mensaje-empleado { display: none !important; }
    }
      `}</style>
      <div id="presupuesto-print" className="mx-auto px-4">
        {/* Logo y cabecera profesional para impresión */}
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
              Maderera Caballero
            </h1>
            <div className="text-gray-600 text-sm">
              Presupuesto / Cotización
            </div>
            <div className="text-gray-500 text-xs">
              www.caballeromaderera.com
            </div>
          </div>
          {/* Header profesional: solo mostrar número de pedido */}
          <div className="ml-auto text-right">
            <div className="text-xs text-gray-500">
              Fecha:{" "}
              {presupuesto?.fecha ? formatFechaLocal(presupuesto.fecha) : "-"}
            </div>
            <div className="text-xs text-gray-500">
              Válido hasta:{" "}
              {presupuesto?.fecha
                ? formatFechaLocal(calcularFechaVencimiento(presupuesto.fecha))
                : "-"}
            </div>
            <div className="text-xs text-gray-500">
              N°: {presupuesto?.numeroPedido || presupuesto?.id?.slice(-8)}
            </div>
          </div>
        </div>
        {/* Header */}
        <div className="bg-card rounded-lg shadow-sm p-6 mb-6 no-print">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
            <div className="flex-1">
              <h1 className="text-2xl lg:text-3xl font-bold">
                N°: {presupuesto?.numeroPedido || presupuesto?.id?.slice(-8)}
              </h1>
              {/* Mostrar observaciones si existen */}
              {presupuesto.observaciones && (
                <p className="text-gray-600 mt-1 whitespace-pre-line">
                  {presupuesto.observaciones}
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
              {!editando && !convirtiendoVenta && (
                <Button
                  onClick={() => {
                    console.log("=== DEBUG ACTIVAR EDICIÓN PRESUPUESTO ===");
                    console.log("editando antes:", editando);
                    setEditando(true);
                    console.log("editando después: true");
                  }}
                  className="no-print flex-1 lg:flex-none text-sm lg:text-base"
                >
                  <span className="hidden sm:inline">Editar</span>
                  <span className="sm:hidden">✏️</span>
                </Button>
              )}
              {!editando && !convirtiendoVenta && (
                <Button
                  onClick={() => setConvirtiendoVenta(true)}
                  className="no-print flex-1 lg:flex-none text-sm lg:text-base"
                >
                  <span className="hidden sm:inline">Convertir a Venta</span>
                  <span className="sm:hidden">💰</span>
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* 1. Información del cliente y venta */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
          <div className="bg-card rounded-lg shadow-sm p-6 flex flex-col gap-4">
            <h3 className="font-semibold text-lg mb-3 ">
              Información del Cliente
            </h3>
            {/* Información del cliente: solo datos relevantes, sin repeticiones */}
            <div className="space-y-2 text-sm">
              <div>
                <span className="font-medium">Nombre:</span>{" "}
                {presupuesto.cliente?.nombre || "-"}
              </div>
              <div>
                <span className="font-medium">CUIT / DNI:</span>{" "}
                {presupuesto.cliente?.cuit || "-"}
              </div>
              <div>
                <span className="font-medium">Dirección:</span>{" "}
                {presupuesto.cliente?.direccion || "-"}
              </div>
              <div>
                <span className="font-medium">Teléfono:</span>{" "}
                {presupuesto.cliente?.telefono || "-"}
              </div>
              {presupuesto.cliente?.partido && (
                <div>
                  <span className="font-medium">Partido:</span>{" "}
                  {presupuesto.cliente.partido}
                </div>
              )}
              {presupuesto.cliente?.barrio && (
                <div>
                  <span className="font-medium">Barrio:</span>{" "}
                  {presupuesto.cliente.barrio}
                </div>
              )}
              {presupuesto.cliente?.area && (
                <div>
                  <span className="font-medium">Área:</span>{" "}
                  {presupuesto.cliente.area}
                </div>
              )}
              {presupuesto.cliente?.lote && (
                <div>
                  <span className="font-medium">Lote:</span>{" "}
                  {presupuesto.cliente.lote}
                </div>
              )}
              {presupuesto.cliente?.descripcion && (
                <div>
                  <span className="font-medium">Descripción:</span>{" "}
                  {presupuesto.cliente.descripcion}
                </div>
              )}
              <div>
                <span className="font-medium">Email:</span>{" "}
                {presupuesto.cliente?.email || "-"}
              </div>
            </div>
          </div>

          <div className="bg-card rounded-lg shadow-sm p-6 flex flex-col gap-4">
            <h3 className="font-semibold text-lg mb-3 ">
              Información del Presupuesto
            </h3>
            <div className="space-y-2 text-sm">
              <div>
                <span className="font-medium">Fecha de emisión:</span>{" "}
                {presupuesto.fecha ? formatFechaLocal(presupuesto.fecha) : "-"}
              </div>
              <div>
                <span className="font-medium">Fecha de vencimiento:</span>{" "}
                {presupuesto.fecha
                  ? formatFechaLocal(
                      calcularFechaVencimiento(presupuesto.fecha)
                    )
                  : "-"}
              </div>
              <div>
                <span className="font-medium">Tipo:</span>{" "}
                {presupuesto.tipo || "Presupuesto"}
              </div>
              {presupuesto.costoEnvio !== undefined &&
                presupuesto.costoEnvio !== "" && (
                  <div>
                    <span className="font-medium">
                      Costo estimado de envío:
                    </span>{" "}
                    $
                    {Number(presupuesto.costoEnvio).toLocaleString("es-AR", {
                      minimumFractionDigits: 2,
                    })}
                  </div>
                )}
              <div>
                <span className="font-medium">Estado:</span>{" "}
                <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                  Activo
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Productos */}
        {editando && presupuestoEdit ? (
          <div className="bg-card rounded-lg shadow-sm p-6 mb-6">
            <h3 className="font-semibold text-lg mb-4 ">Editar Presupuesto</h3>

            {/* Mensaje de error */}
            {errorForm && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-800 text-sm font-medium">{errorForm}</p>
              </div>
            )}

            {/* Información editable */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tipo de envío
                  </label>
                  <select
                    value={presupuestoEdit.tipoEnvio || ""}
                    onChange={(e) =>
                      setPresupuestoEdit({
                        ...presupuestoEdit,
                        tipoEnvio: e.target.value,
                        // Si se selecciona retiro local, limpiar costo de envío
                        costoEnvio:
                          e.target.value === "retiro_local"
                            ? ""
                            : presupuestoEdit.costoEnvio,
                      })
                    }
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  >
                    <option value="">Seleccionar tipo de envío...</option>
                    <option value="retiro_local">Retiro en local</option>
                    <option value="envio_domicilio">Envío a domicilio</option>
                  </select>
                </div>
                {presupuestoEdit.tipoEnvio &&
                  presupuestoEdit.tipoEnvio !== "retiro_local" && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Costo de envío
                      </label>
                      <Input
                        type="number"
                        value={presupuestoEdit.costoEnvio || ""}
                        onChange={(e) =>
                          setPresupuestoEdit({
                            ...presupuestoEdit,
                            costoEnvio: e.target.value,
                          })
                        }
                        placeholder="Costo de envío"
                        className="w-full"
                      />
                    </div>
                  )}
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Observaciones
                  </label>
                  <Textarea
                    value={presupuestoEdit.observaciones || ""}
                    onChange={(e) =>
                      setPresupuestoEdit({
                        ...presupuestoEdit,
                        observaciones: e.target.value,
                      })
                    }
                    placeholder="Observaciones adicionales"
                    className="w-full"
                    rows={3}
                  />
                </div>
              </div>
            </div>

            {/* Selector de productos */}
            {editando && presupuestoEdit && (
              <div className="bg-card rounded-lg shadow-sm p-6 mb-6">
                <h3 className="font-semibold text-lg mb-4 ">
                  Editar productos del presupuesto
                </h3>
                <section className="bg-card rounded-xl border border-default-200 shadow-sm overflow-hidden">
                  {/* Header con estadísticas */}
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4 border-b border-gray-200">
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
                          <p className="text-sm text-gray-600">
                            Selecciona los productos para tu presupuesto
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-blue-600">
                          {(presupuestoEdit.productos || []).length}
                        </div>
                        <div className="text-xs text-gray-500">
                          productos agregados
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium text-gray-600 dark:text-gray-400">
                          {productosFiltrados.length} / {productosPorCategoriaState[categoriaId]?.length || 0}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          productos filtrados
                        </div>
                      </div>
                    </div>
                    {/* Filtros mejorados */}
                    <div className="flex flex-col gap-3">
                      {/* Filtro de categorías */}
                      <div className="flex-1">
                      <div className="flex bg-white dark:bg-gray-800 rounded-lg p-1 shadow-sm border border-gray-200 dark:border-gray-600">
                          {categoriasState.map((categoria) => (
                            <button
                              key={categoria}
                              type="button"
                              className={`rounded-full px-4 py-1 text-sm flex items-center gap-2 transition-all ${
                                categoriaId === categoria
                                  ? "bg-blue-600 text-white"
                                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                              }`}
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                console.log("=== DEBUG CLICK CATEGORÍA ===");
                                console.log("categoriaId actual:", categoriaId);
                                console.log("categoria clickeada:", categoria);
                                if (categoriaId === categoria) {
                                  console.log("Desactivando categoría");
                                  setCategoriaId("");
                                  setFiltroTipoMadera("");
                                  setFiltroSubCategoria("");
                                } else {
                                  console.log(
                                    "Activando categoría:",
                                    categoria
                                  );
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
                        {categoriaId === "Maderas" &&
                          tiposMadera.length > 0 && (
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
                        {categoriaId === "Ferretería" &&
                          subCategoriasFerreteria.length > 0 && (
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
                            onChange={(e) =>
                              setBusquedaProducto(e.target.value)
                            }
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

                  {/* Lista de productos mejorada con paginación optimizada */}
                  <div className="max-h-150 overflow-y-auto">
                    {(() => {
                      if (categoriasState.length === 0) {
                        return (
                          <div className="p-8 text-center">
                            <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
                              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"/></svg>
                            </div>
                            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No hay categorías disponibles</h3>
                            <p className="text-gray-500 dark:text-gray-400">Agrega productos a las categorías para comenzar</p>
                          </div>
                        );
                      } else if (!categoriaId && (!busquedaDefer || busquedaDefer.trim() === "")) {
                        return (
                          <div className="p-8 text-center">
                            <div className="w-16 h-16 mx-auto mb-4 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                              <svg className="w-8 h-8 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                            </div>
                            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">Selecciona una categoría</h3>
                            <p className="text-gray-500 dark:text-gray-400">Elige una categoría para ver los productos disponibles</p>
                          </div>
                        );
                      }

                      if (productosFiltrados.length === 0) {
                        return (
                          <div className="p-8 text-center">
                            <div className="w-16 h-16 mx-auto mb-4 bg-yellow-100 rounded-full flex items-center justify-center">
                              <svg
                                className="w-8 h-8 text-yellow-600"
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
                            <h3 className="text-lg font-medium  mb-2">
                              No se encontraron productos
                            </h3>
                            <p className="text-gray-500">
                              Intenta cambiar los filtros o la búsqueda
                            </p>
                          </div>
                        );
                      }

                      return (
                        <>
                          {/* Grid de productos paginados (igual a ventas) */}
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
                              const yaAgregado = (
                                presupuestoEdit.productos || []
                              ).some((p) => p.id === prod.id);
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
                                            {prod.categoria === "Maderas"
                                              ? "🌲"
                                              : "🔧"}
                                          </div>
                                          <div className="flex-1 min-w-0">
                                            <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                                              {prod.nombre}
                                            </h4>
                                            {/* Información específica por categoría */}
                                            {prod.categoria === "Maderas" &&
                                              prod.tipoMadera && (
                                                <div className="flex items-center gap-1 mt-1">
                                                  <span className="text-xs text-orange-600 dark:text-orange-400 font-medium">
                                                    🌲 {prod.tipoMadera}
                                                  </span>
                                                </div>
                                              )}
                                            {prod.categoria === "Ferretería" &&
                                              prod.subCategoria && (
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
                                        <div className="flex-1 space-y-2">
                                          {/* Precio */}
                                          <div className="flex items-center justify-between">
                                            <span className="text-xs text-gray-500 dark:text-gray-400">
                                              Precio:
                                            </span>
                                            <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                                              ${formatearNumeroArgentino(precio)}
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
                                                {prod.stock} unidades
                                              </span>
                                            </div>
                                          )}
                                        </div>

                                        {/* Sin bloque de dimensiones ni alertas de stock en tarjetas del catálogo */}
                                      </div>
                                    </div>

                                    <div className="mt-auto">
                                      <button
                                        type="button"
                                        onClick={() => {
                                            // Calcular precio inicial según el tipo de producto
                                            let precioCalculado = 0;
                                            const alto = Number(prod.alto) || 0;
                                            const ancho =
                                              Number(prod.ancho) || 0;
                                            const largo =
                                              Number(prod.largo) || 0;
                                            const precioPorPie =
                                              Number(prod.precioPorPie) || 0;
                                            if (prod.categoria === "Maderas") {
                                              if (prod.unidadMedida === "M2") {
                                                precioCalculado = calcularPrecioMachimbre({
                                                    alto: alto,
                                                    largo: largo,
                                                    cantidad: 1,
                                                    precioPorPie: precioPorPie,
                                                  });
                                              } else if (prod.unidadMedida === "Unidad") {
                                                // Madera por unidad: usar precioPorPie como precio unitario directo
                                                const precioUnidad = Math.round((precioPorPie || 0) / 100) * 100;
                                                precioCalculado = precioUnidad;
                                              } else {
                                                precioCalculado = calcularPrecioCorteMadera({
                                                    alto: alto,
                                                    ancho: ancho,
                                                    largo: largo,
                                                    precioPorPie: precioPorPie,
                                                  });
                                              }
                                            } else if (
                                              prod.categoria === "Ferretería"
                                            ) {
                                              precioCalculado =
                                                prod.valorVenta || 0;
                                            } else {
                                              precioCalculado =
                                                prod.precioUnidad ||
                                                prod.precioUnidadVenta ||
                                                prod.precioUnidadHerraje ||
                                                prod.precioUnidadQuimico ||
                                                prod.precioUnidadHerramienta ||
                                                0;
                                            }

                                          setPresupuestoEdit((prev) => ({
                                            ...prev,
                                            productos: [
                                              ...(prev.productos || []),
                                              {
                                                id: prod.id,
                                                nombre: prod.nombre,
                                                precio: precioCalculado,
                                                unidad:
                                                  prod.unidadMedida ||
                                                  prod.unidadVenta ||
                                                  prod.unidadVentaHerraje ||
                                                  prod.unidadVentaQuimico ||
                                                  prod.unidadVentaHerramienta,
                                                stock: prod.stock,
                                                cantidad: 1,
                                                descuento: 0,
                                                categoria: prod.categoria,
                                                alto: alto,
                                                ancho: ancho,
                                                largo: largo,
                                                precioPorPie: precioPorPie,
                                                cepilladoAplicado: false,
                                                tipoMadera:
                                                  prod.tipoMadera || "",
                                                subcategoria: prod.subcategoria || prod.subCategoria || "",
                                              },
                                            ],
                                          }));
                                        }}
                                        disabled={yaAgregado}
                                        className={`w-full py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                                          yaAgregado
                                            ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 cursor-not-allowed"
                                            : "bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
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

                          {/* Controles de paginación */}
                          {totalPaginas > 1 && (
                            <div className="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
                              {/* Controles de navegación */}
                              <div className="flex items-center gap-2">
                                {/* Botón primera página */}
                                <button
                                  onClick={() => cambiarPagina(1)}
                                  disabled={paginaActual === 1 || isPending}
                                  className="p-2 rounded-md text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                  title="Primera página"
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
                                      d="M11 19l-7-7 7-7m8 14l-7-7 7-7"
                                    />
                                  </svg>
                                </button>

                                {/* Botón página anterior */}
                                <button
                                  onClick={() =>
                                    cambiarPagina(paginaActual - 1)
                                  }
                                  disabled={paginaActual === 1 || isPending}
                                  className="p-2 rounded-md text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                  title="Página anterior"
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
                                      d="M15 19l-7-7 7-7"
                                    />
                                  </svg>
                                </button>

                                {/* Números de página */}
                                <div className="flex items-center gap-1">
                                  {Array.from(
                                    { length: Math.min(5, totalPaginas) },
                                    (_, i) => {
                                      let pageNum;
                                      if (totalPaginas <= 5) {
                                        pageNum = i + 1;
                                      } else if (paginaActual <= 3) {
                                        pageNum = i + 1;
                                      } else if (
                                        paginaActual >=
                                        totalPaginas - 2
                                      ) {
                                        pageNum = totalPaginas - 4 + i;
                                      } else {
                                        pageNum = paginaActual - 2 + i;
                                      }

                                      return (
                                        <button
                                          key={pageNum}
                                          onClick={() => cambiarPagina(pageNum)}
                                          disabled={isPending}
                                          className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                                            paginaActual === pageNum
                                              ? "bg-blue-600 text-white"
                                              : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200"
                                          } disabled:opacity-50 disabled:cursor-not-allowed`}
                                        >
                                          {pageNum}
                                        </button>
                                      );
                                    }
                                  )}
                                </div>

                                {/* Botón página siguiente */}
                                <button
                                  onClick={() =>
                                    cambiarPagina(paginaActual + 1)
                                  }
                                  disabled={paginaActual === totalPaginas || isPending}
                                  className="p-2 rounded-md text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                  title="Página siguiente"
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
                                      d="M9 5l7 7-7 7"
                                    />
                                  </svg>
                                </button>

                                {/* Botón última página */}
                                <button
                                  onClick={() => cambiarPagina(totalPaginas)}
                                  disabled={paginaActual === totalPaginas || isPending}
                                  className="p-2 rounded-md text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                  title="Última página"
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
                                      d="M13 5l7 7-7 7M5 5l7 7-7 7"
                                    />
                                  </svg>
                                </button>
                              </div>

                              {/* Información de página */}
                              <div className="text-sm text-gray-700 dark:text-gray-300 flex items-center gap-2">
                                {isPending && (
                                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600"></div>
                                )}
                                <span>
                                  Mostrando {paginaActual}-
                                  {Math.min(
                                    paginaActual + productosPorPagina - 1,
                                    totalProductos
                                  )}{" "}
                                  de {totalProductos} productos
                                </span>
                              </div>
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </div>
                </section>

                {/* Tabla de productos seleccionados en modo edición */}
                {(presupuestoEdit.productos || []).length > 0 && (
                  <section className="bg-card/60 rounded-xl p-0 border border-default-200 shadow-lg overflow-hidden ring-1 ring-default-200/60 mt-4">
                    <div className="flex items-center justify-between px-4 py-3 border-b bg-gradient-to-r from-default-50 to-default-100">
                      <h3 className="text-base md:text-lg font-semibold text-default-900">
                        Productos Seleccionados
                      </h3>
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            id="pagoEnEfectivoPresupuesto"
                            checked={pagoEnEfectivo}
                            onChange={(e) => handlePagoEnEfectivoChange(e.target.checked)}
                            className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                            disabled={loadingPrecios}
                          />
                          <label htmlFor="pagoEnEfectivoPresupuesto" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            Pago en efectivo (-10%)
                          </label>
                        </div>
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-default-200/60 text-default-700 border border-default-300">
                        {(presupuestoEdit.productos || []).length} producto
                        {(presupuestoEdit.productos || []).length !== 1
                          ? "s"
                          : ""}
                      </span>
                      </div>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-[15px]">
                        <thead className="sticky top-0 z-10 bg-default-50/80 backdrop-blur supports-[backdrop-filter]:bg-default-50/60">
                          <tr className="border-b border-default-200">
                            <th className="h-12 px-4 text-left align-middle text-xs font-semibold uppercase tracking-wide text-default-600">
                              Categoría
                            </th>
                            <th className="h-12 px-4 text-left align-middle text-xs font-semibold uppercase tracking-wide text-default-600">
                              Producto
                            </th>
                            <th className="h-12 px-4 text-center align-middle text-xs font-semibold uppercase tracking-wide text-default-600">
                              Cant.
                            </th>
                            <th className="h-12 px-4 text-center align-middle text-xs font-semibold uppercase tracking-wide text-default-600">
                              Cepillado
                            </th>
                            <th className="h-12 px-4 text-right align-middle text-xs font-semibold uppercase tracking-wide text-default-600">
                              Precio unit.
                            </th>
                            <th className="h-12 px-4 text-center align-middle text-xs font-semibold uppercase tracking-wide text-default-600">
                              Desc.
                            </th>
                            <th className="h-12 px-4 text-right align-middle text-xs font-semibold uppercase tracking-wide text-default-600">
                              Precio en efectivo
                            </th>
                            <th className="h-12 px-4 text-right align-middle text-xs font-semibold uppercase tracking-wide text-default-600">
                              Subtotal
                            </th>
                            <th className="h-12 px-4 text-center align-middle text-xs font-semibold uppercase tracking-wide text-default-600">
                              Acción
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-default-200">
                          {(presupuestoEdit.productos || []).map((p) => (
                            <tr
                              key={p.id}
                              className="border-b border-default-300 transition-colors"
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
                                  {p.nombre}
                                </div>
                                {/* Se eliminó la visualización de tipo de madera y subcategoría debajo del nombre */}
                                {p.categoria === "Maderas" && p.unidad !== "Unidad" && (
                                  <div className="mt-2 flex flex-wrap items-start gap-3">
                                    {p.unidad === "M2" ? (
                                      <>
                                        <div className="inline-block w-fit rounded-md border border-orange-200/60 bg-orange-50/60 p-1.5 align-top">
                                          <div className="flex items-center gap-1.5 mb-1">
                                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-700 text-sm font-semibold">
                                              Dimensiones
                                            </span>
                                            <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-orange-100 text-orange-700 text-sm font-semibold">
                                              Total{" "}
                                              {(
                                                (p.alto || 0) *
                                                (p.largo || 0) *
                                                (p.cantidad || 1)
                                              ).toFixed(2)}{" "}
                                              m²
                                            </span>
                                          </div>
                                          <div className="flex items-end gap-2">
                                            <div className="flex flex-col gap-0.5">
                                              <label className="text-[11px] font-semibold text-orange-700">
                                                Alto
                                              </label>
                                              <input
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                value={
                                                  p.alto === ""
                                                    ? ""
                                                    : p.alto || ""
                                                }
                                                onChange={(e) =>
                                                  handleAltoChange(
                                                    p.id,
                                                    e.target.value
                                                  )
                                                }
                                                className="h-8 w-[68px] rounded-sm border border-orange-300 bg-white text-sm px-1.5 focus:border-orange-500 focus:ring-1 focus:ring-orange-200"
                                                disabled={loadingPrecios}
                                              />
                                            </div>
                                            <div className="flex flex-col gap-0.5">
                                              <label className="text-[11px] font-semibold text-orange-700">
                                                Largo
                                              </label>
                                              <input
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                value={
                                                  p.largo === ""
                                                    ? ""
                                                    : p.largo || ""
                                                }
                                                onChange={(e) =>
                                                  handleLargoChange(
                                                    p.id,
                                                    e.target.value
                                                  )
                                                }
                                                className="h-8 w-[68px] rounded-sm border border-orange-300 bg-white text-sm px-1.5 focus:border-orange-500 focus:ring-1 focus:ring-orange-200"
                                                disabled={loadingPrecios}
                                              />
                                            </div>
                                            <div className="inline-block w-fit">
                                              <label className="block text-[11px] font-semibold text-orange-700 mb-0.5">
                                                $/m²
                                              </label>
                                              <div className="relative">
                                                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-sm text-orange-700 font-medium">
                                                  $
                                                </span>
                                                <input
                                                  type="number"
                                                  min="0"
                                                  step="0.01"
                                                  value={
                                                    p.precioPorPie === ""
                                                      ? ""
                                                      : p.precioPorPie || ""
                                                  }
                                                  onChange={(e) =>
                                                    handlePrecioPorPieChange(
                                                      p.id,
                                                      e.target.value
                                                    )
                                                  }
                                                  className="h-8 w-[88px] pl-5 pr-2 text-sm border border-orange-300 rounded-md bg-white focus:border-orange-500 focus:ring-1 focus:ring-orange-200 focus:outline-none"
                                                  disabled={loadingPrecios}
                                                  placeholder="0.00"
                                                />
                                              </div>
                                            </div>
                                          </div>
                                        </div>
                                      </>
                                    ) : (
                                      <>
                                        <div className="inline-block w-fit rounded-md border border-blue-200/60 bg-blue-50/60 p-1.5 align-top">
                                          <div className="flex items-center gap-1.5 mb-1">
                                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 text-sm font-semibold">
                                              Dimensiones
                                            </span>
                                            <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 text-sm font-semibold">
                                              Volumen{" "}
                                              {(
                                                (p.alto || 0) *
                                                (p.ancho || 0) *
                                                (p.largo || 0)
                                              ).toFixed(2)}{" "}
                                              cm³
                                            </span>
                                          </div>
                                          <div className="flex items-end gap-2">
                                            <div className="flex flex-col gap-0.5">
                                              <label className="text-[11px] font-semibold text-blue-700">
                                                Alto
                                              </label>
                                              <input
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                value={
                                                  p.alto === ""
                                                    ? ""
                                                    : p.alto || ""
                                                }
                                                onChange={(e) =>
                                                  handleAltoChangeMadera(
                                                    p.id,
                                                    e.target.value
                                                  )
                                                }
                                                className="h-8 w-[68px] rounded-sm border border-blue-300 bg-white text-sm px-1.5 focus:border-blue-500 focus:ring-1 focus:ring-blue-200"
                                                disabled={loadingPrecios}
                                              />
                                            </div>
                                            <div className="flex flex-col gap-0.5">
                                              <label className="text-[11px] font-semibold text-blue-700">
                                                Ancho
                                              </label>
                                              <input
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                value={
                                                  p.ancho === ""
                                                    ? ""
                                                    : p.ancho || ""
                                                }
                                                onChange={(e) =>
                                                  handleAnchoChangeMadera(
                                                    p.id,
                                                    e.target.value
                                                  )
                                                }
                                                className="h-8 w-[68px] rounded-sm border border-blue-300 bg-white text-sm px-1.5 focus:border-blue-500 focus:ring-1 focus:ring-blue-200"
                                                disabled={loadingPrecios}
                                              />
                                            </div>
                                            <div className="flex flex-col gap-0.5">
                                              <label className="text-[11px] font-semibold text-blue-700">
                                                Largo
                                              </label>
                                              <input
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                value={
                                                  p.largo === ""
                                                    ? ""
                                                    : p.largo || ""
                                                }
                                                onChange={(e) =>
                                                  handleLargoChangeMadera(
                                                    p.id,
                                                    e.target.value
                                                  )
                                                }
                                                className="h-8 w-[68px] rounded-sm border border-blue-300 bg-white text-sm px-1.5 focus:border-blue-500 focus:ring-1 focus:ring-blue-200"
                                                disabled={loadingPrecios}
                                              />
                                            </div>
                                            <div className="inline-block w-fit">
                                              <label className="block text-[11px] font-semibold text-blue-700 mb-0.5">
                                                $/pie
                                              </label>
                                              <div className="relative">
                                                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-sm text-blue-700 font-medium">
                                                  $
                                                </span>
                                                <input
                                                  type="number"
                                                  min="0"
                                                  step="0.01"
                                                  value={
                                                    p.precioPorPie === ""
                                                      ? ""
                                                      : p.precioPorPie || ""
                                                  }
                                                  onChange={(e) =>
                                                    handlePrecioPorPieChangeMadera(
                                                      p.id,
                                                      e.target.value
                                                    )
                                                  }
                                                  className="h-8 w-[88px] pl-5 pr-2 text-sm border border-blue-300 rounded-md bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-200 focus:outline-none"
                                                  disabled={loadingPrecios}
                                                  placeholder="0.00"
                                                />
                                              </div>
                                            </div>
                                          </div>
                                        </div>
                                      </>
                                    )}
                                  </div>
                                )}
                              </td>
                              <td className="p-4 align-middle text-sm text-default-600">
                                <div className="flex items-center justify-center">
                                  <div className="flex items-center bg-white dark:bg-gray-800 border border-default-300 dark:border-gray-700 rounded-lg overflow-hidden shadow-sm">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setPresupuestoEdit((prev) => ({
                                          ...prev,
                                          productos: prev.productos.map(
                                            (prod) => {
                                              if (prod.id !== p.id) return prod;
                                              const nuevaCantidad = Math.max(1, prod.cantidad - 1);
                                              if (
                                                prod.categoria === "Maderas" &&
                                                (prod.unidad === "M2")
                                              ) {
                                                const precioBase = calcularPrecioMachimbre({
                                                  alto: prod.alto,
                                                  largo: prod.largo,
                                                  cantidad: nuevaCantidad,
                                                  precioPorPie: prod.precioPorPie,
                                                });
                                                const precioFinal = prod.cepilladoAplicado ? precioBase * 1.066 : precioBase;
                                                const precioRedondeado = Math.round(precioFinal / 100) * 100;
                                                return { ...prod, cantidad: nuevaCantidad, precio: precioRedondeado };
                                              }
                                              return { ...prod, cantidad: nuevaCantidad };
                                            }
                                          ),
                                        }))
                                      }
                                      disabled={
                                        loadingPrecios || p.cantidad <= 1
                                      }
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
                                    <input
                                      type="number"
                                      min={1}
                                      value={p.cantidad}
                                      onChange={(e) => {
                                        const parsedCantidad = parseNumericValue(e.target.value);
                                        setPresupuestoEdit((prev) => ({
                                          ...prev,
                                          productos: prev.productos.map((prod) => {
                                            if (prod.id !== p.id) return prod;
                                            const nuevaCantidad = parsedCantidad === "" ? 1 : parsedCantidad;
                                            if (
                                              prod.categoria === "Maderas" &&
                                              (prod.unidad === "M2")
                                            ) {
                                              const precioBase = calcularPrecioMachimbre({
                                                alto: prod.alto,
                                                largo: prod.largo,
                                                cantidad: nuevaCantidad,
                                                precioPorPie: prod.precioPorPie,
                                              });
                                              const precioFinal = prod.cepilladoAplicado ? precioBase * 1.066 : precioBase;
                                              const precioRedondeado = Math.round(precioFinal / 100) * 100;
                                              return { ...prod, cantidad: nuevaCantidad, precio: precioRedondeado };
                                            }
                                            return { ...prod, cantidad: nuevaCantidad };
                                          }),
                                        }));
                                      }}
                                      className="w-16 text-center text-base md:text-lg font-bold border-0 bg-transparent focus:ring-0 focus:outline-none text-gray-900 dark:text-gray-100 tabular-nums"
                                      disabled={loadingPrecios}
                                    />
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setPresupuestoEdit((prev) => ({
                                          ...prev,
                                          productos: prev.productos.map((prod) => {
                                            if (prod.id !== p.id) return prod;
                                            const nuevaCantidad = Number(prod.cantidad) + 1;
                                            if (
                                              prod.categoria === "Maderas" &&
                                              (prod.unidad === "M2")
                                            ) {
                                              const precioBase = calcularPrecioMachimbre({
                                                alto: prod.alto,
                                                largo: prod.largo,
                                                cantidad: nuevaCantidad,
                                                precioPorPie: prod.precioPorPie,
                                              });
                                              const precioFinal = prod.cepilladoAplicado ? precioBase * 1.066 : precioBase;
                                              const precioRedondeado = Math.round(precioFinal / 100) * 100;
                                              return { ...prod, cantidad: nuevaCantidad, precio: precioRedondeado };
                                            }
                                            return { ...prod, cantidad: nuevaCantidad };
                                          }),
                                        }))
                                      }
                                      disabled={loadingPrecios}
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
                                  </div>
                                </div>
                              </td>
                              <td className="p-4 align-middle text-sm text-default-600">
                                {p.categoria === "Maderas" ? (
                                  <div className="flex items-center justify-center">
                                    <input
                                      type="checkbox"
                                      checked={p.cepilladoAplicado || false}
                                      onChange={(e) =>
                                        recalcularPreciosMadera(
                                          p.id,
                                          e.target.checked
                                        )
                                      }
                                      className="w-4 h-4 text-blue-600 bg-white border-default-300 rounded focus:ring-blue-500 focus:ring-2"
                                      disabled={loadingPrecios}
                                    />
                                  </div>
                                ) : (
                                  <span className="text-gray-400">-</span>
                                )}
                              </td>
                              <td className="p-4 align-middle text-right text-sm text-default-900 font-semibold tabular-nums">
                                ${formatearNumeroArgentino(
                                  presupuesto?.pagoEnEfectivo 
                                    ? Number(p.precio) * 0.9
                                    : p.precio
                                )}
                              </td>
                              <td className="p-4 align-middle text-sm text-default-600">
                                <div className="relative w-20 md:w-24 mx-auto">
                                  <input
                                    type="number"
                                    min={0}
                                    max={100}
                                    value={
                                      p.descuento === ""
                                        ? ""
                                        : p.descuento || ""
                                    }
                                    onChange={(e) => {
                                      const parsed = parseNumericValue(
                                        e.target.value
                                      );
                                      setPresupuestoEdit((prev) => ({
                                        ...prev,
                                        productos: prev.productos.map((prod) =>
                                          prod.id === p.id
                                            ? {
                                                ...prod,
                                                descuento:
                                                  parsed === "" ? 0 : parsed,
                                              }
                                            : prod
                                        ),
                                      }));
                                    }}
                                    className="w-full text-center border border-default-300 rounded-md px-2 py-1 pr-6 bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-200"
                                    disabled={loadingPrecios}
                                  />
                                  <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs text-default-500">
                                    %
                                  </span>
                                </div>
                              </td>
                              <td className="p-4 align-middle text-right text-sm text-default-900 font-bold tabular-nums">
                                $
                                {formatearNumeroArgentino(
                                  (() => {
                                    // Para productos de categoría "Eventual", calcular directamente precio × cantidad × (1 - descuento)
                                    let precioBase;
                                    if (p.categoria === "Eventual") {
                                      precioBase = Number(p.precio) * Number(p.cantidad);
                                    } else {
                                      // Para otros productos, usar la función computeLineBase
                                      precioBase = computeLineBase(p);
                                    }
                                    
                                    // Aplicar descuento individual del producto
                                    const precioConDescuento = precioBase * (1 - Number(p.descuento || 0) / 100);
                                    
                                    // Siempre aplicar descuento por pago en efectivo (10%)
                                    return precioConDescuento * 0.9;
                                  })()
                                )}
                              </td>
                              <td className="p-4 align-middle text-right text-sm text-default-900 font-bold tabular-nums">
                                $
                                {formatearNumeroArgentino(
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
                                    return presupuesto?.pagoEnEfectivo 
                                      ? Math.round(subtotalConDescuento * 0.9)
                                      : Math.round(subtotalConDescuento);
                                  })()
                                )}
                              </td>
                              <td className="p-4 align-middle text-center text-sm text-default-600">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setPresupuestoEdit((prev) => ({
                                      ...prev,
                                      productos: prev.productos.filter(
                                        (prod) => prod.id !== p.id
                                      ),
                                    }))
                                  }
                                  disabled={loadingPrecios}
                                  className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-red-200 text-red-600 hover:text-white hover:bg-red-600 hover:border-red-600 shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                                >
                                  <svg
                                    className="w-4 h-4"
                                    viewBox="0 0 24 24"
                                    fill="currentColor"
                                    aria-hidden="true"
                                  >
                                    <path d="M9 3a1 1 0 00-1 1v1H5.5a1 1 0 100 2H6v12a2 2 0 002 2h8a2 2 0 002-2V7h.5a1 1 0 100-2H16V4a1 1 0 00-1-1H9zm2 2h4v1h-4V5zm-1 5a1 1 0 112 0v7a1 1 0 11-2 0v-7zm5 0a1 1 0 112 0v7a1 1 0 11-2 0v-7z" />
                                  </svg>
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </section>
                )}

                {/* Totales y botones por debajo de la tabla */}
                {(presupuestoEdit.productos || []).length > 0 && (() => {
                  const { subtotal, descuentoTotal, total } = computeTotals(presupuestoEdit.productos);
                  const envio = Number(presupuestoEdit.costoEnvio) || 0;
                  const descuentoEfectivo = pagoEnEfectivo ? subtotal * 0.1 : 0;
                  const totalFinal = total + envio - descuentoEfectivo;
                  return (
                    <div className="flex flex-col items-end gap-2 mt-4">
                      <div className="bg-primary/5 border border-primary/20 rounded-lg px-6 py-3 flex flex-col md:flex-row gap-4 md:gap-8 text-lg shadow-sm w-full md:w-auto font-semibold">
                        <div>
                          Subtotal: <span className="font-bold">$ {formatearNumeroArgentino(subtotal)}</span>
                        </div>
                        <div>
                          Descuento: <span className="font-bold">$ {formatearNumeroArgentino(descuentoTotal)}</span>
                        </div>
                        {descuentoEfectivo > 0 && (
                          <div>
                            Descuento (Efectivo 10%): <span className="font-bold text-green-600">$ {formatearNumeroArgentino(descuentoEfectivo)}</span>
                          </div>
                        )}
                        {envio > 0 && (
                          <div>
                            Costo de envío: <span className="font-bold">$ {formatearNumeroArgentino(envio)}</span>
                          </div>
                        )}
                        <div>
                          Total: <span className="font-bold text-primary">$ {formatearNumeroArgentino(totalFinal)}</span>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Botones al final de todas las secciones editables */}
                <div className="flex flex-wrap gap-2 mt-6">
                  <Button
                    variant="default"
                    onClick={handleGuardarCambios}
                    disabled={loadingPrecios}
                    className="flex-1 lg:flex-none text-sm lg:text-base"
                  >
                    <span className="hidden sm:inline">Guardar cambios</span>
                    <span className="sm:hidden">💾</span>
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setEditando(false)}
                    disabled={loadingPrecios}
                    className="flex-1 lg:flex-none text-sm lg:text-base"
                  >
                    <span className="hidden sm:inline">Cancelar</span>
                    <span className="sm:hidden">❌</span>
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleActualizarPrecios}
                    disabled={loadingPrecios}
                    className="flex-1 lg:flex-none text-sm lg:text-base"
                  >
                    {loadingPrecios ? (
                      <>
                        <span className="hidden sm:inline">
                          Actualizando...
                        </span>
                        <span className="sm:hidden">⏳</span>
                      </>
                    ) : (
                      <>
                        <span className="hidden sm:inline">
                          Actualizar precios
                        </span>
                        <span className="sm:hidden">💰</span>
                      </>
                    )}
                  </Button>
                </div>
                {errorForm && (
                  <div className="text-red-500 mt-2">{errorForm}</div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="bg-card rounded-lg shadow-sm p-6 mb-6">
            <h3 className="font-semibold text-lg mb-4 ">
              Productos y Servicios
            </h3>

            {/* Usar productos si existe, sino usar items */}
            {safeArray(presupuesto.productos).length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-card border-b">
                      <th className="text-left p-3 font-medium">Producto</th>
                      <th className="text-center p-3 font-medium">Cantidad</th>
                      <th className="text-center p-3 font-medium">Cepillado</th>
                      <th className="text-right p-3 font-medium">Precio Unit.</th>
                      <th className="text-right p-3 font-medium">Descuento</th>
                      <th className="text-right p-3 font-medium">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {safeArray(presupuesto.productos).map((producto, idx) => (
                      <tr key={idx} className="border-b hover:bg-card">
                        <td className="p-3 font-medium">
                          {producto.descripcion ||
                            producto.nombre ||
                            "Producto sin nombre"}
                        </td>
                        <td className="p-3 text-center">
                          {safeNumber(producto.cantidad)}
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
                        <td className="p-3 text-right">
                          ${formatearNumeroArgentino(Number(producto.precio))}
                        </td>
                        <td className="p-3 text-right">
                          {safeNumber(producto.descuento).toFixed(2)}%
                        </td>
                        <td className="p-3 text-right font-medium">
                          $
                          {formatearNumeroArgentino(
                            (() => {
                              // Para productos de categoría "Eventual", calcular directamente precio × cantidad × (1 - descuento)
                              if (producto.categoria === "Eventual") {
                                const subtotal = Number(producto.precio) * Number(producto.cantidad);
                                return Math.round(subtotal * (1 - safeNumber(producto.descuento) / 100));
                              }
                              // Para otros productos, usar la función computeLineBase
                              return Math.round(
                                computeLineBase(producto) * (1 - safeNumber(producto.descuento) / 100)
                              );
                            })()
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Totales (recalculados desde items para consistencia) */}
            {(() => {
              const items = (presupuesto.productos && presupuesto.productos.length > 0)
                ? presupuesto.productos
                : (presupuesto.items || []);
              const { subtotal, descuentoTotal, total } = computeTotals(items);
              const envio = (presupuesto.costoEnvio !== undefined && presupuesto.costoEnvio !== "" && !isNaN(Number(presupuesto.costoEnvio)) && Number(presupuesto.costoEnvio) > 0)
                ? Number(presupuesto.costoEnvio)
                : 0;
              const descuentoEfectivo = presupuesto?.pagoEnEfectivo ? subtotal * 0.1 : 0;
              const totalFinal = total + envio - descuentoEfectivo;
              return (
                <div className="mt-6 flex justify-end">
                  <div className="bg-card rounded-lg p-4 min-w-[300px]">
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Subtotal:</span>
                        <span>$ {formatearNumeroArgentino(subtotal)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Descuento total:</span>
                        <span>$ {formatearNumeroArgentino(descuentoTotal)}</span>
                      </div>
                      {descuentoEfectivo > 0 && (
                        <div className="flex justify-between">
                          <span>Descuento (Efectivo 10%):</span>
                          <span className="text-green-600">$ {formatearNumeroArgentino(descuentoEfectivo)}</span>
                        </div>
                      )}
                      {envio > 0 && (
                        <div className="flex justify-between">
                          <span>Cotización de envío:</span>
                          <span>$ {formatearNumeroArgentino(envio)}</span>
                        </div>
                      )}
                      <div className="border-t pt-2 flex justify-between font-bold text-lg">
                        <span>Total:</span>
                        <span className="text-primary">$ {formatearNumeroArgentino(totalFinal)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* Observaciones */}
        {presupuesto.observaciones && (
          <div className="bg-card rounded-lg shadow-sm p-6 mb-4">
            <h3 className="font-semibold text-lg mb-3 ">Observaciones</h3>
            <p className="text-gray-700 whitespace-pre-wrap">
              {presupuesto.observaciones}
            </p>
          </div>
        )}

        {/* Modal de venta */}
        {convirtiendoVenta ? (
          <div className="bg-card rounded-lg shadow-sm p-6 mb-6">
            <h3 className="font-semibold text-lg mb-4 ">
              Convertir Presupuesto a Venta
            </h3>
            <p className="text-gray-600 mb-4">
              Complete los campos adicionales necesarios para convertir este
              presupuesto en una venta.
            </p>
            <FormularioConvertirVenta
              presupuesto={presupuesto}
              onCancel={() => setConvirtiendoVenta(false)}
              onSubmit={async (ventaCampos) => {
                try {
                  // Crear estructura de venta siguiendo exactamente el formato de ventas/page.jsx
                  const ventaData = {
                    // Datos del presupuesto
                    fecha: presupuesto.fecha,
                    clienteId: presupuesto.clienteId,
                    cliente: presupuesto.cliente,
                    productos: presupuesto.productos || presupuesto.items,
                    items: presupuesto.productos || presupuesto.items,
                    subtotal: (() => {
                      const items = (presupuesto.productos && presupuesto.productos.length > 0) ? presupuesto.productos : (presupuesto.items || []);
                      const { subtotal } = computeTotals(items);
                      return subtotal;
                    })(),
                    descuentoTotal: (() => {
                      const items = (presupuesto.productos && presupuesto.productos.length > 0) ? presupuesto.productos : (presupuesto.items || []);
                      const { descuentoTotal } = computeTotals(items);
                      return descuentoTotal;
                    })(),
                    descuentoEfectivo: (() => {
                      const items = (presupuesto.productos && presupuesto.productos.length > 0) ? presupuesto.productos : (presupuesto.items || []);
                      const { subtotal } = computeTotals(items);
                      return presupuesto.pagoEnEfectivo ? subtotal * 0.1 : 0;
                    })(),
                    // Calcular el total correcto incluyendo envío y descuento por pago en efectivo
                    total: (() => {
                      const items = (presupuesto.productos && presupuesto.productos.length > 0) ? presupuesto.productos : (presupuesto.items || []);
                      const { total } = computeTotals(items);
                      const envio = ventaCampos.costoEnvio
                        ? Number(ventaCampos.costoEnvio)
                        : safeNumber(presupuesto.costoEnvio || 0);
                      const descuentoEfectivo = presupuesto.pagoEnEfectivo ? (() => {
                        const { subtotal } = computeTotals(items);
                        return subtotal * 0.1;
                      })() : 0;
                      const totalCorrecto = total + envio - descuentoEfectivo;
                      console.log("[DEBUG] Total convertido desde computeTotals + envío - descuento efectivo:", totalCorrecto);
                      return totalCorrecto;
                    })(),
                    observaciones: presupuesto.observaciones,

                    // Datos específicos de venta
                    tipo: "venta",
                    fechaCreacion: new Date().toISOString(),
                    numeroPedido: await getNextVentaNumber(),

                    // Campos de pago
                    formaPago: ventaCampos.formaPago,
                    pagoParcial: ventaCampos.pagoParcial || false,
                    pagoPendiente: ventaCampos.pagoPendiente || false,
                    pagoEnEfectivo: presupuesto.pagoEnEfectivo || false,
                    montoAbonado: (() => {
                      const items = (presupuesto.productos && presupuesto.productos.length > 0) ? presupuesto.productos : (presupuesto.items || []);
                      const { total } = computeTotals(items);
                      const envio = ventaCampos.costoEnvio
                        ? Number(ventaCampos.costoEnvio)
                        : safeNumber(presupuesto.costoEnvio || 0);
                      const descuentoEfectivo = presupuesto.pagoEnEfectivo ? (() => {
                        const { subtotal } = computeTotals(items);
                        return subtotal * 0.1;
                      })() : 0;
                      const totalVenta = total + envio - descuentoEfectivo;
                      const esPagoParcial = ventaCampos.pagoParcial || false;
                      const esPagoPendiente = ventaCampos.pagoPendiente || false;

                      if (esPagoPendiente) {
                        // Forzar pendiente: no tomar montoAbonado y marcar 0
                        return 0;
                      } else if (!esPagoParcial) {
                        // Si NO es pago parcial → montoAbonado = total
                        return totalVenta;
                      } else {
                        // Si ES pago parcial → usar el valor del formulario
                        return ventaCampos.montoAbonado || 0;
                      }
                    })(),

                    // Determinar estado de pago
                    estadoPago: (() => {
                      const items = (presupuesto.productos && presupuesto.productos.length > 0) ? presupuesto.productos : (presupuesto.items || []);
                      const { total } = computeTotals(items);
                      const envio = ventaCampos.costoEnvio
                        ? Number(ventaCampos.costoEnvio)
                        : safeNumber(presupuesto.costoEnvio || 0);
                      const descuentoEfectivo = presupuesto.pagoEnEfectivo ? (() => {
                        const { subtotal } = computeTotals(items);
                        return subtotal * 0.1;
                      })() : 0;
                      const totalVenta = total + envio - descuentoEfectivo;
                      const esPagoParcial = ventaCampos.pagoParcial || false;
                      const esPagoPendiente = ventaCampos.pagoPendiente || false;

                      if (esPagoPendiente) {
                        // Forzar pendiente: no tomar montoAbonado y marcar 0
                        return "pendiente";
                      } else if (!esPagoParcial) {
                        // Si NO es pago parcial → estado = "pagado"
                        return "pagado";
                      } else {
                        // Si ES pago parcial → calcular estado basado en el monto
                        const montoAbonado = ventaCampos.montoAbonado || 0;
                        if (montoAbonado >= totalVenta) return "pagado";
                        else if (montoAbonado > 0) return "parcial";
                        else return "pendiente";
                      }
                    })(),

                    // Campos de envío
                    tipoEnvio: ventaCampos.tipoEnvio || presupuesto.tipoEnvio,
                    fechaEntrega: ventaCampos.fechaEntrega,
                    rangoHorario: ventaCampos.rangoHorario,
                    transportista: ventaCampos.transportista,
                    costoEnvio: ventaCampos.costoEnvio
                      ? Number(ventaCampos.costoEnvio)
                      : presupuesto.costoEnvio, // Usar el valor del formulario si existe
                    direccionEnvio: ventaCampos.direccionEnvio,
                    localidadEnvio: ventaCampos.localidadEnvio,
                    usarDireccionCliente:
                      ventaCampos.usarDireccionCliente || true,

                    // Campos adicionales
                    vendedor: user?.email || "Usuario no identificado",
                    prioridad: ventaCampos.prioridad,
                  };

                  // Limpiar datos antes de guardar (igual que en ventas/page.jsx)
                  const cleanVentaData = JSON.parse(
                    JSON.stringify(ventaData, (key, value) => {
                      if (value === undefined) return undefined;
                      return value;
                    })
                  );

                  console.log(
                    "[DEBUG] Datos limpios para guardar venta desde presupuesto:",
                    cleanVentaData
                  );

                  // Guardar venta en Firestore
                  const docRef = await addDoc(
                    collection(db, "ventas"),
                    cleanVentaData
                  );

                  // Descontar stock y registrar movimientos (igual que en ventas/page.jsx)
                  for (const prod of cleanVentaData.productos) {
                    console.log(
                      "[DEBUG] Intentando descontar stock para producto:",
                      prod.id
                    );
                    const productoRef = doc(db, "productos", prod.id);
                    const productoSnap = await getDocs(
                      collection(db, "productos")
                    );
                    const existe = productoSnap.docs.find(
                      (d) => d.id === prod.id
                    );
                    if (!existe) {
                      alert(
                        `El producto con ID ${prod.id} no existe en el catálogo. No se puede descontar stock ni registrar movimiento.`
                      );
                      return;
                    }
                    await updateDoc(productoRef, {
                      stock: increment(-Math.abs(prod.cantidad)),
                    });
                    await addDoc(collection(db, "movimientos"), {
                      productoId: prod.id,
                      tipo: "salida",
                      cantidad: prod.cantidad,
                      usuario: "Sistema",
                      fecha: serverTimestamp(),
                      referencia: "venta",
                      referenciaId: docRef.id,
                      observaciones: `Salida por venta desde presupuesto`,
                      productoNombre: prod.nombre,
                    });
                  }

                  // Crear envío si corresponde (igual que en ventas/page.jsx)
                  if (
                    cleanVentaData.tipoEnvio &&
                    cleanVentaData.tipoEnvio !== "retiro_local"
                  ) {
                    const envioData = {
                      ventaId: docRef.id,
                      clienteId: cleanVentaData.clienteId,
                      cliente: cleanVentaData.cliente,
                      fechaCreacion: new Date().toISOString(),
                      fechaEntrega: cleanVentaData.fechaEntrega,
                      estado: "pendiente",
                      prioridad: cleanVentaData.prioridad || "media",
                      vendedor: user?.email || "Usuario no identificado",
                      direccionEnvio: cleanVentaData.direccionEnvio,
                      localidadEnvio: cleanVentaData.localidadEnvio,
                      tipoEnvio: cleanVentaData.tipoEnvio,
                      transportista: cleanVentaData.transportista,
                      costoEnvio: parseFloat(cleanVentaData.costoEnvio) || 0,
                      numeroPedido: cleanVentaData.numeroPedido,
                      totalVenta: cleanVentaData.total,
                      productos: cleanVentaData.productos,
                      cantidadTotal: cleanVentaData.productos.reduce(
                        (acc, p) => acc + p.cantidad,
                        0
                      ),
                      historialEstados: [
                        {
                          estado: "pendiente",
                          fecha: new Date().toISOString(),
                          comentario:
                            "Envío creado automáticamente desde la venta",
                        },
                      ],
                      observaciones: cleanVentaData.observaciones,
                      instruccionesEspeciales: "",
                      fechaActualizacion: new Date().toISOString(),
                      creadoPor: "sistema",
                    };
                    const cleanEnvioData = Object.fromEntries(
                      Object.entries(envioData).filter(
                        ([_, v]) => v !== undefined
                      )
                    );
                    await addDoc(collection(db, "envios"), cleanEnvioData);
                    console.log(
                      "Envío creado automáticamente para la venta:",
                      docRef.id
                    );
                  }

                  setConvirtiendoVenta(false);
                  router.push(`/${lang}/ventas/${docRef.id}`);
                } catch (error) {
                  console.error(
                    "Error al guardar venta desde presupuesto:",
                    error
                  );
                  alert("Error al guardar venta: " + error.message);
                }
              }}
            />
          </div>
        ) : null}

        {/* Modal para nuevo cliente en presupuestos */}
        <Dialog open={openNuevoCliente} onOpenChange={setOpenNuevoCliente}>
          <DialogContent className="w-[95vw] max-w-[420px] bg-card">
            <DialogHeader className="bg-card">
              <DialogTitle className="bg-card">Agregar Cliente</DialogTitle>
              <DialogDescription className="bg-card">
                Complete los datos del nuevo cliente para agregarlo al sistema.
              </DialogDescription>
            </DialogHeader>
            <form
              onSubmit={handleNuevoClienteSubmit}
              className="space-y-2 bg-card"
            >
              {/* Checkbox para diferenciar tipo de cliente */}
              <div className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <input
                  type="checkbox"
                  id="esClienteViejo"
                  checked={nuevoCliente.esClienteViejo}
                  onChange={(e) =>
                    setNuevoCliente({
                      ...nuevoCliente,
                      esClienteViejo: e.target.checked,
                    })
                  }
                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                />
                <label
                  htmlFor="esClienteViejo"
                  className="text-sm font-medium text-blue-800 dark:text-blue-200"
                >
                  ¿Es un cliente existente/antiguo?
                </label>
              </div>
              <Input
                label="Nombre *"
                value={nuevoCliente.nombre}
                onChange={(e) =>
                  setNuevoCliente({ ...nuevoCliente, nombre: e.target.value })
                }
                required
              />
              <Input
                label="Dirección *"
                value={nuevoCliente.direccion}
                onChange={(e) =>
                  setNuevoCliente({
                    ...nuevoCliente,
                    direccion: e.target.value,
                  })
                }
                required
              />
              <Input
                label="Teléfono *"
                value={nuevoCliente.telefono}
                onChange={(e) =>
                  setNuevoCliente({ ...nuevoCliente, telefono: e.target.value })
                }
                required
              />
              <Input
                label="CUIT / DNI"
                value={nuevoCliente.cuit}
                onChange={(e) =>
                  setNuevoCliente({ ...nuevoCliente, cuit: e.target.value })
                }
              />
              <Input
                label="Partido"
                value={nuevoCliente.partido}
                onChange={(e) =>
                  setNuevoCliente({ ...nuevoCliente, partido: e.target.value })
                }
              />
              <Input
                label="Barrio"
                value={nuevoCliente.barrio}
                onChange={(e) =>
                  setNuevoCliente({ ...nuevoCliente, barrio: e.target.value })
                }
              />
              <Input
                label="Área"
                value={nuevoCliente.area}
                onChange={(e) =>
                  setNuevoCliente({ ...nuevoCliente, area: e.target.value })
                }
              />
              <Input
                label="Lote"
                value={nuevoCliente.lote}
                onChange={(e) =>
                  setNuevoCliente({ ...nuevoCliente, lote: e.target.value })
                }
              />
              <Textarea
                label="Descripción"
                value={nuevoCliente.descripcion}
                onChange={(e) =>
                  setNuevoCliente({
                    ...nuevoCliente,
                    descripcion: e.target.value,
                  })
                }
                rows={2}
              />
              <div className="flex justify-end gap-2 mt-4">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setOpenNuevoCliente(false)}
                >
                  Cancelar
                </Button>
                <Button type="submit" variant="primary">
                  Guardar
                </Button>
              </div>
            </form>
            <DialogFooter className="bg-card">
              {/* ...botones... */}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

// Nuevo formulario minimalista para conversión a venta
function FormularioConvertirVenta({ presupuesto, onCancel, onSubmit }) {
  const [clientes, setClientes] = React.useState([]);

  // Función para formatear números en formato argentino
  const formatearNumeroArgentino = (numero) => {
    if (numero === null || numero === undefined || isNaN(numero)) return "0";
    return Number(numero).toLocaleString("es-AR");
  };

  // Cargar clientes al montar
  React.useEffect(() => {
    getDocs(collection(db, "clientes")).then((snap) => {
      setClientes(snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    });
  }, []);

  const schema = yup.object().shape({
    formaPago: yup.string().required("Selecciona la forma de pago"),
    pagoParcial: yup.boolean(),
    pagoPendiente: yup.boolean(),
    montoAbonado: yup
      .number()
      .transform((value, originalValue) =>
        originalValue === "" ? undefined : value
      )
      .when(["pagoParcial", "pagoPendiente"], {
        is: (pagoParcial, pagoPendiente) => Boolean(pagoParcial) && !Boolean(pagoPendiente),
        then: (s) =>
          s
            .typeError("Debe ingresar un monto")
            .min(1, "Debe ingresar un monto")
            .max(
              (() => {
                const subtotal = presupuesto.subtotal || 0;
                const descuento = presupuesto.descuentoTotal || 0;
                // Usar el costo de envío del formulario si existe, sino del presupuesto
                const envio = watch("costoEnvio")
                  ? Number(watch("costoEnvio"))
                  : presupuesto.costoEnvio !== undefined &&
                    presupuesto.costoEnvio !== "" &&
                    !isNaN(Number(presupuesto.costoEnvio)) &&
                    Number(presupuesto.costoEnvio) > 0
                  ? Number(presupuesto.costoEnvio)
                  : 0;
                return subtotal - descuento + envio;
              })(),
              (value) => {
                const subtotal = presupuesto.subtotal || 0;
                const descuento = presupuesto.descuentoTotal || 0;
                // Usar el costo de envío del formulario si existe, sino del presupuesto
                const envio = watch("costoEnvio")
                  ? Number(watch("costoEnvio"))
                  : presupuesto.costoEnvio !== undefined &&
                    presupuesto.costoEnvio !== "" &&
                    !isNaN(Number(presupuesto.costoEnvio)) &&
                    Number(presupuesto.costoEnvio) > 0
                  ? Number(presupuesto.costoEnvio)
                  : 0;
                const total = subtotal - descuento + envio;
                return `No puede exceder el total de $${formatearNumeroArgentino(
                  total
                )}`;
              }
            )
            .required("Obligatorio"),
        otherwise: (s) => s.notRequired().nullable(true),
      }),
    tipoEnvio: yup.string().required("Selecciona el tipo de envío"),
    transportista: yup.string().when("tipoEnvio", {
      is: (val) => val && val !== "retiro_local",
      then: (s) => s.required("Selecciona el transportista"),
      otherwise: (s) => s.notRequired(),
    }),
    costoEnvio: yup
      .number()
      .transform((value, originalValue) =>
        originalValue === "" ? undefined : value
      )
      .notRequired(),
    fechaEntrega: yup.string().when("tipoEnvio", {
      is: (val) => val && val !== "retiro_local",
      then: (s) => s.required("La fecha de entrega es obligatoria"),
      otherwise: (s) => s.notRequired(),
    }),
    rangoHorario: yup.string().when("tipoEnvio", {
      is: (val) => val && val !== "retiro_local",
      then: (s) => s.required("El rango horario es obligatorio"),
      otherwise: (s) => s.notRequired(),
    }),
    prioridad: yup.string().when("tipoEnvio", {
      is: (val) => val && val !== "retiro_local",
      then: (s) => s.required("Selecciona la prioridad"),
      otherwise: (s) => s.notRequired(),
    }),
    direccionEnvio: yup.string().when(["tipoEnvio", "usarDireccionCliente"], {
      is: (tipoEnvio, usarDireccionCliente) =>
        tipoEnvio && tipoEnvio !== "retiro_local" && !usarDireccionCliente,
      then: (s) => s.required("La dirección de envío es obligatoria"),
      otherwise: (s) => s.notRequired(),
    }),
    localidadEnvio: yup.string().when(["tipoEnvio", "usarDireccionCliente"], {
      is: (tipoEnvio, usarDireccionCliente) =>
        tipoEnvio && tipoEnvio !== "retiro_local" && !usarDireccionCliente,
      then: (s) => s.required("La localidad es obligatoria"),
      otherwise: (s) => s.notRequired(),
    }),
  });

  // Determinar valores por defecto inteligentes
  const getDefaultValues = () => {
    const defaults = {
      formaPago: "",
      pagoParcial: false,
      pagoPendiente: false,
      montoAbonado: "",
      tipoEnvio: "",
      transportista: "",
      costoEnvio: "",
      fechaEntrega: "",
      rangoHorario: "",
      prioridad: "",
      direccionEnvio: "",
      localidadEnvio: "",
      usarDireccionCliente: true,
    };

    // Si el presupuesto tiene pago en efectivo, establecer automáticamente forma de pago en efectivo
    if (presupuesto.pagoEnEfectivo) {
      defaults.formaPago = "efectivo";
    }

    // Si el presupuesto tiene costo de envío, establecer automáticamente como envío a domicilio
    if (presupuesto.costoEnvio && presupuesto.costoEnvio > 0) {
      defaults.tipoEnvio = "envio_domicilio";
      defaults.costoEnvio = presupuesto.costoEnvio.toString();
    }

    return defaults;
  };

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: yupResolver(schema),
    defaultValues: getDefaultValues(),
  });

  const transportistas = ["camion", "camioneta 1", "camioneta 2"];
  const vendedores = ["coco", "damian", "lauti", "jose"];
  const prioridades = ["alta", "media", "baja"];
  const tipoEnvioSeleccionado = watch("tipoEnvio");
  const usarDireccionCliente = watch("usarDireccionCliente");

  // Limpiar montoAbonado si se desmarca pagoParcial o se marca pagoPendiente
  React.useEffect(() => {
    if (!watch("pagoParcial") || watch("pagoPendiente")) {
      setValue("montoAbonado", "");
    }
  }, [watch("pagoParcial"), watch("pagoPendiente"), setValue]);

  // Limpiar costoEnvio si tipoEnvio es 'retiro_local'
  React.useEffect(() => {
    if (watch("tipoEnvio") === "retiro_local") {
      setValue("costoEnvio", "");
      setValue("fechaEntrega", "");
      setValue("rangoHorario", "");
      setValue("transportista", "");
      setValue("prioridad", "");
    }
  }, [watch("tipoEnvio"), setValue]);

  // Establecer fecha de entrega por defecto al día actual
  React.useEffect(() => {
    if (tipoEnvioSeleccionado && tipoEnvioSeleccionado !== "retiro_local") {
      setValue("fechaEntrega", new Date().toISOString().split("T")[0]);
    }
  }, [tipoEnvioSeleccionado, setValue]);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Información de envío */}
        <div className="space-y-4 bg-card rounded-lg p-4 border border-gray-200 shadow-sm">
          <div className="text-base font-semibold text-gray-800 pb-2 border-b">
            Información de envío
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tipo de envío *
            </label>
            <select
              {...register("tipoEnvio")}
              className={`w-full border rounded-md px-3 py-2 ${
                errors.tipoEnvio ? "border-red-500" : "border-gray-300"
              }`}
            >
              <option value="">Seleccionar tipo de envío...</option>
              <option value="retiro_local">Retiro en local</option>
              <option value="envio_domicilio">Envío a domicilio</option>
            </select>
            {errors.tipoEnvio && (
              <span className="text-red-500 text-xs">
                {errors.tipoEnvio.message}
              </span>
            )}
          </div>

          {tipoEnvioSeleccionado &&
            tipoEnvioSeleccionado !== "retiro_local" && (
              <>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="usarDireccionCliente"
                    {...register("usarDireccionCliente")}
                  />
                  <label htmlFor="usarDireccionCliente" className="text-sm">
                    Usar dirección del cliente
                  </label>
                </div>

                {!usarDireccionCliente && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Dirección de envío *
                      </label>
                      <Input
                        {...register("direccionEnvio")}
                        placeholder="Dirección de envío"
                        className={`w-full ${
                          errors.direccionEnvio ? "border-red-500" : ""
                        }`}
                      />
                      {errors.direccionEnvio && (
                        <span className="text-red-500 text-xs">
                          {errors.direccionEnvio.message}
                        </span>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Localidad *
                      </label>
                      <Input
                        {...register("localidadEnvio")}
                        placeholder="Localidad/Ciudad"
                        className={`w-full ${
                          errors.localidadEnvio ? "border-red-500" : ""
                        }`}
                      />
                      {errors.localidadEnvio && (
                        <span className="text-red-500 text-xs">
                          {errors.localidadEnvio.message}
                        </span>
                      )}
                    </div>
                  </>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Transportista *
                  </label>
                  <select
                    {...register("transportista")}
                    className={`w-full border rounded-md px-3 py-2 ${
                      errors.transportista
                        ? "border-red-500"
                        : "border-gray-300"
                    }`}
                  >
                    <option value="">Seleccionar transportista...</option>
                    {transportistas.map((t) => (
                      <option key={t}>{t}</option>
                    ))}
                  </select>
                  {errors.transportista && (
                    <span className="text-red-500 text-xs">
                      {errors.transportista.message}
                    </span>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Costo de envío
                  </label>
                  <Input
                    {...register("costoEnvio")}
                    placeholder="Costo de envío"
                    type="number"
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Fecha de entrega *
                  </label>
                  <Input
                    {...register("fechaEntrega")}
                    placeholder="Fecha de entrega"
                    type="date"
                    className={`w-full ${
                      errors.fechaEntrega ? "border-red-500" : ""
                    }`}
                    value={
                      watch("fechaEntrega")
                        ? new Date(watch("fechaEntrega"))
                            .toISOString()
                            .split("T")[0]
                        : ""
                    }
                  />
                  {errors.fechaEntrega && (
                    <span className="text-red-500 text-xs">
                      {errors.fechaEntrega.message}
                    </span>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Rango horario *
                  </label>
                  <Input
                    {...register("rangoHorario")}
                    placeholder="Rango horario (ej: 8-12, 14-18)"
                    className={`w-full ${
                      errors.rangoHorario ? "border-red-500" : ""
                    }`}
                  />
                  {errors.rangoHorario && (
                    <span className="text-red-500 text-xs">
                      {errors.rangoHorario.message}
                    </span>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Prioridad *
                  </label>
                  <select
                    {...register("prioridad")}
                    className={`w-full border rounded-md px-3 py-2 ${
                      errors.prioridad ? "border-red-500" : "border-gray-300"
                    }`}
                  >
                    <option value="">Seleccionar prioridad...</option>
                    {prioridades.map((p) => (
                      <option key={p}>
                        {p.charAt(0).toUpperCase() + p.slice(1)}
                      </option>
                    ))}
                  </select>
                  {errors.prioridad && (
                    <span className="text-red-500 text-xs">
                      {errors.prioridad.message}
                    </span>
                  )}
                </div>
              </>
            )}
        </div>

        {/* Condiciones de pago y entrega */}
        <div className="space-y-4 bg-card rounded-lg p-4 border border-gray-200 shadow-sm">
          <div className="text-base font-semibold text-gray-800 pb-2 border-b">
            Condiciones de pago y entrega
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Forma de pago *
              {presupuesto.pagoEnEfectivo && (
                <span className="ml-2 text-xs text-green-600 font-normal">
                  (Presupuesto con descuento por pago en efectivo)
                </span>
              )}
            </label>
            <select
              {...register("formaPago")}
              disabled={presupuesto.pagoEnEfectivo}
              className={`w-full border rounded-md px-3 py-2 ${
                errors.formaPago ? "border-red-500" : "border-gray-300"
              } ${presupuesto.pagoEnEfectivo ? "bg-gray-100 cursor-not-allowed" : ""}`}
            >
              <option value="">Seleccionar forma de pago...</option>
              <option value="efectivo" selected={presupuesto.pagoEnEfectivo}>Efectivo</option>
              <option value="transferencia">Transferencia</option>
              <option value="tarjeta">Tarjeta</option>
              <option value="cheque">Cheque</option>
              <option value="otro">Otro</option>
            </select>
            {presupuesto.pagoEnEfectivo && (
              <p className="text-xs text-green-600 mt-1">
                ✓ Forma de pago establecida automáticamente en Efectivo debido al descuento aplicado en el presupuesto
              </p>
            )}
            {errors.formaPago && (
              <span className="text-red-500 text-xs">
                {errors.formaPago.message}
              </span>
            )}
          </div>

          <div className="flex items-center gap-4 mt-2">
            <label className="inline-flex items-center gap-2">
              <input type="checkbox" id="pagoPendiente" {...register("pagoPendiente")} />
              <span className="text-sm">¿Pago pendiente?</span>
            </label>
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                id="pagoParcial"
                {...register("pagoParcial")}
                disabled={watch("pagoPendiente")}
              />
              <span className="text-sm">¿Pago parcial?</span>
            </label>
          </div>

          {watch("pagoParcial") && !watch("pagoPendiente") && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Monto abonado *
              </label>
              <Input
                type="number"
                min={0}
                max={(() => {
                  const subtotal = presupuesto.subtotal || 0;
                  const descuento = presupuesto.descuentoTotal || 0;
                  // Usar el costo de envío del formulario si existe, sino del presupuesto
                  const envio = watch("costoEnvio")
                    ? Number(watch("costoEnvio"))
                    : presupuesto.costoEnvio !== undefined &&
                      presupuesto.costoEnvio !== "" &&
                      !isNaN(Number(presupuesto.costoEnvio)) &&
                      Number(presupuesto.costoEnvio) > 0
                    ? Number(presupuesto.costoEnvio)
                    : 0;
                  return subtotal - descuento + envio;
                })()}
                placeholder={`Saldo pendiente: $${(() => {
                  // Calcular el total completo incluyendo envío
                  const subtotal = presupuesto.subtotal || 0;
                  const descuento = presupuesto.descuentoTotal || 0;
                  // Usar el costo de envío del formulario si existe, sino del presupuesto
                  const envio = watch("costoEnvio")
                    ? Number(watch("costoEnvio"))
                    : presupuesto.costoEnvio !== undefined &&
                      presupuesto.costoEnvio !== "" &&
                      !isNaN(Number(presupuesto.costoEnvio)) &&
                      Number(presupuesto.costoEnvio) > 0
                    ? Number(presupuesto.costoEnvio)
                    : 0;
                  const total = subtotal - descuento + envio;
                  const montoAbonado = watch("montoAbonado")
                    ? Number(watch("montoAbonado"))
                    : 0;
                  return formatearNumeroArgentino(total - montoAbonado);
                })()}`}
                {...register("montoAbonado")}
                className={`w-full ${
                  errors.montoAbonado ? "border-red-500" : ""
                }`}
              />
              {errors.montoAbonado && (
                <span className="text-red-500 text-xs">
                  {errors.montoAbonado.message}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="flex gap-3 justify-end">
        <Button
          variant="outline"
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Cancelar
        </Button>
        <Button
          variant="default"
          type="submit"
          disabled={isSubmitting}
          className="min-w-[160px]"
        >
          {isSubmitting ? "Guardando..." : "Convertir a Venta"}
        </Button>
      </div>
    </form>
  );
}

export default PresupuestoDetalle;

// Numeración autoincremental para presupuestos
const getNextPresupuestoNumber = async () => {
  const snap = await getDocs(collection(db, "presupuestos"));
  let maxNum = 0;
  snap.docs.forEach((doc) => {
    const data = doc.data();
    if (data.numeroPedido && data.numeroPedido.startsWith("PRESU-")) {
      const num = parseInt(data.numeroPedido.replace("PRESU-", ""), 10);
      if (!isNaN(num) && num > maxNum) maxNum = num;
    }
  });
  return `PRESU-${String(maxNum + 1).padStart(5, "0")}`;
};

// Numeración autoincremental para ventas
const getNextVentaNumber = async () => {
  const snap = await getDocs(collection(db, "ventas"));
  let maxNum = 0;
  snap.docs.forEach((doc) => {
    const data = doc.data();
    if (data.numeroPedido && data.numeroPedido.startsWith("VENTA-")) {
      const num = parseInt(data.numeroPedido.replace("VENTA-", ""), 10);
      if (!isNaN(num) && num > maxNum) maxNum = num;
    }
  });
  return `VENTA-${String(maxNum + 1).padStart(5, "0")}`;
};
