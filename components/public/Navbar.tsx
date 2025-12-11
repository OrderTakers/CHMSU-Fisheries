"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { Menu } from "lucide-react";
import Link from "next/link";
import { motion, Variants } from "framer-motion";
import Image from "next/image";
import { Separator } from "@/components/ui/separator";

// Animation variants for scroll reveal
const sectionVariants: Variants = {
  hidden: { opacity: 0, y: -50 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } },
};

export function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);
  const [isMounted, setIsMounted] = React.useState(false);

  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  const navItems = [
    { name: "Home", href: "/" },
    { name: "About", href: "#about" },
    { name: "Equipment", href: "#equipment" },
    { name: "Contact", href: "#contact-us" },
    { name: "FAQs", href: "#faqs" },
  ];

  // Don't render the Sheet on server to prevent hydration mismatch
  if (!isMounted) {
    return (
      <header className="sticky top-0 z-50 border-b bg-white backdrop-blur supports-[backdrop-filter]:bg-white/60">
        <div className="container mx-auto flex h-16 items-center px-4 justify-between">
          {/* Logo with Title */}
          <Link href="/" className="flex items-center space-x-2">
            <Image
              src="/images/logo-white.png"
              alt="CHMSU Fisheries Logo"
              width={60}
              height={15}
              className="object-contain"
            />
            <span className="text-xl font-pacifico text-black">CHMSU Fisheries</span>
          </Link>

          {/* Centered Navigation */}
          <div className="flex-1 flex items-center justify-center absolute left-0 right-0">
            <nav className="hidden md:flex items-center space-x-6">
              {navItems.map((item, index) => (
                <React.Fragment key={item.name}>
                  <Link
                    href={item.href}
                    className="text-sm font-bold text-black hover:text-[#16a34a] transition-colors"
                  >
                    {item.name}
                  </Link>
                  {index < navItems.length - 1 && (
                    <Separator className="h-5 bg-[#16a34a] opacity-50" orientation="vertical" />
                  )}
                </React.Fragment>
              ))}
            </nav>
          </div>

          {/* Mobile Navigation Placeholder */}
          <Button variant="ghost" className="md:hidden" disabled>
            <Menu className="h-6 w-6 text-black" />
            <span className="sr-only">Toggle menu</span>
          </Button>
        </div>
      </header>
    );
  }

  return (
    <motion.header
      className="sticky top-0 z-50 border-b bg-white backdrop-blur supports-[backdrop-filter]:bg-white/60"
      variants={sectionVariants}
      initial="hidden"
      animate="visible"
    >
      <div className="container mx-auto flex h-16 items-center px-4 justify-between">
        {/* Logo with Title */}
        <Link href="/" className="flex items-center space-x-2">
          <Image
            src="/images/logo-white.png"
            alt="CHMSU Fisheries Logo"
            width={60}
            height={15}
            className="object-contain"
            priority
          />
          <span className="text-xl font-pacifico text-black">CHMSU Fisheries</span>
        </Link>

        {/* Centered Navigation */}
        <div className="flex-1 flex items-center justify-center absolute left-0 right-0">
          <nav className="hidden md:flex items-center space-x-6">
            {navItems.map((item, index) => (
              <React.Fragment key={item.name}>
                <Link
                  href={item.href}
                  className="text-sm font-bold text-black hover:text-[#16a34a] transition-colors"
                  onClick={(e) => {
                    if (item.href.startsWith("#")) {
                      e.preventDefault();
                      const element = document.querySelector(item.href);
                      if (element) {
                        element.scrollIntoView({ behavior: "smooth" });
                      }
                    }
                  }}
                >
                  {item.name}
                </Link>
                {index < navItems.length - 1 && (
                  <Separator className="h-5 bg-[#16a34a] opacity-50" orientation="vertical" />
                )}
              </React.Fragment>
            ))}
          </nav>
        </div>

        {/* Mobile Navigation - Only rendered on client */}
        <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" className="md:hidden">
              <Menu className="h-6 w-6 text-black" />
              <span className="sr-only">Toggle menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent
            side="right"
            className="w-[240px] flex flex-col justify-between bg-white"
          >
            {/* Add SheetTitle here */}
            <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
            
            <nav className="flex flex-col gap-4 text-center pt-6">
              {navItems.map((item, index) => (
                <React.Fragment key={item.name}>
                  <Link
                    href={item.href}
                    className="text-sm font-bold text-black hover:text-[#16a34a] transition-colors"
                    onClick={(e) => {
                      e.preventDefault();
                      setIsMenuOpen(false);
                      
                      if (item.href === "/") {
                        // If home, scroll to top
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      } else if (item.href.startsWith("#")) {
                        // Scroll to section
                        setTimeout(() => {
                          const element = document.querySelector(item.href);
                          if (element) {
                            element.scrollIntoView({ behavior: "smooth" });
                          }
                        }, 100);
                      }
                    }}
                  >
                    {item.name}
                  </Link>
                  {index < navItems.length - 1 && (
                    <Separator className="my-2 bg-black opacity-50" />
                  )}
                </React.Fragment>
              ))}
            </nav>
          </SheetContent>
        </Sheet>
      </div>
    </motion.header>
  );
}