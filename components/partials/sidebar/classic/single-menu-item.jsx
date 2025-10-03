"use client";
import React from "react";

import { Badge } from "@/components/ui/badge";
import { cn, isLocationMatch, translate, getDynamicPath } from "@/lib/utils";
import { usePathname } from "next/navigation";
import Link from "next/link";

const SingleMenuItem = ({ item, collapsed, hovered, trans }) => {
  const { badge, href, title } = item;

  const pathname = usePathname();
  const locationName = getDynamicPath(pathname);

  // Verificación de seguridad para el icono
  const IconComponent = item.icon;
  const hasValidIcon = IconComponent && typeof IconComponent === 'function';

  return (
    <Link href={href}>
      <div
        className={cn(
          "flex gap-3  text-default-700 text-sm capitalize px-[10px] font-medium py-3 rounded cursor-pointer hover:bg-primary hover:text-primary-foreground",
          {
            "bg-primary text-primary-foreground": isLocationMatch(
              href, locationName
            ),
          }
        )}
      >
        <span className="grow-0">
          {hasValidIcon ? (
            <IconComponent className="w-5 h-5" />
          ) : (
            <div className="w-5 h-5 bg-gray-300 rounded" />
          )}
        </span>
        <div className="text-box grow ">{translate(title, trans)}</div>
        {badge && <Badge className=" rounded">{item.badge}</Badge>}
      </div>
    </Link>
  );
};

export default SingleMenuItem;
