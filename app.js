(() => {
  "use strict";

  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];

  /* ---------- State ---------- */
  const initial = () => ({
    // Onboarding
    first: "",
    last: "",
    status: null,
    photo: false,
    income: "",
    priority: null,
    debt: "5.000.000",
    debtFreq: "Bulanan",
    debtRate: "1.5",
    debtMonths: "10",
    ratioA: "rec",
    ratioB: null,
    custom: [0, 0, 0],
    pet: "kucing",
    petName: "Bucky",
    limit: null,
    leftover: "",
    limitManual: "",
    pinDraft: "",
    // Dashboard
    awake: false,
    hideSaldo: false,
    txCount: 3,
    txType: "out",
    txCat: "nongkrong",
    txAmount: "85.000",
    txNote: "Nongkrong kafe",
    pocket: "Gaya Hidup",
    simTotal: "3.000.000",
    simTenor: "12",
    // Tantangan
    goalName: "",
    goalAmount: "",
    goalDate: "",
    // Riwayat: filter terpasang + draf di dalam sheet
    rw: { jenis: null, tanggal: null, kategori: [], kantong: null, from: "2026-09-22", to: "2026-09-23" },
    dJenis: null,
    dTanggal: null,
    dKategori: [],
    dKantong: null,
    dFrom: "2026-09-22",
    dTo: "2026-09-23",
    // Pengaturan
    akun: "awal", // awal → ubah (Google dihubungkan, belum disimpan) → simpan
    ratio: "seimbang", // rasio tersimpan
    limitDaily: 50000,
    dRatio: "seimbang", // draf di Preferensi Finansial
    dLimit: 50000,
    dLimitPick: "50000",
    kalOpt: "darurat",
    notif: true,
    nWaktu: true,
    nTantangan: true,
    nRefleksi: true,
    bio: true,
    // Lemari maskot: satu item per jenis
    worn: { baju: null, kalung: null, bantal: null },
    petiStep: "tutup", // tutup → buka → hadiah
    petiClaimed: false, // hadiah sudah diambil → banner Tantangan hilang (frame 797:5008)
  });

  let state = initial();
  let stack = ["get-ready"];
  let pinBuffer = "";

  const toNum = (s) => Number(String(s ?? "").replace(/\D/g, "")) || 0;
  const rupiah = (n) => n.toLocaleString("id-ID");
  const sum = (arr) => arr.reduce((a, b) => a + b, 0);
  const branch = () => (state.priority === "PI" || state.priority === "SH" ? "B" : "A");
  const incomeValue = () => toNum(state.income) || 7500000;
  const isPin = (id) => id === "pin-create" || id === "pin-confirm";

  // Urutan penutup: Tantangan → Ready! → Buat PIN → Konfirmasi PIN → Dashboard
  const NEXT = {
    "get-ready": () => "profile",
    profile: () => "income",
    income: () => "priority",
    priority: () => (branch() === "A" ? "debt" : "ratio"),
    debt: () => "ratio-debt",
    "ratio-debt": () => (state.ratioA === "manual" ? "custom" : "summary-a"),
    ratio: () => (state.ratioB === "manual" ? "custom" : "summary-b"),
    custom: () => (branch() === "A" ? "summary-a" : "summary-b"),
    "summary-a": () => "companion",
    "summary-b": () => "companion",
    companion: () => "challenge",
    challenge: () => "done",
    done: () => "pin-create",
    "pin-create": () => "pin-confirm",
  };

  const VALID = {
    profile: () => state.first.trim() && state.status,
    income: () => toNum(state.income) > 0,
    priority: () => !!state.priority,
    debt: () => toNum(state.debt) > 0 && toNum(state.debtMonths) > 0,
    "ratio-debt": () => !!state.ratioA,
    ratio: () => !!state.ratioB,
    custom: () => sum(state.custom) === 100,
    companion: () => state.pet && state.petName.trim(),
  };

  // Layar setelah onboarding: dashboard jadi akar, onboarding tidak bisa dikembalikan
  const APP_PATHS = {
    dash: ["dash"],
    tx: ["dash", "tx"],
    debts: ["dash", "debts"],
    motor: ["dash", "debts", "motor"],
    sim: ["dash", "debts", "sim"],
    tantangan: ["tantangan"],
    pencapaian: ["tantangan", "pencapaian"],
    rekap: ["tantangan", "rekap"],
    riwayat: ["riwayat"],
    pengaturan: ["pengaturan"],
    akun: ["pengaturan", "akun"],
    preferensi: ["pengaturan", "preferensi"],
    kalibrasi: ["pengaturan", "preferensi", "kalibrasi"],
    lemari: ["dash", "lemari"],
    peti: ["dash", "peti"],
  };

  // Lemari: urutan & potongan sprite persis frame 797:7204 — crop = [lebar, tinggi, kiri, atas] dalam %
  const LEMARI = [
    { id: "sweater", name: "Sweater Biru", slot: "baju", src: "items-sheet.png", w: 53, h: 52, crop: [512.59, 292.61, -2.06, -14.2] },
    { id: "rompi", name: "Rompi Hijau", slot: "baju", src: "items-sheet.png", w: 45, h: 46, crop: [673.68, 374.46, -135.31, -30.31] },
    { id: "kemeja", name: "Kemeja Merah", slot: "baju", src: "items-sheet.png", w: 53, h: 53, crop: [581.82, 325, -210.49, -25.05] },
    { id: "kalungHijau", name: "Kalung Hijau", slot: "kalung", src: "items-sheet.png", w: 53, h: 53, crop: [701.37, 394.48, -475.34, -40.69] },
    { id: "kalungOranye", name: "Kalung Oranye", slot: "kalung", src: "items-sheet.png", w: 53, h: 63, crop: [664.94, 312.57, -354.2, -24.04] },
    { id: "kalungMerah", name: "Kalung Merah", slot: "kalung", src: "item-kalung-merah.png", w: 53, h: 64, crop: [215.69, 100, -57.8, 2.42] },
    { id: "bantalKuning", name: "Bantal Kuning", slot: "bantal", src: "pillows-sheet.png", w: 50, h: 53, crop: [123.98, 302.96, -12.52, 1.89] },
    { id: "bantalOranye", name: "Bantal Oranye", slot: "bantal", src: "pillows-sheet.png", w: 53, h: 57, crop: [123.26, 302.96, -12.62, -218.76] },
    // Figma menumpuk dua potongan untuk Bantal Teal; dua-duanya dipasang
    { id: "bantalTeal", name: "Bantal Teal", slot: "bantal", src: "pillows-sheet.png", w: 53, h: 58, crop: [100, 302.96, -0.04, -78.42], crop2: [126.19, 302.96, -13.14, -78.42] },
    { id: "bantalAbu", name: "Bantal Abu-Abu", slot: "bantal", src: "pillows-sheet.png", w: 53, h: 57, crop: [123.26, 302.96, -11.4, -151.36] },
  ];
  const SLOT_ORDER = ["baju", "kalung", "bantal"];
  // Kucing di hero: polos (image 13) atau berbaju (image 20 = tiga kucing sejajar dalam satu gambar)
  const CAT_PLAIN = { src: "cat-awake.png", w: 219, h: 150, crop: [114.96, 101.95, -8.43, -1.95] };
  const CAT_DRESSED = {
    sweater: { src: "cat-dressed.png", w: 149, h: 150, crop: [305.67, 169.23, 0, -42.9] },
    rompi: { src: "cat-dressed.png", w: 149, h: 150, crop: [305.67, 169.23, -101.05, -42.9] },
    kemeja: { src: "cat-dressed.png", w: 149, h: 150, crop: [305.67, 169.23, -202.09, -42.9] },
  };
  const LM_STEP = 352; // 4 kolom × 76 + 4 celah × 12
  let petiTimer = null;

  // Rasio di Pengaturan. Angka frame memakai basis Rp 7.500.000 (50% = Rp 3.750.000)
  // walau labelnya "Basis Rp 5.000.000"; plafon harian = jatah Gaya Hidup ÷ 30.
  const RATIOS = {
    seimbang: { name: "Keuangan Seimbang", pct: [50, 30, 20] },
    darurat: { name: "Perkuat Dana Darurat", pct: [50, 20, 30] },
    impian: { name: "Bikin Tabungan Impian", pct: [50, 10, 40] },
    santai: { name: "Longgarkan Alokasi Santai", pct: [50, 40, 10] },
  };
  const RATIO_BASE = 7500000;
  const RATIO_ROWS = [
    { label: "Kebutuhan & Pokok", desc: "Cicilan prioritas, belanja dapur, & sewa", bar: "#2656ff", pct: "#1633a8", dot: "#2656ff", ink: "#1633a8" },
    { label: "Gaya Hidup", desc: "Ngopi santai, jajan harian, & hiburan", bar: "#d98c2b", pct: "#8a5a15", dot: "#d97706", ink: "#bc6f03" },
    { label: "Tabungan & Investasi", desc: "Dana darurat bertahap & reksadana/emas", bar: "#2f6b57", pct: "#2f6b57", dot: "#059669", ink: "#065f46" },
  ];
  const LIMIT_PICKS = ["25000", "50000", "75000"];
  const dailyCap = (key) => (RATIO_BASE * RATIOS[key].pct[1]) / 100 / 30;

  const POCKET = {
    Kebutuhan: { tint: "#fbf0dc", dot: "assets/dot-needs.svg" },
    "Gaya Hidup": { tint: "#edf1ff", dot: "assets/dot-kantong.svg" },
    Tabungan: { tint: "#e5f5e4", dot: "assets/dot-save.svg" },
  };

  // Lencana pencapaian: ukuran kotak gambar pada skala grid Tantangan (70,61 px)
  const BADGES = {
    langkah: { name: "Langkah Pertama", prog: "1 dari 1", on: true, img: "badge-langkah.png", svg: "badge-langkah.svg", w: 47.662, h: 47.662, crop: ["188.41%", "-49.68%", "-42.68%", "198.08%"] },
    kalibrasi: { name: "Kalibrasi Pertama", prog: "1 dari 1", on: true, img: "badge-kalibrasi.png", w: 44.082, h: 41.269, pl: 2.28, crop: ["234.09%", "-63.83%", "-66.67%", "219.15%"] },
    minggu: { name: "Minggu Pertama", prog: "1 dari 7", img: "badge-minggu.png", w: 38.002, h: 38.733, crop: ["100%", "-0.93%", "0", "101.86%"], desc: "Selesaikan Tantangan<br>Mingguan pertama kali" },
    rasio: { name: "Rasio Terjaga", prog: "0 dari 4", img: "badge-rasio.png", w: 49.403, h: 47.105 },
    pencatat: { name: "Pencatat Rutin", prog: "0 dari 30", img: "badge-pencatat.png", w: 41.042, h: 43.052 },
    impian: { name: "Impian Tercapai", prog: "0 dari 1", img: "badge-impian.png", w: 38, h: 33 },
    naik: { name: "Naik Kelas", prog: "0 dari 1", img: "badge-naik.png", w: 34, h: 38 },
    kolektor: { name: "Kolektor Hadiah", prog: "0 dari 10", img: "badge-kolektor.png", w: 47, h: 38, crop: ["124.07%", "0", "-11.1%", "100%"] },
  };
  const BADGE_ROW = ["langkah", "kalibrasi", "minggu", "rasio", "pencatat", "impian", "naik", "kolektor"];
  // Urutan halaman Pencapaian sesuai frame (termasuk lencana yang berulang)
  const BADGE_ALL = [...BADGE_ROW, "pencatat", "impian", "naik", "kolektor", "pencatat", "impian", "naik", "kolektor", "pencatat", "impian"];
  const STREAK_DAYS = [3, 6, 7, 10, 14, 18, 20, 21, 25, 27, 28, 29, 30];
  const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

  /* ---------- Riwayat: data transaksi dari frame 797:5869 ----------
     Kategori & kantong tiap baris diambil dari versi daftar di latar sheet (797:6066).
     Hari ini = 23 Sep 2026 (rentang "7 hari terakhir" di sheet Tanggal). */
  const RW_TODAY = "2026-09-23";
  const RW_YESTERDAY = "2026-09-22";
  const RW_RANGE = { 7: "2026-09-17", 30: "2026-08-25", 90: "2026-06-26" };
  const I18 = {
    uang: ["#e5f5e4", '<img src="assets/icon-uang.svg" width="18" height="18" alt="">'],
    bus: ["#fbf0dc", '<img src="assets/icon-bus.svg" width="18" height="18" alt="">'],
    nongkrong: ["#edf1ff", '<img src="assets/icon-nongkrong-18.svg" width="18" height="18" alt="">'],
    kopi: ["#edf1ff", '<span class="ic-kopi"><i style="left:2.6px;top:4.4px;width:10.8px;height:10.8px;border-radius:.8px .8px 3.9px 3.9px;background:#4a74ff"></i><i style="left:13.1px;top:6.2px;width:3.3px;height:4.4px;border-radius:1.5px;background:#4a74ff"></i><i style="left:4.1px;top:5.9px;width:7.7px;height:1.5px;border-radius:.8px;background:#edf1ff"></i></span>'],
    tagihan: ["#fbf0dc", '<span class="ic-kopi"><i style="left:2.83px;top:1.54px;width:12.343px;height:14.914px;border-radius:1.8px;background:#bc6f03"></i><i style="left:5.14px;top:5.14px;width:7.714px;height:1.543px;border-radius:.771px;background:#fbf0dc"></i><i style="left:5.14px;top:8.49px;width:7.714px;height:1.543px;border-radius:.771px;background:#fbf0dc"></i><i style="left:5.14px;top:11.83px;width:4.629px;height:1.543px;border-radius:.771px;background:#fbf0dc"></i></span>'],
    belanja: ["#edf1ff", '<span class="ic-kopi"><i style="left:1.54px;top:4.37px;width:14.914px;height:12.086px;border-radius:1.8px;background:#4a74ff"></i><i style="left:8.1px;top:4.37px;width:1.8px;height:12.086px;background:#edf1ff"></i><i style="left:1.54px;top:8.23px;width:14.914px;height:1.8px;background:#edf1ff"></i></span>'],
  };
  const RW_DATA = [
    { name: "Gaji Bulanan", amount: 9500000, date: RW_TODAY, icon: "uang" },
    { name: "Beli Kopi di Alsut", amount: -22500, date: RW_TODAY, cat: "jajan", pocket: "Gaya Hidup", icon: "kopi" },
    { name: "Bayar Parkir", amount: -5000, date: RW_TODAY, cat: "transport", pocket: "Kebutuhan", icon: "bus" },
    { name: "Bayar Tagihan Listrik", amount: -1200000, date: RW_YESTERDAY, cat: "tagihan", pocket: "Kebutuhan", icon: "tagihan" },
    { name: "Nonton Bioskop", amount: -50000, date: RW_YESTERDAY, cat: "nongkrong", pocket: "Gaya Hidup", icon: "nongkrong" },
    { name: "Proyek Freelance", amount: 2500000, date: "2026-09-15", icon: "uang" },
    { name: "Belanja Bulanan", amount: -150000, date: "2026-09-15", cat: "belanja", pocket: "Gaya Hidup", icon: "belanja" },
  ];
  let rwUser = []; // transaksi yang dicatat selama sesi prototipe

  function badgeHTML(key, { tag = "button", large = false } = {}) {
    const b = BADGES[key];
    const img = large && b.svg
      ? `<img class="is-cover" src="assets/${b.svg}" alt="">`
      : b.crop
        ? `<img src="assets/${b.img}" alt="" style="height:${b.crop[0]};left:${b.crop[1]};top:${b.crop[2]};width:${b.crop[3]}">`
        : `<img class="is-cover" src="assets/${b.img}" alt="">`;
    const pad = b.pl ? ` style="padding-left:calc(${b.pl}px * var(--k))"` : "";
    const attrs = tag === "button" ? ` type="button" data-badge="${key}" aria-label="${b.name}, ${b.prog}"` : "";
    return `<${tag} class="badge${b.on ? " is-unlocked" : ""}"${attrs}>` +
      `<span class="badge-circle"><span${pad}><span class="badge-img" style="--w:${b.w}px;--h:${b.h}px">${img}</span></span></span>` +
      `<span class="badge-text"><b>${b.name}</b><span>${b.prog}</span></span></${tag}>`;
  }

  /* ---------- Elemen ---------- */
  const viewport = $("#viewport");
  const screenEl = (id) => $(`.scr[data-screen="${id}"]`, viewport);
  const current = () => stack[stack.length - 1];

  /* ---------- Status bar (disuntik ke tiap layar) ---------- */
  $$("[data-sb]").forEach((el) => {
    const tone = el.dataset.sb;
    const icon = tone === "light" ? "light" : tone === "dash" ? "dash" : "dark";
    el.innerHTML =
      `<span class="sb-time">19:02</span>` +
      `<span class="sb-right">` +
      `<img src="assets/status-signal-${icon}.svg" width="16" height="12" alt="">` +
      `<span class="sb-lte">LTE</span>` +
      `<span class="sb-batt"><i></i></span>` +
      `</span>`;
  });

  /* ---------- Keypad angka iOS ---------- */
  const kbd = document.createElement("div");
  kbd.className = "kbd";
  kbd.setAttribute("aria-label", "Keypad angka");
  const KEYS = [
    ["1", ""], ["2", "ABC"], ["3", "DEF"],
    ["4", "GHI"], ["5", "JKL"], ["6", "MNO"],
    ["7", "PQRS"], ["8", "TUV"], ["9", "WXYZ"],
    [null], ["0", ""], ["del"],
  ];
  KEYS.forEach(([k, sub]) => {
    if (k === null) {
      kbd.appendChild(document.createElement("span"));
      return;
    }
    const b = document.createElement("button");
    b.type = "button";
    if (k === "del") {
      b.className = "key key--ghost";
      b.dataset.key = "del";
      b.setAttribute("aria-label", "Hapus");
      b.innerHTML =
        '<svg width="23" height="17" viewBox="0 0 23 17" fill="none" aria-hidden="true"><path d="M7.2 1h13.3A1.5 1.5 0 0 1 22 2.5v12a1.5 1.5 0 0 1-1.5 1.5H7.2a1.5 1.5 0 0 1-1.1-.5L1 8.5l5.1-7A1.5 1.5 0 0 1 7.2 1Z" stroke="#000" stroke-width="1.5" stroke-linejoin="round"/><path d="m11 5.5 6 6m0-6-6 6" stroke="#000" stroke-width="1.5" stroke-linecap="round"/></svg>';
    } else {
      b.className = "key";
      b.dataset.key = k;
      b.innerHTML = `<b>${k}</b>${sub ? `<small>${sub}</small>` : ""}`;
    }
    kbd.appendChild(b);
  });
  $("#kbdHost").replaceWith(kbd);

  /* ---------- Tantangan: lencana & kalender ---------- */
  $("#badgeGrid").innerHTML = BADGE_ROW.map((k) => badgeHTML(k)).join("");
  $("#badgeGridAll").innerHTML = BADGE_ALL.map((k) => badgeHTML(k, { large: true })).join("");
  // Chip kategori sheet Riwayat = kloning chip di Catat Transaksi (daftar kategori kanonik)
  $$("#txCats .cat-chip").forEach((chip) => {
    const c = chip.cloneNode(true);
    c.setAttribute("role", "checkbox");
    c.dataset.kcat = c.dataset.value;
    delete c.dataset.value;
    $("#rwCatGrid").appendChild(c);
  });

  $("#calGrid").innerHTML = Array.from({ length: 30 }, (_, i) => {
    const d = i + 1;
    if (d === 26) return `<span class="is-today"><i>${d}</i></span>`;
    return `<span${STREAK_DAYS.includes(d) ? ' class="is-streak"' : ""}>${d}</span>`;
  }).join("");

  /* ---------- Navigasi ---------- */
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let cleanupTimer = null;

  function finishTransition() {
    clearTimeout(cleanupTimer);
    $$(".scr", viewport).forEach((s) => {
      s.classList.remove("enter-fwd", "leave-fwd", "enter-back", "leave-back", "is-leaving");
    });
  }

  function closeLayers() {
    $$(".layer.is-open", viewport).forEach((l) => l.classList.remove("is-open"));
  }

  function openLayer(id) {
    closeLayers();
    $("#" + id).classList.add("is-open");
  }

  function show(id, dir) {
    finishTransition();
    closeLayers();
    const next = screenEl(id);
    const prev = $(".scr.is-active", viewport);
    if (prev === next) return;

    if (prev) prev.classList.remove("is-active");
    next.classList.add("is-active");

    if (prev && dir) {
      prev.classList.add("is-leaving", dir === "fwd" ? "leave-fwd" : "leave-back");
      next.classList.add(dir === "fwd" ? "enter-fwd" : "enter-back");
      cleanupTimer = setTimeout(finishTransition, reduceMotion.matches ? 200 : 400);
    }

    $("#screen").scrollTop = 0;
    if (dir !== "back") {
      const body = $(".scr-body, .app-body, .d-scroll", next);
      if (body) body.scrollTop = 0;
    }

    if (isPin(id)) {
      pinBuffer = "";
      if (id === "pin-create") state.pinDraft = "";
    }

    const title = $(".appbar-title, .app-header h1, .app-nav h1", next);
    if (title) {
      title.setAttribute("tabindex", "-1");
      title.focus({ preventScroll: true });
    }

    render();
  }

  function resetPref() {
    state.dRatio = state.ratio;
    state.dLimit = state.limitDaily;
    state.dLimitPick = LIMIT_PICKS.includes(String(state.dLimit)) ? String(state.dLimit) : "custom";
  }

  function push(id) {
    if (id === "peti") state.petiStep = "tutup";
    if (id === "preferensi") resetPref();
    if (id === "kalibrasi") state.kalOpt = state.dRatio === "seimbang" ? "darurat" : state.dRatio;
    stack.push(id);
    show(id, "fwd");
  }

  function goNext() {
    const id = current();
    if (VALID[id] && !VALID[id]()) return;
    const target = NEXT[id] && NEXT[id]();
    if (target) push(target);
  }

  function goBack() {
    if (stack.length < 2) return;
    stack.pop();
    show(current(), "back");
  }

  function popTo(id) {
    if (!stack.includes(id)) stack = APP_PATHS[id] || [id];
    while (current() !== id) stack.pop();
    show(id, "back");
  }

  function enterDashboard() {
    stack = ["dash"];
    show("dash", "fwd");
  }

  // Pindah tab: akar tumpukan diganti tanpa animasi geser, seperti tab bar iOS
  function switchTab(id) {
    if (stack.length === 1 && current() === id) return;
    stack = [id];
    show(id, null);
  }

  function pathTo(id) {
    if (APP_PATHS[id]) return APP_PATHS[id];
    const a = ["debt", "ratio-debt", ...(state.ratioA === "manual" ? ["custom"] : []), "summary-a"];
    const b = ["ratio", ...(state.ratioB === "manual" ? ["custom"] : []), "summary-b"];
    const full = [
      "get-ready", "profile", "income", "priority",
      ...(branch() === "A" ? a : b),
      "companion", "challenge", "done", "pin-create", "pin-confirm",
    ];
    const i = full.indexOf(id);
    return i >= 0 ? full.slice(0, i + 1) : [id];
  }

  function jump(id) {
    if (["debt", "ratio-debt", "summary-a"].includes(id) && branch() !== "A") state.priority = "TR";
    if (["ratio", "summary-b"].includes(id) && branch() !== "B") state.priority = "PI";
    if (id === "custom") {
      if (branch() === "A") state.ratioA = "manual";
      else state.ratioB = "manual";
    }
    if (id === "summary-a" && state.ratioA === "manual") state.ratioA = "rec";
    if (id === "summary-b" && state.ratioB !== "rec") state.ratioB = "rec";
    if (id === "preferensi" || id === "kalibrasi") resetPref();
    if (id === "peti") state.petiStep = "tutup";
    stack = pathTo(id);
    show(id, null);
  }

  /* ---------- Render ---------- */
  function syncInput(el, value) {
    if (el && el.value !== value && document.activeElement !== el) el.value = value;
  }

  function render() {
    const id = current();

    // Radio: satu sumber kebenaran untuk semua grup
    $$("[role=radio]", viewport).forEach((r) => {
      const group = r.dataset.groupItem || r.closest("[data-group]")?.dataset.group;
      const on = state[group] != null && String(state[group]) === r.dataset.value;
      r.classList.toggle("is-sel", on);
      r.setAttribute("aria-checked", String(on));
    });

    // Lengkapi Profile
    $("#avatarBtn").classList.toggle("has-photo", state.photo);
    syncInput($("#firstName"), state.first);
    syncInput($("#lastName"), state.last);

    // Pemasukan
    syncInput($("#incomeInput"), state.income);
    $("#incomeCard").classList.toggle("is-filled", toNum(state.income) > 0);

    // Cicilan
    syncInput($("#debtInput"), state.debt);
    syncInput($("#debtRate"), state.debtRate);
    syncInput($("#debtMonths"), state.debtMonths);
    $("#debtCard").classList.toggle("is-filled", toNum(state.debt) > 0);
    $("#debtInsight").innerHTML = debtInsight();

    // Rasio cabang B: dua keadaan frame
    const ratioState = state.ratioB === "rec" ? "rec" : "empty";
    $$('[data-screen="ratio"] [data-state]').forEach((el) => {
      el.classList.toggle("is-state", el.dataset.state === ratioState);
    });

    renderCustom();

    // Teman Finansial
    syncInput($("#petName"), state.petName);
    $("#petNameEcho").textContent = state.petName.trim() || "temanmu";
    $("#petLimit").textContent = branch() === "A" ? "Rp 50.000 " : "Rp 75.000 ";

    // Tantangan Mingguan
    const days = $("#days");
    days.classList.toggle("days--plan", !state.limit);
    days.classList.toggle("days--started", !!state.limit);
    const leftover = $("#leftover");
    leftover.value = state.leftover;
    leftover.classList.toggle("is-placeholder", !state.leftover);
    syncInput($("#limitManual"), state.limitManual);

    // PIN
    $$("[data-dots]").forEach((dots) => {
      const n = dots.closest(".scr").dataset.screen === id ? pinBuffer.length : 0;
      $$("i", dots).forEach((d, i) => d.classList.toggle("is-on", i < n));
      dots.setAttribute("aria-label", `${n} dari 6 angka`);
    });
    kbd.classList.toggle("is-on", isPin(id));

    // Dashboard
    $("#mascot").classList.toggle("is-awake", state.awake);
    $("#saldo").textContent = state.hideSaldo ? "Rp ••••••" : "Rp 5.356.063";
    $("#eyeBtn").setAttribute("aria-pressed", String(state.hideSaldo));
    $("#eyeBtn").setAttribute("aria-label", state.hideSaldo ? "Tampilkan saldo" : "Sembunyikan saldo");
    $("#streakTx").textContent = `${state.txCount} transaksi`;

    // Catat Transaksi
    syncInput($("#txAmount"), state.txAmount);
    syncInput($("#txNote"), state.txNote);
    $("#txCats").hidden = state.txType === "in";
    $("#pocketName").textContent = state.pocket;
    $("#pocketDot").src = POCKET[state.pocket].dot;
    $("#pocketSelect").value = state.pocket;
    $("#txSave").disabled = toNum(state.txAmount) === 0;

    renderSim();

    // Tantangan
    $("#tToday").className = `t-day ${state.awake ? "is-done" : "is-today"}`;
    $("#calStreak").textContent = state.awake ? "2 Hari" : "1 Hari";
    $("#calWeek").textContent = state.awake ? "2" : "1";
    syncInput($("#goalName"), state.goalName);
    syncInput($("#goalAmount"), state.goalAmount);
    const dateText = $("#goalDateText");
    dateText.textContent = state.goalDate ? formatDate(state.goalDate) : "Pilih Tanggal";
    dateText.classList.toggle("is-set", !!state.goalDate);
    const goalAmt = toNum(state.goalAmount);
    $("#goalEstimate").textContent = goalAmt ? estimateMonth(goalAmt, true) : "-";
    $("#goalSave").disabled = !(state.goalName.trim() && goalAmt);

    renderRiwayat();
    renderRwSheets();
    renderPengaturan();
    renderLemari();

    // Tombol Lanjut onboarding
    const btn = $(`.scr[data-screen="${id}"] [data-next]`);
    if (btn) btn.disabled = VALID[id] ? !VALID[id]() : false;
  }

  function debtInsight() {
    const P = toNum(state.debt);
    const r = parseFloat(String(state.debtRate).replace(",", ".")) || 0;
    const n = parseInt(state.debtMonths, 10) || 0;
    if (!P || !n) return "Isi jumlah cicilan dan sisa bulannya untuk melihat angsuran per bulan.";
    const monthly = Math.round(P / n + (P * r) / 100);
    const pct = (monthly / incomeValue()) * 100;
    const pctTxt = pct.toLocaleString("id-ID", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
    const verdict =
      pct < 20 ? "jauh di bawah batas wajar sekitar 30%." :
      pct <= 30 ? "masih di bawah batas wajar sekitar 30%." :
      "di atas batas wajar sekitar 30%.";
    return `Maka angsuran yang harus dibayar perbulan adalah <b>Rp ${rupiah(monthly)}</b> setara <b>${pctTxt}%</b> pemasukanmu, ${verdict}`;
  }

  const CUSTOM_PRESETS = ["50,30,20", "60,20,20", "50,20,30"];

  function renderCustom() {
    const root = $("#customPanel");
    const vals = state.custom;
    const total = sum(vals);
    const empty = total === 0;
    const income = incomeValue();

    root.classList.toggle("is-empty", empty);
    const chip = $("#customTotal");
    chip.textContent = `Total : ${total}%`;
    chip.classList.toggle("is-ok", total === 100);
    $("#customPresetsTitle").textContent = empty ? "Custom Rasio" : "Preset Rasio";

    const key = vals.join(",");
    $$("#customPresets [data-preset]").forEach((c) => {
      c.classList.toggle("is-sel", CUSTOM_PRESETS.includes(c.dataset.preset) && c.dataset.preset === key);
    });

    let left = 0;
    $$("#customBar > i").forEach((seg, i) => {
      const w = empty ? 100 / 3 : vals[i];
      seg.style.left = `${left}%`;
      seg.style.width = `${w}%`;
      left += w;
    });

    $$("#customLabels > div").forEach((col, i) => {
      $("b", col).textContent = `${vals[i]}%`;
      $("span", col).textContent = vals[i] ? `Rp${rupiah(Math.round((income * vals[i]) / 100))}` : "Rp 0";
    });

    $$("#customPanel .slider-item").forEach((item, i) => {
      const v = vals[i];
      const pct = $("[data-pct]", item);
      pct.textContent = i === 2 ? ` (${v}%)` : `(${v}%)`;
      $("[data-amt]", item).textContent = v ? `Rp ${rupiah(Math.round((income * v) / 100))}` : "Rp 0";
      const range = $(".range", item);
      if (Number(range.value) !== v) range.value = v;
      range.style.setProperty("--p", v / 100);
      range.setAttribute("aria-valuetext", `${v} persen`);
    });
  }

  function setCustom(i, v) {
    const others = sum(state.custom) - state.custom[i];
    state.custom[i] = Math.max(0, Math.min(100 - others, Math.round(v)));
    render();
  }

  /* ---------- Simulasi cicilan: angka diturunkan dari data frame ----------
     Pemasukan dashboard Rp 5,1 jt (2,55 + 1,53 + 1,02), Gaya Hidup 30% = Rp 1,53 jt,
     jatah harian = Gaya Hidup / 30, sekarang = Sep 2026, bebas cicilan = Mar 2027. */
  const DASH_INCOME = 5100000;
  const WANTS = 1530000;
  const MONTHS = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
  const NOW = 2026 * 12 + 8;
  const FREE = 2027 * 12 + 2;

  function renderSim() {
    syncInput($("#simTotal"), state.simTotal);
    const total = toNum(state.simTotal);
    const n = Number(state.simTenor);
    const monthly = Math.round(total / n);
    const d = (monthly / DASH_INCOME) * 100;
    const wantsAfter = Math.max(0, 30 - d);

    $("#simTenorLabel").textContent = `${n} bulan`;
    $("#simMonthly").textContent = `Rp ${rupiah(monthly)}`;
    $("#simVerdict").textContent = monthly > WANTS ? "Belum muat di kantong Gaya Hidup" : "Ketat, tapi masih muat";
    $("#simVerdictSub").textContent = `Rp ${rupiah(monthly)}/bulan selama ${n} bulan`;

    const after = $$("#simAfter > i");
    after[0].style.flexGrow = 500 + Math.min(d, 30) * 10;
    after[1].style.flexGrow = Math.max(0, 300 - d * 10);

    $("#simWants").textContent = `${wantsAfter.toLocaleString("id-ID", { maximumFractionDigits: 1 })}%`;
    $("#simDaily").textContent = `Rp ${rupiah(Math.max(0, Math.round((WANTS - monthly) / 30)))}`;

    const end = Math.max(FREE, NOW + n);
    const shift = end - FREE;
    $("#simEnd").textContent = `${MONTHS[end % 12]} ${Math.floor(end / 12)}`;
    $("#simShift").textContent = shift > 0 ? `+${shift} bln` : "tetap";
  }

  /* ---------- Riwayat ---------- */
  const RW_DIMS = [
    ["jenis", "Jenis", "rwSheetJenis"],
    ["tanggal", "Tanggal", "rwSheetTanggal"],
    ["kategori", "Kategori", "rwSheetKategori"],
    ["kantong", "Kantong", "rwSheetKantong"],
  ];
  const escapeHTML = (str) => str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const signedRp = (n) => `${n < 0 ? "−" : "+"}Rp ${rupiah(Math.abs(n))}`;
  const shortDate = (iso) => {
    const [y, m, d] = iso.split("-").map(Number);
    return `${d} ${MONTHS_SHORT[m - 1]}, ${y}`;
  };

  function rwLabel(dim) {
    const f = state.rw;
    if (dim === "jenis" && f.jenis) return f.jenis === "in" ? "Pemasukan" : "Pengeluaran";
    if (dim === "tanggal" && f.tanggal) {
      if (f.tanggal !== "custom") return `${f.tanggal} hari`;
      const [, fm, fd] = f.from.split("-").map(Number);
      const [, tm, td] = f.to.split("-").map(Number);
      return fm === tm ? `${fd}–${td} ${MONTHS_SHORT[tm - 1]}` : `${fd} ${MONTHS_SHORT[fm - 1]}–${td} ${MONTHS_SHORT[tm - 1]}`;
    }
    if (dim === "kategori" && f.kategori.length) {
      return f.kategori.length === 1 ? $(`#rwCatGrid [data-kcat="${f.kategori[0]}"]`).dataset.label : `${f.kategori.length} kategori`;
    }
    if (dim === "kantong" && f.kantong) return f.kantong;
    return null;
  }

  function rwMatches(t) {
    const f = state.rw;
    const type = t.amount < 0 ? "out" : "in";
    if (f.jenis && type !== f.jenis) return false;
    if (f.tanggal === "custom" && (t.date < f.from || t.date > f.to)) return false;
    if (f.tanggal && f.tanggal !== "custom" && t.date < RW_RANGE[f.tanggal]) return false;
    if (f.kategori.length && !f.kategori.includes(t.cat)) return false;
    if (f.kantong && t.pocket !== f.kantong) return false;
    return true;
  }

  function renderRiwayat() {
    // Pill terisi diurutkan ke depan (keputusan di frame 06)
    const pills = RW_DIMS.map(([dim, name]) => ({ dim, name, label: rwLabel(dim) }));
    const ordered = [...pills.filter((p) => p.label), ...pills.filter((p) => !p.label)];
    $("#rwPills").innerHTML = ordered.map((p) =>
      `<button class="pill${p.label ? " is-on" : ""}" type="button" data-riw="${p.dim}">${p.label || p.name}` +
      `<img src="assets/pill-chevron.svg" width="10.0535" height="5.67846" alt=""></button>`).join("");

    const active = ordered.some((p) => p.label);
    const items = [...rwUser, ...RW_DATA].filter(rwMatches);
    $("#rwSummary").hidden = !active;
    const total = items.reduce((a, t) => a + t.amount, 0);
    $("#rwCount").textContent = `${items.length} transaksi cocok` + (items.length ? ` · ${signedRp(total)}` : "");

    const list = $("#rwList");
    if (!items.length) {
      list.innerHTML =
        `<div class="rw-empty"><span class="rw-empty-ico"><img src="assets/empty-clock.svg" width="32" height="32" alt=""></span>` +
        `<h3>Belum ada yang cocok</h3><p>Coba longgarkan filternya — misalnya perpanjang rentang tanggal, atau tambahkan kantong lain.</p>` +
        `<button class="btn" type="button" data-rw-reset>Hapus semua filter</button></div>`;
      return;
    }
    const groups = [
      ["Hari ini", items.filter((t) => t.date === RW_TODAY)],
      ["Kemarin", items.filter((t) => t.date === RW_YESTERDAY)],
      ["Minggu lalu", items.filter((t) => t.date < RW_YESTERDAY)],
    ].filter(([, g]) => g.length);
    list.innerHTML = groups.map(([label, g]) =>
      `<div class="rw-group"><div class="rw-head"><span class="rw-label">${label}</span><i></i>` +
      `<span class="caption">${signedRp(g.reduce((a, t) => a + t.amount, 0))}</span></div><div class="rw-card">` +
      g.map((t) => {
        const [bg, icon] = t.iconHTML ? [t.tint, t.iconHTML] : I18[t.icon];
        return `<div class="rw-row${t.isNew ? " is-new" : ""}"><span class="tx-badge" style="background:${bg}">${icon}</span>` +
          `<span class="rw-name">${escapeHTML(t.name)}</span><b class="num${t.amount > 0 ? " is-in" : ""}">${signedRp(t.amount)}</b></div>`;
      }).join("") + `</div></div>`).join("");
    rwUser.forEach((t) => delete t.isNew);
  }

  function openRwSheet(dim) {
    const f = state.rw;
    Object.assign(state, {
      dJenis: f.jenis, dTanggal: f.tanggal, dKategori: [...f.kategori], dKantong: f.kantong, dFrom: f.from, dTo: f.to,
    });
    openLayer(RW_DIMS.find(([d]) => d === dim)[2]);
    render();
  }

  function applyRw() {
    state.rw = {
      jenis: state.dJenis, tanggal: state.dTanggal, kategori: [...state.dKategori], kantong: state.dKantong,
      from: state.dFrom <= state.dTo ? state.dFrom : state.dTo, to: state.dFrom <= state.dTo ? state.dTo : state.dFrom,
    };
    closeLayers();
    $("#rwList").scrollTop = 0;
    render();
  }

  function renderRwSheets() {
    $$("#rwCatGrid .cat-chip").forEach((c) => {
      const on = state.dKategori.includes(c.dataset.kcat);
      c.classList.toggle("is-sel", on);
      c.setAttribute("aria-checked", String(on));
    });
    $("#rwFromText").textContent = shortDate(state.dFrom);
    $("#rwToText").textContent = shortDate(state.dTo);
    syncInput($("#rwFrom"), state.dFrom);
    syncInput($("#rwTo"), state.dTo);
  }

  /* ---------- Target Baru ----------
     Rekomendasi sistem Rp 200.000/bln (dari frame) dipakai untuk estimasi;
     "hari ini" = 26 Sep 2026, tanggal yang dilingkari di kalender streak. */
  const GOAL_MONTHLY = 200000;
  const TODAY = new Date(2026, 8, 26);

  /* ---------- Pengaturan ---------- */
  function ratioHTML(pct) {
    const rp = (p) => rupiah((RATIO_BASE * p) / 100);
    const bar = RATIO_ROWS.map((r, i) => `<i style="flex:${pct[i]} 0 0;background:${r.bar}"></i>`).join("");
    const legend = RATIO_ROWS.map((r, i) => `<span><b style="color:${r.pct}">${pct[i]}%</b><small>Rp${rp(pct[i])}</small></span>`).join("");
    const list = RATIO_ROWS.map((r, i) =>
      `<div class="alloc-item"><i style="background:${r.dot}"></i><div>` +
      `<div class="alloc-item-row"><b style="color:${r.ink}">${escapeHTML(r.label)} (${pct[i]}%)</b><span>Rp ${rp(pct[i])}</span></div>` +
      `<p>${escapeHTML(r.desc)}</p></div></div>`).join("");
    return `<div class="alloc-bar">${bar}</div><div class="alloc-legend">${legend}</div><div class="alloc-list">${list}</div>`;
  }

  function renderPengaturan() {
    const saved = RATIOS[state.ratio].pct;
    $("#pgRatioText").textContent = `${saved[0]}% Kebutuhan · ${saved[1]}% Gaya Hidup · ${saved[2]}% Tabungan`;
    $$("#pgRatioBar i").forEach((el, i) => (el.style.flex = `${saved[i]} 0 0`));
    $("#pgLimit").textContent = `Rp ${rupiah(state.limitDaily)}`;
    $$("[data-switch]").forEach((sw) => {
      sw.setAttribute("aria-checked", String(!!state[sw.dataset.switch]));
      if (sw.hasAttribute("data-sub")) sw.disabled = !state.notif;
    });

    // Akun & Profil: frame awal 6753 → frame ada-perubahan 6817 → tersimpan
    const linked = state.akun !== "awal";
    const unsaved = state.akun === "ubah";
    $$('[data-screen="akun"] [data-linked]').forEach((el) => (el.hidden = !linked));
    $("#akunDot").hidden = !unsaved;
    $("#akunSaveBar").hidden = !unsaved;
    $("#akunBody").classList.toggle("has-bar", unsaved);
    $("#googleSub").textContent = linked ? "fransiskus@email.com" : "Belum terhubung";
    $("#googleOn").hidden = !linked;
    $("#googleConnect").hidden = linked;

    // Preferensi Finansial (draf sampai "Simpan Preferensi")
    const draft = RATIOS[state.dRatio];
    $("#prefRatioName").textContent = draft.name;
    $('[data-ratio="pref"]').innerHTML = ratioHTML(draft.pct);
    syncInput($("#prefLimit"), `Rp ${rupiah(state.dLimit)}`);
    const pct = Math.floor((state.dLimit / dailyCap(state.dRatio)) * 100);
    $("#prefLimitPct").textContent = `Setara ${pct}% dari plafon harian gaya hidup`;
    $("#prefSave").disabled = !state.dLimit;

    // Kalibrasi Alokasi: pratinjau mengikuti opsi yang dipilih
    const opt = RATIOS[state.kalOpt];
    $("#kalRatioName").textContent = opt.name;
    $('[data-ratio="kal"]').innerHTML = ratioHTML(opt.pct);
    $("#kalWhisper").hidden = state.kalOpt !== "darurat";
    $("#kalPet").textContent = state.petName.trim() || "Bucky";
  }

  /* ---------- Lemari & Peti ---------- */
  const cropImg = (src, c, alt = "") =>
    `<img src="assets/${src}" alt="${alt}" style="width:${c[0]}%;height:${c[1]}%;left:${c[2]}%;top:${c[3]}%">`;

  function itemHTML(item, worn) {
    const img = cropImg(item.src, item.crop, item.crop2 ? "" : item.name) + (item.crop2 ? cropImg(item.src, item.crop2, item.name) : "");
    return `<button class="lm-slot${worn ? " is-worn" : ""}" type="button" data-item="${item.id}" aria-pressed="${worn}">` +
      `<span class="lm-tile"><span class="lm-worn"><img src="assets/lemari-check.svg" width="12" height="12" alt=""></span>` +
      `<span class="crop" style="width:${item.w}px;height:${item.h}px">${img}</span></span>` +
      `<span>${escapeHTML(item.name)}</span></button>`;
  }

  function renderLemari() {
    const pet = state.petName.trim() || "Bucky";
    $("#lmTitle").textContent = `Aksesoris ${pet}`;
    $("#lmCount").textContent = `${LEMARI.length} item`;
    $$("[data-pet-name]").forEach((el) => (el.textContent = pet));
    $('[data-screen="peti"]').dataset.step = state.petiStep;
    $("#tBanner").hidden = state.petiClaimed;

    // Kucing hanya punya gambar untuk baju; kalung & bantal cuma ditandai "Dipakai"
    const baju = state.worn.baju;
    const cat = $("#lmCat");
    if (cat.dataset.key !== (baju || "polos")) {
      cat.dataset.key = baju || "polos";
      const o = baju ? CAT_DRESSED[baju] : CAT_PLAIN;
      const alt = baju ? `${pet} memakai ${LEMARI.find((i) => i.id === baju).name}` : `${pet} duduk di samping bantal`;
      cat.innerHTML = `<span class="crop" style="width:${o.w}px;height:${o.h}px">${cropImg(o.src, o.crop, alt)}</span>`;
    }

    // Item yang dipakai pindah ke depan (frame 797:7331), sisanya tetap urutan awal
    const wornIds = SLOT_ORDER.map((k) => state.worn[k]).filter(Boolean);
    const order = [...wornIds.map((id) => LEMARI.find((i) => i.id === id)), ...LEMARI.filter((i) => !wornIds.includes(i.id))];
    const grid = $("#lmGrid");
    const key = order.map((i) => i.id).join() + "|" + wornIds.join();
    if (grid.dataset.key !== key) {
      grid.dataset.key = key;
      grid.innerHTML = order.map((i) => itemHTML(i, wornIds.includes(i.id))).join("");
    }
    syncLemariPager();
  }

  function syncLemariPager() {
    const sc = $("#lmScroll");
    const max = Math.max(0, sc.scrollWidth - sc.clientWidth);
    const pages = 1 + Math.ceil(max / LM_STEP);
    const page = sc.scrollLeft >= max - 2 ? pages - 1 : Math.round(sc.scrollLeft / LM_STEP);
    const dots = $("#lmDots");
    if (dots.children.length !== pages) dots.innerHTML = "<i></i>".repeat(pages);
    [...dots.children].forEach((d, i) => d.classList.toggle("is-on", i === page));
    dots.setAttribute("aria-label", `Halaman ${page + 1} dari ${pages}`);
    $('[data-lm-page="-1"]').disabled = page === 0;
    $('[data-lm-page="1"]').disabled = page === pages - 1;
  }

  function openPeti() {
    state.petiStep = "buka";
    render();
    clearTimeout(petiTimer);
    petiTimer = setTimeout(showReward, reduceMotion.matches ? 300 : 1600);
  }

  function showReward() {
    clearTimeout(petiTimer);
    if (current() !== "peti" || state.petiStep !== "buka") return;
    state.petiStep = "hadiah";
    state.petiClaimed = true;
    render();
  }

  function formatDate(iso) {
    const [y, m, d] = iso.split("-").map(Number);
    return `${d} ${MONTHS[m - 1]} ${y}`;
  }

  function estimateMonth(amount, short) {
    const idx = NOW + Math.ceil(amount / GOAL_MONTHLY);
    return `${(short ? MONTHS_SHORT : MONTHS)[idx % 12]} ${Math.floor(idx / 12)}`;
  }

  function saveGoal() {
    const amount = toNum(state.goalAmount);
    if (!state.goalName.trim() || !amount) return;
    let weekly = GOAL_MONTHLY / 4;
    let reach = estimateMonth(amount, false);
    if (state.goalDate) {
      const [y, m, d] = state.goalDate.split("-").map(Number);
      const weeks = Math.max(1, Math.ceil((new Date(y, m - 1, d) - TODAY) / (7 * 864e5)));
      weekly = Math.ceil(amount / weeks / 1000) * 1000;
      reach = formatDate(state.goalDate);
    }

    const card = document.createElement("div");
    card.className = "goal-card is-new";
    card.innerHTML =
      `<div class="goal-card-row"><div class="goal-card-main">` +
      `<span class="goal-card-name"></span>` +
      `<span class="goal-card-amt"><b>Rp 0</b><span>/ ${rupiah(amount)}</span></span>` +
      `<div class="goal-card-bar"><i style="width:0"></i></div></div>` +
      `<span class="goal-card-chest"><span class="crop chest-54"><img src="assets/chest-sprite.png" alt="" style="height:147.8%;left:-126.48%;top:-34.63%;width:233.79%"></span></span></div>` +
      `<div class="goal-card-foot"><span>Angsuran :<b> Rp ${rupiah(weekly)} </b>/ Minggu</span><em>Tercapai : ${reach}</em></div>`;
    $(".goal-card-name", card).textContent = state.goalName.trim();
    $("#addGoal").before(card);

    Object.assign(state, { goalName: "", goalAmount: "", goalDate: "" });
    $("#goalDate").value = "";
    closeLayers();
    render();
  }

  function pressGoalKey(k) {
    if (k === ".") return;
    const digits = state.goalAmount.replace(/\D/g, "");
    const next = k === "del" ? digits.slice(0, -1) : (digits + k).replace(/^0+/, "").slice(0, 12);
    state.goalAmount = next ? rupiah(Number(next)) : "";
    render();
  }

  /* ---------- Catat Transaksi → kartu baru di dashboard ---------- */
  function saveTransaction() {
    if (toNum(state.txAmount) === 0) return;
    const out = state.txType === "out";
    const chip = out ? $(`.cat-chip[data-value="${state.txCat}"]`) : null;

    const card = document.createElement("div");
    card.className = "tx-card is-new";
    const badge = document.createElement("span");
    badge.className = "tx-badge";
    badge.style.background = out ? POCKET[state.pocket].tint : POCKET.Tabungan.tint;
    if (chip) badge.appendChild($(".ic14", chip).cloneNode(true));
    else badge.innerHTML = '<img src="assets/icon-uang.svg" width="18" height="18" alt="">';

    const name = document.createElement("span");
    name.className = "tx-name";
    name.textContent = state.txNote.trim() || (chip ? chip.dataset.label : "Pemasukan");
    const meta = document.createElement("span");
    meta.className = "tx-meta";
    meta.textContent = `${out ? state.pocket : "Pemasukan"} · 19:02`;
    const amt = document.createElement("span");
    amt.className = `tx-amt${out ? "" : " is-in"}`;
    amt.textContent = `${out ? "−" : "+"}Rp ${state.txAmount}`;

    card.append(badge, name, meta, amt);
    $("#txRail").prepend(card);
    $("#txRail").scrollLeft = 0;

    rwUser.unshift({
      name: name.textContent,
      amount: out ? -toNum(state.txAmount) : toNum(state.txAmount),
      date: RW_TODAY,
      cat: out ? state.txCat : undefined,
      pocket: out ? state.pocket : undefined,
      tint: badge.style.background,
      iconHTML: badge.innerHTML,
      isNew: true,
    });

    state.awake = true;
    state.txCount += 1;
    state.txAmount = "";
    state.txNote = "";
    popTo(stack[stack.length - 2] || "dash");
  }

  /* ---------- PIN ---------- */
  function pressKey(k) {
    const id = current();
    if (!isPin(id)) return;
    const dots = $(`.scr[data-screen="${id}"] [data-dots]`);
    if (dots.dataset.busy) return;

    if (k === "del") pinBuffer = pinBuffer.slice(0, -1);
    else if (pinBuffer.length < 6) pinBuffer += k;
    render();

    if (pinBuffer.length === 6) {
      dots.dataset.busy = "1";
      setTimeout(() => {
        delete dots.dataset.busy;
        if (id === "pin-create") {
          state.pinDraft = pinBuffer;
          goNext();
        } else if (pinBuffer === state.pinDraft) {
          enterDashboard();
        } else {
          dots.classList.remove("is-shake");
          void dots.offsetWidth;
          dots.classList.add("is-shake");
          pinBuffer = "";
          render();
        }
      }, 260);
    }
  }

  kbd.addEventListener("click", (e) => {
    const key = e.target.closest("[data-key]");
    if (key) pressKey(key.dataset.key);
  });

  document.addEventListener("keydown", (e) => {
    if (!isPin(current())) return;
    if (/^[0-9]$/.test(e.key)) pressKey(e.key);
    else if (e.key === "Backspace") pressKey("del");
  });

  /* ---------- Interaksi ---------- */
  viewport.addEventListener("click", (e) => {
    if (e.target.closest("[data-next]")) return goNext();
    if (e.target.closest("[data-back]")) return goBack();
    const tab = e.target.closest("[data-tab]");
    if (tab) return switchTab(tab.dataset.tab);
    if (e.target.closest("[data-close]")) return closeLayers();
    const open = e.target.closest("[data-open]");
    if (open) return openLayer(open.dataset.open);
    const badge = e.target.closest("[data-badge]");
    if (badge) {
      const b = BADGES[badge.dataset.badge];
      $("#badgeModalBody").innerHTML =
        `<div style="display:flex;flex-direction:column;gap:23.667px">${badgeHTML(badge.dataset.badge, { tag: "div" })}` +
        (b.desc ? `<p class="modal-desc">${b.desc}</p>` : "") + `</div>`;
      return openLayer("badgeModal");
    }
    const pill = e.target.closest("[data-riw]");
    if (pill) return openRwSheet(pill.dataset.riw);
    if (e.target.closest("[data-rw-apply]")) return applyRw();
    if (e.target.closest("[data-rw-reset]")) {
      state.rw = { jenis: null, tanggal: null, kategori: [], kantong: null, from: "2026-09-22", to: "2026-09-23" };
      return render();
    }
    const clear = e.target.closest("[data-rw-clear]");
    if (clear) {
      const key = clear.dataset.rwClear;
      state[key] = key === "dKategori" ? [] : null;
      return render();
    }
    const kcat = e.target.closest("[data-kcat]");
    if (kcat) {
      const k = kcat.dataset.kcat;
      state.dKategori = state.dKategori.includes(k) ? state.dKategori.filter((x) => x !== k) : [...state.dKategori, k];
      return render();
    }
    const dateInput = e.target.closest("#rwFrom, #rwTo");
    if (dateInput) {
      try { dateInput.showPicker(); } catch (_) { /* browser lama: fokus biasa */ }
      return;
    }
    const num = e.target.closest("[data-num]");
    if (num) return pressGoalKey(num.dataset.num);
    if (e.target.closest("#goalSave")) return saveGoal();
    if (e.target.closest("#goalDate")) {
      try { $("#goalDate").showPicker(); } catch (_) { /* browser lama: fokus biasa */ }
      return;
    }
    if (e.target.closest("#txSave")) return saveTransaction();

    const lmItem = e.target.closest("[data-item]");
    if (lmItem) {
      const item = LEMARI.find((i) => i.id === lmItem.dataset.item);
      const on = state.worn[item.slot] !== item.id;
      state.worn[item.slot] = on ? item.id : null;
      render();
      if (on) $("#lmScroll").scrollTo({ left: 0, behavior: "smooth" });
      return;
    }
    const lmPage = e.target.closest("[data-lm-page]");
    if (lmPage) {
      $("#lmScroll").scrollBy({ left: Number(lmPage.dataset.lmPage) * LM_STEP, behavior: "smooth" });
      return;
    }
    if (e.target.closest("#petiOpen")) return openPeti();
    if (e.target.closest(".peti-step--buka")) return showReward();
    const petiBtn = e.target.closest("[data-peti]");
    if (petiBtn) {
      if (petiBtn.dataset.peti === "pakai") state.worn.baju = "kemeja";
      stack = ["dash", "lemari"];
      show("lemari", "fwd");
      return;
    }

    const sw = e.target.closest("[data-switch]");
    if (sw) {
      state[sw.dataset.switch] = !state[sw.dataset.switch];
      return render();
    }
    if (e.target.closest("#googleConnect")) {
      state.akun = "ubah";
      return render();
    }
    const akunBtn = e.target.closest("[data-akun]");
    if (akunBtn) {
      state.akun = akunBtn.dataset.akun === "simpan" ? "simpan" : "awal";
      return render();
    }
    if (e.target.closest("#prefSave")) {
      state.ratio = state.dRatio;
      state.limitDaily = state.dLimit;
      return goBack();
    }
    if (e.target.closest("#kalApply")) {
      state.dRatio = state.kalOpt;
      return goBack();
    }

    const save = e.target.closest("[data-save]");
    if (save) return popTo(save.dataset.save);

    const pushEl = e.target.closest("[data-push]");
    if (pushEl) return push(pushEl.dataset.push);

    const radio = e.target.closest("[role=radio]");
    if (radio) {
      const group = radio.dataset.groupItem || radio.closest("[data-group]")?.dataset.group;
      state[group] = radio.dataset.value;
      if (group === "txCat" && radio.dataset.pocket) state.pocket = radio.dataset.pocket;
      if (group === "dLimitPick") {
        if (radio.dataset.value !== "custom") state.dLimit = Number(radio.dataset.value);
        else {
          const input = $("#prefLimit");
          input.focus();
          input.setSelectionRange(input.value.length, input.value.length);
        }
      }
      if (group === "limit" && radio.dataset.value === "manual" && e.target.id !== "limitManual") {
        $("#limitManual").focus();
      }
      render();
      return;
    }

    const preset = e.target.closest("[data-income]");
    if (preset) {
      state.income = rupiah(Number(preset.dataset.income));
      render();
      return;
    }

    const chip = e.target.closest("[data-preset]");
    if (chip) {
      state.custom = chip.dataset.preset.split(",").map(Number);
      render();
      return;
    }

    const step = e.target.closest("[data-step]");
    if (step) {
      const item = step.closest(".slider-item");
      const i = $$("#customPanel .slider-item").indexOf(item);
      setCustom(i, state.custom[i] + Number(step.dataset.step));
      return;
    }

    if (e.target.closest("#avatarBtn")) {
      state.photo = !state.photo;
      render();
      return;
    }

    if (e.target.closest("#eyeBtn")) {
      state.hideSaldo = !state.hideSaldo;
      render();
    }
  });

  viewport.addEventListener("keydown", (e) => {
    const el = e.target.closest?.("div[role=radio], div[role=button]");
    if (el && e.target === el && (e.key === " " || e.key === "Enter")) {
      e.preventDefault();
      el.click();
    }
  });

  const moneyInput = (el, key, max = 12) => {
    el.addEventListener("input", () => {
      const d = el.value.replace(/\D/g, "").replace(/^0+/, "").slice(0, max);
      el.value = d ? rupiah(Number(d)) : "";
      state[key] = el.value;
      render();
    });
  };
  moneyInput($("#incomeInput"), "income");
  moneyInput($("#debtInput"), "debt");
  moneyInput($("#limitManual"), "limitManual", 9);
  moneyInput($("#txAmount"), "txAmount", 10);
  moneyInput($("#simTotal"), "simTotal", 10);

  const textInput = (el, key, filter) => {
    el.addEventListener("input", () => {
      if (filter) el.value = filter(el.value);
      state[key] = el.value;
      render();
    });
  };
  textInput($("#firstName"), "first");
  textInput($("#lastName"), "last");
  textInput($("#petName"), "petName");
  textInput($("#txNote"), "txNote");
  textInput($("#debtRate"), "debtRate", (v) => v.replace(/[^0-9.,]/g, "").slice(0, 5));
  textInput($("#debtMonths"), "debtMonths", (v) => v.replace(/\D/g, "").slice(0, 3));

  $("#leftover").addEventListener("change", (e) => {
    state.leftover = e.target.value;
    render();
  });

  textInput($("#goalName"), "goalName");
  moneyInput($("#goalAmount"), "goalAmount", 12);
  ["rwFrom", "rwTo"].forEach((id) => {
    $("#" + id).addEventListener("change", (e) => {
      if (!e.target.value) return;
      state[id === "rwFrom" ? "dFrom" : "dTo"] = e.target.value;
      state.dTanggal = "custom";
      render();
    });
  });

  $("#prefLimit").addEventListener("input", (e) => {
    const d = e.target.value.replace(/\D/g, "").replace(/^0+/, "").slice(0, 7);
    e.target.value = d ? `Rp ${rupiah(Number(d))}` : "";
    state.dLimit = Number(d) || 0;
    state.dLimitPick = LIMIT_PICKS.includes(String(state.dLimit)) ? String(state.dLimit) : "custom";
    render();
  });
  $("#prefLimit").addEventListener("blur", () => render());

  let lmFrame = 0;
  $("#lmScroll").addEventListener("scroll", () => {
    cancelAnimationFrame(lmFrame);
    lmFrame = requestAnimationFrame(syncLemariPager);
  });

  $("#goalDate").addEventListener("change", (e) => {
    state.goalDate = e.target.value;
    render();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeLayers();
  });

  $("#pocketSelect").addEventListener("change", (e) => {
    state.pocket = e.target.value;
    render();
  });

  $$("#customPanel .range").forEach((r, i) => {
    r.addEventListener("input", () => setCustom(i, Number(r.value)));
  });

  // Data contoh dari frame Figma, dipakai tautan ?contoh
  const AUTOFILL = {
    profile: () => Object.assign(state, { first: "Fransiskus", last: "Brian", status: "Mahasiswa", photo: true }),
    income: () => (state.income = "7.500.000"),
    priority: () => (state.priority = "TR"),
    custom: () => (state.custom = [60, 20, 20]),
    companion: () => Object.assign(state, { pet: "kucing", petName: "Bucky" }),
    challenge: () => Object.assign(state, { limit: "50000" }),
  };

  /* ---------- Skala ponsel mengikuti layar ---------- */
  const device = $("#device");
  const slot = $("#slot");
  function fit() {
    const W = 424;
    const H = 878;
    const s = Math.min(1, (window.innerHeight - 40) / H, (window.innerWidth - 24) / W);
    device.style.transform = `scale(${s})`;
    slot.style.width = `${W * s}px`;
    slot.style.height = `${H * s}px`;
  }
  window.addEventListener("resize", fit);
  fit();

  // Tautan langsung: index.html#dash, tambah ?contoh untuk memuat data frame Figma
  const params = new URLSearchParams(location.search);
  const start = location.hash.slice(1);
  if (params.has("contoh")) {
    Object.values(AUTOFILL).forEach((fill) => fill());
    if (["ratio", "summary-b"].includes(start)) state.ratioB = "rec";
    if (params.get("contoh") === "bangun") state.awake = true;
  }
  if (start && screenEl(start)) jump(start);
  else show("get-ready", null);

  window.addEventListener("hashchange", () => {
    const id = location.hash.slice(1);
    if (id && screenEl(id)) jump(id);
  });
})();
