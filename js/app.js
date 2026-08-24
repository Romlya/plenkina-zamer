(() => {
  const STORAGE_KEY = "plenkina_zamer_v1";
  const SURVEYOR_KEY = "plenkina_surveyor";
  const $ = (id) => document.getElementById(id);
  let state = { objects: loadAll(), currentId: null };

  function loadAll() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); } catch { return []; }
  }
  function saveAll() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.objects));
  }
  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }
  function today() {
    return new Date().toISOString().slice(0, 10);
  }
  function fmtArea(m2) {
    return m2.toFixed(2).replace(".", ",") + " м²";
  }
  function toast(msg) {
    const t = $("toast");
    t.textContent = msg;
    t.hidden = false;
    clearTimeout(t._timer);
    t._timer = setTimeout(() => (t.hidden = true), 2200);
  }
  function filmLabel(v) {
    const map = {
      athermal: "Атермальная / солнцезащита", k4: "К4", r1a: "Р1А", r2a: "Р2А",
      r3a: "Р3А", r4a: "Р4А", matte: "Матирование / декор", print: "Фотопечать",
      smart: "Смарт / special", other: "Другое",
    };
    return map[v] || "—";
  }
  function show(screen) {
    $("screenList").hidden = screen !== "list";
    $("screenForm").hidden = screen !== "form";
    $("screenExport").hidden = screen !== "export";
    $("btnHome").hidden = screen === "list";
  }
  function renderList() {
    const list = $("objectsList");
    const empty = $("emptyState");
    list.innerHTML = "";
    const items = [...state.objects].sort((a, b) => (b.updated || b.created) - (a.updated || a.created));
    empty.hidden = items.length > 0;
    items.forEach((obj) => {
      const area = calcTotal(obj);
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "obj-card";
      btn.innerHTML = `<h3>${escapeHtml(obj.address || "Без адреса")}</h3><div class="obj-meta"><span>${obj.date || "—"}</span><span>${obj.windows?.length || 0} поз.</span><span class="obj-area">${fmtArea(area)}</span></div>`;
      btn.onclick = () => openObject(obj.id);
      list.appendChild(btn);
    });
  }
  function escapeHtml(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  function blankObject() {
    return {
      id: uid(), address: "", client: "", phone: "", date: today(),
      surveyor: localStorage.getItem(SURVEYOR_KEY) || "", film: "", notes: "",
      windows: [blankWindow()], created: Date.now(), updated: Date.now(),
    };
  }
  function blankWindow() {
    return { id: uid(), w: "", h: "", qty: "1", note: "" };
  }
  function openObject(id) {
    state.currentId = id;
    const obj = state.objects.find((o) => o.id === id);
    if (!obj) return;
    fillForm(obj);
    show("form");
  }
  function newObject() {
    const obj = blankObject();
    state.objects.unshift(obj);
    state.currentId = obj.id;
    saveAll();
    fillForm(obj);
    show("form");
  }
  function fillForm(obj) {
    $("fAddress").value = obj.address || "";
    $("fClient").value = obj.client || "";
    $("fPhone").value = obj.phone || "";
    $("fDate").value = obj.date || today();
    $("fSurveyor").value = obj.surveyor || "";
    $("fFilm").value = obj.film || "";
    $("fNotes").value = obj.notes || "";
    renderWindows(obj.windows || []);
    updateTotal();
  }
  function readForm() {
    const obj = state.objects.find((o) => o.id === state.currentId);
    if (!obj) return null;
    obj.address = $("fAddress").value.trim();
    obj.client = $("fClient").value.trim();
    obj.phone = $("fPhone").value.trim();
    obj.date = $("fDate").value;
    obj.surveyor = $("fSurveyor").value.trim();
    obj.film = $("fFilm").value;
    obj.notes = $("fNotes").value.trim();
    obj.windows = collectWindows();
    obj.updated = Date.now();
    if (obj.surveyor) localStorage.setItem(SURVEYOR_KEY, obj.surveyor);
    return obj;
  }
  function collectWindows() {
    const list = [];
    document.querySelectorAll(".win-card").forEach((card) => {
      list.push({
        id: card.dataset.id,
        w: card.querySelector('[data-f="w"]').value,
        h: card.querySelector('[data-f="h"]').value,
        qty: card.querySelector('[data-f="qty"]').value || "1",
        note: card.querySelector('[data-f="note"]').value.trim(),
      });
    });
    return list;
  }
  function renderWindows(windows) {
    const wrap = $("windowsList");
    wrap.innerHTML = "";
    windows.forEach((win, i) => {
      const card = document.createElement("div");
      card.className = "win-card";
      card.dataset.id = win.id;
      card.innerHTML = `<div class="win-card-head"><span class="win-num">№ ${i + 1}</span><button type="button" class="btn btn-danger" data-del>Удалить</button></div><div class="win-grid"><label class="field"><span>Ширина, мм</span><input type="number" inputmode="numeric" data-f="w" value="${win.w}" placeholder="1200" min="0"></label><label class="field"><span>Высота, мм</span><input type="number" inputmode="numeric" data-f="h" value="${win.h}" placeholder="1400" min="0"></label><label class="field"><span>Кол-во</span><input type="number" inputmode="numeric" data-f="qty" value="${win.qty || 1}" min="1"></label></div><div class="win-note"><input type="text" data-f="note" value="${escapeHtml(win.note || "")}" placeholder="Этаж, помещение"></div><div class="win-area">Площадь: <strong data-area>0,00 м²</strong></div>`;
      card.querySelector("[data-del]").onclick = () => { card.remove(); renumberWindows(); updateTotal(); };
      card.querySelectorAll("input").forEach((inp) => {
        inp.addEventListener("input", () => { updateWinArea(card); updateTotal(); });
      });
      wrap.appendChild(card);
      updateWinArea(card);
    });
  }
  function renumberWindows() {
    document.querySelectorAll(".win-card").forEach((c, i) => {
      c.querySelector(".win-num").textContent = "№ " + (i + 1);
    });
  }
  function winAreaM2(wMm, hMm, qty) {
    const w = parseFloat(wMm) || 0;
    const h = parseFloat(hMm) || 0;
    const q = parseFloat(qty) || 1;
    return (w / 1000) * (h / 1000) * q;
  }
  function updateWinArea(card) {
    const w = card.querySelector('[data-f="w"]').value;
    const h = card.querySelector('[data-f="h"]').value;
    const qty = card.querySelector('[data-f="qty"]').value;
    card.querySelector("[data-area]").textContent = fmtArea(winAreaM2(w, h, qty));
  }
  function calcTotal(obj) {
    if (!obj?.windows) return 0;
    return obj.windows.reduce((s, win) => s + winAreaM2(win.w, win.h, win.qty), 0);
  }
  function updateTotal() {
    const wins = collectWindows();
    const total = wins.reduce((s, win) => s + winAreaM2(win.w, win.h, win.qty), 0);
    $("totalArea").textContent = fmtArea(total);
  }
  function addWindow() {
    const wrap = $("windowsList");
    const i = wrap.querySelectorAll(".win-card").length;
    const card = document.createElement("div");
    card.className = "win-card";
    card.dataset.id = uid();
    card.innerHTML = `<div class="win-card-head"><span class="win-num">№ ${i + 1}</span><button type="button" class="btn btn-danger" data-del>Удалить</button></div><div class="win-grid"><label class="field"><span>Ширина, мм</span><input type="number" inputmode="numeric" data-f="w" placeholder="1200" min="0"></label><label class="field"><span>Высота, мм</span><input type="number" inputmode="numeric" data-f="h" placeholder="1400" min="0"></label><label class="field"><span>Кол-во</span><input type="number" inputmode="numeric" data-f="qty" value="1" min="1"></label></div><div class="win-note"><input type="text" data-f="note" placeholder="Этаж, помещение"></div><div class="win-area">Площадь: <strong data-area>0,00 м²</strong></div>`;
    card.querySelector("[data-del]").onclick = () => { card.remove(); renumberWindows(); updateTotal(); };
    card.querySelectorAll("input").forEach((inp) => {
      inp.addEventListener("input", () => { updateWinArea(card); updateTotal(); });
    });
    wrap.appendChild(card);
    card.querySelector('[data-f="w"]').focus();
  }
  function saveCurrent() {
    const obj = readForm();
    if (!obj) return;
    if (!obj.address) { toast("Укажите адрес объекта"); $("fAddress").focus(); return; }
    saveAll();
    toast("Сохранено");
  }
  function buildText(obj) {
    const area = calcTotal(obj);
    let t = `ПЛЕНКИН — ЗАМЕР ОСТЕКЛЕНИЯ\n────────────────────────\n`;
    t += `Адрес: ${obj.address}\n`;
    if (obj.client) t += `Клиент: ${obj.client}\n`;
    if (obj.phone) t += `Телефон: ${obj.phone}\n`;
    t += `Дата: ${obj.date || "—"}\n`;
    if (obj.surveyor) t += `Замерщик: ${obj.surveyor}\n`;
    t += `Плёнка: ${filmLabel(obj.film)}\n`;
    if (obj.notes) t += `Комментарий: ${obj.notes}\n`;
    t += `────────────────────────\nПозиции:\n`;
    (obj.windows || []).forEach((w, i) => {
      const a = winAreaM2(w.w, w.h, w.qty);
      t += `${i + 1}. ${w.w || "?"}×${w.h || "?"} мм × ${w.qty || 1} шт = ${fmtArea(a)}`;
      if (w.note) t += ` (${w.note})`;
      t += `\n`;
    });
    t += `────────────────────────\nИТОГО: ${fmtArea(area)}\n\nwww.plenkinaokna.ru · +7 985 780 13 75\n`;
    return t;
  }
  function buildCsv(obj) {
    const rows = [["Адрес","Клиент","Телефон","Дата","Замерщик","Плёнка","№","Ширина мм","Высота мм","Кол-во","Площадь м2","Примечание","Комментарий"]];
    (obj.windows || []).forEach((w, i) => {
      rows.push([obj.address, obj.client, obj.phone, obj.date, obj.surveyor, filmLabel(obj.film), i+1, w.w, w.h, w.qty||1, winAreaM2(w.w,w.h,w.qty).toFixed(3), w.note, obj.notes]);
    });
    return rows.map((r) => r.map((c) => `"${String(c??"").replace(/"/g,'""')}"`).join(";")).join("\n");
  }
  function openExport() {
    const obj = readForm();
    if (!obj) return;
    if (!obj.address) { toast("Укажите адрес"); return; }
    saveAll();
    $("exportSummary").textContent = `${obj.address} · ${obj.windows.length} поз. · ${fmtArea(calcTotal(obj))}`;
    $("exportPreview").textContent = buildText(obj);
    show("export");
  }
  function download(filename, content, mime) {
    const blob = new Blob(["\ufeff" + content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  }
  async function shareText(obj) {
    const text = buildText(obj);
    if (navigator.share) {
      try { await navigator.share({ title: "Замер ПЛЕНКИН", text }); return; }
      catch (e) { if (e.name === "AbortError") return; }
    }
    await navigator.clipboard.writeText(text);
    toast("Скопировано в буфер");
  }
  $("btnNew").onclick = newObject;
  $("btnHome").onclick = () => { readForm(); saveAll(); renderList(); show("list"); };
  $("btnAddWin").onclick = addWindow;
  $("btnSave").onclick = saveCurrent;
  $("btnExport").onclick = openExport;
  $("btnBackForm").onclick = () => show("form");
  $("btnCopy").onclick = async () => {
    const obj = state.objects.find((o) => o.id === state.currentId);
    if (!obj) return;
    await navigator.clipboard.writeText(buildText(obj));
    toast("Скопировано");
  };
  $("btnShare").onclick = () => {
    const obj = state.objects.find((o) => o.id === state.currentId);
    if (obj) shareText(obj);
  };
  $("btnCsv").onclick = () => {
    const obj = state.objects.find((o) => o.id === state.currentId);
    if (!obj) return;
    const name = (obj.address || "zamer").replace(/[\\/:*?"<>|]/g, "_").slice(0, 40);
    download(`zamer_${name}.csv`, buildCsv(obj), "text/csv;charset=utf-8");
    toast("CSV скачан");
  };
  $("btnJson").onclick = () => {
    const obj = state.objects.find((o) => o.id === state.currentId);
    if (!obj) return;
    const name = (obj.address || "zamer").replace(/[\\/:*?"<>|]/g, "_").slice(0, 40);
    download(`zamer_${name}.json`, JSON.stringify(obj, null, 2), "application/json");
    toast("JSON скачан");
  };
  ["fAddress","fClient","fPhone","fDate","fSurveyor","fFilm","fNotes"].forEach((id) => {
    $(id).addEventListener("change", () => { readForm(); saveAll(); });
  });
  renderList();
  show("list");
})();
