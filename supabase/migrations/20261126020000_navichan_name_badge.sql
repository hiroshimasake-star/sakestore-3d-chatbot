alter table public.navichan_settings
  drop constraint if exists navichan_settings_start_screen_check,
  drop constraint if exists navichan_settings_start_screen_size_check,
  add constraint navichan_settings_start_screen_size_check
    check (octet_length(start_screen::text) <= 3100000);
