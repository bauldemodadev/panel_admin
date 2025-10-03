import { NextResponse } from "next/server";

const ORIGENES_PERMITIDOS = [
  "http://localhost:3000",
  "https://maderascaballero.vercel.app",
  "https://caballeromaderas-ecommerce.vercel.app",
];

function construirHeadersCors(request, headersBase = new Headers()) {
  const origen = request?.headers?.get?.("origin") || "";
  const esPermitido = ORIGENES_PERMITIDOS.includes(origen);
  const headers = new Headers(headersBase);
  headers.set("Vary", "Origin");
  if (esPermitido) headers.set("Access-Control-Allow-Origin", origen);
  headers.set("Access-Control-Allow-Methods", "GET,OPTIONS");
  headers.set("Access-Control-Allow-Headers", "Content-Type");
  headers.set("Content-Type", "application/json");
  return headers;
}

export function aplicarCorsPublico(respuesta, request) {
  const headers = construirHeadersCors(request, respuesta.headers);
  return new NextResponse(respuesta.body, { status: respuesta.status, headers });
}

export function preflightCorsPublico(request) {
  const headers = construirHeadersCors(request);
  return new NextResponse(null, { status: 200, headers });
}

export function jsonPublico(data, init = {}, request) {
  const resp = NextResponse.json(data, init);
  return aplicarCorsPublico(resp, request);
}


