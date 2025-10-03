"use client";
import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { collection, getDocs, addDoc } from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Filter, Search, RefreshCw } from "lucide-react";
import { Icon } from "@iconify/react";

// Genera un número incremental tipo OBRA-00001
async function getNextObraNumber() {
  const snap = await getDocs(collection(db, "obras"));
  let maxNum = 0;
  snap.docs.forEach((docSnap) => {
    const data = docSnap.data();
    if (data.numeroPedido && String(data.numeroPedido).startsWith("OBRA-")) {
      const num = parseInt(String(data.numeroPedido).replace("OBRA-", ""), 10);
      if (!Number.isNaN(num) && num > maxNum) maxNum = num;
    }
  });
  return `OBRA-${String(maxNum + 1).padStart(5, "0")}`;
}

function formatARNumber(value) {
  const num = Number(value || 0);
  if (Number.isNaN(num)) return "0";
  return num.toLocaleString("es-AR", { minimumFractionDigits: 0 });
}

// Cálculos Maderas (idénticos a ventas)
function calcularPrecioCorteMadera({ alto, ancho, largo, precioPorPie, factor = 0.2734 }) {
  if ([alto, ancho, largo, precioPorPie].some((v) => typeof v !== "number" || v <= 0)) {
    return 0;
  }
  const precio = factor * alto * ancho * largo * precioPorPie;
  return Math.round(precio / 100) * 100; // redondeo a centenas
}
function calcularPrecioMachimbre({ alto, largo, cantidad, precioPorPie }) {
  if ([alto, largo, cantidad, precioPorPie].some((v) => typeof v !== "number" || v <= 0)) {
    return 0;
  }
  const metrosCuadrados = alto * largo;
  const precio = metrosCuadrados * precioPorPie * cantidad;
  return Math.round(precio / 100) * 100; // redondeo a centenas
}
const parseNumericValue = (value) => {
  if (value === "" || value === null || value === undefined) return "";
  const parsed = Number(value);
  if (Number.isNaN(parsed)) return "";
  return parsed;
};

