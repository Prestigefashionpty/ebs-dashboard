/* ===== ALEX · Actualizar inventario desde el Excel de EBS =====
   Botón en la esquina inferior izquierda. Alex carga el Excel de EBS Navigator,
   la página se regenera (productos, filtros y fecha) y se publica en GitHub.
   Con GitHub Pages el sitio se actualiza solo en unos minutos.
   En los catálogos descargados para clientes (archivos locales) el botón no aparece. */
(function(){
  var CFG_DEF = { owner: 'Prestigefashionpty', repo: 'ebs-dashboard', branch: 'main', path: 'index.html' };
  var PIC = 'https://tmpmulimph2.olk.topmanage.cloud/agent/pic.aspx';
  // Contraseña del botón Alex: aquí solo va su huella SHA-256 (la contraseña no aparece en el código).
  // Para cambiarla: SHA-256 de la nueva contraseña en minúsculas hex.
  var PW_HASH = '3957d3cc2dfd28ebcf86a8d30daac282bb7991dd2221a4fb65c737b1a8b83787';
  var XLSX_SRC = ['https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js',
                  'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js'];

  // Limpiar restos (por si esta página es un clon guardado) y salir si no es el sitio publicado
  function clean(){ ['alex-btn','alex-modal','alex-css'].forEach(function(id){ var e = document.getElementById(id); if(e) e.remove(); }); }
  clean();
  if(!/^https?:$/.test(location.protocol)){ document.addEventListener('DOMContentLoaded', clean); return; }

  function cfg(){ try{ return Object.assign({}, CFG_DEF, JSON.parse(localStorage.getItem('alex_cfg') || '{}')); }catch(e){ return Object.assign({}, CFG_DEF); } }
  function token(){ try{ return localStorage.getItem('alex_gh_token') || ''; }catch(e){ return ''; } }

  // ---------- estilos ----------
  var css = document.createElement('style'); css.id = 'alex-css';
  css.textContent = [
    '#alex-btn{position:fixed;left:16px;bottom:16px;z-index:190;background:#facc15;color:#111827;border:2px solid #eab308;border-radius:999px;padding:11px 20px;font:800 14px var(--font);cursor:pointer;box-shadow:0 6px 20px rgba(0,0,0,.5)}',
    '#alex-btn:hover{background:#fde047}',
    '#alex-modal .modal{max-width:760px}',
    '#alex-modal h3{font-size:13px;text-transform:uppercase;letter-spacing:.8px;color:var(--muted);margin:18px 0 8px}',
    '#alex-drop{border:2px dashed var(--border);border-radius:12px;padding:26px;text-align:center;cursor:pointer;color:var(--muted);font-size:14px}',
    '#alex-drop.over,#alex-drop:hover{border-color:var(--accent);color:var(--text)}',
    '.ax-map{display:grid;grid-template-columns:150px 1fr;gap:6px 10px;align-items:center;font-size:13px}',
    '.ax-map select{padding:6px 8px}',
    '.ax-req{color:var(--red)}',
    '.ax-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin:6px 0}',
    '.ax-stat{background:var(--surface2);border-radius:8px;padding:10px}',
    '.ax-stat b{display:block;font-size:17px}',
    '.ax-stat span{font-size:11px;color:var(--muted)}',
    '.ax-prev{width:100%;border-collapse:collapse;font-size:11px}',
    '.ax-prev td,.ax-prev th{border-bottom:1px solid var(--border);padding:4px 6px;text-align:left;white-space:nowrap;max-width:160px;overflow:hidden;text-overflow:ellipsis}',
    '.ax-msg{font-size:13px;padding:10px 12px;border-radius:8px;margin:10px 0;line-height:1.45}',
    '.ax-msg.ok{background:rgba(34,197,94,.12);color:var(--green)}',
    '.ax-msg.err{background:rgba(239,68,68,.12);color:var(--red)}',
    '.ax-msg.warn{background:rgba(245,158,11,.12);color:var(--yellow)}',
    '.ax-row{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}',
    '.ax-row .btn{padding:10px 16px}',
    '.ax-set{display:grid;grid-template-columns:1fr 1fr;gap:8px}',
    '.ax-set label{font-size:11px;color:var(--muted);display:block;margin-bottom:3px}',
    '@media(max-width:768px){.ax-stats{grid-template-columns:repeat(2,1fr)}.ax-map{grid-template-columns:110px 1fr}}'
  ].join('\n');
  document.head.appendChild(css);

  var btn = document.createElement('button');
  btn.id = 'alex-btn'; btn.textContent = '⬆ Alex'; btn.title = 'Actualizar inventario (Excel de EBS)';
  btn.onclick = askPassword;
  document.body.appendChild(btn);

  // ---------- columnas ----------
  var FIELDS = [
    ['ref',    'Referencia',  1, ['referencia','ref','codigo','codigoarticulo','codarticulo','articulo','itemcode','item','estilo','style','sku','codigosku']],
    ['desc',   'Descripción', 0, ['descripcion','desc','producto','nombre','descripcionarticulo','itemname','description','nombrearticulo']],
    ['marca',  'Marca',       1, ['marca','brand','marcas','nombremarca']],
    ['cia',    'CIA',         0, ['cia','compania','empresa','sociedad','company','cias']],
    ['disp',   'Disponible',  1, ['disponible','disp','stock','existencia','existencias','cantidad','qty','inventario','unidades','onhand','cantidaddisponible','stockdisponible']],
    ['precio', 'Precio',      1, ['precioventa','precio','pvp','preciowholesale','wholesale','price','preciomayoreo','preciodeventa']],
    ['grupo',  'Grupo',       0, ['grupo','categoria','category','grupoarticulo','subcategoria','linea','grupodearticulo']],
    ['year',   'Año',         0, ['ano','year','anio','anotemporada','aniotemporada','atemp','yeartemporada']],
    ['temp',   'Temporada',   0, ['temporada','temporado','temp','season']],
    ['color',  'Color',       0, ['color','colour','colores','color1','nombrecolor']],
    ['estado', 'Estado',      0, ['estado','status','estatus','situacion','condicion']],
    ['foto',   'Foto',        0, ['foto','fotos','imagen','image','url','link','picture','pic','urlfoto','filename','archivofoto','rutafoto']],
    ['gerente','Gerente',     0, ['gerente','manager','gerentedivision','gerentemarca']],
    ['sku',    '# (número)',  0, ['#','no','num','numero','id','idarticulo','skuid','codigointerno','correlativo']]
  ];
  function norm(h){
    return String(h == null ? '' : h).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/ñ/g,'n').replace(/[^a-z0-9#]/g,'');
  }
  function autoMap(headers){
    var map = {}, used = {};
    FIELDS.forEach(function(f){
      for(var k = 0; k < f[3].length && map[f[0]] === undefined; k++){
        for(var c = 0; c < headers.length; c++){
          if(!used[c] && norm(headers[c]) === f[3][k]){ map[f[0]] = c; used[c] = 1; break; }
        }
      }
    });
    return map;
  }
  function findHeaderRow(rows){
    var best = 0, bestScore = -1;
    for(var r = 0; r < Math.min(rows.length, 20); r++){
      var m = autoMap(rows[r] || []), sc = Object.keys(m).length;
      if(sc > bestScore){ bestScore = sc; best = r; }
    }
    return best;
  }

  // ---------- normalización de valores ----------
  function num(v){
    if(typeof v === 'number') return v;
    if(v == null || v === '') return 0;
    var s = String(v).replace(/[$\s]/g,'');
    if(/^-?[\d.]+,\d{1,2}$/.test(s)) s = s.replace(/\./g,'').replace(',', '.');   // 1.234,50
    else s = s.replace(/,/g,'');
    var n = parseFloat(s); return isNaN(n) ? 0 : n;
  }
  function str(v){ return v == null ? '' : String(v).replace(/_x000D_/g, '').replace(/[\r\n\t]+/g, ' ').trim(); }
  function normCia(v){
    var s = str(v).toUpperCase();
    if(!s) return 'PF';
    if(s === 'MM' || s.indexOf('MULTIMODA') >= 0) return 'MM';
    if(s === 'PF' || s.indexOf('PRESTIGE') >= 0) return 'PF';
    return s;
  }
  function normEstado(v){
    var s = str(v).toUpperCase();
    if(!s) return 'DISPONIBLE';
    if(s.indexOf('CAMINO') >= 0 || s.indexOf('TRANSIT') >= 0 || s.indexOf('PEDIDO') >= 0) return 'EN CAMINO';
    if(s.indexOf('DISP') >= 0) return 'DISPONIBLE';
    return s;
  }
  function normYear(v){
    if(typeof v === 'number') return String(Math.round(v));
    return str(v);
  }
  function fotoUrl(v, cia){
    var s = str(v);
    if(!s) return '';
    if(/^https?:\/\//i.test(s)) return s;
    if(!/\.[a-z0-9]{3,4}$/i.test(s)) s += '.JPG';
    return PIC + '?ID=' + (cia === 'MM' ? 4 : 5) + '&Original=Y&filename=' + s;
  }

  function buildProducts(rows, hdr, map){
    var out = [], byRef = {}, dup = 0;
    for(var r = hdr + 1; r < rows.length; r++){
      var row = rows[r]; if(!row) continue;
      var g = function(f){ return map[f] === undefined ? '' : row[map[f]]; };
      var ref = str(g('ref'));
      if(!ref) continue;
      var cia = normCia(g('cia'));
      if(byRef[ref]){ byRef[ref].disp += num(g('disp')); dup++; continue; }
      var p = {
        marca: str(g('marca')), gerente: str(g('gerente')), cia: cia, ref: ref,
        disp: num(g('disp')), desc: str(g('desc')), year: normYear(g('year')),
        temp: str(g('temp')).toUpperCase(), precio: Math.round(num(g('precio')) * 100) / 100,
        grupo: str(g('grupo')), url: fotoUrl(g('foto'), cia), color: str(g('color')),
        estado: normEstado(g('estado')), ord: out.length,
        sku: map.sku !== undefined && num(g('sku')) ? num(g('sku')) : r - hdr
      };
      byRef[ref] = p; out.push(p);
    }
    out.forEach(function(p){ p.disp = Math.round(p.disp); });
    return { products: out, dup: dup };
  }

  // ---------- regenerar el HTML de la página ----------
  function escA(v){ return String(v).replace(/&/g,'&amp;').replace(/"/g,'&quot;'); }
  function escT(v){ return String(v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
  function uniq(arr, f){ var s = {}; arr.forEach(function(p){ var v = p[f]; if(v !== '' && v != null) s[v] = 1; }); return Object.keys(s).sort(); }
  function chips(vals, fname){
    return vals.map(function(v){ return '<div class="chip" data-filter="' + fname + '" data-val="' + escA(v) + '" onclick="toggleChip(this)">' + escT(v) + '</div>'; }).join('\n');
  }
  function replaceChipBlock(html, fname, vals){
    var anchor = 'id="chips-' + fname + '">';
    var idx = html.indexOf(anchor); if(idx < 0) return html;
    var start = idx + anchor.length, pos = start, depth = 1;
    while(depth > 0 && pos < html.length){
      var no = html.indexOf('<div', pos), nc = html.indexOf('</div>', pos);
      if(nc < 0) break;
      if(no >= 0 && no < nc){ depth++; pos = no + 4; } else { depth--; pos = nc + 6; }
    }
    return html.slice(0, start) + chips(vals, fname) + html.slice(pos - 6);
  }
  function fechaHoy(){ var d = new Date(), z = function(n){ return (n < 10 ? '0' : '') + n; }; return z(d.getDate()) + '/' + z(d.getMonth() + 1) + '/' + d.getFullYear(); }

  function regenerate(src, prods){
    var h = src;
    h = h.replace(new RegExp('<' + '!-- This site is hosted on Netlify[\\s\\S]*?--' + '>\\s*', 'g'), '');
    h = h.replace(/<script[^>]*\/\.netlify\/scripts\/[^>]*><\/script>/g, '');
    var i = h.indexOf('const PRODUCTS='), j = h.indexOf(';\nlet filtered=', i);
    if(i < 0 || j < 0) throw new Error('No encontré los datos dentro de la página (const PRODUCTS).');
    var json = JSON.stringify(prods).replace(/</g, '\\u003c').replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029');
    h = h.slice(0, i) + 'const PRODUCTS=' + json + h.slice(j);
    var marcas = uniq(prods, 'marca'), grupos = uniq(prods, 'grupo');
    h = replaceChipBlock(h, 'cia',   uniq(prods, 'cia'));
    h = replaceChipBlock(h, 'marca', marcas);
    h = replaceChipBlock(h, 'temp',  uniq(prods, 'temp'));
    h = replaceChipBlock(h, 'year',  uniq(prods, 'year').reverse());
    h = replaceChipBlock(h, 'grupo', grupos);
    h = h.replace(/Marca \(\d+\)/, 'Marca (' + marcas.length + ')');
    h = h.replace(/Grupo \(\d+\)/, 'Grupo (' + grupos.length + ')');
    h = h.replace(/(id="fecha-pub"[^>]*>)Actualizado: [^<]*/, '$1Actualizado: ' + fechaHoy());
    return h;
  }

  // ---------- GitHub ----------
  async function gh(path, method, body){
    var r = await fetch('https://api.github.com' + path, {
      method: method || 'GET',
      headers: { 'Authorization': 'Bearer ' + token(), 'Accept': 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' },
      body: body ? JSON.stringify(body) : undefined
    });
    if(!r.ok){
      var t = ''; try{ t = (await r.json()).message || ''; }catch(e){}
      var why = r.status === 401 ? 'Token inválido o vencido.' : r.status === 403 ? 'El token no tiene permiso de escritura en este repo.' : r.status === 404 ? 'No encuentro el repo/rama (revisa Configuración) o el token no tiene acceso.' : '';
      throw new Error('GitHub ' + r.status + ': ' + (why || t));
    }
    return r.json();
  }
  function toB64(str){
    return new Promise(function(res, rej){
      var fr = new FileReader();
      fr.onload = function(){ res(String(fr.result).split(',')[1]); };
      fr.onerror = rej;
      fr.readAsDataURL(new Blob([str], { type: 'text/plain;charset=utf-8' }));
    });
  }
  async function publish(html, msg){
    var c = cfg(), base = '/repos/' + c.owner + '/' + c.repo;
    var ref = await gh(base + '/git/ref/heads/' + c.branch);
    var head = await gh(base + '/git/commits/' + ref.object.sha);
    var blob = await gh(base + '/git/blobs', 'POST', { content: await toB64(html), encoding: 'base64' });
    var tree = await gh(base + '/git/trees', 'POST', { base_tree: head.tree.sha, tree: [{ path: c.path, mode: '100644', type: 'blob', sha: blob.sha }] });
    var commit = await gh(base + '/git/commits', 'POST', { message: msg, tree: tree.sha, parents: [ref.object.sha] });
    await gh(base + '/git/refs/heads/' + c.branch, 'PATCH', { sha: commit.sha });
    return commit;
  }

  // ---------- Excel ----------
  function loadXLSX(){
    if(window.XLSX) return Promise.resolve();
    return new Promise(function(res, rej){
      var k = 0;
      (function next(){
        if(k >= XLSX_SRC.length) return rej(new Error('No se pudo cargar el lector de Excel (revisa la conexión).'));
        var s = document.createElement('script'); s.src = XLSX_SRC[k++];
        s.onload = function(){ window.XLSX ? res() : next(); }; s.onerror = next;
        document.head.appendChild(s);
      })();
    });
  }

  // ---------- interfaz ----------
  var st = null; // { file, rows, hdr, map, products, dup, html }
  function $(id){ return document.getElementById(id); }
  function fmt(n){ return Number(n).toLocaleString('es-PA'); }
  function msg(type, html){ $('ax-msg').innerHTML = html ? '<div class="ax-msg ' + type + '">' + html + '</div>' : ''; }

  async function sha256(t){
    var b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(t));
    return Array.from(new Uint8Array(b)).map(function(x){ return x.toString(16).padStart(2, '0'); }).join('');
  }
  function askPassword(){
    try{ if(sessionStorage.getItem('alex_ok') === PW_HASH){ openModal(); return; } }catch(e){}
    var ov = document.createElement('div');
    ov.className = 'modal-overlay'; ov.id = 'alex-modal';
    ov.onclick = function(e){ if(e.target === ov) ov.remove(); };
    ov.innerHTML = '<div class="modal" style="max-width:360px"><div class="modal-body" style="padding:22px">' +
      '<div class="modal-title" style="margin-bottom:4px">🔒 Acceso Alex</div>' +
      '<div style="font-size:12px;color:var(--muted);margin-bottom:14px">Escribe la contraseña para actualizar el inventario.</div>' +
      '<input type="password" id="ax-pw" placeholder="Contraseña" autocomplete="current-password" style="font-size:15px;padding:11px">' +
      '<div id="ax-pw-err" style="color:var(--red);font-size:12px;min-height:18px;margin-top:6px"></div>' +
      '<div class="ax-row" style="margin-top:6px"><button class="btn btn-primary" id="ax-pw-ok" style="flex:1">Entrar</button><button class="btn btn-ghost" id="ax-pw-x">Cancelar</button></div>' +
      '</div></div>';
    document.body.appendChild(ov);
    var inp = $('ax-pw'); inp.focus();
    var tries = 0;
    async function check(){
      if(tries >= 5){ $('ax-pw-err').textContent = 'Demasiados intentos. Recarga la página.'; return; }
      var h = await sha256(inp.value);
      if(h === PW_HASH){
        try{ sessionStorage.setItem('alex_ok', PW_HASH); }catch(e){}
        ov.remove(); openModal();
      } else {
        tries++; inp.value = ''; $('ax-pw-err').textContent = 'Contraseña incorrecta.'; inp.focus();
      }
    }
    $('ax-pw-ok').onclick = check;
    $('ax-pw-x').onclick = function(){ ov.remove(); };
    inp.onkeydown = function(e){ if(e.key === 'Enter') check(); };
  }

  function openModal(){
    var ov = document.createElement('div');
    ov.className = 'modal-overlay'; ov.id = 'alex-modal';
    ov.onclick = function(e){ if(e.target === ov) closeModal(); };
    var c = cfg();
    ov.innerHTML =
      '<div class="modal"><div class="modal-header" style="display:flex;justify-content:space-between;align-items:center">' +
        '<div><div class="modal-title">Actualizar inventario</div><div style="font-size:12px;color:var(--muted);margin-top:2px">Carga el Excel de EBS Navigator. Hoy hay ' + fmt(PRODUCTS.length) + ' productos.</div></div>' +
        '<button class="modal-close" id="ax-close">✕</button></div>' +
      '<div class="modal-body">' +
        '<div id="alex-drop">📂 Arrastra aquí el Excel de EBS o haz clic para elegirlo<br><span style="font-size:12px">.xlsx · .xls · .csv</span></div>' +
        '<input type="file" id="ax-file" accept=".xlsx,.xls,.xlsm,.csv" style="display:none">' +
        '<div id="ax-body"></div><div id="ax-msg"></div>' +
        '<details id="ax-cfg" style="margin-top:16px"' + (token() ? '' : ' open') + '><summary style="cursor:pointer;font-size:13px;color:var(--muted)">⚙️ Configuración de publicación (GitHub)' + (token() ? ' · token guardado ✓' : ' · falta el token') + '</summary>' +
          '<div class="ax-set" style="margin-top:10px">' +
            '<div style="grid-column:1/-1"><label>Token de GitHub (fine-grained, permiso Contents: Read and write solo para este repo). Se guarda solo en este navegador.</label><input type="password" id="ax-tok" placeholder="' + (token() ? '•••••••• (guardado; escribe uno nuevo para cambiarlo)' : 'github_pat_...') + '" autocomplete="off"></div>' +
            '<div><label>Dueño (usuario u organización)</label><input id="ax-own" value="' + escA(c.owner) + '"></div>' +
            '<div><label>Repositorio</label><input id="ax-rep" value="' + escA(c.repo) + '"></div>' +
            '<div><label>Rama</label><input id="ax-br" value="' + escA(c.branch) + '"></div>' +
            '<div><label>Archivo</label><input id="ax-path" value="' + escA(c.path) + '"></div>' +
          '</div>' +
          '<div class="ax-row"><button class="btn btn-primary" id="ax-save">Guardar configuración</button><button class="btn btn-ghost" id="ax-test">Probar conexión</button></div>' +
        '</details>' +
      '</div></div>';
    document.body.appendChild(ov);
    $('ax-close').onclick = closeModal;
    var drop = $('alex-drop'), inp = $('ax-file');
    drop.onclick = function(){ inp.click(); };
    drop.ondragover = function(e){ e.preventDefault(); drop.classList.add('over'); };
    drop.ondragleave = function(){ drop.classList.remove('over'); };
    drop.ondrop = function(e){ e.preventDefault(); drop.classList.remove('over'); if(e.dataTransfer.files[0]) readFile(e.dataTransfer.files[0]); };
    inp.onchange = function(){ if(inp.files[0]) readFile(inp.files[0]); };
    $('ax-save').onclick = saveCfg;
    $('ax-test').onclick = testCfg;
  }
  function closeModal(){ var m = $('alex-modal'); if(m) m.remove(); st = null; }

  function saveCfg(){
    var t = $('ax-tok').value.trim();
    try{
      if(t) localStorage.setItem('alex_gh_token', t);
      localStorage.setItem('alex_cfg', JSON.stringify({ owner: $('ax-own').value.trim(), repo: $('ax-rep').value.trim(), branch: $('ax-br').value.trim() || 'main', path: $('ax-path').value.trim() || 'index.html' }));
      $('ax-tok').value = '';
      msg('ok', 'Configuración guardada en este navegador.');
    }catch(e){ msg('err', 'No se pudo guardar: ' + e.message); }
  }
  async function testCfg(){
    saveCfg();
    if(!token()){ msg('err', 'Falta el token.'); return; }
    var c = cfg();
    try{
      var r = await gh('/repos/' + c.owner + '/' + c.repo);
      if(!r.permissions || !r.permissions.push) throw new Error('El token puede leer el repo pero no escribir en él.');
      await gh('/repos/' + c.owner + '/' + c.repo + '/git/ref/heads/' + c.branch);
      msg('ok', 'Conexión OK: ' + escT(r.full_name) + ' · rama ' + escT(c.branch) + '.');
    }catch(e){ msg('err', escT(e.message)); }
  }

  async function readFile(file){
    msg('', '');
    $('ax-body').innerHTML = '<div class="ax-msg warn">Leyendo ' + escT(file.name) + '…</div>';
    try{
      await loadXLSX();
      var buf = await file.arrayBuffer();
      var wb = XLSX.read(buf, { type: 'array', cellDates: false });
      // hoja con más filas
      var best = null;
      wb.SheetNames.forEach(function(n){
        var rows = XLSX.utils.sheet_to_json(wb.Sheets[n], { header: 1, raw: true, defval: '' });
        if(!best || rows.length > best.rows.length) best = { name: n, rows: rows };
      });
      var rows = best.rows, hdr = findHeaderRow(rows), headers = rows[hdr] || [];
      var saved = {}; try{ saved = JSON.parse(localStorage.getItem('alex_map') || '{}'); }catch(e){}
      var map = autoMap(headers);
      // aplicar mapeo guardado por nombre de columna
      Object.keys(saved).forEach(function(f){ var c = headers.findIndex(function(h){ return norm(h) === saved[f]; }); if(c >= 0) map[f] = c; });
      st = { file: file, sheet: best.name, rows: rows, hdr: hdr, headers: headers, map: map };
      renderMapping();
    }catch(e){
      $('ax-body').innerHTML = '';
      msg('err', 'No pude leer el archivo: ' + escT(e.message));
    }
  }

  function renderMapping(){
    var opts = '<option value="">— ninguna —</option>' + st.headers.map(function(h, i){ return '<option value="' + i + '">' + escT(h === '' ? '(columna ' + (i + 1) + ')' : h) + '</option>'; }).join('');
    var html = '<h3>Columnas · hoja "' + escT(st.sheet) + '", encabezados en fila ' + (st.hdr + 1) + '</h3><div class="ax-map">';
    FIELDS.forEach(function(f){
      html += '<div>' + f[1] + (f[2] ? ' <span class="ax-req">*</span>' : '') + '</div><select data-f="' + f[0] + '">' + opts + '</select>';
    });
    html += '</div><div id="ax-preview"></div>';
    $('ax-body').innerHTML = html;
    document.querySelectorAll('#ax-body select').forEach(function(s){
      var f = s.getAttribute('data-f');
      if(st.map[f] !== undefined) s.value = String(st.map[f]);
      s.onchange = function(){ if(s.value === '') delete st.map[f]; else st.map[f] = parseInt(s.value, 10); renderPreview(); };
    });
    renderPreview();
  }

  function renderPreview(){
    var missing = FIELDS.filter(function(f){ return f[2] && st.map[f[0]] === undefined; }).map(function(f){ return f[1]; });
    if(missing.length){
      $('ax-preview').innerHTML = '';
      msg('err', 'Falta indicar la columna de: <b>' + missing.join(', ') + '</b>.');
      return;
    }
    var b = buildProducts(st.rows, st.hdr, st.map);
    st.products = b.products; st.dup = b.dup;
    var P = b.products, units = P.reduce(function(a, p){ return a + p.disp; }, 0);
    var oldUnits = PRODUCTS.reduce(function(a, p){ return a + (p.disp || 0); }, 0);
    var conFoto = P.filter(function(p){ return p.url; }).length;
    var html = '<h3>Resultado</h3><div class="ax-stats">' +
      '<div class="ax-stat"><b>' + fmt(P.length) + '</b><span>productos (hoy ' + fmt(PRODUCTS.length) + ')</span></div>' +
      '<div class="ax-stat"><b>' + fmt(units) + '</b><span>unidades (hoy ' + fmt(oldUnits) + ')</span></div>' +
      '<div class="ax-stat"><b>' + uniq(P, 'marca').length + '</b><span>marcas</span></div>' +
      '<div class="ax-stat"><b>' + (P.length ? Math.round(conFoto / P.length * 100) : 0) + '%</b><span>con link de foto</span></div></div>';
    html += '<div style="overflow-x:auto"><table class="ax-prev"><tr><th>Ref</th><th>Marca</th><th>CIA</th><th>Disp</th><th>Precio</th><th>Grupo</th><th>Año</th><th>Temp</th><th>Estado</th></tr>' +
      P.slice(0, 6).map(function(p){ return '<tr><td>' + escT(p.ref) + '</td><td>' + escT(p.marca) + '</td><td>' + p.cia + '</td><td>' + fmt(p.disp) + '</td><td>$' + p.precio.toFixed(2) + '</td><td>' + escT(p.grupo) + '</td><td>' + escT(p.year) + '</td><td>' + escT(p.temp) + '</td><td>' + escT(p.estado) + '</td></tr>'; }).join('') +
      '</table></div>';
    var warns = [];
    if(st.dup) warns.push(fmt(st.dup) + ' filas repetidas por referencia se sumaron en una sola.');
    if(P.length < PRODUCTS.length * 0.5) warns.push('El archivo trae menos de la mitad de los productos de hoy. Revisa que sea el EBS completo antes de publicar.');
    if(st.map.foto === undefined) warns.push('No hay columna de foto: las fotos se buscarán por referencia.');
    html += '<div class="ax-row">' +
      '<button class="btn btn-primary" id="ax-pub">⬆ Publicar en la página</button>' +
      '<button class="btn btn-ghost" id="ax-view">👁 Ver sin publicar</button>' +
      '<button class="btn btn-ghost" id="ax-dl">⬇ Descargar HTML</button></div>';
    $('ax-preview').innerHTML = html;
    msg(warns.length ? 'warn' : '', warns.join('<br>'));
    $('ax-pub').onclick = doPublish;
    $('ax-view').onclick = function(){ withHtml(function(h){ document.open(); document.write(h); document.close(); }); };
    $('ax-dl').onclick = function(){ withHtml(function(h){
      var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([h], { type: 'text/html' }));
      a.download = 'index.html'; document.body.appendChild(a); a.click(); a.remove();
    }); };
  }

  async function getHtml(){
    if(st.html) return st.html;
    var r = await fetch(location.href.split('#')[0], { cache: 'no-store' });
    if(!r.ok) throw new Error('No pude leer la página actual (' + r.status + ').');
    st.html = regenerate(await r.text(), st.products);
    return st.html;
  }
  async function withHtml(fn){
    try{ fn(await getHtml()); }catch(e){ msg('err', escT(e.message)); }
  }

  async function doPublish(){
    if(!token()){ $('ax-cfg').open = true; msg('err', 'Falta el token de GitHub (abajo, en Configuración).'); return; }
    var bt = $('ax-pub'); bt.disabled = true; bt.textContent = 'Publicando…';
    try{
      // recordar mapeo por nombre de columna para la próxima vez
      var keep = {}; Object.keys(st.map).forEach(function(f){ keep[f] = norm(st.headers[st.map[f]]); });
      try{ localStorage.setItem('alex_map', JSON.stringify(keep)); }catch(e){}
      var h = await getHtml();
      var c = await publish(h, 'Inventario EBS ' + fechaHoy() + ' · ' + st.products.length + ' productos · ' + st.file.name);
      bt.textContent = 'Publicado ✓';
      msg('ok', '<b>Listo.</b> Se publicaron ' + fmt(st.products.length) + ' productos. La página se actualiza para todos en unos minutos (GitHub tarda entre 1 y 10 min; recarga para verla).<br><span style="font-size:11px">Commit ' + c.sha.slice(0, 7) + '</span>');
    }catch(e){
      bt.disabled = false; bt.textContent = '⬆ Publicar en la página';
      msg('err', escT(e.message) + '<br>Si no se resuelve, usa “Descargar HTML” y súbelo a mano al repo.');
    }
  }
})();
