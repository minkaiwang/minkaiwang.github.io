document.addEventListener('DOMContentLoaded', function () {
  const hero = document.querySelector('.research-hero');
  if (!hero) return;

  const navigation = document.querySelector('.research-nav');
  const toggle = navigation.querySelector('button');
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
  let pointerX = 0;
  let pointerY = 0;
  let frame = 0;
  let heroVisible = true;

  function render() {
    frame = 0;
    if (reduceMotion.matches || !heroVisible) return;
    const progress = Math.min(1, Math.max(0, window.scrollY / hero.offsetHeight));
    hero.style.setProperty('--scene-x', pointerX.toFixed(2) + 'px');
    hero.style.setProperty('--scene-y', (pointerY + progress * 28).toFixed(2) + 'px');
  }

  function requestRender() {
    if (!frame && heroVisible && !reduceMotion.matches) frame = requestAnimationFrame(render);
  }

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

  reduceMotion.addEventListener('change', function () {
    hero.style.setProperty('--scene-x', '0px');
    hero.style.setProperty('--scene-y', '0px');
    requestRender();
  });

  window.addEventListener('scroll', requestRender, { passive: true });
});
