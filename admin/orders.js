'use strict';
(() => {
  const $ = id => document.getElementById(id);
  const labels = { new: 'À traiter', confirmed: 'Confirmée', dispatched: 'Expédiée', delivered: 'Livrée', cancelled: 'Annulée' };
  const money = n => new Intl.NumberFormat('fr-MA', { style: 'currency', currency: 'MAD', maximumFractionDigits: 0 }).format(n);
  const date = s => new Intl.DateTimeFormat('fr-MA', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Africa/Casablanca' }).format(new Date(s));
  const fold = s => String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  let token = sessionStorage.getItem('hidrissi-orders-token') || '', orders = [], cursor = null, busy = false, popup = null;
  const node = (tag, value, cls) => { const e = document.createElement(tag); if (value !== undefined) e.textContent = value; if (cls) e.className = cls; return e; };
  function message(text, error = false) { $('message').textContent = text; $('message').classList.toggle('error', error); }
  async function api(method = 'GET', body, nextCursor) {
    const response = await fetch('/api/orders' + (nextCursor ? '?cursor=' + encodeURIComponent(nextCursor) : ''), { method, cache: 'no-store', headers: { Authorization: 'Bearer ' + token, ...(body ? { 'Content-Type': 'application/json' } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
    const result = await response.json();
    if (response.status === 401 || response.status === 403) { logout(); throw new Error('Connectez-vous avec un compte autorisé à gérer la boutique.'); }
    if (!response.ok) throw new Error(result.error === 'storage_not_configured' ? 'Le stockage privé des commandes doit encore être connecté. Contactez votre administrateur.' : 'Impossible de charger ou d’enregistrer les commandes. Réessayez.');
    return result;
  }
  function filtered() { const q = fold($('search').value.trim()), status = $('status-filter').value; return orders.filter(o => (status === 'all' || o.status === status) && (!q || fold([o.id, o.name, o.phone, o.city, o.address, o.product, o.note].join(' ')).includes(q))); }
  function render() {
    $('rows').replaceChildren();
    $('count').textContent = orders.length;
    $('new-count').textContent = orders.filter(o => o.status === 'new').length;
    $('amount').textContent = money(orders.filter(o => o.status !== 'cancelled').reduce((sum, o) => sum + o.total, 0));
    const visible = filtered();
    $('scope').textContent = visible.length + ' commande(s) affichée(s)' + (cursor ? ' · D’autres commandes sont disponibles. Recherche et export concernent les commandes déjà chargées.' : ' · Toutes les commandes sont chargées.');
    $('empty').hidden = !!visible.length;
    $('empty').textContent = orders.length ? 'Aucune commande ne correspond à votre recherche.' : 'Aucune commande pour le moment. Les prochaines demandes du formulaire apparaîtront ici.';
    $('more').hidden = !cursor;
    $('export').disabled = !visible.length || busy;
    for (const order of visible) {
      const tr = node('tr');
      const cell = (...children) => { const td = node('td'); td.append(...children); tr.append(td); return td; };
      cell(node('strong', 'H-' + order.id.slice(14, 22).toUpperCase()), node('small', date(order.createdAt)));
      cell(node('strong', order.name), node('small', order.phone));
      cell(node('strong', order.product), node('small', order.qty + ' × ' + money(order.unitPrice)), node('strong', money(order.total)));
      cell(node('strong', order.city || '—'), node('small', order.address || 'Adresse non précisée'));
      const select = node('select'); select.setAttribute('aria-label', 'Statut de la commande de ' + order.name); select.dataset.status = order.status;
      for (const [value, label] of Object.entries(labels)) { const option = node('option', label); option.value = value; option.selected = value === order.status; select.append(option); }
      select.addEventListener('change', async () => {
        const previous = order.status; select.disabled = true;
        try { const result = await api('PATCH', { id: order.id, status: select.value }); order.status = result.status; order.updatedAt = result.updatedAt; render(); message('Statut enregistré.'); }
        catch (error) { select.value = previous; message(error.message, true); }
        finally { select.disabled = false; }
      });
      cell(select);
      const details = node('button', 'Voir les détails'); details.addEventListener('click', () => showDetails(order)); cell(details);
      $('rows').append(tr);
    }
  }
  function showDetails(o) {
    const fields = { 'Référence complète': o.id, 'Reçue le': date(o.createdAt), 'Client': o.name, 'Téléphone': o.phone, 'Ville': o.city, 'Adresse': o.address, 'Modèle': o.product, 'Quantité': o.qty, 'Prix unitaire': money(o.unitPrice), 'Total': money(o.total), 'Note du client': o.note, 'Langue': o.lang === 'ar' ? 'Arabe' : 'Français', 'Statut': labels[o.status], 'Dernière mise à jour': date(o.updatedAt), 'Origine': 'Formulaire du site' };
    $('detail-fields').replaceChildren(); for (const [label, value] of Object.entries(fields)) $('detail-fields').append(node('dt', label), node('dd', value || '—'));
    $('contact').replaceChildren();
    const digits = o.phone.replace(/[^0-9]/g, '');
    const phone = node('a', 'Appeler le client'); phone.href = 'tel:' + o.phone.replace(/[^+0-9]/g, ''); $('contact').append(phone);
    if (digits) { const wa = node('a', 'Ouvrir WhatsApp'); wa.href = 'https://wa.me/' + (digits.startsWith('0') ? '212' + digits.slice(1) : digits); wa.target = '_blank'; wa.rel = 'noopener noreferrer'; $('contact').append(wa); }
    $('details').showModal();
  }
  async function load(more = false) {
    if (busy || !token) return;
    busy = true; $('refresh').disabled = $('more').disabled = $('export').disabled = true;
    $('login').hidden = true; $('dashboard').hidden = false; $('logout').hidden = false; message('Chargement des commandes…');
    try { const result = await api('GET', null, more ? cursor : null); orders = more ? [...orders, ...result.orders.filter(o => !orders.some(old => old.id === o.id))] : result.orders; orders.sort((a, b) => b.createdAt.localeCompare(a.createdAt)); cursor = result.cursor; message('Commandes actualisées.'); }
    catch (error) { message(error.message, true); $('login-message').textContent = error.message; }
    finally { busy = false; $('refresh').disabled = $('more').disabled = false; render(); }
  }
  function logout() { token = ''; sessionStorage.removeItem('hidrissi-orders-token'); orders = []; cursor = null; $('details').close(); $('dashboard').hidden = true; $('logout').hidden = true; $('login').hidden = false; }
  $('signin').addEventListener('click', () => { popup = window.open('/api/auth?provider=github&site_id=www.hidrissi.com', 'hidrissi-orders-login', 'width=700,height=750'); $('login-message').textContent = popup ? 'Terminez la connexion dans la fenêtre GitHub.' : 'Autorisez la fenêtre de connexion dans votre navigateur.'; });
  window.addEventListener('message', event => {
    if (!popup || event.source !== popup || event.origin !== location.origin || typeof event.data !== 'string') return;
    if (event.data === 'authorizing:github') { popup.postMessage('authorizing:github', location.origin); return; }
    if (!event.data.startsWith('authorization:github:success:')) return;
    try { const result = JSON.parse(event.data.slice('authorization:github:success:'.length)); if (typeof result.token !== 'string') return; token = result.token; sessionStorage.setItem('hidrissi-orders-token', token); popup.close(); popup = null; load(); } catch { $('login-message').textContent = 'La connexion a échoué. Réessayez.'; }
  });
  $('logout').addEventListener('click', logout); $('refresh').addEventListener('click', () => load()); $('more').addEventListener('click', () => load(true)); $('search').addEventListener('input', render); $('status-filter').addEventListener('change', render); $('close-details').addEventListener('click', () => $('details').close());
  $('export').addEventListener('click', () => {
    // Text prefix prevents formula execution when untrusted notes/phone numbers open in Excel.
    const csv = value => { let s = String(value ?? ''); if (/^[\s]*[=+\-@\t\r]/.test(s)) s = "'" + s; return '"' + s.replace(/"/g, '""') + '"'; };
    const rows = [['Référence', 'Date UTC', 'Nom', 'Téléphone', 'Ville', 'Adresse', 'Modèle', 'Quantité', 'Prix unitaire MAD', 'Total MAD', 'Note', 'Langue', 'Statut', 'Mise à jour UTC'], ...filtered().map(o => [o.id, o.createdAt, o.name, o.phone, o.city, o.address, o.product, o.qty, o.unitPrice, o.total, o.note, o.lang, labels[o.status], o.updatedAt])];
    const url = URL.createObjectURL(new Blob(['\ufeff' + rows.map(row => row.map(csv).join(';')).join('\r\n')], { type: 'text/csv;charset=utf-8' }));
    const a = node('a'); a.href = url; a.download = 'hidrissi-commandes-' + new Date().toISOString().slice(0, 10) + '.csv'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
  if (token) load();
})();
