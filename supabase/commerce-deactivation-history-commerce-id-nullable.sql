-- Si ya creaste commerce_deactivation_history con commerce_id NOT NULL, ejecutá esto
-- una vez en Supabase → SQL Editor (luego notify / recargar PWA).

alter table public.commerce_deactivation_history alter column commerce_id drop not null;

notify pgrst, 'reload schema';
