/**
 * Le Miel du Champ de l'Église — back-end sans serveur.
 *
 * INSTALLATION
 *  1. Créez un Google Sheet vide (n'importe quel nom).
 *  2. Menu Extensions ▸ Apps Script. Effacez le contenu, collez tout ce fichier.
 *  3. Réglez les trois valeurs ci-dessous.
 *  4. Cliquez sur Déployer ▸ Nouveau déploiement ▸ type « Application web ».
 *       Exécuter en tant que : Moi
 *       Qui a accès       : Tout le monde
 *  5. Autorisez l'accès quand Google le demande (écran « application non vérifiée »
 *     ▸ Paramètres avancés ▸ Accéder au projet).
 *  6. Copiez l'URL qui se termine par /exec et collez-la dans la page HTML,
 *     à la ligne  const API = '...'
 *
 * Après toute modification de ce fichier : Déployer ▸ Gérer les déploiements
 * ▸ crayon ▸ Version : Nouvelle version ▸ Déployer. Sinon rien ne change.
 */

// ─── À RÉGLER ───────────────────────────────────────────────────────────────
const SECRET = 'miel2026';   // code de l'espace producteur
const NOTIF  = '';           // votre e-mail pour être prévenu de chaque commande
                             // (laissez vide pour ne rien recevoir)
// ────────────────────────────────────────────────────────────────────────────

function doGet() {
  return json({ ok: true, message: "Le stockage du miel répond." });
}

function doPost(e) {
  try {
    return json(traiter(JSON.parse(e.postData.contents)));
  } catch (err) {
    return json({ error: String(err) });
  }
}

function json(o) {
  return ContentService.createTextOutput(JSON.stringify(o))
    .setMimeType(ContentService.MimeType.JSON);
}

// ─── Règles d'accès ─────────────────────────────────────────────────────────
function lecturePublique(k) { return k === 'miel:config' || k === 'miel:compteur'; }
function ecriturePublique(k) { return k === 'miel:compteur' || k.indexOf('miel:cmd:') === 0; }

function traiter(q) {
  const op    = q.op || '';
  const cle   = String(q.key || '');
  const admin = q.token === SECRET;

  if (op === 'auth') return { ok: admin };
  if (cle && !/^miel:[A-Za-z0-9:._-]{1,180}$/.test(cle)) return { error: 'cle invalide' };

  const verrou = LockService.getScriptLock();
  verrou.waitLock(20000);
  try {
    switch (op) {

      case 'get': {
        if (!admin && !lecturePublique(cle)) return { error: 'interdit' };
        const l = trouver(cle);
        return l ? { key: cle, value: donnees().getRange(l, 2).getValue() } : null;
      }

      case 'set': {
        const l = trouver(cle);
        // Le public dépose une commande, il n'en modifie jamais une existante.
        const neuf = !l;
        const permis = admin ||
          (ecriturePublique(cle) && !(cle.indexOf('miel:cmd:') === 0 && !neuf));
        if (!permis) return { error: 'interdit' };

        const v = String(q.value == null ? '' : q.value);
        const f = donnees();
        if (l) f.getRange(l, 2, 1, 2).setValues([[v, new Date()]]);
        else   f.appendRow([cle, v, new Date()]);

        if (neuf && cle.indexOf('miel:cmd:') === 0) journaliser(v);
        return { key: cle, value: v };
      }

      case 'list': {
        if (!admin) return { error: 'interdit' };
        const p = String(q.prefix || '');
        const keys = lignes()
          .map(function (r) { return String(r[0]); })
          .filter(function (k) { return !p || k.indexOf(p) === 0; })
          .sort();
        return { keys: keys };
      }

      case 'delete': {
        if (!admin) return { error: 'interdit' };
        const l = trouver(cle);
        if (l) donnees().deleteRow(l);
        return { key: cle, deleted: true };
      }
    }
    return { error: 'operation inconnue' };
  } finally {
    verrou.releaseLock();
  }
}

// ─── Le classeur comme espace de stockage ───────────────────────────────────
function donnees() {
  const ss = SpreadsheetApp.getActive();
  let f = ss.getSheetByName('donnees');
  if (!f) {
    f = ss.insertSheet('donnees');
    f.appendRow(['cle', 'valeur', 'maj']);
    f.hideSheet();
  }
  return f;
}

function lignes() {
  const f = donnees(), n = f.getLastRow();
  return n < 2 ? [] : f.getRange(2, 1, n - 1, 3).getValues();
}

function trouver(cle) {
  const l = lignes();
  for (let i = 0; i < l.length; i++) if (String(l[i][0]) === cle) return i + 2;
  return 0;
}

// ─── Onglet lisible + notification ──────────────────────────────────────────
function journaliser(valeur) {
  let c;
  try { c = JSON.parse(valeur); } catch (e) { return; }

  const ss = SpreadsheetApp.getActive();
  let f = ss.getSheetByName('Commandes');
  if (!f) {
    f = ss.insertSheet('Commandes');
    f.appendRow(['Reçue le', 'Nom', 'Téléphone', 'Adresse', 'Commune',
                 'Livraison', 'Créneau', 'Printemps', 'Été', 'Total €',
                 'Paiement', 'Si absent', 'Remarque']);
    f.setFrozenRows(1);
  }
  f.appendRow([new Date(), c.nom, c.tel, c.adresse, c.ville, c.date, c.creneau,
               c.printemps, c.ete, c.total, c.paiement, c.presence, c.note]);

  if (NOTIF) {
    const pots = [];
    if (c.printemps) pots.push(c.printemps + ' printemps');
    if (c.ete) pots.push(c.ete + ' été');
    MailApp.sendEmail(NOTIF, 'Miel — commande de ' + c.nom,
      [c.nom + ' — ' + c.tel,
       c.adresse + ', ' + c.ville,
       pots.join(', ') + ' — ' + c.total + ' €',
       'Livraison ' + c.date + ', ' + c.creneau,
       'Si absent : ' + c.presence,
       c.note ? 'Remarque : ' + c.note : ''].join('\n'));
  }
}
