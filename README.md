# Route Lab

A lightweight mobile web app that shows a full-screen map and follows your live GPS location. Built with plain HTML, CSS and JavaScript — no build step, no frameworks — and ready to host on GitHub Pages.

## Features

- Full-screen map using [Leaflet](https://leafletjs.com/) with [OpenStreetMap](https://www.openstreetmap.org/) tiles
- **Start / Stop** live GPS tracking
- Live marker with an accuracy circle
- Shows **latitude**, **longitude** and **GPS accuracy in metres**
- **Step counter** using the phone's accelerometer, shown in large numbers
- One **Start** tap asks for both location and motion permission (required on iPhone)
- Keeps the screen awake while running (on supported browsers)
- **Recenter** button to snap back to your position after moving the map
- Clear messages when permission is denied, GPS is off, or signal is weak
- Works on iPhone (Safari) and Android (Chrome), including notch and home-bar safe areas

## Files

| File | Purpose |
|------|---------|
| `index.html` | Page layout and Leaflet includes |
| `style.css` | Mobile styling, full-screen map, info panel |
| `app.js` | Map setup, live GPS tracking and step counter logic |

All paths are relative, so the app works from any GitHub Pages URL.

## Deploy to GitHub Pages

1. Create a new public repository on GitHub (for example `route-lab`).
2. Upload `index.html`, `style.css`, `app.js` and `README.md` to the **root** of the repository.
3. Go to **Settings → Pages**.
4. Under **Build and deployment**, choose **Deploy from a branch**, select `main` and `/ (root)`, then click **Save**.
5. After a minute or two, open:
   `https://<your-username>.github.io/<repo-name>/`

## How to use

1. Open the GitHub Pages link on your phone.
2. Tap **Start**. On iPhone, allow **Motion & Orientation** access and **Location** access when asked. On Android, allow Location.
3. The map zooms to your position and follows you as you move.
4. Walk with the phone in your hand or pocket — the step count goes up as you walk.
5. Drag the map to look around; tap **Recenter** to return to your location.
6. Tap **Stop** to end tracking. The step count resets on the next **Start**.

## How the step counter works

The app reads the accelerometer through the browser's `devicemotion` event. It takes the total acceleration (so phone orientation does not matter), removes gravity, smooths the signal, and counts one step each time it rises above a threshold. A short minimum gap between steps stops small shakes from being counted twice. Accuracy is good for normal walking, but it is an estimate — not as precise as the phone's built-in health app.

To make it more or less sensitive, change these values near the top of the step counter section in `app.js`:

- `STEP_THRESHOLD` (default `1.2`) — lower it if steps are missed, raise it if too many are counted
- `MIN_STEP_GAP` (default `280` ms) — the shortest time allowed between two steps

## Troubleshooting

- **Location only works over HTTPS.** GitHub Pages uses HTTPS automatically. Opening `index.html` directly from your files will not give a location.
- **iPhone — no permission prompt / denied:**
  Settings → Privacy & Security → Location Services → turn it on, then Safari Websites → **While Using the App**.
- **Android — denied:**
  Tap the lock icon in Chrome's address bar → Permissions → Location → **Allow**. Make sure phone Location/GPS is switched on.
- **iPhone — steps stay at 0 / "Blocked":** motion permission was denied. Close the Safari tab, open the link again, tap **Start** and choose **Allow**. If no prompt appears, clear website data in Settings → Apps → Safari → Advanced → Website Data, then try again.
- **"No sensor":** the device or browser is not sending accelerometer data (most laptops and desktops have none).
- **Low accuracy (large circle):** move outdoors or near a window and wait a few seconds for a better GPS fix.
- **Tracking pauses when the screen locks:** browsers stop GPS and motion sensors in the background. The app tries to keep the screen awake; keep the page open while tracking.

## Credits

- Map library: [Leaflet](https://leafletjs.com/) (loaded from unpkg CDN)
- Map data: © [OpenStreetMap](https://www.openstreetmap.org/copyright) contributors
