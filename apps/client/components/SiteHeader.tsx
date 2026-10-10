"use client";

import Link from "next/link";
import Image from "next/image";

export default function SiteHeader() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-12 h-12 relative">
              <Image
                src="/favicon.webp"
                alt="Shreeyash Pratishthan"
                fill
                className="object-contain"
              />
            </div>
            <span className="text-xl font-bold text-gray-900">Shreeyash Pratishthan</span>
          </Link>

          <nav className="hidden md:flex items-center gap-8">
            <Link href="/#about" className="text-gray-600 hover:text-green-600 transition">About</Link>
            <Link href="/#courses" className="text-gray-600 hover:text-green-600 transition">Courses</Link>
            <Link href="/#facilities" className="text-gray-600 hover:text-green-600 transition">Facilities</Link>
            <Link href="/contact" className="text-gray-600 hover:text-green-600 transition">Contact</Link>
            <Link
              href="/login"
              className="px-5 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium"
            >
              Student Login
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
}
