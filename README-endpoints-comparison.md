# 📊 Comparación de Endpoints - Orders vs Ventas

## 🎯 **Resumen de Endpoints Disponibles**

| Endpoint | Método | Colección | Propósito | Origen |
|----------|--------|-----------|-----------|---------|
| `/api/orders` | GET | `ventas` | Leer órdenes por usuario | Sistema interno |
| `/api/orders` | POST | `orders` | Crear nueva orden | Sistema interno |
| `/api/ventas` | POST | `ventas` | Recibir ventas externas | Ecommerce externo |

---

## 📤 **POST /api/orders - Crear Órdenes Internas**

### **Endpoint:**
```
POST https://maderascaballero.vercel.app/api/orders
```

### **Headers:**
```http
Content-Type: application/json
```

### **Estructura de Datos:**
```json
{
  "orderId": "uuid-generado",
  "userId": "email@usuario.com",
  "customerInfo": {
    "nombre": "Nombre del cliente",
    "email": "email@usuario.com",
    "telefono": "123456789",
    "dni": "12345678"
  },
  "deliveryInfo": {
    "direccion": "Dirección completa",
    "ciudad": "Ciudad",
    "codigoPostal": "1234",
    "metodoEntrega": "Método de entrega"
  },
  "items": [
    {
      "id": "product-id",
      "name": "Nombre del producto",
      "price": 100,
      "quantity": 2,
      "category": "Categoría",
      "subcategory": "Subcategoría"
    }
  ],
  "total": 200,
  "status": "pending",
  "createdAt": "2025-01-17T10:30:00.000Z"
}
```

### **Respuesta Exitosa (200):**
```json
{
  "success": true,
  "message": "Orden creada correctamente",
  "orderId": "uuid-generado",
  "data": {
    "orderId": "uuid-generado",
    "userId": "email@usuario.com",
    "status": "pending",
    "total": 200,
    "itemsCount": 1
  }
}
```

### **Colección Firestore: `orders`**
```json
{
  "orderId": "uuid-generado",
  "userId": "email@usuario.com",
  "total": 200,
  "status": "pending",
  "createdAt": "2025-01-17T10:30:00.000Z",
  "customerInfo": {
    "nombre": "Nombre del cliente",
    "email": "email@usuario.com",
    "telefono": "123456789",
    "dni": "12345678"
  },
  "deliveryInfo": {
    "direccion": "Dirección completa",
    "ciudad": "Ciudad",
    "codigoPostal": "1234",
    "metodoEntrega": "Método de entrega"
  },
  "items": [
    {
      "id": "product-id",
      "name": "Nombre del producto",
      "price": 100,
      "quantity": 2,
      "category": "Categoría",
      "subcategory": "Subcategoría"
    }
  ],
  "createdBy": "internal_api",
  "updatedAt": "2025-01-17T10:30:00.000Z"
}
```

---

## 📤 **POST /api/ventas - Recibir Ventas Externas**

### **Endpoint:**
```
POST https://maderascaballero.vercel.app/api/ventas
```

### **Headers:**
```http
Content-Type: application/json
```

### **Estructura de Datos:**
```json
{
  "success": true,
  "data": [
    {
      "id": "order-id",
      "numeroPedido": "VENTA-123456",
      "estado": "confirmado",
      "total": 200,
      "fecha": "2025-01-17",
      "fechaEntrega": "2025-01-18",
      "medioPago": "mercadopago",
      "productos": [
        {
          "id": "product-id",
          "nombre": "Nombre del producto",
          "cantidad": 2,
          "precio": 100,
          "unidad": "Unidad",
          "categoria": "Categoría",
          "imagen": "https://...",
          "alto": 0,
          "ancho": 0,
          "largo": 0,
          "cepilladoAplicado": false
        }
      ],
      "envio": {
        "estado": "pendiente",
        "direccion": "Dirección del cliente",
        "transportista": "Método de entrega",
        "fechaEntrega": "2025-01-18"
      },
      "cliente": {
        "nombre": "Nombre del cliente",
        "telefono": "Teléfono del cliente"
      }
    }
  ],
  "total": 1,
  "usuario": {
    "email": "email@usuario.com"
  }
}
```

### **Respuesta Exitosa (200):**
```json
{
  "success": true,
  "message": "Procesadas 1 ventas correctamente",
  "ventas": [
    {
      "id": "nuevo-id-generado-firestore",
      "numeroPedido": "VENTA-123456",
      "status": "created"
    }
  ],
  "total": 1,
  "usuario": {
    "email": "email@usuario.com"
  }
}
```

