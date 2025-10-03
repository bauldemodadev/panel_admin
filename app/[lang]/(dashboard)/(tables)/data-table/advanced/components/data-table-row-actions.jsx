"use client";

import { MoreHorizontal, Edit, Copy, Star, Trash2, Phone, Mail, MessageSquare, UserCheck } from "lucide-react";
import { Row } from "@tanstack/react-table";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function DataTableRowActions({ row }) {
  const lead = row.original;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="flex h-8 w-8 p-0 data-[state=open]:bg-accent text-foreground"
        >
          <MoreHorizontal className="h-4 w-4" />
          <span className="sr-only">Abrir menú</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[200px] bg-background border-border">
        <DropdownMenuItem className="text-foreground hover:bg-accent">
          <Edit className="mr-2 h-4 w-4" />
          Editar Lead
        </DropdownMenuItem>
        <DropdownMenuItem className="text-foreground hover:bg-accent">
          <Copy className="mr-2 h-4 w-4" />
          Duplicar Lead
        </DropdownMenuItem>
        <DropdownMenuItem className="text-foreground hover:bg-accent">
          <Star className="mr-2 h-4 w-4" />
          Marcar como Favorito
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="text-foreground hover:bg-accent">
          <Phone className="mr-2 h-4 w-4" />
          Llamar
        </DropdownMenuItem>
        <DropdownMenuItem className="text-foreground hover:bg-accent">
          <Mail className="mr-2 h-4 w-4" />
          Enviar Email
        </DropdownMenuItem>
        <DropdownMenuItem className="text-foreground hover:bg-accent">
          <MessageSquare className="mr-2 h-4 w-4" />
          Enviar WhatsApp
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuSub>
          <DropdownMenuSubTrigger className="text-foreground hover:bg-accent">
            <UserCheck className="mr-2 h-4 w-4" />
            Cambiar Estado
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="bg-background border-border">
            <DropdownMenuRadioGroup value={lead.estado}>
              <DropdownMenuRadioItem value="nuevo" className="text-foreground hover:bg-accent">
                Nuevo
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="en seguimiento" className="text-foreground hover:bg-accent">
                En Seguimiento
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="contactado" className="text-foreground hover:bg-accent">
                Contactado
              </DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="text-destructive hover:bg-destructive/10 focus:text-destructive">
          <Trash2 className="mr-2 h-4 w-4" />
          Eliminar
          <DropdownMenuShortcut>⌘⌫</DropdownMenuShortcut>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
