# 🛒 APIs para Ecommerce Externo

## 📍 **Base URL**
```
https://maderascaballero.vercel.app
```

## 🔐 **APIs de Usuario y Perfil**

### **1. Obtener Perfil de Usuario**
```
GET /api/users/{email}/profiles
```

**Parámetros:**
- `{email}`: Email del usuario autenticado

**Respuesta Exitosa (200):**
```json
{
  "success": true,
  "data": {
    "id": "cliente_id",
    "email": "usuario@email.com",
    "nombre": "Nombre Completo",
    "telefono": "+54 11 1234-5678",
    "cuit": "20-12345678-9",
    "direccion": "Calle 123",
    "localidad": "Ciudad",
    "partido": "Partido",
    "codigoPostal": "1234",
    "barrio": "Barrio",
    "area": "Área",
    "lote": "Lote",
    "lat": -34.6037,
    "lng": -58.3816,
    "esClienteViejo": false,
    "origen": "ecommerce",
    "creadoEn": "2024-01-15T10:30:00.000Z",
    "actualizadoEn": "2024-01-15T10:30:00.000Z"
  }
}
```

**Respuesta de Error (404):**
```json
{
  "error": "Usuario no encontrado",
  "email": "usuario@email.com"
}
```

---

## 📦 **APIs de Pedidos**

### **2. Obtener Ventas del Usuario**
```
GET /api/orders?userId={email}
```

**Parámetros Query:**
- `userId`: Email del usuario autenticado

