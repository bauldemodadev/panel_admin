"use client";
import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  Save,
  Loader2,
  CheckCircle,
  AlertCircle,
  Plus,
  X,
  Image as ImageIcon,
  Tag,
  Percent,
  Truck,
  Star,
  Gift,
  Zap,
  GripVertical,
} from "lucide-react";
import { db } from "@/lib/firebase";
import {
  doc,
  getDoc,
  updateDoc,
  collection,
  getDocs,
} from "firebase/firestore";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";

const ProductoDetailPage = () => {
  const router = useRouter();
  const params = useParams();
  const productId = params.id;

  const [producto, setProducto] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");

  // Estados para datos precargados
  const [proveedores, setProveedores] = useState([]);
  const [subcategorias, setSubcategorias] = useState([]);
  const [tiposMadera, setTiposMadera] = useState([]);
  const [unidadesMedida, setUnidadesMedida] = useState([]);

  // Estados para agregar nuevos valores
  const [showAddProveedor, setShowAddProveedor] = useState(false);
  const [showAddSubcategoria, setShowAddSubcategoria] = useState(false);
  const [showAddTipoMadera, setShowAddTipoMadera] = useState(false);
  const [showAddUnidadMedida, setShowAddUnidadMedida] = useState(false);
  const [newValue, setNewValue] = useState("");

  // Formulario de edición
  const [editForm, setEditForm] = useState({
    nombre: "",
    descripcion: "",
    proveedor: "",
    unidadMedida: "",
    estado: "",
    estadoTienda: "",
    subcategoria: "",
    tipoMadera: "",
    // Nuevos campos para tienda
    imagenes: [],
    discount: {
      amount: 0,
      percentage: 0,
    },
    rating: 0,
    // Etiquetas
    freeShipping: false,
    featuredBrand: false,
    newArrival: false,
    specialOffer: false,
  });

  // Estados para nuevos campos
  const [uploadingGallery, setUploadingGallery] = useState(false);

  useEffect(() => {
    if (productId) {
      cargarProducto();
      cargarDatosPrecargados();
    }
  }, [productId]);

  const cargarProducto = async () => {
    try {
      setLoading(true);
      const productoRef = doc(db, "productos", productId);
      const productoSnap = await getDoc(productoRef);

      if (productoSnap.exists()) {
        const productoData = productoSnap.data();
        setProducto({ id: productoSnap.id, ...productoData });
        
        // Cargar formulario con datos existentes
        setEditForm({
          nombre: productoData.nombre || "",
          descripcion: productoData.descripcion || "",
          proveedor: productoData.proveedor || "",
          unidadMedida: productoData.unidadMedida || "",
          estado: productoData.estado || "Activo",
          estadoTienda: productoData.estadoTienda || "Activo",
          subcategoria: productoData.subcategoria || productoData.subCategoria || "",
          tipoMadera: productoData.tipoMadera || "",
          // Nuevos campos para tienda
          imagenes: productoData.imagenes || [],
          discount: productoData.discount || { amount: 0, percentage: 0 },
          rating: productoData.rating || 0,
          // Etiquetas
          freeShipping: productoData.freeShipping || false,
          featuredBrand: productoData.featuredBrand || false,
          newArrival: productoData.newArrival || false,
          specialOffer: productoData.specialOffer || false,
        });
      } else {
        setMessage("Producto no encontrado");
        setMessageType("error");
      }
    } catch (error) {
      setMessage("Error al cargar producto: " + error.message);
      setMessageType("error");
    } finally {
      setLoading(false);
    }
  };

  const cargarDatosPrecargados = async () => {
    try {
      const productosSnap = await getDocs(collection(db, "productos"));
      const productos = productosSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Extraer proveedores únicos
      const proveedoresUnicos = [...new Set(
        productos
          .filter(p => p.proveedor)
          .map(p => p.proveedor)
      )].sort();
      setProveedores(proveedoresUnicos);

      // Extraer subcategorías únicas
      const subcategoriasUnicas = [...new Set(
        productos
          .filter(p => p.subcategoria || p.subCategoria)
          .map(p => p.subcategoria || p.subCategoria)
      )].sort();
      setSubcategorias(subcategoriasUnicas);

      // Extraer tipos de madera únicos
      const tiposMaderaUnicos = [...new Set(
        productos
          .filter(p => p.tipoMadera)
          .map(p => p.tipoMadera)
      )].sort();
      setTiposMadera(tiposMaderaUnicos);

      // Extraer unidades de medida únicas
      const unidadesMedidaUnicas = [...new Set(
        productos
          .filter(p => p.unidadMedida)
          .map(p => p.unidadMedida)
      )].sort();
      setUnidadesMedida(unidadesMedidaUnicas);
    } catch (error) {
      console.error("Error al cargar datos precargados:", error);
    }
  };

  const handleAddNewValue = (tipo, valor) => {
    if (!valor.trim()) return;
    
    switch (tipo) {
      case 'proveedor':
        if (!proveedores.includes(valor)) {
          setProveedores(prev => [...prev, valor].sort());
        }
        setEditForm(prev => ({ ...prev, proveedor: valor }));
        setShowAddProveedor(false);
        break;
      case 'subcategoria':
        if (!subcategorias.includes(valor)) {
          setSubcategorias(prev => [...prev, valor].sort());
        }
        setEditForm(prev => ({ ...prev, subcategoria: valor }));
        setShowAddSubcategoria(false);
        break;
      case 'tipoMadera':
        if (!tiposMadera.includes(valor)) {
          setTiposMadera(prev => [...prev, valor].sort());
        }
        setEditForm(prev => ({ ...prev, tipoMadera: valor }));
        setShowAddTipoMadera(false);
        break;
      case 'unidadMedida':
        if (!unidadesMedida.includes(valor)) {
          setUnidadesMedida(prev => [...prev, valor].sort());
        }
        setEditForm(prev => ({ ...prev, unidadMedida: valor }));
        setShowAddUnidadMedida(false);
        break;
    }
    setNewValue("");
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage("");
    
    try {
      // Validación de campos obligatorios
      const camposObligatorios = ['nombre', 'descripcion', 'unidadMedida', 'estado', 'estadoTienda'];
      
      // Agregar campos específicos según categoría
      if (producto.categoria === "Ferretería") {
        camposObligatorios.push('subcategoria', 'proveedor');
      } else if (producto.categoria === "Maderas") {
        camposObligatorios.push('subcategoria', 'tipoMadera');
      }
      
      // Verificar campos vacíos
      const camposVacios = camposObligatorios.filter(campo => {
        if (campo === 'subcategoria') {
          return !editForm.subcategoria;
        }
        return !editForm[campo];
      });
      
      if (camposVacios.length > 0) {
        setMessage(`Error: Los siguientes campos son obligatorios: ${camposVacios.join(', ')}`);
        setMessageType("error");
        setSaving(false);
        return;
      }
      
      const productoRef = doc(db, "productos", productId);
      const updates = {};
      
      // Solo actualizar campos que han cambiado
      if (editForm.nombre !== producto.nombre) {
        updates.nombre = editForm.nombre;
      }
      if (editForm.descripcion !== producto.descripcion) {
        updates.descripcion = editForm.descripcion;
      }
      if (editForm.proveedor !== producto.proveedor) {
        updates.proveedor = editForm.proveedor;
      }
      if (editForm.unidadMedida !== producto.unidadMedida) {
        updates.unidadMedida = editForm.unidadMedida;
      }
      if (editForm.estado !== producto.estado) {
        updates.estado = editForm.estado;
      }
      if (editForm.estadoTienda !== producto.estadoTienda) {
        updates.estadoTienda = editForm.estadoTienda;
      }
      
      // Guardar subcategoría en el campo correcto según la categoría
      if (producto.categoria === "Ferretería") {
        if (editForm.subcategoria !== (producto.subCategoria || producto.subcategoria)) {
          updates.subCategoria = editForm.subcategoria;
        }
      } else if (producto.categoria === "Maderas") {
        if (editForm.subcategoria !== (producto.subcategoria || producto.subCategoria)) {
          updates.subcategoria = editForm.subcategoria;
        }
      }
      
      if (editForm.tipoMadera !== producto.tipoMadera) {
        updates.tipoMadera = editForm.tipoMadera;
      }

      // Nuevos campos para tienda
      if (JSON.stringify(editForm.imagenes) !== JSON.stringify(producto.imagenes || [])) {
        updates.imagenes = editForm.imagenes;
      }
      if (JSON.stringify(editForm.discount) !== JSON.stringify(producto.discount || { amount: 0, percentage: 0 })) {
        updates.discount = editForm.discount;
      }
      if (editForm.rating !== producto.rating) {
        updates.rating = editForm.rating;
      }
      if (editForm.freeShipping !== producto.freeShipping) {
        updates.freeShipping = editForm.freeShipping;
      }
      if (editForm.featuredBrand !== producto.featuredBrand) {
        updates.featuredBrand = editForm.featuredBrand;
      }
      if (editForm.newArrival !== producto.newArrival) {
        updates.newArrival = editForm.newArrival;
      }
      if (editForm.specialOffer !== producto.specialOffer) {
        updates.specialOffer = editForm.specialOffer;
      }
      
      updates.fechaActualizacion = new Date().toISOString();

      await updateDoc(productoRef, updates);
      
      setMessage("Producto actualizado correctamente");
      setMessageType("success");
      
      // Recargar producto para mostrar cambios
      await cargarProducto();
      
    } catch (error) {
      setMessage("Error al actualizar: " + error.message);
      setMessageType("error");
    } finally {
      setSaving(false);
    }
  };

  const handleMultipleImageUpload = async (files) => {
    if (!files || files.length === 0) return;
    
    try {
      setUploadingGallery(true);
      const newUrls = [];
      
      for (const file of files) {
        const formData = new FormData();
        formData.append('file', file);
        
        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });
        
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Error al subir imagen');
        }
        
        const result = await response.json();
        newUrls.push(result.url);
      }
      
      setEditForm(prev => ({
        ...prev,
        imagenes: [...prev.imagenes, ...newUrls]
      }));
      
    } catch (error) {
      setMessage("Error al subir imágenes: " + error.message);
      setMessageType("error");
    } finally {
      setUploadingGallery(false);
    }
  };

  const removeImage = (index) => {
    setEditForm(prev => ({
      ...prev,
      imagenes: prev.imagenes.filter((_, i) => i !== index)
    }));
  };

  const moveImage = (fromIndex, toIndex) => {
    if (fromIndex === toIndex) return;
    
    setEditForm(prev => {
      const newImagenes = [...prev.imagenes];
      const [movedImage] = newImagenes.splice(fromIndex, 1);
      newImagenes.splice(toIndex, 0, movedImage);
      
      return {
        ...prev,
        imagenes: newImagenes
      };
    });
  };

  const updateDiscount = (field, value) => {
    setEditForm(prev => ({
      ...prev,
      discount: {
        ...prev.discount,
        [field]: Number(value) || 0
      }
    }));
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!producto) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Producto no encontrado</h1>
        <p className="text-gray-600 mb-6">El producto que buscas no existe o fue eliminado.</p>
        <Link href="/productos">
          <Button variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver a Productos
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="py-8 px-4 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-6">
          <Link href="/productos">
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Editar Producto</h1>
            <p className="text-lg text-gray-500">
              {producto.codigo} - {producto.nombre}
            </p>
          </div>
        </div>

        {/* Mensaje de estado */}
        {message && (
          <div className={`mb-6 p-4 rounded-xl flex items-center gap-3 text-sm shadow-lg ${
            messageType === "success"
              ? "bg-gradient-to-r from-green-50 to-emerald-50 text-green-800 border border-green-200"
              : "bg-gradient-to-r from-red-50 to-pink-50 text-red-800 border border-red-200"
          }`}>
            <div className={`p-2 rounded-full ${messageType === "success" ? "bg-green-100" : "bg-red-100"}`}>
              {messageType === "success" ? (
                <CheckCircle className="w-5 h-5 text-green-600" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-600" />
              )}
            </div>
            <div>
              <div className="font-semibold">
                {messageType === "success" ? "¡Éxito!" : "Error"}
              </div>
              <div className="text-sm opacity-90">{message}</div>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Información del producto */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  producto.categoria === "Maderas" 
                    ? "bg-orange-100 text-orange-600" 
                    : "bg-blue-100 text-blue-600"
                }`}>
                  {producto.categoria === "Maderas" ? "🌲" : "🔧"}
                </div>
                Información del Producto
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <span className="font-medium text-gray-700">Código:</span>
                <div className="font-bold text-lg text-gray-900">{producto.codigo}</div>
              </div>
              <div>
                <span className="font-medium text-gray-700">Categoría:</span>
                <div className="font-semibold text-gray-900">{producto.categoria}</div>
              </div>
              <div>
                <span className="font-medium text-gray-700">Stock:</span>
                <span className={`ml-2 font-bold ${
                  producto.stock > 10 ? "text-green-600" : 
                  producto.stock > 0 ? "text-yellow-600" : "text-red-600"
                }`}>
                  {producto.stock || 0}
                </span>
              </div>
              <div>
                <span className="font-medium text-gray-700">Estado:</span>
                <span className={`ml-2 px-2 py-1 rounded-full text-xs font-semibold ${
                  producto.estado === "Activo" ? "bg-green-100 text-green-800" :
                  producto.estado === "Inactivo" ? "bg-yellow-100 text-yellow-800" :
                  "bg-red-100 text-red-800"
                }`}>
                  {producto.estado}
                </span>
              </div>
              <div>
                <span className="font-medium text-gray-700">Tienda:</span>
                <span className={`ml-2 px-2 py-1 rounded-full text-xs font-semibold ${
                  producto.estadoTienda === "Activo" ? "bg-green-100 text-green-800" :
                  producto.estadoTienda === "Inactivo" ? "bg-gray-200 text-gray-700" :
                  "bg-yellow-100 text-yellow-700"
                }`}>
                  {producto.estadoTienda ? producto.estadoTienda : "No definido"}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Formulario de edición */}
        <div className="lg:col-span-2 space-y-6">
          {/* Campos básicos */}
          <Card>
            <CardHeader>
              <CardTitle>Información Básica</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    Nombre del Producto *
                  </label>
                  <Input
                    value={editForm.nombre}
                    onChange={(e) => setEditForm(prev => ({ ...prev, nombre: e.target.value }))}
                    placeholder="Nombre del producto"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    Estado *
                  </label>
                  <select
                    value={editForm.estado}
                    onChange={(e) => setEditForm(prev => ({ ...prev, estado: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="Activo">Activo</option>
                    <option value="Inactivo">Inactivo</option>
                    <option value="Descontinuado">Descontinuado</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    Estado de Tienda *
                  </label>
                  <select
                    value={editForm.estadoTienda}
                    onChange={(e) => setEditForm(prev => ({ ...prev, estadoTienda: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="Activo">Activo</option>
                    <option value="Inactivo">Inactivo</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    Unidad de Medida *
                  </label>
                  <div className="flex gap-2">
                    <select
                      value={editForm.unidadMedida}
                      onChange={(e) => setEditForm(prev => ({ ...prev, unidadMedida: e.target.value }))}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Seleccionar unidad</option>
                      {unidadesMedida.map((unidad) => (
                        <option key={unidad} value={unidad}>
                          {unidad}
                        </option>
                      ))}
                    </select>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowAddUnidadMedida(true)}
                      className="px-3"
                    >
                      +
                    </Button>
                  </div>
                  {showAddUnidadMedida && (
                    <div className="flex gap-2 mt-2">
                      <Input
                        value={newValue}
                        onChange={(e) => setNewValue(e.target.value)}
                        placeholder="Nueva unidad de medida"
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => handleAddNewValue('unidadMedida', newValue)}
                      >
                        Agregar
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setShowAddUnidadMedida(false);
                          setNewValue("");
                        }}
                      >
                        Cancelar
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Descripción *
                </label>
                <textarea
                  value={editForm.descripcion}
                  onChange={(e) => setEditForm(prev => ({ ...prev, descripcion: e.target.value }))}
                  placeholder="Descripción detallada del producto"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Campos específicos por categoría */}
          {producto.categoria === "Maderas" && (
            <Card>
              <CardHeader>
                <CardTitle>Especificaciones de Madera</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">
                      Subcategoría *
                    </label>
                    <div className="flex gap-2">
                      <select
                        value={editForm.subcategoria}
                        onChange={(e) => setEditForm(prev => ({ ...prev, subcategoria: e.target.value }))}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">Seleccionar subcategoría</option>
                        {subcategorias.map((subcat) => (
                          <option key={subcat} value={subcat}>
                            {subcat}
                          </option>
                        ))}
                      </select>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setShowAddSubcategoria(true)}
                        className="px-3"
                      >
                        +
                      </Button>
                    </div>
                    {showAddSubcategoria && (
                      <div className="flex gap-2 mt-2">
                        <Input
                          value={newValue}
                          onChange={(e) => setNewValue(e.target.value)}
                          placeholder="Nueva subcategoría"
                          className="flex-1"
                        />
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => handleAddNewValue('subcategoria', newValue)}
                        >
                          Agregar
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setShowAddSubcategoria(false);
                            setNewValue("");
                          }}
                        >
                          Cancelar
                        </Button>
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">
                      Tipo de Madera *
                    </label>
                    <div className="flex gap-2">
                      <select
                        value={editForm.tipoMadera}
                        onChange={(e) => setEditForm(prev => ({ ...prev, tipoMadera: e.target.value }))}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">Seleccionar tipo de madera</option>
                        {tiposMadera.map((tipo) => (
                          <option key={tipo} value={tipo}>
                            {tipo}
                          </option>
                        ))}
                      </select>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setShowAddTipoMadera(true)}
                        className="px-3"
                      >
                        +
                      </Button>
                    </div>
                    {showAddTipoMadera && (
                      <div className="flex gap-2 mt-2">
                        <Input
                          value={newValue}
                          onChange={(e) => setNewValue(e.target.value)}
                          placeholder="Nuevo tipo de madera"
                          className="flex-1"
                        />
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => handleAddNewValue('tipoMadera', newValue)}
                        >
                          Agregar
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setShowAddTipoMadera(false);
                            setNewValue("");
                          }}
                        >
                          Cancelar
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {producto.categoria === "Ferretería" && (
            <Card>
              <CardHeader>
                <CardTitle>Especificaciones de Ferretería</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">
                      Subcategoría *
                    </label>
                    <div className="flex gap-2">
                      <select
                        value={editForm.subcategoria}
                        onChange={(e) => setEditForm(prev => ({ ...prev, subcategoria: e.target.value }))}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">Seleccionar subcategoría</option>
                        {subcategorias.map((subcat) => (
                          <option key={subcat} value={subcat}>
                            {subcat}
                          </option>
                        ))}
                      </select>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setShowAddSubcategoria(true)}
                        className="px-3"
                      >
                        +
                      </Button>
                    </div>
                    {showAddSubcategoria && (
                      <div className="flex gap-2 mt-2">
                        <Input
                          value={newValue}
                          onChange={(e) => setNewValue(e.target.value)}
                          placeholder="Nueva subcategoría"
                          className="flex-1"
                        />
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => handleAddNewValue('subcategoria', newValue)}
                        >
                          Agregar
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setShowAddSubcategoria(false);
                            setNewValue("");
                          }}
                        >
                          Cancelar
                        </Button>
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">
                      Proveedor *
                    </label>
                    <div className="flex gap-2">
                      <select
                        value={editForm.proveedor}
                        onChange={(e) => setEditForm(prev => ({ ...prev, proveedor: e.target.value }))}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">Seleccionar proveedor</option>
                        {proveedores.map((prov) => (
                          <option key={prov} value={prov}>
                            {prov}
                          </option>
                        ))}
                      </select>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setShowAddProveedor(true)}
                        className="px-3"
                      >
                        +
                      </Button>
                    </div>
                    {showAddProveedor && (
                      <div className="flex gap-2 mt-2">
                        <Input
                          value={newValue}
                          onChange={(e) => setNewValue(e.target.value)}
                          placeholder="Nuevo proveedor"
                          className="flex-1"
                        />
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => handleAddNewValue('proveedor', newValue)}
                        >
                          Agregar
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setShowAddProveedor(false);
                            setNewValue("");
                          }}
                        >
                          Cancelar
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Campos para tienda */}
          <Card>
            <CardHeader>
              <CardTitle>Configuración de Tienda</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Rating */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Calificación del Producto
                </label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setEditForm(prev => ({ ...prev, rating: star }))}
                      className={`p-2 rounded-lg transition-colors ${
                        editForm.rating >= star
                          ? 'bg-yellow-100 text-yellow-600 hover:bg-yellow-200'
                          : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                      }`}
                    >
                      <Star className="w-6 h-6 fill-current" />
                    </button>
                  ))}
                </div>
                <p className="text-xs text-gray-500">
                  Selecciona la calificación del producto (1-5 estrellas)
                </p>
              </div>

              {/* Galería de imágenes */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Galería de Imágenes
                </label>
                <p className="text-xs text-gray-500 mb-2">
                  Selecciona múltiples imágenes para la galería del producto. Arrastra y suelta para reordenar. (Medida: 420px x 530px)
                </p>
                <div className="flex gap-2">
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) => handleMultipleImageUpload(e.target.files)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => document.getElementById('galleryInput').click()}
                    disabled={uploadingGallery}
                  >
                    {uploadingGallery ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Subiendo...
                      </>
                    ) : (
                      'Seleccionar'
                    )}
                  </Button>
                </div>
                {editForm.imagenes.length > 0 && (
                  <div className="space-y-3 mt-3">
                    {editForm.imagenes.map((url, index) => (
                      <div 
                        key={index} 
                        className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200"
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.setData('text/plain', index.toString());
                        }}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => {
                          e.preventDefault();
                          const fromIndex = parseInt(e.dataTransfer.getData('text/plain'));
                          moveImage(fromIndex, index);
                        }}
                      >
                        <div className="cursor-move text-gray-400 hover:text-gray-600">
                          <GripVertical className="w-5 h-5" />
                        </div>
                        <img 
                          src={url} 
                          alt={`Imagen ${index + 1}`} 
                          className="w-20 h-20 object-cover rounded-lg border border-gray-200"
                          onError={(e) => {
                            e.target.style.display = 'none';
                          }}
                        />
                        <div className="flex-1">
                          <div className="text-sm font-medium text-gray-700">
                            Imagen {index + 1}
                          </div>
                          <div className="text-xs text-gray-500">
                            Posición: {index + 1} de {editForm.imagenes.length}
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => removeImage(index)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
                <input
                  id="galleryInput"
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => handleMultipleImageUpload(e.target.files)}
                  className="hidden"
                />
              </div>

              {/* Descuento */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Descuento
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-gray-500">Monto ($)</label>
                    <Input
                      value={editForm.discount.amount}
                      onChange={(e) => updateDiscount('amount', e.target.value)}
                      placeholder="0.00"
                      type="number"
                      step="0.01"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">Porcentaje (%)</label>
                    <Input
                      value={editForm.discount.percentage}
                      onChange={(e) => updateDiscount('percentage', e.target.value)}
                      placeholder="0"
                      type="number"
                      step="1"
                      min="0"
                      max="100"
                    />
                  </div>
                </div>
              </div>

              {/* Etiquetas */}
              <div className="space-y-3">
                <label className="text-sm font-medium text-gray-700">
                  Etiquetas de Tienda
                </label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editForm.freeShipping}
                      onChange={(e) => setEditForm(prev => ({ ...prev, freeShipping: e.target.checked }))}
                      className="w-4 h-4 text-blue-600"
                    />
                    <Truck className="w-4 h-4 text-blue-600" />
                    <span className="text-sm">Envío Gratis</span>
                  </label>
                  
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editForm.featuredBrand}
                      onChange={(e) => setEditForm(prev => ({ ...prev, featuredBrand: e.target.checked }))}
                      className="w-4 h-4 text-blue-600"
                    />
                    <Star className="w-4 h-4 text-blue-600" />
                    <span className="text-sm">Marca Destacada</span>
                  </label>
                  
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editForm.newArrival}
                      onChange={(e) => setEditForm(prev => ({ ...prev, newArrival: e.target.checked }))}
                      className="w-4 h-4 text-blue-600"
                    />
                    <Gift className="w-4 h-4 text-blue-600" />
                    <span className="text-sm">Nuevo Lanzamiento</span>
                  </label>
                  
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editForm.specialOffer}
                      onChange={(e) => setEditForm(prev => ({ ...prev, specialOffer: e.target.checked }))}
                      className="w-4 h-4 text-blue-600"
                    />
                    <Zap className="w-4 h-4 text-blue-600" />
                    <span className="text-sm">Oferta Especial</span>
                  </label>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Botón guardar */}
          <div className="flex justify-end">
            <Button 
              onClick={handleSave} 
              disabled={saving}
              className="px-8 py-3"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Guardar Cambios
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductoDetailPage;
