import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Mail, Briefcase } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { forgotPassword } from "@/lib/auth";

const ForgotPassword = () => {
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await forgotPassword(email);
      setEmailSent(true);
      toast({
        title: "Email sent!",
        description: "If an account exists with this email, you'll receive a password reset link.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to send reset email. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <div className="absolute inset-0 animated-gradient" />
        <div className="absolute inset-0">
          <svg
            className="absolute bottom-0 left-0 right-0 w-full h-[70%] wave-flow"
            viewBox="0 0 1440 600"
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient id="forgotWaveGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="hsl(349, 78%, 44%)" stopOpacity="0.4" />
                <stop offset="50%" stopColor="hsl(38, 92%, 50%)" stopOpacity="0.6" />
                <stop offset="100%" stopColor="hsl(45, 93%, 47%)" stopOpacity="0.4" />
              </linearGradient>
            </defs>
            <path
              d="M0,300 C200,250 400,350 600,300 C800,250 1000,350 1200,300 C1350,270 1440,300 1440,300 L1440,600 L0,600 Z"
              fill="url(#forgotWaveGradient)"
            />
            <path
              d="M0,380 C200,330 400,430 600,380 C800,330 1000,430 1200,380 C1350,350 1440,380 1440,380 L1440,600 L0,600 Z"
              fill="url(#forgotWaveGradient)"
              opacity="0.5"
            />
          </svg>
        </div>
        <div className="relative z-10 flex flex-col justify-center items-center w-full p-12">
          <Link to="/" className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cardinal to-amber flex items-center justify-center">
              <Briefcase className="w-6 h-6 text-white" />
            </div>
            <span className="font-display text-3xl font-bold text-gradient">
              CardinalTalent
            </span>
          </Link>
          <h2 className="font-display text-2xl font-semibold text-center text-foreground mb-4">
            Reset Your Password
          </h2>
          <p className="text-muted-foreground text-center max-w-md">
            Enter your email address and we'll send you a link to reset your password.
          </p>
        </div>
      </div>

      {/* Right side - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 md:p-12">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <Link to="/" className="flex lg:hidden items-center gap-2 mb-8">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cardinal to-amber flex items-center justify-center">
              <Briefcase className="w-5 h-5 text-white" />
            </div>
            <span className="font-display text-xl font-bold text-gradient">
              CardinalTalent
            </span>
          </Link>

          <Link
            to="/auth"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to sign in
          </Link>

          {!emailSent ? (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4 }}
            >
              <h1 className="font-display text-2xl md:text-3xl font-bold mb-2">
                Forgot Password?
              </h1>
              <p className="text-muted-foreground mb-6">
                No worries! Enter your email and we'll send you reset instructions.
              </p>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      className="pl-10"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  variant="hero"
                  className="w-full"
                  size="lg"
                  disabled={isLoading}
                >
                  {isLoading ? "Sending..." : "Send Reset Link"}
                </Button>
              </form>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4 }}
              className="text-center"
            >
              <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center mx-auto mb-4">
                <Mail className="w-8 h-8 text-green-600 dark:text-green-500" />
              </div>
              <h1 className="font-display text-2xl md:text-3xl font-bold mb-2">
                Check Your Email
              </h1>
              <p className="text-muted-foreground mb-6">
                We've sent password reset instructions to <strong>{email}</strong>
              </p>
              <p className="text-sm text-muted-foreground mb-6">
                Didn't receive the email? Check your spam folder or try again.
              </p>
              <Button
                onClick={() => setEmailSent(false)}
                variant="outline"
                className="w-full"
              >
                Try Another Email
              </Button>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
