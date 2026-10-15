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

  // ---- State ----
  var watchId = null;
  var marker = null;
  var accuracyCircle = null;
  var followMe = true;
  var firstFix = true;
  var lastLatLng = null;

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

  // Stop auto-following when the user drags the map; Recenter turns it back on
  map.on('dragstart', function () {
    if (watchId !== null) followMe = false;
  });

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
        stopTracking();
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

  function startTracking() {
    if (!('geolocation' in navigator)) {
      setStatus('Unsupported', 'error');
      setMessage('This browser does not support geolocation.', true);
      return;
    }
    if (!window.isSecureContext) {
      setStatus('Error', 'error');
      setMessage('Location only works over HTTPS. Open the GitHub Pages (https://) link.', true);
      return;
    }

    followMe = true;
    firstFix = true;
    setStatus('Waiting', 'waiting');
    setMessage('Requesting location… allow access when asked.');

    // Must be called directly inside the tap handler for iOS Safari to show the prompt
    watchId = navigator.geolocation.watchPosition(onPosition, onError, {
      enableHighAccuracy: true,
      maximumAge: 0,
      timeout: 20000
    });

    startBtn.textContent = 'Stop';
    startBtn.className = 'btn stop';
  }

  function stopTracking() {
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
      watchId = null;
    }
    startBtn.textContent = 'Start';
    startBtn.className = 'btn primary';
    setStatus('Idle', 'idle');
  }

  startBtn.addEventListener('click', function () {
    if (watchId === null) startTracking();
    else { stopTracking(); setMessage('Tracking stopped.'); }
  });

  recenterBtn.addEventListener('click', function () {
    followMe = true;
    if (lastLatLng) map.setView(lastLatLng, Math.max(map.getZoom(), 17));
  });
})();
