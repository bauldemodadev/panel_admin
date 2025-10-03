"use client";
import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  columnsPresupuestos,
  columnsVentas,
} from "../(invoice)/invoice-list/invoice-list-table/components/columns-enhanced";
import { DataTableEnhanced } from "@/components/ui/data-table-enhanced";
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
import { Loader2, CheckCircle, AlertCircle, Trash2, X, AlertTriangle, Info } from "lucide-react";
import { db } from "@/lib/firebase";
import {
  collection,
  getDocs,
  addDoc,
  doc,
  updateDoc,
  increment,
  serverTimestamp,
  query,
  where,
  limit,
  orderBy,
  startAfter,
  onSnapshot,
} from "firebase/firestore";
import { useRouter, useParams } from "next/navigation";
import { Icon } from "@iconify/react";
import { useAuth } from "@/provider/auth.provider";
import { computeTotals } from "@/lib/pricing";

export function FormularioVentaPresupuesto({ tipo, onClose, onSubmit }) {
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState(null);
  const [submitMessage, setSubmitMessage] = useState("");

  // Esquema Yup para presupuesto
  const schemaPresupuesto = yup.object().shape({
    fecha: yup.string().required("La fecha es obligatoria"),
    cliente: yup.object().shape({
      nombre: yup.string().required("Obligatorio"),
      email: yup.string().email("Email inválido").notRequired(),
      telefono: yup.string().required("Obligatorio"),
      direccion: yup.string().required("Obligatorio"),
      cuit: yup.string().notRequired(),
    }),
    items: yup
      .array()
      .of(
        yup.object().shape({
          descripcion: yup.string().required("Obligatorio"),
          cantidad: yup.number().min(1, "Mínimo 1").required("Obligatorio"),
          precio: yup
            .number()
            .min(0, "No puede ser negativo")
            .required("Obligatorio"),
          unidad: yup.string().required("Obligatorio"),
          moneda: yup.string().required("Obligatorio"),
          descuento: yup.number().min(0).max(100),
        })
      )
      .min(1, "Agrega al menos un ítem"),
    tipoEnvio: yup.string().required("Selecciona el tipo de envío"),
    costoEnvio: yup
      .number()
      .transform((value, originalValue) =>
        originalValue === "" || originalValue === undefined ? undefined : value
      )
      .nullable()
      .when("tipoEnvio", {
        is: (val) => val && val !== "retiro_local",
        then: (s) => s.required("La cotización del envío es obligatoria"),
        otherwise: (s) => s.notRequired(),
      }),
  });

  // Esquema Yup para venta
  const schemaVenta = yup.object().shape({
    fecha: yup.string().required("La fecha es obligatoria"),
    clienteId: yup.string().required("Debe seleccionar un cliente"),
    cliente: yup.object().shape({
      nombre: yup.string().required("Obligatorio"),
      email: yup.string().email("Email inválido").notRequired(),
      telefono: yup.string().required("Obligatorio"),
      direccion: yup.string().required("Obligatorio"),
      cuit: yup.string().notRequired(),
    }),
    items: yup
      .array()
      .of(
        yup.object().shape({
          descripcion: yup.string().required("Obligatorio"),
          cantidad: yup.number().min(1, "Mínimo 1").required("Obligatorio"),
          precio: yup
            .number()
            .min(0, "No puede ser negativo")
            .required("Obligatorio"),
          unidad: yup.string().required("Obligatorio"),
          moneda: yup.string().required("Obligatorio"),
          descuento: yup.number().min(0).max(100),
        })
      )
      .min(1, "Agrega al menos un ítem"),
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
            .required("Obligatorio"),
        otherwise: (s) => s.notRequired().nullable(true),
      }),
    prioridad: yup.string().when("tipoEnvio", {
      is: (val) => val && val !== "retiro_local",
      then: (s) => s.required("Selecciona la prioridad"),
      otherwise: (s) => s.notRequired(),
    }),
    tipoEnvio: yup.string().required("Selecciona el tipo de envío"),
    usarDireccionCliente: yup.boolean().default(true),
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
    transportista: yup.string().when("tipoEnvio", {
      is: (val) => val && val !== "retiro_local",
      then: (s) => s.required("Selecciona el transportista"),
      otherwise: (s) => s.notRequired(),
    }),
    costoEnvio: yup
      .number()
      .transform((value, originalValue) =>
        originalValue === "" || originalValue === undefined ? undefined : value
      )
      .nullable()
      .notRequired(),
    observaciones: yup.string().notRequired(),
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

  const schema = tipo === "presupuesto" ? schemaPresupuesto : schemaVenta;

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
    watch,
  } = useForm({
    resolver: yupResolver(schema),
    defaultValues: {
      fecha: new Date().toISOString().split("T")[0],
      clienteId: "",
      cliente: { nombre: "", email: "", telefono: "", direccion: "", cuit: "" },
      items: [],
      usarDireccionCliente: true,
    },
  });

  const items = watch("items");
  const tipoEnvio = watch("tipoEnvio");
  const costoEnvio = watch("costoEnvio");
  const [clienteId, setClienteId] = useState("");
  const [clientesState, setClientesState] = useState([]);
  const [clientesLoading, setClientesLoading] = useState(true);
  const clienteSeleccionado = clientesState.find((c) => c.id === clienteId);
  const [openNuevoCliente, setOpenNuevoCliente] = useState(false);
  const [nuevoCliente, setNuevoCliente] = useState({
    nombre: "",
    cuit: "",
    direccion: "",
    telefono: "",
    email: "",
    localidad: "",
    esClienteViejo: false,
  });

  const [productosSeleccionados, setProductosSeleccionados] = useState([]);
  const [productosState, setProductosState] = useState([]);
  const [productosPorCategoria, setProductosPorCategoria] = useState({});
  const [categoriasState, setCategoriasState] = useState([]);
  const [pagoEnEfectivo, setPagoEnEfectivo] = useState(false);
  const [productosLoading, setProductosLoading] = useState(true);
  // Búsqueda en memoria: no usamos búsqueda remota ni carga global aparte

  // Suscripción en tiempo real a todos los productos (idéntico a productos/page.jsx)
  useEffect(() => {
    setProductosLoading(true);
    const qRef = query(collection(db, "productos"), orderBy("nombre"));
    const unsubscribe = onSnapshot(
      qRef,
      (snap) => {
      const productos = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setProductosState(productos);
      const agrupados = {};
      productos.forEach((p) => {
        if (!agrupados[p.categoria]) agrupados[p.categoria] = [];
        agrupados[p.categoria].push(p);
      });
      setProductosPorCategoria(agrupados);
      setCategoriasState(Object.keys(agrupados));
      setProductosLoading(false);
      },
      () => setProductosLoading(false)
    );
    return () => unsubscribe();
  }, []);

  // Estados de filtros y categoría (deben declararse antes de efectos que los usan)
  const [categoriaId, setCategoriaId] = useState("");
  const [busquedaProducto, setBusquedaProducto] = useState("");
  const [filtroTipoMadera, setFiltroTipoMadera] = useState("");
  const [filtroSubCategoria, setFiltroSubCategoria] = useState("");

  // Búsqueda local con debounce + deferred (sin endpoint)
  const [busquedaDebounced, setBusquedaDebounced] = useState("");
  useEffect(() => {
    const id = setTimeout(() => setBusquedaDebounced(busquedaProducto), 100);
    return () => clearTimeout(id);
  }, [busquedaProducto]);
  const busquedaDefer = React.useDeferredValue(busquedaDebounced);

  // Sin carga global extra: la suscripción ya provee todo el catálogo

  // Sin búsqueda remota: todo se filtra en memoria

  

  // Sin cache por categoría: se deriva desde la suscripción global

  

  // Estados para paginación
  const [paginaActual, setPaginaActual] = useState(1);
  const [productosPorPagina] = useState(12); // Mostrar 12 productos por página
  // Mejora de fluidez al paginar
  const [isPending, startTransition] = React.useTransition();

  // Al escribir en el input ya se actualiza busquedaDebounced; no se requiere botón

  const handleAgregarProducto = useCallback((producto) => {
    // Intentar resolver el producto real desde distintas fuentes locales (estado inicial o agrupación por categoría)
    let real = productosState.find((p) => p.id === producto.id);
    if (!real && categoriaId && productosPorCategoria[categoriaId]) {
      real = (productosPorCategoria[categoriaId] || []).find((p) => p.id === producto.id);
    }
    // Si aún no se encontró, usar el objeto recibido (proviene del catálogo remoto)
    if (!real) {
      real = producto;
    }
    if (!productosSeleccionados.some((p) => p.id === real.id)) {
      let precio;

      if (real.categoria === "Maderas") {
        let alto = Number(real.alto) || 0;
        let ancho = Number(real.ancho) || 0;
        let largo = Number(real.largo) || 0;
        let precioPorPie = Number(real.precioPorPie) || 0;

        // Verificar si es machimbre o deck para usar cálculo especial
        if (real.unidad === "M2" || real.unidadMedida === "M2") {
          if (ancho > 0 && largo > 0 && precioPorPie > 0) {
            // Para machimbre, el precio se calcula por m2 y luego se multiplica por cantidad
            precio = calcularPrecioMachimbre({
              alto,
              largo,
              cantidad: 1, // Cantidad inicial por defecto
              precioPorPie,
            });
          } else {
            setSubmitStatus("error");
            setSubmitMessage(
              "El producto machimbre/deck no tiene dimensiones válidas en la base de datos."
            );
            return;
          }
        } else if (real.unidad === "Unidad" || real.unidadMedida === "Unidad") {
          // Madera por unidad: usar precioPorPie como precio unitario directo
          if (precioPorPie > 0) {
            // Redondear a centenas para consistencia
            precio = Math.round(precioPorPie / 100) * 100;
          } else {
            setSubmitStatus("error");
            setSubmitMessage(
              "El producto de madera por unidad no tiene un precio válido."
            );
            return;
          }
        } else {
          if (alto > 0 && ancho > 0 && largo > 0 && precioPorPie > 0) {
            precio = calcularPrecioCorteMadera({
              alto,
              ancho,
              largo,
              precioPorPie,
            });
          } else {
            setSubmitStatus("error");
            setSubmitMessage(
              "El producto de madera no tiene dimensiones válidas en la base de datos."
            );
            return;
          }
        }
      } else {
        if (real.categoria === "Ferretería") {
          precio = real.valorVenta || 0;
        } else {
          precio =
            real.precioUnidad ||
            real.precioUnidadVenta ||
            real.precioUnidadHerraje ||
            real.precioUnidadQuimico ||
            real.precioUnidadHerramienta ||
            0;
        }
      }

      setProductosSeleccionados([
        ...productosSeleccionados,
        {
          id: real.id,
          nombre: real.nombre,
          precio,
          unidad:
            real.unidadMedida ||
            real.unidadVenta ||
            real.unidadVentaHerraje ||
            real.unidadVentaQuimico ||
            real.unidadVentaHerramienta,
          stock: real.stock,
          cantidad: 1, // Cantidad de paquetes (siempre empieza en 1)
          descuento: 0,
          categoria: real.categoria,
          alto: Number(real.alto) || 0,
          ancho: Number(real.ancho) || 0,
          largo: Number(real.largo) || 0,
          precioPorPie: Number(real.precioPorPie) || 0,
          // Para machimbre ya no usamos cantidadPaquete, solo cantidad
          cepilladoAplicado: false, // Por defecto sin cepillado
          tipoMadera: real.tipoMadera || "",
          subcategoria: real.subcategoria || "",
        },
      ]);
    }
  }, [productosState, productosSeleccionados, productosPorCategoria, categoriaId]);
  const handleQuitarProducto = (id) => {
    setProductosSeleccionados(
      productosSeleccionados.filter((p) => p.id !== id)
    );
  };
  // Función helper para manejar valores numéricos
  const parseNumericValue = (value) => {
    if (value === "" || value === null || value === undefined) {
      return "";
    }
    const num = Number(value);
    return isNaN(num) ? "" : num;
  };

  const handleCantidadChange = (id, cantidad) => {
    const parsedCantidad = parseNumericValue(cantidad);

    setProductosSeleccionados(
      productosSeleccionados.map((p) => {
        if (p.id === id) {
          // Si es machimbre o deck, recalcular precio
          if (
            p.categoria === "Maderas" && p.unidad === "M2"
          ) {
            const precioBase = calcularPrecioMachimbre({
              alto: p.alto,
              largo: p.largo,
              cantidad: parsedCantidad === "" ? 1 : parsedCantidad,
              precioPorPie: p.precioPorPie,
            });

            const precioFinal = p.cepilladoAplicado
              ? precioBase * 1.066
              : precioBase;

            const precioRedondeado = Math.round(precioFinal / 100) * 100;

            return {
              ...p,
              cantidad: parsedCantidad === "" ? 1 : parsedCantidad,
              precio: precioRedondeado,
            };
          }
          // Para otros productos, solo cambiar cantidad
          return { ...p, cantidad: parsedCantidad === "" ? 1 : parsedCantidad };
        }
        return p;
      })
    );
  };
  const handleIncrementarCantidad = (id) => {
    setProductosSeleccionados(
      productosSeleccionados.map((p) => {
        if (p.id === id) {
          const nuevaCantidad = Number(p.cantidad) + 1;

          // Si es machimbre o deck, recalcular precio
          if (
            p.categoria === "Maderas" && p.unidad === "M2"
          ) {
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
      })
    );
  };
  const handleDecrementarCantidad = (id) => {
    setProductosSeleccionados(
      productosSeleccionados.map((p) => {
        if (p.id === id) {
          const nuevaCantidad = Math.max(1, Number(p.cantidad) - 1);

          // Si es machimbre o deck, recalcular precio
          if (
            p.categoria === "Maderas" && p.unidad === "M2"
          ) {
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
      })
    );
  };
  const handleDescuentoChange = (id, descuento) => {
    const parsedDescuento = parseNumericValue(descuento);
    
    setProductosSeleccionados(
      productosSeleccionados.map((p) =>
        p.id === id ? { ...p, descuento: parsedDescuento === "" ? 0 : parsedDescuento } : p
      )
    );
  };
  const handleNombreChange = (id, nombre) => {
    setProductosSeleccionados(
      productosSeleccionados.map((p) =>
        p.id === id ? { ...p, nombre: nombre } : p
      )
    );
  };
  const handlePrecioChange = (id, precio) => {
    const parsedPrecio = parseNumericValue(precio);
    
    setProductosSeleccionados(
      productosSeleccionados.map((p) =>
        p.id === id ? { ...p, precio: parsedPrecio === "" ? 0 : parsedPrecio } : p
      )
    );
  };

  const handlePagoEnEfectivoChange = (checked) => {
    setPagoEnEfectivo(checked);
    
    // Si se activa el pago en efectivo, bloquear forma de pago y setear a "efectivo"
    if (checked) {
      setValue("formaPago", "efectivo");
    }
  };

  const recalcularPreciosMadera = (id, aplicarCepillado) => {
    setProductosSeleccionados(
      productosSeleccionados.map((p) => {
        if (p.id === id && p.categoria === "Maderas") {
          let precioBase;

          if (p.unidad === "M2") {
            precioBase = calcularPrecioMachimbre({
              alto: p.alto,
              largo: p.largo,
              cantidad: p.cantidad || 1,
              precioPorPie: p.precioPorPie,
            });
          } else {
            precioBase = calcularPrecioCorteMadera({
              alto: p.alto,
              ancho: p.ancho,
              largo: p.largo,
              precioPorPie: p.precioPorPie,
            });
          }

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
      })
    );
  };

  const handlePrecioPorPieChange = (id, nuevoPrecioPorPie) => {
    const parsedPrecioPorPie = parseNumericValue(nuevoPrecioPorPie);
    
    setProductosSeleccionados(
      productosSeleccionados.map((p) => {
        if (p.id === id && p.categoria === "Maderas") {
          let precioBase;

          if (p.unidad === "M2") {
            precioBase = calcularPrecioMachimbre({
              alto: p.alto,
              largo: p.largo,
              cantidad: p.cantidad || 1,
              precioPorPie: parsedPrecioPorPie === "" ? 0 : parsedPrecioPorPie,
            });
          } else {
            precioBase = calcularPrecioCorteMadera({
              alto: p.alto,
              ancho: p.ancho,
              largo: p.largo,
              precioPorPie: parsedPrecioPorPie === "" ? 0 : parsedPrecioPorPie,
            });
          }

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
      })
    );
  };

  // Función para manejar cambios en alto para machimbre/deck
  const handleAltoChange = (id, nuevoAlto) => {
    const parsedAlto = parseNumericValue(nuevoAlto);
    
    setProductosSeleccionados(
      productosSeleccionados.map((p) => {
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
      })
    );
  };

  // Función para manejar cambios en ancho para machimbre/deck
  const handleAnchoChange = (id, nuevoAncho) => {
    const parsedAncho = parseNumericValue(nuevoAncho);
    
    setProductosSeleccionados(
      productosSeleccionados.map((p) => {
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
      })
    );
  };

  // Función para manejar cambios en largo para machimbre/deck
  const handleLargoChange = (id, nuevoLargo) => {
    const parsedLargo = parseNumericValue(nuevoLargo);
    
    setProductosSeleccionados(
      productosSeleccionados.map((p) => {
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
      })
    );
  };

  // Funciones para manejar cambios en dimensiones para maderas normales (no machimbres/deck)
  const handleAltoChangeMadera = (id, nuevoAlto) => {
    const parsedAlto = parseNumericValue(nuevoAlto);
    
    setProductosSeleccionados(
      productosSeleccionados.map((p) => {
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
      })
    );
  };

  const handleAnchoChangeMadera = (id, nuevoAncho) => {
    const parsedAncho = parseNumericValue(nuevoAncho);
    
    setProductosSeleccionados(
      productosSeleccionados.map((p) => {
        if (
          p.id === id &&
          p.categoria === "Maderas" &&
          p.unidad !== "M2"
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
      })
    );
  };

  const handleLargoChangeMadera = (id, nuevoLargo) => {
    const parsedLargo = parseNumericValue(nuevoLargo);
    
    setProductosSeleccionados(
      productosSeleccionados.map((p) => {
        if (
          p.id === id &&
          p.categoria === "Maderas" &&
          p.unidad !== "M2"
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
      })
    );
  };

  const handlePrecioPorPieChangeMadera = (id, nuevoPrecioPorPie) => {
    const parsedPrecioPorPie = parseNumericValue(nuevoPrecioPorPie);
    
    setProductosSeleccionados(
      productosSeleccionados.map((p) => {
        if (
          p.id === id &&
          p.categoria === "Maderas" &&
          p.unidad !== "M2"
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
      })
    );
  };

  // Obtener tipos de madera únicos (memoizado)
  const tiposMadera = useMemo(() => {
    return [
    ...new Set(
      productosState
        .filter((p) => p.categoria === "Maderas" && p.tipoMadera)
        .map((p) => p.tipoMadera)
    ),
  ].filter(Boolean);
  }, [productosState]);

  // Obtener subcategorías de ferretería únicas (memoizado)
  const subCategoriasFerreteria = useMemo(() => {
    return [
    ...new Set(
      productosState
        .filter((p) => p.categoria === "Ferretería" && p.subCategoria)
        .map((p) => p.subCategoria)
    ),
  ].filter(Boolean);
  }, [productosState]);

  const subtotal = productosSeleccionados.reduce(
    (acc, p) => {
      // Para machimbre y deck, el precio ya incluye la cantidad
      if (p.unidad === "M2") {
        return acc + Number(p.precio);
      } else {
        return acc + Number(p.precio) * Number(p.cantidad);
      }
    },
    0
  );
  const descuentoTotal = productosSeleccionados.reduce(
    (acc, p) => acc + Number(p.descuento) * Number(p.cantidad),
    0
  );

  // Calcular descuento por pago en efectivo (10% sobre el subtotal)
  const descuentoEfectivo = pagoEnEfectivo ? subtotal * 0.1 : 0;

  const costoEnvioCalculado =
    tipoEnvio &&
    tipoEnvio !== "retiro_local" &&
    costoEnvio !== undefined &&
    costoEnvio !== "" &&
    !isNaN(Number(costoEnvio))
      ? Number(costoEnvio)
      : 0;
  const total = subtotal - descuentoTotal - descuentoEfectivo + costoEnvioCalculado;

  const handleClienteChange = (val) => {
    if (val === "nuevo") {
      setOpenNuevoCliente(true);
    } else {
      setClienteId(val);
      setValue("clienteId", val);
      const clienteObj = clientesState.find((c) => c.id === val);
      if (clienteObj) {
        setValue("cliente", {
          nombre: (clienteObj.nombre || "").toUpperCase(),
          email: (clienteObj.email || "").toUpperCase(),
          telefono: (clienteObj.telefono || "").toUpperCase(),
          direccion: (clienteObj.direccion || "").toUpperCase(),
          cuit: (clienteObj.cuit || "").toUpperCase(),
        });
      }
    }
  };

  React.useEffect(() => {
    if (clienteSeleccionado) {
      setValue("cliente", {
        nombre: (clienteSeleccionado.nombre || "").toUpperCase(),
        email: (clienteSeleccionado.email || "").toUpperCase(),
        telefono: (clienteSeleccionado.telefono || "").toUpperCase(),
        direccion: (clienteSeleccionado.direccion || "").toUpperCase(),
        cuit: (clienteSeleccionado.cuit || "").toUpperCase(),
      });
    }
  }, [clienteSeleccionado, setValue]);

  React.useEffect(() => {
    setValue(
      "items",
      productosSeleccionados.map((p) => ({
        descripcion: p.nombre,
        cantidad: p.cantidad,
        precio: p.precio,
        unidad: p.unidad,
        moneda: "$",
        descuento: p.descuento || 0,
        categoria: p.categoria,
        // Agregar propiedades específicas de madera
        ...(p.categoria === "Maderas" && {
          alto: Number(p.alto) || 0,
          ancho: Number(p.ancho) || 0,
          largo: Number(p.largo) || 0,
          precioPorPie: Number(p.precioPorPie) || 0,
          cepilladoAplicado: p.cepilladoAplicado || false,
        }),
      }))
    );
  }, [productosSeleccionados, setValue]);

  useEffect(() => {
    const fetchClientes = async () => {
      setClientesLoading(true);
      const snap = await getDocs(collection(db, "clientes"));
      setClientesState(snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
      setClientesLoading(false);
    };
    fetchClientes();
  }, []);

  const [hasSubmitted, setHasSubmitted] = useState(false);

  const handleFormSubmit = async (data) => {
    setHasSubmitted(true);
    console.log("[DEBUG] handleFormSubmit - data recibida:", data);
    setSubmitStatus(null);
    setSubmitMessage("");

    if (!clienteId) {
      setSubmitStatus("error");
      setSubmitMessage("Debe seleccionar un cliente");
      return;
    }
    if (productosSeleccionados.length === 0) {
      setSubmitStatus("error");
      setSubmitMessage("Debe agregar al menos un producto");
      return;
    }
    const productosInvalidos = productosSeleccionados.filter(
      (p) => p.cantidad <= 0
    );
    if (productosInvalidos.length > 0) {
      setSubmitStatus("error");
      setSubmitMessage(
        "Todos los productos deben tener una cantidad mayor a 0"
      );
      return;
    }
    setIsSubmitting(true);
    try {
      const productosLimpios = productosSeleccionados.map((p) => {
        const obj = {
          id: p.id,
          nombre: p.nombre,
          cantidad: p.cantidad,
          precio: p.precio,
          unidad: p.unidad,
          descuento: p.descuento || 0,
          categoria: p.categoria,
        };
        if (p.categoria === "Maderas") {
          obj.alto = Number(p.alto) || 0;
          obj.ancho = Number(p.ancho) || 0;
          obj.largo = Number(p.largo) || 0;
          obj.precioPorPie = Number(p.precioPorPie) || 0;
          obj.cepilladoAplicado = p.cepilladoAplicado || false; // Agregar propiedad de cepillado
        }
        return obj;
      });
      let cleanData = { ...data };
      if (cleanData.tipoEnvio === "retiro_local") {
        cleanData.fechaEntrega = undefined;
        cleanData.rangoHorario = undefined;
        cleanData.transportista = undefined;
        cleanData.direccionEnvio = undefined;
        cleanData.localidadEnvio = undefined;
        cleanData.costoEnvio = undefined;
      }

      // Lógica para manejar montoAbonado y estado de pago
      let montoAbonadoFinal = cleanData.montoAbonado || 0;
      let estadoPagoFinal = "pendiente";

      if (tipo === "venta") {
        const esPagoParcial = cleanData.pagoParcial || false;
        const esPagoPendiente = cleanData.pagoPendiente || false;

        if (esPagoPendiente) {
          // Forzar pendiente: no tomar montoAbonado y marcar 0
          montoAbonadoFinal = 0;
          estadoPagoFinal = "pendiente";
        } else if (!esPagoParcial) {
          // Si NO es pago parcial → montoAbonado = total y estado = "pagado"
          montoAbonadoFinal = total;
          estadoPagoFinal = "pagado";
        } else {
          // Si ES pago parcial → usar el valor del formulario
          montoAbonadoFinal = cleanData.montoAbonado || 0;
          if (montoAbonadoFinal >= total) {
            estadoPagoFinal = "pagado";
          } else if (montoAbonadoFinal > 0) {
            estadoPagoFinal = "parcial";
          } else {
            estadoPagoFinal = "pendiente";
          }
        }
      }

      const formData =
        tipo === "presupuesto"
          ? {
              fecha: cleanData.fecha,
              cliente: cleanData.cliente,
              items: productosLimpios,
              productos: productosLimpios,
              subtotal: subtotal,
              descuentoTotal: descuentoTotal,
              descuentoEfectivo: descuentoEfectivo,
              pagoEnEfectivo: pagoEnEfectivo,
              total: total,
              fechaCreacion: new Date().toISOString(),
              tipo: tipo,
              vendedor: user?.email || "Usuario no identificado",
              // Agregar campos de envío
              tipoEnvio: cleanData.tipoEnvio || "",
              costoEnvio:
                cleanData.tipoEnvio && cleanData.tipoEnvio !== "retiro_local"
                  ? cleanData.costoEnvio !== undefined &&
                    cleanData.costoEnvio !== ""
                    ? Number(cleanData.costoEnvio)
                    : undefined
                  : undefined,
            }
          : {
              ...cleanData,
              clienteId: clienteId || cleanData.clienteId,
              productos: productosLimpios,
              subtotal: subtotal,
              descuentoTotal: descuentoTotal,
              descuentoEfectivo: descuentoEfectivo,
              pagoEnEfectivo: pagoEnEfectivo,
              total: total,
              montoAbonado: montoAbonadoFinal,
              estadoPago: estadoPagoFinal,
              fechaCreacion: new Date().toISOString(),
              tipo: tipo,
              vendedor: user?.email || "Usuario no identificado",
            };
      console.log("Datos preparados para envío:", formData);
      await onSubmit(formData);
      // Dejar la navegación al onSubmit de la página caller; no cerrar aquí
      setSubmitStatus("success");
      setSubmitMessage(`${tipo === "presupuesto" ? "Presupuesto" : "Venta"} guardado exitosamente`);
    } catch (error) {
      console.error("Error al guardar:", error);
      setSubmitStatus("error");
      setSubmitMessage(`Error al guardar: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting && onClose) {
      onClose();
    }
  };

  // Función para normalizar texto (reutilizable)
  const normalizarTexto = (texto) => {
    return (texto || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // quitar acentos/diacríticos
      .replace(/\s+/g, "");
  };

  // Función para filtrar productos optimizada con useMemo
  const productosFiltrados = useMemo(() => {
    let fuente;
    const hayBusqueda = !!(busquedaDefer && busquedaDefer.trim() !== "");
    if (hayBusqueda) {
      if (categoriaId) {
        const localCat = productosPorCategoria[categoriaId] || [];
        fuente = localCat;
      } else {
        fuente = productosState;
      }
    } else if (categoriaId) {
      fuente = productosPorCategoria[categoriaId];
    }
    if (!fuente) return [];

    // Normalizar el término de búsqueda una sola vez
    const busquedaNormalizada = normalizarTexto(busquedaDefer);

    return fuente
      .filter((prod) => {
        // Normalizar el nombre del producto
        const nombreNormalizado = normalizarTexto(prod.nombre);

        // Normalizar la unidad de medida
        const unidadNormalizada = normalizarTexto(prod.unidadMedida || "");

        // Filtro por búsqueda de texto con lógica mejorada
        let cumpleBusqueda = busquedaNormalizada === "";

        if (busquedaNormalizada !== "") {
          // Si la búsqueda termina con punto, usar búsqueda dinámica (starts with)
          if (busquedaNormalizada.endsWith(".")) {
            const busquedaSinPunto = busquedaNormalizada.slice(0, -1);
            cumpleBusqueda =
              nombreNormalizado.startsWith(busquedaSinPunto) ||
              unidadNormalizada.startsWith(busquedaSinPunto);
          } else {
            // Búsqueda normal: incluye el texto en cualquier parte
            cumpleBusqueda =
              nombreNormalizado.includes(busquedaNormalizada) ||
              unidadNormalizada.includes(busquedaNormalizada);
          }
        }

        // Filtro por categoría seleccionada (si existe)
        const cumpleCategoria = !categoriaId || prod.categoria === categoriaId;

        // Filtro específico por tipo de madera
        const cumpleTipoMadera =
          categoriaId !== "Maderas" ||
          filtroTipoMadera === "" ||
          prod.tipoMadera === filtroTipoMadera;

        // Filtro específico por subcategoría de ferretería
        const cumpleSubCategoria =
          categoriaId !== "Ferretería" ||
          filtroSubCategoria === "" ||
          prod.subCategoria === filtroSubCategoria;

        return (
          cumpleCategoria &&
          cumpleBusqueda &&
          cumpleTipoMadera &&
          cumpleSubCategoria
        );
      })
      .sort((a, b) => {
        // Ordenar por stock: primero los que tienen stock, luego los que no
        const stockA = Number(a.stock) || 0;
        const stockB = Number(b.stock) || 0;

        if (stockA > 0 && stockB === 0) return -1; // a tiene stock, b no
        if (stockA === 0 && stockB > 0) return 1; // b tiene stock, a no

        // Si ambos tienen stock o ambos no tienen stock, mantener orden original
        return 0;
      });
  }, [
    productosPorCategoria,
    productosState,
    categoriaId,
    busquedaDefer,
    filtroTipoMadera,
    filtroSubCategoria,
  ]);

  // Obtener productos filtrados y paginados optimizado
  const totalProductos = productosFiltrados.length;
  const totalPaginas = Math.ceil(totalProductos / productosPorPagina);

  // Calcular productos para la página actual con useMemo
  const productosPaginados = useMemo(() => {
    const inicio = (paginaActual - 1) * productosPorPagina;
    const fin = inicio + productosPorPagina;
    return productosFiltrados.slice(inicio, fin);
  }, [productosFiltrados, paginaActual, productosPorPagina]);

  // Función para cambiar de página con transición no bloqueante
  const cambiarPagina = useCallback(
    (nuevaPagina) => {
      startTransition(() => {
      setPaginaActual(Math.max(1, Math.min(nuevaPagina, totalPaginas)));
      });
    },
    [totalPaginas, startTransition]
  );

  // Resetear página cuando cambian los filtros (usar valor debounced/deferred para evitar saltos)
  useEffect(() => {
    setPaginaActual(1);
  }, [categoriaId, busquedaDefer, filtroTipoMadera, filtroSubCategoria]);

  const [tipoEnvioSeleccionado, setTipoEnvioSeleccionado] = useState("");
  const [esConFactura, setEsConFactura] = useState(false);
  const transportistas = ["camion", "camioneta 1", "camioneta 2"];
  const vendedores = ["coco", "damian", "lauti", "jose"];
  const prioridades = ["alta", "media", "baja"];

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

  // Función para calcular precio de machimbre (precio por pie × ancho × largo × cantidad)
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

  // Formateador memoizado para números en formato argentino
  const numberFormatter = React.useMemo(() => new Intl.NumberFormat("es-AR"), []);
  const formatearNumeroArgentino = (numero) => {
    if (numero === null || numero === undefined || isNaN(numero)) return "0";
    return numberFormatter.format(Number(numero));
  };

  const [busquedaCliente, setBusquedaCliente] = useState("");
  // Debounce para búsqueda de clientes (dropdown)
  const [busquedaClienteDebounced, setBusquedaClienteDebounced] = useState("");
  useEffect(() => {
    const id = setTimeout(() => setBusquedaClienteDebounced(busquedaCliente), 300);
    return () => clearTimeout(id);
  }, [busquedaCliente]);
  const [dropdownClientesOpen, setDropdownClientesOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("datos");
  const clientesFiltrados = clientesState.filter(
    (c) =>
      c.nombre.toLowerCase().includes(busquedaClienteDebounced.toLowerCase()) ||
      (c.telefono || "").toLowerCase().includes(busquedaClienteDebounced.toLowerCase())
  );

  const generarId = (tipo) => {
    const num = Math.floor(1000 + Math.random() * 9000);
    return tipo === "presupuesto" ? `PRESU-${num}` : `VENTA-${num}`;
  };
  const [usarDireccionCliente, setUsarDireccionCliente] = useState(true);
  const [fechaEntrega, setFechaEntrega] = useState("");
  const [rangoHorario, setRangoHorario] = useState("");
  const [observaciones, setObservaciones] = useState("");
  const [prioridad, setPrioridad] = useState("");

  React.useEffect(() => {
    if (!watch("pagoParcial") || watch("pagoPendiente")) {
      setValue("montoAbonado", "");
    }
  }, [watch("pagoParcial"), watch("pagoPendiente")]);

  React.useEffect(() => {
    if (watch("tipoEnvio") === "retiro_local") {
      setValue("costoEnvio", "");
    }
  }, [watch("tipoEnvio")]);

  React.useEffect(() => {
    if (watch("tipoEnvio") === "retiro_local") {
      setValue("fechaEntrega", "");
      setValue("rangoHorario", "");
      setValue("transportista", "");
      setValue("direccionEnvio", "");
      setValue("localidadEnvio", "");
      setValue("costoEnvio", "");
    } else if (watch("tipoEnvio") && watch("tipoEnvio") !== "retiro_local") {
      // Establecer fecha de entrega por defecto al día actual
      setValue("fechaEntrega", new Date().toISOString().split("T")[0]);
    }
  }, [watch("tipoEnvio")]);

  return (
    <>
      <div className="mb-2">
        <h2 className="text-2xl font-bold text-primary flex items-center gap-2">
          <Icon
            icon={
              tipo === "presupuesto"
                ? "heroicons:document-plus"
                : "heroicons:shopping-cart"
            }
            className="w-6 h-6"
          />
          {tipo === "presupuesto" ? "Nuevo Presupuesto" : "Nueva Venta"}
        </h2>
        <p className="text-base text-default-600">
          Complete todos los campos requeridos para crear un nuevo {""}
          {tipo === "presupuesto" ? "presupuesto" : "venta"}.
        </p>
      </div>

      {submitStatus && (
        <div
          className={`mb-4 p-4 rounded-lg flex items-center gap-3 text-base font-medium shadow border ${
            submitStatus === "success"
              ? "bg-green-50 border-green-200 text-green-800"
              : "bg-red-50 border-red-200 text-red-800"
          }`}
        >
          {submitStatus === "success" ? (
            <CheckCircle className="w-5 h-5 text-green-600" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-600" />
          )}
          <span>{submitMessage}</span>
        </div>
      )}

      <form
        onSubmit={handleSubmit(handleFormSubmit)}
        className="flex flex-col gap-6"
      >
        <div className="px-1 pb-6">
          <div className="flex flex-col gap-8">
            <input
              type="hidden"
              {...register("fecha")}
              value={new Date().toISOString().split("T")[0]}
              readOnly
            />

            {/* Sección Cliente */}
            <section className="bg-card rounded-xl p-6 border border-default-200 shadow flex flex-col gap-4 mb-2">
              <label className="font-semibold text-lg flex items-center gap-2">
                <Icon
                  icon="heroicons:user"
                  className="w-5 h-5 text-primary dark:text-primary-300"
                />{" "}
                Cliente
              </label>
              <div className="relative w-full">
                <div
                  className="w-full flex items-center cursor-pointer bg-card border border-default-300 rounded-lg h-10 px-3 text-sm justify-between items-center transition duration-300 focus-within:border-default-500/50 focus-within:outline-none disabled:bg-default-200 disabled:cursor-not-allowed disabled:opacity-50"
                  onClick={() => setDropdownClientesOpen(true)}
                  tabIndex={0}
                  role="button"
                  aria-haspopup="listbox"
                  aria-expanded={dropdownClientesOpen}
                >
                  <span className="flex-1 truncate">
                    {clienteSeleccionado
                      ? `${(
                          clienteSeleccionado.nombre || ""
                        ).toUpperCase()} - ${(
                          clienteSeleccionado.cuit || ""
                        ).toUpperCase()} - ${(
                          clienteSeleccionado.localidad || ""
                        ).toUpperCase()}`
                      : "Seleccionar cliente..."}
                  </span>
                  <Icon
                    icon="heroicons:chevron-down"
                    className="w-5 h-5 ml-2 text-default-600"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-primary dark:text-primary-300 font-semibold ml-2"
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpenNuevoCliente(true);
                    }}
                    disabled={isSubmitting}
                  >
                    <Icon icon="heroicons:user-plus" className="w-4 h-4 mr-1" />{" "}
                    Nuevo
                  </Button>
                </div>
                {dropdownClientesOpen && (
                  <div className="absolute z-50 min-w-[8rem] overflow-hidden rounded-md border border-solid border-default-300 bg-card text-default-900 shadow-md mt-1 max-h-72 w-full animate-fade-in">
                    <div className="p-2">
                      <Input
                        type="text"
                        placeholder="Buscar por nombre o teléfono..."
                        value={busquedaCliente}
                        onChange={(e) => setBusquedaCliente(e.target.value)}
                        className="w-full mb-2"
                        autoFocus
                        disabled={clientesLoading || isSubmitting}
                      />
                      <div className="divide-y divide-gray-100">
                        {clientesFiltrados.length === 0 && (
                          <div className="p-2 text-gray-400 dark:text-default-500 text-sm">
                            No hay clientes
                          </div>
                        )}
                        {clientesFiltrados.map((c) => (
                          <div
                            key={c.id}
                            className="relative flex w-full cursor-pointer select-none items-center rounded-sm py-1.5 px-2 text-sm outline-none focus:bg-accent focus:text-accent-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
                            onClick={() => {
                              handleClienteChange(c.id);
                              setDropdownClientesOpen(false);
                            }}
                            role="option"
                            tabIndex={0}
                          >
                            {c.nombre.toUpperCase()} - {c.telefono || ""}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
              {errors.clienteId && (
                <span className="text-red-500 dark:text-red-400 text-xs mt-1">
                  {errors.clienteId.message}
                </span>
              )}
              <div className="space-y-2 bg-card p-4 border border-default-100 shadow-sm">
                <div className="text-base font-semibold pb-1 flex items-center gap-2">
                  <Icon
                    icon="heroicons:identification"
                    className="w-4 h-4 text-primary dark:text-primary-300"
                  />{" "}
                  Datos del cliente
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Input
                      value={(clienteSeleccionado?.nombre || "").toUpperCase()}
                      placeholder="Nombre del cliente"
                      readOnly
                      className="w-full bg-gray-50 dark:bg-default-800 border border-default-200 rounded-md dark:text-default-100"
                    />
                    {errors.cliente?.nombre && (
                      <span className="text-red-500 dark:text-red-400 text-xs">
                        {errors.cliente?.nombre.message}
                      </span>
                    )}
                  </div>
                  <div>
                    <Input
                      value={(clienteSeleccionado?.cuit || "").toUpperCase()}
                      placeholder="CUIT"
                      readOnly
                      className="w-full bg-gray-50 dark:bg-default-800 border border-default-200 rounded-md dark:text-default-100"
                    />
                    {errors.cliente?.cuit && (
                      <span className="text-red-500 dark:text-red-400 text-xs">
                        {errors.cliente?.cuit.message}
                      </span>
                    )}
                  </div>
                  <div>
                    <Input
                      value={(
                        clienteSeleccionado?.direccion || ""
                      ).toUpperCase()}
                      placeholder="Dirección"
                      readOnly
                      className="w-full bg-gray-50 dark:bg-default-800 border border-default-200 rounded-md dark:text-default-100"
                    />
                    {errors.cliente?.direccion && (
                      <span className="text-red-500 dark:text-red-400 text-xs">
                        {errors.cliente?.direccion.message}
                      </span>
                    )}
                  </div>
                  <div>
                    <Input
                      value={(
                        clienteSeleccionado?.telefono || ""
                      ).toUpperCase()}
                      placeholder="Teléfono"
                      readOnly
                      className="w-full bg-gray-50 dark:bg-default-800 border border-default-200 rounded-md dark:text-default-100"
                    />
                    {errors.cliente?.telefono && (
                      <span className="text-red-500 dark:text-red-400 text-xs">
                        {errors.cliente?.telefono.message}
                      </span>
                    )}
                  </div>
                  <div>
                    <Input
                      value={(clienteSeleccionado?.email || "").toUpperCase()}
                      placeholder="Email"
                      readOnly
                      className="w-full bg-gray-50 dark:bg-default-800 border border-default-200 rounded-md dark:text-default-100"
                    />
                    {errors.cliente?.email && (
                      <span className="text-red-500 dark:text-red-400 text-xs">
                        {errors.cliente?.email.message}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </section>

            {/* Sección Productos - Diseño Mejorado */}
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
                      onClick={() => {
                        const productoEjemplo = {
                          id: "ejemplo-" + Date.now(),
                          nombre: "Producto de Ejemplo",
                          precio: 15000,
                          unidad: "unidad",
                          stock: 100,
                          cantidad: 2,
                          descuento: 0,
                          categoria: "Eventual",
                          esEditable: true, // Marca que es un producto editable
                        };
                        setProductosSeleccionados([
                          ...productosSeleccionados,
                          productoEjemplo,
                        ]);
                      }}
                      disabled={isSubmitting}
                      className="text-xs px-3 py-1 bg-green-50 text-green-700 border-green-200 hover:bg-green-100"
                    >
                      <Icon
                        icon="heroicons:plus-circle"
                        className="w-3 h-3 mr-1"
                      />
                      Agregar Ejemplo
                    </Button>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                        {productosSeleccionados.length}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        productos agregados
                      </div>
                    </div>
                    {/* Indicador de rendimiento */}
                    <div className="text-right">
                      <div className="text-sm font-medium text-gray-600 dark:text-gray-400">
                        {productosFiltrados.length} /{" "}
                        {productosPorCategoria[categoriaId]?.length || 0}
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
                          disabled={isSubmitting}
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
                            disabled={isSubmitting}
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
                              disabled={isSubmitting}
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
                              disabled={isSubmitting}
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
                                disabled={isSubmitting}
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
                      {/* Búsqueda en memoria: no se necesita indicador remoto ni botón */}
                    </div>
                  </div>
                </div>
              </div>

              {/* Lista de productos */}
              <div className="max-h-150 overflow-y-auto">
                {categoriasState.length === 0 ? (
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
                        const yaAgregado = productosSeleccionados.some(
                          (p) => p.id === prod.id
                        );
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

                              {/* Botón de agregar */}
                              <div className="mt-4">
                                <button
                                  onClick={() => {
                                    if (prod.categoria === "Maderas") {
                                      const alto = Number(prod.alto) || 0;
                                      const ancho = Number(prod.ancho) || 0;
                                      const largo = Number(prod.largo) || 0;
                                      const precioPorPie = Number(prod.precioPorPie) || 0;

                                      if (prod.unidadMedida === "Unidad") {
                                        if (precioPorPie > 0) {
                                          const precioUnidad = Math.round(precioPorPie / 100) * 100;
                                          handleAgregarProducto({
                                            id: prod.id,
                                            nombre: prod.nombre,
                                            precio: precioUnidad,
                                            unidad: prod.unidadMedida,
                                            stock: prod.stock,
                                            alto,
                                            ancho,
                                            largo,
                                            precioPorPie,
                                          });
                                        } else {
                                          setSubmitStatus("error");
                                          setSubmitMessage("El producto de madera por unidad no tiene un precio válido.");
                                          return;
                                        }
                                      } else if (prod.unidadMedida === "M2") {
                                        if (alto > 0 && largo > 0 && precioPorPie > 0) {
                                          const precioM2 = calcularPrecioMachimbre({
                                            alto,
                                            largo,
                                            cantidad: 1,
                                            precioPorPie,
                                          });
                                          handleAgregarProducto({
                                            id: prod.id,
                                            nombre: prod.nombre,
                                            precio: precioM2,
                                            unidad: prod.unidadMedida,
                                            stock: prod.stock,
                                            alto,
                                            largo,
                                            precioPorPie,
                                          });
                                        } else {
                                          setSubmitStatus("error");
                                          setSubmitMessage(
                                            "El producto machimbre/deck no tiene dimensiones válidas en la base de datos."
                                          );
                                          return;
                                        }
                                      } else {
                                        if (alto > 0 && ancho > 0 && largo > 0 && precioPorPie > 0) {
                                          const precioCorte = calcularPrecioCorteMadera({
                                            alto,
                                            ancho,
                                            largo,
                                            precioPorPie,
                                          });
                                          handleAgregarProducto({
                                            id: prod.id,
                                            nombre: prod.nombre,
                                            precio: precioCorte,
                                            unidad: prod.unidadMedida,
                                            stock: prod.stock,
                                            alto,
                                            ancho,
                                            largo,
                                            precioPorPie,
                                          });
                                        } else {
                                          setSubmitStatus("error");
                                          setSubmitMessage(
                                            "El producto de madera no tiene dimensiones válidas en la base de datos."
                                          );
                                          return;
                                        }
                                      }
                                    } else {
                                      handleAgregarProducto({
                                        id: prod.id,
                                        nombre: prod.nombre,
                                        precio: precio,
                                        unidad:
                                          prod.unidadMedida ||
                                          prod.unidadVenta ||
                                          prod.unidadVentaHerraje ||
                                          prod.unidadVentaQuimico ||
                                          prod.unidadVentaHerramienta,
                                        stock: prod.stock,
                                      });
                                    }
                                  }}
                                  disabled={yaAgregado || isSubmitting}
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

                        {/* Controles de navegación */}
                        <div className="flex items-center gap-2">
                          {/* Botón primera página */}
                          <button
                            onClick={() => cambiarPagina(1)}
                            disabled={paginaActual === 1 || isPending}
                            className={`p-2 rounded-md transition-all duration-200 ${
                              isPending
                                ? "text-gray-300 dark:text-gray-600 cursor-not-allowed"
                                : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                            }`}
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
                            onClick={() => cambiarPagina(paginaActual - 1)}
                            disabled={paginaActual === 1 || isPending}
                            className={`p-2 rounded-md transition-all duration-200 ${
                              isPending
                                ? "text-gray-300 dark:text-gray-600 cursor-not-allowed"
                                : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                            }`}
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
                                } else if (paginaActual >= totalPaginas - 2) {
                                  pageNum = totalPaginas - 4 + i;
                                } else {
                                  pageNum = paginaActual - 2 + i;
                                }

                                return (
                                  <button
                                    key={pageNum}
                                    onClick={() => cambiarPagina(pageNum)}
                                    disabled={isPending}
                                    className={`px-3 py-1 text-sm rounded-md transition-colors ${
                                      isPending
                                        ? "text-gray-300 dark:text-gray-600 cursor-not-allowed"
                                        : paginaActual === pageNum
                                        ? "bg-blue-600 text-white"
                                        : "text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
                                    }`}
                                  >
                                    {pageNum}
                                  </button>
                                );
                              }
                            )}
                          </div>

                          {/* Botón página siguiente */}
                          <button
                            onClick={() => cambiarPagina(paginaActual + 1)}
                            disabled={paginaActual === totalPaginas || isPending}
                            className={`p-2 rounded-md transition-all duration-200 ${
                              isPending
                                ? "text-gray-300 dark:text-gray-600 cursor-not-allowed"
                                : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                            }`}
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
                            className={`p-2 rounded-md transition-all duration-200 ${
                              isPending
                                ? "text-gray-300 dark:text-gray-600 cursor-not-allowed"
                                : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                            }`}
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
                                d="M13 5l7 7-7 7m-8 0l7-7-7-7"
                              />
                            </svg>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </section>

            {/* Tabla de productos seleccionados */}
            {productosSeleccionados.length > 0 && (
              <section className="bg-card/60 rounded-xl p-0 border border-default-200 shadow-lg overflow-hidden ring-1 ring-default-200/60">
                <div className="flex items-center justify-between px-4 py-3 border-b bg-gradient-to-r from-default-50 to-default-100">
                  <h3 className="text-base md:text-lg font-semibold text-default-900">Productos Seleccionados</h3>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="pagoEnEfectivo"
                        checked={pagoEnEfectivo}
                        onChange={(e) => handlePagoEnEfectivoChange(e.target.checked)}
                        className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                        disabled={isSubmitting}
                      />
                      <label htmlFor="pagoEnEfectivo" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Pago en efectivo (-10%)
                      </label>
                    </div>
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-default-200/60 text-default-700 border border-default-300">
                      {productosSeleccionados.length} producto{productosSeleccionados.length !== 1 ? "s" : ""}
                    </span>
                  </div>
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
                        <th className="h-12 px-4 text-right align-middle text-xs font-semibold uppercase tracking-wide text-default-600">Precio en efectivo</th>
                        <th className="h-12 px-4 text-right align-middle text-xs font-semibold uppercase tracking-wide text-default-600">Subtotal</th>
                        <th className="h-12 px-4 text-center align-middle text-xs font-semibold uppercase tracking-wide text-default-600">Acción</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-default-200">
                      {productosSeleccionados.map((p, idx) => (
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
                              {p.esEditable ? (
                                <input
                                  type="text"
                                  value={p.nombre}
                                  onChange={(e) =>
                                    handleNombreChange(p.id, e.target.value)
                                  }
                                  className="w-full px-2 py-1 border border-gray-300 uppercase rounded text-base font-bold bg-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-200"
                                  disabled={isSubmitting}
                                  placeholder="Nombre del producto"
                                />
                              ) : (
                                <div>
                                  {p.nombre}
                                  {p.categoria === "Maderas" &&
                                    p.tipoMadera && (
                                      <span className="font-semibold text-default-900">
                                        {" "}
                                        - {p.tipoMadera.toUpperCase()}
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
                                        <input
                                          type="number"
                                          min="0"
                                          step="0.01"
                                          value={p.alto === "" ? "" : p.alto || ""}
                                          onChange={(e) => handleAltoChange(p.id, e.target.value)}
                                          className="h-8 w-[68px] sm:w-[80px] rounded-sm border border-orange-300 dark:border-orange-600 bg-white dark:bg-gray-800 text-sm px-1.5 focus:border-orange-500 focus:ring-1 focus:ring-orange-200 dark:focus:ring-orange-800"
                                          disabled={isSubmitting}
                                        />
                                      </div>
                                      <div className="flex flex-col gap-0.5">
                                        <label className="text-[11px] font-semibold text-orange-700">Largo</label>
                                        <input
                                          type="number"
                                          min="0"
                                          step="0.01"
                                          value={p.largo === "" ? "" : p.largo || ""}
                                          onChange={(e) => handleLargoChange(p.id, e.target.value)}
                                          className="h-8 w-[68px] sm:w-[80px] rounded-sm border border-orange-300 dark:border-orange-600 bg-white dark:bg-gray-800 text-sm px-1.5 focus:border-orange-500 focus:ring-1 focus:ring-orange-200 dark:focus:ring-orange-800"
                                          disabled={isSubmitting}
                                        />
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="flex flex-wrap items-end gap-2">
                                      <div className="flex flex-col gap-0.5">
                                        <label className="text-[11px] font-semibold text-orange-700">Alto</label>
                                        <input
                                          type="number"
                                          min="0"
                                          step="0.01"
                                          value={p.alto === "" ? "" : p.alto || ""}
                                          onChange={(e) => handleAltoChangeMadera(p.id, e.target.value)}
                                          className="h-8 w-[68px] sm:w-[80px] rounded-sm border border-orange-300 dark:border-orange-600 bg-white dark:bg-gray-800 text-sm px-1.5 focus:border-orange-500 focus:ring-1 focus:ring-orange-200 dark:focus:ring-orange-800"
                                          disabled={isSubmitting}
                                        />
                                      </div>
                                      <div className="flex flex-col gap-0.5">
                                        <label className="text-[11px] font-semibold text-orange-700">Ancho</label>
                                        <input
                                          type="number"
                                          min="0"
                                          step="0.01"
                                          value={p.ancho === "" ? "" : p.ancho || ""}
                                          onChange={(e) => handleAnchoChangeMadera(p.id, e.target.value)}
                                          className="h-8 w-[68px] sm:w-[80px] rounded-sm border border-orange-300 dark:border-orange-600 bg-white dark:bg-gray-800 text-sm px-1.5 focus:border-orange-500 focus:ring-1 focus:ring-orange-200 dark:focus:ring-orange-800"
                                          disabled={isSubmitting}
                                        />
                                      </div>
                                      <div className="flex flex-col gap-0.5">
                                        <label className="text-[11px] font-semibold text-orange-700">Largo</label>
                                        <input
                                          type="number"
                                          min="0"
                                          step="0.01"
                                          value={p.largo === "" ? "" : p.largo || ""}
                                          onChange={(e) => handleLargoChangeMadera(p.id, e.target.value)}
                                          className="h-8 w-[68px] sm:w-[80px] rounded-sm border border-orange-300 dark:border-orange-600 bg-white dark:bg-gray-800 text-sm px-1.5 focus:border-orange-500 focus:ring-1 focus:ring-orange-200 dark:focus:ring-orange-800"
                                          disabled={isSubmitting}
                                        />
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
                                      <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={p.precioPorPie === "" ? "" : p.precioPorPie || ""}
                                        onChange={(e) => {
                                          if (p.unidad === "M2") {
                                            handlePrecioPorPieChange(p.id, e.target.value);
                                          } else {
                                            handlePrecioPorPieChangeMadera(p.id, e.target.value);
                                          }
                                        }}
                                        className="h-8 w-[88px] pl-5 pr-2 text-sm border border-green-300 dark:border-green-600 rounded-md bg-white dark:bg-gray-800 focus:border-green-500 focus:ring-1 focus:ring-green-200 dark:focus:ring-green-800 focus:outline-none transition-colors tabular-nums"
                                        disabled={isSubmitting}
                                        placeholder="0.00"
                                      />
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}
                          </td>
                          <td className="p-4 align-middle text-sm text-default-600">
                            <div className="flex items-center justify-center">
                              <div className="flex items-center bg-white dark:bg-gray-800 border border-default-300 dark:border-gray-700 rounded-lg overflow-hidden shadow-sm">
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleDecrementarCantidad(p.id)
                                  }
                                  disabled={isSubmitting || p.cantidad <= 1}
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
                                  value={p.cantidad === "" ? "" : p.cantidad}
                                  onChange={(e) =>
                                    handleCantidadChange(p.id, e.target.value)
                                  }
                                  className="w-16 text-center text-base md:text-lg font-bold border-0 bg-transparent focus:ring-0 focus:outline-none text-gray-900 dark:text-gray-100 tabular-nums"
                                  disabled={isSubmitting}
                                />

                                <button
                                  type="button"
                                  onClick={() =>
                                    handleIncrementarCantidad(p.id)
                                  }
                                  disabled={isSubmitting}
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
                            {p.categoria === "Maderas" && p.unidad !== "Unidad" ? (
                              <div className="flex items-center justify-center">
                                <input
                                  type="checkbox"
                                  checked={p.cepilladoAplicado || false}
                                  onChange={(e) => {
                                    recalcularPreciosMadera(
                                      p.id,
                                      e.target.checked
                                    );
                                  }}
                                  className="w-4 h-4 text-blue-600 bg-white border-default-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 focus:ring-2"
                                  disabled={isSubmitting}
                                  title="Aplicar cepillado (+6.6%)"
                                />
                              </div>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className="p-4 align-middle text-sm text-default-600">
                            {p.esEditable ? (
                              <input
                                type="number"
                                min="0"
                                step="100"
                                value={p.precio === "" ? "" : p.precio}
                                onChange={(e) =>
                                  handlePrecioChange(p.id, e.target.value)
                                }
                                className="w-24 ml-auto block text-right border border-default-300 rounded-md px-2 py-1 text-sm font-semibold bg-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-200 tabular-nums"
                                disabled={isSubmitting}
                                placeholder="0"
                              />
                            ) : (
                              <span className="block text-right font-semibold text-default-900 tabular-nums">{`$${formatearNumeroArgentino(p.precio)}`}</span>
                            )}
                          </td>
                          <td className="p-4 align-middle text-sm text-default-600">
                            <div className="relative w-20 md:w-24 mx-auto">
                              <input
                                type="number"
                                min={0}
                                max={100}
                                value={p.descuento === "" ? "" : p.descuento || ""}
                                onChange={(e) =>
                                  handleDescuentoChange(p.id, e.target.value)
                                }
                                className="w-full text-center border border-default-300 rounded-md px-2 py-1 pr-6 bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-200"
                                disabled={isSubmitting}
                              />
                              <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs text-default-500">%</span>
                            </div>
                          </td>
                          <td className="p-4 align-middle text-right text-sm text-default-900 font-bold tabular-nums">
                            ${formatearNumeroArgentino(
                              (() => {
                                // Para machimbres y deck, el precio ya incluye la cantidad
                                const precioBase = p.categoria === "Maderas" && p.unidad === "M2"
                                  ? Number(p.precio)
                                  : Number(p.precio) * Number(p.cantidad);
                                
                                // Aplicar descuento individual del producto
                                const precioConDescuento = precioBase * (1 - Number(p.descuento || 0) / 100);
                                
                                // Siempre aplicar descuento por pago en efectivo (10%)
                                return precioConDescuento * 0.9;
                              })()
                            )}
                          </td>
                          <td className="p-4 align-middle text-right text-sm text-default-900 font-bold tabular-nums">
                            ${formatearNumeroArgentino(
                              // Para machimbres y deck, el precio ya incluye la cantidad
                              p.categoria === "Maderas" && p.unidad === "M2"
                                ? Number(p.precio) * (1 - Number(p.descuento || 0) / 100)
                                : Number(p.precio) * Number(p.cantidad) * (1 - Number(p.descuento || 0) / 100)
                            )}
                          </td>
                          <td className="p-4 align-middle text-center text-sm text-default-600">
                            <span className="group relative inline-flex">
                              <button
                                type="button"
                                aria-label="Eliminar producto"
                                onClick={() => handleQuitarProducto(p.id)}
                                disabled={isSubmitting}
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
            )}

            {/* Sección condiciones y envío */}
            <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {tipo === "venta" && (
                <>
                  <div className="space-y-2 rounded-lg p-4 border border-default-200 shadow-sm">
                    <div className="text-base font-semibold pb-1">
                      Información de envío
                    </div>
                    <select
                      {...register("tipoEnvio")}
                      value={tipoEnvioSeleccionado}
                      onChange={(e) => {
                        setTipoEnvioSeleccionado(e.target.value);
                        setValue("tipoEnvio", e.target.value, {
                          shouldValidate: true,
                        });
                      }}
                      className="w-full px-3 flex justify-between items-center read-only:bg-background disabled:cursor-not-allowed disabled:opacity-50 transition duration-300 border-default-300 text-default-500 focus:outline-hidden focus:border-default-500/50 disabled:bg-default-200 placeholder:text-accent-foreground/50 [&>svg]:stroke-default-600 border rounded-lg h-10 text-sm"
                      disabled={isSubmitting}
                    >
                      <option value="">Tipo de envío...</option>
                      <option value="retiro_local">Retiro en local</option>
                      <option value="envio_domicilio">Envío a domicilio</option>
                    </select>
                    {errors.tipoEnvio && (
                      <span className="text-red-500 dark:text-red-400 text-xs">
                        {errors.tipoEnvio.message}
                      </span>
                    )}
                    {tipoEnvioSeleccionado === "envio_domicilio" && (
                      <select
                        {...register("prioridad")}
                        className="border rounded px-2 py-2 w-full"
                        disabled={isSubmitting}
                      >
                        <option value="">Prioridad...</option>
                        {prioridades.map((p) => (
                          <option key={p}>
                            {p.charAt(0).toUpperCase() + p.slice(1)}
                          </option>
                        ))}
                      </select>
                    )}
                    {errors.prioridad && (
                      <span className="text-red-500 dark:text-red-400 text-xs">
                        {errors.prioridad.message}
                      </span>
                    )}
                    {tipoEnvioSeleccionado !== "retiro_local" && (
                      <>
                        <div className="flex items-center gap-2 mb-2">
                          <input
                            type="checkbox"
                            checked={usarDireccionCliente}
                            onChange={(e) =>
                              setUsarDireccionCliente(e.target.checked)
                            }
                            id="usarDireccionCliente"
                          />
                          <label
                            htmlFor="usarDireccionCliente"
                            className="text-sm"
                          >
                            Usar dirección del cliente
                          </label>
                        </div>
                        {!usarDireccionCliente && (
                          <>
                            <Input
                              {...register("direccionEnvio")}
                              placeholder="Dirección de envío"
                              className="w-full"
                              disabled={isSubmitting}
                            />
                            <Input
                              {...register("localidadEnvio")}
                              placeholder="Localidad/Ciudad"
                              className="w-full"
                              disabled={isSubmitting}
                            />
                            {errors.direccionEnvio && (
                              <span className="text-red-500 dark:text-red-400 text-xs">
                                {errors.direccionEnvio.message}
                              </span>
                            )}
                            {errors.localidadEnvio && (
                              <span className="text-red-500 dark:text-red-400 text-xs">
                                {errors.localidadEnvio.message}
                              </span>
                            )}
                          </>
                        )}
                        {usarDireccionCliente && clienteSeleccionado && (
                          <>
                            <Input
                              value={clienteSeleccionado.direccion || ""}
                              readOnly
                              className="w-full"
                            />
                            <Input
                              value={clienteSeleccionado.localidad || ""}
                              readOnly
                              className="w-full"
                            />
                          </>
                        )}
                        <select
                          {...register("transportista")}
                          className="w-full px-3 flex justify-between items-center read-only:bg-background disabled:cursor-not-allowed disabled:opacity-50 transition duration-300 border-default-300 text-default-500 focus:outline-hidden focus:border-default-500/50 disabled:bg-default-200 placeholder:text-accent-foreground/50 [&>svg]:stroke-default-600 border rounded-lg h-10 text-sm"
                          disabled={isSubmitting}
                        >
                          <option value="">Transportista...</option>
                          {transportistas.map((t) => (
                            <option key={t}>{t}</option>
                          ))}
                        </select>
                        {errors.transportista && (
                          <span className="text-red-500 dark:text-red-400 text-xs">
                            {errors.transportista.message}
                          </span>
                        )}
                        {tipoEnvioSeleccionado !== "retiro_local" && (
                          <Input
                            {...register("costoEnvio")}
                            placeholder={
                              tipo === "presupuesto"
                                ? "Costo estimado de envío"
                                : "Costo de envío"
                            }
                            type="number"
                            className="w-full"
                            disabled={isSubmitting}
                            min={0}
                          />
                        )}
                        {errors.costoEnvio && (
                          <span className="text-red-500 dark:text-red-400 text-xs">
                            {errors.costoEnvio.message}
                          </span>
                        )}
                        <Input
                          {...register("fechaEntrega")}
                          placeholder="Fecha de entrega"
                          type="date"
                          className="w-full"
                          disabled={isSubmitting}
                          value={
                            watch("fechaEntrega")
                              ? new Date(watch("fechaEntrega"))
                                  .toISOString()
                                  .split("T")[0]
                              : ""
                          }
                        />
                        {errors.fechaEntrega && (
                          <span className="text-red-500 dark:text-red-400 text-xs">
                            {errors.fechaEntrega.message}
                          </span>
                        )}
                        <Input
                          {...register("rangoHorario")}
                          placeholder="Rango horario (ej: 8-12, 14-18)"
                          className="w-full"
                          disabled={isSubmitting}
                        />
                        {errors.rangoHorario && (
                          <span className="text-red-500 dark:text-red-400 text-xs">
                            {errors.rangoHorario.message}
                          </span>
                        )}
                      </>
                    )}
                  </div>

                  <div className="space-y-2 bg-card rounded-lg p-4 border border-default-200 shadow-sm">
                    <div className="text-base font-semibold pb-1">
                      Información adicional
                    </div>
                    <div className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                      <strong>Vendedor:</strong>{" "}
                      {user?.email || "Usuario no identificado"}
                    </div>
                    <Textarea
                      {...register("observaciones")}
                      placeholder="Observaciones adicionales"
                      className="w-full"
                      disabled={isSubmitting}
                    />
                    {errors.observaciones && (
                      <span className="text-red-500 dark:text-red-400 text-xs">
                        {errors.observaciones.message}
                      </span>
                    )}
                  </div>
                </>
              )}
              {tipo === "presupuesto" && (
                <div className="space-y-2 bg-card rounded-lg p-4 border border-default-200 shadow-sm">
                  <div className="text-base font-semibold pb-1">
                    Información de envío
                  </div>
                  <select
                    {...register("tipoEnvio")}
                    className="w-full px-3 flex justify-between items-center read-only:bg-background disabled:cursor-not-allowed disabled:opacity-50 transition duration-300 border-default-300 text-default-500 focus:outline-hidden focus:border-default-500/50 disabled:bg-default-200 placeholder:text-accent-foreground/50 [&>svg]:stroke-default-600 border rounded-lg h-10 text-sm"
                    disabled={isSubmitting}
                  >
                    <option value="">Tipo de envío...</option>
                    <option value="retiro_local">Retiro en local</option>
                    <option value="envio_domicilio">Envío a domicilio</option>
                  </select>
                  {errors.tipoEnvio && (
                    <span className="text-red-500 dark:text-red-400 text-xs">
                      {errors.tipoEnvio.message}
                    </span>
                  )}
                  {watch("tipoEnvio") &&
                    watch("tipoEnvio") !== "retiro_local" && (
                      <Input
                        {...register("costoEnvio")}
                        placeholder="Cotización del envío a domicilio"
                        type="number"
                        className="w-full"
                        disabled={isSubmitting}
                        min={0}
                      />
                    )}
                  {errors.costoEnvio && (
                    <span className="text-red-500 dark:text-red-400 text-xs">
                      {errors.costoEnvio.message}
                    </span>
                  )}
                </div>
              )}
            </section>

            {/* Sección Condiciones de pago y entrega - ÚLTIMA */}
            {tipo === "venta" && (
              <section className="bg-card rounded-xl p-6 border border-default-200 dark:border-default-700 shadow flex flex-col gap-4 mb-2">
                <label className="font-semibold text-base flex items-center gap-2">
                  <Icon
                    icon="heroicons:credit-card"
                    className="w-5 h-5 text-primary dark:text-primary-300"
                  />{" "}
                  Condiciones de pago y entrega
                </label>
                <div className="space-y-2 bg-card rounded-lg p-4 border border-default-200 shadow-sm">
                  <select
                    {...register("formaPago")}
                    className="w-full px-3 flex justify-between items-center read-only:bg-background disabled:cursor-not-allowed disabled:opacity-50 transition duration-300 border-default-300 text-default-500 focus:outline-hidden focus:border-default-500/50 disabled:bg-default-200 placeholder:text-accent-foreground/50 [&>svg]:stroke-default-600 border rounded-lg h-10 text-sm"
                    disabled={isSubmitting || pagoEnEfectivo}
                  >
                    <option value="">Forma de pago...</option>
                    <option value="efectivo">Efectivo</option>
                    <option value="transferencia">Transferencia</option>
                    <option value="tarjeta">Tarjeta</option>
                    <option value="cheque">Cheque</option>
                    <option value="otro">Otro</option>
                  </select>
                  {errors.formaPago && (
                    <span className="text-red-500 dark:text-red-400 text-xs">
                      {errors.formaPago.message}
                    </span>
                  )}
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
                    <>
                      <Input
                        type="number"
                        min={0}
                        placeholder="Monto abonado"
                        {...register("montoAbonado")}
                        className="w-full"
                        disabled={isSubmitting}
                      />
                      <div className="text-sm text-gray-600">
                        Resta: $
                        {(total - (watch("montoAbonado") || 0)).toFixed(2)}
                      </div>
                      {errors.montoAbonado && (
                        <span className="text-red-500 dark:text-red-400 text-xs">
                          {errors.montoAbonado.message}
                        </span>
                      )}
                    </>
                  )}
                </div>
              </section>
            )}
          </div>
        </div>

        {/* Totales y acciones - bloque normal */}
        <div className="bg-card space-y-4 rounded-b-xl border-t border-default-100 p-3 md:p-4">
          <div className="flex flex-col items-end gap-2">
            <div className="bg-primary/5 dark:bg-primary/10 border border-primary/20 rounded-lg px-6 py-3 flex flex-col md:flex-row gap-4 md:gap-8 text-lg shadow-sm w-full md:w-auto font-semibold">
              <div>
                Subtotal:{" "}
                <span className="font-bold">
                  ${formatearNumeroArgentino(subtotal)}
                </span>
              </div>
              <div>
                Descuento:{" "}
                <span className="font-bold">
                  ${formatearNumeroArgentino(descuentoTotal)}
                </span>
              </div>
              {descuentoEfectivo > 0 && (
                <div>
                  Descuento (Efectivo 10%):{" "}
                  <span className="font-bold text-green-600">
                    ${formatearNumeroArgentino(descuentoEfectivo)}
                  </span>
                </div>
              )}
              {costoEnvioCalculado > 0 && (
                <div>
                  Costo de envío:{" "}
                  <span className="font-bold">
                    ${formatearNumeroArgentino(costoEnvioCalculado)}
                  </span>
                </div>
              )}
              <div>
                Total:{" "}
                <span className="font-bold text-primary">
                  ${formatearNumeroArgentino(total)}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-end pt-4 bg-card">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              className="w-full sm:w-auto hover:bg-gray-100 dark:hover:bg-default-700 rounded-md px-4 sm:px-6 py-2 text-sm sm:text-base"
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="default"
              className="w-full sm:w-auto shadow-md min-w-[160px] rounded-md px-4 sm:px-6 py-2 text-sm sm:text-base font-semibold"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Guardando...
                </>
              ) : (
                `Guardar ${tipo === "presupuesto" ? "Presupuesto" : "Venta"}`
              )}
            </Button>
          </div>
        </div>
      </form>

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
            {/* Pestañas */}
            <div className="flex border-b border-gray-200 mb-4">
              <button
                type="button"
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === "datos"
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
                onClick={() => setActiveTab("datos")}
              >
                Datos Básicos
              </button>
              <button
                type="button"
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === "ubicacion"
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
                onClick={() => setActiveTab("ubicacion")}
              >
                Ubicación
              </button>
              <button
                type="button"
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === "adicional"
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
                onClick={() => setActiveTab("adicional")}
              >
                Adicional
              </button>
            </div>

            {/* Contenido de las pestañas */}
            <div className="flex-1 overflow-y-auto">
              {activeTab === "datos" && (
                <div className="space-y-4">
                  {/* Checkbox para cliente antiguo */}
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
                      ¿Es un cliente antiguo?
                    </label>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Nombre *
                      </label>
                      <Input
                        placeholder="Nombre completo"
                        className="w-full"
                        value={nuevoCliente.nombre}
                        onChange={(e) =>
                          setNuevoCliente({
                            ...nuevoCliente,
                            nombre: e.target.value,
                          })
                        }
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        CUIT / DNI
                      </label>
                      <Input
                        placeholder="CUIT o DNI"
                        className="w-full"
                        value={nuevoCliente.cuit || ""}
                        onChange={(e) =>
                          setNuevoCliente({
                            ...nuevoCliente,
                            cuit: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Teléfono *
                      </label>
                      <Input
                        placeholder="Teléfono"
                        className="w-full"
                        value={nuevoCliente.telefono}
                        onChange={(e) =>
                          setNuevoCliente({
                            ...nuevoCliente,
                            telefono: e.target.value,
                          })
                        }
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Email
                      </label>
                      <Input
                        placeholder="Email"
                        type="email"
                        className="w-full"
                        value={nuevoCliente.email}
                        onChange={(e) =>
                          setNuevoCliente({
                            ...nuevoCliente,
                            email: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Dirección *
                      </label>
                      <Input
                        placeholder="Dirección completa"
                        className="w-full"
                        value={nuevoCliente.direccion}
                        onChange={(e) =>
                          setNuevoCliente({
                            ...nuevoCliente,
                            direccion: e.target.value,
                          })
                        }
                        required
                      />
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "ubicacion" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Localidad
                      </label>
                      <Input
                        placeholder="Localidad"
                        className="w-full"
                        value={nuevoCliente.localidad || ""}
                        onChange={(e) =>
                          setNuevoCliente({
                            ...nuevoCliente,
                            localidad: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Partido
                      </label>
                      <Input
                        placeholder="Partido"
                        className="w-full"
                        value={nuevoCliente.partido || ""}
                        onChange={(e) =>
                          setNuevoCliente({
                            ...nuevoCliente,
                            partido: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Barrio
                      </label>
                      <Input
                        placeholder="Barrio"
                        className="w-full"
                        value={nuevoCliente.barrio || ""}
                        onChange={(e) =>
                          setNuevoCliente({
                            ...nuevoCliente,
                            barrio: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Área
                      </label>
                      <Input
                        placeholder="Área"
                        className="w-full"
                        value={nuevoCliente.area || ""}
                        onChange={(e) =>
                          setNuevoCliente({
                            ...nuevoCliente,
                            area: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Lote
                      </label>
                      <Input
                        placeholder="Lote"
                        className="w-full"
                        value={nuevoCliente.lote || ""}
                        onChange={(e) =>
                          setNuevoCliente({
                            ...nuevoCliente,
                            lote: e.target.value,
                          })
                        }
                      />
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "adicional" && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Descripción
                    </label>
                    <Textarea
                      placeholder="Información adicional sobre el cliente"
                      className="w-full min-h-[120px]"
                      value={nuevoCliente.descripcion || ""}
                      onChange={(e) =>
                        setNuevoCliente({
                          ...nuevoCliente,
                          descripcion: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Navegación y botones */}
            <div className="flex items-center justify-between pt-4 border-t border-gray-200">
              <div className="flex gap-2">
                {activeTab !== "datos" && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      if (activeTab === "ubicacion") setActiveTab("datos");
                      if (activeTab === "adicional") setActiveTab("ubicacion");
                    }}
                    className="text-sm"
                  >
                    Anterior
                  </Button>
                )}
                {activeTab !== "adicional" && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      if (activeTab === "datos") setActiveTab("ubicacion");
                      if (activeTab === "ubicacion") setActiveTab("adicional");
                    }}
                    disabled={
                      (activeTab === "datos" &&
                        (!nuevoCliente.nombre ||
                          !nuevoCliente.direccion ||
                          !nuevoCliente.telefono)) ||
                      (activeTab === "ubicacion" &&
                        (!nuevoCliente.nombre ||
                          !nuevoCliente.direccion ||
                          !nuevoCliente.telefono))
                    }
                    className="text-sm"
                  >
                    Siguiente
                  </Button>
                )}
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setOpenNuevoCliente(false)}
                  className="text-sm"
                >
                  Cancelar
                </Button>
                <Button
                  variant="default"
                  onClick={async () => {
                    if (
                      !nuevoCliente.nombre ||
                      !nuevoCliente.direccion ||
                      !nuevoCliente.telefono
                    ) {
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
                    const docRef = await addDoc(
                      collection(db, "clientes"),
                      clienteObj
                    );
                    setClientesState([
                      ...clientesState,
                      { ...clienteObj, id: docRef.id },
                    ]);
                    setClienteId(docRef.id);
                    setNuevoCliente({
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
                    setOpenNuevoCliente(false);
                    setDropdownClientesOpen(false);
                  }}
                  disabled={
                    !nuevoCliente.nombre ||
                    !nuevoCliente.direccion ||
                    !nuevoCliente.telefono
                  }
                  className="text-sm"
                >
                  Guardar Cliente
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

const VentasPage = () => {
  const { user } = useAuth();
  const [ventasData, setVentasData] = useState([]);
  const [presupuestosData, setPresupuestosData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteMessage, setDeleteMessage] = useState("");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [deleteType, setDeleteType] = useState("");
  const router = useRouter();
  const params = useParams();
  const { lang } = params;

  React.useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        const ventasSnap = await getDocs(collection(db, "ventas"));
        setVentasData(
          ventasSnap.docs.map((doc) => ({ ...doc.data(), id: doc.id }))
        );

        const presupuestosSnap = await getDocs(collection(db, "presupuestos"));
        setPresupuestosData(
          presupuestosSnap.docs.map((doc) => ({ ...doc.data(), id: doc.id }))
        );
      } catch (error) {
        console.error("Error al cargar datos:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Función para mostrar el diálogo de confirmación
  const showDeleteConfirmation = (id, type, itemName) => {
    setItemToDelete({ id, name: itemName });
    setDeleteType(type);
    setShowDeleteDialog(true);
  };

  // Función para confirmar la eliminación
  const confirmDelete = async () => {
    if (!itemToDelete || !user) {
      setShowDeleteDialog(false);
      return;
    }

    try {
      setDeleting(true);
      setDeleteMessage("");

      const response = await fetch('/api/delete-document', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          documentId: itemToDelete.id,
          collectionName: deleteType === 'venta' ? 'ventas' : 'presupuestos',
          userId: user.uid,
          userEmail: user.email
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `Error al eliminar ${deleteType}`);
      }

      const result = await response.json();
      
      // Actualizar la lista local
      if (deleteType === 'venta') {
        setVentasData(prev => prev.filter(v => v.id !== itemToDelete.id));
      } else {
        setPresupuestosData(prev => prev.filter(p => p.id !== itemToDelete.id));
      }
      
      setDeleteMessage(`✅ ${result.message}`);
      
      // Limpiar mensaje después de 3 segundos
      setTimeout(() => setDeleteMessage(""), 3000);

    } catch (error) {
      console.error(`Error al eliminar ${deleteType}:`, error);
      setDeleteMessage(`❌ Error: ${error.message}`);
      
      // Limpiar mensaje después de 5 segundos
      setTimeout(() => setDeleteMessage(""), 5000);
    } finally {
      setDeleting(false);
      setShowDeleteDialog(false);
      setItemToDelete(null);
    }
  };

  // Event listeners para los botones de borrado
  useEffect(() => {
    const handleDeletePresupuestoEvent = (event) => {
      const presupuesto = presupuestosData.find(p => p.id === event.detail.id);
      if (presupuesto) {
        showDeleteConfirmation(event.detail.id, 'presupuesto', presupuesto.cliente?.nombre || 'Presupuesto');
      }
    };

    const handleDeleteVentaEvent = (event) => {
      const venta = ventasData.find(v => v.id === event.detail.id);
      if (venta) {
        showDeleteConfirmation(event.detail.id, 'venta', venta.cliente?.nombre || 'Venta');
      }
    };

    window.addEventListener('deletePresupuesto', handleDeletePresupuestoEvent);
    window.addEventListener('deleteVenta', handleDeleteVentaEvent);

    return () => {
      window.removeEventListener('deletePresupuesto', handleDeletePresupuestoEvent);
      window.removeEventListener('deleteVenta', handleDeleteVentaEvent);
    };
  }, [presupuestosData, ventasData]);

  return (
    <div className="flex flex-col gap-8 py-8 mx-auto font-sans">
      {/* Mensaje de estado del borrado */}
      {deleteMessage && (
        <div className={`mb-6 p-4 rounded-xl flex items-center gap-3 text-base font-medium shadow-lg border transition-all duration-500 ${
          deleteMessage.startsWith('✅') 
            ? "bg-gradient-to-r from-green-50 to-emerald-50 border-green-200 text-green-800 shadow-green-100" 
            : "bg-gradient-to-r from-red-50 to-rose-50 border-red-200 text-red-800 shadow-red-100"
        }`}>
          {deleteMessage.startsWith('✅') ? (
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
          ) : (
            <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-red-600" />
            </div>
          )}
          <span className="font-semibold">{deleteMessage}</span>
        </div>
      )}

          {/* Botones de acción mejorados */}
    <div className="flex justify-between gap-4 mb-8 px-2">
      <div>
          <Button
          variant="default"
          className="w-full sm:w-auto flex items-center justify-center gap-3 px-6 py-4 text-base font-semibold rounded-xl shadow-lg bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 transition-all duration-300 transform hover:scale-105 hover:shadow-xl"
          onClick={() => router.push(`/${lang}/presupuestos/create`)}
            disabled={deleting}
          >
            <Icon
            icon="heroicons:document-plus"
            className="w-5 h-5"
            />
          <span className="hidden sm:inline">Crear Presupuesto</span>
          <span className="sm:hidden">Presupuesto</span>
          </Button>
        </div>
      <div>
          <Button
            variant="default"
          className="w-full sm:w-auto flex items-center justify-center gap-3 px-6 py-4 text-base font-semibold rounded-xl shadow-lg bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 transition-all duration-300 transform hover:scale-105 hover:shadow-xl"
            onClick={() => router.push(`/${lang}/ventas/create`)}
            disabled={deleting}
          >
            <Icon
              icon="heroicons:shopping-cart"
            className="w-5 h-5"
            />
          <span className="hidden sm:inline">Crear Venta</span>
            <span className="sm:hidden">Venta</span>
          </Button>
        </div>
      </div>

          {/* Tablas mejoradas */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 px-2">
      {/* Tabla de Presupuestos - IZQUIERDA */}
      <Card className="rounded-2xl shadow-2xl border-0 bg-gradient-to-br from-white to-gray-50/50 overflow-hidden">
        <CardHeader className="pb-4 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-t-2xl">
          <CardTitle className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
              <Icon
                icon="heroicons:document-text"
                className="w-7 h-7 text-white"
              />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">Presupuestos</div>
              <div className="text-sm font-medium text-gray-600">Gestión de cotizaciones</div>
            </div>
              {deleting && (
                <div className="flex items-center gap-2 ml-auto">
                <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                  <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                </div>
                <span className="text-sm font-medium text-blue-600">Procesando...</span>
                </div>
              )}
            </CardTitle>
          </CardHeader>
        <CardContent className="pt-6 p-0">
          <div className="overflow-hidden rounded-b-2xl">
            <DataTableEnhanced 
              data={presupuestosData} 
              columns={columnsPresupuestos}
              searchPlaceholder="Buscar presupuestos..."
              className="border-0"
              defaultSorting={[{ id: "numeroPedido", desc: true }]}
              onRowClick={(presupuesto) => {
                router.push(`/${lang}/presupuestos/${presupuesto.id}`);
              }}
              compact={true}
            />
          </div>
          </CardContent>
        </Card>

      {/* Tabla de Ventas - DERECHA */}
      <Card className="rounded-2xl shadow-2xl border-0 bg-gradient-to-br from-white to-emerald-50/50 overflow-hidden">
        <CardHeader className="pb-4 border-b border-gray-100 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-t-2xl">
          <CardTitle className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shadow-lg">
              <Icon
                icon="heroicons:shopping-cart"
                className="w-7 h-7 text-white"
              />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">Ventas</div>
              <div className="text-sm font-medium text-gray-600">Transacciones realizadas</div>
            </div>
              {deleting && (
                <div className="flex items-center gap-2 ml-auto">
                <div className="w-6 h-6 bg-emerald-100 rounded-full flex items-center justify-center">
                  <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
                </div>
                <span className="text-sm font-medium text-emerald-600">Procesando...</span>
                </div>
              )}
            </CardTitle>
          </CardHeader>
        <CardContent className="pt-6 p-0">
          <div className="overflow-hidden rounded-b-2xl">
            <DataTableEnhanced 
              data={ventasData} 
              columns={columnsVentas}
              searchPlaceholder="Buscar ventas..."
              className="border-0"
              defaultSorting={[{ id: "numeroPedido", desc: true }]}
              onRowClick={(venta) => {
                router.push(`/${lang}/ventas/${venta.id}`);
              }}
              compact={true}
            />
          </div>
          </CardContent>
        </Card>
      </div>

      {/* Diálogo de confirmación de eliminación mejorado */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="w-[95vw] max-w-md rounded-2xl border-0 shadow-2xl bg-white">
          <DialogHeader className="text-center pb-4">
            <div className="w-16 h-16 bg-gradient-to-br from-red-100 to-rose-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>
            <DialogTitle className="text-xl font-bold text-gray-900">
              Confirmar Eliminación
            </DialogTitle>
            <DialogDescription className="text-gray-600 mt-2">
              ¿Estás seguro de que quieres eliminar este {deleteType === 'venta' ? 'venta' : 'presupuesto'}?
            </DialogDescription>
          </DialogHeader>

          <div className="bg-gradient-to-r from-red-50 to-rose-50 rounded-xl p-4 mb-6 border border-red-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <Info className="w-5 h-5 text-red-600" />
              </div>
              <div className="flex-1">
                <div className="font-semibold text-red-800">
                  {itemToDelete?.name || 'Elemento'}
                </div>
                <div className="text-sm text-red-700">
                  {deleteType === 'venta' 
                    ? 'Esta acción eliminará la venta y restaurará el stock de productos.'
                    : 'Esta acción eliminará el presupuesto permanentemente.'
                  }
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="flex flex-col sm:flex-row gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
              className="w-full sm:w-auto px-6 py-3 rounded-xl border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 font-medium"
              disabled={deleting}
            >
              <X className="w-4 h-4 mr-2" />
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 shadow-lg hover:shadow-xl transition-all duration-200 font-medium transform hover:scale-105"
              disabled={deleting}
            >
              {deleting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Eliminando...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Eliminar
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default VentasPage;