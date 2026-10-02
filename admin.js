/* Espace rédaction : connexion, écriture, modification, suppression. */
window.addEventListener('load', async () => {
  const $ = s => document.querySelector(s);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const inline = s => esc(s).replace(/\*\*(.+?)\*\*/g, '<em>$1</em>').replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2">$1</a>');
  const slugify = t => String(t || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '-').replace(/[^\w-]+/g, '').replace(/--+/g, '-').replace(/^-+|-+$/g, '');
  const sb = await Deuce.getClient();
  let user = null, file = null, pos = 'center center', editing = null;
  const POS = ['left top', 'center top', 'right top', 'left center', 'center center', 'right center', 'left bottom', 'center bottom', 'right bottom'];

  async function showState() {
    const { data: { session } } = await sb.auth.getSession();
    user = session ? session.user : null;
    $('#login').hidden = !!user; $('#app').hidden = !user;
    if (user) { loadList(); const id = new URLSearchParams(location.search).get('edit'); if (id) loadEdit(Number(id)); }
  }
  $('#login').addEventListener('submit', async e => {
    e.preventDefault();
    const { error } = await sb.auth.signInWithPassword({ email: $('#l-email').value, password: $('#l-pass').value });
    $('#l-err').hidden = !error; if (!error) location.reload();
  });
  $('#t-out').addEventListener('click', async () => { await sb.auth.signOut(); location.href = '/'; });

  function tab(w) {
    $('#t-write').classList.toggle('on', w); $('#t-mine').classList.toggle('on', !w);
    $('#write').hidden = !w; $('#list').hidden = w; if (!w) loadList();
  }
  $('#t-write').onclick = () => tab(true); $('#t-mine').onclick = () => tab(false);

  /* cadrage de la photo */
  function buildGrid() {
    const g = $('#fgrid'); g.innerHTML = '';
    POS.forEach(p => { const b = document.createElement('button'); b.type = 'button'; b.title = p; if (p === pos) b.className = 'sel';
      b.onclick = () => { pos = p; $('#a-prev').style.objectPosition = p; g.querySelectorAll('button').forEach(x => x.className = ''); b.className = 'sel'; }; g.appendChild(b); });
  }
  function showFrame(src) { $('#a-prev').src = src; $('#a-prev').style.objectPosition = pos; $('#frame').hidden = false; $('#frame-help').hidden = false; $('#drop').hidden = true; buildGrid(); }
  $('#drop').onclick = () => $('#a-file').click();
  $('#a-file').onchange = e => { file = e.target.files[0]; if (file) { pos = 'center center'; showFrame(URL.createObjectURL(file)); } };

  /* éditeur */
  const t = $('#a-text');
  function refresh() {
    const v = t.value, n = v.trim() ? v.trim().split(/\s+/).length : 0;
    $('#count').textContent = n + (n > 1 ? ' mots' : ' mot');
    if (!$('#preview').hidden) $('#preview').innerHTML = v.split('\n').map(l => l.trim()).filter(Boolean).map(l => l.startsWith('##') ? `<h2>${inline(l.replace(/^##\s*/, ''))}</h2>` : `<p>${inline(l)}</p>`).join('');
  }
  t.addEventListener('input', refresh);
  document.querySelector('.bar2').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    const a = t.selectionStart, z = t.selectionEnd, sel = t.value.slice(a, z);
    if (b.dataset.w) t.setRangeText('**' + sel + '**', a, z, 'end');
    else if (b.dataset.h) { const st = t.value.lastIndexOf('\n', a - 1) + 1; t.setRangeText('## ', st, st, 'end'); }
    else if (b.dataset.l) { const u = prompt('Adresse du lien (https://…)'); if (!u) return; t.setRangeText(`[${sel || 'texte du lien'}](${u})`, a, z, 'end'); }
    else if (b.id === 'b-prev') $('#preview').hidden = !$('#preview').hidden;
    t.focus(); refresh();
  });

  function reset() {
    editing = null; file = null; pos = 'center center'; $('#write').reset();
    $('#frame').hidden = $('#frame-help').hidden = true; $('#drop').hidden = false;
    $('#a-send').textContent = "Publier l'article"; $('#a-cancel').hidden = true; refresh();
    history.replaceState(null, '', '/admin.html');
  }
  $('#a-cancel').onclick = reset;

  async function loadEdit(id) {
    const { data } = await sb.from('articles').select('*').eq('id', id).limit(1);
    const a = data && data[0]; if (!a || a.author_id !== user.id) return;
    editing = a; $('#a-title').value = a.title; $('#a-cat').value = a.category; t.value = a.content;
    pos = a.image_position || 'center center'; if (a.image) showFrame(a.image);
    $('#a-send').textContent = 'Enregistrer les modifications'; $('#a-cancel').hidden = false; tab(true); refresh();
  }

  $('#write').addEventListener('submit', async e => {
    e.preventDefault();
    const err = $('#a-err'), btn = $('#a-send'); err.hidden = true; btn.disabled = true;
    try {
      let image = editing ? editing.image : null;
      if (file) {
        const name = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${file.name.split('.').pop()}`;
        const up = await sb.storage.from('article-images').upload(name, file); if (up.error) throw up.error;
        image = sb.storage.from('article-images').getPublicUrl(name).data.publicUrl;
      }
      if (!image) throw new Error('Choisis une photo de couverture.');
      const row = { title: $('#a-title').value.trim(), category: $('#a-cat').value, content: t.value, image, image_position: pos };
      if (editing) { const { error } = await sb.from('articles').update(row).eq('id', editing.id).eq('author_id', user.id); if (error) throw error; }
      else {
        Object.assign(row, { date: new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }), author_id: user.id, author_name: (user.email || '').split('@')[0] });
        const { error } = await sb.from('articles').insert([row]); if (error) throw error;
      }
      const quick = await Deuce.triggerBuild();
      const d = $('#done'); d.hidden = false;
      d.textContent = `Enregistré. L'article sera en ligne ${quick ? 'dans environ 2 minutes' : "d'ici 15 minutes au plus"} à l'adresse /articles/${slugify(row.title)}.html`;
      reset(); window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (x) { err.textContent = 'Erreur : ' + x.message; err.hidden = false; }
    btn.disabled = false;
  });

  async function loadList() {
    const { data } = await sb.from('articles').select('*').eq('author_id', user.id).order('id', { ascending: false });
    const box = $('#list');
    if (!data || !data.length) { box.innerHTML = '<p class="empty">Tu n\'as encore publié aucun article.</p>'; return; }
    box.innerHTML = data.map(a => `<div class="row">${a.image ? `<img src="${esc(a.image)}" alt="">` : ''}<div class="grow"><b>${esc(a.title)}</b><span class="small">${esc(a.category)} · ${esc(a.date || '')}</span></div><a href="/articles/${slugify(a.title)}.html">Voir</a><button data-e="${a.id}">Modifier</button><button data-d="${a.id}">Supprimer</button></div>`).join('');
    box.onclick = async ev => {
      const b = ev.target.closest('button'); if (!b) return;
      if (b.dataset.e) loadEdit(Number(b.dataset.e));
      if (b.dataset.d && confirm('Supprimer définitivement cet article ?')) {
        const { error } = await sb.from('articles').delete().eq('id', Number(b.dataset.d)).eq('author_id', user.id);
        if (error) return alert('Erreur : ' + error.message);
        Deuce.triggerBuild(); loadList();
      }
    };
  }

  $('#gh').value = localStorage.getItem('deuce_gh_token') || '';
  $('#gh-save').onclick = () => { localStorage.setItem('deuce_gh_token', $('#gh').value.trim()); alert('Jeton enregistré dans ce navigateur.'); };
  showState();
});
