/* =====================================================================
   抹茶診断 — 仕組み（言葉と決め方は 文言.js、見た目は 診断.css）
   2026-11-10。ページ側は、開くボタンに data-yq-open を付けるだけ。
   外へ何も送らない。ページの中だけで動く。
   ===================================================================== */
(function () {
  const M = window.MATCHA, AX = window.MATCHA_AXES, Q = window.QUIZ;
  const fmt = (s, o) => s.replace(/\{(\w+)\}/g, (_, k) => (k in o ? o[k] : "{" + k + "}"));

  /* 缶の絵（仮。本番は写真）と、丸五つ。ページの札も同じものを使う */
  const can = (n, w) => `<span class="yq-can"><svg width="${w}" height="${Math.round(w * 1.2)}" viewBox="0 0 60 72"><rect x="8" y="2" width="44" height="11" rx="2.5" fill="#f1eee8" stroke="#bfb9ad"/><rect x="8" y="13" width="44" height="57" rx="2.5" fill="#fff" stroke="#bfb9ad"/><text x="30" y="46" text-anchor="middle" font-size="24" font-family="Yu Mincho,Hiragino Mincho ProN,serif" fill="#2f2e2b">${n}</text><text x="30" y="60" text-anchor="middle" font-size="5" letter-spacing="1.2" fill="#9a958d">YUGEN</text></svg></span>`;
  const dots = p => `<div class="yq-dots">${AX.map(a => `<div><span>${a[0]}</span><em>${[1, 2, 3, 4, 5].map(k => `<i class="${k <= p[a[1]] ? "on" : ""}"></i>`).join("")}</em></div>`).join("")}</div>`;

  const ICONS = `<svg width="0" height="0" style="position:absolute"><defs>
  <symbol id="yq-glass" viewBox="0 0 24 24"><path d="M6.5 3.5l1.6 17h7.8l1.6-17z"/><path d="M7.2 10.5h9.6"/><path d="M7.6 14c2.8-1 6-1 8.8 0"/></symbol>
  <symbol id="yq-usucha" viewBox="0 0 24 24"><path d="M3 11c0 5.5 4 9 9 9s9-3.5 9-9z"/><path d="M5 11c2.5-1.6 11.5-1.6 14 0"/><path d="M17.5 2.5v5M16 3l.6 4M19 3l-.6 4"/></symbol>
  <symbol id="yq-koicha" viewBox="0 0 24 24"><path d="M3 10c0 6 4 10 9 10s9-4 9-10z"/><path d="M5.5 13.500c3-2 10-2 13 0c-3 2-10 2-13 0z"/><path d="M16 4.500l-3.500 7"/></symbol>
  <symbol id="yq-same" viewBox="0 0 24 24"><path d="M3 11c0 5.500 4 9 9 9s9-3.500 9-9z"/><path d="M5 11c2.500-1.600 11.500-1.600 14 0"/></symbol>
  <symbol id="yq-diff" viewBox="0 0 24 24"><path d="M2 13c0 4 2.600 7 6 7s6-3 6-7z"/><path d="M12 9c0 3 2 5.500 5 5.500s5-2.500 5-5.500z"/><path d="M17 3v2.500M14.500 4l1 1.500M19.500 4l-1 1.500"/></symbol>
  </defs></svg>`;
  const ic = id => `<svg class="yq-i" width="38" height="38"><use href="#yq-${id}"/></svg>`;

  /* ---------- 窓を作る ---------- */
  const root = document.createElement("div");
  root.className = "yq";
  root.innerHTML = ICONS + `<div class="yq-dim"></div>
  <div class="yq-sheet" role="dialog" aria-modal="true" aria-label="${Q.title}">
    <div class="yq-top">
      <div class="yq-bar"><span class="yq-kick">${Q.title}<b>${Q.titleSub}</b></span><button class="yq-x" aria-label="${Q.close}">×</button></div>
      <div class="yq-row"><p class="yq-lead"></p><div class="yq-stage"><div class="yq-shelf">${M.map(p => `<div class="on" data-n="${p.n}">${can(p.n, 36)}</div>`).join("")}</div></div></div>
    </div>
    <div class="yq-body"><div class="yq-chips"></div><div class="yq-qa"></div></div>
    <div class="yq-foot"><div class="yq-prog"></div><span class="yq-fr"></span></div>
  </div>`;
  document.body.appendChild(root);
  const $ = s => root.querySelector(s);
  const body = $(".yq-body"), qa = $(".yq-qa"), prog = $(".yq-prog"), fr = $(".yq-fr"), chips = $(".yq-chips"), stg = $(".yq-stage"), lead = $(".yq-lead");

  let A = {};
  const open = () => { root.classList.add("on"); document.documentElement.classList.add("yq-lock"); };
  const close = () => { root.classList.remove("on"); document.documentElement.classList.remove("yq-lock"); };
  $(".yq-x").onclick = close; $(".yq-dim").onclick = close;
  document.addEventListener("keydown", e => { if (e.key === "Escape") close(); });
  document.addEventListener("click", e => { if (e.target.closest("[data-yq-open]")) { e.preventDefault(); open(); } });

  /* ---------- 表示の部品 ---------- */
  const lab = (T, k) => T[k === "taste" && A.exp !== "first" ? "taste2" : k][A[k]];
  const useOf = () => (A.use === "unk" ? "yu" : A.use);
  const setLead = t => { if (lead.dataset.t !== t) { lead.dataset.t = t; lead.innerHTML = `<span>${t}</span>`; } };
  const keep = arr => root.querySelectorAll(".yq-shelf div").forEach(d => d.className = arr.includes(+d.dataset.n) ? "on" : "");
  const stage = () => {
    const ks = ["exp", "taste", "use", "mood"].filter(k => A[k]), total = A.exp === "often" ? 4 : 3;
    prog.innerHTML = Array.from({ length: total }, (_, i) => `<i class="${i < ks.length ? "on" : ""}"></i>`).join("");
    chips.innerHTML = ks.map(k => `<span>${lab(Q.slip, k)}</span>`).join("");
  };
  const ask = (no, key, def, hint, opts) => {
    opts = opts || def.opts;
    qa.innerHTML = `<div class="yq-qn">${fmt(Q.qNumber, { n: "一二三四"[no] })}</div><p class="yq-q">${def.text}</p><p class="yq-hint">${hint != null ? hint : def.hint || ""}</p>
      <div class="yq-opts" style="grid-template-columns:repeat(${opts.length},1fr)">${opts.map(o => `<button data-k="${o[0]}" class="${o[3] ? "" : "plain"}">${o[3] ? ic(o[3]) : ""}<span>${o[1]}<small>${o[2] || ""}</small></span></button>`).join("")}</div>
      ${def.skip ? `<button class="yq-skip" data-k="${def.skip[0]}">${def.skip[1]}</button>` : ""}`;
    qa.querySelectorAll("button").forEach(b => b.onclick = () => {
      if (qa.dataset.busy) return; qa.dataset.busy = 1; b.classList.add("sel");
      setTimeout(() => { delete qa.dataset.busy; A[key] = b.dataset.k; next(); }, 240);
    });
    body.scrollTop = 0;
  };

  /* ---------- 問いの流れ ---------- */
  function next() {
    stg.style.display = ""; chips.style.display = ""; setLead(Q.lead);
    const all = M.map(p => p.n);
    if (!A.exp) { keep(all); stage(); return ask(0, "exp", Q.q.exp); }
    if (!A.taste) {
      keep(all); stage();
      if (A.exp === "first") return ask(1, "taste", Q.q.tasteFirst);
      return ask(1, "taste", Q.q.tasteExp, A.exp === "often" ? Q.q.tasteExp.hintOften : Q.q.tasteExp.hintSome);
    }
    if (!A.use) {
      keep(Q.narrow[A.taste]); stage();
      if (A.exp === "first") return ask(2, "use", Q.q.useFirst);
      const o = Q.q.use.opts.filter(x => !(x[0] === "neru" && Q.noNeruFor.includes(A.taste)));
      return ask(2, "use", Q.q.use, null, o);
    }
    if (A.exp === "often" && !A.mood) { keep(Q.often[useOf()][A.taste]); stage(); return ask(3, "mood", Q.q.mood); }
    fin();
  }

  /* ---------- 結果 ---------- */
  function second(n) {
    if (A.exp === "first" && A.taste === "unk") return null;
    if (n === 2 && useOf() === "yu" && A.taste === "uma" && A.exp !== "first") return Q.second.umamiYu;
    return Q.second[n];
  }
  function diffReason(n, m) {
    const R = Q.diffReason, use = useOf();
    if (use === "milk") return R.milk;
    if (m === 3) return R.to3 + (use === "yu" ? R.to3yu : "");
    if (n === 3) return R.from3;
    if (n === 0) return R.from0;
    return R.other;
  }
  function fin() {
    stage(); stg.style.display = "none"; chips.style.display = "none"; setLead(Q.leadDone);
    const said = [A.exp === "first" ? Q.said.exp.first : null, lab(Q.said, "taste"), Q.said.use[A.use]].filter(Boolean).map(s => `「${s}」`).join("");
    const one = (n, why, sub, subLabel) => {
      const p = M[n];
      return `<div class="yq-rh">${Q.headOne}</div>
        <div class="yq-res"><div>${can(n, 80)}</div><div><span class="yq-num">#${n}</span><p class="yq-txt">${why}</p>${dots(p)}<div class="yq-pr"><span>${p.price}</span></div></div></div>
        <a class="yq-btn" href="#matcha-${n}" data-yq-go>${fmt(Q.seeMain, { n })}</a>`
        + (sub ? `<div class="yq-sub"><div class="yq-lb">${subLabel}</div><p class="yq-say">${sub[1]}</p><div class="yq-it">${can(sub[0], 44)}<div><div class="yq-nm">#${sub[0]}<small>${M[sub[0]].price}</small></div>${dots(M[sub[0]])}</div><a href="#matcha-${sub[0]}" data-yq-go>${Q.seeSmall}</a></div></div>` : "");
    };
    let h, ns;
    if (A.exp === "often") {
      const [n, m] = Q.often[useOf()][A.taste];
      if (A.mood === "diff") {
        ns = [m];
        h = one(m, fmt(Q.whyDiff, { said, mood: Q.said.mood.diff, m, reason: diffReason(n, m) }),
          [n, fmt(Q.usual, { n, short: M[n].short }) + (n < m ? Q.usualEnough : "")], Q.usualLabel);
      } else { ns = [n]; h = one(n, fmt(Q.whyOne, { said, n, long: M[n].long })); }
    } else {
      const d = Q.normal[useOf()][A.taste];
      if (Array.isArray(d)) {
        ns = d.map(x => x[0]);
        h = `<div class="yq-rh">${Q.headTwo}</div><p class="yq-why">${fmt(Q.whyTwo, { said })}</p>`
          + d.map(([n, w]) => { const p = M[n]; return `<div class="yq-res s"><div>${can(n, 60)}</div><div><div class="yq-when">${w}</div><span class="yq-num">#${n}</span><p class="yq-txt">${p.short}</p>${dots(p)}<div class="yq-pr"><span>${p.price}</span><a href="#matcha-${n}" data-yq-go>${fmt(Q.seeMain, { n })}</a></div></div></div>`; }).join("");
      } else {
        const sub = second(d); ns = [d];
        h = one(d, fmt(Q.whyOne, { said, n: d, long: M[d].long }), sub, sub && sub[0] === 3 ? Q.secondLabelTo3 : Q.secondLabel);
      }
    }
    const rows = ["exp", "taste", "use", "mood"].filter(k => A[k]);
    const slip = `<div class="yq-slip"><div class="yq-st">${Q.slipTitle}</div>${rows.map(k => `<div class="yq-ln"><span>${Q.slipRows[k]}</span><b>${lab(Q.slip, k)}</b></div>`).join("")}<div class="yq-stamps">${ns.map(n => `<div class="yq-stamp">#${n}</div>`).join("")}</div></div>`;
    qa.innerHTML = slip + h + `<p class="yq-free">${Q.free}</p>`;
    qa.querySelectorAll("[data-yq-go]").forEach(a => a.addEventListener("click", close));   // 札へ飛ぶ時は窓を閉じる
    fr.innerHTML = `<button class="yq-again">${Q.again}</button>`; fr.querySelector("button").onclick = start;
    root.dataset.result = ns.join("|");
    body.scrollTop = 0;
  }
  function start() { A = {}; fr.innerHTML = ""; delete root.dataset.result; next(); }
  start();

  /* ページ側と、確かめ用の出入口 */
  window.YQ = { can, dots, open, close, restart: start, show: a => { A = Object.assign({}, a); fr.innerHTML = ""; open(); next(); return root.dataset.result; } };
})();
