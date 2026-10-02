/* Deuce Actu — comportements communs : menu, cookies, connexion admin, contact */
(function () {
  const SB_URL = 'https://wywfqdlrlncvqvxznshm.supabase.co';
  const SB_KEY = 'sb_publishable_PZ56ks1RrEOtoOw14hb2jg_-3zaZA3b';
  const GH_REPO = 'TON-COMPTE/TON-DEPOT'; // ex. "monpseudo/deuce-actu" : sert au bouton « mettre en ligne maintenant »
  const $ = s => document.querySelector(s);

  /* menu mobile */
  const burger = $('#burger'), nav = $('#nav');
  burger.addEventListener('click', () => { const o = nav.classList.toggle('open'); burger.setAttribute('aria-expanded', o); });

  /* copier le lien d'un article */
  const copy = $('#copy-link');
  if (copy) copy.addEventListener('click', () => navigator.clipboard.writeText(location.href).then(() => { copy.textContent = 'Lien copié'; setTimeout(() => copy.textContent = 'Copier le lien', 1800); }));

  /* cookies : Analytics et AdSense ne se chargent qu'après acceptation */
  function loadTracking() {
    const g = document.createElement('script'); g.async = true; g.src = 'https://www.googletagmanager.com/gtag/js?id=G-Z08NHR82GZ'; document.head.appendChild(g);
    window.dataLayer = window.dataLayer || []; window.gtag = function () { dataLayer.push(arguments); };
    gtag('js', new Date()); gtag('config', 'G-Z08NHR82GZ');
    const a = document.createElement('script'); a.async = true; a.crossOrigin = 'anonymous';
    a.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-7920113065336169'; document.head.appendChild(a);
  }
  const consent = localStorage.getItem('deuce_cookie_consent');
  if (consent === 'accepted') loadTracking();
  else if (!consent) $('#cookie').hidden = false;
  const answer = v => { localStorage.setItem('deuce_cookie_consent', v); $('#cookie').hidden = true; if (v === 'accepted') loadTracking(); };
  $('#ck-yes').addEventListener('click', () => answer('accepted'));
  $('#ck-no').addEventListener('click', () => answer('declined'));

  /* client Supabase chargé à la demande (les visiteurs n'en ont pas besoin pour lire) */
  let sbPromise;
  function getClient() {
    sbPromise = sbPromise || new Promise((res, rej) => {
      const s = document.createElement('script'); s.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
      s.onload = () => res(window.supabase.createClient(SB_URL, SB_KEY)); s.onerror = rej; document.head.appendChild(s);
    });
    return sbPromise;
  }
  async function triggerBuild() {
    const t = localStorage.getItem('deuce_gh_token');
    if (!t || GH_REPO.startsWith('TON-')) return false;
    const r = await fetch(`https://api.github.com/repos/${GH_REPO}/dispatches`, { method: 'POST', headers: { Authorization: 'Bearer ' + t, Accept: 'application/vnd.github+json' }, body: JSON.stringify({ event_type: 'articles-changed' }) });
    return r.status === 204;
  }
  window.Deuce = { getClient, triggerBuild };

  /* session admin : n'active Supabase que si une session existe déjà */
  if (localStorage.getItem('sb-wywfqdlrlncvqvxznshm-auth-token')) {
    getClient().then(async sb => {
      const { data: { session } } = await sb.auth.getSession();
      if (!session) return;
      $('#nav-write').hidden = false; $('#nav-admin').hidden = true;
      const owner = $('#owner');
      if (owner && owner.dataset.author === session.user.id) {
        owner.hidden = false;
        $('#owner-del').addEventListener('click', async () => {
          if (!confirm('Supprimer définitivement cet article ?')) return;
          const { error } = await sb.from('articles').delete().eq('id', Number(owner.dataset.id)).eq('author_id', session.user.id);
          if (error) return alert('Erreur : ' + error.message);
          const quick = await triggerBuild();
          alert(quick ? 'Article supprimé. Le site se met à jour dans environ 2 minutes.' : 'Article supprimé. Le site se mettra à jour d\'ici 15 minutes.');
          location.href = '/';
        });
      }
    }).catch(() => {});
  }

  /* formulaire de contact */
  const form = $('#contact-form');
  if (form) form.addEventListener('submit', async e => {
    e.preventDefault();
    const ok = $('#c-ok'), err = $('#c-err'); ok.hidden = err.hidden = true;
    try {
      const sb = await getClient();
      const { error } = await sb.from('contacts').insert([{ name: $('#c-name').value, email: $('#c-email').value, message: $('#c-msg').value }]);
      if (error) throw error;
      form.reset(); ok.hidden = false;
    } catch (x) { err.hidden = false; }
  });
})();
