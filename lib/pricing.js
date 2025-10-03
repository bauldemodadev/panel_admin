// Motor de precios reutilizable por UI y API

const roundToHundreds = (value) => {
  const num = Number(value);
  if (!Number.isFinite(num)) return 0;
  return Math.round(num / 100) * 100;
};

const toNumber = (value) => {
  if (value === null || value === undefined) return 0;
  const str = String(value).toString().replace(/,/g, ".");
  const num = parseFloat(str);
  return Number.isFinite(num) ? num : 0;
};

export function calcularPrecioCorteMadera({
  alto,
  ancho,
  largo,
  precioPorPie,
  factor = 0.2734,
  redondear = true,
}) {
  const a = toNumber(alto);
  const an = toNumber(ancho);
  const l = toNumber(largo);
  const p = toNumber(precioPorPie);
  if ([a, an, l, p].some((v) => v <= 0)) return 0;
  const precio = factor * a * an * l * p;
  return redondear ? roundToHundreds(precio) : precio;
}

export function calcularPrecioMachimbre({ alto, largo, cantidad, precioPorPie, redondear = true }) {
  const a = toNumber(alto);
  const l = toNumber(largo);
  const c = Math.max(1, toNumber(cantidad));
  const p = toNumber(precioPorPie);
  if ([a, l, c, p].some((v) => v <= 0)) return 0;
  const metrosCuadrados = a * l;
  const precio = metrosCuadrados * p * c;
  return redondear ? roundToHundreds(precio) : precio;
}

export function calcularPreciosProducto(producto, {
  cantidad = 1,
  cepillado = false,
  redondear = true,
  modoRedondeo = "total", // "unitario" | "total" | "ninguno"
} = {}) {
  const categoria = String(producto?.categoria || "");
  const unidad = String(producto?.unidadMedida || "");
  const cantidadNum = Math.max(1, toNumber(cantidad));

  let baseUnitPrice = 0;
  let baseTotalPrice = 0;
  const shouldRound = Boolean(redondear);
  const doRound = (v) => (shouldRound ? roundToHundreds(v) : v);

  if (categoria === "Maderas") {
    if (unidad === "M2") {
      const unitRaw = calcularPrecioMachimbre({
        alto: producto?.alto,
        largo: producto?.largo,
        cantidad: 1,
        precioPorPie: producto?.precioPorPie,
        redondear: false,
      });
      const totalRaw = calcularPrecioMachimbre({
        alto: producto?.alto,
        largo: producto?.largo,
        cantidad: cantidadNum,
        precioPorPie: producto?.precioPorPie,
        redondear: false,
      });
      const unitRounded = doRound(unitRaw);
      if (modoRedondeo === "unitario") {
        baseUnitPrice = unitRounded;
        baseTotalPrice = doRound(unitRounded * cantidadNum);
      } else if (modoRedondeo === "ninguno") {
        baseUnitPrice = unitRaw;
        baseTotalPrice = totalRaw;
      } else {
        // total (por defecto)
        baseUnitPrice = unitRounded;
        baseTotalPrice = doRound(totalRaw);
      }
    } else if (unidad === "Unidad") {
      const pUnitRaw = toNumber(producto?.precioPorPie);
      const unitRounded = doRound(pUnitRaw);
      if (modoRedondeo === "unitario") {
        baseUnitPrice = unitRounded;
        baseTotalPrice = doRound(unitRounded * cantidadNum);
      } else if (modoRedondeo === "ninguno") {
        baseUnitPrice = pUnitRaw;
        baseTotalPrice = pUnitRaw * cantidadNum;
      } else {
        // total (pero para Unidad, mantener política actual equivalente a unitario por consistencia histórica)
        baseUnitPrice = unitRounded;
        baseTotalPrice = doRound(unitRounded * cantidadNum);
      }
    } else {
      const unitRaw = calcularPrecioCorteMadera({
        alto: producto?.alto,
        ancho: producto?.ancho,
        largo: producto?.largo,
        precioPorPie: producto?.precioPorPie,
        redondear: false,
      });
      const totalRaw = unitRaw * cantidadNum;
      const unitRounded = doRound(unitRaw);
      if (modoRedondeo === "unitario") {
        baseUnitPrice = unitRounded;
        baseTotalPrice = doRound(unitRounded * cantidadNum);
      } else if (modoRedondeo === "ninguno") {
        baseUnitPrice = unitRaw;
        baseTotalPrice = totalRaw;
      } else {
        // total
        baseUnitPrice = unitRounded;
        baseTotalPrice = doRound(totalRaw);
      }
    }
  } else {
    const unitRaw = toNumber(producto?.valorVenta);
    const unitRounded = doRound(unitRaw);
    if (modoRedondeo === "unitario") {
      baseUnitPrice = unitRounded;
      baseTotalPrice = doRound(unitRounded * cantidadNum);
    } else if (modoRedondeo === "ninguno") {
      baseUnitPrice = unitRaw;
      baseTotalPrice = unitRaw * cantidadNum;
    } else {
      // total
      baseUnitPrice = unitRounded;
      baseTotalPrice = doRound(unitRaw * cantidadNum);
    }
  }

  const aplicaCepillado = categoria === "Maderas" && unidad !== "Unidad";
  const planedUnitRaw = aplicaCepillado ? baseUnitPrice * 1.066 : baseUnitPrice;
  const planedTotalRaw = aplicaCepillado ? baseTotalPrice * 1.066 : baseTotalPrice;
  const precioUnitarioCepillado = doRound(planedUnitRaw);
  const precioTotalCepillado = doRound(planedTotalRaw);

  const precioUnitarioFinal = cepillado && aplicaCepillado ? precioUnitarioCepillado : baseUnitPrice;
  const precioTotalFinal = cepillado && aplicaCepillado ? precioTotalCepillado : baseTotalPrice;

  return {
    categoria,
    unidad,
    cantidad: cantidadNum,
    cepilladoAplicado: Boolean(cepillado && aplicaCepillado),
    precioUnitarioBase: baseUnitPrice,
    precioUnitarioCepillado,
    precioUnitarioFinal,
    precioTotalBase: baseTotalPrice,
    precioTotalCepillado,
    precioTotalFinal,
  };
}

