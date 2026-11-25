/* "Sin foto" / "Con foto" de verdad.
   El servidor de fotos (pic.aspx) no da error cuando la foto no existe: devuelve una
   imagen genérica de 80x80. Por eso casi todos los productos traen link de foto aunque
   no tengan imagen, y el filtro "Sin foto" salía vacío.
   Ahora, al tocar "Sin foto" o "Con foto", la página revisa en el servidor de fotos
   los productos de los filtros que tengas puestos (con las mismas alternativas que usa
   la tarjeta: otra empresa, otra talla, REF.JPG) y filtra por el resultado real.
   Con "Sin foto" también puedes bajar la lista en Excel (CSV). */
(function(){
  if(typeof PRODUCTS === 'undefined' || typeof setFoto !== 'function') return;
  var PIC = 'https://tmpmulimph2.olk.topmanage.cloud/agent/pic.aspx';
  var CACHE_KEY = 'fotoCache_v1', SZ = 64, PAR = 12;
  var $ = function(id){ return document.getElementById(id); };
  document.querySelectorAll('#sf-bar,#sf-css').forEach(function(e){ e.remove(); });

  var st = document.createElement('style'); st.id = 'sf-css';
  st.textContent =
    '#sf-bar{display:none;align-items:center;gap:10px;flex-wrap:wrap;background:var(--surface2);border:1px solid var(--border);border-radius:10px;padding:10px 14px;margin:0 0 12px;font-size:13px;}' +
    '#sf-bar.on{display:flex;}' +
    '#sf-bar .sf-t{flex:1;min-width:200px;}' +
    '#sf-bar .sf-p{height:6px;background:var(--border);border-radius:3px;overflow:hidden;margin-top:6px;}' +
    '#sf-bar .sf-p i{display:block;height:100%;width:0;background:var(--accent);transition:width .2s;}' +
    '#sf-bar button{border:1px solid var(--border);background:var(--surface);color:var(--text);border-radius:8px;padding:6px 12px;font-size:12px;cursor:pointer;white-space:nowrap;}' +
    '#sf-bar button.sf-dl{background:var(--accent);border-color:var(--accent);color:#fff;font-weight:600;}';
  document.head.appendChild(st);

  var bar = document.createElement('div'); bar.id = 'sf-bar';
  bar.innerHTML = '<div class="sf-t"><span class="sf-msg"></span><div class="sf-p"><i></i></div></div>' +
    '<button type="button" class="sf-dl" hidden>⬇ Lista sin foto (Excel)</button><button type="button" class="sf-x">Cancelar</button>';
  var cont = $('products-container');
  if(cont && cont.parentNode) cont.parentNode.insertBefore(bar, cont);

  /* ---- misma lógica de alternativas que fotos-fix ---- */
  function parse(u){
    if(!u) return null;
    var m = /[?&]ID=(\d+)/i.exec(u), f = /[?&]filename=([^&]*)/i.exec(u);
    if(!m || !f) return null;
    var fn = f[1]; try { fn = decodeURIComponent(fn); } catch(e){}
    return { id: m[1], fn: fn };
  }
  function baseRef(r){ return String(r).replace(/[-_](XXS|XS|S|M|L|XL|XXL|XXXL|2XL|3XL|4XL|OS|\d{1,2}(\.5)?|[MW]\d{1,2})$/i, ''); }
  function ciaId(p){ return p.cia === 'MM' ? '4' : '5'; }
  var ORIG = {}, sib = {};
  PRODUCTS.forEach(function(p){
    ORIG[p.ref] = p.url || '';
    var c = parse(p.url); if(!c) return;
    var k = baseRef(p.ref).toUpperCase(); if(!sib[k]) sib[k] = c;
  });
  function candidates(p){
    var out = [], seen = {};
    function add(c){ if(!c) return; var k = c.id + '|' + c.fn.toUpperCase(); if(!seen[k]){ seen[k] = 1; out.push(c); } }
    var e = parse(ORIG[p.ref]);
    add(e); if(e) add({ id: e.id === '4' ? '5' : '4', fn: e.fn });
    var b = baseRef(p.ref), id = ciaId(p);
    add(sib[b.toUpperCase()]);
    add({ id: id, fn: p.ref + '.JPG' });
    if(b !== p.ref) add({ id: id, fn: b + '.JPG' });
    return out;
  }
  function picUrl(c, size){ return PIC + '?ID=' + c.id + (size ? '&Original=N&MaxSize=' + size : '&Original=Y') + '&filename=' + encodeURIComponent(c.fn); }

  /* ---- caché compartida con las tarjetas ---- */
  var cache = {};
  try { var raw = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}'); cache = raw.d || {}; } catch(e){}
  function saveCache(){ try { localStorage.setItem(CACHE_KEY, JSON.stringify({ t: Date.now(), d: cache })); } catch(e){} }
  var checked = {};   // revisados en esta visita (lo que no tenía foto se vuelve a revisar al recargar)

  function probe(c){
    return new Promise(function(ok){
      var img = new Image(), done = false;
      var t = setTimeout(function(){ fin(null); }, 15000);
      function fin(v){ if(done) return; done = true; clearTimeout(t); img.onload = img.onerror = null; ok(v); }
      img.onload = function(){ fin(!(img.naturalWidth === 80 && img.naturalHeight === 80)); };
      img.onerror = function(){ fin(false); };
      img.src = picUrl(c, SZ);
    });
  }
  async function check(p){
    var list = candidates(p), errores = 0;
    for(var i = 0; i < list.length; i++){
      var r = await probe(list[i]);
      if(r === true){ cache[p.ref] = 'ID=' + list[i].id + '&filename=' + encodeURIComponent(list[i].fn); return true; }
      if(r === null) errores++;
    }
    if(errores && errores === list.length) return null;   // no se pudo saber (sin conexión)
    cache[p.ref] = ''; return false;
  }
  function apply(p){
    var v = cache[p.ref];
    if(v) p.url = PIC + '?' + v.replace(/^ID=(\d+)/, 'ID=$1&Original=Y');
    else if(v === '') p.url = '';
  }

  var running = null, lastSin = [];
  function msg(t, pct){ bar.querySelector('.sf-msg').innerHTML = t; bar.querySelector('.sf-p').style.display = pct == null ? 'none' : ''; if(pct != null) bar.querySelector('.sf-p i').style.width = pct + '%'; }

  async function revisar(mode){
    if(running) running.cancel = true;
    var job = running = { cancel: false };
    fotoMode = 'all'; applyFilters();
    var set = filtered.slice();
    var pend = set.filter(function(p){ return !checked[p.ref] && !(cache[p.ref]); });
    set.forEach(function(p){ if(cache[p.ref]) { checked[p.ref] = 1; apply(p); } });
    bar.classList.add('on'); bar.querySelector('.sf-dl').hidden = true;
    bar.querySelector('.sf-x').hidden = false; bar.querySelector('.sf-x').textContent = 'Cancelar';
    var n = 0, total = pend.length, sinConexion = 0;
    if(total) msg('Revisando fotos en el servidor… 0 de ' + total.toLocaleString('en-US'), 0);
    var idx = 0;
    async function worker(){
      while(idx < pend.length && !job.cancel){
        var p = pend[idx++];
        var r = await check(p);
        checked[p.ref] = 1; if(r === null) sinConexion++; else apply(p);
        n++;
        if(n % 10 === 0 || n === total) msg('Revisando fotos en el servidor… ' + n.toLocaleString('en-US') + ' de ' + total.toLocaleString('en-US'), Math.round(n / total * 100));
      }
    }
    var ws = []; for(var k = 0; k < PAR; k++) ws.push(worker());
    await Promise.all(ws);
    saveCache();
    if(job.cancel) return;
    running = null;
    fotoMode = mode;
    document.querySelectorAll('.foto-b').forEach(function(b){ b.classList.toggle('active', b.dataset.m === mode); });
    applyFilters();
    resumen(mode, set, sinConexion);
  }
  function resumen(mode, set, sinConexion){
    var sin = set.filter(function(p){ return cache[p.ref] === ''; }), con = set.length - sin.length;
    lastSin = sin;
    var t = '<b>' + sin.length.toLocaleString('en-US') + '</b> sin foto · ' + con.toLocaleString('en-US') + ' con foto, de ' + set.length.toLocaleString('en-US') + ' productos con los filtros puestos';
    if(sinConexion) t += ' · <span style="color:var(--orange,#f59e0b)">' + sinConexion + ' no se pudieron revisar (conexión)</span>';
    msg(t, null);
    bar.classList.add('on');
    bar.querySelector('.sf-dl').hidden = !(mode === 'sin' && sin.length);
    bar.querySelector('.sf-x').hidden = false;
    bar.querySelector('.sf-x').textContent = 'Cerrar';
  }

  bar.querySelector('.sf-x').onclick = function(){
    if(running){ running.cancel = true; running = null; saveCache(); }
    bar.classList.remove('on');
    if(fotoMode === 'all') return;
    fotoMode = 'all';
    document.querySelectorAll('.foto-b').forEach(function(b){ b.classList.toggle('active', b.dataset.m === 'all'); });
    applyFilters();
  };
  bar.querySelector('.sf-dl').onclick = function(){
    var rows = [['Referencia', 'Compañía', 'Marca', 'Descripción', 'Color', 'Grupo', 'Temporada', 'Año', 'Disponible', 'Estado', 'Archivo esperado']];
    lastSin.forEach(function(p){
      var e = parse(ORIG[p.ref]);
      rows.push([p.ref, p.cia === 'MM' ? 'Multimoda' : 'Prestige', p.marca, p.desc, p.color, p.grupo, p.temp, p.year, p.disp, p.estado, e ? e.fn : p.ref + '.JPG']);
    });
    var csv = '﻿' + rows.map(function(r){ return r.map(function(v){ v = v == null ? '' : String(v); return /[",;\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }).join(','); }).join('\r\n');
    var a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    var d = new Date(); a.download = 'Sin foto ' + d.getDate() + '-' + (d.getMonth() + 1) + '-' + d.getFullYear() + '.csv';
    document.body.appendChild(a); a.click(); setTimeout(function(){ URL.revokeObjectURL(a.href); a.remove(); }, 500);
  };

  var _sf = window.setFoto;
  window.setFoto = function(m){
    if(m === 'sin' || m === 'con'){ revisar(m); return; }
    if(running){ running.cancel = true; running = null; saveCache(); }
    bar.classList.remove('on');
    return _sf.apply(this, arguments);
  };

  /* si cambian otros filtros con "Sin foto"/"Con foto" puesto, revisar lo nuevo */
  var _af = window.applyFilters, tmr = null;
  window.applyFilters = function(){
    var r = _af.apply(this, arguments);
    if(!running && (fotoMode === 'sin' || fotoMode === 'con')){
      clearTimeout(tmr);
      tmr = setTimeout(function(){
        var cur = fotoMode; fotoMode = 'all'; _af(); var set = filtered.slice(); var falta = set.some(function(p){ return !checked[p.ref] && !cache[p.ref]; }); fotoMode = cur; _af();
        if(falta) revisar(cur); else resumen(cur, set, 0);
      }, 400);
    }
    return r;
  };
})();
