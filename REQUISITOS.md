# Requisitos — Web Imprenta "María Auxiliadora"

## Objetivo
Web de una sola página para la Imprenta, Librería y Bazar "María Auxiliadora" (Chosica, Lima). Debe mostrar todo lo que hace el negocio y conseguir que el visitante **pida una cotización por WhatsApp**.

- **Público:** negocios que necesitan cajas, bolsas, boletas y almanaques con su logo; familias que organizan eventos (bautizos, matrimonios, 15 años, baby shower); colegios y padres de familia (diplomas y cuadros de promoción); vecinos de Chosica (copias, útiles, artículos religiosos).
- **Acción principal:** escribir por WhatsApp al 999 759 353.

## Base de diseño
- La base es la web anterior, en `referencia/imprentamariaauxiliadora.html`. Se conservan su diseño, sus secciones, sus colores, la tipografía Outfit y sus textos.
- **Tono:** cercano, colorido y comercial, como la fachada de la tienda (azul, amarillo y rojo).
- **Lo memorable:** la foto real de la fachada azul y amarilla en la portada, ligeramente girada, con tarjetas flotantes.

## Requisitos

### Contenido y secciones
- [x] Barra superior con dirección, WhatsApp, horario y "autorizada por SUNAT"
- [x] Menú con logo y enlaces a Servicios, Promociones, Productos, Cuadros y Contacto
- [x] Portada con título, oferta de 10 % por la web, botón de WhatsApp y foto de la fachada
- [x] Sección "Tres negocios en una sola tienda" (Imprenta, Librería, Bazar)
- [x] Sección "Todo lo que hacemos" con los servicios
- [x] Galería de 21 promociones con filtros por categoría
- [x] Al pulsar una promoción se abre en grande con botón "Pedir esto por WhatsApp"
- [x] Sección "Productos estrella"
- [x] Galería de 16 cuadros de promoción en tres líneas (Elegancia/Brillante, Súper Biomadera 3D, Biomadera)
- [x] Sección "Pedir es en 3 pasos"
- [x] Contacto con dirección, WhatsApp, otro celular, correo, horario, formas de pago y enlace a Google Maps
- [x] Formulario de cotización que abre WhatsApp con el mensaje ya escrito
- [x] Pie con razón social y RUC
- [x] Botón flotante de WhatsApp siempre visible

### Funcionamiento
- [x] Todos los enlaces de WhatsApp van al 51 999 759 353
- [x] El menú se convierte en hamburguesa en móvil y se cierra al elegir una sección
- [x] Todos los enlaces internos llevan a una sección que existe
- [x] Los filtros de la galería muestran solo la categoría elegida
- [x] La vista ampliada se maneja con teclado (Enter, flechas, Escape) y devuelve el foco al cerrar
- [x] El formulario exige el nombre y no guarda datos
- [x] Modo oscuro: sigue la configuración del sistema y tiene un botón sol/luna en el menú que recuerda la elección
- [x] El modo oscuro cumple contraste AA y no altera las fotos de productos
- [x] En «Todo lo que hacemos», los servicios con material se muestran en un carrusel 3D de tarjetas (foto real, título y contador de fotos/vídeos); al tocar una tarjeta se abre su galería, usable con teclado
- [x] El fondo del carrusel cambia de color con cada tarjeta (paleta de marca) y la tarjeta activa se balancea suavemente (inspirado en el shot "EdTech Mascot Character Animation" de Abron Studio, sin mascota)
- [x] Encima del carrusel hay un botón con el nombre de cada servicio: con un toque se salta directo a su tarjeta (en móvil la fila se desliza de lado y el botón activo queda a la vista)
- [x] El carrusel se mueve con esos botones, flechas, teclas ← → y deslizando en móvil; avanza solo cada 3,5 s cuando está a la vista, se pausa con el ratón o el foco encima, deja de avanzar solo en cuanto el visitante lo usa y no se mueve solo con «reducir movimiento»
- [x] La galería no descarga nada hasta que se abre una categoría (salvo las 8 miniaturas de portada del carrusel)
- [x] Para regenerar la galería tras cambiar las carpetas: `FFMPEG=<ruta a ffmpeg.exe> node tools/build-gallery.mjs` (con `npm run serve` en marcha)

