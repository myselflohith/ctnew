import { useState, useEffect } from "react";
import { apiClient } from "@/lib/api";
import { toast } from "sonner";

export interface Resume {
  id: string;
  user_id: string;
  name: string;
  file_path: string;
  file_size: number | null;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export const useResumes = () => {
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchResumes = async () => {
    setLoading(true);
    
    try {
      // Check if user is authenticated
      const token = apiClient.getToken();
      if (!token) {
        setResumes([]);
        setLoading(false);
        return;
      }

      const response = await apiClient.getResumes();
      setResumes(response.data || []);
    } catch (error: any) {
      console.error("Error fetching resumes:", error);
      if (error.message !== 'Authentication required') {
        toast.error("Failed to fetch resumes");
      }
      setResumes([]);
    } finally {
      setLoading(false);
    }
  };

  const uploadResume = async (file: File, options?: { skipMatchAllJobs?: boolean }): Promise<Resume | null> => {
    try {
      const token = apiClient.getToken();
      if (!token) {
        toast.error("Please sign in to upload a resume");
        return null;
      }

      const response = await apiClient.uploadResume(file, options);

      if (response.success) {
        toast.success("Resume uploaded successfully");
        await fetchResumes();
        return response.data;
      }

      return null;
    } catch (error: any) {
      console.error("Error uploading file:", error);
      toast.error(error.message || "Failed to upload resume");
      return null;
    }
  };

  const setDefaultResume = async (resumeId: string) => {
    try {
      const response = await apiClient.setDefaultResume(resumeId);

      if (response.success) {
        toast.success("Default resume updated");
        await fetchResumes();
      }
    } catch (error: any) {
      console.error("Error setting default resume:", error);
      toast.error(error.message || "Failed to set default resume");
    }
  };

  const deleteResume = async (resume: Resume) => {
    try {
      const response = await apiClient.deleteResume(resume.id);

      if (response.success) {
        toast.success("Resume deleted");
        await fetchResumes();
      }
    } catch (error: any) {
      console.error("Error deleting resume:", error);
      toast.error(error.message || "Failed to delete resume");
    }
  };

  useEffect(() => {
    fetchResumes();
  }, []);

  return {
    resumes,
    loading,
    uploadResume,
    setDefaultResume,
    deleteResume,
    refetch: fetchResumes,
  };
};
