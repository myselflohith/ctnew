import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles, Zap, TrendingUp } from "lucide-react";

const HeroSection = () => {
  const navigate = useNavigate();

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20">
      {/* Animated background */}
      <div className="absolute inset-0 animated-gradient" />
      
      {/* Flowing wave effect - inspired by noon.ai */}
      <div className="absolute inset-0 overflow-hidden">
        <svg
          className="absolute bottom-0 left-0 right-0 w-full h-[60%] wave-flow"
          viewBox="0 0 1440 600"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="waveGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="hsl(349, 78%, 44%)" stopOpacity="0.3" />
              <stop offset="50%" stopColor="hsl(38, 92%, 50%)" stopOpacity="0.5" />
              <stop offset="100%" stopColor="hsl(45, 93%, 47%)" stopOpacity="0.3" />
            </linearGradient>
          </defs>
          <path
            d="M0,300 C200,250 400,350 600,300 C800,250 1000,350 1200,300 C1350,270 1440,300 1440,300 L1440,600 L0,600 Z"
            fill="url(#waveGradient)"
          />
          <path
            d="M0,350 C200,300 400,400 600,350 C800,300 1000,400 1200,350 C1350,320 1440,350 1440,350 L1440,600 L0,600 Z"
            fill="url(#waveGradient)"
            opacity="0.5"
          />
          <path
            d="M0,400 C200,350 400,450 600,400 C800,350 1000,450 1200,400 C1350,370 1440,400 1440,400 L1440,600 L0,600 Z"
            fill="url(#waveGradient)"
            opacity="0.3"
          />
        </svg>
      </div>

      {/* Radial glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-radial opacity-50" />

      {/* Content */}
      <div className="relative z-10 container mx-auto px-4 md:px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-8"
        >
          <Sparkles className="w-4 h-4 text-amber" />
          <span className="text-sm font-medium text-foreground">
            AI-Powered Talent Matching
          </span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="font-display text-4xl md:text-6xl lg:text-7xl font-bold mb-6 leading-tight"
        >
          Find Your Perfect
          <br />
          <span className="text-gradient">Career Match</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10"
        >
          CardinalTalent uses advanced AI to connect exceptional talent with 
          forward-thinking companies. Experience smarter, faster hiring.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.5 }}
          className="flex flex-col sm:flex-row gap-4 justify-center"
        >
          <Button 
            variant="hero" 
            size="xl"
            onClick={() => navigate("/auth?mode=signup")}
            className="group"
          >
            Get Started Free
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Button>
          <Button 
            variant="heroOutline" 
            size="xl"
            onClick={() => navigate("/employers")}
          >
            For Employers
          </Button>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.7 }}
          className="mt-16 md:mt-24 grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto"
        >
          {[
            { value: "50K+", label: "Active Jobs" },
            { value: "100K+", label: "Candidates" },
            { value: "5K+", label: "Companies" },
            { value: "95%", label: "Match Rate" },
          ].map((stat, index) => (
            <div key={stat.label} className="text-center">
              <div className="text-3xl md:text-4xl font-display font-bold text-gradient-gold mb-1">
                {stat.value}
              </div>
              <div className="text-sm text-muted-foreground">{stat.label}</div>
            </div>
          ))}
        </motion.div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
      >
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="w-6 h-10 rounded-full border-2 border-muted-foreground/30 flex items-start justify-center p-2"
        >
          <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground" />
        </motion.div>
      </motion.div>
    </section>
  );
};

export default HeroSection;
