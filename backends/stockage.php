<?php
/**
 * Stockage des commandes du Miel du Champ de l'Église.
 * À déposer dans le même dossier que la page HTML.
 * Il crée tout seul un sous-dossier "donnees-miel" où chaque enregistrement
 * devient un petit fichier JSON.
 */

// ─── À MODIFIER : le code de l'espace producteur ────────────────────────────
const SECRET  = 'A-DEFINIR';   // ← remplacez par votre code avant tout déploiement
// ────────────────────────────────────────────────────────────────────────────

const DOSSIER = __DIR__ . '/donnees-miel';

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');

function debute(string $s, string $p): bool { return substr($s, 0, strlen($p)) === $p; }

function sortie($data, int $code = 200) {
  http_response_code($code);
  echo json_encode($data, JSON_UNESCAPED_UNICODE);
  exit;
}

function chemin(string $k): string {
  if (!preg_match('/^miel:[A-Za-z0-9:._-]{1,180}$/', $k)) sortie(['error' => 'cle invalide'], 400);
  return DOSSIER . '/' . rawurlencode($k) . '.json';
}

// Ce que le public a le droit de lire et d'écrire.
function lecturePublique(string $k): bool {
  return $k === 'miel:config' || $k === 'miel:compteur';
}
function ecriturePublique(string $k): bool {
  return $k === 'miel:compteur' || debute($k, 'miel:cmd:');
}

if (!is_dir(DOSSIER)) {
  @mkdir(DOSSIER, 0775, true);
  @file_put_contents(DOSSIER . '/.htaccess', "Require all denied\nDeny from all\n");
  @file_put_contents(DOSSIER . '/index.html', '');
}
if (!is_writable(DOSSIER)) sortie(['error' => 'dossier donnees-miel non inscriptible'], 500);

$in    = json_decode(file_get_contents('php://input') ?: '', true) ?: [];
$op    = isset($in['op'])  ? (string) $in['op']  : '';
$key   = isset($in['key']) ? (string) $in['key'] : '';
$admin = isset($in['token']) && is_string($in['token']) && hash_equals(SECRET, $in['token']);

switch ($op) {

  case 'auth':
    sortie(['ok' => $admin]);

  case 'get':
    if (!$admin && !lecturePublique($key)) sortie(['error' => 'interdit'], 403);
    $f = chemin($key);
    if (!is_file($f)) sortie(null);
    sortie(['key' => $key, 'value' => file_get_contents($f)]);

  case 'set':
    $f    = chemin($key);
    $neuf = !is_file($f);
    // Le public peut déposer une commande, jamais en modifier une existante.
    $autorise = $admin
      || (ecriturePublique($key) && !(debute($key, 'miel:cmd:') && !$neuf));
    if (!$autorise) sortie(['error' => 'interdit'], 403);
    $v = isset($in['value']) ? (string) $in['value'] : '';
    if (strlen($v) > 200000) sortie(['error' => 'trop volumineux'], 413);
    if (file_put_contents($f, $v, LOCK_EX) === false) sortie(['error' => 'ecriture impossible'], 500);
    sortie(['key' => $key, 'value' => $v]);

  case 'list':
    if (!$admin) sortie(['error' => 'interdit'], 403);
    $p = isset($in['prefix']) ? (string) $in['prefix'] : '';
    $keys = [];
    foreach (glob(DOSSIER . '/*.json') ?: [] as $f) {
      $k = rawurldecode(basename($f, '.json'));
      if ($p === '' || debute($k, $p)) $keys[] = $k;
    }
    sort($keys);
    sortie(['keys' => $keys]);

  case 'delete':
    if (!$admin) sortie(['error' => 'interdit'], 403);
    @unlink(chemin($key));
    sortie(['key' => $key, 'deleted' => true]);

  default:
    sortie(['error' => 'operation inconnue'], 400);
}
