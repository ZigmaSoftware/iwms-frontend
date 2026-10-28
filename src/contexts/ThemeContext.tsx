import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

type Theme = "light" | "dark";

type ThemePalette = {
  primary: string;
  primaryHover: string;
  primarySoft: string;
  primaryGradient: string;
  accent: string;
  accentHover: string;
  accentSoft: string;
  surface: string;
  surfaceMuted: string;
  surfaceAlt: string;
  border: string;
  text: string;
  mutedText: string;
  cardShadow: string;
};

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  palette: ThemePalette;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_PALETTES: Record<Theme, ThemePalette> = {
  // Teal brand on cool slate; kept in sync with the --admin-* defaults in
  // index.css.
  light: {
    primary: "#0d9488",
    primaryHover: "#0f766e",
    primarySoft: "#e6f6f4",
    primaryGradient: "#0f766e",
    accent: "#6366f1",
    accentHover: "#4f46e5",
    accentSoft: "#eef2ff",
    surface: "#dcefea",
    surfaceMuted: "#e7f4f1",
    surfaceAlt: "#ffffff",
    border: "#c6e3dc",
    text: "#0f2422",
    mutedText: "#557a74",
    cardShadow: "0 15px 40px rgba(15, 60, 70, 0.08)",
  },
  dark: {
    primary: "#2dd4bf",
    primaryHover: "#5eead4",
    primarySoft: "rgba(45, 212, 191, 0.14)",
    primaryGradient: "#0f766e",
    accent: "#818cf8",
    accentHover: "#a5b4fc",
    accentSoft: "rgba(129, 140, 248, 0.16)",
    surface: "#0a1416",
    surfaceMuted: "#0f1d20",
    surfaceAlt: "#15302f",
    border: "#1d3a3a",
    text: "#e6f2f1",
    mutedText: "#8fb0ab",
    cardShadow: "0 10px 30px -12px rgba(0, 0, 0, 0.6)",
  },
};

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem("iwms-theme");
    return (saved as Theme) || "light";
  });

  const palette = useMemo(() => THEME_PALETTES[theme], [theme]);

  useEffect(() => {
    localStorage.setItem("iwms-theme", theme);
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  useEffect(() => {
    const root = document.documentElement;
    Object.entries(palette).forEach(([token, value]) => {
      root.style.setProperty(`--admin-${token}`, value);
    });
  }, [palette]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, palette }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used within ThemeProvider");
  return context;
}
