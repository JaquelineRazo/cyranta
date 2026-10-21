# CYRANTA landing

Static one-page site at https://cyranta.razzobusiness.com (GitHub Pages). Brief, copy and decisions live outside this repo:
`../razzo-strategy/05_data-intelligence/` and `../razzo-strategy/01_ecosystem/DECISIONS.md`.

- Public copy: US English, no em dashes, no invented metrics; samples are labeled "Sample data".
- Do not call CYRANTA a RAZZO venture on this site (footer included).
- `js/swarm.js`: three.js glass swarm (fixed canvas, one shape per `[data-scene]` section). The animation is approved; don't change it without asking.
- Form posts to the `razzo-forms` worker with `brand=cyranta`, `need` and `buyer`.
- Local preview: `python3 -m http.server 8768`.
