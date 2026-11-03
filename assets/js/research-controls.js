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
  function applyTheme(theme, persist) {
    const night = theme === 'night';
    root.dataset.theme = night ? 'night' : 'day';
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

  const audio = widget.querySelector('audio');
  const playButton = widget.querySelector('.music-toggle');
  const muteButton = widget.querySelector('.music-mute');
  const volumeInput = widget.querySelector('#music-volume');
  const volumeValue = widget.querySelector('.music-volume-value');
  const clock = widget.querySelector('.music-clock');
  const settings = widget.querySelector('.music-settings');
  let wanted = read('music-enabled', 'on') !== 'off';
  let activationNeeded = false;
  let requestPending = false;
  let lastSavedAt = 0;
  const savedVolume = Number(read('music-volume', '0.25'));
  audio.volume = Number.isFinite(savedVolume) ? Math.max(0, Math.min(1, savedVolume)) : 0.25;
  audio.muted = read('music-muted', 'off') === 'on';
  let lastAudibleVolume = audio.volume > 0 ? audio.volume : 0.25;

  function state(value) {
    widget.dataset.state = value;
    const playing = value === 'playing';
    playButton.querySelector('i').className = 'fas fa-' + (playing ? 'pause' : 'play');
    const text = playing ? labels.pause : value === 'blocked' ? labels.blocked : value === 'error' ? labels.error : labels.play;
    label(playButton, text);
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
  }
  function time(value) {
    if (!Number.isFinite(value)) return '0:00';
    return Math.floor(value / 60) + ':' + String(Math.floor(value % 60)).padStart(2, '0');
  }
  function savePlayback() {
    if (Number.isFinite(audio.currentTime)) save('music-position', audio.currentTime);
  }

  async function startMusic() {
    if (!wanted || requestPending) return;
    requestPending = true;
    try {
      await audio.play();
      activationNeeded = false;
      if (!wanted) audio.pause();
    } catch (error) {
      if (!wanted) return;
      activationNeeded = error.name === 'NotAllowedError';
      state(activationNeeded ? 'blocked' : 'error');
    } finally {
      requestPending = false;
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
  volumeInput.addEventListener('input', function () {
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
  audio.addEventListener('play', function () { state('playing'); });
  audio.addEventListener('pause', function () { state('paused'); });
  audio.addEventListener('error', function () { state('error'); });
  audio.addEventListener('volumechange', syncVolume);
  audio.addEventListener('loadedmetadata', function () {
    const position = Number(read('music-position', '0'));
    if (Number.isFinite(position) && position > 0 && Number.isFinite(audio.duration)) {
      audio.currentTime = position % audio.duration;
    }
    clock.textContent = time(audio.currentTime) + ' / ' + time(audio.duration);
  });
  audio.addEventListener('timeupdate', function () {
    clock.textContent = time(audio.currentTime) + ' / ' + time(audio.duration);
    if (performance.now() - lastSavedAt > 1000) {
      savePlayback();
      lastSavedAt = performance.now();
    }
  });
  window.addEventListener('pagehide', savePlayback);

  function positionSettings() {
    if (!settings.open) return;
    const bottom = document.querySelector('.masthead').getBoundingClientRect().bottom;
    settings.style.setProperty('--music-panel-top', (bottom + 10) + 'px');
  }
  settings.addEventListener('toggle', positionSettings);
  window.addEventListener('resize', positionSettings);

  // Autoplay rejection is retried only inside a real user activation.
  function unlockMusic(event) {
    if (!activationNeeded || !wanted || widget.contains(event.target)) return;
    if (event.type === 'keydown' && (event.repeat || event.ctrlKey || event.metaKey || event.altKey || event.key === 'Tab' || event.key === 'Escape')) return;
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
  if (wanted) startMusic();
});
