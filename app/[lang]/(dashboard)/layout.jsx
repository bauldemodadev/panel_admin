"use client";
import DashBoardLayoutProvider from "@/provider/dashboard.layout.provider";
import { useAuth } from "@/provider/auth.provider";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

const Layout = ({ children, params: { lang } }) => {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/auth/login");
    }
  }, [user, loading, router]);

  if (loading || !user) {
    return <div className="w-full h-screen flex items-center justify-center text-lg text-muted-foreground">Cargando sesión...</div>;
  }

  // Puedes agregar aquí la lógica de traducción si lo necesitas
  return (
    <DashBoardLayoutProvider>{children}</DashBoardLayoutProvider>
  );
};

export default Layout;
