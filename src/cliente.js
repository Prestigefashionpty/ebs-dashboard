/* ===== CATÁLOGO POR LINK + PEDIDO POR WHATSAPP =====
   Vista interna: en "📋 Catálogo" el vendedor pone su nombre y WhatsApp y copia un link
   para el cliente. El link abre solo esos productos, con esos precios y siempre con el stock
   del día.
   Vista cliente (?c=...): sin botones internos. El cliente arma su pedido y toca
   "Enviar por WhatsApp": el pedido le llega al vendedor con un link que abre la orden con fotos.
   Los catálogos descargados en HTML también traen el botón de WhatsApp. */
(function(){
  var SITE_FALLBACK = 'https://prestigefashionpty.github.io/ebs-dashboard/';
  var SALT = 'attie-ebs-v1';
  var MAX_LINES = 40;
  var isHttp = /^https?:$/.test(location.protocol);
  var SITE = isHttp ? location.origin + location.pathname : SITE_FALLBACK;

  // ---------- utilidades ----------
  function $(id){ return document.getElementById(id); }
  function escT(v){ return String(v == null ? '' : v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
  function escA(v){ return escT(v).replace(/"/g,'&quot;'); }
  function b64e(str){ var b = new TextEncoder().encode(str), s = ''; for(var i = 0; i < b.length; i++) s += String.fromCharCode(b[i]); return btoa(s).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,''); }
  function b64d(str){ str = str.replace(/-/g,'+').replace(/_/g,'/'); while(str.length % 4) str += '='; var s = atob(str), b = new Uint8Array(s.length); for(var i = 0; i < s.length; i++) b[i] = s.charCodeAt(i); return new TextDecoder().decode(b); }
  function hash(str){ var h = 2166136261; for(var i = 0; i < str.length; i++){ h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); }
  function pack(obj){ var j = JSON.stringify(obj); return b64e(j) + '.' + hash(SALT + j); }
  function unpack(s){
    var k = s.lastIndexOf('.'); if(k < 0) return null;
    try{ var j = b64d(s.slice(0, k)); if(hash(SALT + j) !== s.slice(k + 1)) return null; return JSON.parse(j); }catch(e){ return null; }
  }
  function phone(v){
    var d = String(v || '').replace(/\D/g, '');
    if(d.length === 8) d = '507' + d;          // número de Panamá sin código de país
    return d;
  }
  function fecha(){ var d = new Date(), z = function(n){ return (n < 10 ? '0' : '') + n; }; return z(d.getDate()) + '/' + z(d.getMonth() + 1) + '/' + d.getFullYear(); }
  function money(n){ return '$' + Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
  function toast(t, ms){
    var el = $('cl-toast');
    if(!el){ el = document.createElement('div'); el.id = 'cl-toast'; document.body.appendChild(el); }
    el.innerHTML = t; el.className = 'show';
    clearTimeout(el._t); el._t = setTimeout(function(){ el.className = ''; }, ms || 3500);
  }
  function getVend(){ try{ return JSON.parse(localStorage.getItem('cl_vend') || '{}'); }catch(e){ return {}; } }
  function setVend(v){ try{ localStorage.setItem('cl_vend', JSON.stringify(v)); }catch(e){} }

  // ---------- estilos ----------
  var css = document.createElement('style');
  css.textContent = [
    '#cl-toast{position:fixed;left:50%;bottom:24px;transform:translateX(-50%) translateY(20px);background:#111827;color:#fff;padding:12px 18px;border-radius:10px;font-size:13px;z-index:400;opacity:0;pointer-events:none;transition:.2s;max-width:90vw;box-shadow:0 8px 24px rgba(0,0,0,.4)}',
    '#cl-toast.show{opacity:1;transform:translateX(-50%) translateY(0)}',
    '.cl-field label{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:var(--muted);display:block;margin:0 0 5px}',
    '.cl-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px}',
    '#cl-link-out{font-size:11px;word-break:break-all;color:var(--muted);background:var(--surface2);border-radius:8px;padding:8px 10px;margin-top:10px;display:none}',
    '.btn-wa{background:#25D366;color:#fff;border:none;border-radius:8px;font:700 12px var(--font);padding:6px 12px;cursor:pointer}',
    '.btn-wa:hover{background:#1ebe5b}',
    '#cl-wa-big{display:none;margin:10px 14px 14px;padding:13px;font-size:15px;width:calc(100% - 28px)}',
    '#cl-banner{background:rgba(79,110,247,.12);border-bottom:1px solid var(--border);padding:9px 20px;font-size:13px;display:flex;gap:12px;align-items:center;flex-wrap:wrap}',
    'html.cl-mode #pc-btn,html.cl-mode #alex-btn,html.cl-mode .cl-internal{display:none!important}',
    'html.cl-file #pc-btn,html.cl-file .cl-internal{display:none!important}'
  ].join('\n');
  document.head.appendChild(css);

  // =====================================================================
  // 1) VISTA INTERNA: "Copiar link para cliente" dentro de 📋 Catálogo
  // =====================================================================
  function currentPayload(v){
    var f = {};
    ['cia','marca','temp','year','grupo','color'].forEach(function(k){ if(chipFilters[k] && chipFilters[k].length) f[k] = chipFilters[k].slice(); });
    var p = { v: 1, f: f };
    var q = $('q') && $('q').value.trim(); if(q) p.q = q;
    var qx = $('qx') && $('qx').value.trim(); if(qx) p.qx = qx;
    var mn = $('f-min') && $('f-min').value; if(mn) p.mn = +mn;
    var mx = $('f-max') && $('f-max').value; if(mx) p.mx = +mx;
    if(fotoMode && fotoMode !== 'all') p.fm = fotoMode;
    if(PC && PC.on) p.pc = PC.rows.filter(function(r){ return parseFloat(r.f) > 0; });
    if(v.nombre) p.vn = v.nombre;
    if(v.tel) p.vt = phone(v.tel);
    if(v.cliente) p.cl = v.cliente;
    var titulo = (chipFilters.marca && chipFilters.marca.length === 1) ? chipFilters.marca[0] : '';
    if(titulo) p.t = titulo;
    return p;
  }

  function enhanceCatalogModal(){
    var body = document.querySelector('#catalog-modal .modal-body');
    if(!body || $('cl-vn')) return;
    var v = getVend();
    var box = document.createElement('div');
    box.className = 'cl-internal';
    box.innerHTML =
      '<div style="font-size:13px;font-weight:700;margin:4px 0 10px">🔗 Link para el cliente <span style="font-weight:400;color:var(--muted)">(siempre con el stock del día)</span></div>' +
      '<div class="cl-grid">' +
        '<div class="cl-field"><label>Vendedor</label><input id="cl-vn" placeholder="Tu nombre" value="' + escA(v.nombre || '') + '"></div>' +
        '<div class="cl-field"><label>WhatsApp del vendedor</label><input id="cl-vt" inputmode="tel" placeholder="6000-0000 o +507..." value="' + escA(v.tel || '') + '"></div>' +
      '</div>' +
      '<div class="cl-field" style="margin-bottom:12px"><label>Cliente (opcional)</label><input id="cl-cl" placeholder="Ej: SIMAN"></div>' +
      '<div style="display:flex;gap:8px"><button class="btn btn-primary" style="flex:2;padding:10px" id="cl-copy">🔗 Copiar link para cliente</button>' +
      '<button class="btn-wa" style="flex:1" id="cl-share">Enviar por WhatsApp</button></div>' +
      '<div id="cl-link-out"></div>' +
      '<div style="border-top:1px solid var(--border);margin:16px 0 12px"></div>' +
      '<div style="font-size:12px;color:var(--muted);margin-bottom:8px">O como antes, un archivo HTML con el stock de hoy:</div>';
    var dl = body.querySelector('button[onclick="downloadCatalog()"]');
    body.insertBefore(box, dl);
    if(dl){ dl.classList.remove('btn-primary'); dl.style.background = 'var(--surface2)'; dl.style.color = 'var(--text)'; dl.style.border = '1px solid var(--border)'; dl.style.padding = '10px'; }
    $('cl-copy').onclick = function(){ makeLink(false); };
    $('cl-share').onclick = function(){ makeLink(true); };
  }

  function makeLink(share){
    var v = { nombre: $('cl-vn').value.trim(), tel: $('cl-vt').value.trim(), cliente: $('cl-cl').value.trim() };
    if(!v.nombre || phone(v.tel).length < 8){ toast('Pon tu nombre y tu WhatsApp para que el pedido te llegue a ti.'); return; }
    setVend({ nombre: v.nombre, tel: v.tel });
    if(!filtered.length){ toast('No hay productos con los filtros actuales.'); return; }
    var url = SITE + '?c=' + pack(currentPayload(v));
    var out = $('cl-link-out'); out.style.display = 'block'; out.textContent = url;
    if(share){
      var p = currentPayload(v);
      var txt = (v.cliente ? 'Hola ' + v.cliente + ', ' : 'Hola, ') + 'aquí está el catálogo' + (p.t ? ' de ' + p.t : '') +
        ' con el inventario disponible. Puedes armar tu pedido ahí mismo y enviármelo por WhatsApp:\n' + url;
      window.open('https://wa.me/?text=' + encodeURIComponent(txt), '_blank');
      return;
    }
    var done = function(){ toast('✓ Link copiado (' + filtered.length.toLocaleString('es-PA') + ' productos). Pégalo en WhatsApp o correo.'); };
    if(navigator.clipboard && navigator.clipboard.writeText){
      navigator.clipboard.writeText(url).then(done, function(){ selectOut(out); toast('Copia el link de abajo.'); });
    } else { selectOut(out); toast('Copia el link de abajo.'); }
  }
  function selectOut(el){ var r = document.createRange(); r.selectNodeContents(el); var s = getSelection(); s.removeAllRanges(); s.addRange(r); }

  // El HTML descargado lleva los datos del vendedor (para el botón de WhatsApp del cliente)
  var _downloadCatalog = window.downloadCatalog;
  window.downloadCatalog = function(){
    var vn = $('cl-vn') ? $('cl-vn').value.trim() : '', vt = $('cl-vt') ? $('cl-vt').value.trim() : '', cl = $('cl-cl') ? $('cl-cl').value.trim() : '';
    if(vn || vt) setVend({ nombre: vn, tel: vt });
    var de = document.documentElement;
    var prev = de.getAttribute('data-vend');
    if(vn || vt) de.setAttribute('data-vend', JSON.stringify({ vn: vn, vt: phone(vt), cl: cl }));
    var cm = $('catalog-modal'); if(cm) cm.style.display = 'none';
    try{ _downloadCatalog(); } finally { if(prev === null) de.removeAttribute('data-vend'); else de.setAttribute('data-vend', prev); }
  };

  // =====================================================================
  // 2) PEDIDO POR WHATSAPP
  // =====================================================================
  var VEND = null;   // { vn, vt, cl } del link o del HTML descargado
  var CAT = null;    // payload del catálogo (para armar el link del pedido)

  function orderLink(){
    if(!CAT) return '';
    var items = Object.values(cart).map(function(i){ return [i.ref, i.qty]; });
    var o = { i: items, cl: orderCliente || '' };
    return SITE + '?c=' + pack(CAT) + '&o=' + pack(o);
  }

  function sendWhatsApp(){
    var items = Object.values(cart);
    if(!items.length){ toast('Tu pedido está vacío.'); return; }
    if(!orderCliente){
      toast('Escribe tu nombre o el de tu empresa y vuelve a tocar Enviar.', 4500);
      reopenClient(); return;
    }
    var vt = VEND && VEND.vt;
    var uds = 0, tot = 0;
    var lines = items.map(function(i, k){
      uds += i.qty; tot += i.qty * i.precio;
      var d = String(i.desc || '').slice(0, 32);
      return (k + 1) + '. ' + i.ref + ' – ' + d + '\n    ' + i.qty + ' × ' + money(i.precio) + ' = ' + money(i.qty * i.precio);
    });
    var shown = lines.slice(0, MAX_LINES);
    if(lines.length > MAX_LINES) shown.push('… y ' + (lines.length - MAX_LINES) + ' referencias más (ver link)');
    var link = orderLink();
    var msg = '*PEDIDO – ' + orderCliente + '*\n' +
      (VEND && VEND.vn ? 'Vendedor: ' + VEND.vn + '\n' : '') +
      'Fecha: ' + fecha() + '\n\n' +
      shown.join('\n') + '\n\n' +
      '*Total: ' + items.length + ' referencias · ' + uds.toLocaleString('en-US') + ' unidades · ' + money(tot) + '*' +
      (link ? '\n\nVer pedido con fotos: ' + link : '');
    var url = 'https://wa.me/' + (vt || '') + '?text=' + encodeURIComponent(msg);
    var w = window.open(url, '_blank');
    if(!w) location.href = url;
  }

  function addWhatsAppButtons(){
    if($('cl-wa-big')) return;
    var hdr = null;
    var big = document.createElement('button');
    big.id = 'cl-wa-big'; big.className = 'btn-wa';
    big.textContent = '📲 Enviar pedido por WhatsApp' + (VEND && VEND.vn ? ' a ' + VEND.vn : '');
    big.onclick = sendWhatsApp;
    var panel = $('cart-panel'); if(panel) panel.appendChild(big);
    var _uc = window.updateCart;
    window.updateCart = function(){
      _uc.apply(this, arguments);
      var n = Object.keys(cart).length;
      big.style.display = n ? 'block' : 'none';
    };
    updateCart();
  }

  // =====================================================================
  // 3) VISTA CLIENTE (?c=...)
  // =====================================================================
  function chipsHTML(vals, f){
    return vals.map(function(v){ return '<div class="chip" data-filter="' + f + '" data-val="' + escA(v) + '" onclick="toggleChip(this)">' + escT(v) + '</div>'; }).join('');
  }
  function uniq(arr, f){ var s = {}; arr.forEach(function(p){ var v = p[f]; if(v !== '' && v != null) s[v] = 1; }); return Object.keys(s).sort(); }

  function rebuildChips(){
    var sets = { cia: uniq(PRODUCTS, 'cia'), marca: uniq(PRODUCTS, 'marca'), temp: uniq(PRODUCTS, 'temp'), year: uniq(PRODUCTS, 'year').reverse(), grupo: uniq(PRODUCTS, 'grupo') };
    Object.keys(sets).forEach(function(f){
      var c = $('chips-' + f); if(!c) return;
      c.innerHTML = chipsHTML(sets[f], f);
      var sec = c.closest('.filter-section');
      if(sec) sec.style.display = (sets[f].length <= 1 || f === 'temp' || f === 'year') ? 'none' : '';
      var t = sec && sec.querySelector('.filter-title');
      if(t && /\(\d+\)/.test(t.textContent)) t.textContent = t.textContent.replace(/\(\d+\)/, '(' + sets[f].length + ')');
    });
    var colors = uniq(PRODUCTS, 'color');
    if(colors.length > 1 && !$('chips-color')){
      var stock = $('f-min') && $('f-min').closest('.filter-section');
      var sec = document.createElement('div'); sec.className = 'filter-section';
      sec.innerHTML = '<div class="filter-header"><span class="filter-title">Color (' + colors.length + ')</span><button class="filter-clear" onclick="clearFilter(\'color\')">Limpiar</button></div><div class="chips-scroll" id="chips-color">' + chipsHTML(colors, 'color') + '</div>';
      if(stock) stock.parentNode.insertBefore(sec, stock);
    }
  }

  function resetFilterState(){
    ['cia','marca','temp','year','grupo','color'].forEach(function(k){ chipFilters[k] = []; });
    if($('q')) $('q').value = '';
    if($('qx')) $('qx').value = '';
    if($('f-min')){ $('f-min').value = ''; $('f-max').value = ''; $('f-min-slider').value = 0; $('f-max-slider').value = 500; }
    fotoMode = 'all'; document.querySelectorAll('.foto-b').forEach(function(b){ b.classList.toggle('active', b.dataset.m === 'all'); });
  }

  function clientMode(p){
    document.documentElement.classList.add('cl-mode');
    // 1. precios del link (no se guardan en el navegador del cliente)
    PC = { on: !!(p.pc && p.pc.length), rows: p.pc || [] };
    pcApply();
    // 2. productos del catálogo = mismos filtros que usó el vendedor, con el stock de hoy
    resetFilterState();
    Object.keys(p.f || {}).forEach(function(k){ chipFilters[k] = p.f[k].slice(); });
    if(p.q && $('q')) $('q').value = p.q;
    if(p.qx && $('qx')) $('qx').value = p.qx;
    if(p.mn && $('f-min')) $('f-min').value = p.mn;
    if(p.mx && $('f-max')) $('f-max').value = p.mx;
    if(p.fm) fotoMode = p.fm;
    applyFilters();
    var subset = filtered.slice();
    PRODUCTS.length = 0; Array.prototype.push.apply(PRODUCTS, subset);
    resetFilterState();
    rebuildChips();
    $('f-sort').value = 'ord-asc';
    applyFilters();
    // 3. encabezado
    var titulo = p.t || (uniq(PRODUCTS, 'marca').length === 1 ? PRODUCTS[0].marca : 'Grupo Attie');
    var badge = document.querySelector('nav .nav-badge'); if(badge) badge.textContent = 'Catálogo · ' + titulo;
    document.title = titulo + ' · Catálogo';
    document.querySelectorAll('nav button').forEach(function(b){ if(/Catálogo/.test(b.textContent)) b.style.display = 'none'; });
    // 4. cliente y vendedor
    if(p.vn){ orderVendedor = p.vn; var iv = $('inp-vendedor'); if(iv){ iv.value = p.vn; iv.readOnly = true; } }
    if(p.cl){ orderCliente = p.cl; clientAsked = true; var info = $('cart-client-info'); if(info){ info.textContent = p.cl + (p.vn ? ' · ' + p.vn : ''); info.style.display = 'block'; } }
    var ic = $('inp-cliente'); if(ic) ic.placeholder = 'Nombre de tu empresa';
  }

  function loadOrder(o){
    var miss = [];
    o.i.forEach(function(it){
      var pr = PRODUCTS.find(function(x){ return x.ref === it[0]; });
      if(pr) cart[pr.ref] = Object.assign({}, pr, { qty: it[1] }); else miss.push(it[0] + ' (' + it[1] + ')');
    });
    if(o.cl){ orderCliente = o.cl; clientAsked = true; var info = $('cart-client-info'); if(info){ info.textContent = o.cl + (orderVendedor ? ' · ' + orderVendedor : ''); info.style.display = 'block'; } }
    updateCart();
    $('cart-panel').classList.add('open');
    var bar = document.createElement('div'); bar.id = 'cl-banner';
    var uds = Object.values(cart).reduce(function(s, i){ return s + i.qty; }, 0);
    bar.innerHTML = '<b>📦 Pedido de ' + escT(o.cl || 'cliente') + '</b><span>' + Object.keys(cart).length + ' referencias · ' + uds + ' uds</span>' +
      '<span style="color:var(--muted)">Usa “⬇ XLSX” en la orden para bajarlo.</span>' +
      (miss.length ? '<span style="color:var(--yellow)">⚠ Ya no están en el catálogo: ' + escT(miss.join(', ')) + '</span>' : '');
    var sb = document.querySelector('.stats-bar'); if(sb) sb.parentNode.insertBefore(bar, sb.nextSibling);
  }

  // ---------- arranque ----------
  var qs = new URLSearchParams(location.search);
  var c = qs.get('c');
  if(c){
    var p = unpack(c);
    if(!p){
      document.body.innerHTML = '<div style="padding:60px 20px;text-align:center;font-family:system-ui;color:#888">Este link no es válido o está incompleto. Pídele al vendedor que te lo envíe de nuevo.</div>';
      return;
    }
    CAT = p;
    VEND = { vn: p.vn || '', vt: p.vt || '', cl: p.cl || '' };
    clientMode(p);
    addWhatsAppButtons();
    var o = qs.get('o'), op = o && unpack(o);
    if(op && op.i) loadOrder(op);
  } else {
    var dv = document.documentElement.getAttribute('data-vend');
    if(dv){
      // HTML descargado para un cliente
      try{ VEND = JSON.parse(dv); }catch(e){ VEND = null; }
      document.documentElement.classList.add('cl-file');
      if(VEND){
        if(VEND.vn){ orderVendedor = VEND.vn; var iv = $('inp-vendedor'); if(iv){ iv.value = VEND.vn; iv.readOnly = true; } }
        if(VEND.cl){ orderCliente = VEND.cl; clientAsked = true; }
        if(VEND.vt) addWhatsAppButtons();
      }
    } else if(!isHttp){
      document.documentElement.classList.add('cl-file');
    } else {
      enhanceCatalogModal();
    }
  }
})();
