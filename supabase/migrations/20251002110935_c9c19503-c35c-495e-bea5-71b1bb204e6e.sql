-- Create profiles table for school administrators
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  school_name TEXT NOT NULL,
  admin_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Policies for profiles
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Create staff table
CREATE TABLE public.staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  department TEXT NOT NULL,
  name TEXT NOT NULL,
  contact TEXT NOT NULL,
  position TEXT NOT NULL CHECK (position IN ('교장', '교감', '부서장', '부원')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;

-- Policies for staff
CREATE POLICY "Users can view their own staff"
  ON public.staff FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own staff"
  ON public.staff FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own staff"
  ON public.staff FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own staff"
  ON public.staff FOR DELETE
  USING (auth.uid() = user_id);

-- Create org_layout table for saving custom positions
CREATE TABLE public.org_layout (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  layout_data JSONB NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.org_layout ENABLE ROW LEVEL SECURITY;

-- Policies for org_layout
CREATE POLICY "Users can view their own layout"
  ON public.org_layout FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own layout"
  ON public.org_layout FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own layout"
  ON public.org_layout FOR UPDATE
  USING (auth.uid() = user_id);

-- Function to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, school_name, admin_name)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'school_name',
    NEW.raw_user_meta_data->>'admin_name'
  );
  RETURN NEW;
END;
$$;

-- Trigger to create profile on user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();