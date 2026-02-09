import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  LayoutDashboard,
  Search,
  FileText,
  Heart,
  Settings,
  User,
  Bell,
  Shield,
  Zap,
  Upload,
  Linkedin,
  Download,
  Trash2,
  Star,
  Calendar,
} from "lucide-react";
import { useState, useRef } from "react";
import { useResumes } from "@/hooks/useResumes";
import { apiClient } from "@/lib/api";
import { format } from "date-fns";
import { toast } from "sonner";

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/talent/dashboard" },
  { icon: Search, label: "Find Jobs", path: "/talent/jobs" },
  { icon: Heart, label: "Saved Jobs", path: "/talent/saved" },
  { icon: FileText, label: "Applications", path: "/talent/applications" },
  { icon: Calendar, label: "Interviews", path: "/talent/interviews" },
  { icon: Settings, label: "Settings", path: "/talent/settings" },
];

const TalentSettings = () => {
  const { resumes, loading, uploadResume, setDefaultResume, deleteResume } = useResumes();
  const [isPremium, setIsPremium] = useState(false);
  const [autoApplyEnabled, setAutoApplyEnabled] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [resumeToDelete, setResumeToDelete] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Please upload a PDF, DOC, or DOCX file");
      return;
    }

    await uploadResume(file);
    
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleDeleteResume = async () => {
    if (!resumeToDelete) return;
    
    const resume = resumes.find(r => r.id === resumeToDelete);
    if (resume) {
      await deleteResume(resume);
      setDeleteDialogOpen(false);
      setResumeToDelete(null);
    }
  };

  const handleDownloadResume = (resumeId: string) => {
    const url = apiClient.getResumeDownloadUrl(resumeId);
    window.open(url, '_blank');
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return "";
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    return `${(kb / 1024).toFixed(1)} MB`;
  };

  return (
    <DashboardLayout role="talent" navItems={navItems} userName="John Doe">
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold text-foreground mb-2">
          Settings
        </h1>
        <p className="text-muted-foreground">
          Manage your profile, preferences, and account settings.
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Sidebar */}
        <div className="glass rounded-2xl p-4">
          <nav className="space-y-1">
            <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-primary/10 text-primary font-medium">
              <User className="w-5 h-5" />
              Profile
            </button>
            <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-muted-foreground hover:bg-secondary/50 transition-colors">
              <Bell className="w-5 h-5" />
              Notifications
            </button>
            <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-muted-foreground hover:bg-secondary/50 transition-colors">
              <Shield className="w-5 h-5" />
              Privacy
            </button>
            <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-muted-foreground hover:bg-secondary/50 transition-colors">
              <Zap className="w-5 h-5" />
              Auto Apply
            </button>
          </nav>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Profile Section */}
          <div className="glass rounded-2xl p-6">
            <h2 className="font-display text-xl font-semibold text-foreground mb-6">
              Profile Information
            </h2>
            <div className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input id="firstName" defaultValue="John" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input id="lastName" defaultValue="Doe" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" defaultValue="john.doe@email.com" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" type="tel" defaultValue="+1 (555) 123-4567" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="linkedin" className="flex items-center gap-2">
                  <Linkedin className="w-4 h-4" />
                  LinkedIn URL
                </Label>
                <Input id="linkedin" type="url" placeholder="https://linkedin.com/in/yourprofile" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input id="location" defaultValue="San Francisco, CA" />
              </div>
            </div>
            <Button variant="hero" className="mt-6">
              Save Changes
            </Button>
          </div>

          {/* Resume Section */}
          <div className="glass rounded-2xl p-6">
            <h2 className="font-display text-xl font-semibold text-foreground mb-6">
              Resume
            </h2>
            
            {/* Upload Area */}
            <div className="border-2 border-dashed border-border rounded-xl p-8 text-center mb-6">
              <Upload className="w-10 h-10 text-muted-foreground mx-auto mb-4" />
              <p className="text-foreground font-medium mb-2">Upload your resume</p>
              <p className="text-sm text-muted-foreground mb-4">
                PDF, DOC, or DOCX up to 5MB
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.doc,.docx"
                onChange={handleFileChange}
                className="hidden"
              />
              <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                Choose File
              </Button>
            </div>

            {/* Resume List */}
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading resumes...</p>
            ) : resumes.length > 0 ? (
              <div className="space-y-3">
                {resumes.map((resume) => (
                  <div
                    key={resume.id}
                    className="flex items-center justify-between p-4 rounded-xl bg-secondary/30 border border-border"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <FileText className="w-8 h-8 text-primary" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground truncate">
                          {resume.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatFileSize(resume.file_size)} •{" "}
                          {format(new Date(resume.created_at), "MMM d, yyyy")}
                          {resume.is_default && (
                            <span className="ml-2 text-primary">• Default</span>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {!resume.is_default && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDefaultResume(resume.id)}
                          title="Make Default"
                        >
                          <Star className="w-4 h-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDownloadResume(resume.id)}
                        title="Download"
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setResumeToDelete(resume.id);
                          setDeleteDialogOpen(true);
                        }}
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                No resumes uploaded yet
              </p>
            )}
          </div>

          {/* Auto Apply */}
          <div className="glass rounded-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="font-display text-xl font-semibold text-foreground">
                  Auto Apply
                </h2>
                <p className="text-sm text-muted-foreground">
                  Automatically apply to matching jobs
                </p>
              </div>
              <Badge variant="secondary">Premium Feature</Badge>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-xl bg-secondary/30">
                <div>
                  <p className="font-medium text-foreground">Enable Auto Apply</p>
                  <p className="text-sm text-muted-foreground">
                    We'll apply to jobs with 85%+ match score
                  </p>
                </div>
                <Switch 
                  checked={autoApplyEnabled} 
                  onCheckedChange={setAutoApplyEnabled}
                  disabled={!isPremium}
                />
              </div>
              <div className="flex items-center justify-between p-4 rounded-xl bg-secondary/30">
                <div>
                  <p className="font-medium text-foreground">Job Type</p>
                  <p className="text-sm text-muted-foreground">
                    Filter by work location preference
                  </p>
                </div>
                <Select defaultValue="remote">
                  <SelectTrigger className="w-[160px]">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="remote">Remote Only</SelectItem>
                    <SelectItem value="hybrid">Hybrid</SelectItem>
                    <SelectItem value="onsite">Onsite</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between p-4 rounded-xl bg-secondary/30">
                <div>
                  <p className="font-medium text-foreground">Minimum Salary Expectations</p>
                  <p className="text-sm text-muted-foreground">
                    Only auto-apply to jobs above this amount
                  </p>
                </div>
                <Input 
                  type="text" 
                  placeholder="e.g. $120,000" 
                  defaultValue="$120,000"
                  className="w-[160px]"
                />
              </div>
            </div>
            <Button variant="hero" className="w-full mt-6">
              Upgrade to Premium
            </Button>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Resume</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this resume? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteResume} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
};

export default TalentSettings;
