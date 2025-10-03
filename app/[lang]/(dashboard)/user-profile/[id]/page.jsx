"use client";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { User, Mail, Phone, TrendingUp, Users, ListChecks, UserCheck, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useLeads } from "@/hooks/useLeads";
import { useVendedores } from "@/hooks/useVendedores";

export default function VendedorProfilePage() {
  const { id } = useParams();
  const { vendedores } = useVendedores();
  const { leads, loading: loadingLeads } = useLeads();
  const vendedor = vendedores.find(v => v.id === id);
  const leadsAsignados = leads.filter(l => l.vendedor === id);

  if (!vendedor) return <div className="p-8 text-center text-destructive">Vendedor no encontrado</div>;

  return (
    <div className="max-w-4xl mx-auto py-8 space-y-8">
      {/* Header profesional */}
      <Card className="overflow-visible">
        <CardHeader className="flex-row items-center gap-6 pb-4">
          <div className="flex items-center gap-4 flex-1 min-w-0">
            <Avatar className="h-20 w-20 text-3xl">
              <AvatarImage src={vendedor.avatar || undefined} alt={vendedor.nombre} />
              <AvatarFallback>{vendedor.nombre?.[0] || <User />}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col gap-1 min-w-0">
              <h1 className="text-2xl font-bold truncate">{vendedor.nombre}</h1>
              <div className="flex gap-2 flex-wrap mt-1">
                <Badge color="info" variant="soft">Vendedor</Badge>
              </div>
              <div className="flex gap-2 mt-2 text-muted-foreground text-sm flex-wrap">
                {vendedor.email && <span className="flex items-center gap-1"><Mail className="w-4 h-4" /> {vendedor.email}</span>}
                {vendedor.telefono && <span className="flex items-center gap-1"><Phone className="w-4 h-4" /> {vendedor.telefono}</span>}
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Button size="sm" color="primary" variant="outline" className="w-full flex items-center gap-2"><UserCheck className="w-4 h-4" /> Contactar</Button>
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-0">
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-base">
              <TrendingUp className="w-5 h-5 text-primary" />
              <span>Leads asignados: <b>{leadsAsignados.length}</b></span>
            </div>
            {/* Aquí puedes agregar más estadísticas */}
          </div>
        </CardContent>
      </Card>

      {/* Lista de leads asignados */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-semibold flex items-center gap-2"><ListChecks className="w-5 h-5 text-primary" /> Leads asignados</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingLeads ? (
            <div className="p-4 text-center text-muted-foreground">Cargando leads...</div>
          ) : leadsAsignados.length > 0 ? (
            <ul className="divide-y divide-border">
              {leadsAsignados.map((lead) => (
                <li key={lead.id} className="py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div className="flex flex-col">
                    <span className="font-semibold text-foreground">{lead.nombre}</span>
                    <span className="text-xs text-muted-foreground">{lead.email}</span>
                  </div>
                  <div className="flex gap-2 items-center">
                    <Badge color="info" variant="soft" className="capitalize">{lead.estado}</Badge>
                    <Badge color="warning" variant="soft" className="capitalize">{lead.prioridad}</Badge>
                    <Link href={`/leads/${lead.id}`} className="text-primary underline text-sm">Ver detalle</Link>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="p-4 text-center text-muted-foreground">No tiene leads asignados actualmente.</div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-between items-center mt-6">
        <Link href="/leads" className="text-primary underline flex items-center gap-1"><ArrowLeft className="w-4 h-4" /> Volver a leads</Link>
        {/* Aquí puedes agregar más acciones rápidas si lo deseas */}
      </div>
    </div>
  );
} 