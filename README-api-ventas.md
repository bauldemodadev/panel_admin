# 📦 API de Ventas - Ecommerce Externo

## 🎯 **Endpoint**
```
POST https://maderascaballero.vercel.app/api/ventas
```

## 📋 **Headers Requeridos**
```http
Content-Type: application/json
```

## 📤 **Estructura de Datos a Enviar**

### **Formato Completo:**
```json
{
  "success": true,
  "data": [
    {
      "id": "1b7e0a3f-3c0e-4422-aac2-f923aae9df5c",
      "numeroPedido": "VENTA-123456",
      "estado": "confirmado",
      "total": 193000,
      "fecha": "2025-01-17",
      "fechaEntrega": "2025-01-18",
      "medioPago": "mercadopago",
      "productos": [
        {
          "id": "Dxt1zPC9Ziu92dLPdHwD",
          "nombre": "TALADRO DE IMPACTO 13MM 750W BAROVO C/ MALETIN",
          "cantidad": 1,
          "precio": 10,
          "unidad": "Unidad",
          "categoria": "Ferretería",
          "imagen": "https://ejemplo.com/imagen.jpg",
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
    "email": "email@cliente.com"
  }
}
```

## 📥 **Respuestas de la API**

### ✅ **Éxito (Status 200)**
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
    "email": "email@cliente.com"
  }
}
```

### ⚠️ **Éxito con Errores Parciales (Status 200)**
```json
{
  "success": true,
  "message": "Procesadas 1 ventas correctamente, 1 errores encontrados",
  "ventas": [
    {
      "id": "nuevo-id-generado",
      "numeroPedido": "VENTA-123456",
      "status": "created"
    }
  ],
  "errores": [
    {
      "numeroPedido": "VENTA-123457",
      "error": "Campos faltantes: total, fecha",
      "code": "MISSING_REQUIRED_FIELDS"
    }
  ],
  "total": 1,
  "usuario": {
    "email": "email@cliente.com"
  }
}
```

### ❌ **Error (Status 400)**
```json
{
  "success": false,
  "error": "Content-Type debe ser application/json",
  "code": "INVALID_CONTENT_TYPE"
}
```

### ❌ **Error (Status 500)**
```json
{
  "success": false,
  "error": "Error interno del servidor",
  "code": "INTERNAL_SERVER_ERROR",
  "details": "Descripción detallada del error"
}
```

## 🔧 **Códigos de Error**

| Código | Descripción |
|--------|-------------|
| `INVALID_CONTENT_TYPE` | Header Content-Type incorrecto |
| `INVALID_DATA_STRUCTURE` | Estructura de datos inválida |
| `NO_VENTAS` | No se recibieron ventas |
| `MISSING_USER_EMAIL` | Email de usuario faltante |
| `MISSING_REQUIRED_FIELDS` | Campos requeridos faltantes |
| `NO_PRODUCTS` | Venta sin productos |
| `MISSING_CLIENT_INFO` | Información de cliente faltante |
| `VENTA_PROCESSING_ERROR` | Error procesando venta individual |
| `PERMISSION_DENIED` | Error de permisos en Firestore |
| `DATABASE_UNAVAILABLE` | Base de datos no disponible |
| `INTERNAL_SERVER_ERROR` | Error interno del servidor |

## 📋 **Campos Requeridos**

### **Venta:**
- ✅ `numeroPedido` (string)
- ✅ `estado` (string)
- ✅ `total` (number)
- ✅ `fecha` (string, formato: "YYYY-MM-DD")

### **Productos:**
- ✅ `id` (string)
- ✅ `nombre` (string)
- ✅ `cantidad` (number)
- ✅ `precio` (number)
- ✅ `unidad` (string)
- ✅ `categoria` (string)

### **Cliente:**
- ✅ `nombre` (string)

### **Usuario:**
- ✅ `email` (string)

## 🔄 **Estados de Venta Procesada**

| Estado | Descripción |
|--------|-------------|
| `created` | Venta creada exitosamente |
| `already_exists` | Venta ya existía (no se duplica) |

## 💡 **Ejemplo de Implementación**

### **JavaScript (Frontend)**
```javascript
const enviarVenta = async (ventaData) => {
  try {
    const response = await fetch(
      'https://maderascaballero.vercel.app/api/ventas',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(ventaData)
      }
    );

    const resultado = await response.json();

    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${resultado.error}`);
    }

    console.log('Venta enviada:', resultado);
    return resultado;

  } catch (error) {
    console.error('Error enviando venta:', error);
    throw error;
  }
};

// Uso
const ventaData = {
  success: true,
  data: [
    {
      numeroPedido: "VENTA-123456",
      estado: "confirmado",
      total: 193000,
      fecha: "2025-01-17",
      fechaEntrega: "2025-01-18",
      medioPago: "mercadopago",
      productos: [
        {
          id: "Dxt1zPC9Ziu92dLPdHwD",
          nombre: "TALADRO DE IMPACTO 13MM 750W BAROVO C/ MALETIN",
          cantidad: 1,
          precio: 10,
          unidad: "Unidad",
          categoria: "Ferretería",
          imagen: "https://...",
          alto: 0,
          ancho: 0,
          largo: 0,
          cepilladoAplicado: false
        }
      ],
      envio: {
        estado: "pendiente",
        direccion: "Dirección del cliente",
        transportista: "Método de entrega",
        fechaEntrega: "2025-01-18"
      },
      cliente: {
        nombre: "Nombre del cliente",
        telefono: "Teléfono del cliente"
      }
    }
  ],
  total: 1,
  usuario: {
    email: "email@cliente.com"
  }
};

await enviarVenta(ventaData);
```

### **PHP (Backend)**
```php
<?php
function enviarVenta($ventaData) {
    $url = 'https://maderascaballero.vercel.app/api/ventas';
    
    $options = [
        'http' => [
            'header' => "Content-Type: application/json\r\n",
            'method' => 'POST',
            'content' => json_encode($ventaData)
        ]
    ];
    
    $context = stream_context_create($options);
    $result = file_get_contents($url, false, $context);
    
    if ($result === FALSE) {
        throw new Exception('Error enviando venta');
    }
    
    return json_decode($result, true);
}

// Uso
$ventaData = [
    'success' => true,
    'data' => [
        // ... datos de la venta
    ],
    'total' => 1,
    'usuario' => [
        'email' => 'email@cliente.com'
    ]
];

$resultado = enviarVenta($ventaData);
echo json_encode($resultado);
?>
```

## ⚠️ **Consideraciones Importantes**

1. **Duplicados**: La API verifica si la venta ya existe por `numeroPedido`
2. **Validación**: Se valida la estructura completa antes de procesar
3. **Procesamiento por lotes**: Puedes enviar múltiples ventas en un solo request
4. **Manejo de errores**: Errores individuales no afectan otras ventas
5. **CORS**: Habilitado para todos los dominios
6. **Logging**: Todos los requests se registran para debugging

## 🚀 **Flujo de Trabajo Recomendado**

1. **Preparar datos** en tu ecommerce
2. **Validar estructura** localmente
3. **Enviar a la API** con manejo de errores
4. **Procesar respuesta** y manejar casos de éxito/error
5. **Actualizar estado** en tu sistema local

---

**¡Tu ecommerce externo ahora puede sincronizar ventas automáticamente!** 🎉
