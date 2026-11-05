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
    document.body.classList.toggle('menu-open', open);
  });
  mm.querySelectorAll('a').forEach(function(a){
    a.addEventListener('click', function(){
      mm.classList.remove('open'); burger.classList.remove('open');
      document.body.classList.remove('menu-open');
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
    var svcOpenBtn = svc.querySelector('.svc-open');
    var svcPanel = svc.querySelector('.svc-panel');
    var svcCloseBtn = svc.querySelector('.svc-close');
    var SVC_MS = 3500, svcIdx = 0, svcTimer = null, svcHover = false, svcFocus = false, svcSeen = false;
    // Once the visitor picks or moves a card, autoplay stops for good so they can look calmly
    var svcStopped = false;
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
      if (svcStopped || reduceMotion || svcHover || svcFocus || !svcSeen || document.hidden || !svcPanel.hidden) return;
      svcTimer = setInterval(function(){ svcGo(svcIdx + 1); }, SVC_MS);
    };
    var svcUser = function(i){
      svcStopped = true;
      svcPlay();
      svcGo(i);
    };

    svcCards.forEach(function(c, k){
      c.addEventListener('click', function(){ svcUser(k); });
    });
    // "All services" panel: the icons spring out of the centre tile, like apps opening from a folder
    var svcEase = 'cubic-bezier(.34,1.56,.64,1)';
    var svcFromCentre = function(el){
      var c = svcCloseBtn.getBoundingClientRect(), r = el.getBoundingClientRect();
      var dx = (c.left + c.width / 2) - (r.left + r.width / 2);
      var dy = (c.top + c.height / 2) - (r.top + r.height / 2);
      return 'translate(' + dx + 'px,' + dy + 'px) scale(.3)';
    };
    var svcShow = function(){
      if (svcPanel.getAnimations) svcPanel.getAnimations({subtree: true}).forEach(function(a){ a.cancel(); });
      svcPanel.hidden = false;
      svcOpenBtn.setAttribute('aria-expanded', 'true');
      svcPlay();
      if (!reduceMotion && svcPanel.animate){
        svcPanel.animate([{opacity: 0}, {opacity: 1}], {duration: 220, easing: 'ease-out'});
        svcCloseBtn.animate([{transform: 'scale(.5)'}, {transform: 'none'}], {duration: 420, easing: svcEase});
        Array.prototype.forEach.call(svcDots, function(d, k){
          d.animate([{transform: svcFromCentre(d), opacity: 0}, {transform: 'none', opacity: 1}],
            {duration: 560, delay: 60 + k * 40, easing: svcEase, fill: 'backwards'});
        });
      }
      svcDots[svcIdx].focus();
    };
    var svcHide = function(focusEl){
      if (svcPanel.hidden || svcOpenBtn.getAttribute('aria-expanded') === 'false') return;
      svcOpenBtn.setAttribute('aria-expanded', 'false');
      var done = function(){
        // Reopened while the closing animation ran: leave it open
        if (svcOpenBtn.getAttribute('aria-expanded') === 'true') return;
        svcPanel.hidden = true;
        svcPlay();
      };
      if (focusEl) focusEl.focus({preventScroll: true});
      if (reduceMotion || !svcPanel.animate){ done(); return; }
      Array.prototype.forEach.call(svcDots, function(d){
        d.animate([{transform: 'none', opacity: 1}, {transform: svcFromCentre(d), opacity: 0}],
          {duration: 260, easing: 'ease-in', fill: 'forwards'});
      });
      svcPanel.animate([{opacity: 1}, {opacity: 0}], {duration: 300, easing: 'ease-in', fill: 'forwards'}).onfinish = function(){
        svcPanel.getAnimations({subtree: true}).forEach(function(a){ a.cancel(); });
        done();
      };
    };
    svcOpenBtn.addEventListener('click', svcShow);
    svcCloseBtn.addEventListener('click', function(){ svcHide(svcOpenBtn); });
    // A tap on the empty tiles closes the panel too
    svcPanel.addEventListener('click', function(e){ if (e.target === svcPanel) svcHide(svcOpenBtn); });
    // Tabbing out of the panel closes it, so focus never lands on controls hidden underneath
    svcPanel.addEventListener('focusout', function(e){
      if (e.relatedTarget && !svcPanel.contains(e.relatedTarget)) svcHide(null);
    });

    Array.prototype.forEach.call(svcDots, function(d, k){
      d.addEventListener('click', function(){
        svcUser(k);
        svcHide(svcCards[k]);
      });
    });
    svc.querySelector('.svc-prev').addEventListener('click', function(){ svcUser(svcIdx - 1); });
    svc.querySelector('.svc-next').addEventListener('click', function(){ svcUser(svcIdx + 1); });
    svc.addEventListener('keydown', function(e){
      if (!svcPanel.hidden){
        if (e.key === 'Escape'){ e.preventDefault(); svcHide(svcOpenBtn); }
        return;
      }
      if (e.key === 'ArrowLeft'){ e.preventDefault(); svcUser(svcIdx - 1); }
      if (e.key === 'ArrowRight'){ e.preventDefault(); svcUser(svcIdx + 1); }
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
      if (Math.abs(dx) > 40){ svcSwiped = true; svcUser(svcIdx + (dx < 0 ? 1 : -1)); }
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

  /* Catálogo de calendarios 2027 (visor tipo libro) */
  var cat = document.getElementById('cat');
  if (cat){
    var CAT_N = 66;
    var CAT_SECTIONS = [
      ['Portada', 1], ['Cromos y tacos', 2], ['Anuales', 4], ['Decorativos', 6], ['Edinas', 14],
      ['Cuatrimestrales', 20], ['Escritorio jumbo anillado', 25], ['Calendario tarjeta', 31],
      ['Pared, comercial y bolsillo', 34], ['Imágenes 2027', 37]
    ];
    var catBook = document.getElementById('catBook'),
        catLeft = catBook.querySelector('.cat-left img'),
        catRight = catBook.querySelector('.cat-right img'),
        catLeaf = catBook.querySelector('.cat-leaf'),
        catFront = catLeaf.querySelector('.cat-front img'),
        catBack = catLeaf.querySelector('.cat-back img'),
        catShades = catLeaf.querySelectorAll('.cat-shade'),
        catCount = document.getElementById('catCount'),
        catBar = document.getElementById('catBar'),
        catWa = document.getElementById('catWa'),
        catIndex = document.getElementById('catIndex'),
        catIndexBtn = document.getElementById('catIndexBtn'),
        catZoom = document.getElementById('catZoom'),
        catZoomBody = document.getElementById('catZoomBody');
    var catSpreadMq = window.matchMedia('(min-width: 900px) and (min-aspect-ratio: 1/1)');
    var catPage = 1, catOpener = null, catAnim = null, catCache = {}, catThumbsBuilt = false;

    var catSrc = function(n){ return 'assets/catalogo/pagina-' + (n < 10 ? '0' : '') + n + '.webp'; };
    var catSpread = function(){ return catSpreadMq.matches; };
    // In book mode pages pair as [—,1] [2,3] … [66,—]; on phones one page at a time
    var catPair = function(n){
      if (!catSpread()) return [null, n];
      var l = n % 2 === 0 ? n : n - 1;
      return [l >= 1 ? l : null, l + 1 <= CAT_N ? l + 1 : null];
    };
    var catLoad = function(n){
      if (!n) return Promise.resolve();
      if (!catCache[n]){
        var im = new Image();
        im.src = catSrc(n);
        catCache[n] = im.decode ? im.decode().catch(function(){}) : Promise.resolve();
      }
      // Never keep the reader waiting on a slow page for long
      return Promise.race([catCache[n], new Promise(function(r){ setTimeout(r, 1500); })]);
    };
    var catSet = function(img, n){
      img.parentNode.classList.toggle('is-empty', !n);
      if (n){
        img.src = catSrc(n);
        img.alt = 'Página ' + n + ' del catálogo de calendarios 2027';
      } else {
        img.removeAttribute('src');
        img.alt = '';
      }
    };
    var catLabel = function(p){
      return p[0] && p[1] ? 'Páginas ' + p[0] + ' y ' + p[1] : 'Página ' + (p[1] || p[0]);
    };
    var catUpdateUi = function(){
      var p = catPair(catPage);
      catCount.textContent = catLabel(p) + ' de ' + CAT_N;
      catBar.style.transform = 'scaleX(' + ((p[1] || p[0]) / CAT_N) + ')';
      catBook.classList.toggle('is-cover', catSpread() && !p[0]);
      catBook.classList.toggle('is-back', catSpread() && !p[1]);
      var atStart = catPage <= 1 || (catSpread() && !p[0]);
      var atEnd = catSpread() ? !p[1] || p[1] >= CAT_N : catPage >= CAT_N;
      document.getElementById('catPrev').disabled = atStart;
      document.getElementById('catFirst').disabled = atStart;
      document.getElementById('catNext').disabled = atEnd;
      document.getElementById('catLast').disabled = atEnd;
      catWa.href = WA + encodeURIComponent('Hola, vi el catálogo de calendarios 2027 en la página web y me interesa ' + (p[0] && p[1] ? 'lo de las ' : 'lo de la ') + catLabel(p).toLowerCase() + '.');
      history.replaceState(null, '', '#catalogo-' + catPage);
      // Warm up the next and previous pages so turning feels instant
      var step = catSpread() ? 2 : 1;
      [catPage + step, catPage + step + 1, catPage - step].forEach(function(n){ if (n >= 1 && n <= CAT_N) catLoad(n); });
    };
    var catShow = function(n){
      catPage = n;
      var p = catPair(n);
      catSet(catLeft, p[0]);
      catSet(catRight, p[1]);
      catUpdateUi();
    };
    // Page-turn sound, synthesised on the fly (no audio file): a filtered paper rustle plus a soft flap as the page lands
    var CAT_SOUND_KEY = 'catSound';
    var catSoundBtn = document.getElementById('catSoundBtn');
    var catAudio = null, catNoise = null;
    var catSoundOn = true;
    try { catSoundOn = localStorage.getItem(CAT_SOUND_KEY) !== 'off'; } catch (e) {}
    var catSoundUi = function(){
      catSoundBtn.setAttribute('aria-pressed', catSoundOn ? 'true' : 'false');
      catSoundBtn.classList.toggle('is-off', !catSoundOn);
    };
    catSoundUi();
    catSoundBtn.addEventListener('click', function(){
      catSoundOn = !catSoundOn;
      try { localStorage.setItem(CAT_SOUND_KEY, catSoundOn ? 'on' : 'off'); } catch (e) {}
      catSoundUi();
    });
    // Created and resumed inside the visitor's click or key press: Safari only allows audio from a direct gesture
    var catAudioWake = function(){
      if (!catSoundOn) return;
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      try {
        if (!catAudio){
          catAudio = new AC();
          // One second of white noise, reused by every turn
          catNoise = catAudio.createBuffer(1, catAudio.sampleRate, catAudio.sampleRate);
          var data = catNoise.getChannelData(0);
          for (var i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
        }
        if (catAudio.state === 'suspended') catAudio.resume();
      } catch (e) {}
    };
    var catPlaySound = function(ms){
      if (!catSoundOn || !catAudio) return;
      try {
        var ctx = catAudio, t = ctx.currentTime + .01, d = Math.max(.32, ms / 1000 * .8);
        var out = ctx.createGain();
        out.gain.value = .5;
        out.connect(ctx.destination);

        // Rustle: band-passed noise whose pitch rises as the sheet sweeps over, with small random crinkles
        var src = ctx.createBufferSource();
        src.buffer = catNoise;
        src.playbackRate.value = .9 + Math.random() * .2;
        var hp = ctx.createBiquadFilter();
        hp.type = 'highpass';
        hp.frequency.value = 500;
        var bp = ctx.createBiquadFilter();
        bp.type = 'bandpass';
        bp.Q.value = .7;
        bp.frequency.setValueAtTime(1200, t);
        bp.frequency.exponentialRampToValueAtTime(3800, t + d * .7);
        bp.frequency.exponentialRampToValueAtTime(2000, t + d);
        var env = ctx.createGain();
        env.gain.setValueAtTime(0, t);
        env.gain.linearRampToValueAtTime(.12, t + .05);
        for (var k = 1; k <= 5; k++){
          env.gain.linearRampToValueAtTime(.1 + Math.random() * .14, t + d * (.12 + k * .1));
        }
        env.gain.linearRampToValueAtTime(.2, t + d * .8);
        env.gain.exponentialRampToValueAtTime(.001, t + d);
        src.connect(hp);
        hp.connect(bp);
        bp.connect(env);
        env.connect(out);
        src.start(t, Math.random() * .4, d + .05);

        // Flap: a short, dull puff of air when the page settles
        var flap = ctx.createBufferSource();
        flap.buffer = catNoise;
        var lp = ctx.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.value = 700;
        var fe = ctx.createGain();
        var tf = t + d * .82;
        fe.gain.setValueAtTime(0, tf);
        fe.gain.linearRampToValueAtTime(.55, tf + .012);
        fe.gain.exponentialRampToValueAtTime(.001, tf + .12);
        flap.connect(lp);
        lp.connect(fe);
        fe.connect(out);
        flap.start(tf, Math.random() * .5, .14);
      } catch (e) {}
    };

    var catGo = function(n){
      n = Math.max(1, Math.min(CAT_N, n));
      var from = catPair(catPage), to = catPair(n);
      if (from[0] === to[0] && from[1] === to[1]) return;
      if (catAnim) catAnim.finish();
      catAudioWake();
      var fwd = (to[1] || to[0]) > (from[1] || from[0]);
      Promise.all([catLoad(to[0]), catLoad(to[1])]).then(function(){
        var spread = catSpread(), opts = { duration: spread ? 700 : 520, easing: 'cubic-bezier(.45,.05,.25,1)' };
        catPlaySound(reduceMotion ? 400 : opts.duration);
        if (reduceMotion){ catShow(n); return; }
        catLeaf.className = 'cat-leaf ' + (spread ? (fwd ? 'on-right' : 'on-left') : 'on-single');
        if (spread){
          // The leaf carries the page being turned: its front is the old page, its back the new one
          catSet(catFront, fwd ? from[1] : from[0]);
          catSet(catBack, fwd ? to[0] : to[1]);
          catSet(fwd ? catRight : catLeft, fwd ? to[1] : to[0]);
          catPage = n;
          catUpdateUi();
          catAnim = catLeaf.animate([
            { transform: 'rotateY(0deg)' }, { transform: 'rotateY(' + (fwd ? -180 : 180) + 'deg)' }
          ], opts);
        } else {
          catSet(catBack, null);
          if (fwd){
            catSet(catFront, from[1]);
            catSet(catRight, to[1]);
          } else {
            catSet(catFront, to[1]);
          }
          catPage = n;
          catUpdateUi();
          catAnim = catLeaf.animate(fwd
            ? [{ transform: 'rotateY(0deg)', opacity: 1 }, { transform: 'rotateY(-100deg)', opacity: 0 }]
            : [{ transform: 'rotateY(-100deg)', opacity: 0 }, { transform: 'rotateY(0deg)', opacity: 1 }], opts);
        }
        Array.prototype.forEach.call(catShades, function(s){
          s.animate([{ opacity: 0 }, { opacity: .45 }, { opacity: 0 }], opts);
        });
        catAnim.onfinish = function(){
          catAnim = null;
          catLeaf.className = 'cat-leaf';
          catShow(catPage);
        };
      });
    };
    var catNext = function(){ catGo(catSpread() ? (catPair(catPage)[1] || CAT_N) + 1 : catPage + 1); };
    var catPrev = function(){ catGo(catSpread() ? (catPair(catPage)[0] || 1) - 1 : catPage - 1); };

    var catBuildIndex = function(){
      if (catThumbsBuilt) return;
      catThumbsBuilt = true;
      var list = document.getElementById('catSections'), grid = document.getElementById('catThumbs');
      CAT_SECTIONS.forEach(function(s){
        var b = el('button', { type: 'button', 'class': 'cat-sec' });
        b.appendChild(el('span', {}, s[0]));
        b.appendChild(el('small', {}, 'pág. ' + s[1]));
        b.addEventListener('click', function(){ catPick(s[1]); });
        list.appendChild(el('li')).appendChild(b);
      });
      for (var n = 1; n <= CAT_N; n++){
        (function(n){
          var b = el('button', { type: 'button', 'class': 'cat-thumb', 'aria-label': 'Ir a la página ' + n });
          b.appendChild(el('img', { src: catSrc(n).replace('.webp', '-mini.webp'), alt: '', width: 220, height: 256, loading: 'lazy', decoding: 'async' }));
          b.appendChild(el('span', { 'aria-hidden': 'true' }, String(n)));
          b.addEventListener('click', function(){ catPick(n); });
          grid.appendChild(b);
        })(n);
      }
    };
    var catToggleIndex = function(open){
      catBuildIndex();
      catIndex.hidden = !open;
      catIndexBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
      if (open) catIndex.querySelector('.cat-sec').focus();
    };
    var catPick = function(n){
      catToggleIndex(false);
      catIndexBtn.focus();
      catGo(n);
    };

    var catOpenZoom = function(pages){
      catZoomBody.textContent = '';
      pages.forEach(function(n){
        if (n) catZoomBody.appendChild(el('img', { src: catSrc(n), alt: 'Página ' + n + ' ampliada', width: 1400, height: 1634 }));
      });
      catZoom.hidden = false;
      catZoomBody.scrollLeft = 0;
      catZoomBody.scrollTop = 0;
      document.getElementById('catZoomClose').focus();
    };
    var catCloseZoom = function(){
      if (catZoom.hidden) return;
      catZoom.hidden = true;
      catZoomBody.textContent = '';
      document.getElementById('catZoomBtn').focus();
    };

    var catOpen = function(n, opener){
      catOpener = opener || null;
      cat.hidden = false;
      document.body.style.overflow = 'hidden';
      if (typeof hold === 'function') hold(true);
      catShow(Math.max(1, Math.min(CAT_N, n || 1)));
      cat.classList.remove('is-in');
      void cat.offsetWidth;
      cat.classList.add('is-in');
      document.getElementById('catClose').focus();
    };
    var catClose = function(){
      if (catAnim) catAnim.finish();
      catCloseZoom();
      catToggleIndex(false);
      cat.hidden = true;
      document.body.style.overflow = '';
      if (typeof hold === 'function') hold(false);
      history.replaceState(null, '', location.pathname + location.search);
      if (catOpener) catOpener.focus();
    };

    document.querySelectorAll('[data-catalogo]').forEach(function(b){
      b.addEventListener('click', function(){ catOpen(+b.dataset.catalogo || 1, b); });
    });
    document.getElementById('catClose').addEventListener('click', catClose);
    document.getElementById('catNext').addEventListener('click', catNext);
    document.getElementById('catPrev').addEventListener('click', catPrev);
    document.getElementById('catFirst').addEventListener('click', function(){ catGo(1); });
    document.getElementById('catLast').addEventListener('click', function(){ catGo(CAT_N); });
    catIndexBtn.addEventListener('click', function(){ catToggleIndex(catIndex.hidden); });
    document.getElementById('catIndexClose').addEventListener('click', function(){ catToggleIndex(false); catIndexBtn.focus(); });
    document.getElementById('catZoomBtn').addEventListener('click', function(){ catOpenZoom(catPair(catPage)); });
    document.getElementById('catZoomClose').addEventListener('click', catCloseZoom);
    // Click the right half to turn forward and the left half to turn back, like a real book
    var catX = null, catSwiped = false;
    catBook.addEventListener('click', function(e){
      if (catSwiped){ catSwiped = false; return; }
      var r = catBook.getBoundingClientRect();
      if (e.clientX > r.left + r.width / 2) catNext(); else catPrev();
    });
    // Swipe to turn on touch screens
    catBook.addEventListener('pointerdown', function(e){ if (e.pointerType !== 'mouse'){ catX = e.clientX; catSwiped = false; } });
    catBook.addEventListener('pointerup', function(e){
      if (catX === null) return;
      var dx = e.clientX - catX;
      catX = null;
      if (Math.abs(dx) > 40){ catSwiped = true; if (dx < 0) catNext(); else catPrev(); }
    });
    catBook.addEventListener('pointercancel', function(){ catX = null; });
    // Drag to pan the zoomed page with the mouse
    var catDrag = null;
    catZoomBody.addEventListener('pointerdown', function(e){
      if (e.pointerType !== 'mouse') return;
      catDrag = { x: e.clientX, y: e.clientY, l: catZoomBody.scrollLeft, t: catZoomBody.scrollTop };
      catZoomBody.classList.add('is-drag');
    });
    window.addEventListener('pointermove', function(e){
      if (!catDrag) return;
      catZoomBody.scrollLeft = catDrag.l - (e.clientX - catDrag.x);
      catZoomBody.scrollTop = catDrag.t - (e.clientY - catDrag.y);
    });
    window.addEventListener('pointerup', function(){ catDrag = null; catZoomBody.classList.remove('is-drag'); });
    catSpreadMq.addEventListener('change', function(){ if (!cat.hidden) catShow(catPage); });

    document.addEventListener('keydown', function(e){
      if (cat.hidden) return;
      if (e.key === 'Escape'){
        e.preventDefault();
        if (!catZoom.hidden) catCloseZoom();
        else if (!catIndex.hidden){ catToggleIndex(false); catIndexBtn.focus(); }
        else catClose();
        return;
      }
      if (catZoom.hidden && catIndex.hidden){
        if (e.key === 'ArrowRight'){ e.preventDefault(); catNext(); }
        if (e.key === 'ArrowLeft'){ e.preventDefault(); catPrev(); }
        if (e.key === 'Home'){ e.preventDefault(); catGo(1); }
        if (e.key === 'End'){ e.preventDefault(); catGo(CAT_N); }
      }
      // Keep keyboard focus inside the viewer (or the zoom layer when it is open)
      if (e.key === 'Tab'){
        var layer = catZoom.hidden ? cat : catZoom;
        var f = Array.prototype.filter.call(layer.querySelectorAll('button, a[href]'), function(x){
          return !x.disabled && x.getClientRects().length > 0;
        });
        var first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first){ e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last){ e.preventDefault(); first.focus(); }
      }
    });

    // Shareable links: #catalogo opens the cover, #catalogo-12 opens page 12
    var catFromHash = function(){
      var m = location.hash.match(/^#catalogo(?:-(\d+))?$/);
      if (m && cat.hidden) catOpen(m[1] ? +m[1] : 1, null);
    };
    window.addEventListener('hashchange', catFromHash);
    catFromHash();
  }

  /* Mini portada flotante del catálogo */
  var catFloat = document.getElementById('catFloat');
  if (catFloat){
    var CAT_FLOAT_KEY = 'catFloatClosed';
    var floatClosed = false;
    try { floatClosed = sessionStorage.getItem(CAT_FLOAT_KEY) === '1'; } catch (e) {}
    if (!floatClosed) catFloat.hidden = false;
    document.getElementById('catFloatX').addEventListener('click', function(){
      try { sessionStorage.setItem(CAT_FLOAT_KEY, '1'); } catch (e) {}
      if (reduceMotion){ catFloat.hidden = true; return; }
      catFloat.classList.add('is-out');
      setTimeout(function(){ catFloat.hidden = true; }, 300);
    });
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
