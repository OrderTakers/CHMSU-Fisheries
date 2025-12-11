"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import Image from "next/image";
import { RefObject, forwardRef, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { motion, Variants } from "framer-motion";

// Animation variants for section reveal
const sectionVariants: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: "easeOut" } },
};

const equipmentData = [
  {
    id: 1,
    name: "Microscopes",
    description: "High-powered microscopes for aquatic specimen analysis",
    image: "/aboutimage/microscope1.jpg",
    status: "Available",
    category: "Observation",
  },
  {
    id: 2,
    name: "Water Quality Test Kits",
    description: "Complete kits for testing pH, dissolved oxygen, and other parameters",
    image: "/aboutimage/water.jpg",
    status: "Available",
    category: "Testing",
  },
  {
    id: 3,
    name: "Dissection Tools",
    description: "Surgical-grade tools for fish dissection and analysis",
    image: "/aboutimage/tools.jpg",
    status: "In Use",
    category: "Analysis",
  },
  {
    id: 4,
    name: "Aquarium Systems",
    description: "Controlled environment tanks for live specimen observation",
    image: "/aboutimage/cen.jpg",
    status: "Available",
    category: "Observation",
  },
  {
    id: 5,
    name: "Centrifuge",
    description: "High-speed centrifuge for sample preparation",
    image: "/aboutimage/cen.jpg",
    status: "Maintenance",
    category: "Processing",
  },
  {
    id: 6,
    name: "Spectrophotometer",
    description: "For precise measurement of light absorption in samples",
    image: "/aboutimage/spectrophotometer.jpg",
    status: "Available",
    category: "Testing",
  },
];

interface EquipmentSectionProps {}

const EquipmentSection = forwardRef<HTMLDivElement, EquipmentSectionProps>(({ ...props }, ref) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const itemsPerView = 3; // Desktop: 3, Tablet: 2, Mobile: 1 (handled via CSS)

  const handleReserve = (name: string, status: string) => {
    if (status === "Available") {
      toast.success(`Reservation request for ${name} submitted!`);
    } else {
      toast.error(`${name} is currently ${status.toLowerCase()}.`);
    }
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev === 0 ? equipmentData.length - itemsPerView : prev - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev >= equipmentData.length - itemsPerView ? 0 : prev + 1));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft") handlePrev();
    if (e.key === "ArrowRight") handleNext();
  };

  // Auto-slide effect
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev >= equipmentData.length - itemsPerView ? 0 : prev + 1));
    }, 3000); // Auto-slide every 3 seconds
    return () => clearInterval(interval);
  }, [equipmentData.length]);

  return (
    <section
      id="equipment"
      ref={ref}
      className="py-12 bg-white"
      onKeyDown={handleKeyDown}
      tabIndex={0}
      aria-label="Equipment carousel section"
    >
      <motion.div
        className="flex flex-col items-center justify-center space-y-6 text-center px-4 sm:px-6 lg:px-8"
        variants={sectionVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: false }}
      >
        <h2 className="text-4xl font-bold tracking-tighter text-[#16a34a]">
          Equipment Inventory
        </h2>
        <p className="mx-auto max-w-[700px] font-semibold text-black leading-relaxed">
          Explore our range of fisheries equipment available for borrowing, designed to support cutting-edge marine research and education at CHMSU Binalbagan.
        </p>
        <div className="relative w-full py-6">
          <div className="overflow-hidden">
            <motion.div
              className="flex transition-transform duration-500 ease-in-out"
              style={{ transform: `translateX(-${currentIndex * (100 / itemsPerView)}%)` }}
              initial={{ x: 0 }}
              animate={{ x: -currentIndex * (100 / itemsPerView) }}
              transition={{ duration: 0.5, ease: "easeInOut" }}
            >
              {equipmentData.map((item) => (
                <div
                  key={item.id}
                  className="flex-none w-full md:w-1/2 lg:w-1/3 px-2"
                  role="group"
                  aria-label={`Equipment: ${item.name}`}
                >
                  <Card className="overflow-hidden border-2 border-[#16a34a] hover:shadow-lg transition-all duration-300">
                    <div className="relative h-48 w-full">
                      <Image
                        src={item.image}
                        alt={`${item.name} equipment`}
                        fill
                        className="object-cover transition-opacity opacity-90 hover:opacity-100"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = "/images/placeholder.jpg";
                        }}
                      />
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3">
                        <h3 className="text-lg font-semibold text-white">{item.name}</h3>
                        <p className="text-sm text-gray-200">{item.category}</p>
                      </div>
                      <span
                        className={`absolute top-2 right-2 px-2 py-1 rounded-full text-xs font-medium ${
                          item.status === "Available"
                            ? "bg-[#16a34a] text-white"
                            : item.status === "In Use"
                            ? "bg-yellow-600 text-white"
                            : "bg-red-600 text-white"
                        }`}
                      >
                        {item.status}
                      </span>
                    </div>
                    <CardContent className="p-4">
                      <p className="text-sm text-black mb-4">{item.description}</p>
                      <Button
                        className="w-full bg-[#16a34a] hover:bg-white hover:text-[#16a34a] hover:border-[#16a34a] transition-all duration-300 rounded-lg"
                        onClick={() => handleReserve(item.name, item.status)}
                        aria-label={`Reserve ${item.name}`}
                      >
                        Reserve
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              ))}
            </motion.div>
          </div>

          {/* Navigation Arrows */}
          <Button
            variant="outline"
            className="absolute top-1/2 left-4 transform -translate-y-1/2 bg-[#e9ecef] text-black hover:bg-gray-100 rounded-full p-2"
            onClick={handlePrev}
            aria-label="Previous equipment"
            disabled={currentIndex === 0}
          >
            <ChevronLeft className="h-6 w-6" />
          </Button>
          <Button
            variant="outline"
            className="absolute top-1/2 right-4 transform -translate-y-1/2 bg-[#e9ecef] text-black hover:bg-gray-100 rounded-full p-2"
            onClick={handleNext}
            aria-label="Next equipment"
            disabled={currentIndex >= equipmentData.length - itemsPerView}
          >
            <ChevronRight className="h-6 w-6" />
          </Button>

          {/* Carousel Indicators */}
          <div className="flex justify-center mt-4 space-x-2">
            {Array.from({ length: Math.ceil(equipmentData.length / itemsPerView) }).map((_, index) => (
              <button
                key={index}
                className={`h-2 w-2 rounded-full ${
                  index === Math.floor(currentIndex / itemsPerView)
                    ? "bg-[#16a34a]"
                    : "bg-gray-400"
                }`}
                onClick={() => setCurrentIndex(index * itemsPerView)}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
        </div>
      </motion.div>
    </section>
  );
});

EquipmentSection.displayName = "EquipmentSection";

export default EquipmentSection;