# GameVerse Offline Audit — 2026-11-07

## Scope and safety boundaries

- Work branch: `feature/gameverse-offline-all-games`
- Base branch: `upgrade-phase-2`
- Production domain confirmed by project owner: `playgameverse.com`
- Do not modify `main` or deploy production from this audit.
- Preserve online rooms, accounts, PostgreSQL, Sâm/UNO rules, comments, emotes, and existing online behavior.
- Voice chat remains out of scope.
- Offline mode means local single-player / local bot play. Online rooms, account login, shared chat/emotes, rankings backed by the server, and cross-device sync still require a connection.

## Repository inventory observed

The `games/` directory currently contains seven standalone HTML game pages:

| Game | Page | Local engine file |
|---|---|---|
| 2048 | `games/2048.html` | `games/2048-engine.js` |
| Caro | `games/caro.html` | `games/caro-engine.js` |
| Chess | `games/chess.html` | `games/chess-engine.js` |
| Monopoly | `games/monopoly.html` | Inline |
| Sequence | `games/sequence.html` | Inline |
| Sudoku | `games/sudoku.html` | Inline |
| Word | `games/word.html` | Inline |

The server also advertises online game types `sam`, `uno`, `caro`, `chess`, `monopoly`, `sudoku`, `word`, and `sequence`. The online Sâm and UNO modes remain room/server-driven in `/play`. A separate standalone local bot mode now exists at `/games/cards-offline` and does not call room APIs.

## Current offline implementation findings

- `sw.js` uses a fixed precache list for the seven standalone game routes, the separate Sâm/UNO offline page, `/play`, and their local engines.
- The current list uses `/games/caro`, `/games/chess`, etc.; the physical files are `.html` files and the server route mapping must be verified before relying on these cache keys.
- The fixed list explicitly includes the shared `invite-client.js` and the Sâm/UNO offline engine. Continue checking every game's additional local dependencies as the audit expands.
- Runtime caching caches same-origin successful GET assets, but server APIs and realtime endpoints are intentionally excluded.
- The existing `tests/offline.test.js` verifies that strings appear in `sw.js`; it does not prove that each route loads, that assets are cached, or that a game can be played with the network disabled.
- Online Sâm/UNO room operations still depend on server APIs/realtime connections and cannot provide online multiplayer while offline. The new local bot mode is separate and can run without those services after its assets are cached.

## Required next audit steps

1. Verify every game link and route from both `hub.html` and `index.html`, including dynamic links.
2. Verify server route resolution for extensionless paths versus physical `.html` files.
3. Enumerate local CSS, JS, fonts, images, and any CDN dependencies for each game.
4. Inspect each game for API, WebSocket, EventSource, account, and leaderboard calls.
5. Complete browser-level offline gameplay checks for all nine games, including first installation, refresh, and direct navigation with DevTools network disabled.
6. Verify that online-only features remain gracefully unavailable offline without breaking local play.
7. Deploy to the test site only after browser checks pass; keep production untouched until the user approves.

## Important limitation

This is a source inspection snapshot, not a claim that all games already work offline. No production deployment is authorized by this document.


## Detailed local-play audit (2026-11-07)

The Game Hub catalog contains nine games. Seven have standalone game pages served at `/games/...` and are included in the offline shell: 2048, Caro, Chess, Monopoly, Sudoku, Word, and Sequence. The existing Caro and Chess pages already support a local bot through `bot=1` and `difficulty=easy|medium|hard`; Monopoly has a local mode; Sudoku, Word, and Sequence contain solo-play flows; 2048 is local-first and stores its best score in browser storage.

Sâm and UNO's online modes still run inside `/play` and use the server room API and EventSource. Caching `/play` only preserves its HTML shell. A separate local bot mode has since been added at `/games/cards-offline`; it must pass automated and real-browser offline checks before Sâm/UNO are accepted as complete.

The current Service Worker caches the seven standalone game routes, the `/play` shell, the separate Sâm/UNO offline page and engine, the shared `/invite-client.js`, and the local game engines. It deliberately bypasses API, health, event-stream, and socket endpoints. Offline navigation can display previously cached pages, but page availability and functional offline gameplay are separate acceptance criteria.


## Sâm and UNO local bot implementation (2026-11-07)

A separate browser-only mode has now been added:

- Entry point: `/games/cards-offline?game=sam` or `/games/cards-offline?game=uno`.
- Engine: `games/cards-offline-engine.js`; it owns the local deck, hands, turn order, Sâm combinations, UNO color/action handling, drawing, penalties, and bot decisions.
- The Game Hub's Sâm/UNO mode picker now offers **Chơi Offline với Bot** separately from the existing online-room setup.
- The new page does not call `fetch`, `/api/`, EventSource, or WebSocket. Local match state stays in browser memory.
- The page and engine are included in the Service Worker precache. Cache name is now `gameverse-offline-v4`.
- The online `/play` client and existing room API have not been changed for this feature.

The local mode currently supports Sâm with 1–4 bots and UNO with 1–5 bots. UNO supports single cards, identical pairs, wild-color choice, draw cards, and cumulative +2/+4 penalties. The offline mode is intentionally separate from server-backed accounts, public profiles, online rooms, chat, emotes, and global rankings.

Automated Node tests have been added in `tests/cards-offline.test.js` for local engine setup, Sâm combinations/bot moves, UNO local winning moves, drawn-card restrictions, identical pairs, cumulative penalties, and route/cache wiring. These checks are not a substitute for a real browser test with DevTools network disabled. Do not mark the Sâm/UNO offline experience fully accepted until the latest GitHub Actions run passes and both games have been manually exercised in a browser after the Service Worker has installed.
