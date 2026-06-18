import { useCallback, useState } from "react";
import type { ReactNode } from "react";
import { ThemeContext } from "@/lib/theme";

export function ThemeProvider({ children }: { children: ReactNode }) {
  // Initial value matches the class set by the inline script in index.html.
  const [dark, setDark] = useState(() =>
    document.documentElement.classList.contains("dark"),
  );

  const toggle = useCallback(() => {
    setDark((prev) => {
      const next = !prev;
      document.documentElement.classList.toggle("dark", next);
      localStorage.setItem("theme", next ? "dark" : "light");
      return next;
    });
  }, []);

  return (
    <ThemeContext.Provider value={{ dark, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}
