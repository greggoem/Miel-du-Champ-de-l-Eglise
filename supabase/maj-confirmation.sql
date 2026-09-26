-- Mise à jour — confirmation de commande sécurisée
-- À exécuter une fois dans Supabase ▸ SQL Editor ▸ New query ▸ Run.
-- Sans danger si relancé.
--
-- Avant : la page envoyait le contenu du mail à la fonction, qui l'expédiait
-- tel quel. N'importe qui pouvait donc faire envoyer un message à n'importe
-- quelle adresse. Désormais, la fonction ne reçoit qu'un numéro de commande et
-- relit elle-même la commande en base. Chaque commande ne déclenche qu'un seul
-- envoi, et seulement dans le quart d'heure qui suit sa création.

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
