/**
 * Confirmation de commande — Le Miel du Champ de l'Église
 *
 * Fonction Edge Supabase. La clé Brevo reste dans les secrets du projet :
 * elle ne descend jamais dans le navigateur.
 *
 * INSTALLATION — tout au clavier, sans ligne de commande
 *
 *  1. Créer un compte sur brevo.com et valider l'adresse d'expéditeur
 *     (Senders ▸ Add a sender, puis clic sur le mail de confirmation).
 *  2. Récupérer la clé API : votre nom en haut à droite ▸ SMTP & API ▸ API Keys
 *     ▸ Generate a new API key. Elle commence par xkeysib- et ne s'affiche
 *     qu'une seule fois.
 *  3. Supabase ▸ Edge Functions ▸ Deploy a new function ▸ Via Editor.
 *     Nom : confirmation. Effacer l'exemple, coller ce fichier, Deploy.
 *  4. Supabase ▸ Edge Functions ▸ Secrets, ajouter :
 *       CLE_BREVO    la clé xkeysib-…
 *       EXPEDITEUR   l'adresse validée à l'étape 1
 *       COPIE        votre adresse, pour recevoir une copie de chaque commande
 *  5. Tester avec le bouton Test de l'éditeur avant de passer en production.
 *
 * SÉCURITÉ
 *  La page n'envoie que le numéro de la commande. La fonction relit elle-même
 *  la commande en base, via commande_a_confirmer() (voir supabase-maj-confirmation.sql),
 *  qui ne la rend qu'une seule fois et dans le quart d'heure suivant sa création.
 *  Impossible donc de faire envoyer un message arbitraire à une adresse choisie.
 *
 *  Le téléphone indiqué au client est celui des Réglages de l'espace producteur
 *  (« Téléphone affiché aux clients »), ou à défaut le secret TELEPHONE.
 *
 * Quota gratuit : 300 envois par jour.
 */

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

const reponse = (corps: unknown, statut = 200) =>
  new Response(JSON.stringify(corps), {
    status: statut,
    headers: { ...CORS, 'Content-Type': 'application/json' }
  });

const echappe = (v: unknown) =>
  String(v ?? '').replace(/[<>&"]/g, (c) =>
    ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c] as string));

interface Recap {
  nom: string; email: string; adresse: string;
  jour: string; creneau: string; pots: string; total: string;
  presence: string; remarque: string; paiement: string;
  contact: string;           // téléphone du producteur, pas du client
}

const JOURS = ['dimanche','lundi','mardi','mercredi','jeudi','vendredi','samedi'];
const MOIS  = ['janvier','février','mars','avril','mai','juin','juillet','août',
               'septembre','octobre','novembre','décembre'];
function joli(iso: string): string {
  const d = new Date(iso + 'T12:00:00');
  return isNaN(d.getTime()) ? iso : `${JOURS[d.getDay()]} ${d.getDate()} ${MOIS[d.getMonth()]}`;
}

function corpsHtml(c: Recap): string {
  const e = echappe;
  return `
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f3f0e3;margin:0;padding:24px 12px;font-family:Helvetica,Arial,sans-serif;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background:#ffffff;border:1px solid #dad3c0;">

  <tr><td style="padding:30px 32px 24px;border-bottom:4px solid #e9b23c;">
    <div style="font-family:'Arial Black',Arial,sans-serif;font-weight:900;font-size:25px;line-height:1.15;letter-spacing:-0.5px;color:#000;text-transform:uppercase;">Miel du Champ<br>de l'Église</div>
    <div style="font-size:11px;letter-spacing:4px;color:#5c5c5c;padding-top:10px;text-transform:uppercase;">&bull; Pure honey &bull; Récolte 2026</div>
  </td></tr>

  <tr><td style="padding:30px 32px 6px;font-size:16px;line-height:1.6;color:#000;">
    Bonjour ${e(c.nom)},
    <p style="margin:14px 0 0;">Votre commande est bien notée, merci beaucoup. Voici le récapitulatif ; gardez-le sous la main, il contient l'essentiel.</p>
  </td></tr>

  <tr><td style="padding:22px 32px 0;">
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f8f6ec;border:1px solid #dad3c0;">
      <tr><td style="padding:18px 20px;">
        <div style="font-size:11px;letter-spacing:2.5px;color:#5c5c5c;text-transform:uppercase;padding-bottom:10px;">Votre commande</div>
        <div style="font-size:17px;color:#000;line-height:1.5;">${e(c.pots)}</div>
        <div style="font-family:'Arial Black',Arial,sans-serif;font-size:27px;color:#a85d18;padding-top:8px;">${e(c.total)}</div>
        <div style="font-size:14px;color:#5c5c5c;padding-top:6px;">À régler ${e(c.paiement)}.</div>
      </td></tr>
    </table>
  </td></tr>

  <tr><td style="padding:14px 32px 0;">
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid #dad3c0;">
      <tr><td style="padding:18px 20px;">
        <div style="font-size:11px;letter-spacing:2.5px;color:#5c5c5c;text-transform:uppercase;padding-bottom:12px;">La livraison</div>
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="font-size:15px;color:#000;line-height:1.6;">
          <tr><td width="110" style="color:#5c5c5c;padding-bottom:6px;">Quand</td><td style="padding-bottom:6px;"><strong>${e(c.jour)}</strong>, ${e(c.creneau)}</td></tr>
          <tr><td style="color:#5c5c5c;padding-bottom:6px;">Où</td><td style="padding-bottom:6px;">${e(c.adresse)}</td></tr>
          <tr><td style="color:#5c5c5c;padding-bottom:6px;">Si absent</td><td style="padding-bottom:6px;">${e(c.presence)}</td></tr>
          <tr><td style="color:#5c5c5c;">Votre mot</td><td>${e(c.remarque) || '—'}</td></tr>
        </table>
      </td></tr>
    </table>
  </td></tr>

  <tr><td style="padding:22px 32px 0;font-size:15px;line-height:1.6;color:#000;">
    C'est Gabriel, notre fils, qui passera. Un imprévu, un changement d'heure ?
    Répondez simplement à ce message${c.contact ? `, ou appelez-nous au <strong>${e(c.contact)}</strong>` : ''}.
  </td></tr>

  <tr><td style="padding:26px 32px 30px;">
    <div style="border-top:4px solid #e9b23c;padding-top:16px;font-size:12px;line-height:1.8;color:#5c5c5c;">
      <strong style="color:#000;">Le Miel du Champ de l'Église</strong><br>
      Récolté en famille par Julie et Greg<br>
      Chemin du Champ de l'Église, 1640 Rhode St Genèse
    </div>
  </td></tr>

</table>
</td></tr></table>`;
}

