import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { User, Building2, Users, ShieldCheck, ArrowRight, TrendingUp } from "lucide-react";

const roles = [
  {
    id: "talent",
    icon: User,
    title: "Job Seeker",
    description:
      "Find your dream job with AI-powered matching. Upload your resume and let opportunities find you.",
    features: ["AI Job Matching", "Auto Apply Feature", "Interview Prep"],
    color: "from-cyan-500 to-blue-500",
  },
  {
    id: "investor",
    icon: TrendingUp,
    title: "Investor",
    description:
      "Discover deal flow and connect with founders. Build your investor profile and explore opportunities.",
    features: ["Deal Flow", "Startup Network", "Early-Stage Opportunities"],
    color: "from-emerald-500 to-teal-500",
  },
  {
    id: "employer",
    icon: Building2,
    title: "Employer",
    description:
      "Post jobs and discover top talent. Our AI does the heavy lifting to find your perfect candidates.",
    features: ["Smart Sourcing", "Candidate Ranking", "Team Collaboration"],
    color: "from-cardinal to-cardinal-light",
  },
  {
    id: "recruiter",
    icon: Users,
    title: "Recruiter",
    description:
      "Manage multiple clients and placements. Powerful tools to scale your recruiting business.",
    features: ["Multi-Org Support", "Natural Language Search", "Bulk Actions"],
    color: "from-amber to-gold",
  },
  {
    id: "admin",
    icon: ShieldCheck,
    title: "Administrator",
    description:
      "Full platform control. Manage organizations, users, and system-wide settings.",
    features: ["User Management", "Analytics", "System Config"],
    color: "from-violet-500 to-purple-500",
  },
];

const RolesSection = () => {
  const navigate = useNavigate();

  return (
    <section className="section-padding relative">
      <div className="container mx-auto px-4 md:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="inline-block px-4 py-1 rounded-full bg-amber/10 text-amber text-sm font-medium mb-4">
            Who It's For
          </span>
          <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
            Built for <span className="text-gradient-gold">Everyone</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Whether you're hiring or looking to get hired, CardinalTalent has the tools you need.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {roles.map((role, index) => (
            <motion.div
              key={role.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="role-card group"
            >
              <div
                className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${role.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}
              >
                <role.icon className="w-7 h-7 text-white" />
              </div>
              <h3 className="font-display text-xl font-semibold mb-2">
                {role.title}
              </h3>
              <p className="text-muted-foreground text-sm mb-4 leading-relaxed">
                {role.description}
              </p>
              <ul className="space-y-2 mb-6">
                {role.features.map((feature) => (
                  <li
                    key={feature}
                    className="flex items-center gap-2 text-sm text-muted-foreground"
                  >
                    <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                    {feature}
                  </li>
                ))}
              </ul>
              <Button
                variant="ghost"
                size="sm"
                className="group/btn w-full"
                onClick={() => navigate(role.id === "investor" ? "/auth/investor" : `/auth?mode=signup&role=${role.id}`)}
              >
                Get Started
                <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
              </Button>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default RolesSection;
