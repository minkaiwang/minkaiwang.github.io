document.addEventListener('DOMContentLoaded', () => {
  const rotators = document.querySelectorAll('.pub-media-rotator');
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');

  rotators.forEach((rotator) => {
    const intervalMs = Number.parseInt(rotator.dataset.interval || '4000', 10);
    let items = Array.from(rotator.children).filter(
      (el) => el && (el.tagName === 'IMG' || el.tagName === 'VIDEO')
    );

    items = items.filter((el) => {
      if (el.tagName !== 'VIDEO') return true;
      const source = el.querySelector('source');
      const src = source ? source.getAttribute('src') : '';
      return Boolean(src && src.trim());
    });

    if (items.length <= 1) return;

    let idx = 0;
    let timerId = null;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let paused = false;
    let visible = false;
    let inspecting = false;
    let imageTransition = null;
    let progressAnimation = null;
    const progress = document.createElement('span');
    progress.className = 'media-progress';
    progress.setAttribute('aria-hidden', 'true');
    const counter = document.createElement('output');
    counter.className = 'media-counter';
    counter.setAttribute('aria-live', 'off');
    const motionStopped = () => reduceMotion.matches ||
      (document.documentElement.dataset.motion && document.documentElement.dataset.motion !== 'full');

    const clearTimer = () => {
      if (timerId) window.clearTimeout(timerId);
      timerId = null;
      if (progressAnimation) progressAnimation.cancel();
      progressAnimation = null;
    };

    const advance = (manual = false) => {
      idx = (idx + 1) % items.length;
      show(idx, manual === true);
      scheduleNext();
    };

    const show = (newIdx, manual = false) => {
      if (imageTransition) imageTransition.cancel();
      counter.setAttribute('aria-live', manual ? 'polite' : 'off');
      counter.textContent = String(newIdx + 1).padStart(2, '0') + ' / ' + String(items.length).padStart(2, '0');
      counter.setAttribute('aria-label', (document.documentElement.lang === 'en' ? 'Image ' : '图片 ') + counter.textContent);
      const changed = rotator.dataset.imageIndex !== undefined && Number(rotator.dataset.imageIndex) !== newIdx;
      rotator.dataset.imageIndex = String(newIdx);
      items.forEach((el, i) => {
        const active = i === newIdx;
        el.style.display = active ? 'block' : 'none';

        if (el.tagName === 'VIDEO') {
          if (active) {
            el.loop = false;
            el.removeAttribute('loop');
            el.currentTime = 0;
            const p = el.play();
            if (p && typeof p.catch === 'function') p.catch(() => {});
          } else {
            el.pause();
            el.currentTime = 0;
          }
        }
      });
      if (changed && !motionStopped() && document.documentElement.dataset.effectsQuality !== 'light' && !document.hidden && visible) {
        imageTransition = items[newIdx].animate([{ opacity: .55 }, { opacity: 1 }], { duration: 220, easing: 'ease-out' });
      }
    };

    const scheduleNext = () => {
      clearTimer();
      if (paused || inspecting || motionStopped() || !visible || document.hidden || document.documentElement.classList.contains('image-viewer-open')) return;

      const current = items[idx];
      if (!current) return;
      const next = items[(idx + 1) % items.length];
      if (next.tagName === 'IMG') next.loading = 'eager';

      if (current.tagName === 'VIDEO') {
        current.addEventListener(
          'ended',
          () => {
            if (items[idx] !== current) return;
            advance();
          },
          { once: true }
        );

        let holdMs = Math.max(intervalMs, 12000);
        const durationSec = current.duration;
        if (Number.isFinite(durationSec) && durationSec > 0) {
          holdMs = Math.max(intervalMs, Math.ceil(durationSec * 1000) + 250);
        } else {
          current.addEventListener(
            'loadedmetadata',
            () => {
              if (items[idx] !== current) return;
              scheduleNext();
            },
            { once: true }
          );
        }

        timerId = window.setTimeout(() => {
          if (items[idx] !== current) return;
          advance();
        }, holdMs);

        return;
      }

      timerId = window.setTimeout(advance, intervalMs);
      if (document.documentElement.dataset.effectsQuality !== 'light') {
        progressAnimation = progress.animate([{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], { duration: intervalMs, easing: 'linear', fill: 'forwards' });
      }
    };

    const fallbackToImage = () => {
      clearTimer();
      idx = 0;
      show(idx);
      scheduleNext();
    };

    items.forEach((el) => {
      if (el.tagName !== 'VIDEO') return;

      el.addEventListener('error', fallbackToImage, { once: true });
      const source = el.querySelector('source');
      if (source) source.addEventListener('error', fallbackToImage, { once: true });
    });

    const english = document.documentElement.lang === 'en';
    const controls = document.createElement('div');
    controls.className = 'media-controls';
    controls.appendChild(counter);
    controls.appendChild(progress);
    const projectTitle = rotator.closest('.project-card')?.querySelector('strong');
    if (projectTitle) {
      rotator.setAttribute('role', 'group');
      rotator.setAttribute('aria-label', projectTitle.textContent.trim());
    }
    function control(label, icon, handler) {
      const button = document.createElement('button');
      button.type = 'button';
      button.title = label;
      button.setAttribute('aria-label', label);
      const glyph = document.createElement('i');
      glyph.className = 'fas fa-' + icon;
      glyph.setAttribute('aria-hidden', 'true');
      button.appendChild(glyph);
      button.addEventListener('click', handler);
      controls.appendChild(button);
      return button;
    }
    control(english ? 'Previous image' : '上一张图片', 'chevron-left', () => {
      idx = (idx - 1 + items.length) % items.length;
      show(idx, true);
      scheduleNext();
    });
    const pauseButton = control('', 'pause', () => {
      paused = !paused;
      updatePause();
      scheduleNext();
    });
    function updatePause() {
      const stopped = paused || motionStopped();
      const label = motionStopped() ? (english ? 'Visual effects are paused' : '视觉动效已暂停') : paused ? (english ? 'Play slideshow' : '播放轮播') : (english ? 'Pause slideshow' : '暂停轮播');
      pauseButton.title = label;
      pauseButton.setAttribute('aria-label', label);
      pauseButton.disabled = Boolean(motionStopped());
      pauseButton.querySelector('i').className = 'fas fa-' + (stopped ? 'play' : 'pause');
    }
    control(english ? 'Next image' : '下一张图片', 'chevron-right', () => advance(true));
    rotator.appendChild(controls);
    rotator.addEventListener('pointerenter', (event) => {
      if (!finePointer.matches || event.pointerType === 'touch') return;
      inspecting = true;
      scheduleNext();
    });
    rotator.addEventListener('pointerleave', () => {
      if (!inspecting) return;
      inspecting = false;
      scheduleNext();
    });
    rotator.addEventListener('focusin', (event) => {
      if (!event.target.matches(':focus-visible')) return;
      paused = true;
      updatePause();
      scheduleNext();
    });
    rotator.addEventListener('keydown', (event) => {
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || !event.target.closest('.project-preview, .media-controls button')) return;
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
      event.preventDefault();
      paused = true;
      updatePause();
      idx = (idx + (event.key === 'ArrowRight' ? 1 : -1) + items.length) % items.length;
      show(idx, true);
      scheduleNext();
    });
    const syncMotion = () => {
      if ((motionStopped() || document.hidden || document.documentElement.classList.contains('image-viewer-open')) && imageTransition) imageTransition.cancel();
      updatePause();
      scheduleNext();
    };
    reduceMotion.addEventListener('change', syncMotion);
    document.addEventListener('homepage:motionchange', syncMotion);
    document.addEventListener('homepage:gallerychange', syncMotion);
    document.addEventListener('visibilitychange', syncMotion);
    new IntersectionObserver((entries) => {
      visible = entries[0].isIntersecting;
      scheduleNext();
    }).observe(rotator);
    updatePause();
    show(idx);
    scheduleNext();
  });
});
