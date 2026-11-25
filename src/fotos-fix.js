(function(){
  var PIC = 'https://tmpmulimph2.olk.topmanage.cloud/agent/pic.aspx';
  var SZ_CARD = 400, SZ_LIST = 160, SZ_MODAL = 900;   // tamaños de miniatura (px, lado mayor)
  var CACHE_KEY = 'fotoCache_v2', CACHE_DAYS = 7;

  // ---- utilidades de URL ----
  function ciaId(p){ return p.cia === 'MM' ? '4' : '5'; }            // MM = Multimoda (ID=4), PF = Prestige (ID=5)
  function parse(u){
    if(!u) return null;
    var m = /[?&]ID=(\d+)/i.exec(u), f = /[?&]filename=([^&]*)/i.exec(u);
    if(!m || !f) return null;
    var fn = f[1]; try{ fn = decodeURIComponent(fn); }catch(e){}
    return { id: m[1], fn: fn };
  }
  function picUrl(c, size){
    return PIC + '?ID=' + c.id + (size ? '&Original=N&MaxSize=' + size : '&Original=Y') + '&filename=' + encodeURIComponent(c.fn);
  }
  // quita sufijo de talla al final de la referencia: OPWM0143-118-XXL -> OPWM0143-118
  function baseRef(r){
    return String(r).replace(/[-_](XXS|XS|S|M|L|XL|XXL|XXXL|2XL|3XL|4XL|OS|\d{1,2}(\.5)?|[MW]\d{1,2})$/i, '');
  }

  // ---- caché por navegador (evita volver a probar refs ya resueltas) ----
  var cache = {};
  try{
    var raw = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}');
    if(raw.t && (Date.now() - raw.t) < CACHE_DAYS*864e5) cache = raw.d || {};
  }catch(e){}
  var saveT = null;
  function saveCache(){
    clearTimeout(saveT);
    saveT = setTimeout(function(){ try{ localStorage.setItem(CACHE_KEY, JSON.stringify({t:Date.now(), d:cache})); }catch(e){} }, 800);
  }

  // ---- foto de referencia hermana (misma referencia base con otra talla) ----
  var sib = {};
  PRODUCTS.forEach(function(p){
    var c = parse(p.url); if(!c) return;
    var k = baseRef(p.ref).toUpperCase();
    if(!sib[k]) sib[k] = c;
  });

  // ---- candidatos en orden de prioridad ----
  function candidates(p){
    if(typeof p.fo === 'string' && p.fo) return [ parse(PIC + '?' + p.fo) ];   // el robot ya la encontró
    if(cache[p.ref] === '') return [];                              // ya se sabe que no hay foto
    if(cache[p.ref]) return [ parse(PIC + '?' + cache[p.ref]) ];
    var out = [], seen = {};
    function add(c){ if(!c) return; var k = c.id + '|' + c.fn.toUpperCase(); if(!seen[k]){ seen[k] = 1; out.push(c); } }
    add(parse(p.url));                                              // 1) la que viene del EBS
    var e = parse(p.url); if(e) add({ id: e.id === '4' ? '5' : '4', fn: e.fn });   // 1b) mismo archivo en la otra empresa
    var b = baseRef(p.ref), id = ciaId(p);
    add(sib[b.toUpperCase()]);                                      // 2) foto de la misma ref en otra talla
    add({ id: id, fn: p.ref + '.JPG' });                            // 3) REFERENCIA.JPG
    if(b !== p.ref) add({ id: id, fn: b + '.JPG' });                // 4) REFERENCIA-SIN-TALLA.JPG
    return out;
  }

  // ---- carga con detección del "placeholder" del servidor ----
  // pic.aspx NO da error cuando la foto no existe: responde 200 con una imagen genérica de 80x80.
  // Por eso el onerror original nunca se disparaba y la tarjeta quedaba con un cuadrito vacío.
  function isPlaceholder(img){ return img.naturalWidth === 80 && img.naturalHeight === 80; }

  window.fotoNext = function(img){
    var ref = img.getAttribute('data-ref');
    var p = PRODUCTS.find(function(x){ return x.ref === ref; });
    var list = p ? candidates(p) : [];
    var i = parseInt(img.getAttribute('data-i') || '-1', 10) + 1;
    if(i < list.length){
      img.setAttribute('data-i', i);
      img.src = picUrl(list[i], parseInt(img.getAttribute('data-sz'), 10));
    } else {
      if(p){ cache[p.ref] = ''; saveCache(); }
      img.style.display = 'none';
      var ph = img.nextElementSibling;
      if(ph && ph.classList.contains('foto-ph')) ph.style.display = 'flex';
    }
  };
  window.fotoLoad = function(img){
    if(isPlaceholder(img)){ fotoNext(img); return; }
    var ref = img.getAttribute('data-ref');
    var p = PRODUCTS.find(function(x){ return x.ref === ref; });
    var c = parse(img.src);
    if(p && c){
      cache[p.ref] = 'ID=' + c.id + '&filename=' + encodeURIComponent(c.fn);
      if(!p.url) p.url = picUrl(c);                                 // así el filtro "Con foto" la cuenta
      saveCache();
    }
  };

  function imgTag(p, cls, size, phHTML){
    var r = String(p.ref).replace(/"/g, '&quot;');
    var list = candidates(p);
    if(!list.length) return phHTML.replace('style="', 'style="display:flex;');
    return '<img class="' + cls + '" data-ref="' + r + '" data-i="0" data-sz="' + size + '" src="' + picUrl(list[0], size) + '" loading="lazy" decoding="async" onload="fotoLoad(this)" onerror="fotoNext(this)">' + phHTML.replace('style="', 'style="display:none;');
  }

  // ---- reemplazo de las funciones que pintan fotos ----
  window.cardHTML = function(p){
    var sc = p.disp < 10 ? 'low' : 'ok';
    var estClass = p.estado === 'EN CAMINO' ? 'camino' : 'disp';
    return '<div class="card" onclick="openProduct(\'' + esc(p.ref) + '\')">' +
      '<span class="estado-badge ' + estClass + '">' + (p.estado || 'DISPONIBLE') + '</span>' +
      '<button class="add-btn" data-ref="' + p.ref.replace(/'/g, '&#39;') + '" onclick="event.stopPropagation();qaBtn(this)">+ AGREGAR</button>' +
      imgTag(p, 'card-img', SZ_CARD, '<div class="card-img-placeholder foto-ph" style="">📦</div>') +
      '<div class="card-body">' +
        '<div class="card-brand">' + p.marca + '</div>' +
        '<div class="card-ref">' + p.ref + '</div>' +
        '<div class="card-desc">' + p.desc + '</div>' +
        '<div class="card-footer"><span class="card-price">$' + p.precio.toFixed(2) + '</span><span class="card-stock ' + sc + '">' + p.disp + ' uds</span></div>' +
        '<div class="card-tags">' + skuTag(p) + '<span class="tag">' + p.cia + '</span><span class="tag">' + (p.color || '') + '</span><span class="tag">' + p.temp + '</span><span class="tag">' + p.year + '</span></div>' +
      '</div></div>';
  };

  window.listHTML = function(p){
    var estClass = p.estado === 'EN CAMINO' ? 'camino' : 'disp';
    return '<div class="list-item" onclick="openProduct(\'' + esc(p.ref) + '\')">' +
      imgTag(p, 'list-img', SZ_LIST, '<div class="list-img foto-ph" style="align-items:center;justify-content:center;font-size:22px">📦</div>') +
      '<div class="list-info">' +
        '<div class="list-brand">' + ((p.sku && document.getElementById('f-sort').value === 'ord-asc') ? '#' + p.sku + ' · ' : '') + p.marca + ' · ' + p.cia + ' · ' + (p.color || '') + ' · ' + p.temp + ' ' + p.year + '</div>' +
        '<div class="list-ref">' + p.ref + '</div>' +
        '<div class="list-desc">' + p.desc + '</div>' +
      '</div>' +
      '<span class="estado-badge ' + estClass + '" style="position:static;display:inline-block;">' + (p.estado || 'DISPONIBLE') + '</span>' +
      '<div class="list-meta"><div class="list-price">$' + p.precio.toFixed(2) + '</div><div class="list-stock">' + p.disp + ' uds</div></div>' +
      '<div><button class="list-add" onclick="event.stopPropagation();quickAdd(\'' + esc(p.ref) + '\')">+ Agregar</button></div>' +
      '<div style="font-size:11px;color:var(--muted);max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + p.grupo + '</div>' +
    '</div>';
  };

  // Modal: versión mediana (rápida). Lightbox: original en alta resolución.
  var _openProduct = window.openProduct;
  window.openProduct = function(ref){
    _openProduct(ref);
    var p = PRODUCTS.find(function(x){ return x.ref === ref; });
    var img = document.getElementById('m-img');
    if(!p || !img) return;
    var list = candidates(p);
    img.onload = null; img.onerror = null;
    if(!list.length){ img.style.display = 'none'; img.removeAttribute('src'); return; }
    img.style.display = '';
    img.setAttribute('data-ref', p.ref); img.setAttribute('data-i', '0'); img.setAttribute('data-sz', SZ_MODAL);
    img.onload = function(){ fotoLoad(img); };
    img.onerror = function(){ fotoNext(img); };
    img.src = picUrl(list[0], SZ_MODAL);
  };
  var _openLightbox = window.openLightbox;
  window.openLightbox = function(){
    var m = document.getElementById('m-img');
    if(!m || !m.src || m.style.display === 'none') return;
    _openLightbox();
    var c = parse(m.src);
    if(c) document.getElementById('lightbox-img').src = picUrl(c);   // Original=Y
  };

  // Repintar la página actual con las funciones nuevas
  if(typeof renderPage === 'function' && typeof filtered !== 'undefined' && filtered) renderPage();
})();
