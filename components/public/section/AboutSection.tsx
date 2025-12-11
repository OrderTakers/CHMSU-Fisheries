"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import Link from "next/link";
import { motion, Variants } from "framer-motion";
import { useEffect, useState } from "react";

// Animation variants for scroll-triggered pop-off and flow
const sectionVariants: Variants = {
  hidden: { opacity: 0, scale: 0.9, y: 50 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { duration: 0.8, ease: "easeOut" as const },
  },
};

// Animation variants for text slide
const textSlideVariants: Variants = {
  hidden: { opacity: 0, y: 50 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, delay: i * 0.2, ease: "easeOut" as const },
  }),
};

export default function AboutSection() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  const keyFeatures = [
    "Streamlined Equipment Access",
    "Real-Time Inventory Updates",
    "Support for Marine Innovation",
    "User-Friendly Platform",
    "Fosters Collaboration",
    "Cutting-Edge Tools",
  ];

  const subjects = [
    { title: "Aquaculture", description: "Advanced farming techniques for aquatic organisms" },
    { title: "Marine Biology", description: "Study of marine organisms and ecosystems" },
    { title: "Fisheries Technology", description: "Modern tools and methods for sustainable fishing" },
    { title: "Water Quality Management", description: "Monitoring and maintaining optimal aquatic conditions" },
  ];

  return (
    <section
      id="about"
      className="py-12 bg-white"
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-6xl">
        <motion.div
          className="flex flex-col lg:flex-row items-center gap-8"
          variants={sectionVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{}}
        >
          {/* Text Content */}
          <div className="lg:w-1/2">
            <Card className="border-0 shadow-md hover:shadow-lg transition-shadow duration-300">
              <CardHeader>
                <CardTitle className="text-3xl font-bold text-[#16a34a] tracking-wide">
                  About CHMSU Fisheries System
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <CardDescription className="text-base text-black leading-relaxed">
                  The CHMSU Fisheries System revolutionizes equipment management for research and education, launched to empower marine scientists since 2020.
                </CardDescription>
                <CardDescription className="text-base text-black leading-relaxed">
                  We provide cutting-edge tools and a user-friendly platform, fostering innovation and collaboration in the fisheries community.
                </CardDescription>
                <motion.div className="space-y-3">
                  {keyFeatures.slice(0, 3).map((feature, index) => (
                    <motion.p
                      key={feature}
                      className="text-sm font-medium text-black flex items-center"
                      variants={textSlideVariants}
                      custom={index}
                      initial="hidden"
                      animate={isVisible ? "visible" : "hidden"}
                    >
                      <span className="w-2 h-2 bg-[#16a34a] rounded-full mr-2"></span>
                      {feature}
                    </motion.p>
                  ))}
                </motion.div>
                <Button
                  size="lg"
                  className="mt-6 bg-[#16a34a] hover:bg-white hover:text-[#16a34a] hover:border-[#16a34a] transition-all duration-300 rounded-lg"
                  asChild
                >
                  <Link href="/about">Explore More</Link>
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Subjects as Text Cards */}
          <div className="lg:w-1/2">
            <Card className="border-0 shadow-md hover:shadow-lg transition-shadow duration-300">
              <CardHeader>
                <CardTitle className="text-2xl font-bold text-[#16a34a]">
                  Key Research Areas
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4 p-4">
                {subjects.map((subject, index) => (
                  <motion.div
                    key={index}
                    className="relative overflow-hidden rounded-lg border-2 border-[#16a34a] hover:shadow-xl transition-all duration-300 p-4 bg-gradient-to-br from-green-50 to-white"
                    whileHover={{ scale: 1.03 }}
                  >
                    <div className="flex flex-col h-full">
                      <h3 className="font-bold text-lg text-[#16a34a] mb-2">
                        {subject.title}
                      </h3>
                      <p className="text-sm text-gray-700 flex-grow">
                        {subject.description}
                      </p>
                      <div className="mt-3 pt-2 border-t border-green-100">
                        <span className="text-xs text-gray-500 font-medium">
                          CHMSU Research Focus
                        </span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </CardContent>
            </Card>
            
            {/* Additional Features Card */}
            <Card className="border-0 shadow-md hover:shadow-lg transition-shadow duration-300 mt-6">
              <CardContent className="p-6">
                <h3 className="font-bold text-xl text-[#16a34a] mb-4">
                  System Features
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  {keyFeatures.slice(3).map((feature, index) => (
                    <div
                      key={index}
                      className="flex items-start space-x-2"
                    >
                      <div className="w-3 h-3 bg-[#16a34a] rounded-full mt-1 flex-shrink-0"></div>
                      <span className="text-sm text-gray-700">
                        {feature}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </motion.div>
      </div>
    </section>
  );
}