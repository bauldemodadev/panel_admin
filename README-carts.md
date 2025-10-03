## API externa de Carts

Base URL: `https://maderascaballero.vercel.app`

Formato de respuesta estándar:
```
{ "ok": boolean, "dato": any | null, "mensaje": string | null, "error": string | null }
```

Autenticación: opcional vía `Authorization: Bearer <token>` (si está presente se asocia a `usuarioId`). En desarrollo, puede operar sin token.

CORS:
- OPTIONS responde 204 en todas las rutas
- Encabezados: `Access-Control-Allow-Origin` (lista blanca por `ALLOWED_ORIGINS`), `Access-Control-Allow-Methods: GET,POST,PATCH,DELETE,OPTIONS`, `Access-Control-Allow-Headers: Content-Type, Authorization`.

Colección Firestore: `carts`

### Endpoints

1) GET `/api/carts/:id`
- `:id` puede ser `usuarioId` (carrito abierto) o `carritoId`.
- Query: `?auto=1|0` para autocrear si no existe (default: 1).
- 200: `{ ok: true, dato: Carrito }`
- 404 si no existe y `auto=0`.

2) POST `/api/carts`
Body:
```
{ "usuarioId": string | null, "moneda": "ARS" | "USD" }
```
- 201: `{ ok: true, dato: Carrito }`

3) POST `/api/carts/:carritoId/items`
Body:
```
{
  "productoId": string,
  "nombreProducto": string,
  "sku": string,
  "imagenUrl": string,
  "atributos": { "tamaño"?: string, "color"?: string },
  "precioUnitario": number,
  "cantidad": number
}
```
- Merge por `productoId + atributos`. 200 con carrito actualizado.

4) PATCH `/api/carts/:carritoId/items/:itemId`
Body: `{ "cantidad"?: number, "atributos"?: Record<string,string> }`

5) DELETE `/api/carts/:carritoId/items/:itemId`

6) DELETE `/api/carts/:carritoId/clear`

7) PATCH `/api/carts/:carritoId/close`

### Ejemplos curl

Preflight:
```
curl -i -X OPTIONS "$BASE/api/carts/TEST" -H "Origin: http://localhost:3000" -H "Access-Control-Request-Method: GET"
```

Crear carrito:
```
curl -i -X POST "$BASE/api/carts" -H "Origin: http://localhost:3000" -H "Content-Type: application/json" -d '{"usuarioId":null,"moneda":"ARS"}'
```

Obtener carrito (usuarioId o carritoId):
```
curl -i "$BASE/api/carts/USUARIO_O_CARRITO" -H "Origin: http://localhost:3000"
```

Agregar ítem:
```
curl -i -X POST "$BASE/api/carts/CARRITO_ID/items" -H "Origin: http://localhost:3000" -H "Content-Type: application/json" \
  -d '{"productoId":"p1","nombreProducto":"Tablón","sku":"TAB-001","imagenUrl":"https://...","atributos":{"tamaño":"2x4"},"precioUnitario":1000,"cantidad":2}'
```

Actualizar/eliminar ítem, limpiar y cerrar como se describe arriba.


