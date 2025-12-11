import { Navbar } from "@/components/public/Navbar";
import HeroSection from "@/components/public/section/HeroSection";
import AboutSection from "@/components/public/section/AboutSection";
import EquipmentSection from "@/components/public/section/EquipmentSection";
import ContactUsSection from "@/components/public/section/ContactUsSection";
import FaqsSection from "@/components/public/section/FaqsSection";
import FooterSection from "@/components/public/section/FooterSection";
import LoginModal from "@/components/public/LoginModal";
import SignupModal from "@/components/public/SignupModal";
import { Toaster } from "sonner";

export default function Home() {
  return (
    <>
      <Navbar />
      <HeroSection />
      {/** Separator between Hero and About */}
      <div className="w-full h-px bg-[#16a34a] opacity-50 my-8 mx-auto max-w-4xl shadow-md" />
      <AboutSection />
      {/** Separator between About and Equipment */}
      <div className="w-full h-px bg-[#16a34a] opacity-50 my-8 mx-auto max-w-4xl shadow-md" />
      <EquipmentSection />
      {/** Separator between Equipment and ContactUs */}
      <div className="w-full h-px bg-[#16a34a] opacity-50 my-8 mx-auto max-w-4xl shadow-md" />
      <ContactUsSection />
      {/** Separator between ContactUs and Faqs */}
      <div className="w-full h-px bg-[#16a34a] opacity-50 my-8 mx-auto max-w-4xl shadow-md" />
      <FaqsSection />
      {/** Separator between Faqs and Footer */}
      <div className="w-full h-px bg-[#16a34a] opacity-50 my-8 mx-auto max-w-4xl shadow-md" />
      <FooterSection />
      <LoginModal />
      <SignupModal />
      
      {/** Single Toaster component for the entire application */}
      <Toaster 
        position="top-right"
        toastOptions={{
          className: "sonner-toast",
          duration: 4000,
        }}
      />
    </>
  );
}