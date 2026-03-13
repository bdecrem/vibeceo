"use client";

import { createContext, useContext } from "react";
import { theme as defaultTheme, themes, type Theme, type ThemeName } from "./theme";

const ThemeContext = createContext<Theme>(defaultTheme);

export function ThemeProvider({ themeName, children }: { themeName: ThemeName; children: React.ReactNode }) {
  return <ThemeContext.Provider value={themes[themeName]}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  return useContext(ThemeContext);
}
