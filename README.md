# Miel du Champ de l'Église

Boutique et gestion des livraisons du miel produit par Julie et Greg à
Rhode-Saint-Genèse. Une seule page, sans framework ni build : présentation des
deux miels, prise de commande, et un espace producteur qui organise les tournées.

Récolte 2026, deux miels, pots de 500 g, livraison par Gabriel les mercredis
et samedis à Rhode-Saint-Genèse et Waterloo.

## Ce que fait la page

**Côté visiteur** — les deux miels et leur prix, le stock restant affiché par deux
pots qui se vident, un formulaire qui demande les pots, le jour de livraison
(seuls les jours ouverts au calendrier apparaissent), le créneau horaire propre à
ce jour, et la consigne si personne n'est là.

**Côté producteur** — accès protégé par mot de passe. Les commandes sont
regroupées par jour puis par créneau, avec pour chaque tournée le nombre
d'arrêts, de pots et le liquide à encaisser. Un bouton calcule l'itinéraire le
plus court au départ et au retour de la maison : jusqu'à huit arrêts par créneau
toutes les permutations sont évaluées, au-delà c'est du 2-opt. L'ordre des
créneaux horaires reste prioritaire sur la distance. La liste se copie en texte
pour Gabriel, s'ouvre dans Google Maps, ou s'imprime. Export CSV de l'ensemble.

## Mise en route

1. Créer un projet sur [supabase.com](https://supabase.com).
2. SQL Editor ▸ New query ▸ coller `supabase.sql` ▸ Run.
3. Authentication ▸ Users ▸ Add user : votre adresse et un mot de passe,
   avec **Auto Confirm User** coché. Ce mot de passe ouvre l'espace producteur.
4. Dans `index.html`, renseigner l'objet `SB` en haut du script : `url`, `cle`
   (la clé publique `sb_publishable_…`) et `email`.
5. Déposer `index.html` sur l'hébergement.

### Confirmation par e-mail

1. Créer un compte sur [brevo.com](https://www.brevo.com), puis valider
   l'adresse d'expéditeur : Senders ▸ Add a sender, et cliquer le mail reçu.
2. Récupérer la clé API : nom du compte ▸ SMTP & API ▸ API Keys ▸ Generate.
   Elle commence par `xkeysib-` et ne s'affiche qu'une fois.
3. Supabase ▸ Edge Functions ▸ Deploy a new function ▸ Via Editor, nom
   `confirmation`, coller `supabase/functions/confirmation/index.ts`, Deploy.
4. Supabase ▸ Edge Functions ▸ Secrets : `CLE_BREVO`, `EXPEDITEUR`, `COPIE`.

La clé Brevo ne quitte jamais les secrets Supabase. Rien de sensible ne figure
dans `index.html` ni dans ce dépôt. Si l'envoi échoue, la commande est malgré
tout enregistrée et la raison s'affiche dans la console du navigateur.

La clé publique est destinée à figurer dans la page. Ce sont les règles
d'accès définies dans `supabase.sql` qui protègent les données : un visiteur peut
déposer une commande, il ne peut ni lister les commandes, ni lire celle du
voisin, ni modifier une commande enregistrée.

## Structure

| Fichier | Rôle |
|---|---|
| `index.html` | Toute l'application : présentation, commande, gestion |
| `supabase.sql` | Table et règles d'accès à exécuter une fois |
| `supabase/functions/confirmation/index.ts` | Fonction Edge qui envoie la confirmation via Brevo |
| `backends/stockage.php` | Variante pour un hébergement avec PHP |
| `backends/Code.gs` | Variante Google Apps Script, commandes dans un classeur |

Les deux variantes de `backends/` sont des alternatives à Supabase, conservées
au cas où l'hébergement changerait. Une seule est nécessaire.

## Réglages

Tout se règle depuis l'espace producteur, onglet Réglages : stock de départ,
prix du pot, IBAN, communes livrées, jours de livraison et créneaux propres à
chaque jour, adresse de départ des tournées.

Les communes acceptent un alias de géocodage après une barre verticale —
`Rhode-Saint-Genèse | 1640 Sint-Genesius-Rode`. C'est indispensable ici : la
commune est flamande et ses rues sont enregistrées sous leur nom néerlandais,
sans quoi le calcul d'itinéraire part chercher les adresses ailleurs en Belgique.

## Dépannage

| Symptôme | Cause probable |
|---|---|
| HTTP 401 | Clé mal copiée, ou en-tête `Authorization` absent |
| HTTP 403 | Les règles SQL refusent l'opération |
| `42P01` | Le script `supabase.sql` n'a pas été exécuté |
| Une adresse mal placée dans la tournée | Géocodage en échec — bouton *Position* sur la commande |

La page affiche le message d'erreur renvoyé par le serveur sous le bouton
concerné, et le détaille dans la console du navigateur.