export function normalizarProductoEntrada(p) {
  // Permite pasar productos con campos como string o number y normaliza mínimamente
  if (!p || typeof p !== "object") return {};
  return {
    ...p,
    alto: toNumber(p.alto),
    ancho: toNumber(p.ancho),
    largo: toNumber(p.largo),
    precioPorPie: toNumber(p.precioPorPie),
    valorVenta: toNumber(p.valorVenta),
    categoria: p.categoria ? String(p.categoria) : undefined,
    unidadMedida: p.unidadMedida ? String(p.unidadMedida) : undefined,
  };
}

export const PricingUtils = {
  roundToHundreds,
  toNumber,
};

/**
 * Utilities for product pricing calculations across the app.
 * Centralizes logic for different wood subcategories (machimbre/deck) vs normal items.
 */

/**
 * Returns true when a product belongs to the machimbre/deck family.
 * Accepts either `subcategoria` or `subCategoria` as source field.
 * @param {object} product
 * @returns {boolean}
 */
export function isMachimbreOrDeck(product = {}) {
  const sub = String(product.subcategoria ?? product.subCategoria ?? "").toLowerCase();
  if (sub === "machimbre" || sub === "deck") return true;
  const name = String(product.nombre ?? product.descripcion ?? "").toLowerCase();
  if (name.includes("machimbre") || name.includes("deck")) return true;
  return false;
}

/**
 * Numeric safe cast helper.
 * @param {any} v
 * @returns {number}
 */
export function n(v) {
  const num = Number(v);
  return Number.isFinite(num) ? num : 0;
}

/**
 * Computes the line base amount before discount for a product.
 * - For machimbre/deck: base is the `precio` directly (already includes quantity)
 * - For "Eventual" category: base is `precio * cantidad` (direct calculation)
 * - For the rest: base is `precio * cantidad`
 * @param {object} product
 * @returns {number}
 */
export function computeLineBase(product = {}) {
  const price = n(product.precio);
  const qty = Math.max(1, n(product.cantidad));
  
  // Para productos de categoría "Eventual", calcular directamente precio × cantidad
  if (product.categoria === "Eventual") {
    return price * qty;
  }
  
  // Para machimbre/deck: base es el precio directamente (ya incluye cantidad)
  if (isMachimbreOrDeck(product)) return price;
  
  // Para el resto: base es precio × cantidad
  return price * qty;
}

/**
 * Computes the line subtotal (after discount) rounded to nearest integer.
 * @param {object} product
 * @returns {number}
 */
export function computeLineSubtotal(product = {}) {
  const base = computeLineBase(product);
  const discountPct = Math.max(0, n(product.descuento));
  const subtotal = base * (1 - discountPct / 100);
  return Math.round(subtotal);
}

/**
 * Computes aggregated totals for a list of products.
 * @param {Array<object>} products
 * @returns {{subtotal:number, descuentoTotal:number, total:number}}
 */
export function computeTotals(products = []) {
  let subtotal = 0;
  let descuentoTotal = 0;
  for (const p of products) {
    const base = computeLineBase(p);
    subtotal += base;
    descuentoTotal += base * (Math.max(0, n(p.descuento)) / 100);
  }
  const total = subtotal - descuentoTotal;
  return {
    subtotal: Math.round(subtotal),
    descuentoTotal: Math.round(descuentoTotal),
    total: Math.round(total),
  };
}


