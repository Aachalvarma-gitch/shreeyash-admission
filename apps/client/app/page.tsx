"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Cpu, Pill, Briefcase, Monitor, FlaskConical, Calculator } from "lucide-react";
import TrainingPlacementSection from "./components/TrainingPlacementSection";
import WhyChooseSection from "./components/WhyChooseSection";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      <SiteHeader />

      {/* Hero Section */}
      <section className="pt-20 w-full">
        <video
          autoPlay
          loop
          muted
          playsInline
          className="w-full h-[60vh] lg:h-[70vh] object-cover"
        >
          <source src="https://sycet.org/images/intro.mp4" type="video/mp4" />
        </video>
      </section>

      {/* About Section */}
      <section id="about" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="relative h-[400px] rounded-2xl overflow-hidden shadow-xl">
              <Image
                src="https://images.unsplash.com/photo-1607013407627-6ee814329547?q=80&w=1564&auto=format&fit=crop"
                alt="Library"
                fill
                className="object-cover"
              />
            </div>
            <div className="space-y-6">
              <span className="text-green-600 font-semibold tracking-wider uppercase">About Us</span>
              <h2 className="text-4xl font-bold text-gray-900">
                Excellence in Education Since 1999
              </h2>
              <p className="text-lg text-gray-600 leading-relaxed">
                Shreeyash Pratishthan is one of the leading educational institutions in Maharashtra,
                committed to providing quality education that transforms young minds into skilled professionals.
              </p>
              <p className="text-lg text-gray-600 leading-relaxed">
                Our campus offers state-of-the-art infrastructure, experienced faculty, and a learning
                environment that fosters academic excellence and personal growth.
              </p>
              <div className="grid grid-cols-2 gap-4 pt-4">
                <div className="p-4 bg-white rounded-lg shadow">
                  <p className="text-2xl font-bold text-green-600">25+</p>
                  <p className="text-gray-500">Years Experience</p>
                </div>
                <div className="p-4 bg-white rounded-lg shadow">
                  <p className="text-2xl font-bold text-green-600">95%</p>
                  <p className="text-gray-500">Placement Rate</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Courses Section */}
      <section id="courses" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="text-green-600 font-semibold tracking-wider uppercase">Our Courses</span>
            <h2 className="text-4xl font-bold text-gray-900 mt-2">Academic Programs</h2>
            <p className="text-xl text-gray-600 mt-4 max-w-2xl mx-auto">
              Choose from a wide range of professional courses designed to match industry demands
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                title: "Engineering",
                desc: "Computer, Civil, Mechanical, Electrical",
                seats: 180,
                icon: <Cpu className="w-8 h-8" />,
                color: "bg-blue-100 text-blue-600",
                image: "https://media.istockphoto.com/id/1352073774/photo/young-man-or-student-making-drone-by-soldering-wires-to-baord-at-home-concept-of-drone-repair.jpg?s=1024x1024&w=is&k=20&c=ZW9zpiKcTnydsakbnTyaG1UlBqoQGo--sNOySO5jgEA="
              },
              {
                title: "Pharmacy",
                desc: "D.Pharma, B.Pharma",
                seats: 120,
                icon: <Pill className="w-8 h-8" />,
                color: "bg-green-100 text-green-600",
                image: "https://plus.unsplash.com/premium_photo-1725534268524-f0869edef805?q=80&w=2070&auto=format&fit=crop"
              },
              {
                title: "Management",
                desc: "MBA, MMS",
                seats: 120,
                icon: <Briefcase className="w-8 h-8" />,
                color: "bg-purple-100 text-purple-600",
                image: "https://images.unsplash.com/photo-1630331513451-829c6ba030c3?q=80&w=2070&auto=format&fit=crop"
              },
              {
                title: "Computer Application",
                desc: "BCA, MCA",
                seats: 180,
                icon: <Monitor className="w-8 h-8" />,
                color: "bg-cyan-100 text-cyan-600",
                image: "https://images.unsplash.com/photo-1569653402334-2e98fbaa80ee?q=80&w=2831&auto=format&fit=crop"
              },
              {
                title: "Science",
                desc: "B.Sc, M.Sc",
                seats: 160,
                icon: <FlaskConical className="w-8 h-8" />,
                color: "bg-orange-100 text-orange-600",
                image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTl6yb2bXeMOzbBPYMEW4eTRIEwwMq1nX5PXg&s"
              },
              {
                title: "Commerce",
                desc: "B.Com, M.Com",
                seats: 120,
                icon: <Calculator className="w-8 h-8" />,
                color: "bg-pink-100 text-pink-600",
                image: "https://www.collegenp.com/uploads/2024/10/bit-student.jpg"
              },
            ].map((course, i) => (
              <div key={i} className="bg-white border border-gray-100 rounded-2xl overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-1 group">
                <div className="relative h-48 overflow-hidden">
                  <Image
                    src={course.image}
                    alt={course.title}
                    fill
                    className="object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <div className={`absolute bottom-4 left-4 w-12 h-12 ${course.color} rounded-xl flex items-center justify-center`}>
                    {course.icon}
                  </div>
                </div>
                <div className="p-6">
                  <h3 className="text-xl font-bold text-gray-900 group-hover:text-green-600 transition">
                    {course.title}
                  </h3>
                  <p className="text-gray-500 mt-2">{course.desc}</p>
                  <div className="flex items-center justify-between mt-4">
                    <span className="text-sm text-green-600 font-medium">{course.seats} Seats</span>
                    <Link
                      href="/contact"
                      className="text-sm text-green-600 hover:text-green-700 font-medium flex items-center gap-1"
                    >
                      Enquire <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center mt-12">
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-semibold"
            >
              View All Courses <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Training & Placement Section */}
      <WhyChooseSection />
      <TrainingPlacementSection />

      {/* Find Us Section */}
      <section className="py-20 bg-gray-50">
        <div className=" mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <span className="text-green-600 font-semibold tracking-wider uppercase">Location</span>
            <h2 className="text-4xl font-bold text-gray-900 mt-2">Find Us</h2>
            <p className="text-xl text-gray-600 mt-4">
              Visit our campus at Gut No.258(P), Satara Parisar, Beed Bypass Road
            </p>
          </div>
          <div className="w-full  h-[600px] rounded-xl overflow-hidden shadow-xl">

            <iframe
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3752.9960514979284!2d75.4182455!3d19.84012!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3bdb98ad174f013d%3A0x6f6908b53576bc04!2sShreeyash%20Pratishthan!5e0!3m2!1sen!2sin!4v1777198766393!5m2!1sen!2sin"
              width="100%"
              height="100%"
              style={{ border: 0 }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-green-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold text-white mb-4">
            Ready to Transform Your Future?
          </h2>
          <p className="text-xl text-green-100 mb-8">
            Join Shreeyash Pratishthan today and start your journey towards a successful career
          </p>
          <Link
            href="/register"
            className="inline-block px-8 py-4 bg-white text-green-600 rounded-lg hover:bg-gray-100 transition font-semibold"
          >
            Apply Now
          </Link>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
