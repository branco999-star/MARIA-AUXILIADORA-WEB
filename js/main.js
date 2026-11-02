(function(){
  'use strict';
  var WA = 'https://wa.me/51999759353?text=';

  /* Año */
  document.getElementById('year').textContent = new Date().getFullYear();

  /* Modo oscuro */
  var root = document.documentElement;
  var themeBtn = document.getElementById('themeToggle');
  var themeMeta = document.querySelector('meta[name="theme-color"]');
  function applyTheme(t){
    root.setAttribute('data-theme', t);
    var dark = t === 'dark';
    themeBtn.setAttribute('aria-pressed', dark ? 'true' : 'false');
    themeBtn.setAttribute('aria-label', dark ? 'Activar modo claro' : 'Activar modo oscuro');
    themeMeta.setAttribute('content', dark ? '#0B1023' : '#1339C9');
  }
  applyTheme(root.getAttribute('data-theme') === 'dark' ? 'dark' : 'light');
  themeBtn.addEventListener('click', function(){
    var t = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    applyTheme(t);
    try { localStorage.setItem('theme', t); } catch (e) {}
  });
  // Follow system changes while the visitor has not picked a theme
  var mq = window.matchMedia('(prefers-color-scheme: dark)');
  if (mq.addEventListener) mq.addEventListener('change', function(e){
    var saved = null;
    try { saved = localStorage.getItem('theme'); } catch (err) {}
    if (!saved) applyTheme(e.matches ? 'dark' : 'light');
  });

  /* Nav scroll */
  var nav = document.getElementById('nav');
  var onScroll = function(){ nav.classList.toggle('scrolled', window.scrollY > 12); };
  window.addEventListener('scroll', onScroll, {passive:true}); onScroll();

  /* Menú móvil */
  var burger = document.getElementById('burger');
  var mm = document.getElementById('mobileMenu');
  burger.addEventListener('click', function(){
    var open = mm.classList.toggle('open');
    burger.classList.toggle('open', open);
    burger.setAttribute('aria-expanded', open ? 'true' : 'false');
  });
  mm.querySelectorAll('a').forEach(function(a){
    a.addEventListener('click', function(){
      mm.classList.remove('open'); burger.classList.remove('open');
      burger.setAttribute('aria-expanded','false');
    });
  });

  /* Reveal on scroll */
  var rvs = document.querySelectorAll('.rv');
  if ('IntersectionObserver' in window){
    var io = new IntersectionObserver(function(entries){
      entries.forEach(function(e){
        if (e.isIntersecting){ e.target.classList.add('in'); io.unobserve(e.target); }
      });
    }, {threshold:.12, rootMargin:'0px 0px -40px 0px'});
    rvs.forEach(function(el, i){ el.style.transitionDelay = (Math.min(i,4)*60) + 'ms'; io.observe(el); });
  } else {
    rvs.forEach(function(el){ el.classList.add('in'); });
  }

  /* Filtros galería */
  var promos = Array.prototype.slice.call(document.querySelectorAll('.promo'));
  document.querySelectorAll('.filtro').forEach(function(b){
    b.addEventListener('click', function(){
      document.querySelectorAll('.filtro').forEach(function(x){ x.classList.remove('active'); });
      b.classList.add('active');
      var f = b.dataset.f;
      promos.forEach(function(p){
        p.classList.toggle('hide', f !== 'todos' && p.dataset.cat !== f);
      });
    });
  });

  /* Lightbox */
  var lb = document.getElementById('lb'),
      lbImg = document.getElementById('lbImg'),
      lbTitle = document.getElementById('lbTitle'),
      lbDesc = document.getElementById('lbDesc'),
      lbWa = document.getElementById('lbWa'),
      idx = 0;

  var grupo = promos;   // grupo activo del lightbox
  function visibles(){ return grupo.filter(function(p){ return !p.classList.contains('hide'); }); }
  function show(i){
    var list = visibles();
    if (!list.length) return;
    idx = (i + list.length) % list.length;
    var p = list[idx];
    lbImg.src = p.querySelector('img').src;
    lbImg.alt = p.dataset.title;
    lbTitle.textContent = p.dataset.title;
    lbDesc.textContent = p.dataset.desc;
    lbWa.href = WA + encodeURIComponent('Hola, vi en la página web "' + p.dataset.title + '" y quisiera cotizarlo. ¿Me pueden dar más información?');
  }
  var lastFocus = null;
  function open(p, lista){
    grupo = lista || promos;
    idx = visibles().indexOf(p);
    show(idx);
    lastFocus = p;
    lb.classList.add('open');
    document.body.style.overflow = 'hidden';
    document.getElementById('lbClose').focus();
  }
  function close(){
    lb.classList.remove('open'); document.body.style.overflow = '';
    if (lastFocus) lastFocus.focus();
  }

  function enlazar(lista){
    lista.forEach(function(p){
      p.addEventListener('click', function(){ open(p, lista); });
      p.addEventListener('keydown', function(e){
        if (e.key === 'Enter' || e.key === ' '){ e.preventDefault(); open(p, lista); }
      });
    });
  }
  enlazar(promos);
  enlazar(Array.prototype.slice.call(document.querySelectorAll('.cuadro')));
  document.getElementById('lbClose').addEventListener('click', close);
  document.getElementById('lbPrev').addEventListener('click', function(e){ e.stopPropagation(); show(idx-1); });
  document.getElementById('lbNext').addEventListener('click', function(e){ e.stopPropagation(); show(idx+1); });
  lb.addEventListener('click', function(e){ if (e.target === lb) close(); });
  document.addEventListener('keydown', function(e){
    if (!lb.classList.contains('open')) return;
    if (e.key === 'Escape') close();
    // Keep keyboard focus inside the open lightbox
    if (e.key === 'Tab'){
      var f = lb.querySelectorAll('button, a[href]');
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first){ e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last){ e.preventDefault(); first.focus(); }
    }
    if (e.key === 'ArrowLeft') show(idx-1);
    if (e.key === 'ArrowRight') show(idx+1);
  });

  /* Galería por categorías */
  var gal = document.getElementById('gal'),
      galTitle = document.getElementById('galTitle'),
      galBody = document.getElementById('galBody'),
      galWa = document.getElementById('galWa'),
      galView = document.getElementById('galView'),
      galMedia = document.getElementById('galMedia'),
      galCaption = document.getElementById('galCaption'),
      galData = null, galCat = null, galIdx = 0, galOpener = null, galThumb = null;

  function loadGaleria(){
    if (!galData) galData = fetch('assets/galeria/galeria.json').then(function(r){
      if (!r.ok) throw new Error(r.status);
      return r.json();
    });
    return galData;
  }
  function el(tag, attrs, text){
    var e = document.createElement(tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (text) e.textContent = text;
    return e;
  }
  function renderGaleria(cat){
    galBody.textContent = '';
    var groups = [];
    cat.items.forEach(function(it, i){
      var name = it.type === 'page' ? it.group : (it.type === 'video' ? 'Vídeos' : 'Fotos');
      var g = groups.filter(function(x){ return x.name === name; })[0];
      if (!g){ g = { name: name, items: [] }; groups.push(g); }
      g.items.push({ it: it, i: i });
    });
    groups.forEach(function(g){
      var sec = el('div', { 'class': 'gal-group' });
      sec.appendChild(el('h3', {}, g.name + ' (' + g.items.length + ')'));
      var grid = el('div', { 'class': 'gal-grid' });
      g.items.forEach(function(x){
        var b = el('button', { 'class': 'gal-thumb', type: 'button', 'aria-label': 'Ver ' + x.it.alt });
        b.appendChild(el('img', { src: x.it.thumb, alt: '', loading: 'lazy', decoding: 'async', width: 360, height: Math.round(360 * x.it.h / x.it.w) }));
        if (x.it.type === 'video') b.appendChild(el('span', { 'class': 'gal-play', 'aria-hidden': 'true' }));
        b.addEventListener('click', function(){ openView(x.i, b); });
        grid.appendChild(b);
      });
      sec.appendChild(grid);
      galBody.appendChild(sec);
    });
  }
  function openGaleria(id, opener){
    galOpener = opener;
    galTitle.textContent = opener.querySelector('b').textContent;
    galWa.href = WA + encodeURIComponent('Hola, vi en la página web la galería de "' + galTitle.textContent + '" y quisiera cotizar.');
    galBody.textContent = 'Cargando…';
    gal.hidden = false;
    document.body.style.overflow = 'hidden';
    document.getElementById('galClose').focus();
    loadGaleria().then(function(data){
      galCat = data.filter(function(c){ return c.id === id; })[0];
      if (galCat) renderGaleria(galCat);
    }).catch(function(){ galBody.textContent = 'No se pudo cargar la galería. Inténtalo de nuevo.'; });
  }
  function closeGaleria(){
    closeView();
    gal.hidden = true;
    document.body.style.overflow = '';
    if (galOpener) galOpener.focus();
  }
  function showView(i){
    var items = galCat.items;
    galIdx = (i + items.length) % items.length;
    var it = items[galIdx];
    galMedia.textContent = '';
    var m = it.type === 'video'
      ? el('video', { src: it.src, poster: it.poster, controls: '', playsinline: '', muted: '', preload: 'metadata', width: it.w, height: it.h, 'aria-label': it.alt })
      : el('img', { src: it.src, alt: it.alt, width: it.w, height: it.h });
    galMedia.appendChild(m);
    galCaption.textContent = it.alt + ' · ' + (galIdx + 1) + ' de ' + items.length;
  }
  function openView(i, thumb){
    galThumb = thumb;
    galView.hidden = false;
    showView(i);
    document.getElementById('gvClose').focus();
  }
  function closeView(){
    if (galView.hidden) return;
    galView.hidden = true;
    galMedia.textContent = '';
    if (galThumb) galThumb.focus();
  }

  document.querySelectorAll('.cat').forEach(function(b){
    b.addEventListener('click', function(){ openGaleria(b.dataset.cat, b); });
  });
  document.getElementById('galClose').addEventListener('click', closeGaleria);
  document.getElementById('gvClose').addEventListener('click', closeView);
  document.getElementById('gvPrev').addEventListener('click', function(){ showView(galIdx - 1); });
  document.getElementById('gvNext').addEventListener('click', function(){ showView(galIdx + 1); });
  gal.addEventListener('click', function(e){ if (e.target === gal) closeGaleria(); });
  galView.addEventListener('click', function(e){ if (e.target === galView) closeView(); });
  document.addEventListener('keydown', function(e){
    if (gal.hidden) return;
    var viewing = !galView.hidden;
    if (e.key === 'Escape'){ e.preventDefault(); if (viewing) closeView(); else closeGaleria(); return; }
    if (viewing && e.key === 'ArrowLeft') showView(galIdx - 1);
    if (viewing && e.key === 'ArrowRight') showView(galIdx + 1);
    // Keep keyboard focus inside the open layer
    if (e.key === 'Tab'){
      var layer = viewing ? galView : gal.querySelector('.gal-panel');
      var f = layer.querySelectorAll('button, a[href], video[controls]');
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first){ e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last){ e.preventDefault(); first.focus(); }
    }
  });

  /* Formulario -> WhatsApp */
  document.getElementById('cotiza').addEventListener('submit', function(e){
    e.preventDefault();
    var f = e.target;
    var txt = 'Hola Imprenta María Auxiliadora, quisiera una cotización.\n\n'
      + '• Nombre: ' + (f.nombre.value || '-') + '\n'
      + '• Servicio: ' + f.servicio.value + '\n'
      + '• Cantidad: ' + (f.cantidad.value || 'por definir') + '\n'
      + '• Detalles: ' + (f.mensaje.value || '-');
    window.open(WA + encodeURIComponent(txt), '_blank');
  });
})();
