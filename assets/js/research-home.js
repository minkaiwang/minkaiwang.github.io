document.addEventListener('DOMContentLoaded', function () {
  const hero = document.querySelector('.research-hero');
  if (!hero) return;

  const navigation = document.querySelector('.research-nav');
  const masthead = navigation.closest('.masthead');
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
  let particleTimer = 0;
  let particlesActive = false;
  let lastPaint = 0;
  let lastPointer = -Infinity;
  let lastSpark = 0;
  let trailGroup = 0;
  let slowPaints = 0;
  let lightEffects = !finePointer.matches || navigator.hardwareConcurrency <= 4 || navigator.deviceMemory <= 4 || Boolean(navigator.connection && navigator.connection.saveData);
  let progressDirty = true;
  let width = 0;
  let height = 0;
  let particles = [];
  let trail = [];
  let sparks = [];
  let exclusion = [];
  let exclusionPath = null;
  let contentMasks = [];
  let maskScroll = NaN;
  let heroTop = 0;
  let heroHeight = 0;
  let arrivalTimer = 0;
  const sceneFocus = hero.querySelector('.scene-focus');
  let focusX = 0;
  let focusY = 0;
  let hoverSurface = null;
  let hoverBounds = null;
  let hoverX = 0;
  let hoverY = 0;

  function resetHover() {
    if (hoverSurface) {
      hoverSurface.classList.remove('is-tracking');
      ['--hover-x', '--hover-dx', '--hover-dy'].forEach(function (property) { hoverSurface.style.removeProperty(property); });
    }
    hoverSurface = hoverBounds = null;
    hero.classList.remove('scene-inspecting');
  }
  function canTrack() { return motionActive() && !lightEffects && finePointer.matches; }

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
    exclusionPath = new Path2D();
    exclusion.forEach(function (rect) { exclusionPath.rect(rect.left, rect.top, rect.right - rect.left, rect.bottom - rect.top); });
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
  function sizeParticles(reflow) {
    if (!context) return;
    const previousWidth = width;
    width = document.documentElement.clientWidth;
    height = window.innerHeight;
    const ratio = Math.min(window.devicePixelRatio || 1, lightEffects ? 1 : 1.25);
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    if (reflow || previousWidth !== width || hero.getBoundingClientRect().height !== heroHeight) cacheContentMasks();
    else updateExclusion(true);
    const mobile = width <= 640;
    root.dataset.effectsQuality = lightEffects ? 'light' : 'full';
    particles = Array.from({ length: lightEffects ? (mobile ? 14 : 24) : 54 }, function (_, i) {
      const depth = i % 3;
      return { x: width * (.06 + Math.random() * .9),
        y: 24 + Math.random() * Math.max(1, height - 90),
        depth: depth, size: 1.2 + depth * .85 + Math.random() * .8,
        speed: 3.5 + depth * 3.5 + Math.random() * 4, drift: 3 + depth * 4,
        phase: Math.random() * 6, shard: i % 7 === 0, gold: i % 5 === 0 };
    });
    trail = [];
    sparks = [];
    slowPaints = 0;
  }
  function scheduleParticles(wake) {
    if (!particlesActive || particleFrame || (particleTimer && !wake)) return;
    clearTimeout(particleTimer);
    const now = performance.now();
    const moving = now - lastPointer < 700;
    const interval = lightEffects ? (moving ? 50 : 100) : (moving ? 1000 / 30 : 1000 / 15);
    // Sleep between paints instead of waking on every refresh of a fast display.
    const delay = Math.max(0, interval - (now - lastPaint));
    particleTimer = window.setTimeout(function () {
      particleTimer = 0;
      particleFrame = requestAnimationFrame(drawParticles);
    }, delay);
  }
  function drawParticles(now) {
    particleFrame = 0;
    if (!particlesActive) return;
    const started = performance.now();
    const elapsed = Math.min((now - lastPaint) / 1000, .15);
    lastPaint = now;
    updateExclusion();
    context.clearRect(0, 0, width, height);
    const day = root.dataset.theme !== 'night';
    particles.forEach(function (particle) {
      particle.y -= particle.speed * elapsed;
      if (particle.y < 16) particle.y = height - 30;
      const x = particle.x + Math.sin(now / 3800 + particle.phase) * particle.drift;
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
      if (current.group !== previous.group) continue;
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
    // One union mask keeps overlapping text and controls fully clear.
    context.globalAlpha = 1;
    context.globalCompositeOperation = 'destination-out';
    context.fill(exclusionPath);
    context.globalCompositeOperation = 'source-over';
    slowPaints = performance.now() - started > 8 ? slowPaints + 1 : Math.max(0, slowPaints - 1);
    if (!lightEffects && slowPaints >= 12 && !trail.length && !sparks.length) {
      lightEffects = true;
      sizeParticles();
    }
    scheduleParticles(false);
  }
  function moveControl(button, parent) {
    if (!button || !parent || button.parentElement === parent) return;
    const focused = document.activeElement === button;
    parent.appendChild(button);
    if (focused) button.focus({ preventScroll: true });
  }
  function syncActivity() {
    const active = motionActive();
    if (!active || lightEffects) resetHover();
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
    if (active) {
      scheduleParticles(false);
    } else if (!active) {
      clearTimeout(particleTimer);
      particleTimer = 0;
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
    if (progressDirty) {
      const maxScroll = root.scrollHeight - window.innerHeight;
      masthead.style.setProperty('--reading-progress', (maxScroll > 0 ? Math.min(100, window.scrollY / maxScroll * 100) : 0).toFixed(2) + '%');
      progressDirty = false;
    }
    if (hoverSurface && canTrack()) {
      hoverSurface.style.setProperty('--hover-x', Math.max(0, Math.min(hoverBounds.width - 84, hoverX - 42)).toFixed(1) + 'px');
      hoverSurface.style.setProperty('--hover-dx', ((hoverX / hoverBounds.width - .5) * 6).toFixed(2) + 'px');
      hoverSurface.style.setProperty('--hover-dy', ((hoverY / hoverBounds.height - .5) * 4).toFixed(2) + 'px');
    }
    if (!motionActive() || !heroVisible) return;
    const progress = Math.min(1, Math.max(0, window.scrollY / heroHeight));
    hero.style.setProperty('--scene-x', pointerX.toFixed(2) + 'px');
    hero.style.setProperty('--scene-y', (pointerY + progress * 28).toFixed(2) + 'px');
    if (sceneFocus && hero.classList.contains('scene-inspecting')) {
      sceneFocus.style.transform = 'translate3d(' + focusX.toFixed(1) + 'px,' + focusY.toFixed(1) + 'px,0)';
    }
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
    if (!motionActive() || lightEffects || !finePointer.matches || glitchTimer || hero.classList.contains('scene-entering')) return;
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

  document.querySelectorAll('.top-actions a, .project-card .pub-media-rotator').forEach(function (surface) {
    surface.addEventListener('pointerenter', function (event) {
      if (event.pointerType === 'touch' || !canTrack()) return;
      resetHover();
      hoverSurface = surface;
      hoverBounds = surface.getBoundingClientRect();
    });
    surface.addEventListener('pointermove', function (event) {
      if (event.pointerType === 'touch' || !canTrack()) return;
      if (hoverSurface !== surface) {
        resetHover();
        hoverSurface = surface;
        hoverBounds = surface.getBoundingClientRect();
      }
      hoverX = Math.max(0, Math.min(hoverBounds.width, event.clientX - hoverBounds.left));
      hoverY = Math.max(0, Math.min(hoverBounds.height, event.clientY - hoverBounds.top));
      surface.classList.add('is-tracking');
      requestRender();
    }, { passive: true });
    surface.addEventListener('pointerleave', function () { if (hoverSurface === surface) resetHover(); });
  });

  document.addEventListener('pointermove', function (event) {
    if (!finePointer.matches || event.pointerType === 'touch' || !motionActive()) return;
    if (!lightEffects && heroVisible && event.target.closest('.research-hero')) {
      pointerX = (event.clientX / width - 0.5) * 12;
      pointerY = ((event.clientY + window.scrollY - heroTop) / heroHeight - 0.5) * 8;
      const localY = event.clientY + window.scrollY - heroTop;
      const inspecting = event.clientX > width * .52 && localY > 60 && localY < heroHeight - 90 && !event.target.closest('a, button');
      hero.classList.toggle('scene-inspecting', inspecting);
      focusX = Math.max(width * .52, Math.min(width - 184, event.clientX - 80));
      focusY = Math.max(32, Math.min(heroHeight - 150, localY - 52));
      requestRender();
    }
    updateExclusion();
    const now = performance.now();
    if (now - lastPointer > 700) trailGroup++;
    lastPointer = now;
    const coalesced = event.getCoalescedEvents ? event.getCoalescedEvents() : [];
    const samples = coalesced.length ? coalesced : [event];
    for (let i = Math.max(0, samples.length - 8); i < samples.length; i++) {
      const x = samples[i].clientX;
      const y = samples[i].clientY;
      const previous = trail[trail.length - 1];
      if (previous) {
        const dx = x - previous.x;
        const dy = y - previous.y;
        const distance = Math.hypot(dx, dy);
        if (distance < 1.5 && previous.group === trailGroup) continue;
        if (previous.group === trailGroup && distance > 3 && now - lastSpark > (lightEffects ? 40 : 22) && !blocked(x, y)) {
          const speed = Math.min(distance * 1.2, 80) / distance;
          sparks.push({ x: x, y: y, vx: -dx * speed + (Math.random() - .5) * 24,
            vy: -dy * speed + (Math.random() - .5) * 24, time: now, life: 420 + Math.random() * 220,
            size: 1.6 + Math.random() * 1.5, gold: trail.length % 4 === 0 });
          if (sparks.length > (lightEffects ? 16 : 36)) sparks.shift();
          lastSpark = now;
        }
      }
      trail.push({ x: x, y: y, time: now - Math.max(0, event.timeStamp - samples[i].timeStamp), group: trailGroup });
      if (trail.length > (lightEffects ? 48 : 96)) trail.shift();
    }
    scheduleParticles(true);
  }, { passive: true });
  document.addEventListener('pointerleave', function () { trailGroup++; resetHover(); });
  window.addEventListener('blur', function () { trailGroup++; resetHover(); });

  hero.addEventListener('pointerleave', function () {
    pointerX = pointerY = 0;
    hero.classList.remove('scene-inspecting');
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
    clearTimeout(particleTimer);
    particleTimer = 0;
    cancelAnimationFrame(particleFrame);
    particleFrame = 0;
  });

  window.addEventListener('scroll', function () {
    trailGroup++;
    resetHover();
    progressDirty = true;
    requestRender();
  }, { passive: true });
  window.addEventListener('resize', function () { progressDirty = true; resetHover(); sizeParticles(); syncActivity(); requestRender(); });
  sizeParticles();
  if (document.fonts) document.fonts.ready.then(function () { sizeParticles(true); });
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
