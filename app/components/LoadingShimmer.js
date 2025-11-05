"use client";

import { motion } from "framer-motion";

export default function LoadingShimmer() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{
        repeat: Infinity,
        repeatType: "mirror",
        duration: 1.2,
      }}
      className="mt-6 p-4 bg-white border rounded-lg shadow max-w-md w-full"
    >
      <h2 className="font-semibold mb-2 text-gray-800">Response:</h2>
      <div className="space-y-2">
        <div className="h-3 w-3/4 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 rounded animate-pulse"></div>
        <div className="h-3 w-1/2 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 rounded animate-pulse"></div>
        <div className="h-3 w-2/3 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 rounded animate-pulse"></div>
      </div>
    </motion.div>
  );
}