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
import {
  Boxes,
  Plus,
  Loader2,
  CheckCircle,
  AlertCircle,
  Upload,
  Download,
} from "lucide-react";
import { db } from "@/lib/firebase";
import {
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  doc,
  updateDoc,
  getDocs,
  writeBatch,
} from "firebase/firestore";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";

const categorias = ["Costura", "Taller", "Seminario", "Otros"];

// Función para formatear números en formato argentino
const formatearNumeroArgentino = (numero) => {
  if (numero === null || numero === undefined || isNaN(numero)) return "0";
  return Number(numero).toLocaleString("es-AR");
};


// Función para validar inventario
function validarInventario(inventario) {
  if (inventario === null || inventario === undefined) return 0;
  const num = typeof inventario === "string" ? parseInt(inventario) : inventario;
  return isNaN(num) ? 0 : Math.max(0, num);
}

// Esquema de validación para productos de tienda y cursos
const productoBaseSchema = yup.object().shape({
  id: yup.string().required("El ID es obligatorio"),
  nombre: yup.string().required("El nombre es obligatorio"),
  sku: yup.string().nullable(),
  tipo: yup.string().oneOf(["simple", "variation"]).required("El tipo es obligatorio"),
  publicado: yup.boolean().required("El estado de publicación es obligatorio"),
  precio: yup.object().shape({
    normal: yup.number().positive().required("El precio normal es obligatorio"),
    rebajado: yup.number().positive().nullable()
  }).required("Los precios son obligatorios"),
  inventario: yup.number().integer().min(0).required("El inventario es obligatorio"),
  categorias: yup.array().of(yup.string()).min(1, "Al menos una categoría es obligatoria"),
  imagenes: yup.array().of(yup.string().url()).default([]),
  atributos: yup.object().nullable()
});

