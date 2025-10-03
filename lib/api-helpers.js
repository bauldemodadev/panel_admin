import { NextResponse } from "next/server";

const ALLOWED_ORIGINS = [
  process.env.FRONTEND_ORIGIN_DEV,
  process.env.FRONTEND_ORIGIN_PROD,
].filter(Boolean);

export function withCors(resp, request) {
  const origin = request?.headers?.get?.("origin") || "";
  const allowAll = ALLOWED_ORIGINS.length === 0;
  const isAllowed = allowAll || ALLOWED_ORIGINS.includes(origin);
  const headers = new Headers(resp.headers);
  headers.set("Vary", "Origin");
  headers.set("Access-Control-Allow-Origin", isAllowed ? origin : "*");
  headers.set("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  headers.set("Content-Type", "application/json");
  return new NextResponse(resp.body, { status: resp.status, headers });
}

export function corsPreflight(request) {
  return withCors(new NextResponse(null, { status: 204 }), request);
}

export function json(data, init = {}, request) {
  return withCors(NextResponse.json(data, init), request);
}

export function errorJson(message, status, request, extra = {}) {
  return json({ error: message, ...extra }, { status }, request);
}

export function parseJsonSafe(bodyStr) {
  try { return JSON.parse(bodyStr || "{}"); } catch { return {}; }
}

export function requirePathParam(params, key) {
  const value = params?.[key];
  if (!value) {
    const err = new Error(`Missing path param: ${key}`);
    err.status = 400;
    throw err;
  }
  return value;
}


