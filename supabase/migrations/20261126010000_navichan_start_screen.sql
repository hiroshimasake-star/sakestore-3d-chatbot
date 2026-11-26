alter table public.navichan_settings
  add column if not exists start_screen jsonb not null
    default '{"image":"","desktopImage":"","label":"接客をはじめる"}'::jsonb
    check (octet_length(start_screen::text) <= 2050000);
