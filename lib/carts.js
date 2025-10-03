import { db } from "@/lib/firebase";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  updateDoc,
  where,
  setDoc,
} from "firebase/firestore";

function nowIso() {
  return new Date().toISOString();
}

function toNumber(input, fallback = null) {
  const n = typeof input === "number" ? input : parseFloat(String(input ?? ""));
  return Number.isFinite(n) ? n : fallback;
}

export function normalizarAtributos(raw) {
  const out = {};
  if (!raw || typeof raw !== "object") return out;
  Object.keys(raw).forEach((k) => {
    const key = String(k);
    const val = raw[k];
    if (val == null) return;
    out[key] = String(val);
  });
  return out;
}

export function buildItemKey(productoId, atributos) {
  const attrs = normalizarAtributos(atributos);
  const sortedKeys = Object.keys(attrs).sort();
  const stable = {};
  for (const k of sortedKeys) stable[k] = attrs[k];
  return `${String(productoId)}::${JSON.stringify(stable)}`;
}

export function calcularTotales(items) {
  let subtotal = 0;
  for (const it of items) {
    const cantidad = toNumber(it?.cantidad, 0) || 0;
    const precio = toNumber(it?.precioUnitario, 0) || 0;
    subtotal += precio * cantidad;
  }
  const impuestos = 0;
  const envio = 0;
  const total = subtotal + impuestos + envio;
  return { subtotal, impuestos, envio, total };
}

export async function encontrarCarritoAbiertoPorUsuario(usuarioId) {
  if (!usuarioId) return null;
  const q = query(
    collection(db, "carts"),
    where("usuarioId", "==", usuarioId),
    where("estado", "==", "abierto"),
    limit(1)
  );
  const snap = await getDocs(q);
  let cart = null;
  snap.forEach((d) => (cart = { carritoId: d.id, ...d.data() }));
  return cart;
}

export async function obtenerCarritoPorId(carritoId) {
  if (!carritoId) return null;
  const ref = doc(db, "carts", String(carritoId));
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return { carritoId: snap.id, ...snap.data() };
}

export async function crearCarrito({ usuarioId = null, moneda = "ARS" } = {}) {
  const payload = {
    usuarioId: usuarioId || null,
    estado: "abierto",
    moneda: String(moneda || "ARS"),
    items: [],
    totales: { subtotal: 0, impuestos: 0, envio: 0, total: 0 },
    creadoEn: nowIso(),
    actualizadoEn: nowIso(),
  };
  const docRef = await addDoc(collection(db, "carts"), payload);
  return { carritoId: docRef.id, ...payload };
}

export async function guardarCarrito(carrito) {
  if (!carrito?.carritoId) throw new Error("carritoId requerido");
  const ref = doc(db, "carts", String(carrito.carritoId));
  const payload = { ...carrito };
  delete payload.carritoId;
  await setDoc(ref, payload, { merge: true });
}

export function mergearItems(baseItems, nuevosItems) {
  const mapa = new Map();
  for (const it of baseItems || []) {
    const key = buildItemKey(it.productoId, it.atributos);
    mapa.set(key, { ...it });
  }
  for (const it of nuevosItems || []) {
    const key = buildItemKey(it.productoId, it.atributos);
    const actual = mapa.get(key);
    if (actual) {
      const cantidad = toNumber(actual.cantidad, 0) + toNumber(it.cantidad, 0);
      mapa.set(key, { ...actual, cantidad });
    } else {
      mapa.set(key, { ...it });
    }
  }
  return Array.from(mapa.values());
}

export async function mergearCarritoDeUsuarioEnActual({ actual, usuarioId }) {
  if (!usuarioId || !actual?.carritoId) return actual;
  const otro = await encontrarCarritoAbiertoPorUsuario(usuarioId);
  if (otro && otro.carritoId !== actual.carritoId) {
    const items = mergearItems(actual.items || [], otro.items || []);
    const totales = calcularTotales(items);
    const merged = {
      ...actual,
      usuarioId,
      items,
      totales,
      actualizadoEn: nowIso(),
    };
    await guardarCarrito(merged);
    // Cerrar el otro carrito
    const refOtro = doc(db, "carts", String(otro.carritoId));
    await updateDoc(refOtro, { estado: "cerrado", actualizadoEn: nowIso() });
    return merged;
  }
  // Si no hay otro, simplemente vincular usuario
  if (actual.usuarioId !== usuarioId) {
    const updated = { ...actual, usuarioId, actualizadoEn: nowIso() };
    await guardarCarrito(updated);
    return updated;
  }
  return actual;
}


