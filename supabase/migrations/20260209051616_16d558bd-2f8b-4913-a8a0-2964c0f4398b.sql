-- Create storage bucket for resumes
INSERT INTO storage.buckets (id, name, public)
VALUES ('resumes', 'resumes', false);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create resumes table to track uploaded resumes
CREATE TABLE public.resumes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on resumes
ALTER TABLE public.resumes ENABLE ROW LEVEL SECURITY;

-- Users can only see their own resumes
CREATE POLICY "Users can view their own resumes"
ON public.resumes FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own resumes
CREATE POLICY "Users can insert their own resumes"
ON public.resumes FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own resumes
CREATE POLICY "Users can update their own resumes"
ON public.resumes FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own resumes
CREATE POLICY "Users can delete their own resumes"
ON public.resumes FOR DELETE
USING (auth.uid() = user_id);

-- Storage policies for resumes bucket
CREATE POLICY "Users can upload their own resumes"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'resumes' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own resumes"
ON storage.objects FOR SELECT
USING (bucket_id = 'resumes' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own resumes"
ON storage.objects FOR DELETE
USING (bucket_id = 'resumes' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Create trigger for updated_at
CREATE TRIGGER update_resumes_updated_at
BEFORE UPDATE ON public.resumes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();