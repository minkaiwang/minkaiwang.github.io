document.addEventListener('DOMContentLoaded', function () {
  const viewer = document.querySelector('.image-viewer');
  if (!viewer || typeof viewer.showModal !== 'function') return;
  const root = document.documentElement;
  const english = root.lang === 'en';
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const picture = viewer.querySelector('.image-viewer__image');
  const title = viewer.querySelector('.image-viewer__title');
  const status = viewer.querySelector('.image-viewer__status');
  const counter = viewer.querySelector('.image-viewer__counter');
  const original = viewer.querySelector('.image-viewer__original');
  const previous = viewer.querySelector('.image-viewer__previous');
  const next = viewer.querySelector('.image-viewer__next');
  const projects = [];
  let items = [];
  let index = 0;
  let opener = null;
  let openingItem = null;
  let closing = false;
  let version = 0;
  let animation = null;
  let touchStart = null;

  function canMove() {
    return root.dataset.motion === 'full' && !reduceMotion.matches;
  }
  function notify() {
    document.dispatchEvent(new CustomEvent('homepage:gallerychange'));
  }
  function frameFor(source) {
    const rect = source.getBoundingClientRect();
    const area = picture.getBoundingClientRect();
    const scale = Math.min(rect.width / area.width, rect.height / area.height);
    return { transform: 'translate(' + (rect.left + rect.width / 2 - area.left - area.width / 2) + 'px,' +
      (rect.top + rect.height / 2 - area.top - area.height / 2) + 'px) scale(' + scale + ')', opacity: 0.65 };
  }
  function showCurrent(fromSource) {
    const request = ++version;
    const item = items[index];
    if (animation) animation.cancel();
    title.textContent = item.title;
    counter.textContent = (index + 1) + ' / ' + items.length;
    previous.hidden = next.hidden = items.length < 2;
    picture.hidden = true;
    picture.alt = item.alt;
    status.textContent = english ? 'Loading image...' : '正在加载图片…';
    status.hidden = false;
    original.href = item.src;
    picture.src = item.src;
    picture.decode().then(function () {
      if (request !== version || !viewer.open || closing) return;
      picture.hidden = false;
      status.hidden = true;
      if (canMove()) {
        animation = picture.animate([
          fromSource ? frameFor(fromSource) : { opacity: 0.4 },
          { transform: 'none', opacity: 1 }
        ], { duration: fromSource ? 320 : 160, easing: 'cubic-bezier(.16,1,.3,1)' });
      }
    }).catch(function () {
      if (request !== version || !viewer.open) return;
      status.textContent = english ? 'Image unavailable. You can open the original above.' : '图片暂时无法加载，可通过右上角打开原图。';
    });
  }
  function openPreview(list, selected, button) {
    if (viewer.open) return;
    items = list;
    index = selected;
    opener = button;
    openingItem = items[index];
    closing = false;
    root.classList.add('image-viewer-open');
    viewer.showModal();
    showCurrent(openingItem.source);
    notify();
  }
  function closePreview() {
    if (!viewer.open || closing) return;
    closing = true;
    ++version;
    if (animation) animation.cancel();
    const source = items[index].source;
    const bounds = source.getBoundingClientRect();
    const visible = bounds.bottom > 0 && bounds.top < window.innerHeight;
    if (canMove() && !picture.hidden) {
      const destination = items[index] === openingItem && visible ? frameFor(source) : { opacity: 0 };
      animation = picture.animate([{ transform: 'none', opacity: 1 }, destination], { duration: 180, easing: 'ease-in', fill: 'forwards' });
      animation.finished.catch(function () {}).then(function () { if (viewer.open) viewer.close(); });
    } else viewer.close();
  }
  function step(direction) {
    if (closing || items.length < 2) return;
    index = (index + direction + items.length) % items.length;
    showCurrent(null);
  }

  document.querySelectorAll('.project-card .pub-media-rotator').forEach(function (media) {
    const sources = Array.from(media.querySelectorAll('img'));
    if (!sources.length) return;
    const name = media.closest('.project-card').querySelector('strong').textContent.trim();
    sources.forEach(function (source) {
      projects.push({ source: source, src: source.src, alt: source.alt, title: name });
    });
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'project-preview';
    button.setAttribute('aria-haspopup', 'dialog');
    button.setAttribute('aria-label', (english ? 'View image: ' : '查看图片：') + name);
    button.title = english ? 'View full image' : '查看完整图片';
    const icon = document.createElement('i');
    icon.className = 'fas fa-expand';
    icon.setAttribute('aria-hidden', 'true');
    button.appendChild(icon);
    button.addEventListener('click', function () {
      const active = sources.find(function (source) { return getComputedStyle(source).display !== 'none'; }) || sources[0];
      openPreview(projects, projects.findIndex(function (item) { return item.source === active; }), button);
    });
    media.appendChild(button);
  });

  const backgroundLink = document.querySelector('.scene-original-link');
  backgroundLink.setAttribute('aria-haspopup', 'dialog');
  backgroundLink.addEventListener('click', function (event) {
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || event.button !== 0) return;
    event.preventDefault();
    const name = english ? 'Night City' : '夜之城';
    openPreview([{ src: backgroundLink.href, source: document.querySelector('.research-hero__landscape img'), alt: name, title: name }], 0, backgroundLink);
  });
  viewer.querySelector('.image-viewer__close').addEventListener('click', closePreview);
  previous.addEventListener('click', function () { step(-1); });
  next.addEventListener('click', function () { step(1); });
  viewer.addEventListener('cancel', function (event) { event.preventDefault(); closePreview(); });
  viewer.addEventListener('click', function (event) { if (event.target === viewer) closePreview(); });
  viewer.addEventListener('keydown', function (event) {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      step(event.key === 'ArrowLeft' ? -1 : 1);
    }
  });
  const stage = viewer.querySelector('.image-viewer__stage');
  stage.addEventListener('touchstart', function (event) {
    touchStart = event.touches.length === 1 ? { x: event.touches[0].clientX, y: event.touches[0].clientY } : null;
  }, { passive: true });
  stage.addEventListener('touchmove', function (event) {
    if (!touchStart || event.touches.length !== 1) return;
    const dx = event.touches[0].clientX - touchStart.x;
    const dy = event.touches[0].clientY - touchStart.y;
    // Claim horizontal swipes so a native fling cannot swallow the next button tap.
    if (event.cancelable && Math.abs(dx) > 12 && Math.abs(dx) > Math.abs(dy) * 1.5) event.preventDefault();
  }, { passive: false });
  stage.addEventListener('touchend', function (event) {
    if (!touchStart || event.touches.length) return;
    const dx = event.changedTouches[0].clientX - touchStart.x;
    const dy = event.changedTouches[0].clientY - touchStart.y;
    touchStart = null;
    if (Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy) * 1.5) step(dx < 0 ? 1 : -1);
  }, { passive: true });
  stage.addEventListener('touchcancel', function () { touchStart = null; }, { passive: true });
  viewer.addEventListener('close', function () {
    ++version;
    if (animation) animation.cancel();
    root.classList.remove('image-viewer-open');
    closing = false;
    picture.hidden = true;
    picture.removeAttribute('src');
    if (opener) opener.focus({ preventScroll: true });
    notify();
  });
  document.addEventListener('homepage:motionchange', function () {
    if (!canMove() && animation) animation.cancel();
  });
});