async function envoyer(c: Recap) {
  const cle        = Deno.env.get('CLE_BREVO') || '';
  const expediteur = Deno.env.get('EXPEDITEUR') || '';
  const copie      = Deno.env.get('COPIE') || '';
  if (!cle)        throw new Error('secret CLE_BREVO absent');
  if (!expediteur) throw new Error('secret EXPEDITEUR absent');

  const r = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'api-key': cle, 'Content-Type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({
      sender: { email: expediteur, name: "Le Miel du Champ de l'Église" },
      to: [{ email: c.email, name: c.nom }],
      ...(copie ? { bcc: [{ email: copie }], replyTo: { email: copie } } : {}),
      subject: `Votre commande de miel — livraison ${c.jour}`,
      htmlContent: corpsHtml(c)
    })
  });
  if (!r.ok) {
    throw new Error('Brevo ' + r.status + ' — ' + (await r.text()).slice(0, 300));
  }
}

// Appel à l'API de la base avec la clé publique reçue de la page.
// Les règles d'accès s'appliquent : on ne peut lire que ce que le public lit.
async function base(chemin: string, cle: string, init: RequestInit = {}) {
  const url = Deno.env.get('SUPABASE_URL');
  if (!url) throw new Error('SUPABASE_URL indisponible');
  const r = await fetch(url + chemin, {
    ...init,
    headers: { apikey: cle, Authorization: 'Bearer ' + cle, 'Content-Type': 'application/json', ...(init.headers || {}) }
  });
  if (!r.ok) throw new Error('base ' + r.status + ' — ' + (await r.text()).slice(0, 200));
  return r.json();
}

async function preparer(id: string, cle: string): Promise<Recap | null> {
  // commande_a_confirmer ne rend la commande qu'une fois, et dans les 15 minutes.
  const brut = await base('/rest/v1/rpc/commande_a_confirmer', cle,
    { method: 'POST', body: JSON.stringify({ p_id: id }) });
  if (!brut) return null;
  const c = JSON.parse(brut);

  let cfg: Record<string, unknown> = {};
  try {
    const l = await base('/rest/v1/miel_kv?cle=eq.miel:config&select=valeur', cle);
    if (l && l[0]) cfg = JSON.parse(l[0].valeur);
  } catch (_) { /* réglages par défaut */ }

  const pots: string[] = [];
  if (c.printemps) pots.push(`${c.printemps} pot${c.printemps > 1 ? 's' : ''} de printemps`);
  if (c.ete)       pots.push(`${c.ete} pot${c.ete > 1 ? 's' : ''} d'été`);
  const iban = String(cfg.iban || '');

  return {
    nom: c.nom, email: c.email,
    adresse: `${c.adresse}, ${c.ville || ''}`,
    jour: joli(c.date), creneau: c.creneau,
    pots: pots.join(' et '), total: `${c.total} €`,
    presence: c.presence, remarque: c.note || '',
    paiement: c.paiement === 'cash'
      ? 'en liquide ou par QR code à la livraison'
      : 'par virement avant la livraison' + (iban ? ' sur ' + iban : ''),
    contact: String(cfg.tel || Deno.env.get('TELEPHONE') || '')
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return reponse({ error: 'méthode non autorisée' }, 405);

  try {
    const { id } = await req.json();
    if (!id || !/^[A-Za-z0-9]{4,40}$/.test(String(id))) return reponse({ error: 'numéro de commande invalide' }, 400);

    const cle = req.headers.get('apikey') || '';
    if (!cle) return reponse({ error: 'clé absente' }, 401);

    const recap = await preparer(String(id), cle);
    if (!recap) return reponse({ error: 'commande introuvable, déjà confirmée ou trop ancienne' }, 404);
    if (!recap.email || !/^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(recap.email)) {
      return reponse({ error: 'la commande ne porte pas d\'adresse e-mail valide' }, 400);
    }

    await envoyer(recap);
    return reponse({ ok: true });
  } catch (err) {
    console.error(err);
    return reponse({ error: String(err instanceof Error ? err.message : err) }, 500);
  }
});
