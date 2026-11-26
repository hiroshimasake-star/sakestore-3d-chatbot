alter table public.navichan_settings
  add column if not exists conversation_settings jsonb not null
    default '{"instructions":"","examples":null}'::jsonb;
