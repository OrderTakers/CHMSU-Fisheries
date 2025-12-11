import Link from "next/link";

export default function FooterSection() {
  return (
    <section
      id="footer"
      className="py-10 bg-green-600 text-white"
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-6xl">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-center sm:text-left">
          <div>
            <h3 className="text-lg font-semibold mb-4">
              CHMSU Fisheries System
            </h3>
            <p className="text-sm text-gray-200">
              Supporting marine research at CHMSU Binalbagan.
            </p>
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-4">
              Quick Links
            </h3>
            <ul className="space-y-2">
              <li>
                <Link href="/about" className="text-sm text-gray-200 hover:underline">
                  About
                </Link>
              </li>
              <li>
                <Link href="/equipment" className="text-sm text-gray-200 hover:underline">
                  Equipment
                </Link>
              </li>
              <li>
                <Link href="/faqs" className="text-sm text-gray-200 hover:underline">
                  FAQs
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-4">
              Contact
            </h3>
            <p className="text-sm text-gray-200">
              Email: fisheries@chmsu.edu.ph
            </p>
            <p className="text-sm text-gray-200">
              Phone: (123) 456-7890
            </p>
          </div>
        </div>
        <p className="text-center text-sm text-gray-200 mt-6">
          &copy; 2025 CHMSU Binalbagan. All rights reserved.
        </p>
      </div>
    </section>
  );
}