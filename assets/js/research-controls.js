document.addEventListener('DOMContentLoaded', function () {
  const root = document.documentElement;
  const themeButton = document.querySelector('.theme-toggle');
  const widget = document.querySelector('.music-widget');
  if (!themeButton || !widget) return;
  const english = root.lang === 'en';
  const labels = english ? {
    day: 'Switch to day theme', night: 'Switch to night theme',
    play: 'Play background music V', pause: 'Pause background music V',
    blocked: 'Click to play V', error: 'Retry background music V',
    mute: 'Mute background music', unmute: 'Unmute background music'
  } : {
    day: '切换为日间配色', night: '切换为夜间配色',
    play: '播放背景音乐 V', pause: '暂停背景音乐 V',
    blocked: '点击播放 V', error: '重试播放背景音乐 V',
    mute: '静音背景音乐', unmute: '取消背景音乐静音'
  };

  function read(key, fallback) {
    try { const value = localStorage.getItem(key); return value === null ? fallback : value; } catch (_) { return fallback; }
  }
  function save(key, value) {
    try { localStorage.setItem(key, String(value)); } catch (_) {}
  }
  function label(button, text) {
    button.setAttribute('aria-label', text);
    button.title = text;
  }
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let themeTimer = 0;
  let turnTimer = 0;
  function motionEnabled() {
    return (!root.dataset.motion || root.dataset.motion === 'full') && !reducedMotion.matches;
  }
  function clearThemeMotion() {
    window.clearTimeout(themeTimer);
    window.clearTimeout(turnTimer);
    root.classList.remove('theme-changing');
    themeButton.classList.remove('is-turning');
  }
  function applyTheme(theme, persist) {
    const night = theme === 'night';
    const next = night ? 'night' : 'day';
    clearThemeMotion();
    if (persist && root.dataset.theme !== next && motionEnabled() && !document.hidden) {
      root.classList.add('theme-changing');
      void themeButton.offsetWidth;
      themeButton.classList.add('is-turning');
      themeTimer = window.setTimeout(function () { root.classList.remove('theme-changing'); }, 350);
      turnTimer = window.setTimeout(function () { themeButton.classList.remove('is-turning'); }, 300);
    }
    root.dataset.theme = next;
    themeButton.setAttribute('aria-pressed', String(night));
    themeButton.querySelector('i').className = 'fas fa-' + (night ? 'sun' : 'moon');
    label(themeButton, night ? labels.day : labels.night);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = night ? '#14191c' : '#f5f8f7';
    if (persist) save('homepage-theme', root.dataset.theme);
  }
  applyTheme(root.dataset.theme, false);
  themeButton.addEventListener('click', function () {
    applyTheme(root.dataset.theme === 'night' ? 'day' : 'night', true);
  });
  window.addEventListener('storage', function (event) {
    if (event.key === 'homepage-theme') applyTheme(event.newValue, false);
  });

  let audio = widget.querySelector('audio');
  const playButton = widget.querySelector('.music-toggle');
  const muteButton = widget.querySelector('.music-mute');
  const volumeInput = widget.querySelector('#music-volume');
  const volumeValue = widget.querySelector('.music-volume-value');
  const clock = widget.querySelector('.music-clock');
  const progress = widget.querySelector('.music-progress');
  const settings = widget.querySelector('.music-settings');
  const spectrum = widget.querySelector('.music-spectrum');
  const bars = Array.from(widget.querySelectorAll('.music-spectrum > span'));
  let wanted = read('music-enabled', 'on') !== 'off';
  let activationNeeded = false;
  let requestPending = false;
  let lastSavedAt = 0;
  let audioContext = null;
  let audioSource = null;
  let analyser = null;
  let frequencyData = null;
  let frequencyBands = [];
  let spectrumUnavailable = false;
  let spectrumFrame = 0;
  let lastSpectrumAt = 0;
  let pageActive = true;
  let restorePosition = null;
  const savedVolume = Number(read('music-volume', '0.25'));
  audio.volume = Number.isFinite(savedVolume) ? Math.max(0, Math.min(1, savedVolume)) : 0.25;
  audio.muted = read('music-muted', 'off') === 'on';
  let lastAudibleVolume = audio.volume > 0 ? audio.volume : 0.25;

  function stopSpectrum() {
    if (spectrumFrame) window.cancelAnimationFrame(spectrumFrame);
    spectrumFrame = 0;
    lastSpectrumAt = 0;
    bars.forEach(function (bar) { bar.style.transform = 'scaleY(0)'; });
    if (spectrum) spectrum.dataset.active = 'false';
  }
  function canDrawSpectrum() {
    return analyser && audioContext.state === 'running' && pageActive && !document.hidden &&
      settings.open && !audio.paused && !audio.ended && !audio.error && audio.readyState >= 2 &&
      !audio.muted && audio.volume > 0 && motionEnabled();
  }
  function drawSpectrum(now) {
    spectrumFrame = 0;
    if (!canDrawSpectrum()) { stopSpectrum(); return; }
    if (!lastSpectrumAt || now - lastSpectrumAt >= 1000 / 30) {
      try {
        analyser.getByteFrequencyData(frequencyData);
      } catch (_) {
        spectrumUnavailable = true;
        analyser = null;
        stopSpectrum();
        return;
      }
      bars.forEach(function (bar, index) {
        const band = frequencyBands[index];
        let total = 0;
        for (let bin = band[0]; bin < band[1]; bin++) total += frequencyData[bin];
        const level = total / ((band[1] - band[0]) * 255);
        bar.style.transform = 'scaleY(' + level.toFixed(4) + ')';
      });
      lastSpectrumAt = now - (now - lastSpectrumAt) % (1000 / 30);
    }
    spectrumFrame = window.requestAnimationFrame(drawSpectrum);
  }
  function syncSpectrum() {
    if (!canDrawSpectrum()) { stopSpectrum(); return; }
    spectrum.dataset.active = 'true';
    if (!spectrumFrame) spectrumFrame = window.requestAnimationFrame(drawSpectrum);
  }
  function closeUnusedContext() {
    if (audioContext && audioContext.state !== 'closed') {
      try { audioContext.close().catch(function () {}); } catch (_) {}
    }
  }
  function restoreNativeAudio() {
    spectrumUnavailable = true;
    analyser = null;
    stopSpectrum();
    if (audioSource) {
      // A routed media element cannot be detached from its context; replace it on failure.
      const previous = audio;
      const replacement = previous.cloneNode(true);
      const resume = wanted && (!previous.paused || requestPending);
      restorePosition = previous.currentTime;
      replacement.volume = previous.volume;
      replacement.muted = previous.muted;
      replacement.playbackRate = previous.playbackRate;
      previous.pause();
      previous.replaceWith(replacement);
      audio = replacement;
      requestPending = false;
      try { audioSource.disconnect(); } catch (_) {}
      audioSource = null;
      state('paused');
      if (resume) startMusic();
    }
    closeUnusedContext();
  }
  function connectSpectrum() {
    if (audioSource || spectrumUnavailable || audioContext.state !== 'running' || !pageActive) return;
    let outputConnected = false;
    try {
      analyser = audioContext.createAnalyser();
      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = 0.75;
      analyser.minDecibels = -90;
      analyser.maxDecibels = -20;
      frequencyData = new Uint8Array(analyser.frequencyBinCount);
      const edges = [60, 140, 300, 650, 1400, 3000, 6500, 14000];
      const binWidth = audioContext.sampleRate / analyser.fftSize;
      frequencyBands = bars.map(function (_, index) {
        const first = Math.min(frequencyData.length - 1, Math.max(1, Math.floor(edges[index] / binWidth)));
        const end = Math.min(frequencyData.length, Math.max(first + 1, Math.ceil(edges[index + 1] / binWidth)));
        return [first, end];
      });
      // Keep the audible path independent of the optional analysis branch.
      audioSource = audioContext.createMediaElementSource(audio);
      audioSource.connect(audioContext.destination);
      outputConnected = true;
      audioSource.connect(analyser);
    } catch (_) {
      spectrumUnavailable = true;
      analyser = null;
      stopSpectrum();
      if (!outputConnected) restoreNativeAudio();
    }
    syncSpectrum();
  }
  function resumeAudioContext() {
    if (!audioContext) return;
    if (audioContext.state === 'closed') {
      if (audioSource) restoreNativeAudio();
      return;
    }
    if (audioContext.state === 'running') {
      connectSpectrum();
      syncSpectrum();
      return;
    }
    try {
      audioContext.resume().then(function () {
        connectSpectrum();
        syncSpectrum();
      }).catch(function () {
        if (pageActive && !document.hidden) restoreNativeAudio();
      });
    } catch (_) {
      restoreNativeAudio();
    }
  }
  function activateSpectrum(event) {
    if (!event.isTrusted) return;
    if (!audioContext && !spectrumUnavailable && motionEnabled() && bars.length === 7) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) { spectrumUnavailable = true; return; }
      try {
        audioContext = new AudioContextClass();
        audioContext.addEventListener('statechange', function () {
          if (audioContext.state === 'closed' && audioSource) restoreNativeAudio();
          syncSpectrum();
        });
      } catch (_) {
        spectrumUnavailable = true;
        closeUnusedContext();
      }
    }
    resumeAudioContext();
  }

  function state(value) {
    widget.dataset.state = value;
    const playing = value === 'playing';
    playButton.querySelector('i').className = 'fas fa-' + (playing ? 'pause' : 'play');
    const text = playing ? labels.pause : value === 'blocked' ? labels.blocked : value === 'error' ? labels.error : labels.play;
    label(playButton, text);
    syncSpectrum();
  }
  function syncVolume() {
    const muted = audio.muted || audio.volume === 0;
    volumeInput.value = Math.round(audio.volume * 100);
    volumeValue.value = volumeInput.value + '%';
    muteButton.setAttribute('aria-pressed', String(muted));
    muteButton.querySelector('i').className = 'fas fa-' + (muted ? 'volume-xmark' : audio.volume > 0.5 ? 'volume-high' : 'volume-low');
    label(muteButton, muted ? labels.unmute : labels.mute);
    save('music-volume', audio.volume);
    save('music-muted', audio.muted ? 'on' : 'off');
    syncSpectrum();
  }
  function time(value) {
    if (!Number.isFinite(value)) return '0:00';
    return Math.floor(value / 60) + ':' + String(Math.floor(value % 60)).padStart(2, '0');
  }
  function savePlayback() {
    if (Number.isFinite(audio.currentTime)) save('music-position', audio.currentTime);
  }
  function syncProgress() {
    clock.textContent = time(audio.currentTime) + ' / ' + time(audio.duration);
    if (!progress) return;
    const duration = Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : 0;
    progress.max = duration || 1;
    progress.value = duration && Number.isFinite(audio.currentTime) ? Math.max(0, Math.min(duration, audio.currentTime)) : 0;
  }

  async function startMusic() {
    if (!wanted || requestPending) return;
    requestPending = true;
    const requestedAudio = audio;
    try {
      await requestedAudio.play();
      if (requestedAudio !== audio) return;
      activationNeeded = false;
      if (!wanted) audio.pause();
    } catch (error) {
      if (requestedAudio !== audio || !wanted) return;
      activationNeeded = error.name === 'NotAllowedError';
      state(activationNeeded ? 'blocked' : 'error');
    } finally {
      if (requestedAudio === audio) requestPending = false;
    }
  }

  playButton.addEventListener('click', function () {
    if (!audio.paused) {
      wanted = false;
      activationNeeded = false;
      save('music-enabled', 'off');
      audio.pause();
      savePlayback();
    } else {
      wanted = true;
      save('music-enabled', 'on');
      if (audio.error) audio.load();
      startMusic();
    }
  });
  widget.addEventListener('click', activateSpectrum);
  volumeInput.addEventListener('input', function () {
    resumeAudioContext();
    audio.volume = Number(volumeInput.value) / 100;
    audio.muted = false;
    if (audio.volume > 0) lastAudibleVolume = audio.volume;
    syncVolume();
  });
  muteButton.addEventListener('click', function () {
    const muted = audio.muted || audio.volume === 0;
    if (muted && audio.volume === 0) audio.volume = lastAudibleVolume;
    audio.muted = !muted;
    syncVolume();
  });
  // Capture also handles a replacement native player after an audio-graph failure.
  function onAudio(type, handler) {
    widget.addEventListener(type, function (event) { if (event.target === audio) handler(); }, true);
  }
  onAudio('play', function () { state('playing'); });
  onAudio('playing', syncSpectrum);
  onAudio('pause', function () { state('paused'); });
  onAudio('error', function () { state('error'); });
  onAudio('volumechange', syncVolume);
  onAudio('durationchange', syncProgress);
  onAudio('loadedmetadata', function () {
    const position = restorePosition === null ? Number(read('music-position', '0')) : restorePosition;
    restorePosition = null;
    if (Number.isFinite(position) && position > 0 && Number.isFinite(audio.duration) && audio.duration > 0) {
      audio.currentTime = position % audio.duration;
    }
    syncProgress();
  });
  onAudio('timeupdate', function () {
    syncProgress();
    if (performance.now() - lastSavedAt > 1000) {
      savePlayback();
      lastSavedAt = performance.now();
    }
  });
  window.addEventListener('pagehide', function () {
    savePlayback();
    pageActive = false;
    stopSpectrum();
    clearThemeMotion();
  });
  window.addEventListener('pageshow', function (event) {
    pageActive = true;
    if (event.persisted) {
      applyTheme(read('homepage-theme', root.dataset.theme), false);
      wanted = read('music-enabled', 'on') !== 'off';
      if (wanted) {
        resumeAudioContext();
        startMusic();
      } else {
        audio.pause();
      }
      syncProgress();
      positionSettings();
    }
    syncSpectrum();
  });
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) clearThemeMotion();
    else if (wanted) resumeAudioContext();
    syncSpectrum();
  });
  function syncMotion() {
    if (!motionEnabled()) clearThemeMotion();
    syncSpectrum();
  }
  root.addEventListener('homepage:motionchange', syncMotion);
  reducedMotion.addEventListener('change', syncMotion);

  function positionSettings() {
    if (!settings.open) return;
    const bottom = document.querySelector('.masthead').getBoundingClientRect().bottom;
    settings.style.setProperty('--music-panel-top', (bottom + 10) + 'px');
  }
  settings.addEventListener('toggle', function () {
    positionSettings();
    syncSpectrum();
  });
  window.addEventListener('resize', positionSettings);

  // Autoplay rejection is retried only inside a real user activation.
  function unlockMusic(event) {
    if (!event.isTrusted) return;
    if (event.type === 'keydown' && (event.repeat || event.ctrlKey || event.metaKey || event.altKey || event.key === 'Tab' || event.key === 'Escape')) return;
    resumeAudioContext();
    if (!activationNeeded || !wanted || widget.contains(event.target)) return;
    startMusic();
  }
  document.addEventListener('pointerup', unlockMusic);
  document.addEventListener('keydown', unlockMusic);
  document.addEventListener('click', function (event) {
    if (!widget.contains(event.target)) settings.open = false;
  });
  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && settings.open) {
      settings.open = false;
      settings.querySelector('summary').focus();
    }
  });
  state('paused');
  syncVolume();
  syncProgress();
  if (wanted) startMusic();
});
