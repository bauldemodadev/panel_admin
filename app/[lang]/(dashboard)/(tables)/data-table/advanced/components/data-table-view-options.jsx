"use client";

import { DropdownMenuTrigger } from "@radix-ui/react-dropdown-menu";
import { SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

export function DataTableViewOptions({ table }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="ltr:ml-2 rtl:mr-2 h-8 border-border hover:bg-accent text-foreground"
        >
          <SlidersHorizontal className="ltr:mr-2 rtl:ml-2 h-4 w-4" />
          Columnas
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[180px] bg-background border-border">
        <DropdownMenuLabel className="text-foreground font-medium">Mostrar/Ocultar columnas</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {table
          .getAllColumns()
          .filter(
            (column) =>
              typeof column.accessorFn !== "undefined" && column.getCanHide()
          )
          .map((column) => {
            return (
              <DropdownMenuCheckboxItem
                key={column.id}
                className="capitalize text-foreground hover:bg-accent"
                checked={column.getIsVisible()}
                onCheckedChange={(value) => column.toggleVisibility(!!value)}
              >
                {column.id === "nombre" && "Nombre"}
                {column.id === "email" && "Email"}
                {column.id === "telefono" && "Teléfono"}
                {column.id === "mensaje" && "Mensaje"}
                {column.id === "estado" && "Estado"}
                {column.id === "prioridad" && "Prioridad"}
                {column.id === "proyecto" && "Proyecto"}
                {column.id === "fecha" && "Fecha"}
                {column.id === "origen" && "Origen"}
                {!["nombre", "email", "telefono", "mensaje", "estado", "prioridad", "proyecto", "fecha", "origen"].includes(column.id) && column.id}
              </DropdownMenuCheckboxItem>
            );
          })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
