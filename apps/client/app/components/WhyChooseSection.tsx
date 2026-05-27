import { Award, Users, BookOpen, Building, GraduationCap, Star } from "lucide-react";

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  color: string;
}

function FeatureCard({ icon, title, description, color }: FeatureCardProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-[18px] p-[30px_20px] text-center group hover:-translate-y-[6px] hover:shadow-lg transition-all duration-300">
      <div className="w-[60px] h-[60px] mx-auto mb-3 rounded-full flex items-center justify-center" style={{ backgroundColor: `${color}15` }}>
        <div style={{ color }}>
          {icon}
        </div>
      </div>
      <h4 className="text-[16px] font-semibold uppercase text-gray-900 mb-[6px]">{title}</h4>
      <p className="text-[14px] text-gray-500 leading-[1.5] max-w-[220px] mx-auto mb-[14px]">{description}</p>
      <button className="h-[40px] px-[18px] bg-[#0F4C5C] hover:bg-[#0a3a47] text-white rounded-[10px] font-medium flex items-center justify-center gap-2 mx-auto shadow-sm transition-colors">
        Learn More
      </button>
    </div>
  );
}

export default function WhyChooseSection() {
  const features = [
    {
      icon: <Award className="w-8 h-8" />,
      title: "Expert Faculty",
      description: "Learn from industry-experienced professors and professionals dedicated to student success",
      color: "#F59E0B",
    },
    {
      icon: <Building className="w-8 h-8" />,
      title: "Modern Infrastructure",
      description: "State-of-the-art labs, classrooms, and campus facilities for comprehensive learning",
      color: "#2563EB",
    },
    {
      icon: <GraduationCap className="w-8 h-8" />,
      title: "100% Placement",
      description: "Industry partnerships ensuring career opportunities for all eligible students",
      color: "#22C55E",
    },
    {
      icon: <BookOpen className="w-8 h-8" />,
      title: "Diverse Courses",
      description: "Wide range of undergraduate and postgraduate programs across multiple disciplines",
      color: "#F59E0B",
    },
    {
      icon: <Users className="w-8 h-8" />,
      title: "Student Support",
      description: "Dedicated counseling, mentorship programs, and welfare services for holistic development",
      color: "#374151",
    },
    {
      icon: <Star className="w-8 h-8" />,
      title: "Ranked Excellence",
      description: "Consistently ranked among top institutions for academic excellence and innovation",
      color: "#2563EB",
    },
  ];

  return (
    <section className="py-[70px] px-5 bg-gray-50">
      <div className="max-w-[1280px] mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-[38px] font-bold text-[#1E4D57] mb-4">
            WHY CHOOSE SHREEYASH PRATISHTHAN<span className="text-[#E76F3C]">?</span>
          </h2>
          <div className="w-[90px] h-[3px] bg-[#E76F3C] mx-auto" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <FeatureCard
              key={index}
              icon={feature.icon}
              title={feature.title}
              description={feature.description}
              color={feature.color}
            />
          ))}
        </div>
      </div>
    </section>
  );
}