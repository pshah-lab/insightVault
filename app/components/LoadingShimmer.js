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
      className="mt-4 p-5 bg-white border rounded-xl shadow-sm w-full"
    >
      <h2 className="font-semibold mb-3 text-gray-800">Response</h2>
      <div className="space-y-3">
        <div className="h-3 w-11/12 bg-linear-to-r from-gray-200 via-gray-300 to-gray-200 rounded animate-pulse"></div>
        <div className="h-3 w-9/12 bg-linear-to-r from-gray-200 via-gray-300 to-gray-200 rounded animate-pulse"></div>
        <div className="h-3 w-10/12 bg-linear-to-r from-gray-200 via-gray-300 to-gray-200 rounded animate-pulse"></div>
        <div className="h-3 w-6/12 bg-linear-to-r from-gray-200 via-gray-300 to-gray-200 rounded animate-pulse"></div>
      </div>
    </motion.div>
  );
}