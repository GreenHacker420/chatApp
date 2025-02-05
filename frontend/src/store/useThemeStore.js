import { create } from "zustand";
import { useEffect } from "react";

// ✅ Detect system theme preference
const getInitialTheme = () => {
  if (localStorage.getItem("chat-theme")) {
    return localStorage.getItem("chat-theme");
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
};

export const useThemeStore = create((set) => ({
  theme: getInitialTheme(),
  setTheme: (theme) => {
    localStorage.setItem("chat-theme", theme);
    document.documentElement.setAttribute("data-theme", theme); // ✅ Apply theme immediately
    set({ theme });
  },
}));

// ✅ Sync theme on app load
export const useSyncTheme = () => {
  const { theme } = useThemeStore();

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);
};
