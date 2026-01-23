"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";

type Theme = "light" | "dark" | "system";
type ResolvedTheme = "light" | "dark";

interface ThemeContextValue {
  theme: Theme;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

function resolveTheme(theme: Theme): ResolvedTheme {
  if (typeof window === "undefined") return "dark";

  if (theme === "system") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }
  return theme;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("system");
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>("dark");
  const [mounted, setMounted] = useState(false);

  // Initialize theme on mount
  useEffect(() => {
    setMounted(true);

    try {
      const stored = localStorage.getItem(
        "@invite-market/theme-preference",
      ) as Theme | null;
      const initialTheme = stored || "system";
      setThemeState(initialTheme);

      const resolved = resolveTheme(initialTheme);
      setResolvedTheme(resolved);
      document.documentElement.setAttribute("data-theme", resolved);
    } catch (e) {
      console.error("Failed to load theme from localStorage:", e);
    }
  }, []);

  // Listen for system preference changes
  useEffect(() => {
    if (!mounted || theme !== "system") return;

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    const handleChange = (e: MediaQueryListEvent) => {
      const newResolved = e.matches ? "dark" : "light";
      setResolvedTheme(newResolved);
      document.documentElement.setAttribute("data-theme", newResolved);
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [theme, mounted]);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);

    try {
      localStorage.setItem("@invite-market/theme-preference", newTheme);
    } catch (e) {
      console.error("Failed to save theme to localStorage:", e);
    }

    const resolved = resolveTheme(newTheme);
    setResolvedTheme(resolved);
    document.documentElement.setAttribute("data-theme", resolved);
  };

  const toggleTheme = () => {
    const newTheme = resolvedTheme === "dark" ? "light" : "dark";
    setTheme(newTheme);
  };

  return (
    <ThemeContext.Provider
      value={{ theme, resolvedTheme, setTheme, toggleTheme }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
}
