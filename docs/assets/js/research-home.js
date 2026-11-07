document.addEventListener('DOMContentLoaded', function () {
  const hero = document.querySelector('.research-hero');
  if (!hero) return;

  const navigation = document.querySelector('.research-nav');
  const toggle = navigation.querySelector('.research-nav__toggle');
  function closeNavigation() {
    navigation.classList.remove('is-open');
    toggle.setAttribute('aria-expanded', 'false');
  }
  toggle.addEventListener('click', function () {
    const open = navigation.classList.toggle('is-open');
    toggle.setAttribute('aria-expanded', String(open));
  });
  document.addEventListener('click', function (event) {
    if (!navigation.contains(event.target)) closeNavigation();
  });
  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && navigation.classList.contains('is-open')) {
      closeNavigation();
      toggle.focus();
    }
  });

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  const effectsToggle = hero.querySelector('.scene-effects-toggle');
  const backToTop = document.querySelector('.back-to-top');
  const motionSlot = navigation.querySelector('.research-nav__motion');
  const topSlot = navigation.querySelector('.research-nav__top');
  let effectsPaused = false;
  try { effectsPaused = localStorage.getItem('nightcity-effects') === 'off'; } catch (_) {}
  let glitchTimer = 0;
  let pointerX = 0;
  let pointerY = 0;
  let frame = 0;
  let heroVisible = true;
  const root = document.documentElement;
  const canvas = document.querySelector('.scene-particles');
  const context = canvas && canvas.getContext('2d');
  let particleFrame = 0;
  let particlesActive = false;
  let lastPaint = 0;
  let lastTrail = 0;
  let width = 0;
  let height = 0;
  let particles = [];
  let trail = [];
  let sparks = [];
  let exclusion = [];
  let contentMasks = [];
  let maskScroll = NaN;
  let heroTop = 0;
  let heroHeight = 0;
  let arrivalTimer = 0;

  function motionActive() {
    return !reduceMotion.matches && !effectsPaused && !document.hidden && !root.classList.contains('image-viewer-open');
  }
  function onScene(y) { return y >= heroTop - window.scrollY && y <= heroTop + heroHeight - window.scrollY; }
  function blocked(x, y) {
    return exclusion.some(function (rect) { return x > rect.left && x < rect.right && y > rect.top && y < rect.bottom; });
  }
  function updateExclusion(force) {
    const scroll = window.scrollY;
    if (!force && scroll === maskScroll) return;
    maskScroll = scroll;
    exclusion = contentMasks.filter(function (rect) { return rect.bottom > scroll && rect.top < scroll + height; }).map(function (rect) {
      return { left: rect.left, right: rect.right, top: rect.top - scroll, bottom: rect.bottom - scroll };
    });
    document.querySelectorAll('.masthead, .home-tools > button').forEach(function (element) {
      const rect = element.getBoundingClientRect();
      if (rect.width && rect.height) exclusion.push({ left: rect.left - 3, right: rect.right + 3, top: rect.top - 3, bottom: rect.bottom + 3 });
    });
  }
  function cacheContentMasks() {
    const scroll = window.scrollY;
    contentMasks = [];
    function remember(rect, padding) {
      if (rect.width && rect.height) contentMasks.push({ left: rect.left - padding, right: rect.right + padding,
        top: rect.top + scroll - padding, bottom: rect.bottom + scroll + padding });
    }
    const scene = hero.getBoundingClientRect();
    heroTop = scene.top + scroll;
    heroHeight = scene.height;
    remember(hero.querySelector('.research-hero__copy').getBoundingClientRect(), 12);
    // Cache actual text lines in document coordinates; scrolling only translates the masks.
    document.querySelectorAll('.home-profile, .home-intro, .home-section, .page__footer').forEach(function (container) {
      const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
      const range = document.createRange();
      let node;
      while ((node = walker.nextNode())) {
        if (!node.textContent.trim() || node.parentElement.closest('script, style, [aria-hidden="true"]')) continue;
        range.selectNodeContents(node);
        Array.from(range.getClientRects()).forEach(function (rect) { remember(rect, 2); });
      }
    });
    document.querySelectorAll('.research-home img, .research-home a, .research-home button, .page__footer a').forEach(function (element) {
      if (element.closest('.home-tools') || (element.tagName === 'IMG' && element.closest('.research-hero'))) return;
      remember(element.getBoundingClientRect(), 4);
    });
    updateExclusion(true);
  }
  function sizeParticles() {
    if (!context) return;
    width = document.documentElement.clientWidth;
    height = window.innerHeight;
    const ratio = Math.min(window.devicePixelRatio || 1, 1.5);
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    cacheContentMasks();
    const mobile = width <= 640;
    particles = Array.from({ length: mobile ? 24 : 54 }, function (_, i) {
      const depth = i % 3;
      return { x: width * (.06 + Math.random() * .9),
        y: 24 + Math.random() * Math.max(1, height - 90),
        depth: depth, size: 1.2 + depth * .85 + Math.random() * .8,
        speed: 3.5 + depth * 3.5 + Math.random() * 4, drift: 3 + depth * 4,
        phase: Math.random() * 6, shard: i % 7 === 0, gold: i % 5 === 0 };
    });
    trail = [];
    sparks = [];
  }
  function drawParticles(now) {
    particleFrame = 0;
    if (!particlesActive) return;
    if (now - lastPaint >= 32) {
      const elapsed = Math.min((now - lastPaint) / 1000, .06);
      lastPaint = now;
      updateExclusion();
      context.clearRect(0, 0, width, height);
      const day = root.dataset.theme !== 'night';
      particles.forEach(function (particle) {
        particle.y -= particle.speed * elapsed;
        if (particle.y < 16) particle.y = height - 30;
        const x = particle.x + Math.sin(now / 3800 + particle.phase) * particle.drift;
        if (blocked(x, particle.y)) return;
        const scene = onScene(particle.y);
        const intensity = scene ? (day ? .9 : 1) : .65;
        const light = day && !scene;
        const alpha = (.28 + particle.depth * .12 + .16 * Math.sin(now / 2600 + particle.phase)) * intensity;
        context.fillStyle = particle.gold ? (light ? '#8b6b35' : '#d4b77b') : (light ? '#3c7280' : '#b3d8dc');
        context.globalAlpha = alpha * .16;
        context.fillRect(x - 2, particle.y - 2, particle.size + 4, particle.size + 4);
        context.globalAlpha = alpha;
        context.fillRect(x, particle.y, particle.shard ? 1.2 : particle.size, particle.shard ? particle.size * 3 : particle.size);
      });
      trail = trail.filter(function (point) { return now - point.time < 700; });
      context.lineCap = 'round';
      for (let i = 1; i < trail.length; i++) {
        const previous = trail[i - 1];
        const current = trail[i];
        if (Math.hypot(current.x - previous.x, current.y - previous.y) > 140) continue;
        const light = day && !onScene(current.y);
        const alpha = .85 * Math.pow(1 - (now - previous.time) / 700, 1.4);
        context.beginPath();
        context.moveTo(previous.x, previous.y);
        context.lineTo(current.x, current.y);
        context.strokeStyle = '#91bec3';
        context.lineWidth = 6;
        context.globalAlpha = alpha * .2;
        context.stroke();
        context.strokeStyle = light ? '#2f626d' : '#e1e6e5';
        context.lineWidth = 1.6;
        context.globalAlpha = alpha;
        context.stroke();
      }
      sparks = sparks.filter(function (spark) { return now - spark.time < spark.life; });
      sparks.forEach(function (spark) {
        spark.x += spark.vx * elapsed;
        spark.y += spark.vy * elapsed;
        const life = 1 - (now - spark.time) / spark.life;
        const light = day && !onScene(spark.y);
        context.globalAlpha = life * .75;
        context.fillStyle = spark.gold ? (light ? '#8b6b35' : '#d4b77b') : (light ? '#3c7280' : '#b3d8dc');
        context.fillRect(spark.x, spark.y, spark.size * life, spark.size * life);
      });
      // Clear whole protected regions, including any trail segment crossing their edges.
      exclusion.forEach(function (rect) { context.clearRect(rect.left, rect.top, rect.right - rect.left, rect.bottom - rect.top); });
      context.globalAlpha = 1;
    }
    particleFrame = requestAnimationFrame(drawParticles);
  }
  function moveControl(button, parent) {
    if (!button || !parent || button.parentElement === parent) return;
    const focused = document.activeElement === button;
    parent.appendChild(button);
    if (focused) button.focus({ preventScroll: true });
  }
  function syncActivity() {
    const active = motionActive();
    hero.classList.toggle('scene-suspended', !active || !heroVisible);
    const homeTools = document.querySelector('.home-tools');
    const menuDocked = !heroVisible && window.innerWidth <= 1180;
    if (motionSlot) motionSlot.hidden = !menuDocked;
    if (topSlot) topSlot.hidden = !menuDocked;
    if (effectsToggle) {
      effectsToggle.classList.toggle('is-floating', !heroVisible && !menuDocked);
      effectsToggle.classList.toggle('is-menu', menuDocked);
      moveControl(effectsToggle, menuDocked ? motionSlot : heroVisible ? hero : homeTools);
    }
    if (backToTop) {
      backToTop.classList.toggle('is-menu', menuDocked);
      moveControl(backToTop, menuDocked ? topSlot : homeTools);
    }
    updateExclusion(true);
    if (!context) return;
    particlesActive = active;
    canvas.dataset.state = active ? 'running' : 'paused';
    if (active && !particleFrame) {
      lastPaint = performance.now();
      particleFrame = requestAnimationFrame(drawParticles);
    } else if (!active) {
      cancelAnimationFrame(particleFrame);
      particleFrame = 0;
      trail = [];
      sparks = [];
      context.clearRect(0, 0, width, height);
      hero.classList.remove('scene-entering');
    }
  }

  function render() {
    frame = 0;
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    document.documentElement.style.setProperty('--reading-progress', (maxScroll > 0 ? Math.min(100, window.scrollY / maxScroll * 100) : 0).toFixed(2) + '%');
    if (!motionActive() || !heroVisible) return;
    const progress = Math.min(1, Math.max(0, window.scrollY / hero.offsetHeight));
    hero.style.setProperty('--scene-x', pointerX.toFixed(2) + 'px');
    hero.style.setProperty('--scene-y', (pointerY + progress * 28).toFixed(2) + 'px');
  }

  function requestRender() {
    if (!frame) frame = requestAnimationFrame(render);
  }

  function updateEffects() {
    const paused = effectsPaused || reduceMotion.matches;
    root.dataset.motion = reduceMotion.matches ? 'reduced' : effectsPaused ? 'paused' : 'full';
    hero.classList.toggle('effects-paused', paused);
    hero.style.setProperty('--scene-x', '0px');
    hero.style.setProperty('--scene-y', '0px');
    hero.classList.remove('is-glitching');
    if (effectsToggle) {
      const label = reduceMotion.matches ? effectsToggle.dataset.system : paused ? effectsToggle.dataset.off : effectsToggle.dataset.on;
      effectsToggle.setAttribute('aria-label', label);
      effectsToggle.title = label;
      effectsToggle.dataset.menuLabel = reduceMotion.matches ? (root.lang === 'en' ? 'Reduced motion' : '减少动态') : paused ? (root.lang === 'en' ? 'Enable effects' : '开启动效') : (root.lang === 'en' ? 'Pause effects' : '暂停动效');
      effectsToggle.setAttribute('aria-pressed', String(!paused));
      effectsToggle.disabled = reduceMotion.matches;
      effectsToggle.querySelector('i').className = 'fas fa-' + (paused ? 'play' : 'pause');
    }
    syncActivity();
    root.dispatchEvent(new CustomEvent('homepage:motionchange', { bubbles: true, detail: { enabled: !paused } }));
    requestRender();
  }

  function glitch() {
    if (!motionActive() || !finePointer.matches || glitchTimer || hero.classList.contains('scene-entering')) return;
    hero.classList.add('is-glitching');
    glitchTimer = window.setTimeout(function () {
      hero.classList.remove('is-glitching');
      glitchTimer = 0;
    }, 500);
  }

  if (effectsToggle) effectsToggle.addEventListener('click', function () {
    effectsPaused = !effectsPaused;
    try { localStorage.setItem('nightcity-effects', effectsPaused ? 'off' : 'on'); } catch (_) {}
    updateEffects();
  });
  if (backToTop) backToTop.addEventListener('click', closeNavigation);
  hero.querySelector('h1').addEventListener('pointerenter', glitch);

  document.addEventListener('pointermove', function (event) {
    if (!finePointer.matches || !motionActive()) return;
    if (heroVisible && event.target.closest('.research-hero')) {
      const bounds = hero.getBoundingClientRect();
      pointerX = ((event.clientX - bounds.left) / bounds.width - 0.5) * 12;
      pointerY = ((event.clientY - bounds.top) / bounds.height - 0.5) * 8;
      requestRender();
    }
    updateExclusion();
    const x = event.clientX;
    const y = event.clientY;
    const now = performance.now();
    if (blocked(x, y)) { trail = []; sparks = []; }
    else if (now - lastTrail > 16) {
      const previous = trail[trail.length - 1];
      if (previous) {
        const dx = x - previous.x;
        const dy = y - previous.y;
        const distance = Math.hypot(dx, dy);
        if (distance > 3 && distance < 140) {
          sparks.push({ x: x, y: y, vx: -dx * 1.2 + (Math.random() - .5) * 24,
            vy: -dy * 1.2 + (Math.random() - .5) * 24, time: now, life: 420 + Math.random() * 220,
            size: 1.6 + Math.random() * 1.5, gold: trail.length % 4 === 0 });
          if (sparks.length > 36) sparks.shift();
        }
      }
      trail.push({ x: x, y: y, time: now });
      if (trail.length > 32) trail.shift();
      lastTrail = now;
    }
  }, { passive: true });

  hero.addEventListener('pointerleave', function () {
    pointerX = pointerY = 0;
    requestRender();
  });

  new IntersectionObserver(function (entries) {
    heroVisible = entries[0].isIntersecting;
    syncActivity();
    requestRender();
  }).observe(hero);

  const sectionObserver = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) { entry.target.classList.toggle('section-in-view', entry.isIntersecting); });
  }, { rootMargin: '-10% 0px -15% 0px' });
  document.querySelectorAll('.home-section').forEach(function (section) { sectionObserver.observe(section); });

  reduceMotion.addEventListener('change', updateEffects);
  document.addEventListener('visibilitychange', syncActivity);
  document.addEventListener('homepage:gallerychange', syncActivity);
  window.addEventListener('pageshow', syncActivity);
  window.addEventListener('pagehide', function () {
    particlesActive = false;
    cancelAnimationFrame(particleFrame);
    particleFrame = 0;
  });

  window.addEventListener('scroll', function () {
    trail = [];
    sparks = [];
    requestRender();
  }, { passive: true });
  window.addEventListener('resize', function () { sizeParticles(); syncActivity(); requestRender(); });
  sizeParticles();
  if (document.fonts) document.fonts.ready.then(sizeParticles);
  updateEffects();

  function arrive() {
    if (!motionActive() || window.scrollY > hero.offsetHeight) return;
    try {
      if (sessionStorage.getItem('nightcity-arrived') === 'yes') return;
      sessionStorage.setItem('nightcity-arrived', 'yes');
    } catch (_) {}
    hero.classList.add('scene-entering');
    clearTimeout(arrivalTimer);
    arrivalTimer = window.setTimeout(function () { hero.classList.remove('scene-entering'); }, 850);
  }
  const background = hero.querySelector('picture img');
  if (background.complete) requestAnimationFrame(arrive);
  else background.addEventListener('load', arrive, { once: true });
});
