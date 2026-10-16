# Timetable & Module Planner

A small, dependency-free web app for planning your week and your degree.

- **Timetable**: weekly grid of your lectures, tutorials, labs and so on. Click an empty slot to add a class, and click a class to edit it. Clashing classes are outlined and counted, today's column and the current time are highlighted, and you can print the week.
- **Plan**: a board with one column per term. Drag modules between terms, see credits per term, track progress towards your degree's credit target, and see your credit-weighted average for completed modules.
- **Degree**: a requirements tracker for the NUS **BComp (Computer Science)**, AY2026/27 cohort, with a **Second Major in Management**. It shows what's taken, in progress and planned for each requirement, plus checks for the CS focus area, level-4000 units, Industry Experience and the Management level and area rules.
- **Courses**: a NUSMods-style search across 1,371 NUS courses: every CS/IFS/CP course, undergraduate management courses (ACC, BSE, BSN, BSP, DAO, DBA, DOS, DSC, DSN, FIN, MKT, MNO), and the Common Curriculum pools (GEC, GES, GEN, ID/CD, UTW/RVX and more). You can filter by requirement, focus area, subject, level and semester. Each course shows its description, prerequisites, preclusions and workload, and you can mark it as taken, in progress or planned in one click.
- **My modules**: a searchable table of every module on your plan with its term, credits, status, grade and number of classes.
- Light and dark themes, works on mobile, and there's no account or server.

## Your data

Everything is saved in your browser's `localStorage` on the device you're using. Nothing is sent anywhere.

- Use **Export** to download a `.json` backup, and **Import** to restore it or move it to another device or browser.
- Clearing your browser's site data deletes your planner, so export now and then.

The first time you open the app it loads some example modules. Use **My modules → Clear all data** to start fresh.

## Host it on GitHub Pages

1. Create a new repository on GitHub, for example `planner`.
2. Upload everything in this folder (`index.html`, `styles.css`, `app.js`, `degree.js`, `data/`, `scripts/`, `.nojekyll` and this `README.md`) to the root of the repository, either with **Add file → Upload files** or with git:
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

The course data is loaded with `fetch`, which doesn't work when you open `index.html` directly from your disk. Serve the folder instead:

```bash
python3 -m http.server 8000
```

## NUS course data

`data/courses.json` comes from the free [NUSMods API](https://api.nusmods.com). To refresh it, for example for a new academic year, run:

```bash
python3 scripts/fetch_nusmods.py 2027-2028
```

Then commit the updated file. The degree rules live in `degree.js`. Edit that file if your cohort's requirements differ.

The tracker is a planning aid, not an official degree audit. Always check EduRec and your faculty. The Management "areas" are grouped by subject code, because the official list on bba.nus.edu.sg sits behind bot protection.

## Customising

- Colours: edit the `COLORS` array at the top of `app.js`.
- Theme: change the CSS variables in `:root` in `styles.css`.
- Class types: edit the `<option>`s in the class dialog in `index.html`.
