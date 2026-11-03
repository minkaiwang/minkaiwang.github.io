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
  let effectsPaused = false;
  try { effectsPaused = localStorage.getItem('nightcity-effects') === 'off'; } catch (_) {}
  let glitchTimer = 0;
  let pointerX = 0;
  let pointerY = 0;
  let frame = 0;
  let heroVisible = true;

  function render() {
    frame = 0;
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    document.documentElement.style.setProperty('--reading-progress', (maxScroll > 0 ? Math.min(100, window.scrollY / maxScroll * 100) : 0).toFixed(2) + '%');
    if (reduceMotion.matches || effectsPaused || !heroVisible) return;
    const progress = Math.min(1, Math.max(0, window.scrollY / hero.offsetHeight));
    hero.style.setProperty('--scene-x', pointerX.toFixed(2) + 'px');
    hero.style.setProperty('--scene-y', (pointerY + progress * 28).toFixed(2) + 'px');
  }

  function requestRender() {
    if (!frame) frame = requestAnimationFrame(render);
  }

  function updateEffects() {
    const paused = effectsPaused || reduceMotion.matches;
    hero.classList.toggle('effects-paused', paused);
    hero.style.setProperty('--scene-x', '0px');
    hero.style.setProperty('--scene-y', '0px');
    hero.classList.remove('is-glitching');
    if (effectsToggle) {
      const label = reduceMotion.matches ? effectsToggle.dataset.system : paused ? effectsToggle.dataset.off : effectsToggle.dataset.on;
      effectsToggle.setAttribute('aria-label', label);
      effectsToggle.title = label;
      effectsToggle.setAttribute('aria-pressed', String(!paused));
      effectsToggle.disabled = reduceMotion.matches;
      effectsToggle.querySelector('i').className = 'fas fa-' + (paused ? 'play' : 'pause');
    }
    requestRender();
  }

  function glitch() {
    if (reduceMotion.matches || effectsPaused || glitchTimer) return;
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
  hero.querySelector('h1').addEventListener('pointerenter', glitch);

  hero.addEventListener('pointermove', function (event) {
    if (!finePointer.matches) return;
    const bounds = hero.getBoundingClientRect();
    pointerX = ((event.clientX - bounds.left) / bounds.width - 0.5) * 12;
    pointerY = ((event.clientY - bounds.top) / bounds.height - 0.5) * 8;
    requestRender();
  }, { passive: true });

  hero.addEventListener('pointerleave', function () {
    pointerX = pointerY = 0;
    requestRender();
  });

  new IntersectionObserver(function (entries) {
    heroVisible = entries[0].isIntersecting;
    requestRender();
  }).observe(hero);

  const sectionObserver = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) { entry.target.classList.toggle('section-in-view', entry.isIntersecting); });
  }, { rootMargin: '-10% 0px -15% 0px' });
  document.querySelectorAll('.home-section').forEach(function (section) { sectionObserver.observe(section); });

  reduceMotion.addEventListener('change', updateEffects);

  window.addEventListener('scroll', requestRender, { passive: true });
  window.addEventListener('resize', requestRender);
  updateEffects();
});
