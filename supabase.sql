-- Le Miel du Champ de l'Église — mise en place de la base
-- À coller dans Supabase ▸ SQL Editor ▸ New query, puis Run.

create table if not exists miel_kv (
  cle    text primary key,
  valeur text not null,
  maj    timestamptz not null default now()
);

alter table miel_kv enable row level security;

-- On repart de zéro si le script est relancé.
drop policy if exists lecture_publique on miel_kv;
drop policy if exists depot_commande  on miel_kv;
drop policy if exists maj_compteur    on miel_kv;
drop policy if exists producteur      on miel_kv;

-- Un visiteur ne peut lire que les réglages de la boutique et le compteur de pots.
-- Les commandes des autres lui restent invisibles.
create policy lecture_publique on miel_kv
  for select to anon
  using (cle in ('miel:config', 'miel:compteur'));

-- Un visiteur peut déposer sa commande et faire avancer le compteur.
create policy depot_commande on miel_kv
  for insert to anon
  with check (cle like 'miel:cmd:%' or cle = 'miel:compteur');

-- Il peut mettre à jour le compteur, mais rien d'autre :
-- une commande déjà enregistrée ne peut plus être modifiée depuis la page publique.
create policy maj_compteur on miel_kv
  for update to anon
  using (cle = 'miel:compteur')
  with check (cle = 'miel:compteur');

-- Le producteur connecté a tous les droits.
create policy producteur on miel_kv
  for all to authenticated
  using (true)
  with check (true);

-- ─── Confirmation de commande ──────────────────────────────────────────────
-- Date de création posée par le serveur : le navigateur ne peut pas la falsifier.
alter table miel_kv add column if not exists cree     timestamptz not null default now();
-- Une confirmation par commande, pas davantage.
alter table miel_kv add column if not exists confirme boolean     not null default false;

-- Les commandes déjà présentes sont considérées comme confirmées.
-- (À l'ajout de la colonne, elles reçoivent toutes cree = maintenant :
-- un filtre sur la date ne suffirait donc pas à les écarter.)
update miel_kv set confirme = true where cle like 'miel:cmd:%';

-- Rend une commande à confirmer, et la marque aussitôt comme confirmée.
-- security definer : s'exécute avec les droits du propriétaire, ce qui permet
-- de lire la commande sans ouvrir la lecture des commandes au public.
create or replace function commande_a_confirmer(p_id text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare v text;
begin
  update miel_kv
     set confirme = true
   where cle = 'miel:cmd:' || p_id
     and confirme = false
     and cree > now() - interval '15 minutes'
  returning valeur into v;
  return v;
end;
$$;

revoke all     on function commande_a_confirmer(text) from public;
grant  execute on function commande_a_confirmer(text) to anon, authenticated;
