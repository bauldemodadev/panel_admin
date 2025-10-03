# Componentes de Productos - Maderera CJD

Este documento describe los componentes reutilizables para manejar catálogos de productos y tablas de productos seleccionados en el sistema de Maderera CJD.

## 🏗️ Componentes para OBRAS

### 1. `CatalogoObras` (`components/obras/CatalogoObras.jsx`)

**Propósito**: Catálogo de productos específico para obras, basado en el código de `obras/presupuesto/create/page.jsx`.

**Props**:
- `titulo`: Título del catálogo (default: "Catálogo de productos (obras)")
- `productos`: Array de productos del catálogo
- `productosPorCategoria`: Objeto con productos agrupados por categoría
- `categorias`: Array de categorías disponibles
- `itemsSeleccionados`: Array de productos ya seleccionados
- `onAgregarProducto`: Función para agregar un producto al presupuesto
- `onAgregarProductoManual`: Función para agregar un ítem manual
- `editando`: Boolean para mostrar/ocultar el catálogo
- `maxProductos`: Número máximo de productos a mostrar
- `showFilters`: Mostrar filtros de categoría
- `showSearch`: Mostrar barra de búsqueda
- `showPagination`: Mostrar paginación
- `productosPorPagina`: Productos por página

**Características**:
- Filtros por categoría
- Búsqueda con debounce
- Paginación
- Indicador visual de productos ya agregados
- Botón para agregar ítem manual
- Icono 🏗️ para identificar productos de obras

### 2. `TablaProductosObras` (`components/obras/TablaProductosObras.jsx`)

**Propósito**: Tabla para mostrar y editar productos seleccionados de obras.

**Props**:
- `titulo`: Título de la tabla
- `items`: Array de productos seleccionados
- `editando`: Boolean para habilitar edición
- `onQuitarProducto`: Función para quitar un producto
- `onActualizarCampo`: Función para actualizar campos del producto
- `onActualizarNombreManual`: Función para actualizar nombre de ítem manual
- `formatearNumeroArgentino`: Función para formatear números
- `showTotals`: Mostrar totales
- `showDescripcionGeneral`: Mostrar campo de descripción general
- `descripcionGeneral`: Valor de la descripción general
- `onDescripcionGeneralChange`: Función para cambiar descripción general

**Características**:
- Campos editables para cantidad, dimensiones, precio y descuento
- Soporte para unidades M2, ML y UN
- Cálculo automático de precios basado en dimensiones
- Campo de descripción individual por producto
- Campo de descripción general del presupuesto
- Cálculo automático de totales

## 📦 Componentes para VENTAS

### 3. `CatalogoVentas` (`components/ventas/CatalogoVentas.jsx`)

**Propósito**: Catálogo de productos para ventas normales.

**Props**: Similar a `CatalogoObras` pero adaptado para productos de venta.

**Características**:
- Icono 📦 para identificar productos de venta
- Soporte para stock (muestra estado de stock)
- Deshabilita botón si no hay stock
- Campos adaptados para productos de venta

### 4. `TablaProductosVentas` (`components/ventas/TablaProductosVentas.jsx`)

**Propósito**: Tabla para productos seleccionados en ventas.

**Props**: Similar a `TablaProductosObras` pero simplificado para ventas.

**Características**:
- Campos básicos: producto, cantidad, unidad, precio, descuento
- Sin campos de dimensiones complejas
- Soporte para unidades estándar (UN, M2, ML, KG, L)
- Campo de descripción por producto
- Campo de descripción general opcional

## 🔄 Uso en Páginas Existentes

### Página de Obras (`obras/[id]/page.jsx`)
```jsx
import ProductosSelector from "@/components/obras/ProductosSelector";
import ProductosTabla from "@/components/obras/ProductosTabla";

// Para catálogo de productos normales
<ProductosSelector
  titulo="Materiales del Catálogo"
  productosCatalogo={productosCatalogo}
  productosPorCategoria={productosPorCategoria}
  categorias={categorias}
  itemsSeleccionados={itemsCatalogo}
  onAgregarProducto={agregarProductoCatalogo}
  editando={editando}
/>

// Para tabla de productos seleccionados
<ProductosTabla
  titulo="Materiales Seleccionados"
  items={itemsCatalogo}
  editando={editando}
  onQuitarProducto={quitarProductoCatalogo}
  onActualizarProducto={handleActualizarProducto}
/>
```

### Página de Presupuesto de Obras (`obras/presupuesto/create/page.jsx`)
```jsx
import CatalogoObras from "@/components/obras/CatalogoObras";
import TablaProductosObras from "@/components/obras/TablaProductosObras";

// Para catálogo de productos de obras
<CatalogoObras
  titulo="Catálogo de productos (obras)"
  productos={productos}
  productosPorCategoria={productosPorCategoria}
  categorias={categorias}
  itemsSeleccionados={itemsSeleccionados}
  onAgregarProducto={agregarProducto}
  onAgregarProductoManual={agregarProductoManual}
  editando={true}
/>

// Para tabla de productos seleccionados
<TablaProductosObras
  titulo="Productos seleccionados"
  items={itemsSeleccionados}
  editando={true}
  onQuitarProducto={quitarProducto}
  onActualizarCampo={actualizarCampo}
  onActualizarNombreManual={actualizarNombreManual}
  formatearNumeroArgentino={formatARNumber}
  showTotals={true}
  showDescripcionGeneral={true}
  descripcionGeneral={descripcionGeneral}
  onDescripcionGeneralChange={setDescripcionGeneral}
/>
```

## 🎯 Beneficios de la Refactorización

1. **Reutilización**: Los mismos componentes se usan en múltiples páginas
2. **Mantenibilidad**: Cambios en un lugar se reflejan en todas las páginas
3. **Consistencia**: UI y comportamiento uniforme en toda la aplicación
4. **Separación de responsabilidades**: Cada componente tiene una función específica
5. **Facilidad de testing**: Componentes aislados son más fáciles de probar

## 📝 Notas Importantes

- Los componentes están diseñados para ser flexibles y configurables
- Todos incluyen manejo de estados de carga y errores
- La paginación es opcional y configurable
- Los filtros y búsquedas son responsabilidad de cada componente
- Los cálculos de precios se manejan en el componente padre
- Los componentes son responsivos y accesibles

## 🚀 Próximos Pasos

1. **Migrar páginas existentes** para usar estos componentes
2. **Eliminar código duplicado** de las páginas originales
3. **Agregar tests** para los componentes
4. **Documentar casos de uso** específicos
5. **Optimizar rendimiento** si es necesario
