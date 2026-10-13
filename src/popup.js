const DEFAULTS = {
  enabled: true,
  rate: 20,
  chessGate: true,
  languages: LANGUAGES.map((l) => l.code),
};

const enabledEl = document.getElementById("enabled");
const chessGateEl = document.getElementById("chessGate");
const rateEl = document.getElementById("rate");
const rateValueEl = document.getElementById("rateValue");
const languagesEl = document.getElementById("languages");

browser.storage.local.get(DEFAULTS).then((settings) => {
  enabledEl.checked = settings.enabled;
  chessGateEl.checked = settings.chessGate;
  rateEl.value = settings.rate;
  rateValueEl.textContent = settings.rate;

  for (const lang of LANGUAGES) {
    const label = document.createElement("label");
    const box = document.createElement("input");
    box.type = "checkbox";
    box.value = lang.code;
    box.checked = settings.languages.includes(lang.code);
    box.addEventListener("change", saveLanguages);
    label.append(box, lang.name);
    languagesEl.append(label);
  }
});

function saveLanguages() {
  const languages = [...languagesEl.querySelectorAll("input:checked")].map((b) => b.value);
  browser.storage.local.set({ languages });
}

enabledEl.addEventListener("change", () => {
  browser.storage.local.set({ enabled: enabledEl.checked });
});

chessGateEl.addEventListener("change", () => {
  browser.storage.local.set({ chessGate: chessGateEl.checked });
});

rateEl.addEventListener("input", () => {
  rateValueEl.textContent = rateEl.value;
});
rateEl.addEventListener("change", () => {
  browser.storage.local.set({ rate: Number(rateEl.value) });
});

document.getElementById("reshuffle").addEventListener("click", async () => {
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  browser.tabs.sendMessage(tab.id, { type: "reshuffle" }).catch(() => {});
});
