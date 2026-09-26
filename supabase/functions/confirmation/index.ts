/**
 * Confirmation de commande — Le Miel du Champ de l'Église
 *
 * Fonction Edge Supabase. La clé du service d'envoi reste dans les secrets du
 * projet : elle ne descend jamais dans le navigateur, contrairement à EmailJS.
 *
 * INSTALLATION (tout depuis le tableau de bord, sans ligne de commande)
 *  1. Supabase ▸ Edge Functions ▸ Deploy a new function ▸ Via Editor
 *  2. Nom : confirmation. Effacer l'exemple, coller ce fichier, Deploy.
 *  3. Supabase ▸ Edge Functions ▸ Secrets, ajouter selon le fournisseur choisi :
 *       FOURNISSEUR   resend   ou   brevo
 *       CLE_ENVOI     la clé API du service
 *       EXPEDITEUR    l'adresse d'envoi, ex. miel@ordiman.com
 *       COPIE         votre adresse, pour recevoir une copie de chaque commande
 *  4. Dans la page, passer  const ENVOI = 'edge'
 *
 * QUEL FOURNISSEUR
 *  • resend.com — le plus soigné, 3 000 envois par mois. Exige de vérifier un
 *    domaine en ajoutant des enregistrements DNS chez votre hébergeur.
 *  • brevo.com — 300 envois par jour. Une simple validation de l'adresse
 *    d'expéditeur suffit, sans toucher au DNS. Plus simple si le DNS vous rebute.
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

interface Commande {
  nom: string; email: string; tel: string; adresse: string; ville: string;
  jour: string; creneau: string; pots: string; total: string;
  presence: string; remarque: string; paiement: string;
}

function corpsHtml(c: Commande): string {
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
    Répondez simplement à ce message, ou faites-nous signe au ${e(c.tel)}.
  </td></tr>

  <tr><td style="padding:22px 32px 0;">
    <div style="border-top:1px solid #dad3c0;padding-top:18px;font-size:13px;line-height:1.7;color:#5c5c5c;">
      Le miel de printemps cristallise et devient tartinable : c'est le signe d'un miel
      qui n'a pas été chauffé. À conserver à l'abri de l'humidité, autour de 14 °C.
      À consommer de préférence avant fin 2028.
    </div>
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

async function envoyer(c: Commande) {
  const fournisseur = (Deno.env.get('FOURNISSEUR') || 'resend').toLowerCase();
  const cle        = Deno.env.get('CLE_ENVOI') || '';
  const expediteur = Deno.env.get('EXPEDITEUR') || '';
  const copie      = Deno.env.get('COPIE') || '';
  if (!cle || !expediteur) throw new Error('CLE_ENVOI ou EXPEDITEUR manquant dans les secrets');

  const sujet = `Votre commande de miel — livraison ${c.jour}`;
  const html  = corpsHtml(c);

  if (fournisseur === 'brevo') {
    const r = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'api-key': cle, 'Content-Type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({
        sender: { email: expediteur, name: "Le Miel du Champ de l'Église" },
        to: [{ email: c.email, name: c.nom }],
        ...(copie ? { bcc: [{ email: copie }] } : {}),
        ...(copie ? { replyTo: { email: copie } } : {}),
        subject: sujet,
        htmlContent: html
      })
    });
    if (!r.ok) throw new Error('Brevo ' + r.status + ' ' + (await r.text()).slice(0, 300));
    return;
  }

  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + cle, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: `Le Miel du Champ de l'Église <${expediteur}>`,
      to: [c.email],
      ...(copie ? { bcc: [copie], reply_to: copie } : {}),
      subject: sujet,
      html
    })
  });
  if (!r.ok) throw new Error('Resend ' + r.status + ' ' + (await r.text()).slice(0, 300));
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return reponse({ error: 'méthode non autorisée' }, 405);

  try {
    const c = (await req.json()) as Commande;
    if (!c?.email || !/^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(c.email)) {
      return reponse({ error: 'adresse e-mail absente ou invalide' }, 400);
    }
    await envoyer(c);
    return reponse({ ok: true });
  } catch (err) {
    console.error(err);
    return reponse({ error: String(err instanceof Error ? err.message : err) }, 500);
  }
});
