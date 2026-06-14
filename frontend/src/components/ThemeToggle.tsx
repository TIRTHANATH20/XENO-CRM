"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

const STORAGE_KEY = "xeno-theme";

type Theme = "dark" | "light";

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme | null>(null);

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY) as Theme | null;
    const systemQuery = window.matchMedia?.("(prefers-color-scheme: dark)");
    const system = systemQuery && systemQuery.matches ? "dark" : "light";
    const resolved = stored || system;
    setTheme(resolved);
    document.documentElement.dataset.theme = resolved;
    // inform the browser of the color scheme for built-in form controls
    try {
      document.documentElement.style.colorScheme = resolved;
    } catch (e) {
      // ignore
    }

    // If user hasn't stored a preference, keep the theme in sync with system changes
    if (!stored && systemQuery && systemQuery.addEventListener) {
      const handler = (ev: MediaQueryListEvent) => {
        const next = ev.matches ? "dark" : "light";
        setTheme(next);
        document.documentElement.dataset.theme = next;
        try {
          document.documentElement.style.colorScheme = next;
        } catch (e) {}
      };
      systemQuery.addEventListener("change", handler);
      return () => systemQuery.removeEventListener("change", handler);
    }
  }, []);

  const currentTheme = theme || "dark";
  const toggle = () => {
    const nextTheme: Theme = currentTheme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    document.documentElement.dataset.theme = nextTheme;
    window.localStorage.setItem(STORAGE_KEY, nextTheme);
  };

  return (
    <button
      type="button"
      onClick={toggle}
      className="premium-button-secondary"
      aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
    >
      {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      {theme === "dark" ? "Light" : "Dark"}
    </button>
  );
}
