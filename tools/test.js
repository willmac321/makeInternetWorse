// Run with: npm test
// Checks the chess engine, every puzzle, and the dictionary — no browser needed.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

const src = (file) => fs.readFileSync(path.join(__dirname, "..", "src", file), "utf8");
const load = (file, names) => new Function(`${src(file)}\nreturn { ${names} };`)();

const { ChessEngine: E } = load("chess-engine.js", "ChessEngine");
const { PUZZLES } = load("puzzles.js", "PUZZLES");
const { LANGUAGES, RAW_DICTIONARY } = load("dictionary.js", "LANGUAGES, RAW_DICTIONARY");
const board = (fen) => E.parseFen(fen);

test("starting position has 20 legal moves", () => {
  assert.equal(E.allLegalMoves(board("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR"), "w").length, 20);
});

test("finds known mates", () => {
  assert.deepEqual(E.matingMoves(board("r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR"), "w"), ["h5f7"]);
  assert.deepEqual(E.matingMoves(board("k7/8/1K6/8/8/8/8/7Q"), "w").sort(), ["h1b7", "h1h8"]);
  assert.deepEqual(E.matingMoves(board("rnbqkbnr/pppp1ppp/8/4p3/6P1/5P2/PPPPP2P/RNBQKBNR"), "b"), ["d8h4"]);
});

test("pinned pieces cannot move", () => {
  assert.equal(E.legalMovesFrom(board("4r1k1/8/8/8/8/8/4N3/4K3"), 6, 4).length, 0);
});

test("pawns promote to a queen", () => {
  assert.deepEqual(E.matingMoves(board("7k/P7/6K1/8/8/8/8/8"), "w"), ["a7a8"]);
});

test("every puzzle is valid", () => {
  assert.equal(new Set(PUZZLES).size, PUZZLES.length, "duplicate puzzles");
  for (const fen of PUZZLES) {
    const b = board(fen);
    assert.ok(b.length === 8 && b.every((row) => row.length === 8), `bad FEN: ${fen}`);
    assert.ok(!E.inCheck(b, "b"), `black already in check: ${fen}`);
    assert.ok(E.matingMoves(b, "w").length >= 1, `no mate in one: ${fen}`);
  }
});

test("every dictionary word has one translation per language", () => {
  for (const [word, translations] of Object.entries(RAW_DICTIONARY)) {
    assert.equal(word, word.toLowerCase(), `keys must be lowercase: ${word}`);
    assert.equal(translations.length, LANGUAGES.length, `wrong translation count: ${word}`);
    assert.ok(translations.every((t) => typeof t === "string" && t.length > 0), `empty translation: ${word}`);
  }
});
