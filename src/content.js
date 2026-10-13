(() => {
  const DEFAULTS = {
    enabled: true,
    rate: 20, // percent of dictionary words that get swapped
    languages: LANGUAGES.map((l) => l.code),
  };

  const SKIP_TAGS = new Set([
    "SCRIPT", "STYLE", "NOSCRIPT", "TEXTAREA", "INPUT", "SELECT", "OPTION",
    "CODE", "PRE", "KBD", "SAMP", "SVG", "MATH", "CANVAS", "IFRAME", "TITLE",
  ]);
  const SWAP_CLASS = "polyglot-shuffle-word";
  const WORD_RE = /[A-Za-z]+(?:['’][A-Za-z]+)?/g;
  const LANG_NAMES = Object.fromEntries(LANGUAGES.map((l) => [l.code, l.name]));

  let settings = { ...DEFAULTS };
  let observer = null;

  // Rough English stemming: try the word as-is, then strip common endings.
  // Translations end up a little off ("running" -> "correr"), which is fine.
  function candidates(lower) {
    const out = [lower];
    const stem = (suffix, ...replacements) => {
      if (lower.length > suffix.length + 2 && lower.endsWith(suffix)) {
        const base = lower.slice(0, -suffix.length);
        for (const r of replacements) out.push(base + r);
        // doubled consonant: "running" -> "run", "stopped" -> "stop"
        if (base.length > 2 && base.at(-1) === base.at(-2)) out.push(base.slice(0, -1));
      }
    };
    stem("'s", "");
    stem("ies", "y");
    stem("es", "");
    stem("s", "");
    stem("ing", "", "e");
    stem("ied", "y");
    stem("ed", "", "e");
    stem("ly", "");
    stem("er", "", "e");
    stem("est", "", "e");
    return out;
  }

  function lookup(word) {
    const lower = word.toLowerCase().replace(/’/g, "'");
    for (const c of candidates(lower)) {
      if (DICTIONARY[c]) return DICTIONARY[c];
    }
    return null;
  }

  function matchCase(original, translated) {
    if (original.length > 1 && original === original.toUpperCase()) {
      return translated.toUpperCase();
    }
    if (original[0] === original[0].toUpperCase()) {
      return translated[0].toUpperCase() + translated.slice(1);
    }
    return translated;
  }

  function shouldSkip(node) {
    for (let el = node.parentElement; el; el = el.parentElement) {
      if (SKIP_TAGS.has(el.tagName)) return true;
      if (el.isContentEditable) return true;
      if (el.classList.contains(SWAP_CLASS)) return true;
    }
    return false;
  }

  function processTextNode(node) {
    const text = node.nodeValue;
    if (!text || !/[A-Za-z]/.test(text) || shouldSkip(node)) return;

    const rate = settings.rate / 100;
    let lastIndex = 0;
    let frag = null;

    for (const match of text.matchAll(WORD_RE)) {
      const word = match[0];
      const entry = lookup(word);
      if (!entry || Math.random() >= rate) continue;

      const lang = settings.languages[Math.floor(Math.random() * settings.languages.length)];
      const translated = entry[lang];
      if (!translated) continue;

      frag ??= document.createDocumentFragment();
      frag.append(text.slice(lastIndex, match.index));

      const span = document.createElement("span");
      span.className = SWAP_CLASS;
      span.dataset.original = word;
      span.dataset.lang = lang;
      span.title = `${word} → ${LANG_NAMES[lang]}`;
      span.textContent = matchCase(word, translated);
      frag.append(span);

      lastIndex = match.index + word.length;
    }

    if (frag) {
      frag.append(text.slice(lastIndex));
      node.replaceWith(frag);
    }
  }

  function processTree(root) {
    if (!settings.enabled || settings.languages.length === 0) return;
    if (root.nodeType === Node.TEXT_NODE) {
      processTextNode(root);
      return;
    }
    if (root.nodeType !== Node.ELEMENT_NODE || SKIP_TAGS.has(root.tagName)) return;

    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(processTextNode);
  }

  function restoreAll() {
    document.querySelectorAll(`.${SWAP_CLASS}`).forEach((span) => {
      span.replaceWith(document.createTextNode(span.dataset.original));
    });
    document.body?.normalize();
  }

  function startObserver() {
    if (observer) return;
    observer = new MutationObserver((mutations) => {
      observer.disconnect();
      for (const m of mutations) {
        m.addedNodes.forEach(processTree);
      }
      observer.observe(document.body, { childList: true, subtree: true });
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  function stopObserver() {
    observer?.disconnect();
    observer = null;
  }

  function apply() {
    stopObserver();
    restoreAll();
    if (settings.enabled && settings.languages.length > 0) {
      processTree(document.body);
      startObserver();
    }
  }

  browser.storage.local.get(DEFAULTS).then((stored) => {
    settings = stored;
    apply();
  });

  browser.storage.onChanged.addListener((changes, area) => {
    if (area !== "local") return;
    const relevant = Object.keys(changes).filter((key) => key in DEFAULTS);
    if (relevant.length === 0) return;
    for (const key of relevant) settings[key] = changes[key].newValue;
    apply();
  });

  browser.runtime.onMessage.addListener((msg) => {
    if (msg?.type === "reshuffle") apply();
  });
})();
