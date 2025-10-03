import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { collection, doc, getDoc, getDocs, query, where, limit } from "firebase/firestore";
import { calcularPreciosProducto, normalizarProductoEntrada } from "@/lib/pricing";

/**
 * API de Precios - IMPORTANTE: SOLO devuelve productos con estadoTienda: "Activo"
 * 
 * Esta API está configurada para mostrar ÚNICAMENTE productos que estén activos en tienda.
 * Los productos sin campo estadoTienda o con estadoTienda diferente a "Activo" NO se muestran.
 * 
 * Filtros aplicados:
 * - estadoTienda debe ser "Activo"
 * - Productos sin estadoTienda se consideran inactivos
 * - Productos con estadoTienda: "Inactivo" se rechazan
 */

// Sencillo helper CORS
function withCors(resp) {
  const headers = new Headers(resp.headers);
  headers.set("Access-Control-Allow-Origin", "*");
  headers.set("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  headers.set("Access-Control-Allow-Headers", "Content-Type");
  return new NextResponse(resp.body, { status: resp.status, headers });
}

export function OPTIONS() {
  return withCors(new NextResponse(null, { status: 204 }));
}

// GET /api/precios?id=...&cantidad=1&cepillado=true|false
// GET /api/precios?codigo=ABC123 o ?nombre=...
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const codigo = searchParams.get("codigo");
    const nombre = searchParams.get("nombre");
    const cantidad = parseFloat(searchParams.get("cantidad") || "1");
    const cepillado = (searchParams.get("cepillado") || "false").toLowerCase() === "true";
    const redondearParam = searchParams.get("redondear");
    const redondear = redondearParam == null ? true : redondearParam.toLowerCase() !== "false";
    const modoRedondeo = (searchParams.get("modoRedondeo") || "total").toLowerCase();
    const allParam = searchParams.get("all");
    const listarTodos = allParam != null && ["1", "true", "t", "si", "sí", "yes"].includes(allParam.toLowerCase());

    // Listado completo del catálogo con pricing
    // SOLO productos activos en tienda (estadoTienda: "Activo")
    if (listarTodos) {
      const q = query(
        collection(db, "productos"),
        where("estadoTienda", "==", "Activo")
      );
      const snap = await getDocs(q);
      const items = [];
      snap.forEach((d) => {
        const prod = { id: d.id, ...d.data() };
        const normalized = normalizarProductoEntrada(prod);
        const pricing = calcularPreciosProducto(normalized, { cantidad, cepillado, redondear, modoRedondeo });
        items.push({ id: normalized.id, producto: normalized, pricing });
      });
      return withCors(NextResponse.json({ 
        items, 
        total: items.length,
        filtro: "Solo productos activos en tienda (estadoTienda: 'Activo')"
      }));
    }

    let producto = null;

    if (id) {
      const ref = doc(db, "productos", id);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        const prodData = snap.data();
        // Verificar que el producto esté activo en tienda
        if (prodData.estadoTienda === "Activo") {
          producto = { id: snap.id, ...prodData };
        } else {
          return withCors(NextResponse.json({ 
            error: "Producto inactivo en tienda", 
            estadoTienda: prodData.estadoTienda || "No definido",
            mensaje: "Solo se pueden consultar precios de productos activos en tienda"
          }, { status: 403 }));
        }
      }
    } else if (codigo) {
      const qq = query(
        collection(db, "productos"),
        where("codigo", "==", codigo),
        where("estadoTienda", "==", "Activo"),
        limit(1)
      );
      const snap = await getDocs(qq);
      snap.forEach((d) => (producto = { id: d.id, ...d.data() }));
    } else if (nombre) {
      // Búsqueda simple por igualdad; para fuzzy ver /api/productos/search
      // SOLO productos activos en tienda
      const qq = query(
        collection(db, "productos"),
        where("nombre", "==", nombre),
        where("estadoTienda", "==", "Activo"),
        limit(1)
      );
      const snap = await getDocs(qq);
      snap.forEach((d) => (producto = { id: d.id, ...d.data() }));
    } else {
      return withCors(NextResponse.json({ error: "Debe enviar id, codigo o nombre" }, { status: 400 }));
    }

    if (!producto) {
      return withCors(NextResponse.json({ error: "Producto no encontrado" }, { status: 404 }));
    }

    const normalized = normalizarProductoEntrada(producto);
    const pricing = calcularPreciosProducto(normalized, { cantidad, cepillado, redondear, modoRedondeo });
    return withCors(NextResponse.json({ id: producto.id, producto: normalized, pricing }));
  } catch (err) {
    return withCors(NextResponse.json({ error: err.message }, { status: 500 }));
  }
}

// POST /api/precios  Body: { items: [{ producto: {...}, cantidad, cepillado } | { id, cantidad, cepillado } ] }
export async function POST(request) {
  try {
    const body = await request.json();
    const items = Array.isArray(body?.items) ? body.items : [];
    const redondear = body?.redondear == null ? true : Boolean(body.redondear);
    const modoRedondeo = typeof body?.modoRedondeo === "string" ? String(body.modoRedondeo).toLowerCase() : "total";
    if (!Array.isArray(items) || items.length === 0) {
      return withCors(NextResponse.json({ error: "items vacío" }, { status: 400 }));
    }

    const out = [];
    for (const it of items) {
      let prod = it.producto;
      if (!prod && it.id) {
        const ref = doc(db, "productos", String(it.id));
        const snap = await getDoc(ref);
        if (snap.exists()) {
          const prodData = snap.data();
          // Verificar que el producto esté activo en tienda
          if (prodData.estadoTienda === "Activo") {
            prod = { id: snap.id, ...prodData };
          } else {
            out.push({ 
              error: "Producto inactivo en tienda", 
              estadoTienda: prodData.estadoTienda || "No definido",
              mensaje: "Solo se pueden consultar precios de productos activos en tienda",
              input: it 
            });
            continue;
          }
        }
      }
      if (!prod) {
        out.push({ error: "Producto no encontrado", input: it });
        continue;
      }
      // Verificar que el producto en el body también esté activo en tienda
      if (prod.estadoTienda !== "Activo") {
        out.push({ 
          error: "Producto inactivo en tienda", 
          estadoTienda: prod.estadoTienda || "No definido",
          mensaje: "Solo se pueden consultar precios de productos activos en tienda",
          input: it 
        });
        continue;
      }
      const cantidad = typeof it.cantidad === "number" ? it.cantidad : parseFloat(String(it.cantidad || "1"));
      const cepillado = Boolean(it.cepillado);
      const normalized = normalizarProductoEntrada(prod);
      const pricing = calcularPreciosProducto(normalized, { cantidad, cepillado, redondear, modoRedondeo });
      out.push({ id: normalized.id, producto: normalized, pricing });
    }

    return withCors(NextResponse.json({ items: out }));
  } catch (err) {
    return withCors(NextResponse.json({ error: err.message }, { status: 500 }));
  }
}


