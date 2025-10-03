export function isValidEmail(email) {
  if (typeof email !== "string") return false;
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email.toLowerCase());
}

export function toNumberOrNull(value) {
  if (value == null || value === "") return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

export function trimOrEmpty(value) {
  return typeof value === "string" ? value.trim() : "";
}

export function requiredString(value, fieldName) {
  const v = trimOrEmpty(value);
  if (!v) {
    const err = new Error(`${fieldName} es obligatorio`);
    err.status = 400;
    throw err;
  }
  return v;
}

export function validateClienteUpsert(input) {
  const nombre = requiredString(input.nombre, "nombre");
  const telefono = requiredString(input.telefono, "telefono");
  const cuit = requiredString(input.dni ?? input.cuit, "cuit(dni)");
  const email = trimOrEmpty(input.email);
  if (email && !isValidEmail(email)) {
    const err = new Error("email inválido");
    err.status = 400;
    throw err;
  }
  return { nombre, telefono, cuit, email };
}

export function validateDireccionUpsert(input) {
  const direccion = requiredString(input.direccion, "direccion");
  const localidad = requiredString(input.ciudad ?? input.localidad, "localidad");
  const codigoPostal = trimOrEmpty(input.codigoPostal);
  const lat = toNumberOrNull(input.lat);
  const lng = toNumberOrNull(input.lng);
  const email = trimOrEmpty(input.email);
  if (email && !isValidEmail(email)) {
    const err = new Error("email inválido");
    err.status = 400;
    throw err;
  }
  if ((input.lat != null && lat == null) || (input.lng != null && lng == null)) {
    const err = new Error("lat/lng deben ser numéricos");
    err.status = 400;
    throw err;
  }
  return { direccion, localidad, codigoPostal, lat, lng };
}


