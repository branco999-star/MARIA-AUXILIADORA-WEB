(function(){
  'use strict';
  var WA = 'https://wa.me/51999759353?text=';

  /* Año */
  document.getElementById('year').textContent = new Date().getFullYear();

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
