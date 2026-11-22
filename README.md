# Who-are-you-

Live demo: https://fhuongg.github.io/Who-are-you-/

The Vite app lives in [my-project](./my-project). Pushes to `main` build it with
`npm run build` and publish `my-project/dist` to GitHub Pages via
[.github/workflows/deploy.yml](./.github/workflows/deploy.yml).

## Immersive AR (WebXR passthrough) on Meta Quest

The app runs in two modes from the same scene:

- **Flat mode:** the normal browser view (dark background, existing model and UI).
- **Immersive AR:** press the **START AR** button that `ARButton` adds at the bottom of the page.
  The scene is rendered with a transparent background, so Quest passthrough shows the real room,
  and the persona model is placed ~0.9 m in front of you at floor level. The existing UI
  (Distant / Calm / Friendly, voice button) is reused as the WebXR `dom-overlay`, and the overlay
  gains an **Exit AR** button for ending the session.

If `immersive-ar` is not available, the page shows a fallback message under the UI and the flat
3D view keeps working.

### Testing with Meta Quest 2 Browser

1. WebXR (and passthrough) requires a **secure context (HTTPS)**. The live demo at
   https://fhuongg.github.io/Who-are-you-/ is HTTPS, so it can be used directly; an `http://`
   LAN address from `npm run dev` will not work for AR.
2. In the headset, open the URL in **Meta Quest Browser** (the standalone browser on the headset).
3. Allow the camera / AR permission prompt the first time.
4. After the page loads, look down at the bottom of the browser view and tap **START AR**.
   If the button reads **AR NOT SUPPORTED**, the browser or headset did not report `immersive-ar`.
5. The passthrough view starts and the model appears ~1 m ahead; use Distant / Calm / Friendly or
   the mic button in the overlay, then press **Exit AR** to return to flat mode.
6. Adjust `AR_MODEL_DISTANCE` / `AR_MODEL_SCALE` in `my-project/src/main.ts` if you want the model
   closer/further or larger/smaller.