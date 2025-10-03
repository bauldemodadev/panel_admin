// Utilidades para el manejo de obras y presupuestos

export const formatearNumeroArgentino = (numero) => {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
  }).format(numero);
};

export const formatearFecha = (fecha) => {
  if (!fecha) return "No especificada";
  return new Date(fecha).toLocaleDateString("es-AR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

export const parseNumericValue = (value) => {
  if (value === "" || value === null || value === undefined) return "";
  const parsed = parseFloat(value);
  return isNaN(parsed) ? "" : parsed;
};

export const calcularPrecioMachimbre = ({
  alto,
  largo,
  cantidad,
  precioPorPie,
}) => {
  const altoNum = Number(alto) || 0;
  const largoNum = Number(largo) || 0;
  const cantNum = Number(cantidad) || 1;
  const precioPorPieNum = Number(precioPorPie) || 0;

  if (altoNum <= 0 || largoNum <= 0 || precioPorPieNum <= 0) return 0;

  const areaTotal = altoNum * largoNum * cantNum;
  return Math.round(areaTotal * precioPorPieNum);
};

export const calcularPrecioCorteMadera = ({
  alto,
  ancho,
  largo,
  precioPorPie,
}) => {
  const altoNum = Number(alto) || 0;
  const anchoNum = Number(ancho) || 0;
  const largoNum = Number(largo) || 0;
  const precioPorPieNum = Number(precioPorPie) || 0;

  if (altoNum <= 0 || anchoNum <= 0 || largoNum <= 0 || precioPorPieNum <= 0)
    return 0;

  const volumen = altoNum * anchoNum * largoNum;
  return Math.round(volumen * precioPorPieNum);
};

export const calcularPrecioProductoObra = ({
  unidadMedida,
  alto,
  largo,
  valorVenta,
  cantidad,
}) => {
  const u = String(unidadMedida || "").toUpperCase();
  const altoNum = Number(alto) || 0;
  const largoNum = Number(largo) || 0;
  const valorNum = Number(valorVenta) || 0;
  const cantNum = Number(cantidad) || 1;

  if (u === "M2") return Math.round(altoNum * largoNum * valorNum * cantNum);
  if (u === "ML") return Math.round(largoNum * valorNum * cantNum);
  return Math.round(valorNum * cantNum);
};

export const generarContenidoImpresion = (
  obra,
  presupuesto,
  modoCosto,
  movimientos = []
) => {
  // Función auxiliar para obtener el label del estado
  const getEstadoLabel = (estado) => {
    const estados = {
      pendiente_inicio: "Pendiente de Inicio",
      en_progreso: "En Progreso",
      completada: "Completada",
      cancelada: "Cancelada",
      Activo: "Activo",
      Inactivo: "Inactivo",
    };
    return estados[estado] || estado;
  };

  // Calcular totales para obras
  let productosSubtotal = 0;
  let productosDescuentoTotal = 0;
  let productosTotal = 0;
  let baseTotalVisual = 0;
  let totalMovimientos = 0;

  if (obra?.tipo === "obra" && obra?.materialesCatalogo) {
    productosSubtotal = obra.materialesCatalogo.reduce((acc, item) => {
      const esMadera = String(item.categoria || "").toLowerCase() === "maderas";
      const isMachDeck =
        esMadera &&
        (item.subcategoria === "machimbre" || item.subcategoria === "deck");
      const base = isMachDeck
        ? Number(item.precio) || 0
        : (Number(item.precio) || 0) * (Number(item.cantidad) || 0);
      return acc + base;
    }, 0);

    productosDescuentoTotal = obra.materialesCatalogo.reduce((acc, item) => {
      const esMadera = String(item.categoria || "").toLowerCase() === "maderas";
      const isMachDeck =
        esMadera &&
        (item.subcategoria === "machimbre" || item.subcategoria === "deck");
      const base = isMachDeck
        ? Number(item.precio) || 0
        : (Number(item.precio) || 0) * (Number(item.cantidad) || 0);
      return acc + Math.round((base * (Number(item.descuento) || 0)) / 100);
    }, 0);

    productosTotal = productosSubtotal - productosDescuentoTotal;
    baseTotalVisual = productosTotal + (Number(obra.gastoObraManual) || 0);
  }

  // Calcular total de movimientos
  if (movimientos && Array.isArray(movimientos)) {
    totalMovimientos = movimientos.reduce(
      (acc, m) => acc + Number(m.monto || 0),
      0
    );
  }

  // Obtener descripción general
  const descripcionGeneral = obra?.descripcionGeneral || "";

  // Detectar y preparar impresión por bloques (si existen)
  const hayBloques =
    Array.isArray(obra?.bloques) &&
    obra.bloques.some(
      (b) => Array.isArray(b?.productos) && b.productos.length > 0
    );

  const bloquesSeccionHTML = hayBloques
    ? (() => {
        // Totales generales por bloques
        const totalesGenerales = obra.bloques.reduce(
          (acc, bloque) => {
            if (
              !Array.isArray(bloque?.productos) ||
              bloque.productos.length === 0
            )
              return acc;
            const subtotal = bloque.productos.reduce(
              (a, p) => a + Number(p.precio || 0),
              0
            );
            const descuentoTotal = bloque.productos.reduce(
              (a, p) =>
                a + Number(p.precio || 0) * (Number(p.descuento || 0) / 100),
              0
            );
            const total = Math.round(subtotal - descuentoTotal);
            return {
              subtotal: acc.subtotal + subtotal,
              descuentoTotal: acc.descuentoTotal + descuentoTotal,
              total: acc.total + total,
            };
          },
          { subtotal: 0, descuentoTotal: 0, total: 0 }
        );

        const bloquesHTML = obra.bloques
          .filter((b) => Array.isArray(b?.productos) && b.productos.length > 0)
          .map((bloque, idx) => {
            const subtotal = bloque.productos.reduce(
              (a, p) => a + Number(p.precio || 0),
              0
            );
            const descuentoTotal = bloque.productos.reduce(
              (a, p) =>
                a + Number(p.precio || 0) * (Number(p.descuento || 0) / 100),
              0
            );
            const total = Math.round(subtotal - descuentoTotal);

            const filas = bloque.productos
              .map((p) => {
                const unidad = String(p.unidadMedida || "UN").toUpperCase();
                const descuento = Number(p.descuento) || 0;
                const precio = Number(p.precio) || 0;
                const sub = Math.round(precio * (1 - descuento / 100));
                const altoNum = Number(p.alto) || 0;
                const largoNum = Number(p.largo) || 0;
                const cantNum = Number(p.cantidad) || 1;
                let medidaValor = null;
                if (unidad === "M2") {
                  medidaValor = altoNum * largoNum * cantNum;
                } else if (unidad === "ML") {
                  medidaValor = largoNum * cantNum;
                }
                return `
                  <tr>
                    <td>
                      <div><strong>${p.nombre || "-"}</strong></div>
                    </td>
                    <td style="text-align: center;">${
                      unidad === "M2" ? altoNum : "-"
                    }</td>
                    <td style="text-align: center;">${
                      unidad === "M2" || unidad === "ML" ? largoNum : "-"
                    }</td>
                    <td style="text-align: center;">${
                      medidaValor != null
                        ? medidaValor.toLocaleString("es-AR")
                        : "-"
                    }</td>
                    <td style="text-align: center;">${descuento}</td>
                    <td style="text-align: right; font-weight: bold;">${formatearNumeroArgentino(
                      sub
                    )}</td>
                    <td>${p.descripcion || "-"}</td>
                  </tr>
                `;
              })
              .join("");

            return `
              <div class="${idx > 0 ? 'page-break' : ''}">
                <div class="header">
                  <div class="header-content">
                    <div class="company-info">
                      <div class="logo">
                        <img src="/logo-maderera.png" alt="Logo Maderera">
                      </div>
                      <div class="company-details">
                        <h1>Maderas Caballero</h1>
                        <div class="subtitle">${
                          obra?.tipo === "presupuesto" ? "Presupuesto" : "Obra"
                        }</div>
                        <div class="website">www.caballeromaderas.com</div>
                      </div>
                    </div>
                    <div class="document-info">
                      <div class="date">Fecha: ${new Date().toLocaleDateString(
                        "es-AR"
                      )}</div>
                      <div class="number">N°: ${
                        obra?.numeroPedido || ""
                      } • Presupuesto ${idx + 1}</div>
                    </div>
                  </div>
                </div>

                <div class="section-info-general">
                  <div class="section-title">Información General</div>
                  <div class="info-grid">
                    <div class="info-card">
                      <div class="info-label">Cliente</div>
                      <div class="info-value">${
                        obra?.cliente?.nombre || "-"
                      }</div>
                    </div>
                    <div class="info-card">
                      <div class="info-label">Email</div>
                      <div class="info-value">${
                        obra?.cliente?.email || "No especificado"
                      }</div>
                    </div>
                    <div class="info-card">
                      <div class="info-label">Teléfono</div>
                      <div class="info-value">${
                        obra?.cliente?.telefono || "-"
                      }</div>
                    </div>
                    <div class="info-card">
                      <div class="info-label">Dirección</div>
                      <div class="info-value">${
                        obra?.cliente?.direccion || "-"
                      }</div>
                    </div>
                    <div class="info-card">
                      <div class="info-label">CUIT</div>
                      <div class="info-value">${
                        obra?.cliente?.cuit || "-"
                      }</div>
                    </div>
                    <div class="info-card">
                      <div class="info-label">Estado</div>
                      <div class="info-value">${
                        getEstadoLabel(obra?.estado) || "-"
                      }</div>
                    </div>
                  </div>
                </div>

                <div class="section">
                  <div class="section-title">Presupuesto ${idx + 1}</div>
                <div class="table-container">
                  <table class="table">
                    <thead>
                      <tr>
                        <th>Producto</th>
                        <th>Ancho</th>
                        <th>Largo</th>
                        <th>m²/ml</th>
                        <th>Desc. %</th>
                        <th>Subtotal</th>
                        <th>Descripción</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${filas}
                    </tbody>
                  </table>
                </div>
                <div class="totals-section">
                  <div class="totals-content">
                    <div class="description-field">
                      <div class="info-label" style="margin-bottom: 4px;">Descripción del Presupuesto</div>
                      <textarea readonly class="description-placeholder">${
                        bloque.descripcion || ""
                      }</textarea>
                    </div>
                    <div class="totals-right">
                      <div class="total-row">
                        <span class="total-label">Subtotal:</span>
                        <span class="total-value">${formatearNumeroArgentino(
                          subtotal
                        )}</span>
                      </div>
                      <div class="total-row">
                        <span class="total-label">Descuento total:</span>
                        <span class="total-value">${formatearNumeroArgentino(
                          descuentoTotal
                        )}</span>
                      </div>
                      <div class="total-row">
                        <span class="total-label">Total:</span>
                        <span class="total-value grand-total">${formatearNumeroArgentino(
                          total
                        )}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            `;
          })
          .join("");

        const totalesGeneralesHTML = ``;

        return `
          ${bloquesHTML}
        `;
      })()
    : "";

  let contenido = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${obra?.tipo === "presupuesto" ? "Presupuesto" : "Obra"} - ${
    obra?.numeroPedido || ""
  }</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
        
        * { box-sizing: border-box; }
        
        @media print {
          body { margin: 0; padding: 8px; font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; }
          .container { max-width: none; }
          .page-break { page-break-before: always; }
          .header { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .section-title { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          @page { margin: 1cm; }
        }
        
        /* Estilos para vista previa */
        body { 
          margin: 0; 
          padding: 6px; 
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; 
          background: #fafafa;
          color: #1f2937;
          line-height: 1.3;
          font-size: 11px;
        }
        
        .container {
          max-width: 700px;
          margin: 0 auto;
          background: white;
          border-radius: 6px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          overflow: hidden;
        }
        
        .header {
          background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
          color: #991b1b;
          padding: 20px;
          border-radius: 16px;
          box-shadow: 0 6px 20px rgba(0, 0, 0, 0.15);
        }
        
        .header-content {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        
        .company-info {
          display: flex;
          align-items: center;
          gap: 20px;
        }
        
        .logo {
          width: 70px;
          height: 70px;
          background: white;
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          border: 2px solid rgba(255, 255, 255, 0.1);
        }
        
        .logo img {
          width: 45px;
          height: 45px;
          object-fit: contain;
        }
        
        .company-details h1 {
          margin: 0 0 6px 0;
          font-size: 28px;
          font-weight: 800;
          color: white;
          text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
        }
        
        .company-details .subtitle {
          font-size: 13px;
          font-weight: 600;
          margin: 0 0 4px 0;
          opacity: 0.95;
          color: white;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        
        .company-details .website {
          font-size: 10px;
          font-weight: 500;
          margin: 0;
          opacity: 0.8;
          color: white;
        }
        
        .document-info {
             text-align: right;
            background: rgb(149 149 149 / 10%);
            border: 1px solid rgb(173 173 173 / 30%);
            padding: 16px;
            border-radius: 12px;
            backdrop-filter: blur(10px);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }
        
        .document-info .date {
          font-size: 10px;
          font-weight: 600;
          margin: 0 0 6px 0;
          opacity: 0.9;
          color: white;
        }
        
        .document-info .number {
          font-size: 16px;
          font-weight: 800;
          margin: 0;
          color: white;
        }
        
        .content {
          padding: 20px;
        }
        
        .section {
          margin-bottom: 20px;
        }
        
        .section-title {
          font-size: 14px;
          font-weight: 700;
          color: #1f2937;
          margin: 0 0 12px 0;
          padding-bottom: 8px;
          border-bottom: 2px solid #dc2626;
          text-transform: uppercase;
          letter-spacing: 0.1em;
        }
        
        .info-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
          margin-bottom: 16px;
        }
        
        .info-card {
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 12px;
          font-size: 11px;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.06);
        }
        
        .info-label {
          font-size: 9px;
          font-weight: 600;
          color: #6b7280;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin: 0 0 6px 0;
        }
        
        .info-value {
          font-size: 12px;
          font-weight: 600;
          color: #1f2937;
          margin: 0;
        }
        
        /* Nuevos estilos para las secciones principales */
        .section-info-general,
        .section-detalles-obra {
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 10px;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.06);
          margin-bottom: 20px;
          margin-top: 20px;
        }
        
        .section-info-general .section-title,
        .section-detalles-obra .section-title {
          color: #1f2937;
          border-bottom: 2px solid #dc2626;
          margin-bottom: 16px;
          padding-bottom: 12px;
          font-size: 14px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.1em;
        }
        
        .section-info-general .info-grid,
        .section-detalles-obra .info-grid {
          gap: 12px;
          margin-bottom: 0;
        }
        
        .section-info-general .info-card,
        .section-detalles-obra .info-card {
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
             padding: 5px 10px;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.06);
        }
        
        .section-info-general .info-label,
        .section-detalles-obra .info-label {
          color: #6b7280;
          font-size: 9px;
          margin-bottom: 8px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        
        .section-info-general .info-value,
        .section-detalles-obra .info-value {
          color: #1f2937;
          font-size: 12px;
          font-weight: 600;
        }
        
        .table-container {
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          overflow: hidden;
          margin-bottom: 16px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
        }
        
        .table {
          width: 100%;
          border-collapse: collapse;
          font-size: 11px;
        }
        
        .table th {
          background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
          color: white;
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          padding: 12px 8px;
          text-align: left;
          border: none;
          position: relative;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
        
        .table th:first-child {
          border-top-left-radius: 12px;
        }
        
        .table th:last-child {
          border-top-right-radius: 12px;
        }
        

        
        .table td {
          padding: 10px 8px;
          border-bottom: 1px solid #f1f5f9;
          font-size: 10px;
          color: #4b5563;
          background: white;
        }
        
        .table tr:last-child td {
          border-bottom: none;
        }
        
        .table tbody tr:nth-child(even) td {
          background: #fafbfc;
        }
        

        
        .totals-section {
          background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 16px;
          margin-top: 16px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
        }
        
        .totals-content {
          display: flex;
          gap: 20px;
          justify-content: space-between;
          align-items: flex-start;
        }
        
        .description-field {
          flex: 0 0 380px;
        }
        
        .description-field textarea {
          width: 100%;
          height: 120px;
          border: 1px solid #d1d5db;
          border-radius: 8px;
          padding: 12px;
          font-size: 11px;
          font-family: inherit;
          resize: none;
          background: white;
          box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.1);
        }
        
        .description-field textarea:focus {
          outline: none;
          border-color: #dc2626;
        }
        
        .totals-right {
          flex: 0 0 200px;
          background: white;
          padding: 16px;
          border-radius: 8px;
          border: 1px solid #e2e8f0;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }
        
        .total-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
          font-size: 11px;
          padding: 4px 0;
        }
        
        .total-row:last-child {
          margin-bottom: 0;
          padding-top: 12px;
          border-top: 2px solid #e2e8f0;
          font-weight: 700;
          font-size: 12px;
        }
        
        .total-label {
          font-weight: 600;
          color: #374151;
        }
        
        .total-value {
          font-weight: 700;
          color: #1f2937;
        }
        
        .grand-total {
          color: #059669;
          font-size: 13px;
        }
        
        .product-details {
          font-size: 9px;
          color: #6b7280;
          margin-top: 4px;
          font-style: italic;
          padding: 2px 6px;
          background: #f3f4f6;
          border-radius: 4px;
          display: inline-block;
        }
        
        .description-placeholder {
          color: #1a1a1a;
          font-style: italic;
        }
        
        /* Mejoras adicionales para las tablas */
        .table tbody tr:first-child td {
          border-top: 1px solid #e5e7eb;
        }
        
        .table tbody tr:last-child td {
          border-bottom: 1px solid #e5e7eb;
        }
        
        /* Estilos para totales destacados */
        .grand-total {
          background: linear-gradient(135deg, #dc2626 0%, #ef4444 100%);
          color: white;
          padding: 4px 8px;
          border-radius: 6px;
          font-weight: 800;
          text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
        }
      </style>
    </head>
    <body>
      <div class="container">
        <!-- Header -->
        ${
          hayBloques
            ? ''
            : `
        <div class="header">
          <div class="header-content">
            <div class="company-info">
              <div class="logo">
                <img src="/logo-maderera.png" alt="Logo Maderera">
              </div>
              <div class="company-details">
                <h1>Maderas Caballero</h1>
                <div class="subtitle">${obra?.tipo === "presupuesto" ? "Presupuesto" : "Obra"}</div>
                <div class="website">www.caballeromaderas.com</div>
              </div>
            </div>
            <div class="document-info">
              <div class="date">Fecha: ${new Date().toLocaleDateString("es-AR")}</div>
              <div class="number">N°: ${obra?.numeroPedido || ""}</div>
            </div>
          </div>
        </div>
            `
        }
        
        <!-- Contenido -->
        <div class="content">

        ${hayBloques ? '' : `
        <div class="section-info-general">
          <div class="section-title">Información General</div>
          <div class="info-grid">
            <div class="info-card">
              <div class="info-label">Cliente</div>
              <div class="info-value">${obra?.cliente?.nombre || "-"}</div>
            </div>
            <div class="info-card">
              <div class="info-label">Email</div>
              <div class="info-value">${
                obra?.cliente?.email || "No especificado"
              }</div>
            </div>
            <div class="info-card">
              <div class="info-label">Teléfono</div>
              <div class="info-value">${obra?.cliente?.telefono || "-"}</div>
            </div>
            <div class="info-card">
              <div class="info-label">Dirección</div>
              <div class="info-value">${obra?.cliente?.direccion || "-"}</div>
            </div>
            <div class="info-card">
              <div class="info-label">CUIT</div>
              <div class="info-value">${obra?.cliente?.cuit || "-"}</div>
            </div>
            <div class="info-card">
              <div class="info-label">Estado</div>
              <div class="info-value">${
                getEstadoLabel(obra?.estado) || "-"
              }</div>
            </div>
          </div>
        </div>`}

        ${
          hayBloques
            ? ''
            : (
`        ${
          obra?.tipo === "obra"
            ? `
        <div class="section-detalles-obra">
          <div class="section-title">Detalles de la Obra</div>
          <div class="info-grid">
            <div class="info-card">
              <div class="info-label">Nombre de la Obra</div>
              <div class="info-value">${obra?.nombreObra || "-"}</div>
            </div>
            <div class="info-card">
              <div class="info-label">Tipo de Obra</div>
              <div class="info-value">${obra?.tipoObra || "-"}</div>
            </div>
            <div class="info-card">
              <div class="info-label">Prioridad</div>
              <div class="info-value">${obra?.prioridad || "-"}</div>
            </div>
            <div class="info-card">
              <div class="info-label">Responsable</div>
              <div class="info-value">${obra?.responsable || "-"}</div>
            </div>
            <div class="info-card">
              <div class="info-label">Fecha de Inicio</div>
              <div class="info-value">${
                obra?.fechas?.inicio ? formatearFecha(obra.fechas.inicio) : "-"
              }</div>
            </div>
            <div class="info-card">
              <div class="info-label">Fecha de Fin</div>
              <div class="info-value">${
                obra?.fechas?.fin ? formatearFecha(obra.fechas.fin) : "-"
              }</div>
            </div>
            <div class="info-card">
              <div class="info-label">Dirección de la Obra</div>
              <div class="info-value">${obra?.ubicacion?.direccion || "-"}</div>
            </div>
            <div class="info-card">
              <div class="info-label">Localidad</div>
              <div class="info-value">${obra?.ubicacion?.localidad || "-"}</div>
            </div>
            <div class="info-card">
              <div class="info-label">Provincia</div>
              <div class="info-value">${obra?.ubicacion?.provincia || "-"}</div>
            </div>
            <div class="info-card">
              <div class="info-label">Barrio</div>
              <div class="info-value">${obra?.ubicacion?.barrio || "-"}</div>
            </div>
            <div class="info-card">
              <div class="info-label">Área</div>
              <div class="info-value">${obra?.ubicacion?.area || "-"}</div>
            </div>
            <div class="info-card">
              <div class="info-label">Lote</div>
              <div class="info-value">${obra?.ubicacion?.lote || "-"}</div>
            </div>
          </div>
        </div>
        `
            : ""
        }`)
        }

        ${hayBloques ? bloquesSeccionHTML : ""}

        ${
          obra?.tipo === "obra" &&
          obra?.materialesCatalogo &&
          obra.materialesCatalogo.length > 0
            ? `
        <div class="section">
          <div class="section-title">Materiales de la Obra</div>
          <div class="table-container">
            <table class="table">
              <thead>
                <tr>
                  <th>Producto</th>
                  <th>Alto</th>
                  <th>Largo</th>
                  <th>m²/ml</th>
                  <th>Desc. %</th>
                  <th>Subtotal</th>
                  <th>Descripción</th>
                </tr>
              </thead>
              <tbody>
                ${obra.materialesCatalogo
                  .map((p) => {
                    const unidad = String(p.unidad || "UN").toUpperCase();
                    const valor = Number(p.precio) || 0;
                    const descuento = Number(p.descuento) || 0;
                    const esMadera =
                      String(p.categoria || "").toLowerCase() === "maderas";
                    const isMachDeck =
                      esMadera &&
                      (p.subcategoria === "machimbre" ||
                        p.subcategoria === "deck");
                    const base = isMachDeck
                      ? valor
                      : valor * (Number(p.cantidad) || 0);
                    const sub = Math.round(base * (1 - descuento / 100));
                    const altoNum = Number(p.alto) || 0;
                    const largoNum = Number(p.largo) || 0;
                    const cantNum = Number(p.cantidad) || 1;
                    let medidaValor = null;
                    if (unidad === "M2") {
                      medidaValor = altoNum * largoNum * cantNum;
                    } else if (unidad === "ML") {
                      medidaValor = largoNum * cantNum;
                    }
                    return `
                    <tr>
                      <td>
                        <div class="product-name">${p.nombre}</div>
                      </td>
                      <td class="numeric-value">${esMadera ? altoNum : "-"}</td>
                      <td class="numeric-value">${
                        esMadera ? largoNum : "-"
                      }</td>
                      <td class="numeric-value">${
                        medidaValor != null
                          ? medidaValor.toLocaleString("es-AR")
                          : "-"
                      }</td>
                      <td class="discount-value">${descuento}%</td>
                      <td class="subtotal-value">${formatearNumeroArgentino(
                        sub
                      )}</td>
                      <td>${p.descripcion || "-"}</td>
                    </tr>
                  `;
                  })
                  .join("")}
              </tbody>
            </table>
          </div>
          
          <!-- Totales con campo de descripción -->
          <div class="totals-section">
            <div class="totals-content">
              <div class="totals-right">
                <div class="total-row">
                  <span class="total-label">Subtotal:</span>
                  <span class="total-value">${formatearNumeroArgentino(
                    productosSubtotal
                  )}</span>
                </div>
                <div class="total-row">
                  <span class="total-label">Descuento total:</span>
                  <span class="total-value">${formatearNumeroArgentino(
                    productosDescuentoTotal
                  )}</span>
                </div>
                <div class="total-row">
                  <span class="total-label">Total Materiales:</span>
                  <span class="total-value grand-total">${formatearNumeroArgentino(
                    productosTotal
                  )}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        `
            : ""
        }

        ${
          !hayBloques &&
          presupuesto &&
          presupuesto.productos &&
          presupuesto.productos.length > 0
            ? `
        <div class="section">
          <div class="section-title">Presupuesto Inicial</div>
          <div class="table-container">
            <table class="table">
              <thead>
                <tr>
                  <th>Producto</th>
                  <th>Ancho</th>
                  <th>Largo</th>
                  <th>m²/ml</th>
                  <th>Desc. %</th>
                  <th>Subtotal</th>
                  <th>Descripción</th>
                </tr>
              </thead>
              <tbody>
                ${presupuesto.productos
                  .map((p) => {
                    const unidad = String(p.unidadMedida || "UN").toUpperCase();
                    const valor = Number(p.valorVenta) || 0;
                    const descuento = Number(p.descuento) || 0;
                    const precio = Number(p.precio) || 0;
                    const sub = Math.round(precio * (1 - descuento / 100));
                    const altoNum = Number(p.alto) || 0;
                    const largoNum = Number(p.largo) || 0;
                    const cantNum = Number(p.cantidad) || 1;
                    let medidaValor = null;
                    if (unidad === "M2") {
                      medidaValor = altoNum * largoNum * cantNum;
                    } else if (unidad === "ML") {
                      medidaValor = largoNum * cantNum;
                    }
                    return `
                    <tr>
                      <td>
                        <div><strong>${p.nombre}</strong></div>
                      </td>
                      <td style="text-align: center;">${
                        unidad === "M2" ? altoNum : "-"
                      }</td>
                      <td style="text-align: center;">${
                        unidad === "M2" || unidad === "ML" ? largoNum : "-"
                      }</td>
                      <td style="text-align: center;">${
                        medidaValor != null
                          ? medidaValor.toLocaleString("es-AR")
                          : "-"
                      }</td>
                      <td style="text-align: center;">${descuento}</td>
                      <td style="text-align: right; font-weight: bold;">${formatearNumeroArgentino(
                        sub
                      )}</td>
                      <td>${p.descripcion || "-"}</td>
                    </tr>
                  `;
                  })
                  .join("")}
              </tbody>
            </table>
          </div>
          
          <div class="totals-section">
            <div class="totals-content">
              <div class="totals-right">
                <div class="total-row">
                  <span class="total-label">Subtotal:</span>
                  <span class="total-value">${formatearNumeroArgentino(
                    presupuesto.subtotal || 0
                  )}</span>
                </div>
                <div class="total-row">
                  <span class="total-label">Descuento total:</span>
                  <span class="total-value">${formatearNumeroArgentino(
                    presupuesto.descuentoTotal || 0
                  )}</span>
                </div>
                <div class="total-row">
                  <span class="total-label">Total:</span>
                  <span class="total-value grand-total">${formatearNumeroArgentino(
                    presupuesto.total || 0
                  )}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        `
            : ""
        }

        ${
          !hayBloques &&
          obra?.tipo === "presupuesto" &&
          obra?.productos &&
          obra.productos.length > 0
            ? `
        <div class="section">
          <div class="section-title">Productos del Presupuesto</div>
          <div class="table-container">
            <table class="table">
              <thead>
                <tr>
                  <th>Producto</th>
                  <th>Ancho</th>
                  <th>Largo</th>
                  <th>m²/ml</th>
                  <th>Desc. %</th>
                  <th>Subtotal</th>
                  <th>Descripción</th>
                </tr>
              </thead>
              <tbody>
                ${obra.productos
                  .map((p) => {
                    const unidad = String(p.unidadMedida || "UN").toUpperCase();
                    const valor = Number(p.valorVenta) || 0;
                    const descuento = Number(p.descuento) || 0;
                    const precio = Number(p.precio) || 0;
                    const sub = Math.round(precio * (1 - descuento / 100));
                    const altoNum = Number(p.alto) || 0;
                    const largoNum = Number(p.largo) || 0;
                    const cantNum = Number(p.cantidad) || 1;
                    let medidaValor = null;
                    if (unidad === "M2") {
                      medidaValor = altoNum * largoNum * cantNum;
                    } else if (unidad === "ML") {
                      medidaValor = largoNum * cantNum;
                    }
                    return `
                    <tr>
                      <td>
                        <div><strong>${p.nombre}</strong></div>
                      </td>
                      <td style="text-align: center;">${
                        unidad === "M2" ? altoNum : "-"
                      }</td>
                      <td style="text-align: center;">${
                        unidad === "M2" || unidad === "ML" ? largoNum : "-"
                      }</td>
                      <td style="text-align: center;">${
                        medidaValor != null
                          ? medidaValor.toLocaleString("es-AR")
                          : "-"
                      }</td>
                      <td style="text-align: center;">${descuento}</td>
                      <td style="text-align: right; font-weight: bold;">${formatearNumeroArgentino(
                        sub
                      )}</td>
                      <td>${p.descripcion || "-"}</td>
                    </tr>
                  `;
                  })
                  .join("")}
              </tbody>
            </table>
          </div>
          
          <div class="totals-section">
            <div class="totals-content">
              <div class="totals-right">
                <div class="total-row">
                  <span class="total-label">Subtotal:</span>
                  <span class="total-value">${formatearNumeroArgentino(
                    obra.subtotal || 0
                  )}</span>
                </div>
                <div class="total-row">
                  <span class="total-label">Descuento total:</span>
                  <span class="total-value">${formatearNumeroArgentino(
                    obra.descuentoTotal || 0
                  )}</span>
                </div>
                <div class="total-row">
                  <span class="total-label">Total:</span>
                  <span class="total-value grand-total">${formatearNumeroArgentino(
                    obra.total || 0
                  )}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        `
            : ""
        }

        ${
          obra?.tipo === "obra" && movimientos && movimientos.length > 0
            ? `
        <div class="section">
          <div class="section-title">Movimientos de Cobranza</div>
          <div class="table-container">
            <table class="table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Tipo</th>
                  <th>Método</th>
                  <th>Monto</th>
                  <th>Nota</th>
                </tr>
              </thead>
              <tbody>
                ${movimientos
                  .map(
                    (m) => `
                  <tr>
                    <td>${m.fecha || "-"}</td>
                    <td style="text-transform: capitalize;">${m.tipo}</td>
                    <td style="text-transform: capitalize;">${m.metodo}</td>
                    <td style="text-align: right;">${formatearNumeroArgentino(
                      Number(m.monto || 0)
                    )}</td>
                    <td>${m.nota || "-"}</td>
                  </tr>
                `
                  )
                  .join("")}
              </tbody>
            </table>
          </div>
        </div>
        `
            : ""
        }

        ${
          obra?.tipoEnvio && obra.tipoEnvio !== "retiro_local"
            ? `
        <div class="section">
          <div class="section-title">Información de Envío</div>
          <div class="info-grid">
            <div class="info-card">
              <div class="info-label">Tipo de Envío</div>
              <div class="info-value">${obra.tipoEnvio}</div>
            </div>
            ${
              obra.direccionEnvio
                ? `
            <div class="info-card">
              <div class="info-label">Dirección de Envío</div>
              <div class="info-value">${obra.direccionEnvio}</div>
            </div>
            `
                : ""
            }
            ${
              obra.localidadEnvio
                ? `
            <div class="info-card">
              <div class="info-label">Localidad</div>
              <div class="info-value">${obra.localidadEnvio}</div>
            </div>
            `
                : ""
            }
            ${
              obra.transportista
                ? `
            <div class="info-card">
              <div class="info-label">Transportista</div>
              <div class="info-value">${obra.transportista}</div>
            </div>
            `
                : ""
            }
            ${
              obra.fechaEntrega
                ? `
            <div class="info-card">
              <div class="info-label">Fecha de Entrega</div>
              <div class="info-value">${formatearFecha(obra.fechaEntrega)}</div>
            </div>
            `
                : ""
            }
            ${
              obra.rangoHorario
                ? `
            <div class="info-card">
              <div class="info-label">Rango Horario</div>
              <div class="info-value">${obra.rangoHorario}</div>
            </div>
            `
                : ""
            }
          </div>
        </div>
        `
            : ""
        }

      </div>
      </body>
      </html>
  `;

  return contenido;
};

export const descargarPDF = async (
  obra,
  presupuesto,
  modoCosto,
  movimientos = []
) => {
  try {
    // Generar el contenido HTML
    const contenidoHTML = generarContenidoImpresion(
      obra,
      presupuesto,
      modoCosto,
      movimientos
    );

    // Crear un elemento temporal para el contenido
    const elemento = document.createElement("div");
    elemento.innerHTML = contenidoHTML;
    elemento.style.position = "absolute";
    elemento.style.left = "-9999px";
    elemento.style.top = "0";
    document.body.appendChild(elemento);

    // Configuración para html2pdf
    const opt = {
      margin: [10, 10, 10, 10],
      filename: `${obra?.tipo === "presupuesto" ? "Presupuesto" : "Obra"}_${
        obra?.numeroPedido || "sin_numero"
      }.pdf`,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: {
        scale: 2,
        useCORS: true,
        allowTaint: true,
      },
      jsPDF: {
        unit: "mm",
        format: "a4",
        orientation: "portrait",
      },
    };

    // Importar html2pdf dinámicamente
    const html2pdf = (await import("html2pdf.js")).default;

    // Generar y descargar el PDF
    await html2pdf().set(opt).from(elemento).save();

    // Limpiar el elemento temporal
    document.body.removeChild(elemento);
  } catch (error) {
    console.error("Error al generar PDF:", error);
    // Fallback: abrir en nueva ventana para imprimir
    const contenidoHTML = generarContenidoImpresion(
      obra,
      presupuesto,
      modoCosto,
      movimientos
    );
    const nuevaVentana = window.open("", "_blank");
    nuevaVentana.document.write(contenidoHTML);
    nuevaVentana.document.close();
  }
};

// Función alternativa más robusta para descargar PDF
export const descargarPDFRobusto = async (
  obra,
  presupuesto,
  modoCosto,
  movimientos = []
) => {
  try {
    // Generar el contenido HTML
    const contenidoHTML = generarContenidoImpresion(
      obra,
      presupuesto,
      modoCosto,
      movimientos
    );

    // Crear una nueva ventana oculta para renderizar el contenido
    const ventanaOculta = window.open(
      "",
      "_blank",
      "width=800,height=600,scrollbars=yes,resizable=yes"
    );

    // Escribir el contenido en la ventana
    ventanaOculta.document.write(contenidoHTML);
    ventanaOculta.document.close();

    // Esperar a que se cargue completamente
    await new Promise((resolve) => {
      ventanaOculta.onload = resolve;
      if (ventanaOculta.document.readyState === "complete") {
        resolve();
      }
    });

    // Esperar un poco más para asegurar que los estilos se apliquen
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Configuración optimizada para html2pdf
    const opt = {
      margin: [8, 8, 8, 8],
      filename: `${obra?.tipo === "presupuesto" ? "Presupuesto" : "Obra"}_${
        obra?.numeroPedido || "sin_numero"
      }.pdf`,
      image: { type: "jpeg", quality: 0.95 },
      html2canvas: {
        scale: 1.5,
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff",
        letterRendering: true,
        foreignObjectRendering: true,
      },
      jsPDF: {
        unit: "mm",
        format: "a4",
        orientation: "portrait",
        compress: true,
        precision: 16,
      },
    };

    // Importar html2pdf dinámicamente
    const html2pdf = (await import("html2pdf.js")).default;

    // Generar PDF desde la ventana oculta
    await html2pdf().set(opt).from(ventanaOculta.document.body).save();

    // Cerrar la ventana oculta
    ventanaOculta.close();
  } catch (error) {
    console.error("Error al generar PDF robusto:", error);

    // Fallback: usar la función original
    try {
      await descargarPDF(obra, presupuesto, modoCosto, movimientos);
    } catch (fallbackError) {
      console.error("Error en fallback:", fallbackError);

      // Último recurso: abrir en nueva ventana
      const contenidoHTML = generarContenidoImpresion(
        obra,
        presupuesto,
        modoCosto,
        movimientos
      );
      const nuevaVentana = window.open("", "_blank");
      nuevaVentana.document.write(contenidoHTML);
      nuevaVentana.document.close();

      alert(
        "Error al generar el PDF. Se abrió una nueva ventana para que pueda imprimir manualmente."
      );
    }
  }
};

// Función que usa el iframe del modal para generar el PDF (más confiable)
export const descargarPDFDesdeIframe = async (
  obra,
  presupuesto,
  modoCosto,
  movimientos = []
) => {
  try {
    // Buscar el iframe del modal de vista previa
    const iframe = document.querySelector(
      'iframe[title="Vista previa de impresión"]'
    );

    if (iframe && iframe.contentDocument && iframe.contentDocument.body) {
      // Usar el contenido del iframe que ya está renderizado
      const contenidoRenderizado = iframe.contentDocument.body;

      // Configuración optimizada para html2pdf
      const opt = {
        margin: [8, 8, 8, 8],
        filename: `${obra?.tipo === "presupuesto" ? "Presupuesto" : "Obra"}_${
          obra?.numeroPedido || "sin_numero"
        }.pdf`,
        image: { type: "jpeg", quality: 0.95 },
        html2canvas: {
          scale: 1.5,
          useCORS: true,
          allowTaint: true,
          backgroundColor: "#ffffff",
          letterRendering: true,
          foreignObjectRendering: true,
          width: 800, // Ancho fijo para mejor renderizado
          height: contenidoRenderizado.scrollHeight,
        },
        jsPDF: {
          unit: "mm",
          format: "a4",
          orientation: "portrait",
          compress: true,
          precision: 16,
        },
      };

      // Importar html2pdf dinámicamente
      const html2pdf = (await import("html2pdf.js")).default;

      // Generar PDF desde el contenido del iframe
      await html2pdf().set(opt).from(contenidoRenderizado).save();
    } else {
      // Si no hay iframe, usar la función robusta
      await descargarPDFRobusto(obra, presupuesto, modoCosto, movimientos);
    }
  } catch (error) {
    console.error("Error al generar PDF desde iframe:", error);

    // Fallback: usar la función robusta
    try {
      await descargarPDFRobusto(obra, presupuesto, modoCosto, movimientos);
    } catch (fallbackError) {
      console.error("Error en fallback:", fallbackError);

      // Último recurso: abrir en nueva ventana
      const contenidoHTML = generarContenidoImpresion(
        obra,
        presupuesto,
        modoCosto,
        movimientos
      );
      const nuevaVentana = window.open("", "_blank");
      nuevaVentana.document.write(contenidoHTML);
      nuevaVentana.document.close();

      alert(
        "Error al generar el PDF. Se abrió una nueva ventana para que pueda imprimir manualmente."
      );
    }
  }
};
