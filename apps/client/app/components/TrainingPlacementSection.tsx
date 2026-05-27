import { Briefcase, Award, ExternalLink, Users, Camera, Globe } from "lucide-react";

interface RecruiterItemProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

function RecruiterItem({ icon, title, description }: RecruiterItemProps) {
  return (
    <div className="flex items-start gap-5">
      <div className="flex-shrink-0 w-14 h-14 rounded-full bg-orange-100 flex items-center justify-center text-orange-600">
        {icon}
      </div>
      <div>
        <h4 className="text-lg font-semibold text-gray-900 mb-2">{title}</h4>
        <p className="text-base text-gray-600 leading-relaxed">{description}</p>
      </div>
    </div>
  );
}

interface SocialButtonProps {
  icon: React.ReactNode;
  label: string;
  href: string;
  gradient?: boolean;
  solidColor?: string;
}

function SocialButton({ icon, label, href, gradient, solidColor }: SocialButtonProps) {
  const baseClasses = "w-[260px] h-14 rounded-[14px] flex items-center justify-center gap-3 text-white font-semibold transition-transform hover:scale-105";

  let styleClasses = baseClasses;
  if (gradient) {
    styleClasses += " bg-gradient-to-r from-[#833AB4] via-[#FD1D1D] to-[#FCAF45]";
  } else if (solidColor) {
    styleClasses += solidColor;
  } else {
    styleClasses += " bg-[#0F3D3E]";
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={styleClasses}
      style={solidColor ? { backgroundColor: solidColor } : undefined}
    >
      {icon}
      <span>{label}</span>
    </a>
  );
}

export default function TrainingPlacementSection() {
  return (
    <section className="py-16 bg-gray-50">
      <div className="max-w-[1200px] mx-auto px-5">
        <div className="text-center mb-12">
          <h2 className="text-[36px] font-bold text-[#1F4F5A] mb-4">
            TRAINING & PLACEMENT <span className="text-[#E86A33]">CELL</span>
          </h2>
          <div className="w-[80px] h-[3px] bg-[#E86A33] mx-auto" />
        </div>

        <div className="grid lg:grid-cols-2 gap-[60px] items-start">
          {/* Left Section - Our Recruiters */}
          <div>
            <h3 className="text-2xl font-semibold text-gray-900 mb-2">Our Recruiters</h3>
            <p className="text-gray-500 mb-8">
              Leading companies that recruit from our campus
            </p>

            <div className="space-y-8">
              <RecruiterItem
                icon={<Briefcase className="w-7 h-7" />}
                title="Industry Partnerships"
                description="We maintain strong relationships with top companies across various sectors, ensuring excellent placement opportunities for our students."
              />
              <RecruiterItem
                icon={<Award className="w-7 h-7" />}
                title="Career Excellence"
                description="Our dedicated placement cell provides comprehensive training, resume building, and interview preparation to ensure student success."
              />
            </div>
          </div>

          {/* Right Section - Placement Stories */}
          <div>
            <h3 className="text-2xl font-semibold text-gray-900 mb-2">Placement Stories</h3>
            <p className="text-gray-500 mb-8">
              Follow our placement cell for updates and stories
            </p>

            <div className="flex flex-col gap-5">
              <SocialButton
                icon={<Users className="w-6 h-6" />}
                label="Facebook"
                href="https://www.facebook.com/people/Shreeyash-Placement-Cell/61559394180654/"
                solidColor="#4267B2"
              />
              <SocialButton
                icon={<Camera className="w-6 h-6" />}
                label="Instagram"
                href="https://www.instagram.com/shreeyash_placement_cell/"
                gradient
              />
              <SocialButton
                icon={<Globe className="w-6 h-6" />}
                label="Website"
                href="https://syp.ac.in/training-placement-cell"
                solidColor="#0F3D3E"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}