**Respuesta Exitosa (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "oIXjlBQp9RppxE45RCS7",
      "numeroPedido": "VENTA-00079",
      "estado": "pagado",
      "total": 88200,
      "fecha": "2025-08-22",
      "fechaEntrega": "2025-08-22",
      "medioPago": "efectivo",
      
      "productos": [
        {
          "id": "NiObfTFwvzO9wWHTRa5X",
          "nombre": "Machimbre de Pino 1/2 X 5 X 3.70",
          "categoria": "Maderas",
          "cantidad": 20,
          "precio": 46200,
          "unidad": "M2",
          "alto": 0.12,
          "ancho": 1,
          "largo": 3.7,
          "cepilladoAplicado": false
        },
        {
          "id": "cURQX9bDGt45Knxbkpkr",
          "nombre": "Tirante de Pino 2 X 6 X 4",
          "categoria": "Maderas",
          "cantidad": 3,
          "precio": 14000,
          "unidad": "pie",
          "alto": 6,
          "ancho": 2,
          "largo": 4,
          "cepilladoAplicado": true
        }
      ],
      
      "envio": {
        "estado": "entregado",
        "direccion": "SCHWEITZER 141",
        "transportista": "camion",
        "fechaEntrega": "2025-08-22"
      },
      
      "cliente": {
        "nombre": "WALTER ALVAREZ",
        "telefono": "1130175421"
      }
    }
  ],
  "total": 1,
  "usuario": {
    "email": "tucsdigital@gmail.com"
  }
}
```

**Respuesta cuando no hay ventas (200):**
```json
{
  "success": true,
  "data": [],
  "total": 0,
  "mensaje": "No se encontraron ventas para este usuario",
  "usuario": {
    "email": "tucsdigital@gmail.com"
  }
}
```

---

## 🔄 **APIs Alternativas (v1)**

### **3. Obtener Pedidos por Cliente ID**
```
GET /api/v1/pedidos?clienteId={clienteId}
```

**Parámetros Query:**
- `clienteId`: ID del cliente (obtenido del perfil)

**Respuesta:**
```json
{
  "pedidos": [
    {
      "id": "pedido_id",
      "carritoId": "carrito_id",
      "clienteId": "cliente_id",
      "estado": "pagoPendiente",
      "total": 15000.50,
      "medioPago": "efectivo",
      "datosEnvio": null,
      "creadoEn": "2024-01-15T10:30:00.000Z",
      "actualizadoEn": "2024-01-15T10:30:00.000Z"
    }
  ],
  "total": 1,
  "clienteId": "cliente_id"
}
```

---

## 🚀 **Flujo de Implementación en Ecommerce**

### **Paso 1: Obtener Perfil del Usuario**
```javascript
// En tu ecommerce externo
const obtenerPerfil = async (email) => {
  try {
    const response = await fetch(
      `https://maderascaballero.vercel.app/api/users/${email}/profiles`
    );
    
    if (!response.ok) {
      throw new Error('Error al obtener perfil');
    }
    
    const data = await response.json();
    return data.data; // Perfil del usuario
  } catch (error) {
    console.error('Error:', error);
    return null;
  }
};
```

### **Paso 2: Obtener Pedidos del Usuario**
```javascript
// En tu ecommerce externo
const obtenerPedidos = async (email) => {
  try {
    const response = await fetch(
      `https://maderascaballero.vercel.app/api/orders?userId=${email}`
    );
    
    if (!response.ok) {
      throw new Error('Error al obtener pedidos');
    }
    
    const data = await response.json();
    return data.data; // Array de pedidos
  } catch (error) {
    console.error('Error:', error);
    return [];
  }
};
```

### **Paso 3: Implementar en /account/**
```javascript
// En tu página /account/
const AccountPage = () => {
  const [perfil, setPerfil] = useState(null);
  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const cargarDatosUsuario = async () => {
      const email = getCurrentUserEmail(); // Tu lógica de autenticación
      
      if (email) {
        const [perfilData, pedidosData] = await Promise.all([
          obtenerPerfil(email),
          obtenerPedidos(email)
        ]);
        
        setPerfil(perfilData);
        setPedidos(pedidosData);
      }
      
      setLoading(false);
    };
    
    cargarDatosUsuario();
  }, []);
  
  if (loading) return <div>Cargando...</div>;
  
  return (
    <div>
      {/* Sección de Perfil */}
      {perfil && (
        <div>
          <h2>Mi Perfil</h2>
          <p>Nombre: {perfil.nombre}</p>
          <p>Email: {perfil.email}</p>
          <p>Teléfono: {perfil.telefono}</p>
          {/* Más campos del perfil */}
        </div>
      )}
      
              {/* Sección de Pedidos */}
        <div>
          <h2>Mis Pedidos</h2>
          {pedidos.length > 0 ? (
            pedidos.map(pedido => (
              <div key={pedido.id} className="pedido-card">
                <h3>Pedido #{pedido.numeroPedido}</h3>
                                 <div className="pedido-info">
                   <p><strong>Estado:</strong> {pedido.estado}</p>
                   <p><strong>Total:</strong> ${pedido.total?.toLocaleString()}</p>
                   <p><strong>Fecha:</strong> {pedido.fecha ? new Date(pedido.fecha).toLocaleDateString() : 'N/A'}</p>
                   <p><strong>Medio de Pago:</strong> {pedido.medioPago}</p>
                   <p><strong>Fecha Entrega:</strong> {pedido.fechaEntrega ? new Date(pedido.fechaEntrega).toLocaleDateString() : 'N/A'}</p>
                 </div>
                
                                 {/* Productos */}
                 {pedido.productos && pedido.productos.length > 0 && (
                   <div className="productos-section">
                     <h4>Productos:</h4>
                     {pedido.productos.map((producto, index) => (
                       <div key={producto.id || index} className="producto-item">
                         <p><strong>{producto.nombre}</strong></p>
                         <p>Cantidad: {producto.cantidad} {producto.unidad}</p>
                         <p>Precio: ${producto.precio?.toLocaleString()}</p>
                         <p>Categoría: {producto.categoria}</p>
                         {producto.categoria === "Maderas" && producto.alto && (
                           <p>Dimensiones: {producto.alto} x {producto.ancho} x {producto.largo}</p>
                         )}
                         {producto.cepilladoAplicado && <p>✅ Cepillado aplicado</p>}
                       </div>
                     ))}
                   </div>
                 )}
                
                                 {/* Información de Envío */}
                 {pedido.envio && (
                   <div className="envio-section">
                     <h4>Información de Envío:</h4>
                     <p><strong>Estado:</strong> {pedido.envio.estado}</p>
                     <p><strong>Dirección:</strong> {pedido.envio.direccion}</p>
                     <p><strong>Transportista:</strong> {pedido.envio.transportista}</p>
                     <p><strong>Fecha Entrega:</strong> {pedido.envio.fechaEntrega ? new Date(pedido.envio.fechaEntrega).toLocaleDateString() : 'N/A'}</p>
                   </div>
                 )}
              </div>
            ))
          ) : (
            <p>No tienes pedidos aún</p>
          )}
        </div>
    </div>
  );
};
```

---

## ⚠️ **Consideraciones Técnicas**

### **Estructura de Datos Optimizada**
- **IMPORTANTE**: La API `/api/orders` lee desde la colección `ventas` de Firestore
- Los documentos deben tener la estructura correcta con `cliente.email`
- El campo `cliente.email` debe coincidir exactamente con el `userId` enviado
- **Adicional**: La API también consulta la colección `envios` para información de envío
- **OPTIMIZACIÓN**: La respuesta está simplificada para ecommerce externo, incluyendo solo los campos más relevantes

### **Campos Disponibles en la Respuesta (Simplificados)**

#### **Información Básica de la Venta**
- `id`: ID único de la venta
- `numeroPedido`: Número de pedido (ej: "VENTA-00079")
- `estado`: Estado del pago (ej: "pagado", "pendiente")
- `total`: Monto total de la venta
- `fecha`: Fecha de la venta
- `fechaEntrega`: Fecha de entrega programada
- `medioPago`: Forma de pago (ej: "efectivo", "transferencia")

#### **Productos (Solo lo Esencial)**
- `productos`: Array de productos simplificados
- Cada producto incluye:
  - `id`, `nombre`, `categoria`, `cantidad`, `precio`, `unidad`
  - **Para Maderas**: `alto`, `ancho`, `largo`, `cepilladoAplicado`
  - **Para otros**: Solo información básica

#### **Información de Envío (Simplificada)**
- `envio`: Objeto con solo lo relevante:
  - `estado`: Estado del envío
  - `direccion`: Dirección de entrega
  - `transportista`: Transportista asignado
  - `fechaEntrega`: Fecha de entrega

#### **Cliente (Básico)**
- `cliente`: Solo información esencial:
  - `nombre`: Nombre del cliente
  - `telefono`: Teléfono de contacto

### **CORS**
- Todas las APIs tienen CORS habilitado para `*`
- Métodos permitidos: `GET`, `OPTIONS`
- Headers permitidos: `Content-Type`, `Authorization`

### **Autenticación**
- **IMPORTANTE**: Estas APIs NO requieren autenticación por ahora
- En producción, considera implementar validación de sesión
- Las APIs buscan por email, asegúrate de que sea único por usuario

### **Rendimiento**
- Las APIs incluyen cache básico para búsquedas
- Los pedidos se ordenan por fecha de creación (más recientes primero)
- Límites de consulta implementados para evitar sobrecarga

---

## 🔧 **Solución de Problemas**

### **Error 400 - Parámetros incorrectos**
- Verifica que el parámetro `userId` esté presente en la query
- El `userId` debe ser un email válido

### **Error 403 - Error de permisos**
- Error de permisos en la base de datos
- Verifica las reglas de seguridad de Firestore

### **Error 404 - Usuario no encontrado**
- Verifica que el email esté correctamente escrito
- Asegúrate de que el usuario exista en la base de datos
- El usuario debe haberse registrado previamente

### **Error 500 - Error interno**
- Revisa los logs del servidor
- Verifica la conectividad con Firebase
- Asegúrate de que la colección `ventas` exista

### **Error 503 - Base de datos no disponible**
- Error de conectividad con Firestore
- Verifica el estado de la base de datos

### **Respuesta exitosa con array vacío**
- Si el usuario no tiene ventas, la API devuelve `data: []` con status 200
- Esto NO es un error, es una respuesta válida

### **CORS Issues**
- Las APIs responden con `Access-Control-Allow-Origin: *`
- Si persisten problemas, verifica la configuración de tu servidor

---

## 📞 **Soporte**

Para problemas técnicos o consultas sobre estas APIs:
- Revisa los logs del servidor
- Verifica la conectividad con Firebase
- Asegúrate de que las colecciones de datos existan

**¡Tu ecommerce externo ahora debería funcionar correctamente con estas APIs!** 🎉
