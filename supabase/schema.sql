-- SMZ Repasses · schema do Supabase (rode uma vez em SQL Editor)

create table public.members (
  user_id uuid primary key references auth.users(id) on delete cascade,
  nome    text not null
);

create table public.app_state (
  id         int primary key default 1 check (id = 1),
  data       jsonb not null default '{}'::jsonb,
  version    int  not null default 0,
  updated_by uuid,
  updated_at timestamptz not null default now()
);
insert into public.app_state (id) values (1);

create table public.app_state_history (
  id         bigserial primary key,
  version    int,
  data       jsonb,
  updated_by uuid,
  saved_at   timestamptz not null default now()
);

alter table public.members           enable row level security;
alter table public.app_state         enable row level security;
alter table public.app_state_history enable row level security;

create or replace function public.is_member() returns boolean
language sql security definer stable set search_path = public as
$$ select exists (select 1 from public.members where user_id = auth.uid()) $$;

create policy members_read  on public.members           for select to authenticated using (public.is_member());
create policy state_read    on public.app_state          for select to authenticated using (public.is_member());
create policy state_update  on public.app_state          for update to authenticated using (public.is_member()) with check (public.is_member());
create policy history_read  on public.app_state_history  for select to authenticated using (public.is_member());

-- Permissões da API (projetos novos do Supabase não liberam tabelas automaticamente; sem isto o login dá
-- "permission denied for table members"). Só o necessário, e as políticas acima continuam valendo.
grant select           on public.members           to authenticated;
grant select, update   on public.app_state         to authenticated;
grant select           on public.app_state_history to authenticated;
grant execute on function public.is_member() to authenticated;

-- Controle de versão: só grava se a versão for a seguinte; guarda histórico (últimas 100)
create or replace function public.app_state_before() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.version <> old.version + 1 then
    raise exception 'conflito de versão';
  end if;
  new.updated_by := auth.uid();
  new.updated_at := now();
  return new;
end $$;

create or replace function public.app_state_after() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.app_state_history (version, data, updated_by) values (new.version, new.data, new.updated_by);
  delete from public.app_state_history where version <= new.version - 100;
  return new;
end $$;

create trigger app_state_before_upd before update on public.app_state for each row execute function public.app_state_before();
create trigger app_state_after_upd  after  update on public.app_state for each row execute function public.app_state_after();

-- Tempo real
alter publication supabase_realtime add table public.app_state;

-- DEPOIS de criar os 2 usuários em Authentication > Users, cadastre os sócios
-- (troque os e-mails e nomes):
-- insert into public.members (user_id, nome)
-- select id, 'Seu Nome'   from auth.users where email = 'voce@email.com';
-- insert into public.members (user_id, nome)
-- select id, 'Nome do Sócio' from auth.users where email = 'socio@email.com';

-- Recuperar uma versão antiga (ex.: erro grave):
-- select version, saved_at from public.app_state_history order by version desc;
-- (copie o "data" da versão desejada e use Importar Backup no sistema)
