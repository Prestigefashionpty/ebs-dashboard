/* Filtros más fáciles: buscador en cada filtro, filtros activos arriba,
   secciones plegables, lo que no tiene stock con los filtros actuales va al final. */
(function(){
  var NOMBRES = { cia:'Compañía', marca:'Marca', temp:'Temporada', year:'Año', grupo:'Grupo', color:'Color' };
  var BUSCA   = { marca:'Buscar marca…', temp:'Buscar temporada…', year:'Buscar año…', grupo:'Buscar grupo…', color:'Buscar color…' };
  var ETIQ = {
    cia:  { PF:'Prestige (PF)', MM:'Multimoda (MM)' },
    temp: { 'SELECCIONE UNO':'Sin temporada' }
  };
  var KEY = 'fx_plegados_v1';
  var $ = function(id){ return document.getElementById(id); };

  function norm(s){ return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim(); }
  function esc(s){ return String(s).replace(/[&<>"]/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]; }); }
  function plegados(){ try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch(e){ return {}; } }
  function guardarPlegados(o){ try { localStorage.setItem(KEY, JSON.stringify(o)); } catch(e){} }

  /* Si la página es una copia (catálogo descargado), quitar lo que ya traía puesto. */
  function limpiar(){
    document.querySelectorAll('.fx-tools,#fx-activos,#fx-css').forEach(function(e){ e.remove(); });
    document.querySelectorAll('.fx-sec').forEach(function(s){ s.classList.remove('fx-sec', 'fx-plegado'); });
  }

  function css(){
    var st = document.createElement('style'); st.id = 'fx-css';
    st.textContent =
      '.fx-sec .filter-header{cursor:pointer;user-select:none;}' +
      '.fx-sec .filter-title::before{content:"▾";display:inline-block;width:12px;transition:transform .15s;}' +
      '.fx-sec.fx-plegado .filter-title::before{transform:rotate(-90deg);}' +
      '.fx-sec.fx-plegado .fx-tools,.fx-sec.fx-plegado .chips,.fx-sec.fx-plegado .chips-scroll{display:none!important;}' +
      '.fx-sel{display:inline-block;background:var(--accent);color:#fff;border-radius:9px;font-size:10px;font-weight:700;padding:1px 7px;margin-left:6px;letter-spacing:0;}' +
      '.fx-tools{margin:-2px 0 7px;}.fx-in{position:relative;}' +
      '.fx-tools input{padding:6px 28px 6px 28px;font-size:12px;border-radius:16px;}' +
      '.fx-tools .fx-lupa{position:absolute;left:10px;top:50%;transform:translateY(-50%);font-size:11px;opacity:.6;pointer-events:none;}' +
      '.fx-tools .fx-x{position:absolute;right:6px;top:50%;transform:translateY(-50%);background:none;border:none;color:var(--muted);cursor:pointer;font-size:14px;display:none;padding:2px 6px;}' +
      '.fx-tools.fx-con .fx-x{display:block;}' +
      '.fx-info{display:none;justify-content:space-between;align-items:center;font-size:10px;color:var(--muted);margin-top:4px;}.fx-tools.fx-con .fx-info{display:flex;}' +
      '.fx-info button{background:none;border:none;color:var(--accent);cursor:pointer;font-size:11px;font-family:inherit;padding:0;}' +
      '.fx-info button:hover{text-decoration:underline;}' +
      '.chip.fx-oculto{display:none!important;}' +
      '.fx-nada{font-size:11px;color:var(--muted);padding:4px 2px;}' +
      '#chips-marca.chips-scroll,#chips-grupo.chips-scroll,#chips-color.chips-scroll{max-height:200px;}' +
      '#fx-activos{background:var(--surface2);border:1px solid var(--border);border-radius:10px;padding:8px 10px;}' +
      '#fx-activos .fx-at{display:flex;justify-content:space-between;align-items:center;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.8px;color:var(--muted);margin-bottom:6px;}' +
      '#fx-activos .fx-at button{background:none;border:none;color:#e11d48;cursor:pointer;font-size:11px;font-family:inherit;text-transform:none;letter-spacing:0;font-weight:600;}' +
      '#fx-activos .fx-pills{display:flex;flex-wrap:wrap;gap:5px;}' +
      '.fx-pill{display:inline-flex;align-items:center;gap:4px;background:var(--accent);color:#fff;border-radius:14px;padding:3px 4px 3px 9px;font-size:11px;cursor:pointer;max-width:100%;}' +
      '.fx-pill b{font-weight:500;opacity:.75;font-size:10px;}' +
      '.fx-pill span.fx-v{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}' +
      '.fx-pill i{font-style:normal;background:rgba(0,0,0,.22);border-radius:50%;width:16px;height:16px;display:inline-flex;align-items:center;justify-content:center;font-size:11px;flex:none;}' +
      '.fx-pill:hover i{background:rgba(0,0,0,.4);}';
    document.head.appendChild(st);
  }

  function filtroDe(sec){
    var c = sec.querySelector('.chips,.chips-scroll');
    return c && c.id && c.id.indexOf('chips-') === 0 ? c.id.slice(6) : null;
  }

  /* Texto que se ve en el chip (sin cambiar el valor con el que filtra). */
  function etiquetar(f, chip){
    var t = etiqueta(f, chip.dataset.val);
    if(t === chip.dataset.val) t = null;
    if(!t) return;
    var n = chip.firstChild;
    if(n && n.nodeType === 3 && n.nodeValue !== t) n.nodeValue = t;
  }
  function etiqueta(f, v){
    if(f === 'year' && v && !/^\d{4}$/.test(v)) return 'Sin año (' + v + ')';
    return (ETIQ[f] || {})[v] || v;
  }

  function prepararSeccion(sec){
    var f = filtroDe(sec);
    if(!f || sec.classList.contains('fx-sec')) return;
    sec.classList.add('fx-sec');
    sec.dataset.fx = f;
    var head = sec.querySelector('.filter-header');
    if(head){
      head.addEventListener('click', function(e){
        if(e.target.closest('button')) return;
        sec.classList.toggle('fx-plegado');
        var p = plegados(); p[f] = sec.classList.contains('fx-plegado'); guardarPlegados(p);
      });
      var tit = head.querySelector('.filter-title');
      if(tit && !tit.querySelector('.fx-sel')){ var b = document.createElement('span'); b.className = 'fx-sel'; b.style.display = 'none'; tit.appendChild(b); }
    }
    if(plegados()[f]) sec.classList.add('fx-plegado');
    var chips = sec.querySelector('.chips,.chips-scroll');
    if(BUSCA[f] && chips){
      var tools = document.createElement('div');
      tools.className = 'fx-tools';
      tools.innerHTML = '<div class="fx-in"><span class="fx-lupa">🔍</span><input type="text" autocomplete="off" placeholder="' + BUSCA[f] + '">' +
        '<button type="button" class="fx-x" title="Borrar">×</button></div>' +
        '<div class="fx-info"><span class="fx-cnt"></span><button type="button" class="fx-todos" style="display:none">Marcar estos</button></div>';
      chips.parentNode.insertBefore(tools, chips);
      var inp = tools.querySelector('input');
      inp.addEventListener('input', function(){ buscar(sec); });
      inp.addEventListener('keydown', function(e){
        if(e.key === 'Escape'){ inp.value = ''; buscar(sec); }
        if(e.key === 'Enter'){
          e.preventDefault();
          var vis = visibles(sec);
          if(vis.length && inp.value.trim()){ var ch = vis.filter(function(c){ return !c.classList.contains('selected'); })[0] || vis[0]; toggleChip(ch); inp.value = ''; buscar(sec); }
        }
      });
      tools.querySelector('.fx-x').addEventListener('click', function(){ inp.value = ''; buscar(sec); inp.focus(); });
      tools.querySelector('.fx-todos').addEventListener('click', function(){
        var vis = visibles(sec).filter(function(c){ return !c.classList.contains('selected'); });
        vis.forEach(function(c){ c.classList.add('selected'); chipFilters[f] = chipFilters[f].filter(function(x){ return x !== c.dataset.val; }).concat([c.dataset.val]); });
        inp.value = ''; applyFilters();
      });
    }
  }

  function visibles(sec){
    return [].slice.call(sec.querySelectorAll('.chip')).filter(function(c){ return !c.classList.contains('fx-oculto') && !c.classList.contains('disabled'); });
  }

  function buscar(sec){
    var tools = sec.querySelector('.fx-tools'); if(!tools) return;
    var inp = tools.querySelector('input'), q = norm(inp.value);
    tools.classList.toggle('fx-con', !!q);
    var todos = sec.querySelectorAll('.chip'), n = 0, apag = 0;
    todos.forEach(function(c){
      var txt = norm((c.firstChild && c.firstChild.nodeType === 3 ? c.firstChild.nodeValue : c.textContent) + ' ' + c.dataset.val);
      var ok = !q || q.split(/\s+/).every(function(w){ return txt.indexOf(w) >= 0; });
      c.classList.toggle('fx-oculto', !ok);
      if(ok){ if(c.classList.contains('disabled')) apag++; else n++; }
    });
    var cnt = tools.querySelector('.fx-cnt'), btn = tools.querySelector('.fx-todos');
    var chips = sec.querySelector('.chips,.chips-scroll');
    var nada = sec.querySelector('.fx-nada');
    var msg = '';
    if(q){
      cnt.textContent = n ? (n + (n === 1 ? ' resultado · Enter para marcar' : ' resultados')) :
                        (apag ? 'Sin stock con los filtros que tienes puestos' : '');
      btn.style.display = n > 1 ? '' : 'none';
      if(!n && !apag) msg = 'No hay nada con "' + inp.value.trim() + '".';
      if(chips) chips.scrollTop = 0;
    } else { cnt.textContent = ''; btn.style.display = 'none'; }
    if(msg && !nada){ nada = document.createElement('div'); nada.className = 'fx-nada'; chips.parentNode.insertBefore(nada, chips.nextSibling); }
    if(nada){ nada.textContent = msg; nada.style.display = msg ? '' : 'none'; }
  }

  /* Lo que no tiene producto con los otros filtros se va al final (en su orden original). */
  function ordenar(sec){
    var chips = sec.querySelector('.chips,.chips-scroll'); if(!chips) return;
    var f = sec.dataset.fx;
    var arr = [].slice.call(chips.querySelectorAll('.chip'));
    arr.forEach(function(c, i){ if(c.dataset.fxo == null) c.dataset.fxo = (f === 'year' && !/^\d{4}$/.test(c.dataset.val)) ? 100000 + i : i; etiquetar(f, c); });
    var orden = arr.slice().sort(function(a, b){
      var da = a.classList.contains('disabled') ? 1 : 0, db = b.classList.contains('disabled') ? 1 : 0;
      return da - db || (+a.dataset.fxo) - (+b.dataset.fxo);
    });
    var cambio = orden.some(function(c, i){ return c !== arr[i]; });
    if(cambio){ var st = chips.scrollTop; orden.forEach(function(c){ chips.appendChild(c); }); chips.scrollTop = st; }
  }

  function contar(sec){
    var f = sec.dataset.fx, b = sec.querySelector('.fx-sel'); if(!b) return;
    var n = (chipFilters[f] || []).length;
    b.textContent = n; b.style.display = n ? '' : 'none';
  }

  function activos(){
    var box = $('fx-activos');
    if(!box){
      box = document.createElement('div'); box.id = 'fx-activos';
      var sb = $('sidebar'), ref = sb && sb.querySelector('.filter-section');
      if(!ref) return;
      sb.insertBefore(box, ref);
    }
    var pills = [];
    Object.keys(NOMBRES).forEach(function(f){
      (chipFilters[f] || []).forEach(function(v){
        pills.push('<span class="fx-pill" data-f="' + f + '" data-v="' + esc(v) + '" title="Quitar"><b>' + NOMBRES[f] + '</b><span class="fx-v">' + esc(etiqueta(f, v)) + '</span><i>×</i></span>');
      });
    });
    if(!pills.length){ box.style.display = 'none'; box.innerHTML = ''; return; }
    box.style.display = '';
    box.innerHTML = '<div class="fx-at"><span>Filtros activos (' + pills.length + ')</span><button type="button" id="fx-borrar">Quitar todos</button></div><div class="fx-pills">' + pills.join('') + '</div>';
  }

  function refrescar(){
    document.querySelectorAll('#sidebar .filter-section').forEach(prepararSeccion);
    document.querySelectorAll('.fx-sec').forEach(function(sec){ ordenar(sec); buscar(sec); contar(sec); });
    activos();
  }

  function quitar(f, v){
    chipFilters[f] = (chipFilters[f] || []).filter(function(x){ return x !== v; });
    document.querySelectorAll('[data-filter="' + f + '"]').forEach(function(c){ if(c.dataset.val === v) c.classList.remove('selected'); });
    applyFilters();
  }

  function init(){
    if(!$('sidebar') || typeof applyFilters !== 'function' || typeof chipFilters === 'undefined') return;
    limpiar(); css();
    var orig = window.applyFilters;
    window.applyFilters = function(){ var r = orig.apply(this, arguments); try { refrescar(); } catch(e){ console.warn('filtros', e); } return r; };
    var origAll = window.clearAllFilters;
    if(typeof origAll === 'function') window.clearAllFilters = function(){ var r = origAll.apply(this, arguments); document.querySelectorAll('.fx-tools input').forEach(function(i){ i.value = ''; }); applyFilters(); return r; };
    $('sidebar').addEventListener('click', function(e){
      var p = e.target.closest('.fx-pill'); if(p){ quitar(p.dataset.f, p.dataset.v); return; }
      if(e.target.id === 'fx-borrar') clearAllFilters();
    });
    /* Si otra parte de la página rehace los chips (vista cliente, color), volver a preparar. */
    var pend = false;
    new MutationObserver(function(muts){
      if(pend) return;
      var rele = muts.some(function(m){ return m.type === 'childList' && [].some.call(m.addedNodes, function(n){ return n.nodeType === 1 && (n.classList.contains('chip') || n.classList.contains('filter-section')); }); });
      if(!rele) return;
      pend = true;
      setTimeout(function(){ pend = false; try { refrescar(); } catch(e){} }, 30);
    }).observe($('sidebar'), { childList: true, subtree: true });
    refrescar();
  }
  init();
})();
