"use client";
import Image from "next/image";
import Link from "next/link";
import { SiteLogo } from "@/components/svg";
import { Button } from "@/components/ui/button";
import footerImage from "@/public/images/landing-page/footer.png";
import facebook from "@/public/images/social/facebook-1.png";
import linkedin from "@/public/images/social/linkedin-1.png";
import github from "@/public/images/social/github-1.png";
import whatsapp from "@/public/images/social/whatsapp.png";
import youtube from "@/public/images/social/youtube.png";
import mail from "@/public/images/social/mail.png";

const Footer = () => {
  const socials = [
    {
      icon: linkedin,
      href: "https://www.linkedin.com/in/lauticodes/",
    },
    {
      icon: facebook,
      href: "https://www.facebook.com/Codeshaperbd/",
    },
    { icon: youtube, href: "https://www.youtube.com/@codeshaper4181" },
    {
      icon: github,
      href: "https://github.com/lauticodes",
    },
    {
      icon: whatsapp,
      href: "https://wa.me/5491133355544",
    },
    {
      icon: mail,
      href: "mailto:info@caballeromaderas.com",
    },
  ];
  return (
    <footer
      className="bg-cover bg-center bg-no-repeat relative before:absolute before:top-0 before:left-0 before:w-full before:h-full before:bg-default-900/90 dark:before:bg-default-100"
      style={{
        background: `url(${footerImage.src})`,
      }}
    >
      <div className="py-16 2xl:py-[120px]">
        <div className="max-w-[700px] mx-auto flex flex-col items-center relative">
          <Link
            href="/"
            className="inline-flex items-center gap-4 text-primary-foreground"
          >
            <SiteLogo className="w-[50px] h-[52px]" />
            <span className="text-3xl font-semibold">Maderas Caballero</span>
          </Link>
          <p className="text-base leading-7 text-default-200 dark:text-default-600 text-center mt-3">
            Maderas Caballero es una empresa líder en el sector
            premium, especializada en la venta de maderas y productos de
            carpintería. Nuestro CRM y panel corporativo permiten administrar
            leads, proyectos y ventas de manera eficiente y profesional.
          </p>
          <div className="mt-9 flex justify-center flex-wrap gap-4">
            <Button
              asChild
              variant="outline"
              className="rounded text-primary-foreground border-primary"
            >
              <Link href="/es/productos">Ver Productos</Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="rounded text-primary-foreground border-primary"
            >
              <Link href="mailto:info@caballeromaderas.com">Contacto</Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="rounded text-primary-foreground border-primary"
            >
              <Link
                href="https://www.linkedin.com/in/lauticodes/"
                target="_blank"
              >
                LinkedIn
              </Link>
            </Button>
          </div>
          <div className="mt-8 flex items-center justify-center flex-wrap gap-5">
            {socials.map((item, index) => (
              <Link
                href={item.href}
                key={`social-link-${index}`}
                target="_blank"
              >
                <Image src={item.icon} alt="social" width={30} height={30} />
              </Link>
            ))}
          </div>
        </div>
      </div>
      <div className="relative bg-default-900 dark:bg-default-50 py-6">
        <div className="container flex flex-col text-center md:text-start md:flex-row gap-2">
          <p className="text-primary-foreground flex-1 text-base xl:text-lg font-medium">
            COPYRIGHT &copy; 2025 Maderas Caballero. Todos los derechos reservados.
          </p>
          <p className="text-primary-foreground flex-none text-base font-medium">
            Desarrollado por{" "}
            <Link
              href="https://github.com/lauticodes"
              target="_blank"
              className="text-primary hover:underline"
            >
              Tucs Digital
            </Link>
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