// Componente FormularioProducto para productos de tienda y cursos
function FormularioProducto({ onClose, onSuccess }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState(null);
  const [submitMessage, setSubmitMessage] = useState("");

  // Normalizador para números y arrays
  const toNumber = (value) => {
    if (value === null || value === undefined) return undefined;
    if (typeof value === "number") return Number.isNaN(value) ? undefined : value;
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (!trimmed) return undefined;
      const normalized = trimmed.replace(/,/g, ".");
      const num = Number(normalized);
      return Number.isNaN(num) ? undefined : num;
    }
    const num = Number(value);
    return Number.isNaN(num) ? undefined : num;
  };

  const parseArray = (value) => {
    if (Array.isArray(value)) return value;
    if (typeof value === "string") {
      return value.split(",").map(item => item.trim()).filter(Boolean);
    }
    return [];
  };
  
  // Estados para agregar nuevos valores
  const [showAddCategoria, setShowAddCategoria] = useState(false);
  const [newValue, setNewValue] = useState("");
  
  // Estados para valores precargados
  const [categoriasUnicas, setCategoriasUnicas] = useState([]);
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm({
    resolver: yupResolver(productoBaseSchema),
    defaultValues: { 
      publicado: true,
      tipo: "simple",
      inventario: 0,
      categorias: [],
      imagenes: [],
      atributos: {}
    },
  });

  const watchedPrecioNormal = watch("precio.normal");
  const watchedPrecioRebajado = watch("precio.rebajado");

  useEffect(() => {
      cargarDatosPrecargados();
  }, []);

  const cargarDatosPrecargados = async () => {
    try {
      const productosSnap = await getDocs(collection(db, "productos"));
      const productos = productosSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Extraer todas las categorías únicas
      const todasCategorias = new Set();
      productos.forEach(producto => {
        if (producto.categorias && Array.isArray(producto.categorias)) {
          producto.categorias.forEach(cat => todasCategorias.add(cat));
        }
      });
      
      setCategoriasUnicas([...todasCategorias].sort());
    } catch (error) {
      console.error("Error al cargar datos precargados:", error);
    }
  };

  const handleAddNewValue = async (tipo, valor) => {
    if (!valor.trim()) return;
    
    try {
      switch (tipo) {
        case 'categoria':
          setCategoriasUnicas(prev => [...prev, valor.trim()]);
          // Agregar la nueva categoría al array de categorías actual
          const categoriasActuales = watch("categorias") || [];
          setValue('categorias', [...categoriasActuales, valor.trim()]);
          break;
      }
      
      setShowAddCategoria(false);
      setNewValue("");
    } catch (error) {
      console.error("Error al agregar nuevo valor:", error);
    }
  };

  const onSubmit = async (data) => {
    setIsSubmitting(true);
    setSubmitStatus(null);
    setSubmitMessage("");
    try {
      // Normalizar datos antes de guardar
      const payload = { ...data };

      // Normalizar arrays y objetos
      if (payload.categorias) {
        payload.categorias = parseArray(payload.categorias);
      }
      if (payload.imagenes) {
        payload.imagenes = parseArray(payload.imagenes);
      }
      if (payload.atributos && typeof payload.atributos === 'string') {
        try {
          payload.atributos = JSON.parse(payload.atributos);
        } catch {
          payload.atributos = {};
        }
      }

      // Normalizar precios
      if (payload.precio?.normal !== undefined) {
        payload.precio.normal = toNumber(payload.precio.normal);
      }
      if (payload.precio?.rebajado !== undefined) {
        payload.precio.rebajado = toNumber(payload.precio.rebajado);
      }

      // Normalizar inventario
      if (payload.inventario !== undefined) {
        payload.inventario = validarInventario(payload.inventario);
      }

      // Generar ID si no existe
      if (!payload.id) {
        payload.id = Math.random().toString(36).substr(2, 9);
      }

      // Eliminar claves con undefined para evitar errores de Firestore
      Object.keys(payload).forEach((k) => {
        if (payload[k] === undefined) {
          delete payload[k];
        }
      });

      console.log("Producto a guardar:", payload);

      await addDoc(collection(db, "productos"), {
        ...payload,
        fechaCreacion: new Date().toISOString(),
        fechaActualizacion: new Date().toISOString(),
      });
      
      setSubmitStatus("success");
      setSubmitMessage("Producto guardado exitosamente");
      reset();
      
      setTimeout(() => {
        onSuccess && onSuccess();
        onClose();
      }, 1200);
    } catch (e) {
      setSubmitStatus("error");
      setSubmitMessage("Error al guardar: " + e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const onSubmitError = (errors) => {
    const fieldNames = Object.keys(errors || {});
    const messages = fieldNames.map((k) => errors[k]?.message || k);
    // Solo logs en consola, sin UI
    setSubmitStatus("error");
    setSubmitMessage(
      messages.length
        ? `Validación fallida: ${messages.join("; ")}`
        : "Validación fallida. Revisa los campos obligatorios."
    );
    try {
      // eslint-disable-next-line no-console
      console.groupCollapsed("FormularioProducto › validation errors");
      // eslint-disable-next-line no-console
      console.warn("Campos con error:", fieldNames);
      // eslint-disable-next-line no-console
      console.warn("Detalle de errores:", errors);
    } finally {
      // eslint-disable-next-line no-console
      console.groupEnd();
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit, onSubmitError)} className="space-y-6">
      {/* Feedback de guardado con animación */}
      {submitStatus && (
        <div
          className={`mb-6 p-4 rounded-xl flex items-center gap-3 text-sm shadow-lg transform transition-all duration-300 ${
            submitStatus === "success"
              ? "bg-gradient-to-r from-green-50 to-emerald-50 text-green-800 border border-green-200"
              : "bg-gradient-to-r from-red-50 to-pink-50 text-red-800 border border-red-200"
          }`}
        >
          <div className={`p-2 rounded-full ${submitStatus === "success" ? "bg-green-100" : "bg-red-100"}`}>
            {submitStatus === "success" ? (
              <CheckCircle className="w-5 h-5 text-green-600" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-600" />
            )}
          </div>
          <div>
            <div className="font-semibold">
              {submitStatus === "success" ? "¡Éxito!" : "Error"}
            </div>
            <div className="text-sm opacity-90">{submitMessage}</div>
          </div>
        </div>
      )}

      {/* Formulario simplificado para el nuevo esquema */}
      <div className="space-y-8">
          {/* Sección: Datos generales */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-100">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-blue-500 rounded-lg">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-800">Datos Generales</h3>
                <p className="text-sm text-gray-600">Información básica del producto</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <span className="text-red-500">*</span>
                  ID del Producto
                </label>
                <Input
                  {...register("id")}
                  placeholder="Ej: PROD-001"
                  disabled={isSubmitting}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all duration-200 bg-white shadow-sm hover:border-gray-300 disabled:bg-gray-50"
                />
                {errors.id && (
                  <div className="flex items-center gap-2 text-red-600 text-sm">
                    <AlertCircle className="w-4 h-4" />
                    {errors.id.message}
                  </div>
                )}
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <span className="text-red-500">*</span>
                  Nombre del Producto
                </label>
                <Input
                  {...register("nombre")}
                  placeholder="Ej: Curso de Costura"
                  disabled={isSubmitting}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all duration-200 bg-white shadow-sm hover:border-gray-300 disabled:bg-gray-50"
                />
                {errors.nombre && (
                  <div className="flex items-center gap-2 text-red-600 text-sm">
                    <AlertCircle className="w-4 h-4" />
                    {errors.nombre.message}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">
                  SKU (opcional)
                </label>
                <Input
                  {...register("sku")}
                  placeholder="Ej: SKU-001"
                  disabled={isSubmitting}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all duration-200 bg-white shadow-sm hover:border-gray-300 disabled:bg-gray-50"
                />
                {errors.sku && (
                  <div className="flex items-center gap-2 text-red-600 text-sm">
                    <AlertCircle className="w-4 h-4" />
                    {errors.sku.message}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <span className="text-red-500">*</span>
                  Tipo
                </label>
                <select
                  {...register("tipo")}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all duration-200 bg-white shadow-sm hover:border-gray-300 disabled:bg-gray-50"
                  disabled={isSubmitting}
                >
                  <option value="simple">Simple</option>
                  <option value="variation">Variación</option>
                </select>
                {errors.tipo && (
                  <div className="flex items-center gap-2 text-red-600 text-sm">
                    <AlertCircle className="w-4 h-4" />
                    {errors.tipo.message}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <span className="text-red-500">*</span>
                  Precio Normal
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                  <Input
                    {...register("precio.normal")}
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    disabled={isSubmitting}
                    className="w-full pl-8 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all duration-200 bg-white shadow-sm hover:border-gray-300 disabled:bg-gray-50"
                  />
                </div>
                {errors.precio?.normal && (
                  <div className="flex items-center gap-2 text-red-600 text-sm">
                    <AlertCircle className="w-4 h-4" />
                    {errors.precio.normal.message}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">
                  Precio Rebajado (opcional)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                  <Input
                    {...register("precio.rebajado")}
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    disabled={isSubmitting}
                    className="w-full pl-8 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all duration-200 bg-white shadow-sm hover:border-gray-300 disabled:bg-gray-50"
                  />
                </div>
                {errors.precio?.rebajado && (
                  <div className="flex items-center gap-2 text-red-600 text-sm">
                    <AlertCircle className="w-4 h-4" />
                    {errors.precio.rebajado.message}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <span className="text-red-500">*</span>
                  Inventario
                </label>
                <Input
                  {...register("inventario")}
                  type="number"
                  step="1"
                  placeholder="0"
                  disabled={isSubmitting}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all duration-200 bg-white shadow-sm hover:border-gray-300 disabled:bg-gray-50"
                />
                {errors.inventario && (
                  <div className="flex items-center gap-2 text-red-600 text-sm">
                    <AlertCircle className="w-4 h-4" />
                    {errors.inventario.message}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <span className="text-red-500">*</span>
                  Categorías
                </label>
                <div className="flex gap-2">
                  <select
                    {...register("categorias")}
                    className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all duration-200 bg-white shadow-sm hover:border-gray-300 disabled:bg-gray-50"
                    disabled={isSubmitting}
                  >
                    <option value="">Seleccionar categorías</option>
                    {categoriasUnicas.map((categoria) => (
                      <option key={categoria} value={categoria}>
                        {categoria}
                      </option>
                    ))}
                  </select>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowAddCategoria(true)}
                    className="px-4 py-3 border-2 border-gray-200 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all duration-200"
                    disabled={isSubmitting}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                {showAddCategoria && (
                  <div className="flex gap-2 mt-3 p-3 bg-gray-50 rounded-xl border border-gray-200">
                    <Input
                      value={newValue}
                      onChange={(e) => setNewValue(e.target.value)}
                      placeholder="Nueva categoría"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => handleAddNewValue('categoria', newValue)}
                      disabled={isSubmitting}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Agregar
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setShowAddCategoria(false);
                        setNewValue("");
                      }}
                      disabled={isSubmitting}
                      className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Cancelar
                    </Button>
                  </div>
                )}
                {errors.categorias && (
                  <div className="flex items-center gap-2 text-red-600 text-sm">
                    <AlertCircle className="w-4 h-4" />
                    {errors.categorias.message}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">
                  Imágenes (URLs separadas por comas)
                </label>
                <Input
                  {...register("imagenes")}
                  placeholder="https://ejemplo.com/imagen1.jpg, https://ejemplo.com/imagen2.jpg"
                  disabled={isSubmitting}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all duration-200 bg-white shadow-sm hover:border-gray-300 disabled:bg-gray-50"
                />
                {errors.imagenes && (
                  <div className="flex items-center gap-2 text-red-600 text-sm">
                    <AlertCircle className="w-4 h-4" />
                    {errors.imagenes.message}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">
                  Atributos (JSON)
                </label>
                <Input
                  {...register("atributos")}
                  placeholder='{"Turno": "Jueves 10hs", "Seminario": "Seminario"}'
                  disabled={isSubmitting}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all duration-200 bg-white shadow-sm hover:border-gray-300 disabled:bg-gray-50"
                />
                {errors.atributos && (
                  <div className="flex items-center gap-2 text-red-600 text-sm">
                    <AlertCircle className="w-4 h-4" />
                    {errors.atributos.message}
                  </div>
                )}
              </div>

              <div className="md:col-span-2 space-y-2">
                <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <span className="text-red-500">*</span>
                  Estado de Publicación
                </label>
                <select
                  {...register("publicado")}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all duration-200 bg-white shadow-sm hover:border-gray-300 disabled:bg-gray-50"
                  disabled={isSubmitting}
                >
                  <option value={true}>Publicado</option>
                  <option value={false}>No publicado</option>
                </select>
                {errors.publicado && (
                  <div className="flex items-center gap-2 text-red-600 text-sm">
                    <AlertCircle className="w-4 h-4" />
                    {errors.publicado.message}
                  </div>
                )}
              </div>
            </div>
          </div>



          {/* Footer con botones modernos */}
          <div className="flex justify-end gap-4 pt-6 border-t border-gray-200">
            <Button
              variant="outline"
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-6 py-3 border-2 border-gray-300 rounded-xl hover:border-gray-400 hover:bg-gray-50 transition-all duration-200"
            >
              Cancelar
            </Button>
            <Button 
              variant="default" 
              type="submit" 
              disabled={isSubmitting}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-200"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Guardando...
                </>
              ) : (
                "Guardar Producto"
              )}
            </Button>
          </div>
        </div>
    </form>
  );
}

const ProductosPage = () => {
  const [open, setOpen] = useState(false);
  const [openBulk, setOpenBulk] = useState(false);
  const [filtro, setFiltro] = useState("");
  const [cat, setCat] = useState("");
  const [filtroTienda, setFiltroTienda] = useState("");

  const [reload, setReload] = useState(false);
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Estados para datos precargados de Firebase
  const [subcategorias, setSubcategorias] = useState([]);

  // Estados para carga masiva
  const [bulkStatus, setBulkStatus] = useState(null);
  const [bulkMessage, setBulkMessage] = useState("");
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({ current: 0, total: 0 });
  const [bulkFile, setBulkFile] = useState(null);


  // Estados para selección múltiple
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteMessage, setDeleteMessage] = useState("");

  // Estados para dropdowns
  const [importDropdownOpen, setImportDropdownOpen] = useState(false);
  const [exportDropdownOpen, setExportDropdownOpen] = useState(false);

  // Estados para edición masiva
  const [bulkEditModalOpen, setBulkEditModalOpen] = useState(false);
  const [bulkEditForm, setBulkEditForm] = useState({
    publicado: "",
  });
  const [bulkEditLoading, setBulkEditLoading] = useState(false);
  const [bulkEditMessage, setBulkEditMessage] = useState("");

  // Estados para paginación optimizada
  const [paginaActual, setPaginaActual] = useState(1);
  const [productosPorPagina, setProductosPorPagina] = useState(20);
  const [isLoadingPagination, setIsLoadingPagination] = useState(false);

  // Función para cargar datos precargados de Firebase
  const cargarDatosPrecargados = () => {
    // Extraer categorías únicas de todos los productos
    const todasCategorias = new Set();
    productos.forEach(producto => {
      if (producto.categorias && Array.isArray(producto.categorias)) {
        producto.categorias.forEach(cat => todasCategorias.add(cat));
      }
    });
    
    const categoriasUnicas = [...todasCategorias].sort();
    setSubcategorias(categoriasUnicas); // Reutilizamos el estado de subcategorias para categorías
    
    // Limpiar arrays que ya no se usan
  };





  useEffect(() => {
    setLoading(true);
    setError(null);
    
    // Cargar productos de la nueva estructura
    const productosQuery = query(collection(db, "productos"), orderBy("nombre"));
    
    const unsubProductos = onSnapshot(
      productosQuery,
      (snapshot) => {
        const productosData = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        setProductos(productosData);
            setLoading(false);
            // Cargar datos precargados después de obtener los productos
            cargarDatosPrecargados();
      },
      (err) => {
        setError("Error al cargar productos: " + err.message);
        setLoading(false);
      }
    );
    
    return () => unsubProductos();
  }, [reload]);


  // Productos filtrados optimizados con useMemo
  const productosFiltrados = useMemo(() => {
    return productos.filter((p) => {
      // Función para normalizar texto (eliminar espacios y convertir a minúsculas)
      const normalizarTexto = (texto) => {
        if (!texto) return "";
        return texto.toLowerCase().replace(/\s+/g, '');
      };

      // Normalizar el término de búsqueda
      const filtroNormalizado = normalizarTexto(filtro || "");
      
      // Normalizar el nombre del producto
      const nombreNormalizado = normalizarTexto(p.nombre || "");
      
      // Normalizar el ID del producto
      const idNormalizado = normalizarTexto(p.id || "");

      // Filtro por categoría (ahora es un array)
      const cumpleCategoria = cat ? 
        (p.categorias && p.categorias.includes(cat)) : true;
      // Filtro por búsqueda de texto con lógica mejorada
      let cumpleFiltro = !filtro;
      
      if (filtro) {
        // Si la búsqueda termina con punto, usar búsqueda dinámica (starts with)
        if (filtroNormalizado.endsWith('.')) {
          const busquedaSinPunto = filtroNormalizado.slice(0, -1);
          cumpleFiltro = 
            nombreNormalizado.startsWith(busquedaSinPunto) ||
            idNormalizado.startsWith(busquedaSinPunto);
        } else {
          // Búsqueda normal: incluye el texto en cualquier parte
          cumpleFiltro = 
            nombreNormalizado.includes(filtroNormalizado) ||
            idNormalizado.includes(filtroNormalizado);
        }
      }

      // Filtro por estado de publicación
      const cumplePublicado = filtroTienda === "" ||
        (filtroTienda === "Publicado" && p.publicado) ||
        (filtroTienda === "No Publicado" && !p.publicado);

      return cumpleCategoria && cumpleFiltro && cumplePublicado;
    }).sort((a, b) => {
      // Ordenar por inventario: primero los que tienen inventario, luego los que no
      const inventarioA = Number(a.inventario) || 0;
      const inventarioB = Number(b.inventario) || 0;
      
      if (inventarioA > 0 && inventarioB === 0) return -1; // a tiene inventario, b no
      if (inventarioA === 0 && inventarioB > 0) return 1;  // b tiene inventario, a no
      
      // Si ambos tienen inventario o ambos no tienen inventario, mantener orden original
      return 0;
    });
  }, [productos, cat, filtro, filtroTienda]);

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
  }, [cat, filtro, filtroTienda]);


  // Función para procesar archivo Excel/CSV
  const processExcelFile = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const content = e.target.result;
          console.log("Archivo leído:", file.name, "Tamaño:", file.size);

          // Si es un archivo CSV, procesar directamente
          if (file.name.toLowerCase().endsWith(".csv")) {
            const lines = content.split("\n");
            console.log("Líneas CSV encontradas:", lines.length);

            if (lines.length < 2) {
              reject(
                new Error(
                  "El archivo CSV debe tener al menos una fila de encabezados y una fila de datos"
                )
              );
              return;
            }

            const headers = lines[0]
              .split(",")
              .map((h) => h.trim().replace(/"/g, ""));
            console.log("Encabezados detectados:", headers);

            const productos = [];
            for (let i = 1; i < lines.length; i++) {
              if (lines[i].trim()) {
                // Función para parsear valores CSV correctamente
                const parseCSVLine = (line) => {
                  const result = [];
                  let current = "";
                  let inQuotes = false;

                  for (let j = 0; j < line.length; j++) {
                    const char = line[j];
                    if (char === '"') {
                      inQuotes = !inQuotes;
                    } else if (char === "," && !inQuotes) {
                      result.push(current.trim());
                      current = "";
                    } else {
                      current += char;
                    }
                  }
                  result.push(current.trim());
                  return result;
                };

                const values = parseCSVLine(lines[i]);
                const producto = {};

                headers.forEach((header, index) => {
                  let value = values[index] || "";

                  // Limpiar comillas
                  value = value.replace(/"/g, "");

                  // Convertir valores numéricos
                  if (["precio_normal", "precio_rebajado", "inventario"].includes(header)) {
                    // Manejar comas en números (formato argentino)
                    value = value.replace(",", ".");
                    value = parseFloat(value) || 0;
                  }

                  // Convertir booleanos
                  if (header === "publicado") {
                    value = value.toLowerCase() === "true" || value === "1" || value.toLowerCase() === "si";
                  }

                  // Convertir arrays
                  if (header === "categorias" || header === "imagenes") {
                    value = value ? value.split(";").map(item => item.trim()).filter(Boolean) : [];
                  }

                  // Convertir objeto JSON
                  if (header === "atributos") {
                    try {
                      value = value ? JSON.parse(value) : {};
                    } catch {
                      value = {};
                    }
                  }

                  producto[header] = value;
                });

                // Validar que tenga los campos mínimos
                if (producto.id && producto.nombre && producto.categorias && producto.categorias.length > 0) {
                  // Estructurar el precio correctamente
                  if (producto.precio_normal) {
                    producto.precio = {
                      normal: producto.precio_normal,
                      rebajado: producto.precio_rebajado || null
                    };
                    delete producto.precio_normal;
                    delete producto.precio_rebajado;
                  }

                  productos.push(producto);
                  console.log("Producto válido agregado:", producto.id);
                } else {
                  console.log("Producto inválido ignorado:", producto);
                }
              }
            }

            console.log("Total de productos válidos:", productos.length);
            resolve(productos);
          } else {
            // Para archivos Excel (.xlsx, .xls), mostrar error por ahora
            reject(
              new Error(
                "Los archivos Excel (.xlsx, .xls) no están soportados aún. Por favor, guarda tu archivo como CSV y súbelo nuevamente."
              )
            );
          }
        } catch (error) {
          console.error("Error procesando archivo:", error);
          reject(error);
        }
      };

      reader.onerror = () => {
        console.error("Error al leer el archivo");
        reject(new Error("Error al leer el archivo"));
      };

      // Leer como texto para CSV
      reader.readAsText(file);
    });
  };



  // Función para procesar carga masiva
  const handleBulkUpload = async () => {
    setBulkStatus(null);
    setBulkMessage("");
    setBulkLoading(true);
    setBulkProgress({ current: 0, total: 0 });

    try {
      let productosData;

      if (!bulkFile) {
        setBulkStatus("error");
        setBulkMessage("Debes seleccionar un archivo Excel/CSV.");
        setBulkLoading(false);
        return;
      }

      try {
        productosData = await processExcelFile(bulkFile);
      } catch (e) {
        setBulkStatus("error");
        setBulkMessage("Error al procesar el archivo: " + e.message);
        setBulkLoading(false);
        return;
      }

      // Validar productos
      const productosValidos = [];
      const productosInvalidos = [];

      for (let i = 0; i < productosData.length; i++) {
        const producto = productosData[i];

        // Validaciones básicas
        if (!producto.id || !producto.nombre || !producto.categorias || producto.categorias.length === 0) {
          productosInvalidos.push({
            index: i + 1,
            id: producto.id || "Sin ID",
            error: "Faltan campos obligatorios (id, nombre, categorías)",
          });
          continue;
        }

        // Validar que tenga precio
        if (!producto.precio || !producto.precio.normal) {
          productosInvalidos.push({
            index: i + 1,
            id: producto.id,
            error: "Falta precio normal",
          });
          continue;
        }

        // Validar inventario
        if (producto.inventario === undefined || producto.inventario === null) {
          producto.inventario = 0;
        }

        // Validar tipo
        if (!producto.tipo) {
          producto.tipo = "simple";
        }

        // Validar publicado
        if (producto.publicado === undefined || producto.publicado === null) {
          producto.publicado = true;
        }

        // Validar que los valores numéricos sean válidos
        if (producto.precio.normal <= 0) {
          productosInvalidos.push({
            index: i + 1,
            id: producto.id,
            error: "El precio normal debe ser mayor a 0",
          });
          continue;
        }

        if (producto.precio.rebajado && producto.precio.rebajado <= 0) {
          productosInvalidos.push({
            index: i + 1,
            id: producto.id,
            error: "El precio rebajado debe ser mayor a 0",
          });
          continue;
        }

        if (producto.inventario < 0) {
            productosInvalidos.push({
              index: i + 1,
            id: producto.id,
            error: "El inventario no puede ser negativo",
            });
            continue;
        }

        productosValidos.push({
          ...producto,
          fechaCreacion: new Date().toISOString(),
          fechaActualizacion: new Date().toISOString(),
        });
      }

      // Mostrar errores si hay productos inválidos
      if (productosInvalidos.length > 0) {
        setBulkStatus("error");
        const erroresDetallados = productosInvalidos
          .map((p) => `Línea ${p.index} (${p.id}): ${p.error}`)
          .join("\n");
        setBulkMessage(
          `Se encontraron ${productosInvalidos.length} productos con errores:\n\n${erroresDetallados}`
        );
        setBulkLoading(false);
        return;
      }

      // Procesar productos válidos
      setBulkProgress({ current: 0, total: productosValidos.length });

      for (let i = 0; i < productosValidos.length; i++) {
        const producto = productosValidos[i];

        try {
          await addDoc(collection(db, "productos"), producto);
          setBulkProgress({ current: i + 1, total: productosValidos.length });

          // Pequeña pausa para no sobrecargar Firebase
          await new Promise((resolve) => setTimeout(resolve, 100));
        } catch (e) {
          setBulkStatus("error");
          setBulkMessage(
            `Error al guardar producto ${producto.id}: ${e.message}`
          );
          setBulkLoading(false);
          return;
        }
      }

      setBulkStatus("success");
      setBulkMessage(
        `Se cargaron exitosamente ${productosValidos.length} productos.`
      );

      // Limpiar formulario y cerrar modal
      setTimeout(() => {
        setOpenBulk(false);
        setBulkFile(null);
        setBulkStatus(null);
        setBulkMessage("");
        setBulkLoading(false);
        setBulkProgress({ current: 0, total: 0 });
        setReload((r) => !r);
      }, 2000);
    } catch (e) {
      setBulkStatus("error");
      setBulkMessage("Error inesperado: " + e.message);
      setBulkLoading(false);
    }
  };

  // Función para descargar plantilla CSV
  const downloadExampleCSV = () => {
    const headers = [
      "id",
      "nombre", 
      "sku",
      "tipo",
      "publicado",
      "precio_normal",
      "precio_rebajado",
      "inventario",
      "categorias",
      "imagenes",
      "atributos"
    ];

    const exampleData = [
      [
        "9625",
        "Curso de Costura - Jueves 10hs",
        "CSV-001",
        "variation",
        "true",
        "1000",
        "800",
        "4",
        "Costura;Taller",
        "https://ejemplo.com/imagen1.jpg;https://ejemplo.com/imagen2.jpg",
        '{"Turno": "Jueves 10hs", "Seminario": "Seminario"}'
      ]
    ];

    const csvRows = [headers.join(","), ...exampleData.map(row => 
      row.map(field => `"${field}"`).join(",")
    )];

    const csvContent = "data:text/csv;charset=utf-8," + csvRows.join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "plantilla_productos.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Función para descargar plantilla CSV específica
  const downloadExampleCSVFerreteria = () => {
    // Función eliminada - usar downloadExampleCSV en su lugar
  };

  // Función para descargar plantilla CSV específica para obras (eliminada)
  const downloadExampleCSVObras = () => {
    // Función eliminada - usar downloadExampleCSV en su lugar
  };

  // Funciones de exportación específicas (eliminadas)
  const exportarFerreteriaCSV = () => {
    // Función eliminada - usar exportarProductosCSV en su lugar
  };

  const exportarObrasCSV = () => {
    // Función eliminada - usar exportarProductosCSV en su lugar
  };

  // Funciones de manejo de precios
  const handlePrecioChange = async (id, nuevoPrecio) => {
    try {
      const productoRef = doc(db, "productos", id);
      await updateDoc(productoRef, {
        "precio.normal": Number(nuevoPrecio),
        fechaActualizacion: new Date().toISOString(),
      });
      console.log(`Precio actualizado para producto ${id}: ${nuevoPrecio}`);
    } catch (error) {
      console.error("Error al actualizar precio:", error);
    }
  };

  const handleInventarioChange = async (id, nuevoInventario) => {
    try {
      const productoRef = doc(db, "productos", id);
      await updateDoc(productoRef, {
        inventario: Number(nuevoInventario),
        fechaActualizacion: new Date().toISOString(),
      });
      console.log(`Inventario actualizado para producto ${id}: ${nuevoInventario}`);
    } catch (error) {
      console.error("Error al actualizar inventario:", error);
    }
  };

  // Funciones para selección múltiple
  const handleSelectProduct = (productId) => {
    setSelectedProducts(prev => 
      prev.includes(productId) 
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  };

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedProducts([]);
    } else {
      setSelectedProducts(productosPaginados.map(p => p.id));
    }
    setSelectAll(!selectAll);
  };

  const handleDeleteSelected = async () => {
    setDeleteLoading(true);
    setDeleteMessage("");
    
    try {
      const batch = writeBatch(db);
      
      selectedProducts.forEach(productId => {
        const productoRef = doc(db, "productos", productId);
        batch.delete(productoRef);
      });
      
      await batch.commit();
      setDeleteMessage(`Se eliminaron ${selectedProducts.length} productos exitosamente`);
      setSelectedProducts([]);
      setSelectAll(false);
      setReload(prev => !prev);
      
      setTimeout(() => {
        setDeleteModalOpen(false);
        setDeleteMessage("");
      }, 2000);
    } catch (error) {
      setDeleteMessage(`Error al eliminar productos: ${error.message}`);
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleBulkEdit = async () => {
    setBulkEditLoading(true);
    setBulkEditMessage("");
    
    try {
      const batch = writeBatch(db);
      
      selectedProducts.forEach(productId => {
        const productoRef = doc(db, "productos", productId);
        const updates = {};
        
        if (bulkEditForm.publicado !== "") updates.publicado = bulkEditForm.publicado === "true";
        
        updates.fechaActualizacion = new Date().toISOString();
        
        batch.update(productoRef, updates);
      });
      
      await batch.commit();
      setBulkEditMessage(`Se actualizaron ${selectedProducts.length} productos exitosamente`);
      setSelectedProducts([]);
      setSelectAll(false);
      setBulkEditForm({ publicado: "" });
      setReload(prev => !prev);
      
      setTimeout(() => {
        setBulkEditModalOpen(false);
        setBulkEditMessage("");
      }, 2000);
    } catch (error) {
      setBulkEditMessage(`Error al actualizar productos: ${error.message}`);
    } finally {
      setBulkEditLoading(false);
    }
  };

  const openBulkEditModal = () => {
    if (selectedProducts.length === 0) {
      alert("Debes seleccionar al menos un producto");
      return;
    }
    setBulkEditModalOpen(true);
  };

  // Función para manejar clics fuera de elementos
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.dropdown')) {
        setImportDropdownOpen(false);
        setExportDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gestión de Productos</h1>
          <p className="text-gray-600 mt-2">Administra los productos de tienda y cursos</p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            onClick={() => setOpen(true)}
            className="flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Nuevo Producto
          </Button>
        </div>
      </div>

      {/* Formulario de producto */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nuevo Producto</DialogTitle>
          </DialogHeader>
          <FormularioProducto 
            onClose={() => setOpen(false)} 
            onSuccess={() => setReload(prev => !prev)} 
          />
        </DialogContent>
      </Dialog>

      {/* Modal de carga masiva */}
      <Dialog open={openBulk} onOpenChange={setOpenBulk}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Carga Masiva de Productos</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Seleccionar archivo CSV
              </label>
              <input
                type="file"
                accept=".csv"
                onChange={(e) => setBulkFile(e.target.files[0])}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
            </div>

            {bulkFile && (
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600">
                  Archivo seleccionado: <span className="font-medium">{bulkFile.name}</span>
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Tamaño: {(bulkFile.size / 1024).toFixed(2)} KB
                </p>
              </div>
            )}

            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="sm"
                onClick={downloadExampleCSV}
                className="flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Descargar Plantilla
              </Button>
            </div>

            {bulkStatus && (
              <div className={`p-4 rounded-lg ${
                bulkStatus === "success" 
                  ? "bg-green-50 text-green-800 border border-green-200" 
                  : "bg-red-50 text-red-800 border border-red-200"
              }`}>
                <div className="flex items-center gap-2 mb-2">
                  {bulkStatus === "success" ? (
                    <CheckCircle className="w-5 h-5" />
                  ) : (
                    <AlertCircle className="w-5 h-5" />
                  )}
                  <span className="font-medium">
                    {bulkStatus === "success" ? "Éxito" : "Error"}
                  </span>
                </div>
                <p className="text-sm whitespace-pre-line">{bulkMessage}</p>
                {bulkProgress.total > 0 && (
                  <div className="mt-3">
                    <div className="flex justify-between text-xs text-gray-600 mb-1">
                      <span>Progreso</span>
                      <span>{bulkProgress.current} / {bulkProgress.total}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${(bulkProgress.current / bulkProgress.total) * 100}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenBulk(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleBulkUpload} 
              disabled={!bulkFile || bulkLoading}
              className="flex items-center gap-2"
            >
              {bulkLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Procesando...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  Cargar Productos
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Tabla de productos */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl font-semibold">
              Productos ({productosFiltrados.length})
            </CardTitle>
            
            <div className="flex items-center gap-2">
              <div className="relative dropdown">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setImportDropdownOpen(!importDropdownOpen)}
                  className="flex items-center gap-2"
                >
                  <Upload className="w-4 h-4" />
                  Importar
                </Button>
                
                {importDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-10">
                    <div className="py-1">
                      <button
                        onClick={() => {
                          setOpenBulk(true);
                          setImportDropdownOpen(false);
                        }}
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        Carga Masiva
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="relative dropdown">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setExportDropdownOpen(!exportDropdownOpen)}
                  className="flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Exportar
                </Button>
                
                {exportDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-10">
                    <div className="py-1">
                      <button
                        onClick={() => {
                          exportarProductosCSV();
                          setExportDropdownOpen(false);
                        }}
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        Exportar Productos
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              <span className="ml-2 text-gray-600">Cargando productos...</span>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <p className="text-red-600 mb-4">{error}</p>
              <Button onClick={() => setReload(prev => !prev)} variant="outline">
                Reintentar
              </Button>
            </div>
          ) : productosFiltrados.length === 0 ? (
            <div className="text-center py-12">
              <Boxes className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 mb-4">No se encontraron productos</p>
              <Button onClick={() => setOpen(true)} variant="outline">
                Crear primer producto
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Filtros */}
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex-1 min-w-[300px]">
                  <Input
                    placeholder="Buscar por nombre o ID..."
                    value={filtro}
                    onChange={(e) => setFiltro(e.target.value)}
                    className="w-full"
                  />
                </div>
                
                <select
                  value={cat}
                  onChange={(e) => setCat(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Todas las categorías</option>
                  {subcategorias.map(categoria => (
                    <option key={categoria} value={categoria}>{categoria}</option>
                  ))}
                </select>
              </div>

              {/* Tabla */}
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <input
                          type="checkbox"
                          checked={selectAll}
                          onChange={handleSelectAll}
                          className="rounded border-gray-300"
                        />
                      </TableHead>
                      <TableHead>ID</TableHead>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Categorías</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Precio</TableHead>
                      <TableHead>Inventario</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="w-32">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {productosPaginados.map((producto) => (
                      <TableRow key={producto.id}>
                        <TableCell>
                          <input
                            type="checkbox"
                            checked={selectedProducts.includes(producto.id)}
                            onChange={() => handleSelectProduct(producto.id)}
                            className="rounded border-gray-300"
                          />
                        </TableCell>
                        <TableCell className="font-mono text-sm">{producto.id}</TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{producto.nombre}</div>
                            {producto.sku && (
                              <div className="text-sm text-gray-500">SKU: {producto.sku}</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {producto.categorias && producto.categorias.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {producto.categorias.map((cat, index) => (
                                <span
                                  key={index}
                                  className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                                >
                                  {cat}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-gray-400">Sin categorías</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            producto.tipo === 'variation' 
                              ? 'bg-purple-100 text-purple-800' 
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {producto.tipo}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">
                              ${formatearNumeroArgentino(producto.precio?.normal || 0)}
                            </div>
                            {producto.precio?.rebajado && producto.precio.rebajado !== producto.precio.normal && (
                              <div className="text-sm text-green-600">
                                ${formatearNumeroArgentino(producto.precio.rebajado)}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            (producto.inventario || 0) > 0 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {producto.inventario || 0}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            producto.publicado 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {producto.publicado ? 'Publicado' : 'No publicado'}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                // TODO: Implementar edición
                                console.log('Editar producto:', producto.id);
                              }}
                            >
                              Editar
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Paginación */}
              {productosFiltrados.length > productosPorPagina && (
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-700">
                    Mostrando {((paginaActual - 1) * productosPorPagina) + 1} a {Math.min(paginaActual * productosPorPagina, productosFiltrados.length)} de {productosFiltrados.length} productos
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPaginaActual(prev => Math.max(1, prev - 1))}
                      disabled={paginaActual === 1}
                    >
                      Anterior
                    </Button>
                    <span className="text-sm text-gray-700">
                      Página {paginaActual} de {Math.ceil(productosFiltrados.length / productosPorPagina)}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPaginaActual(prev => Math.min(Math.ceil(productosFiltrados.length / productosPorPagina), prev + 1))}
                      disabled={paginaActual === Math.ceil(productosFiltrados.length / productosPorPagina)}
                    >
                      Siguiente
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de confirmación de eliminación */}
      <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar eliminación</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-gray-600">
              Estás a punto de eliminar <strong>{selectedProducts.length}</strong> producto(s) de forma permanente.
              Esta acción no se puede deshacer.
            </p>
            
            {deleteMessage && (
              <div className={`p-3 rounded-lg text-sm mb-4 ${
                deleteMessage.startsWith("Error")
                  ? "bg-red-50 text-red-800 border border-red-200"
                  : "bg-green-50 text-green-800 border border-green-200"
              }`}>
                {deleteMessage}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setDeleteModalOpen(false)}
              disabled={deleteLoading}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteSelected}
              disabled={deleteLoading}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Eliminando...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Eliminar Productos
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProductosPage;
