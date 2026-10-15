# Route Lab

A lightweight mobile web app that shows a full-screen map and follows your live GPS location. Built with plain HTML, CSS and JavaScript — no build step, no frameworks — and ready to host on GitHub Pages.

## Features

- Full-screen map using [Leaflet](https://leafletjs.com/) with [OpenStreetMap](https://www.openstreetmap.org/) tiles
- **Start / Stop** live GPS tracking
- Live marker with an accuracy circle
- Shows **latitude**, **longitude** and **GPS accuracy in metres**
- **Recenter** button to snap back to your position after moving the map
- Clear messages when permission is denied, GPS is off, or signal is weak
- Works on iPhone (Safari) and Android (Chrome), including notch and home-bar safe areas

## Files

| File | Purpose |
|------|---------|
| `index.html` | Page layout and Leaflet includes |
| `style.css` | Mobile styling, full-screen map, info panel |
| `app.js` | Map setup and live GPS tracking logic |

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
2. Tap **Start** and allow location access when asked.
3. The map zooms to your position and follows you as you move.
4. Drag the map to look around; tap **Recenter** to return to your location.
5. Tap **Stop** to end tracking.

## Troubleshooting

- **Location only works over HTTPS.** GitHub Pages uses HTTPS automatically. Opening `index.html` directly from your files will not give a location.
- **iPhone — no permission prompt / denied:**
  Settings → Privacy & Security → Location Services → turn it on, then Safari Websites → **While Using the App**.
- **Android — denied:**
  Tap the lock icon in Chrome's address bar → Permissions → Location → **Allow**. Make sure phone Location/GPS is switched on.
- **Low accuracy (large circle):** move outdoors or near a window and wait a few seconds for a better GPS fix.
- **Tracking pauses when the screen locks:** this is normal browser behaviour; keep the screen on while tracking.

## Credits

- Map library: [Leaflet](https://leafletjs.com/) (loaded from unpkg CDN)
- Map data: © [OpenStreetMap](https://www.openstreetmap.org/copyright) contributors