export default function CrearObraPage() {
  const router = useRouter();
  const params = useParams();
  const { lang } = params || {};

  // Datos generales
  const [tipoObra, setTipoObra] = useState("Obra Nueva");
  const [prioridad, setPrioridad] = useState("Alta");

  // Cliente (idéntico selector + modal a ventas/obras presupuesto)
  const [clientes, setClientes] = useState([]);
  const [clienteId, setClienteId] = useState("");
  const clienteSeleccionado = clientes.find((c) => c.id === clienteId);
  const [busquedaCliente, setBusquedaCliente] = useState("");
  const [clientesLoading, setClientesLoading] = useState(false);
  const [dropdownClientesOpen, setDropdownClientesOpen] = useState(false);
  const [openNuevoCliente, setOpenNuevoCliente] = useState(false);
  const [nuevoCliente, setNuevoCliente] = useState({
    nombre: "",
    cuit: "",
    direccion: "",
    telefono: "",
    email: "",
    localidad: "",
    partido: "",
    barrio: "",
    area: "",
    lote: "",
    descripcion: "",
    esClienteViejo: false,
  });
  const [activeTabCliente, setActiveTabCliente] = useState("datos");

  // Ubicación
  const [usarDireccionCliente, setUsarDireccionCliente] = useState(true);
  const [direccion, setDireccion] = useState("");
  const [localidad, setLocalidad] = useState("");
  const [provincia, setProvincia] = useState("");
  const [area, setArea] = useState("");
  const [barrio, setBarrio] = useState("");
  const [lote, setLote] = useState("");
  const [descripcionUbicacion, setDescripcionUbicacion] = useState("");

  // Equipo
  const [responsable, setResponsable] = useState("");
  const [responsables, setResponsables] = useState(["Braian", "Damian", "Jonathan"]);
  const [openNuevoResponsable, setOpenNuevoResponsable] = useState(false);
  const [nuevoResponsable, setNuevoResponsable] = useState("");

  // Materiales - catálogo (como ventas, fuente: productos)
  const [productos, setProductos] = useState([]);
  const [productosPorCategoria, setProductosPorCategoria] = useState({});
  const [categorias, setCategorias] = useState([]);
  const [categoriaId, setCategoriaId] = useState("");
  const [busquedaProducto, setBusquedaProducto] = useState("");
  const [busquedaDebounced, setBusquedaDebounced] = useState("");
  useEffect(() => {
    const id = setTimeout(() => setBusquedaDebounced(busquedaProducto), 150);
    return () => clearTimeout(id);
  }, [busquedaProducto]);
  const busquedaDefer = React.useDeferredValue(busquedaDebounced);
  const [paginaActual, setPaginaActual] = useState(1);
  const [productosPorPagina] = useState(12);
  const [isPending, startTransition] = React.useTransition();
  const [itemsCatalogo, setItemsCatalogo] = useState([]);

  // Presupuesto y costos
  const [presupuestoInicialId, setPresupuestoInicialId] = useState("");
  const [presupuestosObra, setPresupuestosObra] = useState([]); // desde obras tipo "presupuesto"
  const [montoEstimado, setMontoEstimado] = useState("");


  // Carga inicial: clientes, productos, presupuestos
  useEffect(() => {
    async function fetchData() {
      // Clientes
      setClientesLoading(true);
      const snapClientes = await getDocs(collection(db, "clientes"));
      setClientes(snapClientes.docs.map((d) => ({ id: d.id, ...d.data() })));
      setClientesLoading(false);

      // Productos (catálogo general)
      const snapProd = await getDocs(collection(db, "productos"));
      const prods = snapProd.docs.map((d) => ({ id: d.id, ...d.data() }));
      setProductos(prods);
      const agrupados = {};
      prods.forEach((p) => {
        const cat = p.categoria || "Sin categoría";
        (agrupados[cat] = agrupados[cat] || []).push(p);
      });
      setProductosPorCategoria(agrupados);
      setCategorias(Object.keys(agrupados));

      // Presupuestos de obras
      const snapObras = await getDocs(collection(db, "obras"));
      const presup = snapObras.docs.map((d) => ({ id: d.id, ...d.data() })).filter((x) => x.tipo === "presupuesto");
      setPresupuestosObra(presup);
    }
    fetchData();
  }, []);

  // Normaliza texto para búsqueda
  const normalizarTexto = useCallback((texto) => {
    if (!texto) return "";
    return texto.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "");
  }, []);

  // Filtro catálogo
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
    return fuente.filter((prod) => {
      const nombre = normalizarTexto(prod.nombre);
      const unidad = normalizarTexto(prod.unidad || prod.unidadMedida || "");
      if (busq === "") return true;
      if (busq.endsWith(".")) {
        const sinPunto = busq.slice(0, -1);
        return nombre.startsWith(sinPunto) || unidad.startsWith(sinPunto);
      }
      return nombre.includes(busq) || unidad.includes(busq);
    });
  }, [productos, productosPorCategoria, categoriaId, busquedaDefer, normalizarTexto]);

  const totalProductos = productosFiltrados.length;
  const totalPaginas = Math.ceil(totalProductos / productosPorPagina) || 1;
  const productosPaginados = useMemo(() => {
    const inicio = (paginaActual - 1) * productosPorPagina;
    const fin = inicio + productosPorPagina;
    return productosFiltrados.slice(inicio, fin);
  }, [productosFiltrados, paginaActual, productosPorPagina]);

  useEffect(() => { setPaginaActual(1); }, [categoriaId, busquedaDefer]);

  // Catálogo: agregar/quitar y editar seleccionados
  const agregarProductoCatalogo = useCallback((prod) => {
    const ya = itemsCatalogo.some((x) => x.id === prod.id);
    if (ya) return;
    const subcategoria = prod.subcategoria || prod.subCategoria || "";
    const esMadera = (prod.categoria || "").toLowerCase() === "maderas";
    const nuevoBase = {
      id: prod.id,
      nombre: prod.nombre,
      categoria: prod.categoria || "",
      subcategoria,
      unidad: prod.unidad || prod.unidadMedida || "UN",
      valorVenta: Number(prod.valorVenta) || 0,
      cantidad: 1,
      descuento: 0,
    };
    // Si es madera, inicializar dimensiones y precioPorPie
    if (esMadera) {
      const alto = Number(prod.alto) || 1;
      const ancho = Number(prod.ancho) || 1;
      const largo = Number(prod.largo) || 1;
      const precioPorPie = Number(prod.precioPorPie) || 0;
      let precio = 0;
      if (subcategoria === "machimbre" || subcategoria === "deck") {
        precio = calcularPrecioMachimbre({ alto, largo, cantidad: 1, precioPorPie });
      } else {
        precio = calcularPrecioCorteMadera({ alto, ancho, largo, precioPorPie });
      }
      setItemsCatalogo((prev) => [
        ...prev,
        {
          ...nuevoBase,
          alto,
          ancho,
          largo,
          precioPorPie,
          cepilladoAplicado: false,
          precio,
        },
      ]);
    } else {
      // Ferretería u otros
      setItemsCatalogo((prev) => [
        ...prev,
        { ...nuevoBase, precio: Number(prod.valorVenta) || 0 },
      ]);
    }
  }, [itemsCatalogo]);

  const quitarProductoCatalogo = useCallback((id) => {
    setItemsCatalogo((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const actualizarCampoCatalogo = (id, campo, valor) => {
    setItemsCatalogo((prev) => prev.map((p) => {
      if (p.id !== id) return p;
      const esMadera = (p.categoria || "").toLowerCase() === "maderas";
      const updated = { ...p, [campo]: campo === "descuento" ? Number(valor) || 0 : valor === "" ? "" : Number(valor) };
      if (!esMadera) return updated;
      const subcategoria = p.subcategoria || "";
      const alto = Number(updated.alto) || 0;
      const ancho = Number(updated.ancho) || 0;
      const largo = Number(updated.largo) || 0;
      const cantidad = Number(updated.cantidad) || 1;
      const precioPorPie = Number(updated.precioPorPie) || 0;
      let base = 0;
      if (subcategoria === "machimbre" || subcategoria === "deck") {
        base = calcularPrecioMachimbre({ alto, largo, cantidad, precioPorPie });
      } else {
        base = calcularPrecioCorteMadera({ alto, ancho, largo, precioPorPie });
      }
      const final = updated.cepilladoAplicado ? base * 1.066 : base;
      return { ...updated, precio: Math.round(final / 100) * 100 };
    }));
  };

  // Handlers específicos (paridad con ventas) -------------------------------
  const handleCantidadChange = (id, cantidad) => {
    const parsedCantidad = parseNumericValue(cantidad);
    setItemsCatalogo((prev) => prev.map((p) => {
      if (p.id !== id) return p;
      const esMadera = (p.categoria || "").toLowerCase() === "maderas";
      // Para maderas machimbre/deck recalculamos precio en base a cantidad
      if (esMadera && (p.subcategoria === "machimbre" || p.subcategoria === "deck")) {
        const alto = Number(p.alto) || 0;
        const largo = Number(p.largo) || 0;
        const precioPorPie = Number(p.precioPorPie) || 0;
        const cant = parsedCantidad === "" ? 1 : Number(parsedCantidad) || 1;
        let base = calcularPrecioMachimbre({ alto, largo, cantidad: cant, precioPorPie });
        const final = p.cepilladoAplicado ? base * 1.066 : base;
        const precioRedondeado = Math.round(final / 100) * 100;
        return { ...p, cantidad: parsedCantidad, precio: precioRedondeado };
      }
      // Resto: solo actualiza cantidad
      return { ...p, cantidad: parsedCantidad };
    }));
  };

  const handleIncrementarCantidad = (id) => {
    setItemsCatalogo((prev) => prev.map((p) => {
      if (p.id !== id) return p;
      const nuevaCantidad = Number(p.cantidad || 0) + 1;
      const esMadera = (p.categoria || "").toLowerCase() === "maderas";
      if (esMadera && (p.subcategoria === "machimbre" || p.subcategoria === "deck")) {
        const alto = Number(p.alto) || 0;
        const largo = Number(p.largo) || 0;
        const precioPorPie = Number(p.precioPorPie) || 0;
        let base = calcularPrecioMachimbre({ alto, largo, cantidad: nuevaCantidad, precioPorPie });
        const final = p.cepilladoAplicado ? base * 1.066 : base;
        const precioRedondeado = Math.round(final / 100) * 100;
        return { ...p, cantidad: nuevaCantidad, precio: precioRedondeado };
      }
      return { ...p, cantidad: nuevaCantidad };
    }));
  };

  const handleDecrementarCantidad = (id) => {
    setItemsCatalogo((prev) => prev.map((p) => {
      if (p.id !== id) return p;
      const nuevaCantidad = Math.max(1, Number(p.cantidad || 1) - 1);
      const esMadera = (p.categoria || "").toLowerCase() === "maderas";
      if (esMadera && (p.subcategoria === "machimbre" || p.subcategoria === "deck")) {
        const alto = Number(p.alto) || 0;
        const largo = Number(p.largo) || 0;
        const precioPorPie = Number(p.precioPorPie) || 0;
        let base = calcularPrecioMachimbre({ alto, largo, cantidad: nuevaCantidad, precioPorPie });
        const final = p.cepilladoAplicado ? base * 1.066 : base;
        const precioRedondeado = Math.round(final / 100) * 100;
        return { ...p, cantidad: nuevaCantidad, precio: precioRedondeado };
      }
      return { ...p, cantidad: nuevaCantidad };
    }));
  };

  const handlePrecioPorPieChange = (id, nuevo) => {
    const parsed = parseNumericValue(nuevo);
    setItemsCatalogo((prev) => prev.map((p) => {
      if (p.id !== id) return p;
      const esMadera = (p.categoria || "").toLowerCase() === "maderas";
      if (!esMadera) return { ...p, valorVenta: parsed };
      const subcategoria = p.subcategoria || "";
      const alto = Number(p.alto) || 0;
      const ancho = Number(p.ancho) || 0;
      const largo = Number(p.largo) || 0;
      const cantidad = Number(p.cantidad) || 1;
      const precioPorPie = parsed === "" ? 0 : Number(parsed) || 0;
      let base = 0;
      if (subcategoria === "machimbre" || subcategoria === "deck") {
        base = calcularPrecioMachimbre({ alto, largo, cantidad, precioPorPie });
      } else {
        base = calcularPrecioCorteMadera({ alto, ancho, largo, precioPorPie });
      }
      const final = p.cepilladoAplicado ? base * 1.066 : base;
      const precioRedondeado = Math.round(final / 100) * 100;
      return { ...p, precioPorPie: parsed, precio: precioRedondeado };
    }));
  };

  const handleAltoChange = (id, nuevo) => {
    const parsed = parseNumericValue(nuevo);
    setItemsCatalogo((prev) => prev.map((p) => {
      if (p.id !== id) return p;
      const esMadera = (p.categoria || "").toLowerCase() === "maderas";
      if (!esMadera) return p;
      const subcategoria = p.subcategoria || "";
      const alto = parsed === "" ? 0 : Number(parsed) || 0;
      const ancho = Number(p.ancho) || 0;
      const largo = Number(p.largo) || 0;
      const cantidad = Number(p.cantidad) || 1;
      const precioPorPie = Number(p.precioPorPie) || 0;
      let base = 0;
      if (subcategoria === "machimbre" || subcategoria === "deck") {
        base = calcularPrecioMachimbre({ alto, largo, cantidad, precioPorPie });
      } else {
        base = calcularPrecioCorteMadera({ alto, ancho, largo, precioPorPie });
      }
      const final = p.cepilladoAplicado ? base * 1.066 : base;
      const precioRedondeado = Math.round(final / 100) * 100;
      return { ...p, alto: parsed, precio: precioRedondeado };
    }));
  };

  const handleAnchoChange = (id, nuevo) => {
    const parsed = parseNumericValue(nuevo);
    setItemsCatalogo((prev) => prev.map((p) => {
      if (p.id !== id) return p;
      const esMadera = (p.categoria || "").toLowerCase() === "maderas";
      if (!esMadera) return p;
      const subcategoria = p.subcategoria || "";
      // Machimbre/deck no usan ancho en la fórmula
      if (subcategoria === "machimbre" || subcategoria === "deck") {
        return { ...p, ancho: parsed };
      }
      const alto = Number(p.alto) || 0;
      const ancho = parsed === "" ? 0 : Number(parsed) || 0;
      const largo = Number(p.largo) || 0;
      const precioPorPie = Number(p.precioPorPie) || 0;
      const base = calcularPrecioCorteMadera({ alto, ancho, largo, precioPorPie });
      const final = p.cepilladoAplicado ? base * 1.066 : base;
      const precioRedondeado = Math.round(final / 100) * 100;
      return { ...p, ancho: parsed, precio: precioRedondeado };
    }));
  };

  const handleLargoChange = (id, nuevo) => {
    const parsed = parseNumericValue(nuevo);
    setItemsCatalogo((prev) => prev.map((p) => {
      if (p.id !== id) return p;
      const esMadera = (p.categoria || "").toLowerCase() === "maderas";
      if (!esMadera) return p;
      const subcategoria = p.subcategoria || "";
      const alto = Number(p.alto) || 0;
      const ancho = Number(p.ancho) || 0;
      const largo = parsed === "" ? 0 : Number(parsed) || 0;
      const cantidad = Number(p.cantidad) || 1;
      const precioPorPie = Number(p.precioPorPie) || 0;
      let base = 0;
      if (subcategoria === "machimbre" || subcategoria === "deck") {
        base = calcularPrecioMachimbre({ alto, largo, cantidad, precioPorPie });
      } else {
        base = calcularPrecioCorteMadera({ alto, ancho, largo, precioPorPie });
      }
      const final = p.cepilladoAplicado ? base * 1.066 : base;
      const precioRedondeado = Math.round(final / 100) * 100;
      return { ...p, largo: parsed, precio: precioRedondeado };
    }));
  };

  const recalcularPreciosMadera = (id, aplicarCepillado) => {
    setItemsCatalogo((prev) => prev.map((p) => {
      if (p.id !== id) return p;
      const esMadera = (p.categoria || "").toLowerCase() === "maderas";
      if (!esMadera) return p;
      const subcategoria = p.subcategoria || "";
      const alto = Number(p.alto) || 0;
      const ancho = Number(p.ancho) || 0;
      const largo = Number(p.largo) || 0;
      const cantidad = Number(p.cantidad) || 1;
      const precioPorPie = Number(p.precioPorPie) || 0;
      let base = 0;
      if (subcategoria === "machimbre" || subcategoria === "deck") {
        base = calcularPrecioMachimbre({ alto, largo, cantidad, precioPorPie });
      } else {
        base = calcularPrecioCorteMadera({ alto, ancho, largo, precioPorPie });
      }
      const final = aplicarCepillado ? base * 1.066 : base;
      const precioRedondeado = Math.round(final / 100) * 100;
      return { ...p, precio: precioRedondeado, cepilladoAplicado: aplicarCepillado };
    }));
  };

  // Cálculos derivados
  const subtotalCatalogo = useMemo(() => itemsCatalogo.reduce((acc, p) => {
    const esMadera = String(p.categoria || '').toLowerCase() === 'maderas';
    const isMachDeck = esMadera && (p.subcategoria === 'machimbre' || p.subcategoria === 'deck');
    const base = isMachDeck ? (Number(p.precio) || 0) : (Number(p.precio) || 0) * (Number(p.cantidad) || 0);
    const desc = base * ((Number(p.descuento) || 0) / 100);
    return acc + (base - desc);
  }, 0), [itemsCatalogo]);

  // Totales sólo de productos seleccionados (sin externos)
  const productosSubtotal = useMemo(() => itemsCatalogo.reduce((acc, p) => {
    const esMadera = String(p.categoria || '').toLowerCase() === 'maderas';
    const isMachDeck = esMadera && (p.subcategoria === 'machimbre' || p.subcategoria === 'deck');
    const base = isMachDeck ? (Number(p.precio) || 0) : (Number(p.precio) || 0) * (Number(p.cantidad) || 0);
    return acc + base;
  }, 0), [itemsCatalogo]);
  const productosDescuentoTotal = useMemo(() => itemsCatalogo.reduce((acc, p) => {
    const esMadera = String(p.categoria || '').toLowerCase() === 'maderas';
    const isMachDeck = esMadera && (p.subcategoria === 'machimbre' || p.subcategoria === 'deck');
    const base = isMachDeck ? (Number(p.precio) || 0) : (Number(p.precio) || 0) * (Number(p.cantidad) || 0);
    const desc = base * ((Number(p.descuento) || 0) / 100);
    return acc + desc;
  }, 0), [itemsCatalogo]);
  const productosTotal = useMemo(() => productosSubtotal - productosDescuentoTotal, [productosSubtotal, productosDescuentoTotal]);

  // Guardar nuevo cliente (idéntico a ventas)
  const handleGuardarNuevoCliente = async () => {
    if (!nuevoCliente.nombre || !nuevoCliente.direccion || !nuevoCliente.telefono) {
      alert("Nombre, dirección y teléfono son obligatorios");
      return;
    }
    const clienteObj = {
      nombre: nuevoCliente.nombre,
      cuit: nuevoCliente.cuit || "",
      direccion: nuevoCliente.direccion,
      telefono: nuevoCliente.telefono,
      email: nuevoCliente.email || "",
      localidad: nuevoCliente.localidad || "",
      partido: nuevoCliente.partido || "",
      barrio: nuevoCliente.barrio || "",
      area: nuevoCliente.area || "",
      lote: nuevoCliente.lote || "",
      descripcion: nuevoCliente.descripcion || "",
      esClienteViejo: nuevoCliente.esClienteViejo || false,
    };
    const docRef = await addDoc(collection(db, "clientes"), clienteObj);
    const agregado = { ...clienteObj, id: docRef.id };
    setClientes((prev) => [...prev, agregado]);
    setClienteId(docRef.id);
    setNuevoCliente({ nombre: "", cuit: "", direccion: "", telefono: "", email: "", localidad: "", partido: "", barrio: "", area: "", lote: "", descripcion: "", esClienteViejo: false });
    setOpenNuevoCliente(false);
    setDropdownClientesOpen(false);
  };

  // Submit
  const [guardando, setGuardando] = useState(false);
  const handleGuardarObra = async () => {
    if (!clienteId) {
      alert("Cliente es requerido");
      return;
    }
    setGuardando(true);
    try {
      const numeroPedido = await getNextObraNumber();
      const clienteObj = clienteSeleccionado
        ? {
            nombre: clienteSeleccionado.nombre || "",
            cuit: clienteSeleccionado.cuit || "",
            direccion: clienteSeleccionado.direccion || "",
            telefono: clienteSeleccionado.telefono || "",
            email: clienteSeleccionado.email || "",
            localidad: clienteSeleccionado.localidad || "",
            partido: clienteSeleccionado.partido || "",
            barrio: clienteSeleccionado.barrio || "",
            area: clienteSeleccionado.area || "",
            lote: clienteSeleccionado.lote || "",
            descripcion: clienteSeleccionado.descripcion || "",
          }
        : null;

      const materialesSanitizados = itemsCatalogo.map((p) => {
        const esMadera = String(p.categoria || "").toLowerCase() === "maderas";
        const isMachDeck = esMadera && (p.subcategoria === "machimbre" || p.subcategoria === "deck");
        const precio = Number(p.precio) || 0;
        const cantidad = Number(p.cantidad) || 1;
        const descuento = Number(p.descuento) || 0;
        const base = isMachDeck ? precio : precio * cantidad;
        const subtotal = Math.round(base * (1 - descuento / 100));
        const item = {
          id: p.id,
          nombre: p.nombre || "",
          categoria: p.categoria || "",
          subcategoria: p.subcategoria || "",
          unidad: p.unidad || "",
          cantidad,
          descuento,
          precio,
          subtotal,
        };
        if (esMadera) {
          item.alto = Number(p.alto) || 0;
          item.ancho = Number(p.ancho) || 0;
          item.largo = Number(p.largo) || 0;
          item.precioPorPie = Number(p.precioPorPie) || 0;
          item.cepilladoAplicado = !!p.cepilladoAplicado;
        }
        return item;
      });

      const ubicacionObra = (() => {
        if (usarDireccionCliente && clienteSeleccionado) {
          return {
            direccion: clienteSeleccionado.direccion || "",
            localidad: clienteSeleccionado.localidad || "",
            provincia: clienteSeleccionado.provincia || "",
            partido: clienteSeleccionado.partido || "",
            barrio: clienteSeleccionado.barrio || "",
            area: clienteSeleccionado.area || "",
            lote: clienteSeleccionado.lote || "",
            descripcion: clienteSeleccionado.descripcion || "",
          };
        }
        return {
          direccion: direccion || "",
          localidad: localidad || "",
          provincia: provincia || "",
          partido: nuevoCliente.partido || "",
          barrio: barrio || "",
          area: area || "",
          lote: lote || "",
          descripcion: descripcionUbicacion || "",
        };
      })();

      await addDoc(collection(db, "obras"), {
        tipo: "obra",
        numeroPedido,
        tipoObra: tipoObra || "",
        prioridad: prioridad || "",
        estado: "pendiente_inicio",
        clienteId,
        cliente: clienteObj,
        ubicacion: ubicacionObra,
        responsable: responsable || "",
        materialesCatalogo: materialesSanitizados,
        presupuestoInicialId: presupuestoInicialId || null,
        montoEstimado: presupuestoInicialId ? null : (Number(montoEstimado) || 0),
        productosSubtotal: Math.round(productosSubtotal),
        productosDescuentoTotal: Math.round(productosDescuentoTotal),
        productosTotal: Math.round(productosTotal),
        fechaCreacion: new Date().toISOString(),
      });
      router.push(`/${lang}/obras`);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 py-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Nueva Obra</h1>
          <p className="text-gray-600">Complete los datos para crear una obra</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => window.location.reload()}>
            <RefreshCw className="w-4 h-4 mr-2" /> Actualizar
          </Button>
        </div>
      </div>

      {/* Datos Generales + Ubicación en 2 columnas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Datos Generales</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Cliente */}
          <div>
            <label className="text-sm text-gray-600">Cliente *</label>
            <div className="relative w-full mt-1">
              <div
                className="w-full flex items-center cursor-pointer bg-card border border-default-300 rounded-lg h-10 px-3 text-sm justify-between transition duration-300"
                onClick={() => setDropdownClientesOpen(true)}
                tabIndex={0}
                role="button"
                aria-haspopup="listbox"
                aria-expanded={dropdownClientesOpen}
              >
                <span className="flex-1 truncate">
                  {clienteSeleccionado ? `${clienteSeleccionado.nombre} - ${clienteSeleccionado.telefono || ""}` : "Seleccionar cliente..."}
                </span>
                <div className="flex items-center gap-2">
                  <Button type="button" variant="ghost" size="sm" className="text-primary font-semibold" onClick={(e) => { e.stopPropagation(); setOpenNuevoCliente(true); }} disabled={clientesLoading}>Nuevo</Button>
                  <svg className="w-5 h-5 text-default-600" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.27a.75.75 0 01.02-1.06z" clipRule="evenodd"/></svg>
                </div>
              </div>
              {dropdownClientesOpen && (
                <div className="absolute z-50 min-w-[8rem] overflow-hidden rounded-md border border-default-300 bg-card text-default-900 shadow-md mt-1 max-h-72 w-full">
                  <div className="p-2">
                    <Input type="text" placeholder="Buscar por nombre o teléfono..." value={busquedaCliente} onChange={(e) => setBusquedaCliente(e.target.value)} className="w-full mb-2" autoFocus disabled={clientesLoading} />
                    <div className="divide-y divide-gray-100 max-h-52 overflow-auto">
                      {clientes
                        .filter((c) => {
                          const q = busquedaCliente.trim().toLowerCase();
                          if (!q) return true;
                          return String(c.nombre || "").toLowerCase().includes(q) || String(c.telefono || "").toLowerCase().includes(q);
                        })
                        .map((c) => (
                          <div key={c.id} className="relative flex w-full cursor-pointer select-none items-center rounded-sm py-1.5 px-2 text-sm hover:bg-accent hover:text-accent-foreground" onClick={() => { setClienteId(c.id); setDropdownClientesOpen(false); }} role="option" tabIndex={0}>
                            {c.nombre} - {c.telefono || ""}
                          </div>
                        ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-gray-600">Tipo de Obra</label>
              <Select value={tipoObra} onValueChange={setTipoObra}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccione tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Remodelación">Remodelación</SelectItem>
                  <SelectItem value="Obra Nueva">Obra Nueva</SelectItem>
                  <SelectItem value="Mantenimiento">Mantenimiento</SelectItem>
                  <SelectItem value="Ampliación">Ampliación</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm text-gray-600">Prioridad</label>
              <Select value={prioridad} onValueChange={setPrioridad}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Alta">Alta</SelectItem>
                  <SelectItem value="Media">Media</SelectItem>
                  <SelectItem value="Baja">Baja</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Ubicación */}
      <Card>
        <CardHeader>
          <CardTitle>Ubicación</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-6">
            <label className="inline-flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="origenDireccion"
                checked={usarDireccionCliente}
                onChange={() => setUsarDireccionCliente(true)}
              />
              Usar dirección del cliente
            </label>
            <label className="inline-flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="origenDireccion"
                checked={!usarDireccionCliente}
                onChange={() => setUsarDireccionCliente(false)}
              />
              Ingresar dirección manualmente
            </label>
          </div>

          {usarDireccionCliente ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-3 border border-border rounded-md bg-card/50">
              <div>
                <label className="text-sm text-gray-600">Dirección</label>
                <Input value={clienteSeleccionado?.direccion || ""} readOnly placeholder="Dirección del cliente" />
              </div>
              <div>
                <label className="text-sm text-gray-600">Localidad</label>
                <Input value={clienteSeleccionado?.localidad || ""} readOnly />
              </div>
              <div>
                <label className="text-sm text-gray-600">Provincia</label>
                <Input value={clienteSeleccionado?.provincia || ""} readOnly />
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm text-gray-600">Dirección</label>
                  <Input value={direccion} onChange={(e) => setDireccion(e.target.value)} placeholder="Calle y número" />
                </div>
                <div>
                  <label className="text-sm text-gray-600">Localidad</label>
                  <Input value={localidad} onChange={(e) => setLocalidad(e.target.value)} />
                </div>
                <div>
                  <label className="text-sm text-gray-600">Provincia</label>
                  <Input value={provincia} onChange={(e) => setProvincia(e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="text-sm text-gray-600">Área</label>
                  <Input value={area} onChange={(e) => setArea(e.target.value)} />
                </div>
                <div>
                  <label className="text-sm text-gray-600">Barrio</label>
                  <Input value={barrio} onChange={(e) => setBarrio(e.target.value)} />
                </div>
                <div>
                  <label className="text-sm text-gray-600">Lote</label>
                  <Input value={lote} onChange={(e) => setLote(e.target.value)} />
                </div>
                <div className="md:col-span-1">
                  <label className="text-sm text-gray-600">Descripción</label>
                  <Textarea value={descripcionUbicacion} onChange={(e) => setDescripcionUbicacion(e.target.value)} placeholder="Referencia, piso, etc." />
                </div>
              </div>
            </div>
          )}

          <div>
            <label className="text-sm text-gray-600">Responsable</label>
            <div className="flex items-center gap-2">
              <Select value={responsable} onValueChange={setResponsable}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Seleccione responsable" />
                </SelectTrigger>
                <SelectContent>
                  {responsables.map((r) => (
                    <SelectItem key={r} value={r}>{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" onClick={() => setOpenNuevoResponsable(true)}>+</Button>
            </div>
          </div>
        </CardContent>
      </Card>
      </div>

      {/* Presupuesto y costos */}
      <Card>
        <CardHeader>
          <CardTitle>Presupuesto y costos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm text-gray-600">Presupuesto inicial</label>
            <Select value={presupuestoInicialId} onValueChange={setPresupuestoInicialId}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccione presupuesto" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Sin presupuesto</SelectItem>
                {presupuestosObra.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.numeroPedido || p.id} - {p.cliente?.nombre || ""}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {(!presupuestoInicialId || presupuestoInicialId === "") && (
            <div>
              <label className="text-sm text-gray-600">Monto estimado de gasto (opcional si no hay presupuesto)</label>
              <Input type="number" min={0} value={montoEstimado} onChange={(e) => setMontoEstimado(e.target.value)} placeholder="0" />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Catálogo de materiales (productos) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Filter className="w-5 h-5" /> Materiales a Utilizar</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <div className="flex bg-white rounded-lg p-1 shadow-sm border border-gray-200">
                {categorias.map((cat) => (
                  <button key={cat} type="button" className={`rounded-full px-4 py-1 text-sm mr-2 ${categoriaId === cat ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`} onClick={() => setCategoriaId((prev) => (prev === cat ? "" : cat))}>{cat}</button>
                ))}
              </div>
            </div>
            <div className="flex-1 relative flex items-center gap-2">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input type="text" placeholder="Buscar productos..." value={busquedaProducto} onChange={(e) => setBusquedaProducto(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }} className="w-full pl-10 pr-10 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-card" />
            </div>
          </div>
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
                    const yaAgregado = itemsCatalogo.some((p) => p.id === prod.id);
                    const precio = (() => {
                      if (prod.categoria === "Maderas") return Number(prod.precioPorPie) || 0;
                      if (prod.categoria === "Ferretería") return Number(prod.valorVenta) || 0;
                      return (
                        Number(prod.precioUnidad) ||
                        Number(prod.precioUnidadVenta) ||
                        Number(prod.precioUnidadHerraje) ||
                        Number(prod.precioUnidadQuimico) ||
                        Number(prod.precioUnidadHerramienta) ||
                        0
                      );
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
                              <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">${formatARNumber(precio)}</span>
                            </div>
                            {(prod.unidadMedida || prod.unidad) && (
                              <div className="flex items-center justify-between">
                                <span className="text-xs text-gray-500 dark:text-gray-400">Unidad:</span>
                                <span className="text-xs text-gray-700 dark:text-gray-300">{prod.unidadMedida || prod.unidad}</span>
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
                                agregarProductoCatalogo(prod);
                              }}
                              disabled={yaAgregado}
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
                {totalPaginas > 1 && (
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

      {/* Seleccionados del catálogo (idéntico a ventas) */}
      {itemsCatalogo.length > 0 && (
        <section className="bg-card/60 rounded-xl p-0 border border-default-200 shadow-lg overflow-hidden ring-1 ring-default-200/60">
          <div className="flex items-center justify-between px-4 py-3 border-b bg-gradient-to-r from-default-50 to-default-100">
            <h3 className="text-base md:text-lg font-semibold text-default-900">Productos Seleccionados</h3>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-default-200/60 text-default-700 border border-default-300">
              {itemsCatalogo.length} producto{itemsCatalogo.length !== 1 ? "s" : ""}
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
                {itemsCatalogo.map((p) => {
                  const esMadera = (p.categoria || "").toLowerCase() === "maderas";
                  const sub = (Number(p.precio) || 0) * (1 - (Number(p.descuento) || 0) / 100) * (esMadera && (p.subcategoria === "machimbre" || p.subcategoria === "deck") ? 1 : Number(p.cantidad) || 1);
                  return (
                    <tr key={p.id} className="border-b border-default-300 transition-colors">
                      <td className="p-4 align-middle text-sm text-default-600">
                        {p.categoria && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-default-100 text-default-700 border border-default-200 text-[11px] font-medium">
                            {p.categoria}
                          </span>
                        )}
                      </td>
                      <td className="p-4 align-top text-sm text-default-600">
                        <div className="font-semibold text-default-900">{p.nombre}</div>
                        {p.categoria === "Ferretería" && p.subcategoria && (
                          <div className="flex items-center gap-1 mt-1">
                            <span className="text-xs text-blue-600 font-medium">{p.subcategoria}</span>
                          </div>
                        )}
                        {p.categoria === "Maderas" && (
                          <div className="mt-2 flex flex-wrap items-start gap-3">
                            <div className="inline-block w-fit rounded-md border border-orange-200/60 bg-orange-50/60 p-1.5 align-top">
                              <div className="flex items-center gap-1.5 mb-1">
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-700 text-sm font-semibold">
                                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" clipRule="evenodd"/></svg>
                                  Dimensiones
                                </span>
                                {p.subcategoria === "machimbre" || p.subcategoria === "deck" ? (
                                  <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-orange-100 text-orange-700 text-sm font-semibold">Total {(((p.alto || 0) * (p.largo || 0) * (p.cantidad || 1)).toFixed(2))} m²</span>
                                ) : (
                                  <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-orange-100 text-orange-700 text-sm font-semibold">Volumen {(((p.alto || 0) * (p.ancho || 0) * (p.largo || 0)).toFixed(2))} m³</span>
                                )}
                              </div>
                              {p.subcategoria === "machimbre" || p.subcategoria === "deck" ? (
                                <div className="flex flex-wrap items-end gap-2">
                                  <div className="flex flex-col gap-0.5">
                                    <label className="text-[11px] font-semibold text-orange-700">Alto</label>
                                    <Input type="number" min={0} step="0.01" value={p.alto === "" ? "" : p.alto || ""} onChange={(e) => handleAltoChange(p.id, e.target.value)} className="h-8 w-[80px] rounded-sm border-orange-300 bg-white text-sm px-1.5" />
                                  </div>
                                  <div className="flex flex-col gap-0.5">
                                    <label className="text-[11px] font-semibold text-orange-700">Largo</label>
                                    <Input type="number" min={0} step="0.01" value={p.largo === "" ? "" : p.largo || ""} onChange={(e) => handleLargoChange(p.id, e.target.value)} className="h-8 w-[80px] rounded-sm border-orange-300 bg-white text-sm px-1.5" />
                                  </div>
                                </div>
                              ) : (
                                <div className="flex flex-wrap items-end gap-2">
                                  <div className="flex flex-col gap-0.5">
                                    <label className="text-[11px] font-semibold text-orange-700">Alto</label>
                                    <Input type="number" min={0} step="0.01" value={p.alto === "" ? "" : p.alto || ""} onChange={(e) => handleAltoChange(p.id, e.target.value)} className="h-8 w-[80px] rounded-sm border-orange-300 bg-white text-sm px-1.5" />
                                  </div>
                                  <div className="flex flex-col gap-0.5">
                                    <label className="text-[11px] font-semibold text-orange-700">Ancho</label>
                                    <Input type="number" min={0} step="0.01" value={p.ancho === "" ? "" : p.ancho || ""} onChange={(e) => handleAnchoChange(p.id, e.target.value)} className="h-8 w-[80px] rounded-sm border-orange-300 bg-white text-sm px-1.5" />
                                  </div>
                                  <div className="flex flex-col gap-0.5">
                                    <label className="text-[11px] font-semibold text-orange-700">Largo</label>
                                    <Input type="number" min={0} step="0.01" value={p.largo === "" ? "" : p.largo || ""} onChange={(e) => handleLargoChange(p.id, e.target.value)} className="h-8 w-[80px] rounded-sm border-orange-300 bg-white text-sm px-1.5" />
                                  </div>
                                </div>
                              )}
                            </div>
                            <div className="inline-block w-fit p-1.5 bg-green-50 rounded-md border border-green-200 align-top">
                              <div className="flex items-center gap-1 mb-1">
                                <svg className="w-3 h-3 text-green-600" fill="currentColor" viewBox="0 0 20 20"><path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z"/><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd"/></svg>
                                <span className="text-sm font-semibold text-green-700">Precio</span>
                              </div>
                              <div className="inline-block w-fit">
                                <label className="block text-[11px] font-semibold text-green-700 mb-0.5">Valor</label>
                                <div className="relative">
                                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-sm text-green-600 font-medium">$</span>
                                  <Input type="number" min={0} step="0.01" value={p.precioPorPie === "" ? "" : p.precioPorPie || ""} onChange={(e) => handlePrecioPorPieChange(p.id, e.target.value)} className="h-8 w-[88px] pl-5 pr-2 text-sm border border-green-300 rounded-md bg-white focus:border-green-500 focus:ring-1 focus:ring-green-200 focus:outline-none tabular-nums" />
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </td>
                      <td className="p-4 align-middle text-sm text-default-600">
                        <div className="flex items-center justify-center">
                          <div className="flex items-center bg-white border border-default-300 rounded-lg overflow-hidden shadow-sm">
                            <button type="button" onClick={() => handleDecrementarCantidad(p.id)} className="px-3 py-2 text-default-500 hover:text-default-900 hover:bg-default-100 disabled:opacity-50" disabled={p.cantidad <= 1}>-</button>
                            <input type="number" min={1} value={p.cantidad === "" ? "" : p.cantidad} onChange={(e) => handleCantidadChange(p.id, e.target.value)} className="w-16 text-center text-base md:text-lg font-bold border-0 bg-transparent focus:ring-0 focus:outline-none text-gray-900 tabular-nums" />
                            <button type="button" onClick={() => handleIncrementarCantidad(p.id)} className="px-3 py-2 text-default-500 hover:text-default-900 hover:bg-default-100">+</button>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 align-middle text-sm text-default-600">
                        {esMadera ? (
                          <div className="flex items-center justify-center">
                            <input type="checkbox" checked={!!p.cepilladoAplicado} onChange={(e) => recalcularPreciosMadera(p.id, e.target.checked)} className="w-4 h-4 text-blue-600 bg-white border-default-300 rounded focus:ring-blue-500 focus:ring-2" />
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="p-4 align-middle text-sm text-default-600">
                        <span className="block text-right font-semibold text-default-900 tabular-nums">${formatARNumber(p.precio)}</span>
                      </td>
                      <td className="p-4 align-middle text-sm text-default-600">
                        <div className="relative w-20 md:w-24 mx-auto">
                          <input type="number" min={0} max={100} value={p.descuento === "" ? "" : p.descuento || ""} onChange={(e) => actualizarCampoCatalogo(p.id, "descuento", e.target.value)} className="w-full text-center border border-default-300 rounded-md px-2 py-1 pr-6 bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-200" />
                          <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs text-default-500">%</span>
                        </div>
                      </td>
                      <td className="p-4 align-middle text-right text-sm text-default-900 font-bold tabular-nums">${formatARNumber(sub)}</td>
                      <td className="p-4 align-middle text-center text-sm text-default-600">
                        <Button variant="outline" onClick={() => quitarProductoCatalogo(p.id)} size="sm">Quitar</Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Se eliminan Materiales externos y Herramientas en creación */}

      {/* Documentación y seguimiento (se retiró del alta; se gestiona en detalle) */}
      {/*
      <Card>
        <CardHeader>
          <CardTitle>Documentación y seguimiento</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h4 className="font-semibold mb-2">Links externos</h4>
            <div className="flex gap-2 mb-2">
              <Input placeholder="https://" value={nuevoLink} onChange={(e) => setNuevoLink(e.target.value)} />
              <Button onClick={agregarLink}>Agregar</Button>
            </div>
            <ul className="list-disc pl-6 text-sm">
              {linksExternos.map((link, idx) => (
                <li key={idx} className="flex items-center justify-between pr-2">
                  <span className="truncate max-w-[80%]">{link}</span>
                  <Button size="sm" variant="outline" onClick={() => quitarLink(idx)}>Quitar</Button>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-2">Registro fotográfico</h4>
            <div className="flex gap-2 mb-2">
              <Select value={faseFoto} onValueChange={setFaseFoto}>
                <SelectTrigger className="w-40"><SelectValue placeholder="Fase" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="antes">Antes</SelectItem>
                  <SelectItem value="durante">Durante</SelectItem>
                  <SelectItem value="despues">Después</SelectItem>
                </SelectContent>
              </Select>
              <Input placeholder="URL de imagen" value={urlFoto} onChange={(e) => setUrlFoto(e.target.value)} />
              <Button onClick={agregarFoto}>Agregar</Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {(["antes","durante","despues"]).map((fase) => (
                <div key={fase} className="border rounded p-3 bg-card">
                  <div className="font-semibold capitalize mb-2">{fase}</div>
                  <ul className="list-disc pl-6 text-sm">
                    {(registroFotografico[fase] || []).map((url, idx) => (
                      <li key={idx} className="flex items-center justify-between pr-2">
                        <span className="truncate max-w-[80%]">{url}</span>
                        <Button size="sm" variant="outline" onClick={() => quitarFoto(fase, idx)}>Quitar</Button>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-gray-600">Notas internas</label>
              <Textarea className="min-h-[120px]" value={notasInternas} onChange={(e) => setNotasInternas(e.target.value)} />
            </div>
            <div>
              <label className="text-sm text-gray-600">Notas para cliente</label>
              <Textarea className="min-h-[120px]" value={notasCliente} onChange={(e) => setNotasCliente(e.target.value)} />
            </div>
          </div>
          <div>
            <h4 className="font-semibold mb-2">Tareas</h4>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-2 mb-2">
              <Input className="md:col-span-2" placeholder="Título" value={tareaDraft.titulo} onChange={(e) => setTareaDraft({ ...tareaDraft, titulo: e.target.value })} />
              <Input className="md:col-span-1" placeholder="Responsable" value={tareaDraft.responsable} onChange={(e) => setTareaDraft({ ...tareaDraft, responsable: e.target.value })} />
              <Input className="md:col-span-1" type="date" value={tareaDraft.fechaVencimiento} onChange={(e) => setTareaDraft({ ...tareaDraft, fechaVencimiento: e.target.value })} />
              <Select value={tareaDraft.estado} onValueChange={(v) => setTareaDraft({ ...tareaDraft, estado: v })}>
                <SelectTrigger><SelectValue placeholder="Estado" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Pendiente">Pendiente</SelectItem>
                  <SelectItem value="En progreso">En progreso</SelectItem>
                  <SelectItem value="Completada">Completada</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button size="sm" onClick={agregarTarea}>Agregar tarea</Button>
            <ul className="list-disc pl-6 mt-2 text-sm">
              {tareas.map((t, idx) => (
                <li key={idx} className="flex items-center justify-between pr-2">
                  <span className="truncate max-w-[75%]">{t.titulo} — {t.responsable || "(sin responsable)"} — {t.fechaVencimiento || "(sin fecha)"} — {t.estado}</span>
                  <Button size="sm" variant="outline" onClick={() => quitarTarea(idx)}>Quitar</Button>
                </li>
              ))}
            </ul>
          </div>
        </CardContent>
      </Card>
      */}

      {/* Cobranzas (se retiró del alta; se gestiona en detalle) */}
      {/*
      <Card>
        <CardHeader>
          <CardTitle>Cobranzas</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-sm text-gray-600">Forma de pago</label>
            <Input value={formaPago} onChange={(e) => setFormaPago(e.target.value)} placeholder="Efectivo, Transferencia, etc." />
          </div>
          <div>
            <label className="text-sm text-gray-600">Seña</label>
            <Input type="number" value={senia} onChange={(e) => setSenia(e.target.value)} />
          </div>
          <div className="md:col-span-3">
            <div className="flex items-center gap-2 mb-2">
              <Input className="w-40" type="date" value={pagoDraft.fecha} onChange={(e) => setPagoDraft({ ...pagoDraft, fecha: e.target.value })} />
              <Input className="w-40" type="number" placeholder="Monto" value={pagoDraft.monto} onChange={(e) => setPagoDraft({ ...pagoDraft, monto: e.target.value })} />
              <Input className="flex-1" placeholder="Método" value={pagoDraft.metodo} onChange={(e) => setPagoDraft({ ...pagoDraft, metodo: e.target.value })} />
              <Button onClick={agregarPago}>Agregar pago</Button>
            </div>
            <ul className="list-disc pl-6 text-sm">
              {historialPagos.map((p, idx) => (
                <li key={idx} className="flex items-center justify-between pr-2">
                  <span>{p.fecha} — ${formatARNumber(p.monto)} — {p.metodo}</span>
                  <Button size="sm" variant="outline" onClick={() => quitarPago(idx)}>Quitar</Button>
                </li>
              ))}
            </ul>
          </div>
          <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-4 bg-primary/5 border border-primary/20 rounded-lg px-6 py-3 text-lg shadow-sm font-semibold">
            <div>Pagos: <span className="font-bold">$ {formatARNumber(totalPagos)}</span></div>
            <div>Descuentos: <span className="font-bold">$ {formatARNumber(descuentos)}</span></div>
            <div>Saldo pendiente: <span className="font-bold text-primary">$ {formatARNumber(saldoPendiente)}</span></div>
          </div>
        </CardContent>
      </Card>
      */}

      {/* Acciones */}
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => router.push(`/${lang}/obras`)}>Cancelar</Button>
        <Button onClick={handleGuardarObra} disabled={guardando || !clienteId}>
          {guardando ? "Guardando..." : "Crear Obra"}
        </Button>
      </div>

      {/* Modal Nuevo Cliente (idéntico a ventas) */}
      <Dialog open={openNuevoCliente} onOpenChange={setOpenNuevoCliente}>
        <DialogContent className="w-[95vw] max-w-[600px] max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Icon icon="heroicons:user-plus" className="w-6 h-6" />
              Agregar Cliente
            </DialogTitle>
            <DialogDescription className="text-base text-default-600">
              Complete los datos del nuevo cliente para agregarlo al sistema.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col h-full">
            <div className="flex border-b border-gray-200 mb-4">
              <button type="button" className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTabCliente === "datos" ? "border-blue-500 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"}`} onClick={() => setActiveTabCliente("datos")}>
                Datos Básicos
              </button>
              <button type="button" className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTabCliente === "ubicacion" ? "border-blue-500 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"}`} onClick={() => setActiveTabCliente("ubicacion")}>
                Ubicación
              </button>
              <button type="button" className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTabCliente === "adicional" ? "border-blue-500 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"}`} onClick={() => setActiveTabCliente("adicional")}>
                Adicional
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              {activeTabCliente === "datos" && (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <input type="checkbox" id="esClienteViejo" checked={nuevoCliente.esClienteViejo} onChange={(e) => setNuevoCliente({ ...nuevoCliente, esClienteViejo: e.target.checked })} className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600" />
                    <label htmlFor="esClienteViejo" className="text-sm font-medium text-blue-800 dark:text-blue-200">¿Es un cliente antiguo?</label>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nombre *</label>
                      <Input placeholder="Nombre completo" className="w-full" value={nuevoCliente.nombre} onChange={(e) => setNuevoCliente({ ...nuevoCliente, nombre: e.target.value })} required />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">CUIT / DNI</label>
                      <Input placeholder="CUIT o DNI" className="w-full" value={nuevoCliente.cuit || ""} onChange={(e) => setNuevoCliente({ ...nuevoCliente, cuit: e.target.value })} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Teléfono *</label>
                      <Input placeholder="Teléfono" className="w-full" value={nuevoCliente.telefono} onChange={(e) => setNuevoCliente({ ...nuevoCliente, telefono: e.target.value })} required />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
                      <Input placeholder="Email" type="email" className="w-full" value={nuevoCliente.email} onChange={(e) => setNuevoCliente({ ...nuevoCliente, email: e.target.value })} />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Dirección *</label>
                      <Input placeholder="Dirección completa" className="w-full" value={nuevoCliente.direccion} onChange={(e) => setNuevoCliente({ ...nuevoCliente, direccion: e.target.value })} required />
                    </div>
                  </div>
                </div>
              )}
              {activeTabCliente === "ubicacion" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Localidad</label>
                      <Input placeholder="Localidad" className="w-full" value={nuevoCliente.localidad || ""} onChange={(e) => setNuevoCliente({ ...nuevoCliente, localidad: e.target.value })} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Partido</label>
                      <Input placeholder="Partido" className="w-full" value={nuevoCliente.partido || ""} onChange={(e) => setNuevoCliente({ ...nuevoCliente, partido: e.target.value })} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Barrio</label>
                      <Input placeholder="Barrio" className="w-full" value={nuevoCliente.barrio || ""} onChange={(e) => setNuevoCliente({ ...nuevoCliente, barrio: e.target.value })} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Área</label>
                      <Input placeholder="Área" className="w-full" value={nuevoCliente.area || ""} onChange={(e) => setNuevoCliente({ ...nuevoCliente, area: e.target.value })} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Lote</label>
                      <Input placeholder="Lote" className="w-full" value={nuevoCliente.lote || ""} onChange={(e) => setNuevoCliente({ ...nuevoCliente, lote: e.target.value })} />
                    </div>
                  </div>
                </div>
              )}
              {activeTabCliente === "adicional" && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Descripción</label>
                    <Textarea placeholder="Información adicional sobre el cliente" className="w-full min-h-[120px]" value={nuevoCliente.descripcion || ""} onChange={(e) => setNuevoCliente({ ...nuevoCliente, descripcion: e.target.value })} />
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-gray-200">
              <div className="flex gap-2">
                {activeTabCliente !== "datos" && (
                  <Button type="button" variant="outline" onClick={() => { if (activeTabCliente === "ubicacion") setActiveTabCliente("datos"); if (activeTabCliente === "adicional") setActiveTabCliente("ubicacion"); }} className="text-sm">Anterior</Button>
                )}
                {activeTabCliente !== "adicional" && (
                  <Button type="button" variant="outline" onClick={() => { if (activeTabCliente === "datos") setActiveTabCliente("ubicacion"); if (activeTabCliente === "ubicacion") setActiveTabCliente("adicional"); }} disabled={(activeTabCliente === "datos" && (!nuevoCliente.nombre || !nuevoCliente.direccion || !nuevoCliente.telefono)) || (activeTabCliente === "ubicacion" && (!nuevoCliente.nombre || !nuevoCliente.direccion || !nuevoCliente.telefono))} className="text-sm">Siguiente</Button>
                )}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setOpenNuevoCliente(false)} className="text-sm">Cancelar</Button>
                <Button variant="default" onClick={handleGuardarNuevoCliente} disabled={!nuevoCliente.nombre || !nuevoCliente.direccion || !nuevoCliente.telefono} className="text-sm">Guardar Cliente</Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal: nuevo responsable */}
      <Dialog open={openNuevoResponsable} onOpenChange={setOpenNuevoResponsable}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Agregar responsable</DialogTitle>
            <DialogDescription>Ingrese el nombre del nuevo responsable para reutilizarlo en futuras obras.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Input value={nuevoResponsable} onChange={(e) => setNuevoResponsable(e.target.value)} placeholder="Nombre" />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setOpenNuevoResponsable(false)}>Cancelar</Button>
            <Button onClick={() => {
              const v = (nuevoResponsable || "").trim();
              if (!v) return;
              if (!responsables.includes(v)) setResponsables([...responsables, v]);
              setResponsable(v);
              setNuevoResponsable("");
              setOpenNuevoResponsable(false);
            }}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}


