-- Mise à jour — notification du producteur à chaque commande
-- À exécuter une fois dans Supabase ▸ SQL Editor ▸ New query ▸ Run.
-- Sans danger si relancé.
--
-- Ajoute commande_pour_renvoi() : elle rend une commande sans limite de temps
-- et sans la marquer confirmée, pour que le producteur puisse se renvoyer la
-- notification d'une commande ancienne depuis l'espace producteur.
-- Réservée aux comptes connectés : la clé publique de la page ne peut pas
-- l'appeler, donc personne ne peut s'en servir pour lire vos commandes.

create or replace function commande_pour_renvoi(p_id text)
returns text
language sql
security definer
set search_path = public
as $$
  select valeur from miel_kv where cle = 'miel:cmd:' || p_id;
$$;

revoke all     on function commande_pour_renvoi(text) from public, anon;
grant  execute on function commande_pour_renvoi(text) to authenticated;
