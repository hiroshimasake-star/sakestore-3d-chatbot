alter table public.navichan_settings
  add column if not exists avatar_mode text not null default 'default'
    check (avatar_mode in ('default', 'custom', 'hidden')),
  add column if not exists avatar_object text
    check (
      (avatar_mode = 'custom' and avatar_object is not null
        and avatar_object ~ '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}[.]vrm$')
      or (avatar_mode in ('default', 'hidden') and avatar_object is null)
    );

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('navichan-models', 'navichan-models', true, 41943040, array['application/octet-stream'])
on conflict (id) do nothing;
