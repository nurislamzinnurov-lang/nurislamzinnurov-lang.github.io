(function () {
  var el = document.querySelector('[data-count]');
  if (el) {
    var target = parseInt(el.getAttribute('data-count'), 10);
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) { el.textContent = String(target); }
    else {
      var t0 = null;
      function tick(ts) {
        if (!t0) t0 = ts;
        var p = Math.min((ts - t0) / 500, 1);
        el.textContent = String(Math.round(target * (1 - Math.pow(1 - p, 3))));
        if (p < 1) requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
    }
  }
  var motionQuiet = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (motionQuiet) {
    document.querySelectorAll('video[autoplay]').forEach(function (v) {
      v.removeAttribute('autoplay'); v.pause();
    });
  }
  document.querySelectorAll('[data-reel] video').forEach(function (v) {
    var f = v.closest('figure');
    var timer = null;
    function play() {
      timer = setTimeout(function () { v.play().catch(function () {}); }, 250);
    }
    function stop() {
      if (timer) { clearTimeout(timer); timer = null; }
      v.pause();
    }
    if (f) {
      f.addEventListener('mouseenter', play);
      f.addEventListener('mouseleave', stop);
      f.addEventListener('touchstart', play, { passive: true });
      f.addEventListener('touchend', stop, { passive: true });
    }
    v.addEventListener('play', function () {
      if (f) f.classList.add('is-playing');
      document.querySelectorAll('[data-reel] video').forEach(function (o) {
        if (o !== v && !o.paused && !o.ended) o.pause();
      });
    });
    v.addEventListener('pause', function () { if (f) f.classList.remove('is-playing'); });
    v.addEventListener('ended', function () { if (f) f.classList.remove('is-playing'); });
  });

  // кнопки звука: общий painter для карточки и лайтбокса
  function paintCardSound(fig, on) {
    if (!fig) { return; }
    fig.setAttribute('data-sound', on ? 'on' : 'off');
    var b = fig.querySelector('.pf-sound');
    if (!b) { return; }
    b.classList.toggle('is-on', on);
    b.setAttribute('aria-pressed', on ? 'true' : 'false');
    b.setAttribute('aria-label', on ? 'Выключить звук' : 'Включить звук');
  }
  document.querySelectorAll('.pf-sound').forEach(function (btn) {
    var f = btn.closest('[data-reel]');
    var v = f ? f.querySelector('video') : null;
    if (!f || !v) { return; }
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      var on = v.muted;
      v.muted = !on;
      paintCardSound(f, on);
      if (on && v.paused) { v.play().catch(function () {}); }
    });
    btn.addEventListener('touchstart', function (e) { e.stopPropagation(); }, { passive: true });
    btn.addEventListener('touchend', function (e) { e.stopPropagation(); }, { passive: true });
  });

  // лайтбокс: клик по карточке открывает запись целиком, кнопка звука — правый нижний край
  var lb = null, lbVideo = null, lbCap = null, lbSound = null, lbFig = null;
  var SOUND_SVG = '<svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H2v6h4l5 4z"/><path class="pf-sound-waves" d="M15.6 8.4a5.2 5.2 0 0 1 0 7.2M18.6 5.4a9.2 9.2 0 0 1 0 13.2"/><path class="pf-sound-x" d="M16 9.5l5 5M21 9.5l-5 5"/></svg>';

  function buildLightbox() {
    lb = document.createElement('div');
    lb.className = 'pf-lightbox';
    lb.hidden = true;
    lb.innerHTML = '<button class="pf-lb-close" type="button" aria-label="Закрыть">&times;</button>' +
      '<div class="pf-lb-stage"><video class="pf-lb-video" controls playsinline preload="metadata" aria-label="Видео"></video><p class="pf-lb-cap"></p></div>' +
      '<button class="pf-lb-sound" type="button" aria-pressed="false" aria-label="Включить звук">' + SOUND_SVG + '</button>';
    document.body.appendChild(lb);
    lbVideo = lb.querySelector('.pf-lb-video');
    lbCap = lb.querySelector('.pf-lb-cap');
    lbSound = lb.querySelector('.pf-lb-sound');
    lb.addEventListener('click', function (e) {
      if (e.target === lb || (e.target.classList && e.target.classList.contains('pf-lb-close'))) closeLb();
    });
    lbSound.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      var on = lbVideo.muted;
      lbVideo.muted = !on;
      paintLbSound();
      paintCardSound(lbFig, !lbVideo.muted);
      if (on && lbVideo.paused) { lbVideo.play().catch(function () {}); }
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && lb && !lb.hidden) closeLb();
    });
  }
  function paintLbSound() {
    if (!lbSound || !lbVideo) { return; }
    var on = !lbVideo.muted;
    lbSound.classList.toggle('is-on', on);
    lbSound.setAttribute('aria-pressed', on ? 'true' : 'false');
    lbSound.setAttribute('aria-label', on ? 'Выключить звук' : 'Включить звук');
  }
  function openLb(src, label, capText, startMuted, poster) {
    if (!lb) buildLightbox();
    document.querySelectorAll('[data-reel] video').forEach(function (o) { o.pause(); });
    lbVideo.muted = !!startMuted;
    if (poster) { lbVideo.setAttribute('poster', poster); } else { lbVideo.removeAttribute('poster'); }
    lbVideo.setAttribute('src', src);
    lbVideo.setAttribute('aria-label', label || 'Видео');
    lbCap.textContent = capText || '';
    lb.hidden = false;
    paintLbSound();
    document.documentElement.classList.add('pf-lb-open');
    lbVideo.play().catch(function () {
      lbVideo.muted = true;
      paintLbSound();
      paintCardSound(lbFig, false);
      lbVideo.play().catch(function () {});
    });
  }
  function closeLb() {
    lbVideo.pause();
    lbVideo.removeAttribute('src');
    lbVideo.removeAttribute('poster');
    lbVideo.load();
    lb.hidden = true;
    document.documentElement.classList.remove('pf-lb-open');
  }
  document.querySelectorAll('[data-reel]').forEach(function (f) {
    var v = f.querySelector('video');
    var capEl = f.querySelector('.pf-cap-t');
    f.setAttribute('role', 'button');
    f.setAttribute('tabindex', '0');
    if (capEl) f.setAttribute('aria-label', 'Открыть видео: ' + capEl.textContent);
    function activate() {
      if (v) {
        lbFig = f;
        openLb(v.getAttribute('src'), v.getAttribute('aria-label'), capEl ? capEl.textContent : '',
          f.getAttribute('data-sound') === 'off', v.getAttribute('poster'));
      }
    }
    f.addEventListener('click', activate);
    f.addEventListener('keydown', function (e) {
      if (e.target && e.target.closest && e.target.closest('.pf-sound')) { return; }
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); activate(); }
    });
  });
  var btn = document.querySelector('[data-copy]');
  if (btn) {
    btn.addEventListener('click', function () {
      var url = location.origin + '/';
      function done() {
        btn.textContent = 'Скопировано';
        setTimeout(function () { btn.textContent = 'Скопировать'; }, 2000);
      }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).then(done, done);
      } else { done(); }
    });
  }
})();
