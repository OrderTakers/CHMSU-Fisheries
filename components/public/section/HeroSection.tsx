"use client";

import { Button } from "@/components/ui/button";
import Image from "next/image";
import { motion, Variants, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { useModalStore } from "@/lib/stores";

// Animation variants for scroll reveal
const sectionVariants: Variants = {
  hidden: { opacity: 0, y: 50 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" as const } },
};

const cardVariants: Variants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.5, ease: "easeOut" as const } },
};

// Fish swimming variants (follows path with slight wave motion)
const fishVariants = (delay: number): Variants => ({
  animate: {
    x: [0, 300, 0], // Loop left to right
    y: [0, -10, 0], // Slight wave-like vertical motion
    rotate: [0, 3, -3, 0], // Gentle rotation for swimming effect
    transition: { duration: 12, repeat: Infinity, ease: "easeInOut" as const, delay },
  },
});

// Flowing water line variants
const waterLineVariants: Variants = {
  animate: {
    strokeDashoffset: [0, -60],
    transition: { duration: 3, repeat: Infinity, ease: "linear" as const },
  },
};

// Text variants for sayings
const textVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.5 } },
  exit: { opacity: 0, transition: { duration: 0.5 } },
};

const designLetterVariants: Variants = {
  hidden: { opacity: 0, x: -10 },
  visible: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: { duration: 0.3, delay: i * 0.1, ease: "easeInOut" as const },
  }),
};

const buildLetterVariants: Variants = {
  hidden: { opacity: 0, y: 20, rotate: -5 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    rotate: 0,
    transition: { duration: 0.4, delay: i * 0.1, ease: "easeOut" as const },
  }),
};

const doneLetterVariants: Variants = {
  hidden: { opacity: 0, scale: 0.5 },
  visible: (i: number) => ({
    opacity: 1,
    scale: 1,
    transition: { duration: 0.3, delay: i * 0.1, type: "spring", stiffness: 200 },
  }),
};

const checkIconVariants: Variants = {
  hidden: { scale: 0, opacity: 0 },
  visible: { scale: 1, opacity: 1, transition: { duration: 0.3, type: "spring", stiffness: 200, delay: 0.4 } },
};

