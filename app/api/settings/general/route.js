import { NextResponse } from "next/server";
import { aplicarCorsPublico, preflightCorsPublico, jsonPublico } from "@/lib/cors-publico";
import { obtenerSettingsGeneral } from "@/lib/settings";

export function OPTIONS(request) {
  return preflightCorsPublico(request);
}

export async function GET(request) {
  const { locations } = await obtenerSettingsGeneral();
  return jsonPublico({ locations }, {}, request);
}


