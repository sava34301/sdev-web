CREATE OR REPLACE FUNCTION public.protect_library_download_count()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF current_user IN ('authenticated', 'anon') THEN
    IF TG_OP = 'INSERT' THEN
      NEW.download_count := 0;
    ELSIF NEW.download_count IS DISTINCT FROM OLD.download_count THEN
      NEW.download_count := OLD.download_count;
    END IF;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS libraries_protect_download_count ON public.libraries;
CREATE TRIGGER libraries_protect_download_count
BEFORE INSERT OR UPDATE ON public.libraries
FOR EACH ROW EXECUTE FUNCTION public.protect_library_download_count();