export default function HeroSection() {
  const { setIsLoginOpen, setIsCreateAccountOpen } = useModalStore();
  const [currentWord, setCurrentWord] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentWord((prev) => (prev + 1) % 3);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const labs = [
    {
      src: "/aboutimage/image1.jpg",
      alt: "Aquaculture Lab",
      description: "State-of-the-art aquaculture facilities.",
    },
    {
      src: "/aboutimage/image2.jpg",
      alt: "Marine Biology Lab",
      description: "Advanced marine research equipment.",
    },
    {
      src: "/aboutimage/image4.jpg",
      alt: "Fisheries Tech Lab",
      description: "Inventory for fisheries technology.",
    },
    {
      src: "/aboutimage/image5.jpg",
      alt: "Water Quality Lab",
      description: "Tools for water analysis and monitoring.",
    },
  ];

  return (
    <motion.section
      id="hero"
      className="relative bg-white min-h-[calc(100vh-4rem)] flex justify-center items-center py-8 md:py-12"
      variants={sectionVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true }}
    >
      <div className="container mx-auto px-4 flex flex-col items-center gap-6 max-w-6xl">
        <motion.div
          className="w-full max-w-2xl text-center p-6 relative"
          variants={cardVariants}
        >
          {/* Flowing water line (realistic wave) */}
          <motion.svg
            className="absolute top-0 left-0 w-full h-32 pointer-events-none"
            viewBox="0 0 600 100"
            style={{ transform: "translate(0, 20%)" }}
          >
            <motion.path
              d="M0,50 C50,30 100,70 150,50 C200,30 250,70 300,50 C350,30 400,70 450,50 C500,30 550,70 600,50"
              fill="none"
              stroke="#1e40af"
              strokeWidth="2"
              strokeDasharray="15,15"
              strokeDashoffset="0"
              variants={waterLineVariants}
              animate="animate"
            />
          </motion.svg>
          {/* Fish swimming along the path */}
          {[
            { delay: 0, top: "20%", left: "0%" },
            { delay: 4, top: "20%", left: "20%" },
            { delay: 8, top: "20%", left: "40%" },
          ].map((fish, index) => (
            <motion.div
              key={index}
              className="absolute"
              style={{ top: fish.top, left: fish.left }}
              variants={fishVariants(fish.delay)}
              animate="animate"
            >
              <Image
                src="/images/fish.png"
                alt="Swimming Fish"
                width={48}
                height={48}
                className="opacity-80"
              />
            </motion.div>
          ))}
          <h1 className="text-4xl sm:text-5xl font-black md:text-6xl w-full mb-4 text-[#16a34a] tracking-tight">
            Inventory. Borrow. Research. Excel.
          </h1>
          <p className="text-base md:text-lg font-semibold text-[#000000] mb-4">
            CHMSU Binalbagan Fisheries Inventory Laboratory Borrowing System streamlines equipment borrowing for fisheries research and education.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              variant="outline"
              className="w-full sm:w-auto px-8 py-4 border-1 border-[#16a34a] bg-white text-[#16a34a] hover:bg-[#16a34a] hover:text-white"
              onClick={() => setIsLoginOpen(true)}
            >
              Sign In
            </Button>
            <Button
              size="lg"
              className="w-full sm:w-auto px-8 py-4 bg-[#16a34a] text-white hover:bg-white hover:text-[#16a34a]"
              onClick={() => setIsCreateAccountOpen(true)}
            >
              Sign Up
            </Button>
          </div>
          <motion.div className="mt-8 h-8 flex justify-center items-center">
            <AnimatePresence>
              {currentWord === 0 && (
                <motion.div
                  className="flex"
                  variants={textVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  key="inventory"
                >
                  {"Inventory".split("").map((letter, i) => (
                    <motion.span
                      key={i}
                      className="text-lg md:text-xl font-semibold text-[#16a34a]"
                      variants={designLetterVariants}
                      custom={i}
                    >
                      {letter}
                    </motion.span>
                  ))}
                </motion.div>
              )}
              {currentWord === 1 && (
                <motion.div
                  className="flex"
                  variants={textVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  key="borrow"
                >
                  {"Borrow".split("").map((letter, i) => (
                    <motion.span
                      key={i}
                      className="text-lg md:text-xl font-semibold text-[#16a34a]"
                      variants={buildLetterVariants}
                      custom={i}
                    >
                      {letter}
                    </motion.span>
                  ))}
                </motion.div>
              )}
              {currentWord === 2 && (
                <motion.div
                  className="flex items-center"
                  variants={textVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  key="research"
                >
                  {"Research".split("").map((letter, i) => (
                    <motion.span
                      key={i}
                      className="text-lg md:text-xl font-semibold text-[#16a34a]"
                      variants={doneLetterVariants}
                      custom={i}
                    >
                      {letter}
                    </motion.span>
                  ))}
                  <motion.div
                    className="ml-2"
                    variants={checkIconVariants}
                    initial="hidden"
                    animate="visible"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#16a34a"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="w-5 h-5"
                    >
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
        <motion.div
          className="w-full grid grid-cols-2 md:grid-cols-4 gap-4"
          variants={cardVariants}
        >
          {labs.map((lab, index) => (
            <motion.div
              key={index}
              className="relative flex flex-col items-center group"
              variants={cardVariants}
              transition={{ delay: index * 0.1 }}
            >
              <div className="relative w-full overflow-hidden rounded-lg shadow-md aspect-[4/2]">
                <Image
                  src={lab.src}
                  alt={lab.alt}
                  fill
                  className="object-cover"
                  priority={index === 0}
                />
              </div>
              <p className="mt-2 text-center text-md font-semibold text-[#000000]">{lab.description}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </motion.section>
  );
}