### **Colección Firestore: `ventas`**
```json
{
  "numeroPedido": "VENTA-123456",
  "estadoPago": "confirmado",
  "total": 200,
  "fecha": "2025-01-17",
  "fechaEntrega": "2025-01-18",
  "formaPago": "mercadopago",
  "cliente": {
    "email": "email@usuario.com",
    "nombre": "Nombre del cliente",
    "telefono": "Teléfono del cliente",
    "direccion": "Dirección del cliente"
  },
  "productos": [
    {
      "id": "product-id",
      "nombre": "Nombre del producto",
      "cantidad": 2,
      "precio": 100,
      "unidad": "Unidad",
      "categoria": "Categoría",
      "imagen": "https://...",
      "alto": 0,
      "ancho": 0,
      "largo": 0,
      "cepilladoAplicado": false
    }
  ],
  "estadoEnvio": "pendiente",
  "direccionEnvio": "Dirección del cliente",
  "transportista": "Método de entrega",
  "fechaEntregaEnvio": "2025-01-18",
  "origen": "ecommerce_externo",
  "creadoEn": "2025-01-17T10:30:00.000Z",
  "actualizadoEn": "2025-01-17T10:30:00.000Z",
  "idExterno": "order-id"
}
```

---

## 🔄 **GET /api/orders - Leer Órdenes**

### **Endpoint:**
```
GET https://maderascaballero.vercel.app/api/orders?userId=email@usuario.com
```

### **Respuesta:**
Lee de la colección `ventas` y retorna datos en formato unificado para ecommerce externo.

---

## 📊 **Diferencias Clave**

| Aspecto | POST /api/orders | POST /api/ventas |
|---------|------------------|------------------|
| **Colección** | `orders` | `ventas` |
| **Origen** | Sistema interno | Ecommerce externo |
| **Formato** | Estructura interna | Formato ecommerce |
| **Validación** | Campos básicos | Validación completa |
| **Procesamiento** | Una orden | Múltiples ventas |
| **IDs** | UUID generado | ID externo + numeroPedido |
| **Metadatos** | `createdBy: internal_api` | `origen: ecommerce_externo` |

---

## 🎯 **Casos de Uso**

### **POST /api/orders:**
- ✅ Crear órdenes desde el dashboard interno
- ✅ Órdenes generadas por el sistema
- ✅ Flujo de compra interno
- ✅ Órdenes de reposición

### **POST /api/ventas:**
- ✅ Sincronizar ventas desde ecommerce externo
- ✅ Webhooks de pagos confirmados
- ✅ Importación masiva de ventas
- ✅ Integración con sistemas externos

### **GET /api/orders:**
- ✅ Mostrar historial al usuario
- ✅ Dashboard de pedidos
- ✅ Seguimiento de envíos
- ✅ Reportes de ventas

---

## 🔧 **Implementación de Ejemplo**

### **Crear Orden Interna:**
```javascript
const crearOrden = async () => {
  const response = await fetch('/api/orders', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      orderId: crypto.randomUUID(),
      userId: "cliente@email.com",
      customerInfo: {
        nombre: "Juan Pérez",
        email: "cliente@email.com",
        telefono: "123456789",
        dni: "12345678"
      },
      deliveryInfo: {
        direccion: "Calle Falsa 123",
        ciudad: "Buenos Aires",
        codigoPostal: "1234",
        metodoEntrega: "Delivery"
      },
      items: [
        {
          id: "prod-123",
          name: "Producto de ejemplo",
          price: 100,
          quantity: 2,
          category: "Categoría",
          subcategory: "Subcategoría"
        }
      ],
      total: 200,
      status: "pending",
      createdAt: new Date().toISOString()
    })
  });
  
  return await response.json();
};
```

### **Enviar Venta Externa:**
```javascript
const enviarVenta = async () => {
  const response = await fetch('/api/ventas', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      success: true,
      data: [
        {
          numeroPedido: "VENTA-123456",
          estado: "confirmado",
          total: 200,
          fecha: "2025-01-17",
          // ... resto de datos
        }
      ],
      usuario: {
        email: "cliente@email.com"
      }
    })
  });
  
  return await response.json();
};
```

---

**¡Ahora tienes endpoints completos para manejar tanto órdenes internas como ventas externas!** 🎉
