import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles } from "lucide-react";

const CTASection = () => {
  const navigate = useNavigate();

  return (
    <section className="section-padding relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-r from-cardinal/20 via-transparent to-amber/20" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/10 rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto px-4 md:px-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="max-w-4xl mx-auto text-center"
        >
          <motion.div
            animate={{ rotate: [0, 5, -5, 0] }}
            transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
            className="inline-block mb-6"
          >
            <Sparkles className="w-12 h-12 text-amber" />
          </motion.div>

          <h2 className="font-display text-3xl md:text-5xl lg:text-6xl font-bold mb-6">
            Ready to Transform
            <br />
            <span className="text-gradient">Your Hiring?</span>
          </h2>

          <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
            Join thousands of companies and candidates already experiencing the 
            future of recruitment. Start for free today.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              variant="hero"
              size="xl"
              onClick={() => navigate("/auth?mode=signup")}
              className="group pulse-glow"
            >
              Start Hiring Now
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Button>
            <Button
              variant="glass"
              size="xl"
              onClick={() => navigate("/auth?mode=signup&role=talent")}
            >
              Find Your Dream Job
            </Button>
          </div>

          <p className="mt-6 text-sm text-muted-foreground">
            No credit card required • Free tier available • Cancel anytime
          </p>
        </motion.div>
      </div>
    </section>
  );
};

export default CTASection;
