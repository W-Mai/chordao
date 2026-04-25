# Changelog

All notable changes to Chordao will be documented in this file.

Format: [CalVer](https://calver.org/) — `YYYY.M.D`

## [2026.4.26.2]

### Added
- **Song playback** — ▶/⏸/⏹ controls in the song panel. Playback walks the sheet step by step, highlights the exact chord on the chart, and drives the right-side views (Shape Grid / Fretboard / Chord Diagrams) via the same active-chord highlight used elsewhere.
- **Sheet-level BPM** — `bpm:` in frontmatter; editor has a BPM field (leave empty to inherit the global BPM slider).
- **Per-section rhythm override** — `--- section | strum:pop ---` in text format; editor has a dropdown on each section header. Falls back to the sheet-level `strum`, then the global rhythm.
- **Time signature** — `time: N/M` frontmatter (e.g. `3/4`, `6/8`); editor has a dropdown. Rhythm patterns are 4/4-designed and linearly scale to the sheet's time signature. Split-chord bars (N chords in one bar) each play their proportional window of the pattern.
- **Click chip → cursor** — clicking any chord chip sets the playback cursor to that exact position. ▶ with a cursor starts from that chord's **bar** (bar-aligned); after ⏸, the next ▶ resumes from the exact cursor; ⏹ clears the cursor and resets to step 0.
- **Per-section progression chip row** — under each section header, a compact chip list of that section's consecutive-dedup'd chord sequence. Follows the degree↔absolute name toggle; clicking highlights the corresponding voicing.
- **Section-focused progression lines** — hovering a section (or playback being inside it) overrides the top-bar progression for the right-side panels' connecting lines; ShapeGrid's free-looping dot turns into a synced progress dot following playback.
- **Selecting a song snaps the app's key** to the sheet's key; manual key changes afterwards are sticky until the next song selection.

### Fixed
- **Last chord of a song got cut off** — final step now waits for its audio to finish before the audio graph is torn down.
- **Playback was lighting up every same-degree chord on the chart** — song panel now reads a dedicated playback cursor; right-side views still follow the same-degree highlight rule.

## [2026.4.26.1]

### Added
- **Song sheets** — lyric + bar-aligned chord chart with degree-colored accents. Built-in songs live as `.md` files under `songs/` (frontmatter + UG-ish body); a 🎼 header button opens a hidden-by-default panel with a song selector.
- **Visual song editor** — click char sets accent, click chip picks degree; supports per-line bar add/remove, multi-chord bars (split-chord, `/`-separated), section/line editing. Raw-text view available as fallback.
- **Song sharing** — lz-string compressed sheet payload in URL; auto-imports to localStorage on open.
- **Runtime accent alignment** — same-bar accents line up vertically across lines in a section (computed from line patterns, no manual spacing).
- **Trapezoid chord chip** — chip color band extends across its chord's whole territory (including across bars and into next lines as a carry-over); chip label anchored above the accent char.
- **Auto-fit font size** — section-level column budget + per-section font-size so lines fill the panel width and accents share pixel columns.
- **Pixel font for chord chips** — self-hosted Pixeloid Mono under `public/fonts/`.

### Fixed
- Fullscreen overlay no longer traps clicks after close (effect-dep thrash) — earlier fix preserved through the refactor.
- User-saved copy of a built-in song no longer collides with its id in the selector dropdown.

## [2026.4.24.1]

### Added
- **Panel state persisted to URL** — `combo` index, `prefer` (↗/↘/—), `im` (interval map on/off), `ivs` (visible intervals), and `fs` (which panel is fullscreen) all ride along in the hash; defaults are omitted to keep URLs tidy
- **Fullscreen overlay carries panel controls** — Shape Grid combo switch / bass-direction preference / Fretboard ♫ interval-map toggle + filter chips all work inside the enlarged view
- **Chinese README** as the default; `English` link at the top switches to `README.en.md`

### Fixed
- Fullscreen overlay no longer traps clicks after close (effect-dep thrash killed the unmount timer, leaving a transparent full-screen div)
- Export image shows the correct shape-system label: "CAGED shape derivation" vs "E/Em/A/Am shape derivation"

### Changed
- Extracted `GridPanel` / `FretPanel` components so the normal view and fullscreen overlay share one definition (header + body)
- README updated to reflect CAGED, multi-combo, bass direction, interval overlays, 6th practice mode

## [2026.4.23.1]

### Fixed
- Keyboard arrow-key navigation now follows Circle-of-Fifths ↔ Chromatic re-ordering (missing React effect dep)
- Game mode exhaustive-deps fixes — Memory/Sprint/Chain no longer judge on stale closures
- `saveBest` guards against `NaN` in localStorage so tampered values no longer overwrite best scores

### Changed
- All remaining user-visible strings routed through i18n (Guide SVG labels, Game progress, footer, export template, toolbar buttons)
- Extracted `src/hooks/useHashState.ts` — URL-hash parse/sync lifted out of App.tsx
- Extracted `src/components/game/` — pure logic, storage, and per-mode hooks (useGameTimer, useSprintState, useChainState); Game() shrank 325→273 lines, cognitive complexity 124→91
- Lint warnings 36 → 0

## [2026.4.22.3]

### Added
- **Interval labels on active chord** — Fretboard shows R/3/5/b3/b7 on each dot when chord is hovered/locked
- **Interval map mode** — Toggle ♫ on fretboard to show all intervals for current key across entire neck
- **Selectable intervals** — Filter which intervals to display (R/b3/3/4/5/b7/7), persisted to localStorage
- **Open string intervals** — Interval map includes fret 0 positions

### Fixed
- Interval map overlay uses correct transform offset (was misaligned)
- String labels shift left in interval mode to avoid overlap with open string dots
- Fullscreen fretboard preserves interval mode state

## [2026.4.22.2]

### Added
- **CAGED system** — Full C/A/G/E/D shapes (major, minor, 7th), toggle E/A ↔ CAGED
- **Shape Grid 3-row layout** — A/C row, E/G row, D row for CAGED mode
- **Fretboard diamond markers** — ⬤ circle=6th string root (E/G), ◼ square=5th (A/C), ◆ diamond=4th (D)
- **Multiple position combos** — Switch between optimal voicing sets with numbered buttons + All view
- **Bass direction preference** — ↗ ascending / ↘ descending / — none toggle on Shape Grid
- **Multi-path progression lines** — All mode shows each combo's path in distinct colors
- **Chord diagram shape label** — Shows `I · E @ 8` format (degree · shape · fret)

### Fixed
- Shape Grid overlapping voicings at same position — horizontal offset with smaller dots
- Playback blue circle aligns with actual voicing position in overlapping cells
- String lines and colors support dynamic row count
- Guard rowIdx in progression path to prevent crash

## [2026.4.22]

### Added
- **7th chord shapes** — Toggle between triad (E/Em/A/Am) and seventh (E7/Em7/A7/Am7) shapes
- **Chord audio playback** — Click any chord to hear it, physics-based harmonic synthesis (Perov et al. model)
- **12 rhythm patterns** — Pop, Rock, Folk, Ballad, Punk, Reggae, Shuffle, Country, Arpeggio (53231323), etc.
- **Auto-play progression** — BPM slider (60–180), per-bar rhythm, synced Shape Grid dot animation
- **Custom chord progressions** — Type degree sequence (e.g. `1 4 5 1`), synced to URL
- **Shareable URLs** — Key, progression, and custom degrees encoded in URL hash
- **QR codes with state** — Export QR links to current key/progression
- **Practice game: 5 modes** — Locate, Identify, Sprint, Chain, Memory
- **Game difficulty** — Easy (I only + colors), Medium (I/IV/V), Hard (all 6 + timer)
- **Per-question countdown timer** — 10s / 7s / 5s by difficulty
- **Streak tracking & local leaderboard** — Best score per mode/difficulty in localStorage
- **Floating panel sidebar** — FAB morphs into settings panel with expand/collapse animation
- **Share button** — Header dropdown with Copy Link + Export Image
- **Swipe to switch key** — Touch gesture on key selector grid
- **Mute toggle** — Global audio on/off with localStorage persistence
- **Unit tests** — 20 tests covering chord data layer

### Changed
- **Unified header bar** — Logo + key display + toolbar, shared across mobile/desktop
- **Code restructured** — `components/`, `data/`, `utils/` directory layout
- **Click = play, double-click = lock** — Replaces old click-to-lock behavior
- **Game overhaul** — 2→5 modes, per-question timer replaces global timer

### Fixed
- CI lint errors (i18next, react-compiler purity, no-useless-escape)
- Game Shape Grid follows current theme
- Mobile custom progression input (Roller auto-select conflict)
- Export supports custom progressions
- Prevent text selection on main/SVG for mobile
- BPM input clamps on blur instead of onChange
- Timeout cleanup on game close (prevent unmounted state updates)
- Absolute audio time scheduling to prevent bar overlap
- Shape Grid synced dot uses GPU-accelerated transform

## [2026.4.3] — Initial release

### Added
- Core chord derivation from E/Em/A/Am open shapes via barre transposition
- Shape Grid, Fretboard Overview, Chord Diagrams
- Optimal combination algorithm (circle-of-fifths ordering)
- 10 built-in chord progressions with animated path
- 3 Catppuccin themes (Mocha/Latte/Cyber) with system auto-detection
- Key selector (circle-of-fifths or chromatic order)
- Degree filter buttons
- Barre line toggle
- Keyboard shortcuts
- Export PNG with QR codes
- Fullscreen overlay with portrait auto-rotation
- Interactive guide (first visit)
- PWA support
- i18n (English / 中文)
