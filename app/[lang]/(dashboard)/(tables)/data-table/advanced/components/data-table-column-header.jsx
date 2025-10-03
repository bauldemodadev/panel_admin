import {
  ChevronDown,
  ChevronUp,
  XCircle,
  Eye,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function DataTableColumnHeader({ column, title, className }) {
  if (!column.getCanSort()) {
    return <div className={cn("text-foreground font-medium", className)}>{title}</div>;
  }

  return (
    <div className={cn("flex items-center space-x-2", className)}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="-ml-3 h-8 data-[state=open]:bg-accent text-foreground hover:bg-accent"
          >
            <span className="font-medium">{title}</span>
            {column.getIsSorted() === "desc" ? (
              <ChevronDown className="ltr:ml-2 rtl:mr-2 h-4 w-4 text-muted-foreground" />
            ) : column.getIsSorted() === "asc" ? (
              <ChevronUp className="ltr:ml-2 rtl:mr-2 h-4 w-4 text-muted-foreground" />
            ) : (
              <XCircle className="ltr:ml-2 rtl:mr-2 h-4 w-4 text-muted-foreground" />
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="bg-background border-border">
          <DropdownMenuItem 
            onClick={() => column.toggleSorting(false)}
            className="text-foreground hover:bg-accent"
          >
            <ChevronUp className="ltr:mr-2 rtl:ml-2 h-3.5 w-3.5 text-muted-foreground" />
            Ascendente
          </DropdownMenuItem>
          <DropdownMenuItem 
            onClick={() => column.toggleSorting(true)}
            className="text-foreground hover:bg-accent"
          >
            <ChevronDown className="ltr:mr-2 rtl:ml-2 h-3.5 w-3.5 text-muted-foreground" />
            Descendente
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem 
            onClick={() => column.toggleVisibility(false)}
            className="text-foreground hover:bg-accent"
          >
            <Eye className="ltr:mr-2 rtl:ml-2 h-3.5 w-3.5 text-muted-foreground" />
            Ocultar
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
