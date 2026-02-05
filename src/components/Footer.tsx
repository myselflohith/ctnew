import { Link } from "react-router-dom";
import { Briefcase, Twitter, Linkedin, Github } from "lucide-react";

const Footer = () => {
  return (
    <footer className="border-t border-border bg-card/50">
      <div className="container mx-auto px-4 md:px-6 py-12 md:py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Link to="/" className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cardinal to-amber flex items-center justify-center">
                <Briefcase className="w-4 h-4 text-white" />
              </div>
              <span className="font-display text-lg font-bold text-gradient">
                CardinalTalent
              </span>
            </Link>
            <p className="text-sm text-muted-foreground mb-4">
              AI-powered recruitment platform connecting top talent with leading companies.
            </p>
            <div className="flex gap-4">
              <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                <Twitter className="w-5 h-5" />
              </a>
              <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                <Linkedin className="w-5 h-5" />
              </a>
              <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                <Github className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* For Talent */}
          <div>
            <h4 className="font-semibold text-foreground mb-4">For Talent</h4>
            <ul className="space-y-3">
              <li>
                <Link to="/jobs" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Browse Jobs
                </Link>
              </li>
              <li>
                <Link to="/auth?mode=signup&role=talent" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Create Profile
                </Link>
              </li>
              <li>
                <Link to="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Salary Guide
                </Link>
              </li>
              <li>
                <Link to="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Career Resources
                </Link>
              </li>
            </ul>
          </div>

          {/* For Employers */}
          <div>
            <h4 className="font-semibold text-foreground mb-4">For Employers</h4>
            <ul className="space-y-3">
              <li>
                <Link to="/auth?mode=signup&role=employer" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Post a Job
                </Link>
              </li>
              <li>
                <Link to="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Find Talent
                </Link>
              </li>
              <li>
                <Link to="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Pricing
                </Link>
              </li>
              <li>
                <Link to="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Enterprise
                </Link>
              </li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="font-semibold text-foreground mb-4">Company</h4>
            <ul className="space-y-3">
              <li>
                <Link to="/about" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  About Us
                </Link>
              </li>
              <li>
                <Link to="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Blog
                </Link>
              </li>
              <li>
                <Link to="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link to="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="mt-12 pt-8 border-t border-border flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} CardinalTalent. All rights reserved.
          </p>
          <p className="text-sm text-muted-foreground">
            Powered by AI. Built for humans.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
