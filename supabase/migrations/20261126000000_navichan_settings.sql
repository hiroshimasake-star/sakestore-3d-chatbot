create table public.navichan_settings (
  id smallint primary key check (id = 1),
  greeting text not null default '' check (char_length(greeting) <= 160),
  tone text not null default 'current' check (tone in ('current', 'polite', 'friendly'))
);

alter table public.navichan_settings enable row level security;
revoke all on table public.navichan_settings from public, anon, authenticated;
grant select, update on table public.navichan_settings to service_role;

insert into public.navichan_settings (id) values (1);
