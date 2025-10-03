"use client";
import React from "react";
import { Input } from "@/components/ui/input";

export function DataTableToolbar({ table }) {
  const [globalFilter, setGlobalFilter] = React.useState("");

  React.useEffect(() => {
    table.setGlobalFilter(globalFilter);
  }, [globalFilter, table]);

  return (
    <div className="flex justify-center w-full py-2">
      <Input
        placeholder="Buscar en todos los campos..."
        value={globalFilter}
        onChange={e => setGlobalFilter(e.target.value)}
        className="w-full max-w-lg text-base px-4 py-2 rounded border border-gray-300 dark:border-gray-600 focus:border-primary focus:ring-2 focus:ring-primary/30 transition"
      />
    </div>
  );
}
