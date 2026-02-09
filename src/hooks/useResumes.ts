import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
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
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      setResumes([]);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("resumes")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching resumes:", error);
      toast.error("Failed to fetch resumes");
    } else {
      setResumes(data || []);
    }
    setLoading(false);
  };

  const uploadResume = async (file: File): Promise<Resume | null> => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      toast.error("Please sign in to upload a resume");
      return null;
    }

    const fileExt = file.name.split(".").pop();
    const fileName = `${user.id}/${Date.now()}.${fileExt}`;

    // Upload to storage
    const { error: uploadError } = await supabase.storage
      .from("resumes")
      .upload(fileName, file);

    if (uploadError) {
      console.error("Error uploading file:", uploadError);
      toast.error("Failed to upload resume");
      return null;
    }

    // Save to database
    const { data, error } = await supabase
      .from("resumes")
      .insert({
        user_id: user.id,
        name: file.name,
        file_path: fileName,
        file_size: file.size,
        is_default: resumes.length === 0, // First resume is default
      })
      .select()
      .single();

    if (error) {
      console.error("Error saving resume:", error);
      toast.error("Failed to save resume");
      return null;
    }

    toast.success("Resume uploaded successfully");
    await fetchResumes();
    return data;
  };

  const setDefaultResume = async (resumeId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return;

    // First, unset all defaults
    await supabase
      .from("resumes")
      .update({ is_default: false })
      .eq("user_id", user.id);

    // Set the new default
    const { error } = await supabase
      .from("resumes")
      .update({ is_default: true })
      .eq("id", resumeId);

    if (error) {
      toast.error("Failed to set default resume");
    } else {
      toast.success("Default resume updated");
      await fetchResumes();
    }
  };

  const deleteResume = async (resume: Resume) => {
    // Delete from storage
    const { error: storageError } = await supabase.storage
      .from("resumes")
      .remove([resume.file_path]);

    if (storageError) {
      console.error("Error deleting file:", storageError);
    }

    // Delete from database
    const { error } = await supabase
      .from("resumes")
      .delete()
      .eq("id", resume.id);

    if (error) {
      toast.error("Failed to delete resume");
    } else {
      toast.success("Resume deleted");
      await fetchResumes();
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
