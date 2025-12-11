import { motion, Variants } from "framer-motion";

const spinnerVariants: Variants = {
  animate: {
    rotate: 360,
    transition: { duration: 1, repeat: Infinity, ease: "linear" as const },
  },
};

export default function Loader() {
  return (
    <motion.div
      className="w-8 h-8 border-4 border-t-[var(--blue)] border-gray-300 rounded-full"
      variants={spinnerVariants}
      animate="animate"
    />
  );
}