/* Génère le site statique : chaque article devient une vraie page HTML (articles/slug.html).
   Lancé par GitHub Actions (voir .github/workflows/build.yml) ou à la main : node build.js */
const fs = require('fs'), path = require('path');
const SITE = 'https://deucee.shop';
const SB_URL = process.env.SUPABASE_URL || 'https://wywfqdlrlncvqvxznshm.supabase.co';
const SB_KEY = process.env.SUPABASE_KEY || 'sb_publishable_PZ56ks1RrEOtoOw14hb2jg_-3zaZA3b';
const ROOT = __dirname;
const CATS = {
  ATP: { file: 'atp.html', label: 'Circuit ATP', desc: "Toute l'actualité du circuit ATP : résultats, analyses et portraits des joueurs du tennis masculin." },
  WTA: { file: 'wta.html', label: 'Circuit WTA', desc: "Toute l'actualité du circuit WTA : résultats, analyses et portraits des joueuses du tennis féminin." },
  ITF: { file: 'itf.html', label: 'Circuit ITF', desc: "Toute l'actualité du circuit ITF : résultats, analyses et portraits de la relève du tennis mondial." },
  DIVERS: { file: 'divers.html', label: 'Divers', desc: "L'actualité tennis hors circuits : matériel, coulisses, exhibitions et sujets transverses." }
};
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const slugify = t => String(t || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '-').replace(/[^\w-]+/g, '').replace(/--+/g, '-').replace(/^-+|-+$/g, '');
const MOIS = { janvier: 1, 'février': 2, mars: 3, avril: 4, mai: 5, juin: 6, juillet: 7, 'août': 8, septembre: 9, octobre: 10, novembre: 11, 'décembre': 12 };
function isoDate(fr) {
  const m = /^(\d{1,2})\s+(\S+)\s+(\d{4})$/.exec((fr || '').trim());
  const mo = m && MOIS[m[2].toLowerCase()];
  return mo ? `${m[3]}-${String(mo).padStart(2, '0')}-${m[1].padStart(2, '0')}` : null;
}
/* Mise en forme : ## sous-titre, **emphase**, [texte](https://lien) */
function inline(s) {
  return esc(s).replace(/\*\*(.+?)\*\*/g, '<em>$1</em>')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
}
function body(content) {
  return String(content || '').split('\n').map(l => l.trim()).filter(Boolean)
    .map(l => l.startsWith('##') ? `<h2>${inline(l.replace(/^##\s*/, ''))}</h2>` : `<p>${inline(l)}</p>`).join('\n');
}
const plain = c => String(c || '').replace(/^##\s*/gm, '').replace(/\*\*(.+?)\*\*/g, '$1').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/\s+/g, ' ').trim();
const cut = (s, n) => s.length > n ? s.slice(0, n - 1).trimEnd() + '…' : s;

function layout({ title, desc, url, image, active, main, type = 'website', ld, noindex }) {
  const img = image || `${SITE}/rect1.svg`;
  const nav = [['/', 'Accueil', 'home'], ...Object.entries(CATS).map(([k, c]) => ['/' + c.file, c.label, k]), ['/a-propos.html', 'À propos', 'about'], ['/contact.html', 'Contact', 'contact']];
  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<meta name="robots" content="${noindex ? 'noindex, follow' : 'index, follow, max-image-preview:large'}">
<link rel="canonical" href="${url}">
<link rel="icon" type="image/svg+xml" href="/rect1.svg">
<meta property="og:type" content="${type}"><meta property="og:site_name" content="Deuce Actu"><meta property="og:locale" content="fr_FR">
<meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}"><meta property="og:url" content="${url}"><meta property="og:image" content="${esc(img)}">
<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${esc(title)}"><meta name="twitter:description" content="${esc(desc)}"><meta name="twitter:image" content="${esc(img)}">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,700;12..96,800&family=Newsreader:opsz,wght@6..72,400;6..72,500;6..72,600&family=Figtree:wght@400;500;600;700;800&display=swap">
<link rel="stylesheet" href="/style.css">
${ld ? `<script type="application/ld+json">${JSON.stringify(ld)}</script>` : ''}
</head>
<body>
<header class="top"><div class="wrap bar">
  <a class="logo" href="/" aria-label="Deuce Actu, accueil"><svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M4.5 6.5c3 2 3 9 0 11M19.5 6.5c-3 2-3 9 0 11"/></svg>DEUCE ACTU</a>
  <nav id="nav" aria-label="Navigation principale">${nav.map(([h, l, k]) => `<a href="${h}"${k === active ? ' aria-current="page"' : ''}>${l}</a>`).join('')}</nav>
  <div class="tools"><a id="nav-write" class="pill" href="/admin.html" hidden>Rédiger</a><a id="nav-admin" class="ghost" href="/admin.html">Admin</a><button id="burger" aria-label="Menu" aria-expanded="false">☰</button></div>
</div></header>
<main>${main}</main>
<footer class="foot"><div class="wrap cols">
  <div><p class="logo">DEUCE ACTU</p><p class="small">L'actualité indépendante des circuits ATP, WTA et ITF : analyses, résultats et portraits.</p>
  <p class="social"><a href="https://www.instagram.com/deuceactu/" target="_blank" rel="noopener">Instagram</a><a href="https://www.linkedin.com/in/deuce-actu-1061b2228" target="_blank" rel="noopener">LinkedIn</a></p></div>
  <div><p class="fh">Rubriques</p>${Object.values(CATS).map(c => `<a href="/${c.file}">${c.label}</a>`).join('')}</div>
  <div><p class="fh">Informations</p><a href="/a-propos.html">À propos</a><a href="/contact.html">Contact</a><a href="/confidentialite.html">Confidentialité</a><a href="/mentions-legales.html">Mentions légales</a></div>
</div><p class="wrap copy">© ${new Date().getFullYear()} Deuce Actu. Tous droits réservés.</p></footer>
<div id="cookie" class="cookie" hidden><p>Nous utilisons des cookies pour mesurer l'audience (Google Analytics) et afficher des annonces (Google AdSense). <a href="/confidentialite.html">En savoir plus</a></p><div><button id="ck-no">Refuser</button><button id="ck-yes" class="yes">Accepter</button></div></div>
<script src="/site.js" defer></script>
</body></html>`;
}

const chip = c => `<span class="chip chip-${c.toLowerCase()}">${esc(c === 'DIVERS' ? 'Divers' : c)}</span>`;
const media = a => a.image ? `<img src="${esc(a.image)}" alt="${esc(a.title)}" style="object-position:${esc(a.image_position || 'center center')}" loading="lazy">` : '';
const card = a => `<a class="card" href="${a.url}"><div class="media">${media(a)}</div><div class="cbody">${chip(a.category)}<h3>${esc(a.title)}</h3><p>${esc(cut(plain(a.content), 130))}</p><span class="meta">${esc(a.date || '')}</span></div></a>`;
const hero = (eyebrow, h1, big) => `<section class="hero${big ? ' big' : ''}"><div class="wrap"><p class="eyebrow">${eyebrow}</p><h1>${h1}</h1></div></section><div class="net" aria-hidden="true"></div>`;

async function fetchArticles() {
  const r = await fetch(`${SB_URL}/rest/v1/articles?select=*&order=id.desc`, { headers: { apikey: SB_KEY, Authorization: 'Bearer ' + SB_KEY } });
  if (!r.ok) throw new Error('Supabase ' + r.status + ' ' + await r.text());
  return r.json();
}
function write(rel, html) {
  const p = path.join(ROOT, rel); fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, html);
}

(async () => {
  const rows = await fetchArticles();
  const seen = new Set();
  const arts = rows.map(a => {
    a.category = String(a.category || 'DIVERS').toUpperCase();
    if (!CATS[a.category]) a.category = 'DIVERS';
    let s = slugify(a.title) || 'article-' + a.id;
    if (seen.has(s)) s += '-' + a.id;
    seen.add(s); a.slug = s; a.url = `/articles/${s}.html`;
    return a;
  });

  /* nettoyage : un article supprimé dans Supabase disparaît du site */
  fs.rmSync(path.join(ROOT, 'articles'), { recursive: true, force: true });

  /* pages articles */
  for (const a of arts) {
    const full = SITE + a.url, text = plain(a.content), iso = isoDate(a.date);
    const related = arts.filter(x => x.category === a.category && x.id !== a.id).slice(0, 3);
    write(`articles/${a.slug}.html`, layout({
      title: `${a.title} — Deuce Actu`, desc: cut(text, 160), url: full, image: a.image, active: a.category, type: 'article',
      ld: { '@context': 'https://schema.org', '@type': 'NewsArticle', headline: a.title, image: a.image ? [a.image] : undefined, datePublished: iso || undefined, author: { '@type': 'Person', name: a.author_name || 'Deuce Actu' }, publisher: { '@type': 'Organization', name: 'Deuce Actu', logo: { '@type': 'ImageObject', url: SITE + '/rect1.svg' } }, mainEntityOfPage: full, articleSection: CATS[a.category].label, description: cut(text, 200) },
      main: `<article class="wrap narrow art">
  <a class="back" href="/${CATS[a.category].file}">← ${CATS[a.category].label}</a>
  ${chip(a.category)}<h1>${esc(a.title)}</h1>
  <div class="byline"><span>${esc(a.date || '')}${a.author_name ? ' · par ' + esc(a.author_name) : ''}</span><button id="copy-link" type="button">Copier le lien</button></div>
  ${a.image ? `<figure class="cover"><img src="${esc(a.image)}" alt="${esc(a.title)}" style="object-position:${esc(a.image_position || 'center center')}"></figure>` : ''}
  <div class="prose">${body(a.content)}</div>
  <div id="owner" class="owner" data-id="${a.id}" data-author="${esc(a.author_id || '')}" hidden><a href="/admin.html?edit=${a.id}">Modifier</a><button type="button" id="owner-del">Supprimer</button></div>
</article>
${related.length ? `<section class="wrap block"><h2 class="sec">À lire aussi</h2><div class="grid">${related.map(card).join('')}</div></section>` : ''}`
    }));
  }

  /* accueil */
  const [first, ...rest] = arts;
  const featured = first ? `<a class="feature" href="${first.url}">${first.image ? `<img src="${esc(first.image)}" alt="${esc(first.title)}" style="object-position:${esc(first.image_position || 'center center')}">` : ''}<div class="fover">${chip(first.category)}<h2>${esc(first.title)}</h2><p>${esc(cut(plain(first.content), 180))}</p></div></a>` : '';
  const previews = Object.entries(CATS).map(([k, c]) => {
    const l = arts.filter(a => a.category === k).slice(0, 3);
    return l.length ? `<section class="block"><div class="sechead"><h2 class="sec">${c.label}</h2><a href="/${c.file}">Tout voir →</a></div><div class="grid">${l.map(card).join('')}</div></section>` : '';
  }).join('');
  write('index.html', layout({
    title: 'Deuce Actu — Actualités des circuits ATP, WTA et ITF', desc: "Toute l'actualité du tennis mondial : analyses, résultats et portraits sur les circuits ATP, WTA et ITF.", url: SITE + '/', active: 'home',
    ld: { '@context': 'https://schema.org', '@type': 'WebSite', name: 'Deuce Actu', url: SITE + '/' },
    main: `${hero('Le tennis, sans temps mort', "L'actualité du tennis mondial,<br>circuit par circuit.", true)}
<div class="wrap block">${arts.length ? featured : '<p class="empty">Aucun article publié pour le moment.</p>'}
${rest.length ? `<h2 class="sec">Derniers articles</h2><div class="grid">${rest.slice(0, 9).map(card).join('')}</div>` : ''}${previews}</div>`
  }));

  /* pages circuits */
  for (const [k, c] of Object.entries(CATS)) {
    const l = arts.filter(a => a.category === k);
    write(c.file, layout({ title: `${c.label} — Deuce Actu`, desc: c.desc, url: `${SITE}/${c.file}`, active: k,
      main: `${hero('Rubrique', c.label)}<div class="wrap block">${l.length ? `<div class="grid">${l.map(card).join('')}</div>` : `<p class="empty">Aucun article publié dans cette rubrique pour le moment.</p>`}</div>` }));
  }

  /* pages d'information */
  const info = (file, title, desc, inner, h = title) => write(file, layout({ title: `${title} — Deuce Actu`, desc, url: `${SITE}/${file}`, active: file.replace('.html', ''), main: `${hero('Deuce Actu', h)}<div class="wrap narrow block"><div class="panel prose">${inner}</div></div>` }));
  const mail = '<a href="mailto:presse@deucee.shop">presse@deucee.shop</a>';
  info('a-propos.html', 'À propos', "Deuce Actu est un site indépendant dédié à l'actualité du tennis mondial.", `<p>Deuce Actu est un site indépendant dédié à l'actualité du tennis mondial. Notre objectif : suivre au plus près les circuits <strong>ATP</strong>, <strong>WTA</strong> et <strong>ITF</strong>, avec des analyses, des résultats et des portraits de joueurs.</p><p>Le nom « Deuce » fait référence à l'égalité 40-40 : ce moment suspendu où tout peut encore basculer. Une belle image pour un site qui veut couvrir le tennis sans parti pris, tournoi après tournoi.</p><p>Une question, une remarque ? Utilisez notre <a href="/contact.html">formulaire de contact</a> ou écrivez-nous à ${mail}.</p>`, 'À propos de Deuce Actu');
  info('confidentialite.html', 'Politique de confidentialité', 'Politique de confidentialité de Deuce Actu : données personnelles, cookies et publicité.', `<p>La protection de vos données personnelles est une priorité pour <strong>Deuce Actu</strong>.</p><h2>1. Collecte des données</h2><p>Nous collectons les informations que vous nous fournissez via le formulaire de contact (nom, adresse e-mail, message). Elles sont utilisées uniquement pour répondre à vos demandes.</p><h2>2. Cookies et publicité</h2><p>Avec votre accord, le site utilise des cookies pour mesurer l'audience (Google Analytics) et afficher des annonces (Google AdSense). Ces services ne sont chargés qu'après acceptation, et vous pouvez refuser via le bandeau d'information.</p><h2>3. Hébergement et sous-traitants</h2><p>Le site est hébergé par GitHub, Inc. (GitHub Pages) et utilise Supabase pour le stockage des articles et des messages de contact. Ces prestataires peuvent traiter des données techniques (adresse IP, journaux de connexion) dans le strict cadre de leur service.</p><h2>4. Vos droits</h2><p>Conformément au RGPD, vous disposez d'un droit d'accès, de rectification et de suppression de vos données. Pour les exercer : ${mail}.</p>`);
  info('mentions-legales.html', 'Mentions légales', 'Mentions légales de Deuce Actu : éditeur, hébergement et propriété intellectuelle.', `<h2>Éditeur du site</h2><p>Le site Deuce Actu (deucee.shop) est édité par : <strong>[Tout le Tennis]</strong>, [particulier], joignable à ${mail}.</p><h2>Directeur de la publication</h2><p>[Nom du responsable de la publication à compléter].</p><h2>Hébergement</h2><p><strong>GitHub, Inc.</strong> (GitHub Pages), 88 Colin P. Kelly Jr Street, San Francisco, CA 94107, États-Unis. Nom de domaine enregistré auprès de <strong>IONOS SE</strong>, Elgendorfer Straße 57, 56410 Montabaur, Allemagne.</p><h2>Base de données</h2><p>Les articles, comptes administrateurs et messages de contact sont stockés via <strong>Supabase</strong>.</p><h2>Propriété intellectuelle</h2><p>L'ensemble des contenus (textes, photos, mise en page) est protégé par le droit d'auteur. Toute reproduction sans autorisation préalable est interdite.</p><h2>Publicité</h2><p>Ce site diffuse des annonces via Google AdSense. Voir la <a href="/confidentialite.html">politique de confidentialité</a>.</p>`);
  write('contact.html', layout({ title: 'Contact — Deuce Actu', desc: "Contactez l'équipe de Deuce Actu pour toute question, remarque ou suggestion.", url: SITE + '/contact.html', active: 'contact',
    main: `${hero('Une question ?', 'Nous contacter')}<div class="wrap narrow block"><form id="contact-form" class="panel form">
<label>Nom<input id="c-name" required autocomplete="name"></label><label>Email<input id="c-email" type="email" required autocomplete="email"></label><label>Message<textarea id="c-msg" rows="6" required></textarea></label>
<button class="btn" type="submit">Envoyer le message</button><p id="c-ok" class="ok" hidden>Message envoyé, merci ! Nous vous répondrons rapidement.</p><p id="c-err" class="err" hidden>L'envoi a échoué. Réessayez dans un instant.</p></form></div>` }));
  write('404.html', layout({ title: 'Page introuvable — Deuce Actu', desc: 'Page introuvable.', url: SITE + '/404.html', noindex: true,
    main: `${hero('Faute !', 'Cette page est sortie du court.')}<div class="wrap narrow block"><p class="empty">Elle n'existe pas ou plus. <a href="/">Retour à l'accueil</a></p></div>` }));

  /* espace rédaction (page générée pour partager l'en-tête et le pied de page) */
  write('admin.html', layout({ title: 'Espace rédaction — Deuce Actu', desc: 'Espace rédaction', url: SITE + '/admin.html', noindex: true,
    main: `${hero('Espace privé', 'Espace rédaction')}<div class="wrap narrow block">
<form id="login" class="panel form" hidden><label>Email<input id="l-email" type="email" required autocomplete="username"></label><label>Mot de passe<input id="l-pass" type="password" required autocomplete="current-password"></label><button class="btn" type="submit">Se connecter</button><p id="l-err" class="err" hidden>Identifiants incorrects.</p></form>
<div id="app" hidden>
<div class="tabs"><button id="t-write" class="on" type="button">Rédiger</button><button id="t-mine" type="button">Mes articles</button><button id="t-out" type="button" style="margin-left:auto">Déconnexion</button></div>
<p id="done" class="ok panel" hidden></p>
<form id="write" class="panel form">
<label>Titre<input id="a-title" required></label>
<label>Rubrique<select id="a-cat"><option value="ATP">Circuit ATP</option><option value="WTA">Circuit WTA</option><option value="ITF">Circuit ITF</option><option value="DIVERS">Divers</option></select></label>
<div><label>Photo de couverture</label><div id="drop" class="drop">Cliquer pour choisir une image</div><input id="a-file" type="file" accept="image/*" hidden>
<div id="frame" class="frame" hidden style="margin-top:.6rem"><img id="a-prev" alt=""><div id="fgrid" class="fgrid"></div></div><p id="frame-help" class="small" hidden>Clique sur la grille pour choisir le cadrage.</p></div>
<div><label>Contenu</label><div class="bar2"><button type="button" data-w="**">Emphase</button><button type="button" data-h="1">Sous-titre</button><button type="button" data-l="1">Lien</button><button type="button" id="b-prev">Aperçu</button></div>
<textarea id="a-text" rows="14" required placeholder="Écris ton article ici. Une ligne vide ou un retour à la ligne crée un nouveau paragraphe."></textarea><div id="preview" class="preview prose" hidden style="margin-top:.5rem"></div><p id="count" class="small">0 mot</p></div>
<div style="display:flex;gap:.6rem"><button class="btn" id="a-send" type="submit">Publier l'article</button><button class="btn" id="a-cancel" type="button" style="background:#64748b" hidden>Annuler la modification</button></div><p id="a-err" class="err" hidden></p>
</form>
<div id="list" hidden style="display:grid;gap:.6rem"></div>
<details><summary>Mise en ligne immédiate (facultatif)</summary><p style="margin:.6rem 0">Sans réglage, un article apparaît sur le site sous 15 minutes. Pour qu'il apparaisse en 2 minutes, colle ici un jeton GitHub (Fine-grained, accès « Contents : Read and write » sur ton dépôt). Il reste stocké dans ce navigateur uniquement.</p><input id="gh" placeholder="github_pat_…" type="password"><button class="btn" id="gh-save" type="button" style="margin-top:.5rem">Enregistrer le jeton</button></details>
</div></div><script src="/admin.js" defer></script>` }));

  /* anciens liens article.html?a=slug → nouvelles URLs */
  write('article.html', `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><meta name="robots" content="noindex"><title>Redirection…</title><script>var a=new URLSearchParams(location.search).get('a')||'';location.replace(a?'/articles/'+encodeURIComponent(a)+'.html':'/');</script></head><body><a href="/">Deuce Actu</a></body></html>`);

  /* sitemap */
  const urls = [['/', 'daily', '1.0'], ...Object.values(CATS).map(c => ['/' + c.file, 'daily', '0.8']), ['/a-propos.html', 'monthly', '0.3'], ['/contact.html', 'monthly', '0.3'], ['/confidentialite.html', 'yearly', '0.2'], ['/mentions-legales.html', 'yearly', '0.2']]
    .map(([u, f, p]) => `  <url><loc>${SITE}${u}</loc><changefreq>${f}</changefreq><priority>${p}</priority></url>`)
    .concat(arts.map(a => `  <url><loc>${SITE}${a.url}</loc>${isoDate(a.date) ? `<lastmod>${isoDate(a.date)}</lastmod>` : ''}<changefreq>weekly</changefreq><priority>0.6</priority></url>`));
  write('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`);
  console.log(`Site généré : ${arts.length} article(s).`);
})().catch(e => { console.error(e); process.exit(1); });
