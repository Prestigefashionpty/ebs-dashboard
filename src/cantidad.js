/* Cantidad al agregar: en vez de sumar 1 directo, abre una ventanita para escribir
   cuántas unidades. En el carrito la cantidad también se puede escribir.
   Y el carrito usa el alto real de la pantalla del celular (el botón de WhatsApp
   quedaba escondido detrás de la barra del navegador). */
(function(){
  if(typeof cart === 'undefined' || typeof updateCart !== 'function') return;
  var $ = function(id){ return document.getElementById(id); };
  document.querySelectorAll('#qs-ov,#qs-css').forEach(function(e){ e.remove(); });

  var st = document.createElement('style'); st.id = 'qs-css';
  st.textContent =
    '#qs-ov{position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:260;display:none;align-items:center;justify-content:center;}' +
    '#qs-ov.on{display:flex;}' +
    '#qs-ov .qs{background:var(--surface);border:1px solid var(--border);border-radius:14px;width:min(380px,calc(100vw - 24px));padding:18px;box-shadow:0 20px 60px rgba(0,0,0,.4);}' +
    '#qs-ov .qs-h{display:flex;gap:12px;align-items:flex-start;margin-bottom:12px;}' +
    '#qs-ov .qs-h img{width:64px;height:64px;object-fit:contain;background:#fff;border-radius:8px;flex:none;}' +
    '#qs-ov .qs-ref{font-family:"DM Mono",monospace;font-size:12px;color:var(--muted);}' +
    '#qs-ov .qs-d{font-size:13px;line-height:1.3;margin-top:2px;}' +
    '#qs-ov .qs-p{font-size:13px;color:var(--green);font-weight:700;margin-top:4px;}' +
    '#qs-ov .qs-x{margin-left:auto;background:none;border:none;color:var(--muted);font-size:20px;cursor:pointer;padding:0 4px;}' +
    '#qs-ov .qs-row{display:flex;align-items:center;justify-content:center;gap:10px;margin:6px 0 10px;}' +
    '#qs-ov .qs-row button{width:48px;height:48px;border-radius:10px;border:1px solid var(--border);background:var(--surface2);color:var(--text);font-size:24px;cursor:pointer;}' +
    '#qs-ov .qs-row input{width:110px;height:48px;text-align:center;font-size:24px;font-weight:700;border-radius:10px;border:2px solid var(--accent);background:var(--surface2);color:var(--text);}' +
    '#qs-ov .qs-quick{display:flex;gap:6px;justify-content:center;flex-wrap:wrap;margin-bottom:10px;}' +
    '#qs-ov .qs-quick button{border:1px solid var(--border);background:var(--surface2);color:var(--text);border-radius:999px;padding:6px 12px;font-size:13px;cursor:pointer;}' +
    '#qs-ov .qs-info{text-align:center;font-size:12px;color:var(--muted);min-height:16px;margin-bottom:12px;}' +
    '#qs-ov .qs-info b{color:var(--text);}' +
    '#qs-ov .qs-info .qs-w{color:var(--orange,#f59e0b);display:block;margin-top:3px;}' +
    '#qs-ov .qs-ok{width:100%;padding:13px;border:none;border-radius:10px;background:var(--accent);color:#fff;font-size:15px;font-weight:700;cursor:pointer;}' +
    '#qs-ov .qs-rm{width:100%;margin-top:8px;padding:9px;border:none;background:none;color:var(--red);font-size:13px;cursor:pointer;}' +
    '@media(max-width:768px){#qs-ov{align-items:flex-end;}#qs-ov .qs{width:100vw;border-radius:16px 16px 0 0;padding:18px 16px calc(18px + env(safe-area-inset-bottom));}}' +
    /* carrito: cantidad escribible */
    '.cart-item-qty input{width:58px;height:30px;text-align:center;font-size:14px;font-weight:700;border-radius:6px;border:1px solid var(--border);background:var(--surface);color:var(--text);}' +
    '.cart-item-qty button{width:30px!important;height:30px!important;font-size:16px!important;}' +
    /* carrito: alto real de la pantalla y botón de WhatsApp siempre visible */
    '.cart-panel{height:calc(100vh - var(--fx-nav,56px));}' +
    '@supports (height:100dvh){.cart-panel{height:calc(100dvh - var(--fx-nav,56px))!important;}}' +
    '.cart-panel .cart-items{min-height:0;}' +
    '#cl-wa-big{flex:none;margin-bottom:calc(14px + env(safe-area-inset-bottom))!important;}' +
    '#qs-tot{flex:none;padding:10px 14px 0;font-size:13px;color:var(--muted);display:flex;justify-content:space-between;border-top:1px solid var(--border);}' +
    '#qs-tot b{color:var(--text);}';
  document.head.appendChild(st);

  var ov = document.createElement('div'); ov.id = 'qs-ov';
  ov.innerHTML = '<div class="qs" role="dialog" aria-modal="true">' +
    '<div class="qs-h"><img alt=""><div><div class="qs-ref"></div><div class="qs-d"></div><div class="qs-p"></div></div><button type="button" class="qs-x" aria-label="Cerrar">✕</button></div>' +
    '<div class="qs-row"><button type="button" data-d="-1" aria-label="Menos">−</button><input type="number" inputmode="numeric" min="1" step="1" aria-label="Cantidad"><button type="button" data-d="1" aria-label="Más">+</button></div>' +
    '<div class="qs-quick"><button type="button" data-v="6">6</button><button type="button" data-v="12">12</button><button type="button" data-v="24">24</button><button type="button" data-v="48">48</button><button type="button" data-v="all">Todo</button></div>' +
    '<div class="qs-info"></div>' +
    '<button type="button" class="qs-ok">Agregar a la orden</button><button type="button" class="qs-rm" hidden>Quitar de la orden</button></div>';
  document.body.appendChild(ov);
  var inp = ov.querySelector('input'), cur = null, fromBtn = null;

  function money(n){ return '$' + (+n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
  function precio(p){ return +p.precio || 0; }
  function disp(p){ return +p.disp || 0; }
  function val(){ var v = parseInt(inp.value, 10); return isNaN(v) || v < 0 ? 0 : v; }
  function info(){
    if(!cur) return;
    var q = val(), d = disp(cur), h = '';
    h = q ? '<b>' + q + '</b> uds × ' + money(precio(cur)) + ' = <b>' + money(q * precio(cur)) + '</b>' : 'Escribe la cantidad';
    if(d > 0 && q > d) h += '<span class="qs-w">Solo hay ' + d + ' disponibles</span>';
    else if(d > 0) h += '<span style="display:block;margin-top:3px">' + d + ' disponibles</span>';
    ov.querySelector('.qs-info').innerHTML = h;
    ov.querySelector('.qs-ok').disabled = !q;
    ov.querySelector('.qs-ok').style.opacity = q ? '' : '.5';
  }
  function abrir(ref, btn){
    var p = PRODUCTS.find(function(x){ return x.ref === ref; }); if(!p) return;
    cur = p; fromBtn = btn || null;
    var ya = cart[ref] ? cart[ref].qty : 0;
    var img = ov.querySelector('.qs-h img'), src = '';
    if(btn){ var c = btn.closest('.card,.list-item'); var im = c && c.querySelector('img'); if(im && im.src && im.naturalWidth > 1) src = im.src; }
    img.style.display = src ? '' : 'none'; if(src) img.src = src;
    ov.querySelector('.qs-ref').textContent = p.ref;
    ov.querySelector('.qs-d').textContent = (p.marca ? p.marca + ' · ' : '') + (p.desc || '');
    ov.querySelector('.qs-p').textContent = money(precio(p)) + ' c/u';
    ov.querySelector('.qs-ok').textContent = ya ? 'Cambiar cantidad' : 'Agregar a la orden';
    ov.querySelector('.qs-rm').hidden = !ya;
    ov.querySelector('[data-v=all]').hidden = !(disp(p) > 0);
    inp.value = ya || 1;
    ov.classList.add('on'); info();
    setTimeout(function(){ inp.focus(); inp.select(); }, 60);
  }
  function cerrar(){ ov.classList.remove('on'); cur = null; fromBtn = null; }
  function preguntarCliente(){
    try {
      if(typeof clientAsked !== 'undefined' && !clientAsked && $('ov-client')){
        clientAsked = true;
        setTimeout(function(){ $('ov-client').style.display = 'flex'; var i = $('inp-cliente'); if(i) i.focus(); }, 200);
      }
    } catch(e){}
  }
  function confirmar(){
    if(!cur) return; var q = val(); if(!q) return;
    var nuevo = !cart[cur.ref];
    cart[cur.ref] = Object.assign({}, cur, { qty: q });
    updateCart();
    var b = fromBtn; cerrar();
    if(b && typeof flyToCart === 'function'){ try { flyToCart(b); } catch(e){} }
    if(nuevo) preguntarCliente();
  }

  ov.addEventListener('click', function(e){
    if(e.target === ov || e.target.closest('.qs-x')) return cerrar();
    var d = e.target.closest('[data-d]'); if(d){ inp.value = Math.max(1, val() + (+d.dataset.d)); info(); return; }
    var v = e.target.closest('[data-v]'); if(v){ inp.value = v.dataset.v === 'all' ? disp(cur) : v.dataset.v; info(); return; }
    if(e.target.closest('.qs-ok')) return confirmar();
    if(e.target.closest('.qs-rm')){ if(cur){ delete cart[cur.ref]; updateCart(); } cerrar(); }
  });
  inp.addEventListener('input', info);
  inp.addEventListener('keydown', function(e){ if(e.key === 'Enter'){ e.preventDefault(); confirmar(); } if(e.key === 'Escape') cerrar(); });
  document.addEventListener('keydown', function(e){ if(e.key === 'Escape' && ov.classList.contains('on')) cerrar(); });

  window.qaBtn = function(btn){ abrir(btn.dataset.ref, btn); };
  window.quickAdd = function(ref){ abrir(ref, null); };

  /* carrito: cantidad escribible + total */
  var _uc = window.updateCart;
  window.updateCart = function(){
    var r = _uc.apply(this, arguments);
    try {
      document.querySelectorAll('#cart-items .cart-item').forEach(function(it){
        var refEl = it.querySelector('.cart-item-ref'), sp = it.querySelector('.cart-item-qty span');
        if(!refEl || !sp) return;
        var ref = refEl.textContent.trim(); if(!cart[ref]) return;
        var i = document.createElement('input'); i.type = 'number'; i.inputMode = 'numeric'; i.min = '0'; i.value = cart[ref].qty; i.setAttribute('aria-label', 'Cantidad ' + ref);
        i.onchange = function(){ var v = parseInt(i.value, 10); if(isNaN(v) || v <= 0) delete cart[ref]; else cart[ref].qty = v; updateCart(); };
        i.onkeydown = function(e){ if(e.key === 'Enter') i.blur(); };
        sp.replaceWith(i);
      });
      var panel = $('cart-panel'), items = Object.values(cart), tot = $('qs-tot');
      if(panel){
        if(!tot){ tot = document.createElement('div'); tot.id = 'qs-tot'; var wa = $('cl-wa-big'); panel.insertBefore(tot, wa || null); }
        var u = items.reduce(function(s, x){ return s + x.qty; }, 0), m = items.reduce(function(s, x){ return s + x.qty * (+x.precio || 0); }, 0);
        tot.style.display = items.length ? '' : 'none';
        tot.innerHTML = '<span>' + items.length + ' estilo' + (items.length === 1 ? '' : 's') + ' · <b>' + u + '</b> uds</span><span>Total <b>' + money(m) + '</b></span>';
        var wa2 = $('cl-wa-big'); if(wa2 && tot.nextSibling !== wa2) panel.insertBefore(tot, wa2);
      }
    } catch(e){ console.warn('cantidad', e); }
    return r;
  };
  updateCart();
})();
