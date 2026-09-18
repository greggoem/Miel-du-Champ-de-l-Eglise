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
