import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";

function toNumero(valor) {
  const n = typeof valor === "number" ? valor : parseFloat(String(valor ?? ""));
  return Number.isFinite(n) ? n : null;
}

function normalizarLocation(raw) {
  const nombre = String(raw?.nombre ?? "");
  const direccion = String(raw?.direccion ?? "");
  const lat = toNumero(raw?.lat);
  const lng = toNumero(raw?.lng);
  const radio = toNumero(raw?.radio);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || !Number.isFinite(radio)) return null;
  return { nombre, direccion, lat, lng, radio };
}

export async function obtenerSettingsGeneral() {
  // Esperamos colección "settings" doc "general" con campos al nivel raíz
  const snap = await getDoc(doc(db, "settings", "general"));
  if (!snap.exists()) {
    return { locations: [], data: null };
  }
  const data = snap.data() || {};
  // Soportar alternativa anidada: data.settings?.general
  const general = data?.locations ? data : data?.settings?.general || {};
  const locationsRaw = Array.isArray(general?.locations) ? general.locations : [];
  const locations = locationsRaw
    .map(normalizarLocation)
    .filter((x) => x && Number.isFinite(x.lat) && Number.isFinite(x.lng) && Number.isFinite(x.radio));
  return { locations, data: general };
}


