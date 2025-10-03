import {
  DashBoard,
  Users,
  Building,
  Settings,
} from "@/components/svg";
import { Users2, Boxes, DollarSign, Briefcase, Receipt, Truck, PiggyBank, Wallet, ClipboardList } from "lucide-react";

export const menusConfig = {
  mainNav: [
    {
      title: "Dashboard",
      icon: DashBoard,
      href: "/dashboard",
    },
    {
      title: "Ventas / Presupuestos",
      icon: Receipt,
      href: "/ventas",
    },
    {
      title: "Envíos",
      icon: Truck,
      href: "/envios",
    },
    {
      title: "Productos",
      icon: Building,
      href: "/productos",
    },
    {
      title: "Stock",
      icon: Boxes,
      href: "/stock-compras",
    },
    {
      title: "Gastos",
      icon: PiggyBank,
      href: "/gastos",
    },
    {
      title: "Obras",
      icon: Briefcase,
      href: "/obras",
    },
    {
      title: "Clientes",
      icon: Users2,
      href: "/clientes",
    },
    {
      title: "Precios",
      icon: DollarSign,
      href: "/precios",
    },
    {
      title: "Auditoría",
      icon: ClipboardList,
      href: "/auditoria",
    },
  ],
  sidebarNav: {
    modern: [
      {
        title: "Dashboard",
        icon: DashBoard,
        href: "/dashboard",
      },
      {
        title: "Ventas / Presupuestos",
        icon: Receipt,
        href: "/ventas",
      },
      {
        title: "Envíos",
        icon: Truck,
        href: "/envios",
      },
      {
        title: "Productos",
        icon: Building,
        href: "/productos",
      },
      {
        title: "Stock",
        icon: Boxes,
        href: "/stock-compras",
      },
      {
        title: "Gastos",
        icon: PiggyBank,
        href: "/gastos",
      },
      {
        title: "Obras",
        icon: Briefcase,
        href: "/obras",
      },
      {
        title: "Clientes",
        icon: Users2,
        href: "/clientes",
      },
      {
        title: "Precios",
        icon: DollarSign,
        href: "/precios",
      },
      {
        title: "Auditoría",
        icon: ClipboardList,
        href: "/auditoria",
      },
    ],
    classic: [
      {
        isHeader: true,
        title: "Menú Principal",
      },
      {
        title: "Dashboard",
        icon: DashBoard,
        href: "/dashboard",
      },
      {
        title: "Ventas / Presupuestos",
        icon: Receipt,
        href: "/ventas",
      },
      {
        title: "Envíos",
        icon: Truck,
        href: "/envios",
      },
      {
        title: "Productos",
        icon: Building,
        href: "/productos",
      },
      {
        title: "Stock",
        icon: Boxes,
        href: "/stock-compras",
      },
      {
        title: "Gastos",
        icon: PiggyBank,
        href: "/gastos",
      },
      {
        title: "Obras",
        icon: Briefcase,
        href: "/obras",
      },
      {
        title: "Clientes",
        icon: Users2,
        href: "/clientes",
      },
      {
        title: "Precios",
        icon: DollarSign,
        href: "/precios",
      },
      {
        title: "Auditoría",
        icon: ClipboardList,
        href: "/auditoria",
      },
    ],
  },
};
