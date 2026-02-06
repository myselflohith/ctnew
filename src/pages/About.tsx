import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Target,
  Heart,
  Lightbulb,
  Users,
  ArrowRight,
  Linkedin,
  Twitter,
} from "lucide-react";
import cardinalLogo from "@/assets/cardinal-logo.png";

const values = [
  {
    icon: Target,
    title: "Mission-Driven",
    description: "We're on a mission to make hiring more efficient and equitable for everyone.",
  },
  {
    icon: Heart,
    title: "People First",
    description: "We believe in putting people at the center of every decision we make.",
  },
  {
    icon: Lightbulb,
    title: "Innovation",
    description: "We leverage cutting-edge AI to solve real problems in talent acquisition.",
  },
  {
    icon: Users,
    title: "Community",
    description: "We're building a community of employers and talent who share our vision.",
  },
];

const team = [
  {
    name: "Sarah Chen",
    role: "CEO & Co-founder",
    bio: "Former VP of Engineering at a Fortune 500 company with 15+ years in tech.",
  },
  {
    name: "Michael Rodriguez",
    role: "CTO & Co-founder",
    bio: "AI researcher with a PhD from Stanford, previously at Google AI.",
  },
  {
    name: "Emily Thompson",
    role: "Head of Product",
    bio: "Product leader with experience at LinkedIn and Indeed.",
  },
  {
    name: "David Kim",
    role: "Head of Growth",
    bio: "Growth expert who scaled multiple startups from seed to Series C.",
  },
];

const About = () => {
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
            <div className="flex justify-center mb-6">
              <img src={cardinalLogo} alt="CardinalTalent" className="w-20 h-20" />
            </div>
            <h1 className="font-display text-4xl md:text-6xl font-bold text-foreground mb-6">
              About <span className="text-gradient">CardinalTalent</span>
            </h1>
            <p className="text-muted-foreground text-lg md:text-xl max-w-3xl mx-auto">
              We're building the future of talent acquisition through AI-powered matching, 
              connecting exceptional candidates with companies that value their potential.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Story Section */}
      <section className="py-20 px-4 bg-secondary/30">
        <div className="container mx-auto max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="glass rounded-2xl p-8 md:p-12"
          >
            <h2 className="font-display text-3xl font-bold text-foreground mb-6">
              Our Story
            </h2>
            <div className="space-y-4 text-muted-foreground">
              <p>
                CardinalTalent was founded in 2024 with a simple observation: the traditional 
                hiring process is broken. Employers spend countless hours sifting through 
                resumes, while qualified candidates get lost in the noise.
              </p>
              <p>
                We set out to change this by building an AI-powered platform that truly 
                understands both what employers need and what candidates bring to the table. 
                Our matching algorithm goes beyond keywords to evaluate skills, experience, 
                and potential.
              </p>
              <p>
                Today, CardinalTalent helps hundreds of companies find exceptional talent 
                faster than ever before, while giving job seekers the visibility they deserve.
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-16"
          >
            <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
              Our Values
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              These core principles guide everything we do at CardinalTalent.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {values.map((value, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="glass rounded-2xl p-6 text-center"
              >
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-cardinal/20 to-amber/20 flex items-center justify-center mx-auto mb-4">
                  <value.icon className="w-7 h-7 text-primary" />
                </div>
                <h3 className="font-display text-lg font-semibold text-foreground mb-2">
                  {value.title}
                </h3>
                <p className="text-sm text-muted-foreground">{value.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Team Section */}
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
              Meet the Team
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              We're a team of engineers, designers, and recruiters passionate about 
              transforming how people find jobs.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {team.map((member, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="glass rounded-2xl p-6 text-center"
              >
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-cardinal to-amber flex items-center justify-center mx-auto mb-4 text-white font-bold text-2xl">
                  {member.name.split(' ').map(n => n[0]).join('')}
                </div>
                <h3 className="font-display text-lg font-semibold text-foreground mb-1">
                  {member.name}
                </h3>
                <p className="text-sm text-primary mb-3">{member.role}</p>
                <p className="text-sm text-muted-foreground mb-4">{member.bio}</p>
                <div className="flex justify-center gap-3">
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <Linkedin className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <Twitter className="w-4 h-4" />
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="glass rounded-2xl p-8 md:p-12 text-center"
          >
            <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
              Join the CardinalTalent Community
            </h2>
            <p className="text-muted-foreground text-lg mb-8 max-w-2xl mx-auto">
              Whether you're looking for your next opportunity or searching for top talent, 
              we're here to help you succeed.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button variant="hero" size="lg" onClick={() => navigate("/auth?mode=signup")}>
                Get Started
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
              <Button variant="outline" size="lg" onClick={() => navigate("/jobs")}>
                Browse Jobs
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default About;
