import { motion } from "framer-motion";
import {
  Sparkles,
  Target,
  Clock,
  Shield,
  BarChart3,
  Users,
  Brain,
  Zap,
} from "lucide-react";

const features = [
  {
    icon: Brain,
    title: "AI-Powered Matching",
    description:
      "Our advanced AI analyzes skills, experience, and cultural fit to find perfect candidate-job matches.",
  },
  {
    icon: Target,
    title: "Smart Sourcing",
    description:
      "Automatically source qualified candidates from your talent pool based on job requirements.",
  },
  {
    icon: Sparkles,
    title: "AI Interviews",
    description:
      "Generate intelligent interview questions based on job descriptions and screen candidates efficiently.",
  },
  {
    icon: Clock,
    title: "Auto Apply",
    description:
      "Premium candidates get auto-applied to matching jobs as they're posted. Set it and forget it.",
  },
  {
    icon: BarChart3,
    title: "Analytics Dashboard",
    description:
      "Track hiring metrics, candidate pipelines, and recruitment performance in real-time.",
  },
  {
    icon: Shield,
    title: "Enterprise Security",
    description:
      "Bank-level encryption and compliance with SOC 2, GDPR, and other security standards.",
  },
];

const FeaturesSection = () => {
  return (
    <section className="section-padding relative overflow-hidden bg-card/30">
      {/* Subtle background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/5 to-transparent" />

      <div className="container mx-auto px-4 md:px-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="inline-block px-4 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
            Features
          </span>
          <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
            Recruitment,{" "}
            <span className="text-gradient">Reimagined</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Everything you need to hire smarter and faster, powered by cutting-edge AI technology.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="group glass glass-hover rounded-2xl p-6"
            >
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cardinal/20 to-amber/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                <feature.icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-display text-xl font-semibold mb-2">
                {feature.title}
              </h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
