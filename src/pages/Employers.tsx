import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Users,
  Sparkles,
  Target,
  Clock,
  BarChart3,
  Zap,
  CheckCircle,
  ArrowRight,
} from "lucide-react";

const features = [
  {
    icon: Sparkles,
    title: "AI-Powered Matching",
    description: "Our AI analyzes job descriptions and candidate profiles to find the perfect match with explainable scoring.",
  },
  {
    icon: Target,
    title: "Quality Candidates",
    description: "Access a curated pool of pre-vetted candidates from top schools and companies.",
  },
  {
    icon: Clock,
    title: "Faster Hiring",
    description: "Reduce time-to-hire by 60% with automated sourcing and AI-assisted screening.",
  },
  {
    icon: BarChart3,
    title: "Analytics Dashboard",
    description: "Track your hiring pipeline with real-time insights and performance metrics.",
  },
];

const benefits = [
  "Post unlimited job listings",
  "AI-generated candidate shortlists",
  "Automated interview scheduling",
  "AI-powered interview questions",
  "Candidate ranking by match score",
  "Integrated communication tools",
];

const Employers = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center mb-16"
          >
            <h1 className="font-display text-4xl md:text-6xl font-bold text-foreground mb-6">
              Hire <span className="text-gradient">Top Talent</span> Faster
            </h1>
            <p className="text-muted-foreground text-lg md:text-xl max-w-3xl mx-auto mb-8">
              CardinalTalent uses AI to match you with the best candidates. Post a job and let our intelligent matching engine do the heavy lifting.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button variant="hero" size="lg" onClick={() => navigate("/auth?mode=signup&role=employer")}>
                Start Hiring
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
              <Button variant="outline" size="lg">
                Schedule Demo
              </Button>
            </div>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-20"
          >
            {[
              { value: "10K+", label: "Active Candidates" },
              { value: "500+", label: "Companies Hiring" },
              { value: "60%", label: "Faster Hiring" },
              { value: "95%", label: "Match Accuracy" },
            ].map((stat, index) => (
              <div key={index} className="glass rounded-2xl p-6 text-center">
                <p className="font-display text-3xl md:text-4xl font-bold text-gradient mb-2">
                  {stat.value}
                </p>
                <p className="text-muted-foreground text-sm">{stat.label}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 bg-secondary/30">
        <div className="container mx-auto max-w-6xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-16"
          >
            <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
              Why Employers Choose CardinalTalent
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Our platform combines AI technology with human expertise to deliver exceptional hiring results.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="glass rounded-2xl p-8"
              >
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-cardinal/20 to-amber/20 flex items-center justify-center mb-6">
                  <feature.icon className="w-7 h-7 text-primary" />
                </div>
                <h3 className="font-display text-xl font-semibold text-foreground mb-3">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-6">
                Everything You Need to <span className="text-gradient">Hire Smarter</span>
              </h2>
              <p className="text-muted-foreground text-lg mb-8">
                From job posting to offer acceptance, CardinalTalent streamlines every step of your hiring process.
              </p>
              <ul className="space-y-4">
                {benefits.map((benefit, index) => (
                  <li key={index} className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-primary shrink-0" />
                    <span className="text-foreground">{benefit}</span>
                  </li>
                ))}
              </ul>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="glass rounded-2xl p-8"
            >
              <h3 className="font-display text-2xl font-semibold text-foreground mb-6">
                Ready to Transform Your Hiring?
              </h3>
              <p className="text-muted-foreground mb-6">
                Join hundreds of companies already hiring smarter with CardinalTalent.
              </p>
              <Button variant="hero" size="lg" className="w-full" onClick={() => navigate("/auth?mode=signup&role=employer")}>
                Get Started Free
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
              <p className="text-center text-sm text-muted-foreground mt-4">
                No credit card required • Free trial available
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Employers;
