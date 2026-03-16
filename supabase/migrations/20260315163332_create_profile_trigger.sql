/*
  # Auto-create Profile on User Registration

  ## Summary
  Creates a trigger that automatically inserts a profile row when a new user
  signs up via Supabase Auth. This ensures every user has a profile record.
*/

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, name_vn, name_jp, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name_vn', ''),
    COALESCE(NEW.raw_user_meta_data->>'name_jp', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'staff')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
