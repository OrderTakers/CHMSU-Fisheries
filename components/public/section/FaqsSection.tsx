"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { motion, Variants } from "framer-motion";

const sectionVariants: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: "easeOut" } },
};

export default function FaqsSection() {
  const faqs = [
    {
      question: "How do I borrow equipment?",
      answer: "Sign up or log in to reserve equipment through our online system. Ensure you have approval from your supervisor and check equipment availability."
    },
    {
      question: "Who can use the system?",
      answer: "Registered students and researchers at CHMSU Binalbagan can use the system. Please contact the fisheries office for registration."
    },
  ];

  return (
    <section id="faqs" className="py-12 bg-white flex justify-center">
      <motion.div
        className="text-center px-4 sm:px-6 lg:px-8 max-w-4xl"
        variants={sectionVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: false }}
      >
        <h2 className="text-3xl font-bold text-[#16a34a] tracking-wide mb-4">
          Frequently Asked Questions about Equipment Borrowing
        </h2>
        <p className="text-black leading-relaxed mb-6 max-w-md mx-auto">
          Find answers to common questions about our equipment borrowing system at CHMSU.
        </p>
        <Accordion type="single" collapsible className="w-full">
          {faqs.map((faq, index) => (
            <AccordionItem key={index} value={`item-${index}`} className="border-b border-gray-200">
              <AccordionTrigger className="text-lg font-semibold text-black hover:text-[#16a34a] py-4">
                {faq.question}
              </AccordionTrigger>
              <AccordionContent className="text-sm text-black p-4 bg-gray-50">
                {faq.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </motion.div>
    </section>
  );
}