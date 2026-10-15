(function () {
  'use strict';

  // ---- Map setup ----
  var map = L.map('map', { zoomControl: true, attributionControl: true })
    .setView([20, 0], 2);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  }).addTo(map);

  // Fix sizing after mobile browser bars show/hide or orientation change
  function fixSize() { map.invalidateSize(); }
  window.addEventListener('resize', fixSize);
  window.addEventListener('orientationchange', function () { setTimeout(fixSize, 300); });

  // ---- UI elements ----
  var startBtn = document.getElementById('startBtn');
  var recenterBtn = document.getElementById('recenterBtn');
  var latEl = document.getElementById('lat');
  var lngEl = document.getElementById('lng');
  var accEl = document.getElementById('acc');
  var statusEl = document.getElementById('status');
  var msgEl = document.getElementById('message');
  var motionMsgEl = document.getElementById('motionMessage');
  var stepsEl = document.getElementById('steps');
  var motionStatusEl = document.getElementById('motionStatus');

  // ---- State ----
  var running = false;
  var watchId = null;
  var marker = null;
  var accuracyCircle = null;
  var followMe = true;
  var firstFix = true;
  var lastLatLng = null;
  var wakeLock = null;

  var meIcon = L.divIcon({
    className: '',
    html: '<div class="me-dot"></div>',
    iconSize: [18, 18],
    iconAnchor: [9, 9]
  });

  function setStatus(text, cls) {
    statusEl.textContent = text;
    statusEl.className = 'status ' + cls;
  }

  function setMessage(text, isError) {
    msgEl.textContent = text || '';
    msgEl.className = 'message' + (isError ? ' error' : '');
  }

  function setMotionMessage(text, isError) {
    motionMsgEl.textContent = text || '';
    motionMsgEl.className = 'message' + (isError ? ' error' : '');
  }

  function setMotionStatus(text, cls) {
    motionStatusEl.textContent = text;
    motionStatusEl.className = 'motion-status' + (cls ? ' ' + cls : '');
  }

  // Stop auto-following when the user drags the map; Recenter turns it back on
  map.on('dragstart', function () {
    if (watchId !== null) followMe = false;
  });

  // =====================================================================
  // GPS
  // =====================================================================
  function onPosition(pos) {
    var lat = pos.coords.latitude;
    var lng = pos.coords.longitude;
    var acc = pos.coords.accuracy;
    var latlng = L.latLng(lat, lng);
    lastLatLng = latlng;

    latEl.textContent = lat.toFixed(6);
    lngEl.textContent = lng.toFixed(6);
    accEl.textContent = Math.round(acc) + ' m';

    if (!marker) {
      marker = L.marker(latlng, { icon: meIcon, interactive: false }).addTo(map);
      accuracyCircle = L.circle(latlng, {
        radius: acc,
        color: '#3b82f6',
        weight: 1,
        fillColor: '#3b82f6',
        fillOpacity: 0.15,
        interactive: false
      }).addTo(map);
    } else {
      marker.setLatLng(latlng);
      accuracyCircle.setLatLng(latlng);
      accuracyCircle.setRadius(acc);
    }

    if (firstFix) {
      map.setView(latlng, 17);
      firstFix = false;
    } else if (followMe) {
      map.panTo(latlng, { animate: true });
    }

    setStatus('Live', 'live');
    setMessage(acc > 50 ? 'Low accuracy — move to open sky for a better fix.' : '');
    recenterBtn.disabled = false;
  }

  function onError(err) {
    var text;
    switch (err.code) {
      case 1:
        text = 'Location permission denied. iPhone: Settings › Privacy & Security › Location Services › Safari Websites › While Using. Android: tap the lock icon in the address bar › Permissions › Location › Allow.';
        stopGps();
        setStatus('Blocked', 'error');
        break;
      case 2:
        text = 'Position unavailable. Turn on Location/GPS on your phone and try again.';
        setStatus('No signal', 'error');
        break;
      case 3:
        text = 'Still waiting for a GPS fix…';
        setStatus('Waiting', 'waiting');
        break;
      default:
        text = 'Location error: ' + err.message;
        setStatus('Error', 'error');
    }
    setMessage(text, err.code !== 3);
  }

  function startGps() {
    if (!('geolocation' in navigator)) {
      setStatus('Unsupported', 'error');
      setMessage('This browser does not support geolocation.', true);
      return;
    }
    followMe = true;
    firstFix = true;
    setStatus('Waiting', 'waiting');
    setMessage('Requesting location… allow access when asked.');

    watchId = navigator.geolocation.watchPosition(onPosition, onError, {
      enableHighAccuracy: true,
      maximumAge: 0,
      timeout: 20000
    });
  }

  function stopGps() {
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
      watchId = null;
    }
  }

  // =====================================================================
  // Step counter (accelerometer)
  // =====================================================================
  // Method: take the total acceleration magnitude (works in any phone
  // orientation), subtract a slowly-updated gravity estimate, smooth it,
  // then count a step on each peak that rises above a threshold, with
  // hysteresis and a minimum gap between steps to reject jitter.
  var steps = 0;
  var motionActive = false;
  var motionSeen = false;
  var motionCheckTimer = null;

  var gravity = null;        // running estimate of gravity magnitude (m/s²)
  var smooth = 0;            // smoothed dynamic acceleration
  var armed = true;          // ready to detect the next peak
  var lastStepTime = 0;

  var STEP_THRESHOLD = 1.2;  // m/s² above gravity to count a step
  var RESET_LEVEL = 0.3;     // must fall below this before the next step
  var MIN_STEP_GAP = 280;    // ms  (max ~3.5 steps per second)

  function renderSteps(bump) {
    stepsEl.textContent = steps.toLocaleString();
    if (bump) {
      stepsEl.classList.remove('bump');
      void stepsEl.offsetWidth; // restart animation
      stepsEl.classList.add('bump');
    }
  }

  function onMotion(e) {
    var a = e.accelerationIncludingGravity;
    if (!a || a.x === null || a.y === null || a.z === null) return;

    if (!motionSeen) {
      motionSeen = true;
      setMotionStatus('Counting', 'on');
      setMotionMessage('');
    }

    var mag = Math.sqrt(a.x * a.x + a.y * a.y + a.z * a.z);

    if (gravity === null) { gravity = mag; return; }
    gravity = gravity * 0.97 + mag * 0.03;   // slow low-pass = gravity
    var dynamic = mag - gravity;
    smooth = smooth * 0.6 + dynamic * 0.4;    // fast low-pass = remove noise

    var now = Date.now();
    if (armed && smooth > STEP_THRESHOLD && now - lastStepTime > MIN_STEP_GAP) {
      steps++;
      lastStepTime = now;
      armed = false;
      renderSteps(true);
    } else if (!armed && smooth < RESET_LEVEL) {
      armed = true;
    }
  }

  function attachMotion() {
    window.addEventListener('devicemotion', onMotion);
    motionActive = true;
    setMotionStatus('Starting…');

    // If no sensor data arrives, tell the user
    clearTimeout(motionCheckTimer);
    motionCheckTimer = setTimeout(function () {
      if (motionActive && !motionSeen) {
        setMotionStatus('No sensor', 'off-err');
        setMotionMessage('No motion data received. This device or browser may not have an accelerometer, or motion access is blocked.', true);
      }
    }, 3000);
  }

  function stopMotion() {
    window.removeEventListener('devicemotion', onMotion);
    clearTimeout(motionCheckTimer);
    motionActive = false;
    setMotionStatus('Motion off');
  }

  // Must be called synchronously inside the tap handler (iOS rule).
  function startMotion() {
    steps = 0;
    gravity = null;
    smooth = 0;
    armed = true;
    lastStepTime = 0;
    motionSeen = false;
    renderSteps(false);

    if (typeof window.DeviceMotionEvent === 'undefined') {
      setMotionStatus('Unsupported', 'off-err');
      setMotionMessage('Motion sensors are not supported in this browser.', true);
      return;
    }

    // iPhone / iPad (iOS 13+): explicit permission, only on a user tap
    if (typeof DeviceMotionEvent.requestPermission === 'function') {
      setMotionStatus('Asking…');
      DeviceMotionEvent.requestPermission()
        .then(function (state) {
          if (!running) return;
          if (state === 'granted') {
            attachMotion();
          } else {
            setMotionStatus('Blocked', 'off-err');
            setMotionMessage('Motion access denied. Close and reopen Safari on this page, tap Start and choose Allow.', true);
          }
        })
        .catch(function (err) {
          setMotionStatus('Error', 'off-err');
          setMotionMessage('Could not get motion access: ' + (err && err.message ? err.message : err), true);
        });
    } else {
      // Android and others: no prompt needed
      attachMotion();
    }
  }

  // =====================================================================
  // Keep the screen awake while running (where supported)
  // =====================================================================
  function requestWakeLock() {
    if (!('wakeLock' in navigator)) return;
    navigator.wakeLock.request('screen')
      .then(function (lock) { wakeLock = lock; })
      .catch(function () { /* not critical */ });
  }

  function releaseWakeLock() {
    if (wakeLock) {
      wakeLock.release().catch(function () {});
      wakeLock = null;
    }
  }

  document.addEventListener('visibilitychange', function () {
    if (running && document.visibilityState === 'visible') requestWakeLock();
  });

  // =====================================================================
  // Start / Stop
  // =====================================================================
  function startAll() {
    if (!window.isSecureContext) {
      setStatus('Error', 'error');
      setMessage('Location and motion only work over HTTPS. Open the GitHub Pages (https://) link.', true);
      return;
    }

    running = true;
    startBtn.textContent = 'Stop';
    startBtn.className = 'btn stop';

    // Both permission requests start inside this same tap
    startMotion();
    startGps();
    requestWakeLock();
  }

  function stopAll() {
    running = false;
    stopGps();
    stopMotion();
    releaseWakeLock();
    startBtn.textContent = 'Start';
    startBtn.className = 'btn primary';
    setStatus('Idle', 'idle');
  }

  startBtn.addEventListener('click', function () {
    if (!running) {
      startAll();
    } else {
      stopAll();
      setMessage('Tracking stopped.');
      setMotionMessage('');
    }
  });

  recenterBtn.addEventListener('click', function () {
    followMe = true;
    if (lastLatLng) map.setView(lastLatLng, Math.max(map.getZoom(), 17));
  });
})();
