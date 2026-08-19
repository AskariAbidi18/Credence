/**
 * theme.js — Dark / Light mode toggle
 * Persists preference to localStorage
 */

const THEME_KEY = "credence_theme";

export function initTheme() {
  // Apply saved preference or system preference
  const saved = localStorage.getItem(THEME_KEY);
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const isDark = saved ? saved === "dark" : prefersDark;

  setTheme(isDark ? "dark" : "light");

  const btn = document.getElementById("theme-toggle-btn");
  btn?.addEventListener("click", toggleTheme);
}

export function toggleTheme() {
  const isDark = document.documentElement.classList.contains("dark");
  setTheme(isDark ? "light" : "dark");
}

export function setTheme(theme) {
  const isDark = theme === "dark";
  document.documentElement.classList.toggle("dark", isDark);
  localStorage.setItem(THEME_KEY, theme);

  // Update icon visibility
  const sunIcon = document.getElementById("theme-icon-sun");
  const moonIcon = document.getElementById("theme-icon-moon");
  sunIcon?.classList.toggle("hidden", isDark); // Show sun in dark (to switch to light)
  moonIcon?.classList.toggle("hidden", !isDark); // Show moon in light (to switch to dark)

  // Re-render any existing Chart.js charts with updated colors
  window.dispatchEvent(new CustomEvent("theme-change", { detail: { theme } }));
}

export function isDarkMode() {
  return document.documentElement.classList.contains("dark");
}
