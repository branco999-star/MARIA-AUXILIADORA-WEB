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

  /* Portada por escenas (campaña de almanaques) */
  var hero = document.getElementById('inicio');
  var scenes = Array.prototype.slice.call(hero.querySelectorAll('.scene'));
  var dots = Array.prototype.slice.call(hero.querySelectorAll('.scene-dot'));
  var pauseBtn = document.getElementById('scenePause');
  var SCENE_MS = 15000;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var sceneIdx = 0, sceneTimer = null, sceneStart = 0, sceneLeft = SCENE_MS;
  var userPaused = false, held = false, soundOn = false;
  var soundBtn = document.getElementById('sceneSound');
  var heroVideos = Array.prototype.slice.call(hero.querySelectorAll('video'));

  hero.style.setProperty('--scene-ms', SCENE_MS + 'ms');

  function playSceneVideo(scene){
    var v = scene.querySelector('video');
    if (!v || reduceMotion) return;
    if (!v.getAttribute('src')) v.setAttribute('src', v.dataset.src);
    v.muted = !soundOn;
    v.currentTime = 0;
    var p = v.play();
    if (p && p.catch) p.catch(function(){ /* autoplay blocked: poster stays visible */ });
  }
  function stopTimer(){ clearTimeout(sceneTimer); sceneTimer = null; }
  function startTimer(ms){
    stopTimer();
    if (userPaused || held) return;
    sceneLeft = ms;
    sceneStart = Date.now();
    sceneTimer = setTimeout(function(){ goTo(sceneIdx + 1); }, ms);
  }
  function goTo(i){
    sceneIdx = (i + scenes.length) % scenes.length;
    scenes.forEach(function(s, k){
      var on = k === sceneIdx;
      s.classList.toggle('is-on', on);
      if (on){ s.removeAttribute('aria-hidden'); s.removeAttribute('inert'); }
      else {
        s.setAttribute('aria-hidden', 'true'); s.setAttribute('inert', '');
        var v = s.querySelector('video'); if (v) v.pause();
      }
    });
    dots.forEach(function(d, k){
      // Restart the progress animation on the active bar
      d.classList.remove('is-on');
      d.classList.toggle('is-done', k < sceneIdx);
      if (k === sceneIdx){ void d.offsetWidth; d.classList.add('is-on'); d.setAttribute('aria-current', 'true'); }
      else d.removeAttribute('aria-current');
    });
    hero.dataset.scene = sceneIdx;
    playSceneVideo(scenes[sceneIdx]);
    startTimer(SCENE_MS);
  }
  function setPaused(p){
    userPaused = p;
    hero.classList.toggle('is-paused', p);
    pauseBtn.setAttribute('aria-pressed', p ? 'true' : 'false');
    pauseBtn.setAttribute('aria-label', p ? 'Reanudar portada' : 'Pausar portada');
    var v = scenes[sceneIdx].querySelector('video');
    if (p){ stopTimer(); if (v) v.pause(); }
    else { playSceneVideo(scenes[sceneIdx]); startTimer(SCENE_MS); }
  }
  // Hold only while a keyboard user is moving through the hero (or the tab is hidden)
  function hold(on){
    if (held === on || userPaused) { held = on; return; }
    held = on;
    hero.classList.toggle('is-hold', on);
    if (on){ stopTimer(); sceneLeft = Math.max(800, sceneLeft - (Date.now() - sceneStart)); }
    else startTimer(sceneLeft);
  }

  // Browsers only autoplay muted video, so sound is an explicit opt-in that lasts for the visit
  function setSound(on){
    soundOn = on;
    hero.classList.toggle('has-sound', on);
    soundBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
    soundBtn.setAttribute('aria-label', on ? 'Silenciar' : 'Activar sonido');
    heroVideos.forEach(function(v){ v.muted = !on; });
    var v = scenes[sceneIdx].querySelector('video');
    if (on && v){
      if (!v.getAttribute('src')) v.setAttribute('src', v.dataset.src);
      v.currentTime = 0;
      var p = v.play(); if (p && p.catch) p.catch(function(){});
      if (!userPaused && !held) startTimer(SCENE_MS);
    }
  }
  soundBtn.addEventListener('click', function(){ setSound(!soundOn); });
  hero.querySelectorAll('[data-sound]').forEach(function(b){
    b.addEventListener('click', function(){ setSound(true); soundBtn.focus(); });
  });

  pauseBtn.addEventListener('click', function(){ setPaused(!userPaused); });
  hero.querySelectorAll('[data-goto]').forEach(function(b){
    b.addEventListener('click', function(){ goTo(+b.dataset.goto); });
  });
  document.getElementById('scenePrev').addEventListener('click', function(){ goTo(sceneIdx - 1); });
  document.getElementById('sceneNext').addEventListener('click', function(){ goTo(sceneIdx + 1); });
  var heroGrid = hero.querySelector('.hero-grid');
  heroGrid.addEventListener('focusin', function(e){ if (e.target.matches(':focus-visible')) hold(true); });
  heroGrid.addEventListener('focusout', function(e){ if (!heroGrid.contains(e.relatedTarget)) hold(false); });
  // Clicking a control with the mouse must not leave the carousel stuck on hold
  heroGrid.addEventListener('pointerdown', function(){ if (held) hold(false); });
  document.addEventListener('visibilitychange', function(){ hold(document.hidden); });
  startTimer(SCENE_MS);

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
    galTitle.textContent = opener.dataset.title;
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
      ? el('video', { src: it.src, poster: it.poster, controls: '', playsinline: '', preload: 'metadata', width: it.w, height: it.h, 'aria-label': it.alt })
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

  document.querySelectorAll('[data-gal]').forEach(function(b){
    b.addEventListener('click', function(){ openGaleria(b.dataset.gal, b); });
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

  /* Carrusel de servicios */
  var svc = document.querySelector('.svc-stage');
  if (svc){
    var svcCards = Array.prototype.slice.call(svc.querySelectorAll('.svc-card'));
    var svcColors = svc.querySelectorAll('.svc-color');
    var svcDots = svc.querySelectorAll('.svc-dot');
    var SVC_MS = 3500, svcIdx = 0, svcTimer = null, svcHover = false, svcFocus = false, svcSeen = false;
    var svcN = svcCards.length;

    var svcGo = function(i){
      svcIdx = (i + svcN) % svcN;
      svcCards.forEach(function(c, k){
        // Shortest signed distance on the loop, so the deck wraps around
        var off = k - svcIdx;
        if (off > svcN / 2) off -= svcN;
        if (off < -svcN / 2) off += svcN;
        var abs = Math.abs(off);
        c.style.setProperty('--off', off);
        c.style.setProperty('--abs', Math.min(abs, 2));
        c.classList.toggle('on', off === 0);
        if (abs > 1) c.setAttribute('inert', ''); else c.removeAttribute('inert');
      });
      for (var k = 0; k < svcN; k++){
        svcColors[k].classList.toggle('on', k === svcIdx);
        if (k === svcIdx) svcDots[k].setAttribute('aria-current', 'true');
        else svcDots[k].removeAttribute('aria-current');
      }
    };
    var svcPlay = function(){
      clearInterval(svcTimer);
      svcTimer = null;
      if (reduceMotion || svcHover || svcFocus || !svcSeen || document.hidden) return;
      svcTimer = setInterval(function(){ svcGo(svcIdx + 1); }, SVC_MS);
    };

    svcCards.forEach(function(c, k){
      c.addEventListener('click', function(){ svcGo(k); });
    });
    Array.prototype.forEach.call(svcDots, function(d, k){
      d.addEventListener('click', function(){ svcGo(k); });
    });
    svc.querySelector('.svc-prev').addEventListener('click', function(){ svcGo(svcIdx - 1); });
    svc.querySelector('.svc-next').addEventListener('click', function(){ svcGo(svcIdx + 1); });
    svc.addEventListener('keydown', function(e){
      if (e.key === 'ArrowLeft'){ e.preventDefault(); svcGo(svcIdx - 1); }
      if (e.key === 'ArrowRight'){ e.preventDefault(); svcGo(svcIdx + 1); }
    });
    svc.addEventListener('mouseenter', function(){ svcHover = true; svcPlay(); });
    svc.addEventListener('mouseleave', function(){ svcHover = false; svcPlay(); });
    svc.addEventListener('focusin', function(){ svcFocus = true; svcPlay(); });
    svc.addEventListener('focusout', function(e){
      if (!svc.contains(e.relatedTarget)){ svcFocus = false; svcPlay(); }
    });
    document.addEventListener('visibilitychange', svcPlay);

    // Swipe on touch screens; vertical scrolling stays native (touch-action: pan-y)
    var svcX = null, svcSwiped = false;
    var svcTrack = svc.querySelector('.svc-track');
    svcTrack.addEventListener('pointerdown', function(e){ if (e.pointerType !== 'mouse'){ svcX = e.clientX; svcSwiped = false; } });
    svcTrack.addEventListener('pointerup', function(e){
      if (svcX === null) return;
      var dx = e.clientX - svcX;
      svcX = null;
      if (Math.abs(dx) > 40){ svcSwiped = true; svcGo(svcIdx + (dx < 0 ? 1 : -1)); svcPlay(); }
    });
    svcTrack.addEventListener('pointercancel', function(){ svcX = null; });
    // A swipe must not also open the gallery of the card it started on
    svcTrack.addEventListener('click', function(e){
      if (svcSwiped){ e.stopPropagation(); svcSwiped = false; }
    }, true);

    if ('IntersectionObserver' in window){
      new IntersectionObserver(function(entries){
        svcSeen = entries[0].isIntersecting;
        svcPlay();
      }, {threshold:.4}).observe(svc);
    } else {
      svcSeen = true;
    }
    svcGo(0);
    svcPlay();
  }

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
