import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import {
  Search,
  MapPin,
  Briefcase,
  Clock,
  DollarSign,
  Filter,
  Building2,
} from "lucide-react";
import { useState } from "react";

const mockJobs = [
  {
    id: "1",
    title: "Senior Data Engineer",
    company: "TechCorp AI",
    location: "San Francisco, CA",
    type: "Hybrid",
    salary: "$180K - $220K",
    posted: "2 days ago",
    skills: ["Python", "Apache Spark", "AWS"],
  },
  {
    id: "2",
    title: "ML Engineer",
    company: "StartupXYZ",
    location: "Seattle, WA",
    type: "Remote",
    salary: "$160K - $200K",
    posted: "3 days ago",
    skills: ["PyTorch", "TensorFlow", "MLOps"],
  },
  {
    id: "3",
    title: "Full Stack Developer",
    company: "Enterprise Inc",
    location: "New York, NY",
    type: "Onsite",
    salary: "$140K - $180K",
    posted: "1 week ago",
    skills: ["React", "Node.js", "PostgreSQL"],
  },
  {
    id: "4",
    title: "DevOps Engineer",
    company: "CloudScale",
    location: "Austin, TX",
    type: "Remote",
    salary: "$150K - $190K",
    posted: "4 days ago",
    skills: ["Kubernetes", "Terraform", "AWS"],
  },
  {
    id: "5",
    title: "Product Manager",
    company: "InnovateTech",
    location: "Boston, MA",
    type: "Hybrid",
    salary: "$130K - $170K",
    posted: "5 days ago",
    skills: ["Agile", "Data Analysis", "Roadmapping"],
  },
];

const Jobs = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [locationQuery, setLocationQuery] = useState("");

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero Section */}
      <section className="pt-32 pb-16 px-4">
        <div className="container mx-auto max-w-6xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center mb-12"
          >
            <h1 className="font-display text-4xl md:text-5xl font-bold text-foreground mb-4">
              Find Your <span className="text-gradient">Dream Job</span>
            </h1>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Discover opportunities at top companies. Our AI-powered matching helps you find roles that fit your skills perfectly.
            </p>
          </motion.div>

          {/* Search Bar */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="glass rounded-2xl p-6 mb-8"
          >
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  placeholder="Job title, skills, or company..."
                  className="pl-12 h-12"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="relative flex-1">
                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  placeholder="Location..."
                  className="pl-12 h-12"
                  value={locationQuery}
                  onChange={(e) => setLocationQuery(e.target.value)}
                />
              </div>
              <Button variant="hero" size="lg" className="h-12">
                Search Jobs
              </Button>
            </div>
            <div className="flex flex-wrap gap-2 mt-4">
              <Badge variant="outline" className="cursor-pointer hover:bg-secondary">Remote</Badge>
              <Badge variant="outline" className="cursor-pointer hover:bg-secondary">Full-time</Badge>
              <Badge variant="outline" className="cursor-pointer hover:bg-secondary">$100K+</Badge>
              <Badge variant="outline" className="cursor-pointer hover:bg-secondary">Engineering</Badge>
            </div>
          </motion.div>

          {/* Job Listings */}
          <div className="space-y-4">
            {mockJobs.map((job, index) => (
              <motion.div
                key={job.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 + index * 0.1 }}
                className="glass rounded-2xl p-6 hover:bg-secondary/50 transition-colors cursor-pointer"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-cardinal/20 to-amber/20 flex items-center justify-center shrink-0">
                      <Building2 className="w-7 h-7 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-display text-xl font-semibold text-foreground mb-1">
                        {job.title}
                      </h3>
                      <p className="text-muted-foreground mb-2">{job.company}</p>
                      <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-4 h-4" />
                          {job.location}
                        </span>
                        <span className="flex items-center gap-1">
                          <Briefcase className="w-4 h-4" />
                          {job.type}
                        </span>
                        <span className="flex items-center gap-1">
                          <DollarSign className="w-4 h-4" />
                          {job.salary}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {job.posted}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-2 mt-3">
                        {job.skills.map((skill) => (
                          <Badge key={skill} variant="secondary">{skill}</Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-3 md:flex-col md:items-end">
                    <Button variant="hero">Apply Now</Button>
                    <Button variant="outline">Save Job</Button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Load More */}
          <div className="text-center mt-8">
            <Button variant="outline" size="lg">
              Load More Jobs
            </Button>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Jobs;
