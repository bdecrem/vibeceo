import { Poppins, JetBrains_Mono, Inter, Fredoka, Quicksand } from "next/font/google";
import type { Theme } from "./theme";

const poppins = Poppins({ subsets: ["latin"], weight: ["400", "600"], display: "swap" });
const jetbrains = JetBrains_Mono({ subsets: ["latin"], weight: ["400", "500"], display: "swap" });
const inter = Inter({ subsets: ["latin"], weight: ["400", "500"], display: "swap" });
const fredoka = Fredoka({ subsets: ["latin"], weight: ["400", "600", "700"], display: "swap" });
const quicksand = Quicksand({ subsets: ["latin"], weight: ["400", "500", "600"], display: "swap" });

const fontMap = { poppins, jetbrains, inter, fredoka, quicksand };

export function fontClassFor(t: Theme, role: "heading" | "body"): string {
  const key = role === "heading" ? t.headingFont : t.bodyFont;
  return fontMap[key].className;
}

// Hook version — components call useTheme() themselves and pass the result
import { useTheme } from "./ThemeContext";

export function useFontClass(): (role: "heading" | "body") => string {
  const t = useTheme();
  return (role) => fontClassFor(t, role);
}

export { poppins, jetbrains, inter, fredoka, quicksand };
