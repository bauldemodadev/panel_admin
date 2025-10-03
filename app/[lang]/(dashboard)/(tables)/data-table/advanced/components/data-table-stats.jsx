"use client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Users, 
  Clock, 
  CheckCircle, 
  AlertTriangle, 
  TrendingUp,
  Target,
  Calendar,
  Building
} from "lucide-react";
import { cn } from "@/lib/utils";

export function DataTableStats({ data, filteredData }) {
  const totalLeads = data.length;
  const filteredLeads = filteredData.length;
  
  // Calcular estadísticas
  const stats = {
    nuevos: data.filter(lead => lead.estado === "nuevo").length,
    enSeguimiento: data.filter(lead => lead.estado === "en seguimiento").length,
    contactados: data.filter(lead => lead.estado === "contactado").length,
    altaPrioridad: data.filter(lead => lead.prioridad === "alta").length,
    mediaPrioridad: data.filter(lead => lead.prioridad === "media").length,
    bajaPrioridad: data.filter(lead => lead.prioridad === "baja").length,
  };

  const proyectos = [...new Set(data.map(lead => lead.proyecto))];
  const proyectosStats = proyectos.map(proyecto => ({
    nombre: proyecto,
    count: data.filter(lead => lead.proyecto === proyecto).length
  }));

  return (
    <div className="space-y-4">
      {/* Estadísticas principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-0 bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-950/50 dark:to-blue-900/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600 dark:text-blue-400">Total Leads</p>
                <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">{totalLeads}</p>
                {filteredLeads !== totalLeads && (
                  <p className="text-xs text-blue-700 dark:text-blue-300">
                    {filteredLeads} filtrados
                  </p>
                )}
              </div>
              <Users className="h-8 w-8 text-blue-600 dark:text-blue-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 bg-gradient-to-r from-yellow-50 to-yellow-100 dark:from-yellow-950/50 dark:to-yellow-900/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-yellow-600 dark:text-yellow-400">En Seguimiento</p>
                <p className="text-2xl font-bold text-yellow-900 dark:text-yellow-100">{stats.enSeguimiento}</p>
                <p className="text-xs text-yellow-700 dark:text-yellow-300">
                  {((stats.enSeguimiento / totalLeads) * 100).toFixed(1)}% del total
                </p>
              </div>
              <Clock className="h-8 w-8 text-yellow-600 dark:text-yellow-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 bg-gradient-to-r from-green-50 to-green-100 dark:from-green-950/50 dark:to-green-900/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-600 dark:text-green-400">Contactados</p>
                <p className="text-2xl font-bold text-green-900 dark:text-green-100">{stats.contactados}</p>
                <p className="text-xs text-green-700 dark:text-green-300">
                  {((stats.contactados / totalLeads) * 100).toFixed(1)}% del total
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 bg-gradient-to-r from-red-50 to-red-100 dark:from-red-950/50 dark:to-red-900/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-red-600 dark:text-red-400">Alta Prioridad</p>
                <p className="text-2xl font-bold text-red-900 dark:text-red-100">{stats.altaPrioridad}</p>
                <p className="text-xs text-red-700 dark:text-red-300">
                  Requieren atención inmediata
                </p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-600 dark:text-red-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Estadísticas por proyecto */}
      <Card className="border border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Building className="h-5 w-5 text-primary" />
            Leads por Proyecto
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {proyectosStats.map((proyecto, idx) => (
              <div key={proyecto.nombre || idx} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Target className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium text-foreground">{proyecto.nombre}</p>
                    <p className="text-sm text-muted-foreground">{proyecto.count} leads</p>
                  </div>
                </div>
                <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
                  {((proyecto.count / totalLeads) * 100).toFixed(1)}%
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 