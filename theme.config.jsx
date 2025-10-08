import { SiteLogo } from "@/components/svg";
export default {
  logo: (
    <span className=" inline-flex gap-2.5 items-center">
      <SiteLogo className="w-8 h-8 text-primary" />{" "}
      <span className="  text-lg font-bold text-primary ">Baúl de Moda</span>
    </span>
  ),
  project: {
    link: "https://bauldemoda.com.ar",
  },
  banner: {
    key: "1.0-release",
    text: (
      <a href="/dashboard" target="_blank">
        🎉 Baúl de Moda
      </a>
    ),
  },
  footer: {
    text: (
      <span>
        {new Date().getFullYear()} ©{" "}
        <a href="https://bauldemoda.com.ar" target="_blank">
          Baúl de Moda
        </a>
        .
      </span>
    ),
  },
  themeSwitch: {
    useOptions() {
      return {
        light: "Light",
        dark: "Dark",
      };
    },
  },
  useNextSeoProps() {
    return {
      titleTemplate: "%s – Baúl de Moda",
    };
  },
};
