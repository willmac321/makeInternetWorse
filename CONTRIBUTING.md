# Contributing

Thanks for helping out! Bug reports, new words, new languages, puzzles and fixes are all welcome.

## Getting set up

```sh
git clone https://github.com/willmac321/makeInternetWorse.git
cd makeInternetWorse
npm install
npm start      # launches Firefox with the extension; edits in src/ reload automatically
```

You can also load `src/manifest.json` via `about:debugging#/runtime/this-firefox` → **Load Temporary Add-on…** in your normal Firefox.

## Before you open a pull request

```sh
npm test       # must pass
npm run lint   # must show 0 errors and 0 warnings
```

Then try your change in Firefox. Load a couple of real sites and click some links. Unit tests don't cover page behavior.

## Common changes

### Adding words

Add a line to `RAW_DICTIONARY` in `src/dictionary.js`:

```js
  word:        ["es", "fr", "de", "it", "pt", "ja"],
```

- The key is the **lowercase** English word. Quote it if it has an apostrophe (`"don't"`).
- Give one translation per language, **in the same order as `LANGUAGES`**.
- Usually you only need the base form. `content.js` strips common endings (-s, -es, -ies, -ing, -ed, -ly, -er, -est) before looking a word up. Add irregular forms (`went`, `children`) as separate entries.
- Rough translations are fine. This is a toy, not a translator. If a word has several meanings, pick the most common one.

### Adding a language

1. Add `{ code, name }` to the end of `LANGUAGES` in `src/dictionary.js`.
2. Add a translation for that language to the end of **every** entry in `RAW_DICTIONARY`.
3. `npm test` fails if any entry is missing a translation.

The popup builds its language checkboxes from `LANGUAGES`, so no other changes are needed.

### Puzzles

`src/puzzles.js` is generated. Don't edit it by hand except to add a hand-made classic.

- To regenerate: `npm run puzzles` (or `npm run puzzles -- 500` for a different count).
- To add a hand-made puzzle, add its position (the board part of a FEN, **White to move**) to `CLASSICS` in `tools/generate-puzzles.js`, then regenerate.
- You don't list the winning move anywhere. `ChessEngine.matingMoves` works out every checkmating move at runtime, so any mate counts as a win.

The engine leaves out castling and en passant, so don't add positions where those matter. Pawns always promote to a queen.

## Code style

- Plain JavaScript, no build step, no dependencies in `src/`. What's in `src/` is exactly what gets uploaded to Mozilla.
- Don't use `innerHTML` with dynamic values. Build elements with `createElement` and `textContent`. AMO's linter flags `innerHTML`.
- Match the style of the surrounding code: two-space indents, double quotes, small functions.
- Keep the extension offline. Don't add network requests or new permissions without discussing them in an issue first, because they affect the AMO review and users' trust.

## Reporting bugs

Please include:

- Firefox version and OS
- The page where it happened (URL if public)
- What you expected, and what happened instead
- Any errors from the browser console (**Ctrl+Shift+J**)

## Releasing (maintainers)

See [Publishing to Firefox](README.md#publishing-to-firefox) in the README.
