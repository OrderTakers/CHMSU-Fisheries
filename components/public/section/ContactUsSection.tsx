"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion, Variants } from "framer-motion";
import { useState } from "react";
import { toast } from "sonner";

const sectionVariants: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: "easeOut" } },
};

export default function ContactUsSection() {
  const [rating, setRating] = useState<number>(5);
  const [comment, setComment] = useState("");
  const [userRole, setUserRole] = useState<"student" | "faculty">("student");
  const [year, setYear] = useState<string>("");
  const [section, setSection] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!comment) {
      toast.error("Please enter your feedback message.", {
        className: "bg-red-50 text-red-700 border border-red-200 rounded-md shadow-sm py-2 px-4 text-sm font-medium",
        duration: 4000,
      });
      return;
    }

    // Validate student details if role is student
    if (userRole === "student" && (!year || !section)) {
      toast.error("Please provide your year and section.", {
        className: "bg-red-50 text-red-700 border border-red-200 rounded-md shadow-sm py-2 px-4 text-sm font-medium",
        duration: 4000,
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Generate anonymous user ID (in a real app, you might want to use a more robust method)
      const anonymousUserId = `anon_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

      const feedbackData = {
        rating,
        comment,
        userRole,
        userRoleDetails: userRole === "student" ? {
          year: parseInt(year),
          section: section.toUpperCase()
        } : undefined,
        anonymousUserId,
        appVersion: "1.0.0", // You can get this from your app config
        deviceInfo: navigator.userAgent // Or use a library to get more detailed device info
      };

      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(feedbackData),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success("Feedback submitted successfully! Thank you for your input.", {
          className: "bg-green-100 text-green-800 border border-green-600 rounded-md shadow-sm py-2 px-4 text-sm font-medium",
          duration: 4000,
        });
        // Reset form
        setRating(5);
        setComment("");
        setUserRole("student");
        setYear("");
        setSection("");
      } else {
        toast.error(data.error || data.message || "Failed to submit feedback. Please try again.", {
          className: "bg-red-50 text-red-700 border border-red-200 rounded-md shadow-sm py-2 px-4 text-sm font-medium",
          duration: 4000,
        });
      }
    } catch (error) {
      toast.error("Network error. Please try again.", {
        className: "bg-red-50 text-red-700 border border-red-200 rounded-md shadow-sm py-2 px-4 text-sm font-medium",
        duration: 4000,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section id="contact-us" className="py-12 bg-white flex justify-center">
      <motion.div
        className="text-center px-4 sm:px-6 lg:px-8 max-w-5xl"
        variants={sectionVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: false }}
      >
        <h2 className="text-3xl font-bold text-[#16a34a] tracking-wide mb-4">
          Contact Our Fisheries Team
        </h2>
        <p className="text-black leading-relaxed mb-6 max-w-md mx-auto">
          Reach out to our team for inquiries about fisheries research, equipment, or collaboration at CHMSU.
        </p>
        <Card className="flex flex-col lg:flex-row gap-6 shadow-md">
          <CardContent className="p-6 flex-1">
            <CardHeader>
              <CardTitle className="text-xl font-semibold text-black mb-4">
                Give Us Feedback
              </CardTitle>
            </CardHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Rating Field */}
              <div>
                <Label htmlFor="rating" className="text-black text-sm font-medium">
                  Rating (1-5)
                </Label>
                <Select
                  value={rating.toString()}
                  onValueChange={(value) => setRating(parseInt(value))}
                  disabled={isSubmitting}
                >
                  <SelectTrigger className="bg-white border-gray-300 text-sm px-3 py-2">
                    <SelectValue placeholder="Select rating" />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5].map((num) => (
                      <SelectItem key={num} value={num.toString()}>
                        {num} {num === 1 ? '⭐' : num === 2 ? '⭐⭐' : num === 3 ? '⭐⭐⭐' : num === 4 ? '⭐⭐⭐⭐' : '⭐⭐⭐⭐⭐'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* User Role Field */}
              <div>
                <Label htmlFor="userRole" className="text-black text-sm font-medium">
                  You are a:
                </Label>
                <Select
                  value={userRole}
                  onValueChange={(value: "student" | "faculty") => setUserRole(value)}
                  disabled={isSubmitting}
                >
                  <SelectTrigger className="bg-white border-gray-300 text-sm px-3 py-2">
                    <SelectValue placeholder="Select your role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="student">Student</SelectItem>
                    <SelectItem value="faculty">Faculty</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Student Details (only show if role is student) */}
              {userRole === "student" && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="year" className="text-black text-sm font-medium">
                        Year
                      </Label>
                      <Select
                        value={year}
                        onValueChange={setYear}
                        disabled={isSubmitting}
                      >
                        <SelectTrigger className="bg-white border-gray-300 text-sm px-3 py-2">
                          <SelectValue placeholder="Select year" />
                        </SelectTrigger>
                        <SelectContent>
                          {[1, 2, 3, 4].map((yr) => (
                            <SelectItem key={yr} value={yr.toString()}>
                              Year {yr}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="section" className="text-black text-sm font-medium">
                        Section
                      </Label>
                      <Input
                        id="section"
                        type="text"
                        placeholder="e.g., A, B, C"
                        className="bg-white border-gray-300 text-sm px-3 py-2 focus:border-[#16a34a] focus:ring-[#16a34a] uppercase"
                        value={section}
                        onChange={(e) => setSection(e.target.value)}
                        disabled={isSubmitting}
                        required={userRole === "student"}
                      />
                    </div>
                  </div>
                </>
              )}

              {/* Comment Field */}
              <div>
                <Label htmlFor="comment" className="text-black text-sm font-medium">
                  Your Feedback
                </Label>
                <Textarea
                  id="comment"
                  placeholder="Share your thoughts, suggestions, or concerns..."
                  className="bg-white border-gray-300 text-sm px-3 py-2 focus:border-[#16a34a] focus:ring-[#16a34a] min-h-[120px] resize-none"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  required
                  disabled={isSubmitting}
                />
              </div>

              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-[#16a34a] text-white hover:bg-green-700 font-semibold py-2 rounded-md transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? "Submitting..." : "Submit Feedback"}
              </Button>
            </form>
          </CardContent>
          <CardContent className="p-6 flex-1 bg-gray-50">
            <CardHeader>
              <CardTitle className="text-xl font-semibold text-black mb-4">
                Contact Details
              </CardTitle>
            </CardHeader>
            <div className="space-y-4">
              <p className="text-black text-sm">
                <strong>Email:</strong> aniceto.olmedo@chmsu.edu.ph
              </p>
              <p className="text-black text-sm">
                <strong>Phone:</strong> +63 915 351 0374
              </p>
              <p className="text-black text-sm">
                <strong>Address:</strong> CHMSU Binalbagan Campus, Negros Occidental, Philippines
              </p>
              <p className="text-black text-sm">
                <strong>Hours:</strong> Mon-Fri, 8:00 AM - 5:00 PM (PST)
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </section>
  );
}