### Calidad
- [x] HTML semántico: `header`, `nav`, `main`, `section`, `footer`; un solo `h1` y títulos sin saltos de nivel
- [x] Sin scroll horizontal a 375 px
- [x] Zonas táctiles de al menos 44×44 px en móvil
- [x] Contraste AA y sin violaciones graves ni críticas de accesibilidad (axe)
- [x] Foco visible en todo lo que se puede pulsar
- [x] Respeta `prefers-reduced-motion`
- [x] SEO: `title`, `meta description`, `lang`, `viewport`, favicon y Open Graph
- [x] Imágenes WebP con `width`/`height` y `loading="lazy"` salvo las primeras visibles
- [x] Página inicial de menos de 1,5 MB
- [x] Consola sin errores y sin recursos 404

### Campaña Almanaques 2027 (portada)
- [x] La portada cambia sola cada 15 segundos entre 4 escenas (fachada → 3 vídeos de almanaques), cada vez con más presencia de la campaña
- [x] Los vídeos se ven en una tarjeta vertical tipo móvil y solo se descargan cuando les toca
- [x] Los vídeos tienen sonido: empiezan silenciados (los navegadores no permiten reproducir sonido automáticamente) y el botón de altavoz o la burbuja «Toca para escuchar» lo activan para toda la visita
- [x] Los vídeos de las galerías también tienen sonido (salvo el de Bolsas kraft, que no tiene audio en el original)
- [x] Botones de WhatsApp de la campaña con el mensaje "Hola, quiero cotizar almanaques 2027 para mi negocio."
- [x] Avanza sola desde la primera escena (aunque el ratón esté encima); barras de progreso, flechas sutiles ‹ › y botón de pausa para navegar
- [x] Con "movimiento reducido" activado las escenas siguen avanzando, pero sin animaciones ni vídeo automático
- [x] "Ver modelos" abre la galería de Almanaques (ahora con 3 vídeos)
- [x] Para regenerar los clips de la portada: `FFMPEG=<ruta a ffmpeg.exe> node tools/build-hero-clips.mjs`

## Supuestos
- Se mantiene la paleta completa de la web anterior (incluye rosa, morado, verde y naranja además de los colores de marca), porque esa web es la base. Solo se oscurecen los colores que no cumplan el contraste AA.
- Los textos se toman tal cual de la web anterior; se consideran ya revisados.
- Los datos de contacto, el RUC, la oferta del 10 %, "delivery gratis" y "tu logo desde 20 soles" se dan por vigentes.
- Las imágenes son las mismas de la web anterior (ya optimizadas en WebP, sin metadatos).

## Cambios respecto a la web anterior
- Separada en `index.html`, `css/`, `js/` y `assets/img/` (antes era un solo archivo de 2,2 MB con las imágenes en base64).
- Imágenes con carga diferida: al abrir la página solo se descargan el logo y la fachada.
- Contraste AA: se oscurecieron los colores que no se leían bien con texto blanco (etiquetas rosa, verde y naranja; tarjetas de "Productos estrella" con degradado claro; Plin). Los botones de WhatsApp mantienen su verde y pasan a tener el texto oscuro.
- Accesibilidad: estructura `header`/`nav`/`main`, títulos sin saltos de nivel, foco visible, filtros de 44 px y vista ampliada usable con teclado.
- Corregidos: la tarjeta flotante "Copias A4/A3" tapaba texto en tablet, el botón del menú móvil tenía el icono descolocado y en móvil los controles de la vista ampliada tapaban la imagen.
- Añadidos: imagen para compartir en redes (`og.jpg`), icono para iPhone y etiquetas Open Graph.

## Datos pendientes
- La web está en https://www.imprentamariaauxiliadora.com/ (dominio propio; también responde en mariaauxiliadora-ruby.vercel.app). Ya puesta en `og:url`, `og:image` y `canonical`.
- Confirmar que siguen vigentes: oferta del 10 % por la web, "Graduación 2026" y "Más de una década".
- Los vídeos y PDFs de las carpetas de material original no se usan todavía. Para añadir vídeos hace falta `ffmpeg` (no instalado).
