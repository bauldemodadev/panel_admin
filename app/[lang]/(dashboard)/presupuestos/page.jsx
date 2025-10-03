"use client";
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { columns } from "../(invoice)/invoice-list/invoice-list-table/components/columns";
import { DataTable } from "../(invoice)/invoice-list/invoice-list-table/components/data-table";
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { Box, Layers, Settings, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { db } from "@/lib/firebase";
import { collection, getDocs, addDoc } from "firebase/firestore";
import { useRouter, useParams } from "next/navigation";

// Categorías y productos ficticios
const categorias = [
  { id: 1, nombre: "Maderas", icon: <Box className="w-5 h-5 mr-2 text-primary" /> },
  { id: 2, nombre: "Tableros", icon: <Layers className="w-5 h-5 mr-2 text-primary" /> },
  { id: 3, nombre: "Accesorios", icon: <Settings className="w-5 h-5 mr-2 text-primary" /> },
];
const productosPorCategoria = {
  1: [
    { id: 101, nombre: "Pino 2x4", precio: 1500, unidad: "m" },
    { id: 102, nombre: "Eucalipto 1x6", precio: 1800, unidad: "m" },
    { id: 103, nombre: "Lapacho 2x6", precio: 3500, unidad: "m" },
  ],
  2: [
    { id: 201, nombre: "MDF 18mm", precio: 2500, unidad: "pliego" },
    { id: 202, nombre: "Fenólico 18mm", precio: 4200, unidad: "pliego" },
  ],
  3: [
    { id: 301, nombre: "Tornillos x100", precio: 900, unidad: "caja" },
    { id: 302, nombre: "Cola vinílica 1kg", precio: 1200, unidad: "unidad" },
  ],
};

function FormularioPresupuesto({ onClose, onSubmit }) {
  // Estados de carga y feedback
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState(null); // 'success' | 'error' | null
  const [submitMessage, setSubmitMessage] = useState("");

  const schema = yup.object().shape({
    nombre: yup.string().required("El nombre es obligatorio"),
    fecha: yup.string().required("La fecha es obligatoria"),
    vencimiento: yup.string().required("La fecha de vencimiento es obligatoria"),
    tipoEnvio: yup.string(),
    costoEnvio: yup.number().transform((value, originalValue) =>
      originalValue === "" ? undefined : value
    ).notRequired(),
    cliente: yup.object().shape({
      nombre: yup.string().required("Obligatorio"),
      email: yup.string().email("Email inválido").required("Obligatorio"),
      telefono: yup.string().required("Obligatorio"),
      direccion: yup.string().required("Obligatorio"),
      cuit: yup.string().required("Obligatorio"),
    }),
    items: yup.array().of(
      yup.object().shape({
        descripcion: yup.string().required("Obligatorio"),
        cantidad: yup.number().min(1, "Mínimo 1").required("Obligatorio"),
        precio: yup.number().min(0, "No puede ser negativo").required("Obligatorio"),
        unidad: yup.string().required("Obligatorio"),
        moneda: yup.string().required("Obligatorio"),
      })
    ).min(1, "Agrega al menos un ítem"),
  });

  const { register, handleSubmit, setValue, formState: { errors }, watch, reset, trigger } = useForm({
    resolver: yupResolver(schema),
    defaultValues: {
      nombre: "",
      fecha: new Date().toISOString().split('T')[0], // Fecha actual por defecto
      vencimiento: "",
      tipoEnvio: "",
      costoEnvio: "",
      cliente: { nombre: "", email: "", telefono: "", direccion: "", cuit: "" },
      items: [],
    }
  });

  const items = watch("items");
  const tipoEnvio = watch("tipoEnvio");
  const costoEnvio = watch("costoEnvio");
  const [clienteId, setClienteId] = useState("");
  // Estado para clientes desde Firestore
  const [clientesState, setClientesState] = useState([]);
  const [clientesLoading, setClientesLoading] = useState(true);
  const clienteSeleccionado = clientesState.find(c => c.id === clienteId);
  // Estado para modal de nuevo cliente
  const [openNuevoCliente, setOpenNuevoCliente] = useState(false);
  const [nuevoCliente, setNuevoCliente] = useState({ nombre: "", cuit: "", direccion: "", telefono: "", email: "" });

  // Estado para selección de categoría y productos
  const [categoriaId, setCategoriaId] = useState("");
  const [productosSeleccionados, setProductosSeleccionados] = useState([]); // [{id, nombre, precio, cantidad, unidad, descuento}]
  // Estado para búsqueda global de productos
  const [busquedaProducto, setBusquedaProducto] = useState("");

  // Manejo de selección de productos
  const handleAgregarProducto = (producto) => {
    if (!productosSeleccionados.some(p => p.id === producto.id)) {
      setProductosSeleccionados([...productosSeleccionados, { ...producto, cantidad: 1, descuento: 0 }]);
    }
  };
  const handleQuitarProducto = (id) => {
    setProductosSeleccionados(productosSeleccionados.filter(p => p.id !== id));
  };
  const handleCantidadChange = (id, cantidad) => {
    setProductosSeleccionados(productosSeleccionados.map(p => p.id === id ? { ...p, cantidad: Number(cantidad) } : p));
  };
  const handleDescuentoChange = (id, descuento) => {
    setProductosSeleccionados(productosSeleccionados.map(p => p.id === id ? { ...p, descuento: Number(descuento) } : p));
  };

  // Calcular totales
  const subtotal = productosSeleccionados.reduce((acc, p) => {
    // Para machimbre y deck, el precio ya incluye la cantidad
    if (p.subcategoria === "machimbre" || p.subcategoria === "deck") {
      return acc + p.precio;
    } else {
      return acc + (p.precio * p.cantidad);
    }
  }, 0);
  const descuentoTotal = productosSeleccionados.reduce((acc, p) => acc + (p.descuento * p.cantidad), 0);
  // Calcular costo de envío solo si no es retiro local
  const costoEnvioCalculado = 
    tipoEnvio && 
    tipoEnvio !== "retiro_local" && 
    costoEnvio !== undefined && 
    costoEnvio !== "" && 
    !isNaN(Number(costoEnvio)) 
      ? Number(costoEnvio) 
      : 0;
  const total = subtotal - descuentoTotal + costoEnvioCalculado;

  // Flatpickr handlers
  const handleDateChange = (field, date) => {
    setValue(field, date[0]);
  };

  // Manejo de selección en Autocomplete
  const handleClienteChange = (val) => {
    if (val === "nuevo") {
      setOpenNuevoCliente(true);
    } else {
      setClienteId(val);
    }
  };

  // Guardar nuevo cliente
  const handleGuardarNuevoCliente = async () => {
    const clienteObj = { ...nuevoCliente };
    const docRef = await addDoc(collection(db, "clientes"), clienteObj);
    setClientesState([...clientesState, { ...clienteObj, id: docRef.id }]);
    setClienteId(docRef.id);
    setNuevoCliente({ nombre: "", cuit: "", direccion: "", telefono: "", email: "" });
    setOpenNuevoCliente(false);
  };

  // Sincronizar cliente seleccionado con el objeto cliente del formulario
  React.useEffect(() => {
    if (clienteSeleccionado) {
      setValue("cliente", {
        nombre: clienteSeleccionado.nombre || "",
        email: clienteSeleccionado.email || "",
        telefono: clienteSeleccionado.telefono || "",
        direccion: clienteSeleccionado.direccion || "",
        cuit: clienteSeleccionado.cuit || "",
      });
    }
  }, [clienteSeleccionado, setValue]);

  // Sincronizar productos seleccionados con items del formulario
  React.useEffect(() => {
    setValue("items", productosSeleccionados.map(p => ({
      descripcion: p.nombre,
      cantidad: p.cantidad,
      precio: p.precio,
      unidad: p.unidad,
      moneda: "$",
      descuento: p.descuento || 0,
    })));
  }, [productosSeleccionados, setValue]);

  useEffect(() => {
    const fetchClientes = async () => {
      setClientesLoading(true);
      const snap = await getDocs(collection(db, "clientes"));
      setClientesState(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setClientesLoading(false);
    };
    fetchClientes();
  }, []);

  // Debug: monitorear valores de envío
  useEffect(() => {
    console.log("Valores de envío actualizados:", { tipoEnvio, costoEnvio, costoEnvioCalculado });
  }, [tipoEnvio, costoEnvio, costoEnvioCalculado]);

  // Función de envío del formulario con validación profesional
  const handleFormSubmit = async (data) => {
    console.log("Formulario enviado con datos:", data); // Debug
    console.log("Campos de envío:", { tipoEnvio: data.tipoEnvio, costoEnvio: data.costoEnvio }); // Debug específico
    
    // Resetear estados previos
    setSubmitStatus(null);
    setSubmitMessage("");
    
    // Validaciones adicionales
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

    // Validar que todos los productos tengan cantidad > 0
    const productosInvalidos = productosSeleccionados.filter(p => p.cantidad <= 0);
    if (productosInvalidos.length > 0) {
      setSubmitStatus("error");
      setSubmitMessage("Todos los productos deben tener una cantidad mayor a 0");
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Preparar datos del formulario
      const formData = {
        ...data,
        clienteId: clienteId,
        productos: productosSeleccionados,
        subtotal: subtotal,
        descuentoTotal: descuentoTotal,
        total: total,
        fechaCreacion: new Date().toISOString(),
        tipo: "presupuesto",
        // Incluir campos de envío - capturar del formulario
        tipoEnvio: data.tipoEnvio || "",
        costoEnvio: data.costoEnvio ? Number(data.costoEnvio) : undefined,
      };

      console.log("Datos preparados para envío:", formData); // Debug
      console.log("Campos de envío en formData:", { 
        tipoEnvio: formData.tipoEnvio, 
        costoEnvio: formData.costoEnvio 
      }); // Debug específico

      // Llamar a la función onSubmit del componente padre
      await onSubmit(formData);
      
      // Éxito
      setSubmitStatus("success");
      setSubmitMessage("Presupuesto guardado exitosamente");
      
      // Cerrar modal después de un breve delay para mostrar el mensaje de éxito
      setTimeout(() => {
        onClose();
      }, 1500);
      
    } catch (error) {
      console.error("Error al guardar:", error);
      setSubmitStatus("error");
      setSubmitMessage(`Error al guardar: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Función para manejar el cierre del modal
  const handleClose = () => {
    if (!isSubmitting) {
      onClose();
    }
  };

  return (
    <>
      <DialogHeader className="mb-2">
        <DialogTitle>Nuevo Presupuesto</DialogTitle>
        <DialogDescription>
          Complete todos los campos requeridos para crear un nuevo presupuesto.
        </DialogDescription>
      </DialogHeader>
      
      {/* Indicador de estado de envío */}
      {submitStatus && (
        <div className={`mb-4 p-4 rounded-lg flex items-center gap-3 ${
          submitStatus === 'success' 
            ? 'bg-green-50 border border-green-200 text-green-800' 
            : 'bg-red-50 border border-red-200 text-red-800'
        }`}>
          {submitStatus === 'success' ? (
            <CheckCircle className="w-5 h-5 text-green-600" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-600" />
          )}
          <span className="font-medium">{submitMessage}</span>
        </div>
      )}

      <form onSubmit={handleSubmit(handleFormSubmit)} className="flex flex-col h-full">
        {/* Contenido scrolleable */}
        <div className="flex-1 overflow-y-auto px-1 pb-4 max-h-[calc(85vh-200px)]">
          <div className="flex flex-col gap-6">
            {/* Información básica */}
            <section className="bg-white rounded-lg p-4 border border-default-200 shadow-sm flex flex-col gap-2 mb-2">
              <label className="font-semibold">Información básica</label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <Input 
                    {...register("nombre")} 
                    placeholder="Nombre del documento" 
                    className="w-full" 
                    disabled={isSubmitting}
                  />
                  {errors.nombre && <span className="text-red-500 text-xs">{errors.nombre.message}</span>}
                </div>
                <div>
                  <Input 
                    {...register("fecha")} 
                    placeholder="Fecha de emisión" 
                    type="date" 
                    className="w-full" 
                    disabled={isSubmitting}
                  />
                  {errors.fecha && <span className="text-red-500 text-xs">{errors.fecha.message}</span>}
                </div>
                <div>
                  <Input 
                    {...register("vencimiento")} 
                    placeholder="Fecha de vencimiento" 
                    type="date" 
                    className="w-full" 
                    disabled={isSubmitting}
                  />
                  {errors.vencimiento && <span className="text-red-500 text-xs">{errors.vencimiento.message}</span>}
                </div>
              </div>
            </section>

            {/* Selección de cliente */}
            <section className="bg-white rounded-lg p-4 border border-default-200 shadow-sm flex flex-col gap-2 mb-2">
              <label className="font-semibold">Cliente</label>
              <div className="flex gap-2 items-center">
                <select
                  value={clienteId}
                  onChange={e => setClienteId(e.target.value)}
                  className="border rounded px-2 py-2 w-full"
                  name="clienteId"
                  ref={register ? register("clienteId").ref : undefined}
                  disabled={clientesLoading || isSubmitting}
                >
                  <option value="">Seleccionar cliente...</option>
                  {clientesState.map(c => (
                    <option key={c.id} value={c.id}>{c.nombre} - {c.cuit}</option>
                  ))}
                </select>
                <Button 
                  type="button" 
                  variant="default" 
                  onClick={() => setOpenNuevoCliente(true)}
                  disabled={isSubmitting}
                >
                  + Nuevo
                </Button>
              </div>
              {errors.clienteId && <span className="text-red-500 text-xs">{errors.clienteId.message}</span>}
            </section>

            {/* Selección de productos */}
            <section className="bg-white rounded-lg p-4 border border-default-200 shadow-sm flex flex-col gap-2 mb-2">
              <label className="font-semibold">Productos</label>
              
              {/* Búsqueda global */}
              <div className="mb-3">
                <Input
                  placeholder="Buscar productos..."
                  value={busquedaProducto}
                  onChange={(e) => setBusquedaProducto(e.target.value)}
                  className="w-full"
                  disabled={isSubmitting}
                />
              </div>

              {/* Categorías */}
              <div className="flex gap-2 mb-3 flex-wrap">
                {categorias.map(cat => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategoriaId(cat.id)}
                    className={`flex items-center px-3 py-2 rounded-lg border text-sm transition-colors ${
                      categoriaId === cat.id 
                        ? 'bg-primary text-white border-primary' 
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                    }`}
                    disabled={isSubmitting}
                  >
                    {cat.icon}
                    {cat.nombre}
                  </button>
                ))}
              </div>

              {/* Productos de la categoría seleccionada */}
              {categoriaId && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 mb-3">
                  {productosPorCategoria[categoriaId]
                    .filter(p => {
                      // Función para normalizar texto (eliminar espacios y convertir a minúsculas)
                      const normalizarTexto = (texto) => {
                        return texto.toLowerCase().replace(/\s+/g, '');
                      };

                      // Normalizar el término de búsqueda
                      const busquedaNormalizada = normalizarTexto(busquedaProducto || "");
                      
                      // Normalizar el nombre del producto
                      const nombreNormalizado = normalizarTexto(p.nombre || "");

                      return nombreNormalizado.includes(busquedaNormalizada);
                    })
                    .map(producto => (
                      <button
                        key={producto.id}
                        type="button"
                        onClick={() => handleAgregarProducto(producto)}
                        className="text-left p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                        disabled={isSubmitting}
                      >
                        <div className="font-medium">{producto.nombre}</div>
                        <div className="text-sm text-gray-600">${producto.precio} / {producto.unidad}</div>
                      </button>
                    ))}
                </div>
              )}

              {/* Tabla de productos seleccionados */}
              {productosSeleccionados.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm mt-2 min-w-[600px]">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="p-2">Producto</th>
                        <th>Cant.</th>
                        <th>Precio</th>
                        <th>Desc.</th>
                        <th>Subtotal</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {productosSeleccionados.map(p => (
                        <tr key={p.id}>
                          <td className="p-2">{p.nombre}</td>
                          <td><Input type="number" min={1} value={p.cantidad} onChange={e => handleCantidadChange(p.id, e.target.value)} className="w-16" disabled={isSubmitting} /></td>
                          <td>${p.precio}</td>
                          <td><Input type="number" min={0} value={p.descuento} onChange={e => handleDescuentoChange(p.id, e.target.value)} className="w-16" disabled={isSubmitting} /></td>
                          <td>${(p.precio * p.cantidad - p.descuento * p.cantidad).toFixed(2)}</td>
                          <td><Button type="button" size="icon" variant="ghost" onClick={() => handleQuitarProducto(p.id)} disabled={isSubmitting}>-</Button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {errors.items && <span className="text-red-500 text-xs">{errors.items.message}</span>}
            </section>
          </div>
        </div>

        {/* Sección fija de totales y footer */}
        <div className="border-t bg-white p-4 space-y-4 flex-shrink-0">
          {/* Información de envío */}
          <section className="bg-white rounded-lg p-4 border border-default-200 shadow-sm flex flex-col gap-2 mb-2">
            <label className="font-semibold">Información de envío</label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <select
                  {...register("tipoEnvio")}
                  className="border rounded px-2 py-2 w-full"
                  disabled={isSubmitting}
                >
                  <option value="">Tipo de envío...</option>
                  <option value="retiro_local">Retiro en local</option>
                  <option value="envio_domicilio">Envío a domicilio</option>
                  <option value="envio_obra">Envío a obra</option>
                  <option value="transporte_propio">Transporte propio del cliente</option>
                </select>
                {errors.tipoEnvio && (
                  <span className="text-red-500 text-xs">{errors.tipoEnvio.message}</span>
                )}
              </div>
              <div>
                <Input
                  {...register("costoEnvio")}
                  placeholder="Costo de envío"
                  type="number"
                  className="w-full"
                  disabled={isSubmitting}
                />
                {errors.costoEnvio && (
                  <span className="text-red-500 text-xs">{errors.costoEnvio.message}</span>
                )}
              </div>
            </div>
          </section>

          {/* Totales */}
          <div className="flex flex-col items-end gap-2">
            <div className="bg-primary/5 border border-primary/20 rounded-lg px-6 py-3 flex flex-col md:flex-row gap-4 md:gap-8 text-base shadow-sm w-full md:w-auto">
              <div>Subtotal: <span className="font-semibold">${subtotal.toFixed(2)}</span></div>
              <div>Descuento: <span className="font-semibold">${descuentoTotal.toFixed(2)}</span></div>
              {costoEnvioCalculado > 0 && (
                <div>Costo de envío: <span className="font-semibold">${costoEnvioCalculado.toFixed(2)}</span></div>
              )}
              <div>Total: <span className="font-bold text-primary">${total.toFixed(2)}</span></div>
            </div>
          </div>

          {/* Footer */}
          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={handleClose} 
              className="hover:bg-gray-100"
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              variant="default" 
              className="shadow-md min-w-[140px]"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Guardando...
                </>
              ) : (
                "Guardar Presupuesto"
              )}
            </Button>
          </DialogFooter>
        </div>
      </form>

      {/* Modal para nuevo cliente */}
      <Dialog open={openNuevoCliente} onOpenChange={setOpenNuevoCliente}>
        <DialogContent className="w-[95vw] max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Nuevo Cliente</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3 py-2">
            <Input 
              placeholder="Nombre" 
              value={nuevoCliente.nombre} 
              onChange={e => setNuevoCliente({...nuevoCliente, nombre: e.target.value})} 
            />
            <Input 
              placeholder="CUIT" 
              value={nuevoCliente.cuit} 
              onChange={e => setNuevoCliente({...nuevoCliente, cuit: e.target.value})} 
            />
            <Input 
              placeholder="Dirección" 
              value={nuevoCliente.direccion} 
              onChange={e => setNuevoCliente({...nuevoCliente, direccion: e.target.value})} 
            />
            <Input 
              placeholder="Teléfono" 
              value={nuevoCliente.telefono} 
              onChange={e => setNuevoCliente({...nuevoCliente, telefono: e.target.value})} 
            />
            <Input 
              placeholder="Email" 
              value={nuevoCliente.email} 
              onChange={e => setNuevoCliente({...nuevoCliente, email: e.target.value})} 
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenNuevoCliente(false)}>Cancelar</Button>
            <Button variant="default" onClick={handleGuardarNuevoCliente}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

const PresupuestosPage = () => {
  const [open, setOpen] = useState(false);
  const [presupuestosData, setPresupuestosData] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const params = useParams();
  const { lang } = params;

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        console.log("Cargando presupuestos desde Firebase...");
        const presupuestosSnap = await getDocs(collection(db, "presupuestos"));
        const presupuestos = presupuestosSnap.docs.map(doc => ({ 
          ...doc.data(), 
          id: doc.id,
          tipo: "presupuesto" // Asegurar que tenga el tipo correcto
        }));
        console.log("Presupuestos cargados:", presupuestos);
        setPresupuestosData(presupuestos);
      } catch (error) {
        console.error("Error al cargar presupuestos:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleClose = () => setOpen(false);
  
  const handleSubmit = async (formData) => {
    console.log("Recibiendo datos en PresupuestosPage:", formData); // Debug
    setLoading(true);
    try {
      // Procesar los datos para incluir correctamente los campos de envío
      const cleanFormData = {
        ...formData,
        // Asegurar que los campos de envío se guarden correctamente
        tipoEnvio: formData.tipoEnvio || "",
        costoEnvio: formData.costoEnvio ? Number(formData.costoEnvio) : undefined,
      };
      
      console.log("Datos procesados para guardar:", cleanFormData); // Debug
      
      const docRef = await addDoc(collection(db, "presupuestos"), cleanFormData);
      setOpen(false);
      router.push(`/${lang}/presupuestos/${docRef.id}`);
    } catch (error) {
      console.error("Error al guardar:", error);
      throw error; // Re-lanzar el error para que el componente hijo lo maneje
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando presupuestos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 py-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Presupuestos</h1>
          <p className="text-gray-600 mt-1">Gestiona todos tus presupuestos</p>
        </div>
        <Button variant="default" onClick={() => setOpen(true)}>
          Crear Presupuesto
        </Button>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Lista de Presupuestos</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable data={presupuestosData} columns={columns} />
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="w-[95vw] max-w-[1500px] h-[85vh] flex flex-col">
          <FormularioPresupuesto onClose={handleClose} onSubmit={handleSubmit} />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PresupuestosPage; 