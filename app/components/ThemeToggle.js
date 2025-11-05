"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  const toggle = () => setTheme(theme === "dark" ? "light" : "dark");

  return (
    <motion.button
      whileTap={{ scale: 0.9 }}
      onClick={toggle}
      className="p-2 rounded-lg bg-white/70 dark:bg-white/10 backdrop-blur border border-gray-300 dark:border-gray-700 shadow-sm hover:shadow-md transition"
      title="Toggle theme"
    >
      {theme === "dark" ? (
        <span className="text-yellow-400">🌞</span>
      ) : (
        <span className="text-gray-800">🌙</span>
      )}
    </motion.button>
  );
}