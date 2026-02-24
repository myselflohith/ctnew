import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import cardinalLogo from "@/assets/cardinal-logo.png";
import { ThemeToggle } from "@/components/ThemeToggle";

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <motion.nav
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl bg-background/80 border-b border-border/50"
    >
      <div className="container mx-auto px-4 md:px-6">
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <div className="relative">
              <img src={cardinalLogo} alt="CardinalTalent" className="w-10 h-10 object-contain" />
            </div>
            <span className="font-display text-xl font-bold text-gradient">
              CardinalTalent
            </span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-8">
            <Link
              to="/jobs"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Browse Jobs
            </Link>
            <Link
              to="/employers"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              For Employers
            </Link>
            <Link
              to="/about"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              About
            </Link>
            <Link
              to="/auth/investor"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Investor Registration
            </Link>
          </div>

          {/* Desktop CTA */}
          <div className="hidden md:flex items-center gap-3">
            <ThemeToggle />
            <Button variant="ghost" onClick={() => navigate("/auth")}>
              Sign In
            </Button>
            <Button variant="hero" onClick={() => navigate("/auth?mode=signup")}>
              Get Started
            </Button>
          </div>

          {/* Mobile Menu Toggle */}
          <button
            className="md:hidden p-2"
            onClick={() => setIsOpen(!isOpen)}
            aria-label="Toggle menu"
          >
            {isOpen ? (
              <X className="w-6 h-6 text-foreground" />
            ) : (
              <Menu className="w-6 h-6 text-foreground" />
            )}
          </button>
        </div>

        {/* Mobile Menu */}
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden py-4 border-t border-border/50"
          >
            <div className="flex flex-col gap-4">
              <Link
                to="/jobs"
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => setIsOpen(false)}
              >
                Browse Jobs
              </Link>
              <Link
                to="/employers"
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => setIsOpen(false)}
              >
                For Employers
              </Link>
              <Link
                to="/about"
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => setIsOpen(false)}
              >
                About
              </Link>
              <Link
                to="/auth/investor"
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => setIsOpen(false)}
              >
                Investor Registration
              </Link>
              <div className="flex flex-col gap-2 pt-4 border-t border-border/50">
                <div className="flex items-center justify-between py-2">
                  <span className="text-sm text-muted-foreground">Theme</span>
                  <ThemeToggle variant="outline" size="default" />
                </div>
                <Button variant="ghost" onClick={() => { navigate("/auth"); setIsOpen(false); }}>
                  Sign In
                </Button>
                <Button variant="hero" onClick={() => { navigate("/auth?mode=signup"); setIsOpen(false); }}>
                  Get Started
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </motion.nav>
  );
};

export default Navbar;
