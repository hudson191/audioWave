import { useEffect, useState } from "react";
import { Button } from "./Button";
import { resolveInitialTheme } from "./utils";
import type { Theme } from "./utils";

const STORAGE_KEY = "audiowave-theme";

function readStoredTheme(): unknown {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function persistTheme(theme: Theme): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // armazenamento indisponível (modo privado etc.) — segue sem persistir
  }
}

function systemPrefersDark(): boolean {
  return (
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
  );
}

export interface ThemeToggleProps {
  className?: string;
}

/**
 * Alterna data-theme no :root, persiste em localStorage e usa
 * prefers-color-scheme como padrão.
 */
export function ThemeToggle({ className }: ThemeToggleProps) {
  const [theme, setTheme] = useState<Theme>(() =>
    resolveInitialTheme(readStoredTheme(), systemPrefersDark()),
  );

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  function toggle(): void {
    const next: Theme = theme === "dark" ? "light" : "dark";
    persistTheme(next);
    setTheme(next);
  }

  const dark = theme === "dark";
  return (
    <Button
      variant="ghost"
      size="sm"
      className={className}
      onClick={toggle}
      aria-label={dark ? "Ativar tema claro" : "Ativar tema escuro"}
      icon={dark ? "☀" : "☾"}
    />
  );
}
