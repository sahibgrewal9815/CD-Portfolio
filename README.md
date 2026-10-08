# Rendered Works — 3D Disc Portfolio (iPad edition)

A portfolio for architectural renders and animations. Every project is a realistic floating disc in a long diagonal line. You add, edit and delete discs **right on the iPad**, picking videos and cover art from the Files app or Photos.

- **Drag a disc** to spin it. It flicks with inertia, shows its iridescent back, then springs back to the label.
- **Swipe the background** (or use ← →) to move along the line. It loops once you have 6+ discs.
- **Tap the centred disc** to play its video. The player has **Edit** and **Delete** buttons.
- **+ Add disc** opens the add sheet. **Index** lists every disc with a × to delete it.
- **Tap the name in the top bar** to set your studio or personal name, which is printed on every disc.

## Using it on the iPad

1. Publish the site on GitHub Pages (steps below) and open the link in **Safari** on the iPad.
2. Tap **Share → Add to Home Screen**. Use the site from that Home Screen icon from now on. It opens full-screen like an app and works offline.
3. Tap **+ Add disc**:
   - **Video:** tap it, then choose *Choose File* (Files app) or *Photo Library*. Title, runtime and resolution fill in automatically.
   - **Cover art:** tap the round disc to pick an image. If you skip it, a frame from the video becomes the cover. You can switch back with *Use a frame from the video instead*.
   - Fill in location, year, client and software (comma-separated), then **Add disc**.
4. **To edit or delete:** tap a disc to open it, then use **Edit** or **Delete**. You can also open **Index** and tap ×.

### Where your discs are saved

Videos and covers are copied into the browser's storage on **that iPad**. They are not uploaded to GitHub or anywhere else, and deleting a disc never touches the original in your Files app.

- The Home Screen app and a regular Safari tab have **separate** storage, so add your discs inside the Home Screen app.
- Removing the Home Screen icon, or clearing Safari website data, erases the saved discs. Your original video files are unaffected, so you can simply add them again.
- Storage space is shared with the iPad. The Index shows how much your discs are using. If a video won't save, free up space or use a smaller export (e.g. 1080p H.264).
- Other devices that open the site see the sample discs, not your iPad's discs.

## Sample discs

While your library is empty the site shows sample discs from `projects.js`. They disappear as soon as you add your first disc. You can edit or remove the samples in `projects.js` (set `projects = []` to show none).

## Publish on GitHub Pages

1. Create a new repository on GitHub, e.g. `rendered-works`. You can do this from Safari on the iPad.
2. Upload all the files in this folder, keeping the `icons/` folder. On github.com: **Add file → Upload files**.
3. Go to **Settings → Pages → Build and deployment → Deploy from a branch → `main` / root → Save**.
4. After a minute the site is live at `https://<your-username>.github.io/rendered-works/`.

**After changing any site file later,** change `VERSION` in `sw.js` (e.g. `discs-v2`) so installed copies update. Your saved discs are kept.

## Run on a computer

ES modules don't load from `file://`, so start a small server in the folder:

```bash
python -m http.server 8000
# then open http://localhost:8000
```

## Files

| File | What it is |
|---|---|
| `index.html` | page structure, add/edit sheet, video player |
| `main.js` | 3D discs, spinning, browsing, add/edit/delete |
| `store.js` | saves discs on the device (IndexedDB) |
| `style.css` | all styling; colours and fonts at the top |
| `projects.js` | sample discs and the default studio name |
| `sw.js`, `manifest.webmanifest`, `icons/` | Home Screen app and offline support |

Look-and-feel constants (`SPACING_X`, `SPACING_Y`, disc size) are at the top of `main.js`.
