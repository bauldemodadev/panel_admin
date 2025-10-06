import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { collection, doc, getDoc, getDocs, query, where, limit } from "firebase/firestore";

/**
 * API de Precios - Devuelve productos publicados con la estructura unificada de tienda/cursos
 *
 * Esta API expone únicamente productos con `publicado: true`.
 * La estructura de producto devuelta coincide con el formulario de productos:
 * {
 *   id, nombre, sku, tipo, publicado, precio: { normal, rebajado },
 *   inventario, categorias[], imagenes[], atributos{}, fechaCreacion, fechaActualizacion
 * }
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

// GET /api/precios?id=...&cantidad=1
// GET /api/precios?codigo=ABC123 (alias sku) o ?nombre=...
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const codigo = searchParams.get("codigo"); // alias de sku
    const nombre = searchParams.get("nombre");
    const cantidad = parseFloat(searchParams.get("cantidad") || "1");
    const allParam = searchParams.get("all");
    const listarTodos = allParam != null && ["1", "true", "t", "si", "sí", "yes"].includes(allParam.toLowerCase());

    // Helper para normalizar y tipar mínimamente el producto según el esquema de tienda
    const normalizeProducto = (p, idOverride) => {
      if (!p || typeof p !== "object") return {};
      const precio = p.precio || {};
      const parseNum = (v) => {
        if (v === null || v === undefined || v === "") return undefined;
        const n = Number(v);
        return Number.isFinite(n) ? n : undefined;
      };
      return {
        id: idOverride ?? p.id,
        nombre: p.nombre ?? "",
        sku: p.sku ?? null,
        tipo: p.tipo ?? "simple",
        publicado: Boolean(p.publicado),
        precio: {
          normal: parseNum(precio.normal) ?? 0,
          rebajado: precio.rebajado != null ? parseNum(precio.rebajado) ?? null : null,
        },
        inventario: Number.isFinite(Number(p.inventario)) ? Number(p.inventario) : 0,
        categorias: Array.isArray(p.categorias) ? p.categorias : [],
        imagenes: Array.isArray(p.imagenes) ? p.imagenes : [],
        atributos: typeof p.atributos === "object" && p.atributos != null ? p.atributos : {},
        fechaCreacion: p.fechaCreacion ?? null,
        fechaActualizacion: p.fechaActualizacion ?? null,
      };
    };

    const calcularPricingSimple = (producto, cantidadNum) => {
      const qty = Number.isFinite(cantidadNum) && cantidadNum > 0 ? cantidadNum : 1;
      const unit = producto.precio?.normal || 0; // ignorar rebajado
      const total = unit * qty;
      return { cantidad: qty, precioUnitario: unit, precioTotal: total };
    };

    // Listado completo del catálogo publicado con pricing simple
    if (listarTodos) {
      const q = query(
        collection(db, "productos"),
        where("publicado", "==", true)
      );
      const snap = await getDocs(q);
      const items = [];
      snap.forEach((d) => {
        const prod = { id: d.id, ...d.data() };
        const normalized = normalizeProducto(prod, d.id);
        const pricing = calcularPricingSimple(normalized, cantidad);
        items.push({ id: normalized.id, producto: normalized, pricing });
      });
      return withCors(NextResponse.json({ 
        items, 
        total: items.length,
        filtro: "Solo productos publicados (publicado: true)"
      }));
    }

    let producto = null;

    if (id) {
      const ref = doc(db, "productos", id);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        const prodData = snap.data();
        if (prodData.publicado === true) {
          producto = { id: snap.id, ...prodData };
        } else {
          return withCors(NextResponse.json({ 
            error: "Producto no publicado",
            publicado: Boolean(prodData.publicado),
            mensaje: "Solo se pueden consultar precios de productos publicados"
          }, { status: 403 }));
        }
      }
    } else if (codigo) {
      const qq = query(
        collection(db, "productos"),
        where("sku", "==", codigo),
        where("publicado", "==", true),
        limit(1)
      );
      const snap = await getDocs(qq);
      snap.forEach((d) => (producto = { id: d.id, ...d.data() }));
    } else if (nombre) {
      // Búsqueda simple por igualdad; SOLO publicados
      const qq = query(
        collection(db, "productos"),
        where("nombre", "==", nombre),
        where("publicado", "==", true),
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

    const normalized = normalizeProducto(producto, producto.id);
    const pricing = calcularPricingSimple(normalized, cantidad);
    return withCors(NextResponse.json({ id: producto.id, producto: normalized, pricing }));
  } catch (err) {
    return withCors(NextResponse.json({ error: err.message }, { status: 500 }));
  }
}

// POST /api/precios  Body: { items: [{ producto: {...}, cantidad } | { id, cantidad } ] }
export async function POST(request) {
  try {
    const body = await request.json();
    const items = Array.isArray(body?.items) ? body.items : [];
    if (!Array.isArray(items) || items.length === 0) {
      return withCors(NextResponse.json({ error: "items vacío" }, { status: 400 }));
    }

    const normalizeProducto = (p, idOverride) => {
      if (!p || typeof p !== "object") return {};
      const precio = p.precio || {};
      const toNum = (v) => {
        if (v === null || v === undefined || v === "") return undefined;
        const n = Number(v);
        return Number.isFinite(n) ? n : undefined;
      };
      return {
        id: idOverride ?? p.id,
        nombre: p.nombre ?? "",
        sku: p.sku ?? null,
        tipo: p.tipo ?? "simple",
        publicado: Boolean(p.publicado),
        precio: {
          normal: toNum(precio.normal) ?? 0,
          rebajado: precio.rebajado != null ? toNum(precio.rebajado) ?? null : null,
        },
        inventario: Number.isFinite(Number(p.inventario)) ? Number(p.inventario) : 0,
        categorias: Array.isArray(p.categorias) ? p.categorias : [],
        imagenes: Array.isArray(p.imagenes) ? p.imagenes : [],
        atributos: typeof p.atributos === "object" && p.atributos != null ? p.atributos : {},
        fechaCreacion: p.fechaCreacion ?? null,
        fechaActualizacion: p.fechaActualizacion ?? null,
      };
    };

    const calcularPricingSimple = (producto, cantidadNum) => {
      const qty = Number.isFinite(cantidadNum) && cantidadNum > 0 ? cantidadNum : 1;
      const unit = producto.precio?.normal || 0; // ignorar rebajado
      const total = unit * qty;
      return { cantidad: qty, precioUnitario: unit, precioTotal: total };
    };

    const out = [];
    for (const it of items) {
      let prod = it.producto;
      if (!prod && it.id) {
        const ref = doc(db, "productos", String(it.id));
        const snap = await getDoc(ref);
        if (snap.exists()) {
          const prodData = snap.data();
          if (prodData.publicado === true) {
            prod = { id: snap.id, ...prodData };
          } else {
            out.push({ 
              error: "Producto no publicado",
              publicado: Boolean(prodData.publicado),
              mensaje: "Solo se pueden consultar precios de productos publicados",
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
      // Verificar publicado si vino embebido
      if (prod.publicado !== true) {
        out.push({ 
          error: "Producto no publicado",
          publicado: Boolean(prod.publicado),
          mensaje: "Solo se pueden consultar precios de productos publicados",
          input: it 
        });
        continue;
      }
      const cantidadNum = typeof it.cantidad === "number" ? it.cantidad : parseFloat(String(it.cantidad || "1"));
      const normalized = normalizeProducto(prod, prod.id);
      const pricing = calcularPricingSimple(normalized, cantidadNum);
      out.push({ id: normalized.id, producto: normalized, pricing });
    }

    return withCors(NextResponse.json({ items: out }));
  } catch (err) {
    return withCors(NextResponse.json({ error: err.message }, { status: 500 }));
  }
}


