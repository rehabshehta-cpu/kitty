/**
 * Kitty Learn — Parent Control Lock
 * Timer, PIN, pause/resume, smart toasts, parent dashboard.
 */
(function () {
  "use strict";

  var SETTINGS_KEY = "kittyLearn_parentLock_v1";
  var SESSION_KEY = "kittyLearn_parentSession_v1";
  var VERIFY_KEY = "kittyLearn_parentVerified";

  var PLAY_TIMES = [1, 15, 30, 45, 60];
  var tickInterval = null;
  var dashboardInterval = null;
  var toastTimer = null;
  var lockDelayTimer = null;
  var els = {};

  function defaultSession() {
    return {
      sessionEndAt: null,
      isLocked: false,
      isPaused: false,
      pausedRemainingMs: null,
      sessionStartAt: null,
      sessionDurationMs: null,
      notified5: false,
      notified1: false,
      notifiedOver: false,
    };
  }

  function defaultSettings() {
    return { enabled: false, pinHash: "", playTimeMinutes: 30 };
  }

  function loadSettings() {
    try {
      var raw = localStorage.getItem(SETTINGS_KEY);
      if (!raw) return defaultSettings();
      return Object.assign(defaultSettings(), JSON.parse(raw));
    } catch (e) {
      return defaultSettings();
    }
  }

  function saveSettingsObj(s) {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
  }

  function loadSession() {
    try {
      var raw = localStorage.getItem(SESSION_KEY);
      if (!raw) return defaultSession();
      return Object.assign(defaultSession(), JSON.parse(raw));
    } catch (e) {
      return defaultSession();
    }
  }

  function saveSessionObj(sess) {
    localStorage.setItem(SESSION_KEY, JSON.stringify(Object.assign(defaultSession(), sess)));
  }

  function hashPin(pin) {
    var h = 5381;
    for (var i = 0; i < pin.length; i++) h = (h * 33) ^ pin.charCodeAt(i);
    return String(h >>> 0);
  }

  function verifyPin(pin) {
    return hashPin(pin) === loadSettings().pinHash;
  }

  function playSound(name) {
    if (window.KittyLearn && KittyLearn.playSound) KittyLearn.playSound(name);
  }

  function getRemainingSeconds() {
    var sess = loadSession();
    if (sess.isPaused && sess.pausedRemainingMs != null) {
      return Math.max(0, Math.ceil(sess.pausedRemainingMs / 1000));
    }
    if (!sess.sessionEndAt) return 0;
    return Math.max(0, Math.ceil((sess.sessionEndAt - Date.now()) / 1000));
  }

  function formatTime(secs) {
    var m = Math.floor(secs / 60);
    var s = secs % 60;
    return (m < 10 ? "0" : "") + m + ":" + (s < 10 ? "0" : "") + s + " left";
  }

  function formatClockTime(ts) {
    if (!ts) return "—";
    try {
      return new Date(ts).toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });
    } catch (e) {
      return "—";
    }
  }

  function getSessionStatus() {
    var sess = loadSession();
    if (sess.isLocked) return "locked";
    if (sess.isPaused && sess.pausedRemainingMs > 0) return "paused";
    if (sess.sessionEndAt && sess.sessionEndAt > Date.now()) return "active";
    return "idle";
  }

  function hasActiveSession() {
    var s = getSessionStatus();
    return s === "active" || s === "paused";
  }

  function isSessionRunning() {
    var sess = loadSession();
    return !!(sess.sessionEndAt && sess.sessionEndAt > Date.now() && !sess.isLocked && !sess.isPaused);
  }

  function getSessionStats() {
    var sess = loadSession();
    var settings = loadSettings();
    var totalMs = sess.sessionDurationMs || settings.playTimeMinutes * 60 * 1000;
    var remainingSec = getRemainingSeconds();
    var usedMs = Math.max(0, totalMs - remainingSec * 1000);
    return {
      usedMinutes: Math.floor(usedMs / 60000),
      remainingSeconds: remainingSec,
      totalMinutes: Math.round(totalMs / 60000),
    };
  }

  function resetNotificationFlags(sess) {
    sess.notified5 = false;
    sess.notified1 = false;
    sess.notifiedOver = false;
    return sess;
  }

  function startSession() {
    var settings = loadSettings();
    if (!settings.enabled || loadSession().isLocked) return;

    var durationMs = settings.playTimeMinutes * 60 * 1000;
    var sess = loadSession();
    sess.sessionStartAt = Date.now();
    sess.sessionDurationMs = durationMs;
    sess.sessionEndAt = sess.sessionStartAt + durationMs;
    sess.isLocked = false;
    sess.isPaused = false;
    sess.pausedRemainingMs = null;
    resetNotificationFlags(sess);
    saveSessionObj(sess);

    applyLockState(false);
    hideLockOverlay();
    hideToast();
    if (lockDelayTimer) {
      clearTimeout(lockDelayTimer);
      lockDelayTimer = null;
    }
    startTick();
    updateSessionControls();
    updateDashboard();
  }

  function clearSession() {
    stopTick();
    if (lockDelayTimer) {
      clearTimeout(lockDelayTimer);
      lockDelayTimer = null;
    }
    hideToast();
    saveSessionObj(defaultSession());
    applyLockState(false);
    hideLockOverlay();
    updateBadge(0);
    updateSessionControls();
    updateDashboard();
  }

  function pauseSession() {
    var sess = loadSession();
    if (!isSessionRunning()) return;
    sess.pausedRemainingMs = Math.max(0, sess.sessionEndAt - Date.now());
    sess.isPaused = true;
    sess.sessionEndAt = null;
    saveSessionObj(sess);
    stopTick();
    updateBadge(0);
    updateSessionControls();
    updateDashboard();
    playSound("tap");
  }

  function resumeSession() {
    var sess = loadSession();
    if (!sess.isPaused || sess.pausedRemainingMs == null || sess.isLocked) return;
    sess.sessionEndAt = Date.now() + sess.pausedRemainingMs;
    sess.isPaused = false;
    sess.pausedRemainingMs = null;
    saveSessionObj(sess);
    startTick();
    updateSessionControls();
    updateDashboard();
    playSound("ok");
  }

  function lockApp() {
    var sess = loadSession();
    sess.isLocked = true;
    sess.isPaused = false;
    saveSessionObj(sess);
    stopTick();
    hideToast();
    applyLockState(true);
    showLockOverlay();
    updateBadge(0);
    updateSessionControls();
    updateDashboard();
  }

  function unlockApp() {
    saveSessionObj(defaultSession());
    applyLockState(false);
    hideLockOverlay();
    stopTick();
    hideToast();
    if (lockDelayTimer) {
      clearTimeout(lockDelayTimer);
      lockDelayTimer = null;
    }
    updateBadge(0);
    updateSessionControls();
    updateDashboard();
  }

  function checkNotifications(remaining, sess) {
    if (sess.isPaused || sess.isLocked || !sess.sessionEndAt) return sess;
    if (remaining <= 300 && remaining > 60 && !sess.notified5) {
      sess.notified5 = true;
      showToast("5 minutes left ⏳", "warning", 4000);
      playSound("tap");
    }
    if (remaining <= 60 && remaining > 0 && !sess.notified1) {
      sess.notified1 = true;
      showToast("1 minute left ⚠️", "urgent", 4500);
      playSound("wrong");
    }
    return sess;
  }

  function triggerTimeUp(sess) {
    if (sess.notifiedOver) {
      lockApp();
      return;
    }
    sess.notifiedOver = true;
    saveSessionObj(sess);
    stopTick();
    showToast("Time is over 😴", "final", 0);
    playSound("wrong");
    lockDelayTimer = setTimeout(function () {
      lockDelayTimer = null;
      hideToast();
      lockApp();
    }, 3500);
  }

  function tick() {
    if (!loadSettings().enabled) return;
    var sess = loadSession();
    if (sess.isLocked || sess.isPaused) {
      updateBadge(0);
      updateDashboard();
      return;
    }

    var remaining = getRemainingSeconds();
    sess = checkNotifications(remaining, sess);
    if (sess.notified5 || sess.notified1) saveSessionObj(sess);

    updateBadge(remaining);
    updateDashboard();

    if (remaining <= 0 && sess.sessionEndAt && !sess.notifiedOver) {
      triggerTimeUp(sess);
    }
  }

  function startTick() {
    stopTick();
    tick();
    tickInterval = setInterval(tick, 1000);
  }

  function stopTick() {
    if (tickInterval) {
      clearInterval(tickInterval);
      tickInterval = null;
    }
  }

  function updateBadge(secs) {
    if (!els.badge || !els.badgeText) return;
    var settings = loadSettings();
    var sess = loadSession();
    if (!settings.enabled) {
      els.badge.hidden = true;
      return;
    }
    if (sess.isPaused && sess.pausedRemainingMs > 0) {
      els.badge.hidden = false;
      els.badgeText.textContent = "Paused ⏸";
      els.badge.classList.add("is-paused");
      els.badge.classList.remove("is-low");
      return;
    }
    els.badge.classList.remove("is-paused");
    var running = sess.sessionEndAt && sess.sessionEndAt > Date.now() && !sess.isLocked;
    if (!running) {
      els.badge.hidden = true;
      return;
    }
    els.badge.hidden = false;
    els.badgeText.textContent = formatTime(secs);
    els.badge.classList.toggle("is-low", secs > 0 && secs <= 120);
  }

  function ensureToastHost() {
    if (els.toastHost) return els.toastHost;
    var host = document.createElement("div");
    host.id = "parent-toast-host";
    host.className = "parent-toast-host";
    host.setAttribute("aria-live", "polite");
    document.body.appendChild(host);
    els.toastHost = host;
    return host;
  }

  function hideToast() {
    if (toastTimer) {
      clearTimeout(toastTimer);
      toastTimer = null;
    }
    if (!els.toastEl) return;
    els.toastEl.classList.remove("is-visible");
    els.toastEl.classList.add("is-hiding");
    var el = els.toastEl;
    setTimeout(function () {
      if (el.parentNode) el.parentNode.removeChild(el);
      if (els.toastEl === el) els.toastEl = null;
    }, 350);
  }

  function showToast(message, type, durationMs) {
    hideToast();
    var host = ensureToastHost();
    var toast = document.createElement("div");
    toast.className = "parent-toast parent-toast--" + (type || "info");
    toast.textContent = message;
    host.appendChild(toast);
    els.toastEl = toast;
    requestAnimationFrame(function () {
      toast.classList.add("is-visible");
    });
    if (durationMs && durationMs > 0) toastTimer = setTimeout(hideToast, durationMs);
  }

  function updateDashboard() {
    var dash = document.getElementById("parent-dashboard");
    if (!dash) return;
    var settings = loadSettings();
    var toggle = document.getElementById("parent-lock-enabled");
    var enabled = toggle ? toggle.checked : settings.enabled;
    dash.hidden = !enabled;
    if (!enabled) return;

    var sess = loadSession();
    var stats = getSessionStats();
    var status = getSessionStatus();
    var dot = document.getElementById("parent-status-dot");
    var label = document.getElementById("parent-status-label");
    var usedEl = document.getElementById("parent-dash-used");
    var remainEl = document.getElementById("parent-dash-remaining");
    var startedEl = document.getElementById("parent-dash-started");

    if (dot) dot.className = "parent-status-dot parent-status-dot--" + status;
    if (label) {
      var labels = { active: "Active", paused: "Paused", locked: "Locked", idle: "Idle" };
      label.textContent = labels[status] || "Idle";
    }
    if (usedEl) usedEl.textContent = (hasActiveSession() || sess.sessionStartAt ? stats.usedMinutes : 0) + " min";
    if (remainEl) {
      if (status === "active" || status === "paused") {
        remainEl.textContent = formatTime(stats.remainingSeconds).replace(" left", "");
      } else if (status === "locked") {
        remainEl.textContent = "0:00";
      } else {
        remainEl.textContent = "—";
      }
    }
    if (startedEl) startedEl.textContent = sess.sessionStartAt ? formatClockTime(sess.sessionStartAt) : "—";
  }

  function startDashboardRefresh() {
    stopDashboardRefresh();
    updateDashboard();
    dashboardInterval = setInterval(updateDashboard, 1000);
  }

  function stopDashboardRefresh() {
    if (dashboardInterval) {
      clearInterval(dashboardInterval);
      dashboardInterval = null;
    }
  }

  function updateSessionControls(enabledOverride) {
    var section = document.getElementById("parent-session-section");
    var statusEl = document.getElementById("parent-session-status");
    var startBtn = document.getElementById("parent-start-session");
    var pauseBtn = document.getElementById("parent-pause-session");
    var resumeBtn = document.getElementById("parent-resume-session");
    if (!section || !statusEl || !startBtn) return;

    var toggle = document.getElementById("parent-lock-enabled");
    var enabled = enabledOverride != null ? enabledOverride : toggle ? toggle.checked : loadSettings().enabled;
    section.hidden = !enabled;
    var dash = document.getElementById("parent-dashboard");
    if (dash) dash.hidden = !enabled;
    if (!enabled) return;

    var sess = loadSession();
    var status = getSessionStatus();
    if (pauseBtn) pauseBtn.hidden = status !== "active";
    if (resumeBtn) resumeBtn.hidden = status !== "paused";

    if (sess.isLocked) {
      statusEl.textContent = "Session ended. Unlock the app, then start a new session.";
      startBtn.textContent = "▶ Start Session";
      startBtn.disabled = true;
      if (pauseBtn) pauseBtn.hidden = true;
      if (resumeBtn) resumeBtn.hidden = true;
      updateDashboard();
      return;
    }

    startBtn.disabled = false;
    if (status === "active") {
      statusEl.textContent = "Active session — " + formatTime(getRemainingSeconds());
      startBtn.textContent = "↻ Restart Session";
    } else if (status === "paused") {
      statusEl.textContent = "Paused — " + formatTime(getRemainingSeconds()) + " saved";
      startBtn.textContent = "↻ Restart Session";
    } else {
      statusEl.textContent = "No active session. Tap Start when your child begins playing.";
      startBtn.textContent = "▶ Start Session";
    }
    updateDashboard();
  }

  function applyLockState(locked) {
    document.body.classList.toggle("parent-locked", locked);
  }

  function readPinFromRow(row) {
    if (!row) return "";
    var pin = "";
    row.querySelectorAll(".parent-pin-digit").forEach(function (inp) {
      pin += inp.value;
    });
    return pin;
  }

  function clearPinRow(row) {
    if (!row) return;
    row.querySelectorAll(".parent-pin-digit").forEach(function (inp) {
      inp.value = "";
    });
    row.classList.remove("is-error");
  }

  function bindPinRow(row) {
    if (!row) return;
    var inputs = row.querySelectorAll(".parent-pin-digit");
    inputs.forEach(function (inp, idx) {
      inp.addEventListener("input", function () {
        inp.value = inp.value.replace(/\D/g, "").slice(-1);
        row.classList.remove("is-error");
        if (inp.value && idx < inputs.length - 1) inputs[idx + 1].focus();
      });
      inp.addEventListener("keydown", function (e) {
        if (e.key === "Backspace" && !inp.value && idx > 0) inputs[idx - 1].focus();
        if (e.key === "Enter") {
          if (row.id === "parent-unlock-pin-row") tryUnlock();
          else if (row.id === "parent-verify-pin-row") tryVerify();
        }
      });
      inp.addEventListener("paste", function (e) {
        e.preventDefault();
        var pasted = (e.clipboardData.getData("text") || "").replace(/\D/g, "").slice(0, 4);
        for (var i = 0; i < pasted.length && i < inputs.length; i++) inputs[i].value = pasted[i];
        if (pasted.length === 4) inputs[inputs.length - 1].focus();
      });
    });
  }

  function buildPinRowHTML(id) {
    var digits = "";
    for (var d = 1; d <= 4; d++) {
      digits +=
        '<input class="parent-pin-digit" type="password" inputmode="numeric" maxlength="1" ' +
        'autocomplete="off" aria-label="PIN digit ' +
        d +
        '">';
    }
    return '<div class="parent-pin-row" id="' + id + '">' + digits + "</div>";
  }

  function buildDashboardHTML() {
    return (
      '<div class="parent-dashboard" id="parent-dashboard" hidden>' +
      '<h3 class="parent-dashboard-title">Session Dashboard</h3>' +
      '<div class="parent-dashboard-status">' +
      '<span class="parent-status-dot parent-status-dot--idle" id="parent-status-dot"></span>' +
      '<span id="parent-status-label">Idle</span></div>' +
      '<div class="parent-dashboard-grid">' +
      '<div class="parent-dash-stat"><span class="parent-dash-label">Time used</span>' +
      '<strong id="parent-dash-used">0 min</strong></div>' +
      '<div class="parent-dash-stat"><span class="parent-dash-label">Remaining</span>' +
      '<strong id="parent-dash-remaining">—</strong></div>' +
      '<div class="parent-dash-stat parent-dash-stat-wide">' +
      '<span class="parent-dash-label">Last session start</span>' +
      '<strong id="parent-dash-started">—</strong></div></div></div>'
    );
  }

  function buildSettingsHTML() {
    var timeOptions = PLAY_TIMES.map(function (m) {
      var checked = m === 30 ? " checked" : "";
      return (
        '<label class="parent-time-option"><input type="radio" name="parent-play-time" value="' +
        m +
        '"' +
        checked +
        "><span>" +
        m +
        " min</span></label>"
      );
    }).join("");

    return (
      '<div class="parent-settings-panel" role="dialog" aria-modal="true" aria-labelledby="parent-settings-title">' +
      '<div id="parent-verify-view" hidden><h2>Parent access</h2>' +
      '<p class="parent-settings-kicker">Enter your 4-digit PIN</p>' +
      buildPinRowHTML("parent-verify-pin-row") +
      '<p class="parent-form-msg" id="parent-verify-msg"></p>' +
      '<div class="parent-settings-actions">' +
      '<button type="button" class="btn btn-primary" id="parent-verify-btn">Continue</button>' +
      '<button type="button" class="btn btn-secondary" id="parent-verify-cancel">Cancel</button>' +
      "</div></div>" +
      '<div id="parent-settings-view">' +
      '<h2 id="parent-settings-title">🛡️ Parent Settings</h2>' +
      '<p class="parent-settings-kicker">Set play time &amp; PIN for Kitty Learn</p>' +
      '<div class="parent-toggle-row"><strong>Screen time lock</strong>' +
      '<label class="parent-toggle-switch"><input type="checkbox" id="parent-lock-enabled">' +
      '<span class="parent-toggle-slider"></span></label></div>' +
      buildDashboardHTML() +
      '<div class="parent-session-section" id="parent-session-section" hidden>' +
      '<p class="parent-session-status" id="parent-session-status">No active session</p>' +
      '<div class="parent-session-actions">' +
      '<button type="button" class="btn btn-primary parent-start-session-btn" id="parent-start-session">▶ Start Session</button>' +
      '<button type="button" class="btn btn-secondary parent-pause-btn" id="parent-pause-session" hidden>⏸ Pause</button>' +
      '<button type="button" class="btn btn-secondary parent-resume-btn" id="parent-resume-session" hidden>▶ Resume</button>' +
      "</div></div>" +
      '<label class="parent-field-label">Daily play time</label>' +
      '<div class="parent-time-options">' +
      timeOptions +
      "</div>" +
      '<div class="parent-pin-group"><label class="parent-field-label">Create 4-digit Parent PIN</label>' +
      buildPinRowHTML("parent-settings-pin-row") +
      "</div>" +
      '<div class="parent-pin-group"><label class="parent-field-label">Confirm PIN</label>' +
      buildPinRowHTML("parent-settings-pin-confirm-row") +
      "</div>" +
      '<p class="parent-form-msg" id="parent-settings-msg"></p>' +
      '<div class="parent-settings-actions">' +
      '<button type="button" class="btn btn-primary" id="parent-save-settings">Save</button>' +
      '<button type="button" class="btn btn-secondary" id="parent-settings-cancel">Cancel</button>' +
      "</div></div></div>"
    );
  }

  function buildLockOverlayHTML() {
    return (
      '<div class="parent-lock-stars" aria-hidden="true"></div>' +
      '<div class="parent-sleep-kitty" aria-hidden="true">' +
      '<span class="parent-zzz">z</span><span class="parent-zzz">Z</span><span class="parent-zzz">Z</span>' +
      '<svg viewBox="0 0 220 200" xmlns="http://www.w3.org/2000/svg">' +
      '<ellipse cx="110" cy="130" rx="72" ry="58" fill="#FFE5CC"/>' +
      '<path d="M52 95 Q42 50 58 44 Q72 38 88 72" fill="#FFB896"/>' +
      '<path d="M168 95 Q178 50 162 44 Q148 38 132 72" fill="#FFB896"/>' +
      '<path d="M78 118 Q82 108 92 118" stroke="#3D3558" stroke-width="5" fill="none" stroke-linecap="round"/>' +
      '<path d="M128 118 Q132 108 142 118" stroke="#3D3558" stroke-width="5" fill="none" stroke-linecap="round"/>' +
      '<ellipse cx="110" cy="148" rx="14" ry="8" fill="#FF8FAB" opacity="0.7"/>' +
      "</svg></div>" +
      '<h2 class="parent-lock-title">Time to rest 😴</h2>' +
      '<p class="parent-lock-sub">Ask your parent to unlock Kitty Learn</p>' +
      '<div class="parent-unlock-box"><label class="parent-field-label">Parent PIN</label>' +
      buildPinRowHTML("parent-unlock-pin-row") +
      '<p class="parent-unlock-msg" id="parent-unlock-msg"></p>' +
      '<button type="button" class="btn btn-primary" id="parent-unlock-btn">Unlock</button></div>'
    );
  }

  function injectLockStars() {
    var layer = els.lockOverlay && els.lockOverlay.querySelector(".parent-lock-stars");
    if (!layer) return;
    for (var i = 0; i < 24; i++) {
      var s = document.createElement("span");
      s.style.left = Math.random() * 100 + "%";
      s.style.top = Math.random() * 100 + "%";
      s.style.animationDelay = Math.random() * 3 + "s";
      layer.appendChild(s);
    }
  }

  function injectUI() {
    var badge = document.createElement("div");
    badge.id = "parent-timer-badge";
    badge.className = "parent-timer-badge";
    badge.hidden = true;
    badge.setAttribute("aria-live", "polite");
    badge.innerHTML = '⏳ <span id="parent-timer-text">30:00 left</span>';
    document.body.appendChild(badge);
    ensureToastHost();

    var headerActions = document.querySelector(".header-actions");
    if (headerActions && !document.getElementById("parent-settings-btn")) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.id = "parent-settings-btn";
      btn.className = "icon-btn parent-settings-btn";
      btn.setAttribute("aria-label", "Parent settings");
      btn.title = "Parent settings";
      btn.textContent = "🛡️";
      headerActions.insertBefore(btn, headerActions.firstChild);
    }

    var settingsBackdrop = document.createElement("div");
    settingsBackdrop.id = "parent-settings-backdrop";
    settingsBackdrop.className = "parent-modal-backdrop";
    settingsBackdrop.hidden = true;
    settingsBackdrop.innerHTML = buildSettingsHTML();
    document.body.appendChild(settingsBackdrop);

    var overlay = document.createElement("div");
    overlay.id = "parent-lock-overlay";
    overlay.className = "parent-lock-overlay";
    overlay.hidden = true;
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.innerHTML = buildLockOverlayHTML();
    document.body.appendChild(overlay);

    els.badge = badge;
    els.badgeText = document.getElementById("parent-timer-text");
    els.settingsBackdrop = settingsBackdrop;
    els.lockOverlay = overlay;
    els.settingsView = document.getElementById("parent-settings-view");
    els.verifyView = document.getElementById("parent-verify-view");
    els.unlockPinRow = document.getElementById("parent-unlock-pin-row");
    els.verifyPinRow = document.getElementById("parent-verify-pin-row");
    els.settingsPinRow = document.getElementById("parent-settings-pin-row");
    els.settingsPinConfirmRow = document.getElementById("parent-settings-pin-confirm-row");

    bindPinRow(els.unlockPinRow);
    bindPinRow(els.verifyPinRow);
    bindPinRow(els.settingsPinRow);
    bindPinRow(els.settingsPinConfirmRow);
    injectLockStars();
  }

  function populateSettingsForm(settings) {
    document.getElementById("parent-lock-enabled").checked = settings.enabled;
    document.querySelectorAll('input[name="parent-play-time"]').forEach(function (r) {
      r.checked = Number(r.value) === settings.playTimeMinutes;
    });
    updateSessionControls();
  }

  function openSettings() {
    var settings = loadSettings();
    var hasPin = !!settings.pinHash;
    if (hasPin && sessionStorage.getItem(VERIFY_KEY) !== "1") {
      els.verifyView.hidden = false;
      els.settingsView.hidden = true;
      clearPinRow(els.verifyPinRow);
      document.getElementById("parent-verify-msg").textContent = "";
    } else {
      els.verifyView.hidden = true;
      els.settingsView.hidden = false;
      populateSettingsForm(settings);
      startDashboardRefresh();
    }
    els.settingsBackdrop.hidden = false;
  }

  function onLockToggleChange() {
    var toggle = document.getElementById("parent-lock-enabled");
    updateSessionControls(toggle ? toggle.checked : loadSettings().enabled);
  }

  function closeSettings() {
    stopDashboardRefresh();
    els.settingsBackdrop.hidden = true;
    clearPinRow(els.settingsPinRow);
    clearPinRow(els.settingsPinConfirmRow);
    clearPinRow(els.verifyPinRow);
    document.getElementById("parent-settings-msg").textContent = "";
  }

  function showLockOverlay() {
    els.lockOverlay.hidden = false;
    clearPinRow(els.unlockPinRow);
    document.getElementById("parent-unlock-msg").textContent = "";
    var first = els.unlockPinRow.querySelector(".parent-pin-digit");
    if (first) first.focus();
  }

  function hideLockOverlay() {
    els.lockOverlay.hidden = true;
  }

  function saveSettingsForm() {
    var msg = document.getElementById("parent-settings-msg");
    msg.textContent = "";
    msg.className = "parent-form-msg";
    var enabled = document.getElementById("parent-lock-enabled").checked;
    var timeRadio = document.querySelector('input[name="parent-play-time"]:checked');
    var playTime = timeRadio ? Number(timeRadio.value) : 30;
    var pin = readPinFromRow(els.settingsPinRow);
    var pinConfirm = readPinFromRow(els.settingsPinConfirmRow);
    var current = loadSettings();

    if (pin || pinConfirm || !current.pinHash) {
      if (pin.length !== 4 || pinConfirm.length !== 4) {
        msg.textContent = "Please enter a 4-digit PIN.";
        els.settingsPinRow.classList.add("is-error");
        return;
      }
      if (pin !== pinConfirm) {
        msg.textContent = "PINs do not match.";
        els.settingsPinConfirmRow.classList.add("is-error");
        return;
      }
      current.pinHash = hashPin(pin);
    }
    if (enabled && !current.pinHash) {
      msg.textContent = "Create a PIN before enabling lock.";
      return;
    }

    current.enabled = enabled;
    current.playTimeMinutes = playTime;
    saveSettingsObj(current);
    if (enabled) updateSessionControls();
    else clearSession();

    msg.textContent = enabled
      ? "Settings saved! Tap Start Session when your child is ready."
      : "Settings saved!";
    msg.className = "parent-form-msg is-ok";
    playSound("ok");
    setTimeout(closeSettings, 900);
  }

  function handleStartSession() {
    if (!loadSettings().enabled) return;
    if (loadSession().isLocked) {
      var msg = document.getElementById("parent-settings-msg");
      msg.textContent = "Unlock the app first, then start a session.";
      msg.className = "parent-form-msg";
      return;
    }
    startSession();
    var msgEl = document.getElementById("parent-settings-msg");
    msgEl.textContent = "Session started!";
    msgEl.className = "parent-form-msg is-ok";
    playSound("ok");
  }

  function tryUnlock() {
    var pin = readPinFromRow(els.unlockPinRow);
    var msgEl = document.getElementById("parent-unlock-msg");
    msgEl.textContent = "";
    msgEl.className = "parent-unlock-msg";
    if (pin.length !== 4) {
      msgEl.textContent = "Enter all 4 digits.";
      els.unlockPinRow.classList.add("is-error");
      return;
    }
    if (!verifyPin(pin)) {
      msgEl.textContent = "Wrong PIN — try again.";
      els.unlockPinRow.classList.add("is-error");
      playSound("wrong");
      clearPinRow(els.unlockPinRow);
      els.unlockPinRow.querySelector(".parent-pin-digit").focus();
      return;
    }
    playSound("win");
    unlockApp();
  }

  function tryVerify() {
    var pin = readPinFromRow(els.verifyPinRow);
    var msgEl = document.getElementById("parent-verify-msg");
    if (pin.length !== 4 || !verifyPin(pin)) {
      msgEl.textContent = "Wrong PIN.";
      els.verifyPinRow.classList.add("is-error");
      playSound("wrong");
      clearPinRow(els.verifyPinRow);
      return;
    }
    sessionStorage.setItem(VERIFY_KEY, "1");
    els.verifyView.hidden = true;
    els.settingsView.hidden = false;
    populateSettingsForm(loadSettings());
    startDashboardRefresh();
    playSound("ok");
  }

  function bindEvents() {
    var settingsBtn = document.getElementById("parent-settings-btn");
    if (settingsBtn) {
      settingsBtn.addEventListener("click", function () {
        playSound("tap");
        openSettings();
      });
    }
    document.getElementById("parent-save-settings").addEventListener("click", saveSettingsForm);
    document.getElementById("parent-start-session").addEventListener("click", handleStartSession);
    document.getElementById("parent-pause-session").addEventListener("click", pauseSession);
    document.getElementById("parent-resume-session").addEventListener("click", resumeSession);
    document.getElementById("parent-settings-cancel").addEventListener("click", closeSettings);
    document.getElementById("parent-verify-btn").addEventListener("click", tryVerify);
    document.getElementById("parent-verify-cancel").addEventListener("click", closeSettings);
    document.getElementById("parent-unlock-btn").addEventListener("click", tryUnlock);
    document.getElementById("parent-lock-enabled").addEventListener("change", onLockToggleChange);
    els.settingsBackdrop.addEventListener("click", function (e) {
      if (e.target === els.settingsBackdrop) closeSettings();
    });
  }

  function init() {
    injectUI();
    bindEvents();
    var settings = loadSettings();
    var sess = loadSession();
    if (!settings.enabled) {
      stopTick();
      updateBadge(0);
      return;
    }
    if (sess.isPaused && sess.pausedRemainingMs > 0) {
      stopTick();
      updateBadge(0);
      return;
    }
    if (sess.isLocked) {
      lockApp();
      return;
    }
    if (sess.sessionEndAt && sess.sessionEndAt <= Date.now()) {
      if (!sess.notifiedOver) triggerTimeUp(sess);
      else lockApp();
      return;
    }
    if (sess.sessionEndAt && sess.sessionEndAt > Date.now()) startTick();
    else {
      stopTick();
      updateBadge(0);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  window.KittyParentLock = {
    getSettings: loadSettings,
    getSessionStatus: getSessionStatus,
    isLocked: function () {
      return loadSession().isLocked;
    },
    isPaused: function () {
      return loadSession().isPaused;
    },
    hasActiveSession: hasActiveSession,
    getRemainingSeconds: getRemainingSeconds,
    startSession: startSession,
    pauseSession: pauseSession,
    resumeSession: resumeSession,
  };
})();
