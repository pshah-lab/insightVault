"use client";

import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";
import { motion } from "framer-motion";

const emptySubscribe = () => () => {};

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  if (!mounted) {
    return (
      <div
        className="w-9 h-9 p-2 rounded-lg bg-white/70 dark:bg-white/10 backdrop-blur border border-gray-300 dark:border-gray-700 shadow-sm"
        aria-hidden="true"
      />
    );
  }

  const isDark = theme === "dark";
  const toggle = () => setTheme(isDark ? "light" : "dark");

  return (
    <motion.button
      whileTap={{ scale: 0.9 }}
      onClick={toggle}
      className="p-2 rounded-lg bg-white/70 dark:bg-white/10 backdrop-blur border border-gray-300 dark:border-gray-700 shadow-sm hover:shadow-md transition text-base cursor-pointer"
      title={`Switch to ${isDark ? "light" : "dark"} mode`}
      aria-label="Toggle theme"
    >
      {isDark ? (
        <span className="text-yellow-400">🌞</span>
      ) : (
        <span className="text-gray-800">🌙</span>
      )}
    </motion.button>
  );
}