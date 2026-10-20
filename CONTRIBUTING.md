# Contributing to Frame MAS

Thank you for helping make Frame MAS better for engineering students.

## Report a problem
Open an **Issue** and include:
- what you did (attach the `.frmas` file if you can: **Model → Project → Save .frmas**),
- what you expected and what you saw (a screenshot helps),
- your device and browser.

If a result looks wrong, add the hand calculation or textbook result you compared it with.

## Suggest a feature
Open an Issue explaining who it helps and how it would work.

## Change the code
1. Fork the repository and create a branch.
2. Edit `index.html`. The script is organised in labelled sections: Frame solver, Helpers and units, Design load combinations, Panels, Frame canvas, Results, Exact member values and Diagram values panel, 3D view, Appearance, and start-up.
3. Run the checks: `node tests/verify.js` and `node tests/combinations.js`. All must pass; add a check for any solver or combination change.
4. Test in a browser on a phone-sized window and a wide screen, in light and dark mode.
5. If you changed a file the offline app caches, raise the version in `CACHE` at the top of `sw.js`.
6. Open a pull request describing the change and how you tested it.

## Guidelines
- Keep the app free of build tools and dependencies other than three.js.
- Keep calculations in SI base units (kN, m); convert only for display.
- Keep the `.frmas` format backward compatible; see `FRMAS-FORMAT.md`.
- By contributing you agree that your work is released under the MIT License.
