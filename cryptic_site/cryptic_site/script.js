(() => {
  "use strict";

  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));

  const state = {
    keys: new Set(JSON.parse(localStorage.getItem("lost_signal_keys") || "[]")),
    logsRecovered: Number(localStorage.getItem("lost_signal_logs") || 0),
    panic: Number(localStorage.getItem("lost_signal_panic") || 0),
    finalOpened: localStorage.getItem("lost_signal_final") === "true",
  };

  const KEY_NAMES = ["LANTERN", "STATIC", "HOLLOW", "MIRROR", "OBSERVER"];
  const runes = ["◇", "⌁", "◌", "⟡", "⌬"];
  const bootLines = [
    "connecting to /lost_signal/ ...",
    "handshake failed.",
    "trying again from the wrong side.",
    "extracting damaged archive [██░░░░░░░░] 21%",
    "extracting damaged archive [████░░░░░░] 42%",
    "extracting damaged archive [███████░░░] 73%",
    "extracting damaged archive [██████████] 100%",
    "warning: visitor signature already present.",
    "warning: door_17 renamed itself.",
    "note: this website uses localStorage to remember puzzle progress.",
    "",
    "You are earlier than expected."
  ];

  const logEntries = [
    "[00:00:17] Archive mounted. The dust moved first.",
    "[00:02:03] Visitor detected. No entrance event recorded.",
    "[00:04:44] Audio file contains three clean tones: 12 / 1 / 14.",
    "[00:06:01] An operator wrote LANTERN on the underside of the table.",
    "[00:07:31] Mirror subsystem rejected forward-facing language.",
    "[00:09:10] Binary fragment recovered: 01010011 01010100 01000001 01010100 01001001 01000011",
    "[00:10:52] The coordinates are not coordinates. They are a sentence wearing numbers.",
    "[00:12:27] Redactions weaken when observed directly.",
    "[00:13:59] Door 17 requires five names and one phrase.",
    "[00:17:17] FINAL PHRASE FORMAT: the ___ never ___",
    "[00:19:04] Somebody typed OBSERVER before there was a keyboard.",
    "[00:21:00] The page blinked. Nobody else noticed."
  ];

  const folderText = {
    audio: `AUDIO_LOG_03\n\nThe recording is mostly static. Beneath it, three tones repeat.\n\n12 / 1 / 14\n\nA = 1. Z = 26.\n\n[play tones]`,
    coordinates: `COORDINATES.DAT\n\n44.0000, -17.0000\n08.0000, -15.0000\n12.0000, -12.0000\n15.0000, -23.0000\n\nThese are not places. Convert the positive numbers into letters. Read what remains after the minus signs are ignored.`,
    missing: `MISSING_PAGES\n\npage_1: You cannot leave through the entrance.\npage_2: The key is HOLLOW.\npage_3: When the site asks who watched first, answer OBSERVER.\n\nThere is a sentence split between the logs and the oldest version.`,
    redacted: `INCIDENT_REPORT_17\n\nThe visitor arrived with no shadow. The operator asked, "Who sent you?"\n\nThe visitor answered: <span class="redacted">MIRROR</span>\n\nThe operator redacted the word, but forgot redactions are afraid of cursors.`,
    version0: `VERSION_0\n\nThere was no homepage. There was only a sentence:\n\n"The first visitor never left."\n\nThen the sentence learned to pretend it was a website.`,
    observer: `OBSERVER FIELD NOTES\n\nYou collected every key. That means the archive was not hiding from you.\nIt was teaching you how to knock.\n\nType the final phrase into Door 17. The phrase is old, obvious, and waiting.`
  };

  const terminalIntro = [
    "lost_signal terminal v0.17",
    "Type HELP. Do not type your real secrets here. This is just a spooky toy.",
    ""
  ];

  function persist() {
    localStorage.setItem("lost_signal_keys", JSON.stringify([...state.keys]));
    localStorage.setItem("lost_signal_logs", String(state.logsRecovered));
    localStorage.setItem("lost_signal_panic", String(state.panic));
    localStorage.setItem("lost_signal_final", String(state.finalOpened));
  }

  function addKey(key) {
    const normalized = key.toUpperCase();
    if (!KEY_NAMES.includes(normalized)) return false;
    if (!state.keys.has(normalized)) {
      state.keys.add(normalized);
      toast(`KEY ACQUIRED: ${normalized}`);
      writeTerm(`\n[archive] key accepted: ${normalized}\n`);
      persist();
      updateStatus();
      return true;
    }
    return false;
  }

  function updateStatus() {
    $("#keyCount").textContent = `${state.keys.size}/5`;
    $("#signalStrength").textContent = `${17 + state.keys.size * 16}%`;
    const phases = ["UNSEEN", "LISTENING", "REMEMBERING", "KNOCKING", "OPENING", "INSIDE"];
    $("#phaseName").textContent = phases[Math.min(state.keys.size, phases.length - 1)];
    renderRunes();
  }

  function toast(message) {
    const el = $("#toast");
    el.textContent = message;
    el.classList.remove("hidden");
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => el.classList.add("hidden"), 2800);
  }

  function modal(html) {
    $("#modalContent").innerHTML = html;
    $("#modal").classList.remove("hidden");
  }

  function closeModal() {
    $("#modal").classList.add("hidden");
  }

  function sessionId() {
    let id = localStorage.getItem("lost_signal_session");
    if (!id) {
      id = `visitor-${Math.random().toString(16).slice(2, 6)}-${Date.now().toString(36).slice(-4)}`;
      localStorage.setItem("lost_signal_session", id);
    }
    $("#sessionId").textContent = id;
  }

  function boot() {
    const output = $("#bootText");
    let i = 0;
    const timer = setInterval(() => {
      output.textContent += bootLines[i] + "\n";
      i++;
      if (i >= bootLines.length) {
        clearInterval(timer);
        $("#enterBtn").classList.remove("hidden");
      }
    }, 190);
  }

  function enterArchive() {
    $("#boot").classList.add("hidden");
    $("#app").classList.remove("hidden");
    updateStatus();
    drawConstellations();
  }

  function switchPanel(name) {
    $$(".nav button").forEach(btn => btn.classList.toggle("active", btn.dataset.panel === name));
    $$(".panel").forEach(panel => panel.classList.toggle("active", panel.id === name));
    history.replaceState(null, "", `#${name}`);
  }

  function openFolder(name) {
    if (name === "missing" && !state.keys.has("LANTERN")) {
      toast("Missing key: LANTERN");
      $("#folderOutput").textContent = "The folder warms under your cursor but refuses to open.";
      return;
    }
    if (name === "observer" && state.keys.size < 5) {
      toast("Missing final clearance");
      $("#folderOutput").textContent = "The observer folder is looking back. It wants all five keys.";
      return;
    }
    let html = folderText[name] || "No file.";
    if (name === "audio") {
      html += `\n\n<button id="playTones">play tones</button>`;
      addKey("LANTERN");
    }
    if (name === "coordinates") addKey("HOLLOW");
    if (name === "redacted") addKey("MIRROR");
    if (name === "version0") {
      html += `\n\n<span class="click-clue" id="versionClue">touch the oldest sentence</span>`;
    }
    $("#folderOutput").innerHTML = html;
    const play = $("#playTones");
    if (play) play.addEventListener("click", playTones);
    const versionClue = $("#versionClue");
    if (versionClue) versionClue.addEventListener("click", () => {
      addKey("OBSERVER");
      modal(`<h2>The Oldest Sentence</h2><p>The sentence is not a clue anymore. It is a witness.</p><p><strong>the first visitor never left</strong></p>`);
    });
  }

  function playTones() {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const freqs = [523.25, 659.25, 783.99];
    freqs.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, ctx.currentTime + idx * .35);
      gain.gain.linearRampToValueAtTime(.15, ctx.currentTime + idx * .35 + .03);
      gain.gain.exponentialRampToValueAtTime(.001, ctx.currentTime + idx * .35 + .28);
      osc.connect(gain).connect(ctx.destination);
      osc.start(ctx.currentTime + idx * .35);
      osc.stop(ctx.currentTime + idx * .35 + .3);
    });
    toast("12 / 1 / 14 = LAN");
  }

  function recoverLog() {
    if (state.logsRecovered < logEntries.length) state.logsRecovered++;
    persist();
    renderLogs();
    if (state.logsRecovered >= 6) addKey("STATIC");
  }

  function renderLogs(scramble = false) {
    const visible = logEntries.slice(0, state.logsRecovered);
    const text = visible.map(line => scramble ? line.split("").sort(() => Math.random() - .5).join("") : line).join("\n");
    $("#logBox").textContent = text || "No entries recovered yet.";
  }

  function writeTerm(text) {
    const out = $("#termOut");
    out.textContent += text;
    out.scrollTop = out.scrollHeight;
  }

  function runCommand(raw) {
    const input = raw.trim();
    if (!input) return;
    const [cmd, ...rest] = input.split(/\s+/);
    const arg = rest.join(" ");
    writeTerm(`> ${input}\n`);

    switch (cmd.toLowerCase()) {
      case "help":
        writeTerm("Commands:\n  scan - inspect archive weaknesses\n  keys - list collected keys\n  open [word] - submit a key word\n  say [phrase] - speak to Door 17\n  clear - clear terminal\n  source - a reminder about hidden comments\n");
        break;
      case "scan":
        writeTerm("scan complete:\n- audio folder leaks LANTERN\n- logs hide STATIC\n- coordinates spell HOLLOW\n- redactions reveal MIRROR\n- oldest sentence awakens OBSERVER\n");
        break;
      case "keys":
        writeTerm(`keys: ${[...state.keys].join(", ") || "none"}\n`);
        break;
      case "open":
        if (!arg) writeTerm("open what?\n");
        else if (addKey(arg)) writeTerm("the archive accepts the word.\n");
        else writeTerm("nothing opens.\n");
        break;
      case "say":
        if (arg.toLowerCase() === "the first visitor never left") openFinal();
        else writeTerm("the door heard you, but did not recognize the sentence.\n");
        break;
      case "source":
        writeTerm("Not every clue is visible on the page. Some live in comments, titles, storage, and behavior.\n");
        break;
      case "clear":
        $("#termOut").textContent = "";
        break;
      default:
        writeTerm(`unknown command: ${cmd}\n`);
    }
  }

  function mirrorCheck() {
    const value = $("#mirrorInput").value.trim();
    const reversed = value.split("").reverse().join("");
    const output = $("#mirrorOutput");
    if (!value) {
      output.textContent = "The glass is waiting.";
      return;
    }
    if (reversed.toLowerCase().includes("help")) {
      output.innerHTML = "The mirror helps only once: <strong>MIRROR</strong>";
      addKey("MIRROR");
    } else if (reversed.toLowerCase().includes("observer")) {
      output.textContent = "The observer was here before the reflection.";
      addKey("OBSERVER");
    } else {
      output.textContent = reversed;
    }
  }

  function decode(kind) {
    const input = $("#cipherInput").value.trim();
    let output = "";
    if (kind === "clean") {
      $("#cipherInput").value = "";
      $("#cipherOutput").textContent = "";
      return;
    }
    if (!input) {
      $("#cipherOutput").textContent = "Nothing to decode.";
      return;
    }
    if (kind === "reverse") output = input.split("").reverse().join("");
    if (kind === "binary") {
      output = input.split(/\s+/).map(bin => {
        const n = parseInt(bin, 2);
        return Number.isFinite(n) ? String.fromCharCode(n) : "?";
      }).join("");
      if (output.toUpperCase().includes("STATIC")) addKey("STATIC");
    }
    if (kind === "caesar") {
      output = input.replace(/[a-z]/gi, ch => {
        const base = ch <= "Z" ? 65 : 97;
        return String.fromCharCode(((ch.charCodeAt(0) - base - 7 + 26) % 26) + base);
      });
    }
    $("#cipherOutput").textContent = output;
    ["LANTERN", "STATIC", "HOLLOW", "MIRROR", "OBSERVER"].forEach(k => {
      if (output.toUpperCase().includes(k)) addKey(k);
    });
  }

  function renderRunes() {
    const wrap = $("#runes");
    wrap.innerHTML = "";
    KEY_NAMES.forEach((key, i) => {
      const div = document.createElement("div");
      div.className = `rune ${state.keys.has(key) ? "lit" : ""}`;
      div.title = key;
      div.textContent = runes[i];
      wrap.appendChild(div);
    });
  }

  function knock() {
    const phrase = $("#doorPhrase").value.trim().toLowerCase();
    if (state.keys.size < 5) {
      $("#doorOutput").textContent = "The door counts the empty spaces between your keys.";
      document.body.classList.add("shake");
      setTimeout(() => document.body.classList.remove("shake"), 900);
      return;
    }
    if (phrase === "the first visitor never left") openFinal();
    else $("#doorOutput").textContent = "Wrong sentence. The door becomes a wall again.";
  }

  function openFinal() {
    state.finalOpened = true;
    persist();
    addKey("OBSERVER");
    switchPanel("door");
    $("#doorOutput").innerHTML = `
      <h3>DOOR 17 OPENED</h3>
      <p>You expected an ending. The archive expected a witness.</p>
      <p>Inside the door is another copy of the homepage, already loaded, already waiting.</p>
      <p class="blink">Refresh the page. It will remember you.</p>
    `;
    modal(`<h2>YOU ARE NOW PART OF THE ARCHIVE</h2><p>Final phrase accepted:</p><p><strong>the first visitor never left</strong></p><p>Secret dev note: this is still just HTML, CSS, and JavaScript. But it is pretending very hard.</p>`);
  }

  function panic() {
    state.panic++;
    persist();
    const messages = [
      "That button was decorative.",
      "Stop pressing the wound.",
      "The signal noticed.",
      "Fine. It gives you nothing.",
      "Actually, it gives you a clue: binary likes groups of eight."
    ];
    toast(messages[Math.min(state.panic - 1, messages.length - 1)]);
    if (state.panic >= 5) {
      $("#cipherInput").value = "01010011 01010100 01000001 01010100 01001001 01000011";
      switchPanel("decoder");
    }
  }

  function tickClock() {
    const now = new Date();
    const fake = new Date(now.getTime() - 17 * 60 * 1000);
    $("#clock").textContent = fake.toLocaleTimeString([], { hour12: false });
  }

  function ticker() {
    const items = [
      "the page remembers where you stopped.",
      "hover over black lines.",
      "binary likes groups of eight.",
      "the mirror does not read forward.",
      "type scan in the terminal.",
      "the final sentence is old."
    ];
    let i = 0;
    setInterval(() => {
      i = (i + 1) % items.length;
      $("#ticker").textContent = items[i];
    }, 4200);
  }

  function noise() {
    const canvas = $("#noiseCanvas");
    const ctx = canvas.getContext("2d");
    function resize() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }
    function draw() {
      const image = ctx.createImageData(canvas.width, canvas.height);
      const data = image.data;
      for (let i = 0; i < data.length; i += 4) {
        const v = Math.random() * 255;
        data[i] = v;
        data[i + 1] = v;
        data[i + 2] = v;
        data[i + 3] = 18;
      }
      ctx.putImageData(image, 0, 0);
      setTimeout(() => requestAnimationFrame(draw), 80);
    }
    resize();
    window.addEventListener("resize", resize);
    draw();
  }

  function drawConstellations() {
    const canvas = $("#constellationCanvas");
    const ctx = canvas.getContext("2d");
    const points = Array.from({ length: 70 }, () => ({ x: Math.random(), y: Math.random(), vx: (Math.random() - .5) * .0005, vy: (Math.random() - .5) * .0005 }));
    function resize() { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
    function frame() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      points.forEach(p => {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0 || p.x > 1) p.vx *= -1;
        if (p.y < 0 || p.y > 1) p.vy *= -1;
      });
      for (let i = 0; i < points.length; i++) {
        for (let j = i + 1; j < points.length; j++) {
          const a = points[i], b = points[j];
          const dx = (a.x - b.x) * canvas.width;
          const dy = (a.y - b.y) * canvas.height;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < 130) {
            ctx.globalAlpha = (130 - d) / 450;
            ctx.beginPath();
            ctx.moveTo(a.x * canvas.width, a.y * canvas.height);
            ctx.lineTo(b.x * canvas.width, b.y * canvas.height);
            ctx.strokeStyle = "#71ffe4";
            ctx.stroke();
          }
        }
      }
      ctx.globalAlpha = .55;
      points.forEach(p => {
        ctx.fillStyle = "#d5fff8";
        ctx.fillRect(p.x * canvas.width, p.y * canvas.height, 1.4, 1.4);
      });
      ctx.globalAlpha = 1;
      requestAnimationFrame(frame);
    }
    resize();
    window.addEventListener("resize", resize);
    frame();
  }

  function bind() {
    $("#enterBtn").addEventListener("click", enterArchive);
    $$(".nav button").forEach(btn => btn.addEventListener("click", () => switchPanel(btn.dataset.panel)));
    $$(".folder").forEach(folder => folder.addEventListener("click", () => openFolder(folder.dataset.folder)));
    $("#addLog").addEventListener("click", recoverLog);
    $("#scrambleLogs").addEventListener("click", () => renderLogs(true));
    $("#termInput").addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        runCommand(e.target.value);
        e.target.value = "";
      }
    });
    $("#mirrorInput").addEventListener("input", mirrorCheck);
    $$("[data-decode]").forEach(btn => btn.addEventListener("click", () => decode(btn.dataset.decode)));
    $("#doorBtn").addEventListener("click", knock);
    $("#panicBtn").addEventListener("click", panic);
    $("#closeModal").addEventListener("click", closeModal);
    $("#modal").addEventListener("click", (e) => { if (e.target.id === "modal") closeModal(); });
    document.addEventListener("keydown", (e) => {
      if (e.ctrlKey && e.key.toLowerCase() === "k") {
        e.preventDefault();
        switchPanel("terminal");
        $("#termInput").focus();
        toast("terminal focused");
      }
    });
  }

  function init() {
    sessionId();
    bind();
    boot();
    noise();
    renderLogs();
    writeTerm(terminalIntro.join("\n"));
    tickClock();
    setInterval(tickClock, 1000);
    ticker();
    if (location.hash) {
      const panel = location.hash.slice(1);
      if ($(`#${panel}`)) setTimeout(() => switchPanel(panel), 100);
    }
    window.LOST_SIGNAL = {
      keys: () => [...state.keys],
      reset: () => { localStorage.clear(); location.reload(); },
      whisper: "open lantern, static, hollow, mirror, observer"
    };
  }

  init();
})();
