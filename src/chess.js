// Chess gate: clicking a link shows a mate-in-one puzzle.
// Find the mate and the link opens; play anything else and the tab closes.
(() => {
  const { parseFen, isWhite, square, legalMovesFrom, applyMove, matingMoves } = ChessEngine;
  const GLYPHS = { k: "♚", q: "♛", r: "♜", b: "♝", n: "♞", p: "♟" };

  let enabled = true;
  let gateOpen = false;

  browser.storage.local.get({ chessGate: true }).then((s) => (enabled = s.chessGate));
  browser.storage.onChanged.addListener((changes, area) => {
    if (area === "local" && changes.chessGate) enabled = changes.chessGate.newValue;
  });

  const STYLE = `
    :host { all: initial; }
    .backdrop {
      position: fixed; inset: 0; z-index: 2147483647;
      display: flex; align-items: center; justify-content: center;
      background: rgba(10, 10, 20, 0.75);
      font: 14px/1.4 system-ui, sans-serif;
    }
    .panel {
      background: #1f1f26; color: #ececf1;
      padding: 18px; border-radius: 12px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.5);
      text-align: center; max-width: calc(100vw - 32px);
    }
    h2 { margin: 0 0 4px; font-size: 17px; }
    p { margin: 0 0 12px; color: #a0a0ab; }
    .board {
      display: grid; grid-template-columns: repeat(8, var(--sq)); grid-template-rows: repeat(8, var(--sq));
      --sq: min(52px, calc((100vw - 68px) / 8));
      border: 3px solid #3a3a42; margin: 0 auto; user-select: none;
    }
    .sq {
      display: flex; align-items: center; justify-content: center;
      font-size: calc(var(--sq) * 0.78); line-height: 1; cursor: default; position: relative;
    }
    .light { background: #eeeed2; }
    .dark { background: #769656; }
    .white { color: #fff; text-shadow: 0 0 2px #000, 0 0 1px #000; cursor: pointer; }
    .black { color: #111; }
    .selected { background: #f6f669; }
    .target { cursor: pointer; }
    .target::after {
      content: ""; position: absolute; width: 30%; height: 30%;
      border-radius: 50%; background: rgba(0,0,0,0.25);
    }
    .status { margin-top: 12px; min-height: 20px; font-weight: 600; }
    .win { color: #5fd38d; }
    .lose { color: #ff6b6b; }
    button {
      margin-top: 10px; padding: 6px 14px; border: 1px solid #3a3a42; border-radius: 6px;
      background: transparent; color: #a0a0ab; font: inherit; cursor: pointer;
    }
    button:hover { color: #ececf1; }
  `;

  function showGate(onWin) {
    gateOpen = true;
    let board = parseFen(PUZZLES[Math.floor(Math.random() * PUZZLES.length)]);
    const solutions = matingMoves(board, "w");
    let selected = null;
    let done = false;

    const host = document.createElement("div");
    const root = host.attachShadow({ mode: "closed" });
    const el = (tag, className, text) => {
      const node = document.createElement(tag);
      if (className) node.className = className;
      if (text) node.textContent = text;
      return node;
    };
    const style = el("style", null, STYLE);
    const boardEl = el("div", "board");
    const statusEl = el("div", "status");
    const cancelEl = el("button", "cancel", "Stay on this page");
    const intro = el("p");
    intro.append("White to move. Find checkmate in one.", el("br"), "Any other move closes this tab.");
    const panel = el("div", "panel");
    panel.append(el("h2", null, "Make your move"), intro, boardEl, statusEl, cancelEl);
    const backdrop = el("div", "backdrop");
    backdrop.append(panel);
    root.append(style, backdrop);

    const close = () => {
      host.remove();
      document.removeEventListener("keydown", onKey, true);
      gateOpen = false;
    };
    const onKey = (e) => {
      if (e.key === "Escape" && !done) close();
    };
    document.addEventListener("keydown", onKey, true);
    cancelEl.addEventListener("click", () => !done && close());

    function render() {
      const targets = selected ? legalMovesFrom(board, ...selected) : [];
      boardEl.replaceChildren();
      for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
          const piece = board[r][c];
          const el = document.createElement("div");
          el.className = `sq ${(r + c) % 2 ? "dark" : "light"}`;
          if (piece) {
            el.textContent = GLYPHS[piece.toLowerCase()];
            el.classList.add(isWhite(piece) ? "white" : "black");
          }
          if (selected && selected[0] === r && selected[1] === c) el.classList.add("selected");
          const isTarget = targets.some(([tr, tc]) => tr === r && tc === c);
          if (isTarget) el.classList.add("target");

          el.addEventListener("click", () => {
            if (done) return;
            if (isTarget) {
              makeMove(selected, [r, c]);
            } else if (isWhite(piece)) {
              selected = [r, c];
              render();
            } else {
              selected = null;
              render();
            }
          });
          boardEl.append(el);
        }
      }
    }

    function makeMove([fr, fc], [tr, tc]) {
      done = true;
      const move = square(fr, fc) + square(tr, tc);
      board = applyMove(board, [fr, fc], [tr, tc]);
      selected = null;
      render();

      if (solutions.includes(move)) {
        statusEl.textContent = "Checkmate! Off you go…";
        statusEl.className = "status win";
        setTimeout(() => {
          close();
          onWin();
        }, 700);
      } else {
        statusEl.textContent = "That's not mate. You lose. Closing tab…";
        statusEl.className = "status lose";
        setTimeout(() => browser.runtime.sendMessage({ type: "close-tab" }), 1200);
      }
    }

    render();
    document.documentElement.append(host);
  }

  document.addEventListener(
    "click",
    (e) => {
      if (!enabled || gateOpen || e.defaultPrevented) return;
      if (e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;

      const link = e.target instanceof Element ? e.target.closest("a[href]") : null;
      if (!link || link.hasAttribute("download")) return;

      const url = new URL(link.href, location.href);
      if (!/^https?:$/.test(url.protocol)) return;
      // Same-page anchor links (#section) don't count as a new page.
      const strip = (u) => u.href.split("#")[0];
      if (url.hash && strip(url) === strip(location)) return;

      e.preventDefault();
      e.stopImmediatePropagation();

      const newTab = link.target && link.target !== "_self";
      showGate(() => {
        if (newTab) window.open(url.href, link.target);
        else location.href = url.href;
      });
    },
    true
  );
})();
