import { NextResponse } from "next/server";

function parseAllowedOrigins() {
  const env = process.env.ALLOWED_ORIGINS || "";
  const list = env
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  // Fallbacks razonables para dev si no hay env
  if (list.length === 0) {
    list.push("http://localhost:3000");
    list.push("https://maderascaballero.vercel.app");
    list.push("https://caballeromaderas-ecommerce.vercel.app");
  }
  return list;
}

const ALLOWED = parseAllowedOrigins();

export function buildCorsHeadersApi(request, headersBase = new Headers()) {
  const origin = request?.headers?.get?.("origin") || "";
  const isAllowed = ALLOWED.includes(origin);
  const headers = new Headers(headersBase);
  headers.set("Vary", "Origin");
  if (isAllowed) headers.set("Access-Control-Allow-Origin", origin);
  headers.set("Access-Control-Allow-Methods", "GET,POST,PATCH,DELETE,OPTIONS");
  headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  return headers;
}

export function withCorsApi(resp, request) {
  const headers = buildCorsHeadersApi(request, resp.headers);
  return new NextResponse(resp.body, { status: resp.status, headers });
}

export function preflightApi(request) {
  const headers = buildCorsHeadersApi(request);
  return new NextResponse(null, { status: 204, headers });
}

export function jsonOk(dato, { mensaje = null, status = 200 } = {}, request) {
  const payload = { ok: true, dato, mensaje, error: null };
  return withCorsApi(NextResponse.json(payload, { status }), request);
}

export function jsonError(error, { mensaje = null, status = 500 } = {}, request) {
  const payload = { ok: false, dato: null, mensaje, error };
  return withCorsApi(NextResponse.json(payload, { status }), request);
}


