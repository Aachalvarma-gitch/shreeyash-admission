"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Users, Camera, Play, MapPin, Phone, Mail, Laptop, Database, Globe, Code } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

export default function SiteFooter() {
  const [showProjectSheet, setShowProjectSheet] = useState(false);

  return (
    <footer className="bg-gray-900 text-gray-300 py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-2 gap-12 mb-12">
          <div>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 relative">
                <Image
                  src="/favicon.webp"
                  alt="Shreeyash Pratishthan"
                  fill
                  className="object-contain"
                />
              </div>
              <span className="text-xl font-bold text-white">Shreeyash Pratishthan</span>
            </div>
            <p className="text-gray-400 mb-6 max-w-md">
              Shreeyash Pratishthan is a leading educational institution committed to providing
              quality education and shaping future leaders.
            </p>
            <div className="flex gap-4">
              <a href="https://facebook.com/shreeyashpratishthan" target="_blank" rel="noopener noreferrer" className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center hover:bg-green-600 transition">
                <Users className="w-5 h-5" />
              </a>
              <a href="https://instagram.com/shreeyashpratishthan" target="_blank" rel="noopener noreferrer" className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center hover:bg-green-600 transition">
                <Camera className="w-5 h-5" />
              </a>
              <a href="https://youtube.com/shreeyashpratishthan" target="_blank" rel="noopener noreferrer" className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center hover:bg-green-600 transition">
                <Play className="w-5 h-5" />
              </a>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8">
            <div>
              <h4 className="text-white font-semibold mb-4">Quick Links</h4>
              <ul className="space-y-3">
                <li><Link href="/#about" className="hover:text-green-500 transition">About Us</Link></li>
                <li><Link href="/#courses" className="hover:text-green-500 transition">Courses</Link></li>
                <li><Link href="/#facilities" className="hover:text-green-500 transition">Facilities</Link></li>
                <li><a href="https://syp.ac.in/training-placement-cell" target="_blank" rel="noopener noreferrer" className="hover:text-green-500 transition">Training & Placement Cell</a></li>
                <li><Link href="/login" className="hover:text-green-500 transition">Student Login</Link></li>
                <li><Link href="/register" className="hover:text-green-500 transition">Admission</Link></li>
                <li><Link href="/contact" className="hover:text-green-500 transition">Contact Us</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="text-white font-semibold mb-4">Contact Info</h4>
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <span className="text-sm">
                    Gut No.258(P), Satara Parisar, Beed Bypass Road,<br />
                    Near SRPF Camp, Tal. & Dist. Chhatrapati Sambhajinagar,<br />
                    Maharashtra 431105
                  </span>
                </li>
                <li className="flex items-center gap-3">
                  <Phone className="w-5 h-5 text-green-500 flex-shrink-0" />
                  <span>+91 98765 43210</span>
                </li>
                <li className="flex items-center gap-3">
                  <Mail className="w-5 h-5 text-green-500 flex-shrink-0" />
                  <span>info@sycet.org</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <Sheet open={showProjectSheet} onOpenChange={setShowProjectSheet}>
          <SheetTrigger asChild>
            <div className="text-center">
              <button className="text-gray-400 hover:text-green-500 transition text-sm cursor-pointer">
                Project developed by Anchal Varma under guidance of Akash Dhone
              </button>
            </div>
          </SheetTrigger>
          <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
            <SheetHeader>
              <SheetTitle>Project Information</SheetTitle>
              <SheetDescription>
                Details about the Shreeyash Pratishthan Admission Portal
              </SheetDescription>
            </SheetHeader>
            <div className="space-y-6 py-6">
              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Laptop className="w-5 h-5" />
                  Frontend
                </h3>
                <ul className="mt-2 space-y-1 text-muted-foreground">
                  <li>• Next.js 16+ (React Framework)</li>
                  <li>• TypeScript</li>
                  <li>• Tailwind CSS</li>
                  <li>• Shadcn UI Components</li>
                  <li>• Redux Toolkit + RTK Query (State Management)</li>
                  <li>• Lucide React Icons</li>
                </ul>
              </div>

              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Database className="w-5 h-5" />
                  Backend & Database
                </h3>
                <ul className="mt-2 space-y-1 text-muted-foreground">
                  <li>• Node.js with Express</li>
                  <li>• MongoDB with Mongoose</li>
                  <li>• JWT Authentication</li>
                  <li>• REST API</li>
                  <li>• Cloudinary (File Storage)</li>
                  <li>• Nodemailer (Emails)</li>
                  <li>• Swagger Documentation</li>
                </ul>
              </div>

              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Globe className="w-5 h-5" />
                  Languages & Tools
                </h3>
                <ul className="mt-2 space-y-1 text-muted-foreground">
                  <li>• TypeScript</li>
                  <li>• HTML5 / CSS3</li>
                  <li>• Turborepo (Monorepo Build System)</li>
                </ul>
              </div>

              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Globe className="w-5 h-5" />
                  Hosting & Deployment
                </h3>
                <ul className="mt-2 space-y-1 text-muted-foreground">
                  <li>• Database: MongoDB Atlas (Cloud)</li>
                  <li>• Frontend: Vercel</li>
                  <li>• Backend API: Vercel</li>
                  <li>• Source Code: GitHub</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Code className="w-5 h-5" />
                  Project Guidance
                </h3>
                <p className="text-muted-foreground mt-2">
                  This project has been developed under the guidance of{' '}
                  <strong>Mr. Akash Dhone</strong> from{' '}
                  <strong>SkillHub IT Solution</strong>.
                </p>
              </div>
            </div>
          </SheetContent>
        </Sheet>

        <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-gray-500">
            &copy; 2024 Shreeyash Pratishthan. All rights reserved.
          </p>
          <div className="flex gap-6 text-sm text-gray-500">
            <Link href="/contact" className="hover:text-green-500 transition">Privacy Policy</Link>
            <Link href="/contact" className="hover:text-green-500 transition">Terms & Conditions</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
