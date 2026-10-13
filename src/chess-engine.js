// Minimal chess rules for mate-in-one puzzles.
// Board: 8x8 array, row 0 = rank 8. Uppercase = white, lowercase = black, null = empty.
// No castling or en passant (puzzles never need them). Pawns always promote to a queen.
const ChessEngine = (() => {
  const FILES = "abcdefgh";
  const ORTHO = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  const DIAG = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
  const KNIGHT = [[1, 2], [2, 1], [-1, 2], [-2, 1], [1, -2], [2, -1], [-1, -2], [-2, -1]];

  const isWhite = (p) => !!p && p === p.toUpperCase();
  const isBlack = (p) => !!p && p === p.toLowerCase();
  const sideOf = (p) => (isWhite(p) ? "w" : "b");
  const inside = (r, c) => r >= 0 && r < 8 && c >= 0 && c < 8;
  const square = (r, c) => FILES[c] + (8 - r);

  function parseFen(fen) {
    return fen.split(" ")[0].split("/").map((row) => {
      const cells = [];
      for (const ch of row) {
        if (/\d/.test(ch)) cells.push(...Array(Number(ch)).fill(null));
        else cells.push(ch);
      }
      return cells;
    });
  }

  function toFen(board) {
    return board
      .map((row) => {
        let s = "", empty = 0;
        for (const p of row) {
          if (!p) { empty++; continue; }
          if (empty) { s += empty; empty = 0; }
          s += p;
        }
        return s + (empty || "");
      })
      .join("/");
  }

  // Moves ignoring whether they leave your own king in check.
  function pseudoMoves(board, r, c) {
    const piece = board[r][c];
    const side = sideOf(piece);
    const own = (p) => p && sideOf(p) === side;
    const enemy = (p) => p && sideOf(p) !== side;
    const out = [];
    const step = (tr, tc) => {
      if (inside(tr, tc) && !own(board[tr][tc])) out.push([tr, tc]);
    };
    const slide = (dirs) => {
      for (const [dr, dc] of dirs) {
        for (let i = 1; ; i++) {
          const tr = r + dr * i, tc = c + dc * i;
          if (!inside(tr, tc) || own(board[tr][tc])) break;
          out.push([tr, tc]);
          if (board[tr][tc]) break;
        }
      }
    };

    switch (piece.toLowerCase()) {
      case "p": {
        const dir = side === "w" ? -1 : 1;
        const startRow = side === "w" ? 6 : 1;
        if (inside(r + dir, c) && !board[r + dir][c]) {
          out.push([r + dir, c]);
          if (r === startRow && !board[r + 2 * dir][c]) out.push([r + 2 * dir, c]);
        }
        for (const dc of [-1, 1]) {
          if (inside(r + dir, c + dc) && enemy(board[r + dir][c + dc])) out.push([r + dir, c + dc]);
        }
        break;
      }
      case "n": KNIGHT.forEach(([dr, dc]) => step(r + dr, c + dc)); break;
      case "b": slide(DIAG); break;
      case "r": slide(ORTHO); break;
      case "q": slide([...ORTHO, ...DIAG]); break;
      case "k": [...ORTHO, ...DIAG].forEach(([dr, dc]) => step(r + dr, c + dc)); break;
    }
    return out;
  }

  // Is square (r, c) attacked by `side`?
  function attacked(board, r, c, side) {
    const mine = (p, type) => p && sideOf(p) === side && p.toLowerCase() === type;
    const pawnRow = r + (side === "w" ? 1 : -1);
    for (const dc of [-1, 1]) {
      if (inside(pawnRow, c + dc) && mine(board[pawnRow][c + dc], "p")) return true;
    }
    for (const [dr, dc] of KNIGHT) {
      if (inside(r + dr, c + dc) && mine(board[r + dr][c + dc], "n")) return true;
    }
    for (const [dr, dc] of [...ORTHO, ...DIAG]) {
      if (inside(r + dr, c + dc) && mine(board[r + dr][c + dc], "k")) return true;
    }
    const ray = (dirs, types) => dirs.some(([dr, dc]) => {
      for (let i = 1; ; i++) {
        const tr = r + dr * i, tc = c + dc * i;
        if (!inside(tr, tc)) return false;
        const p = board[tr][tc];
        if (p) return sideOf(p) === side && types.includes(p.toLowerCase());
      }
    });
    return ray(ORTHO, "rq") || ray(DIAG, "bq");
  }

  function findKing(board, side) {
    const k = side === "w" ? "K" : "k";
    for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) if (board[r][c] === k) return [r, c];
    return null;
  }

  function inCheck(board, side) {
    const king = findKing(board, side);
    return !!king && attacked(board, ...king, side === "w" ? "b" : "w");
  }

  function applyMove(board, [fr, fc], [tr, tc]) {
    const next = board.map((row) => row.slice());
    let piece = next[fr][fc];
    if (piece === "P" && tr === 0) piece = "Q";
    if (piece === "p" && tr === 7) piece = "q";
    next[tr][tc] = piece;
    next[fr][fc] = null;
    return next;
  }

  function legalMovesFrom(board, r, c) {
    const side = sideOf(board[r][c]);
    return pseudoMoves(board, r, c).filter((to) => !inCheck(applyMove(board, [r, c], to), side));
  }

  function allLegalMoves(board, side) {
    const out = [];
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        if (board[r][c] && sideOf(board[r][c]) === side) {
          for (const to of legalMovesFrom(board, r, c)) out.push([[r, c], to]);
        }
      }
    }
    return out;
  }

  function isCheckmate(board, side) {
    return inCheck(board, side) && allLegalMoves(board, side).length === 0;
  }

  // Every move by `side` that checkmates the opponent, as "e2e4"-style strings.
  function matingMoves(board, side) {
    const other = side === "w" ? "b" : "w";
    return allLegalMoves(board, side)
      .filter(([from, to]) => isCheckmate(applyMove(board, from, to), other))
      .map(([from, to]) => square(...from) + square(...to));
  }

  return {
    parseFen, toFen, isWhite, isBlack, sideOf, square,
    legalMovesFrom, allLegalMoves, applyMove, inCheck, isCheckmate, matingMoves,
  };
})();
