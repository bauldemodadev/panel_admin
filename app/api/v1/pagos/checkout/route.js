import { NextResponse } from "next/server";

function withCors(resp) {
  const headers = new Headers(resp.headers);
  headers.set("Access-Control-Allow-Origin", "*");
  headers.set("Access-Control-Allow-Methods", "POST,OPTIONS" );
  headers.set("Access-Control-Allow-Headers", "Content-Type" );
  return new NextResponse(resp.body, { status: resp.status, headers });
}

export function OPTIONS() {
  return withCors(new NextResponse(null, { status: 204 }));
}

// Placeholder para integrar gateway (Mercado Pago u otro)
export async function POST(request) {
  try {
    const body = await request.json();
    // Aquí crearías la preferencia/sesión de pago con el proveedor y devolverías la URL o id
    return withCors(NextResponse.json({ checkoutId: "demo", checkoutUrl: "https://example.com/pagar/demo" }));
  } catch (err) {
    return withCors(NextResponse.json({ error: err.message }, { status: 500 }));
  }
}


