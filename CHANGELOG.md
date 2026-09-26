# Historique

Le projet a été construit au fil d'une conversation, en modifiant un même
fichier. Les états intermédiaires n'ont pas été conservés : ce journal retrace
les étapes de mémoire, il ne correspond pas à des commits réels. L'historique
git commence à la mise en dépôt.

## Confirmations par e-mail — septembre 2026

Premier essai via EmailJS, abandonné : la clé devait figurer dans la page et la
restriction par domaine est réservée aux formules payantes. Remplacé par une
fonction Edge Supabase qui envoie via Brevo, la clé restant dans les secrets du
projet. EmailJS entièrement retiré du code et du dépôt.

## Mise en dépôt — septembre 2026

Version en service : page unique branchée sur Supabase.

## Étapes précédentes

- **Première version** — présentation des deux miels, formulaire de commande,
  espace producteur avec regroupement des livraisons par jour et par créneau.
- **Reprise de l'étiquette** — la page adopte l'identité du pot : sunburst doré
  redessiné en SVG, nom en Archivo Black posé en diagonale sur sa bande blanche,
  mentions légales reprises telles quelles.
- **Créneaux par jour** — les horaires proposés dépendent du jour choisi, et non
  plus d'une liste unique. Correction d'un décalage de dates : la conversion en
  UTC reculait chaque jour d'un cran, un mercredi s'affichait mardi.
- **Itinéraire** — d'abord un simple plus proche voisin, remplacé par une
  recherche exhaustive jusqu'à huit arrêts, avec le retour à la maison inclus
  dans le coût. Puis correction du géocodage : les rues de Rhode-Saint-Genèse
  portent un nom néerlandais, d'où l'alias de commune et la correction manuelle
  de position.
- **Annulation d'une commande** — `confirm()` étant bloqué dans le cadre
  d'exécution, la confirmation passe à deux clics. Ajout du rétablissement.
- **Stockage** — le prototype reposait sur le stockage des artefacts Claude,
  inexistant sur un hébergement classique. Trois pistes explorées (PHP, Google
  Apps Script, Supabase), Supabase retenu.
- **Session** — le mot de passe n'est jamais écrit dans la page. Seul le jeton
  de session délivré par Supabase est conservé sur l'appareil.
