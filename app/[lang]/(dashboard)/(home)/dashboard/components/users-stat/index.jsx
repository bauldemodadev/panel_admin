"use client"
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Icon } from "@iconify/react";
import UsersDataChart from "./users-data-chart";
import UsersDataTable from "./users-data-table";
import { useLeads } from "@/hooks/useLeads";

const UsersStat = () => {
  const { leads, loading } = useLeads();
  // Calcular leads de los últimos 30 minutos
  const now = new Date();
  const recentLeads = leads.filter(l => {
    const fecha = l.createdAt || l.fecha;
    if (!fecha) return false;
    const leadDate = new Date(fecha);
    return (now - leadDate) / (1000 * 60) <= 30;
  });
  // Agrupar por país si existe el campo
  const leadsByCountry = {};
  recentLeads.forEach(l => {
    const country = l.country || l.pais || "Desconocido";
    if (!leadsByCountry[country]) leadsByCountry[country] = 0;
    leadsByCountry[country]++;
  });
  const users = Object.entries(leadsByCountry).map(([country, count], i) => ({
    id: i + 1,
    country,
    count: count.toString().padStart(2, "0"),
  }));
  return (
    <Card>
      <CardHeader className="border-none pb-0 mb-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-1">
          <div className="flex-1 min-w-0">
            <div className="text-xl font-semibold text-default-900"> Usuarios </div>
            <span className="text-xs text-default-600 ml-1 block">En los últimos 30 minutos</span>
          </div>
          <div className="flex-none flex items-center gap-1 mt-2 sm:mt-0">
            <span className="text-3xl sm:text-4xl font-semibold text-primary">{loading ? "..." : recentLeads.length}</span>
            <span className="text-2xl text-success">
              <Icon icon="heroicons:arrow-trending-up-16-solid" />
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-2 sm:px-5 pb-0">
        <p className="text-xs font-medium text-default-800 mb-2">Usuarios por minuto</p>
        <UsersDataChart />
        {/* Tabla de leads recientes por país */}
        {/* <UsersDataTable users={users} /> */}
        {!loading && users.length > 0 && (
          <ul className="mt-2 text-xs text-default-700 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1">
            {users.map(u => (
              <li key={u.country} className="flex justify-between border-b border-muted-foreground/10 py-1">
                <span className="truncate max-w-[120px]">{u.country}</span>
                <span className="font-semibold">{u.count}</span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
};

export default UsersStat;