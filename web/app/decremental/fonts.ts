import { Poppins, JetBrains_Mono, Inter } from "next/font/google";
import { theme } from "./theme";

const poppins = Poppins({ subsets: ["latin"], weight: ["400", "600"], display: "swap" });
const jetbrains = JetBrains_Mono({ subsets: ["latin"], weight: ["400", "500"], display: "swap" });
const inter = Inter({ subsets: ["latin"], weight: ["400", "500"], display: "swap" });

const fontMap = { poppins, jetbrains, inter };

export function fontClass(role: "heading" | "body"): string {
  const key = role === "heading" ? theme.headingFont : theme.bodyFont;
  return fontMap[key].className;
}

export { poppins, jetbrains, inter };
