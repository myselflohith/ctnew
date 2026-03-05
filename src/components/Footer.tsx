import { Link } from "react-router-dom";

const Footer = () => {
  return (
    <footer className="border-t border-border bg-card/50">
      <div className="container mx-auto px-4 md:px-6 py-10 md:py-14">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-10">
          {/* Left: logo + copyright */}
          <div className="flex flex-col items-center md:items-start gap-4">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-8 h-8 flex items-center justify-center overflow-hidden">
                <img
                  src="/favicon.png"
                  alt="CardinalTalent"
                  className="w-7 h-7 object-contain"
                />
              </div>
              <span className="font-display text-lg font-bold text-gradient">
                CardinalTalent
              </span>
            </Link>
            <p className="text-sm text-muted-foreground">
              © 2026 CardinalTalent. All rights reserved.
            </p>
          </div>

          {/* Right: two-column links */}
          <nav className="w-full md:w-auto">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-12 gap-y-2 text-sm text-muted-foreground">
              <div className="space-y-2">
                <Link to="/" className="block hover:text-foreground transition-colors">
                  Home
                </Link>
                <a href="#" className="block hover:text-foreground transition-colors">
                  AI Power Networker
                </a>
                <a href="#" className="block hover:text-foreground transition-colors">
                  AI Interviewer
                </a>
                <a href="#" className="block hover:text-foreground transition-colors">
                  Invite &amp; Earn
                </a>
                <Link
                  to="/jobs"
                  className="block hover:text-foreground transition-colors"
                >
                  Search
                </Link>
                <a href="#" className="block hover:text-foreground transition-colors">
                  Leaderboard
                </a>
              </div>
              <div className="space-y-2">
                <a href="#" className="block hover:text-foreground transition-colors">
                  Groups
                </a>
                <a
                  href="https://cardinaltalent.ai/welcome/contact-us"
                  target="_blank"
                  rel="noreferrer"
                  className="block hover:text-foreground transition-colors"
                >
                  Contact Us
                </a>
                <a href="#" className="block hover:text-foreground transition-colors">
                  Privacy Policy
                </a>
                <a href="#" className="block hover:text-foreground transition-colors">
                  Terms &amp; Conditions
                </a>
                <a href="#" className="block hover:text-foreground transition-colors">
                  FAQs
                </a>
                <a
                  href="https://www.cardinaltalent.ai/ccpa"
                  target="_blank"
                  rel="noreferrer"
                  className="block hover:text-foreground transition-colors"
                >
                  CCPA | Opt Out
                </a>
                <Link
                  to="/auth?mode=signup"
                  className="block hover:text-foreground transition-colors"
                >
                  Sign Up
                </Link>
              </div>
            </div>
          </nav>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
