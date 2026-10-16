# Timetable & Module Planner

A small, dependency-free web app for planning your week and your degree.

- **Timetable**: weekly grid of your lectures, tutorials, labs and so on. Click an empty slot to add a class, and click a class to edit it. Clashing classes are outlined and counted, today's column and the current time are highlighted, and you can print the week.
- **Module plan**: a board with one column per term. Drag modules between terms, see credits per term, track progress towards your degree's credit target, and see your credit-weighted average for completed modules.
- **Modules**: a searchable table of every module with its term, credits, status, grade and number of classes.
- Light and dark themes, works on mobile, and there's no account or server.

## Your data

Everything is saved in your browser's `localStorage` on the device you're using. Nothing is sent anywhere.

- Use **Export** to download a `.json` backup, and **Import** to restore it or move it to another device or browser.
- Clearing your browser's site data deletes your planner, so export now and then.

The first time you open the app it loads some example modules. Use **Modules → Clear all data** to start fresh.

## Host it on GitHub Pages

1. Create a new repository on GitHub, for example `planner`.
2. Upload `index.html`, `styles.css`, `app.js`, `.nojekyll` and this `README.md` to the root of the repository, either with **Add file → Upload files** or with git:
   ```bash
   git init
   git add .
   git commit -m "Timetable & module planner"
   git branch -M main
   git remote add origin https://github.com/<your-username>/planner.git
   git push -u origin main
   ```
3. In the repository, go to **Settings → Pages**. Under *Build and deployment*, choose **Deploy from a branch**, then select `main` and `/ (root)`, and click **Save**.
4. After a minute or so the site is live at `https://<your-username>.github.io/planner/`.

## Run locally

Open `index.html` in a browser, or serve the folder:

```bash
python3 -m http.server 8000
```

## Customising

- Colours: edit the `COLORS` array at the top of `app.js`.
- Theme: change the CSS variables in `:root` in `styles.css`.
- Class types: edit the `<option>`s in the class dialog in `index.html`.
