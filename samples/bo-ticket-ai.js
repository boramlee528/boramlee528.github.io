// '자동발권 실패 원인 추천' AI 기획 제안을 화면으로 구체화한 샘플입니다.
// 기존 자동발권 고도화 기획을 바탕으로 했으며, 실패 로그·PNR·효과 수치는 모두 가상 데이터입니다.
(function () {
  const byId = (id) => document.getElementById(id);

  function el(tag, props, children) {
    const node = Object.assign(document.createElement(tag), props);
    if (children) node.append(...children.filter((c) => c != null));
    return node;
  }
  function button(label, className, onClick) {
    const node = el("button", { type: "button", className, textContent: label });
    node.addEventListener("click", onClick);
    return node;
  }
  const mark = (n) => el("span", { className: "mark", textContent: String(n), ariaLabel: `설명 ${n}` });
  const screenTitle = (n, text) => el("h3", { className: "screen-title" }, [mark(n), text]);
  const won = (n) => n.toLocaleString("ko-KR");
  const pad = (n) => String(n).padStart(2, "0");
  const hhmm = (m) => `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
  const now = () => { const d = new Date(); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };

  /* ---------- 가상 데이터 ---------- */
  const ATTEMPTS = 1284;
  const FIRST_OK = 1122;
  const OTAS = ["하늘길투어", "온에어트립", "트래블메이트", "여행공방", "제휴몰 B2B"];
  const ROUTES = [["A1", "ICN-NRT"], ["B2", "ICN-BKK"], ["C3", "ICN-FUK"], ["D4", "GMP-KIX"], ["E5", "ICN-DAD"], ["F6", "ICN-SGN"], ["G7", "ICN-MNL"], ["H8", "ICN-HKG"]];
  const ACT = { retry: "재시도", notify: "고객 알림톡", transfer: "수동발권 이관" };
  const STATE = { wait: "대기", run: "재시도 중", ok: "발권 완료", fail: "재시도 실패", notified: "고객 안내 발송", manual: "수동 이관" };

  const CLUSTERS = [
    { id: "card", name: "카드 승인 거절", n: 38, conf: 96, rec: "notify", retryP: 0.04, afterNotify: 0.85,
      logs: ["CC AUTHORIZATION DECLINED - RESP CODE 51", "PAYMENT ERROR: CARD LIMIT EXCEEDED", "CC AUTHORIZATION DECLINED - RESP CODE 05"],
      marks: ["DECLINED", "RESP CODE 51", "RESP CODE 05", "LIMIT EXCEEDED"],
      why: "카드사 응답 코드 51(한도 초과)과 05(승인 거절)가 반복됩니다. 같은 카드로 재시도해도 성공 가능성이 낮습니다.",
      steps: ["고객에게 결제수단 변경 알림톡을 보냅니다.", "고객이 카드를 바꿔 재결제하면 자동발권을 재시도합니다.", "발권 시한 2시간 전까지 미결제면 담당자가 확인합니다."] },
    { id: "fare", name: "운임 재계산 필요", n: 31, conf: 93, rec: "retry", retryP: 0.82,
      logs: ["NEED FARE RECALCULATION", "TST EXPIRED - PLEASE REPRICE", "STORED FARE NO LONGER VALID"],
      marks: ["FARE RECALCULATION", "TST EXPIRED", "REPRICE", "NO LONGER VALID"],
      why: "저장 운임이 만료되었거나 운임이 바뀌었습니다. 재계산 후 결제 금액과 차액이 없으면 그대로 발권할 수 있습니다.",
      steps: ["PNR 운임을 재계산합니다.", "차액이 0원이면 자동발권을 재시도합니다.", "차액이 생기면 고객에게 차액 결제 알림톡을 보냅니다."] },
    { id: "sys", name: "GDS 응답 지연·세션 오류", n: 27, conf: 98, rec: "retry", retryP: 0.93, autoOk: true,
      logs: ["TIMEOUT AFTER 30000MS - TICKETING SERVICE", "SESSION ALREADY IN USE", "SYSTEM ERROR 9999 - RETRY"],
      marks: ["TIMEOUT", "SESSION ALREADY IN USE", "SYSTEM ERROR 9999", "RETRY"],
      why: "응답 시간 초과와 세션 충돌은 일시 오류입니다. 10:40~10:55에 몰려 있어 GDS 측 지연으로 판단합니다.",
      steps: ["5분 간격으로 최대 3회 재시도합니다.", "3회 모두 실패하면 수동발권으로 이관합니다.", "같은 시간대에 20건 이상 몰리면 GDS 장애 공지를 확인합니다."] },
    { id: "rule", name: "자동발권 제한 설정 해당", n: 22, conf: 99, rec: "transfer", retryP: 0,
      logs: ["AUTO TKT BLOCKED BY RULE: AIRLINE=B2 / PTC=INF", "AUTO TKT BLOCKED BY RULE: FARE=LOCAL", "AUTO TKT BLOCKED BY RULE: ARR REGION=E1"],
      marks: ["AUTO TKT BLOCKED BY RULE", "AIRLINE=B2 / PTC=INF", "FARE=LOCAL", "ARR REGION=E1"],
      why: "‘기존 기획’ 탭의 제한 설정·항공사별 설정에 걸린 건입니다. 시스템 오류가 아니므로 재시도해도 결과가 같습니다.",
      steps: ["수동발권 담당자에게 이관합니다.", "설정이 의도한 것인지 자동발권 제한 설정 화면에서 확인합니다.", "해제할 설정이면 사유를 남기고 수정합니다."] },
    { id: "seg", name: "여정 상태 불일치", n: 18, conf: 88, rec: "transfer", retryP: 0.55,
      logs: ["SEGMENT STATUS HX - NOT TICKETABLE", "SCHEDULE CHANGE PENDING - STATUS TK", "SEGMENT STATUS UN - FLIGHT CANCELLED"],
      marks: ["STATUS HX", "STATUS TK", "STATUS UN", "SCHEDULE CHANGE"],
      why: "좌석 상태가 확정(HK)이 아닙니다. TK는 스케줄 변경을 수락하면 발권할 수 있고, HX·UN은 재예약이 필요합니다.",
      steps: ["TK 건은 스케줄 변경을 수락한 뒤 재시도합니다.", "HX·UN 건은 수동발권 담당자에게 이관해 재예약합니다.", "고객에게 스케줄 변경 안내 알림톡을 보냅니다."] },
    { id: "endo", name: "Endorsement 문구 누락", n: 11, conf: 94, rec: "retry", retryP: 0.95,
      logs: ["ENDORSEMENT MANDATORY FOR FARE BASIS YLOWKR", "MISSING FE ELEMENT", "ENDORSEMENT MANDATORY FOR FARE BASIS QEEKR"],
      marks: ["ENDORSEMENT MANDATORY", "MISSING FE ELEMENT"],
      why: "운임 규정상 필수인 Endorsement 문구가 PNR에 없습니다. 규정의 문구를 넣으면 바로 발권됩니다.",
      steps: ["운임 규정에서 Endorsement 문구를 가져와 넣습니다.", "자동발권을 재시도합니다.", "같은 Fare Basis가 반복되면 Endorsement 추가 설정에 등록합니다."] },
    { id: "pax", name: "탑승객 정보 누락", n: 9, conf: 91, rec: "notify", retryP: 0.05, afterNotify: 0.9,
      logs: ["SSR DOCS MISSING FOR PAX 2", "INFANT DATE OF BIRTH REQUIRED", "SSR DOCS MISSING FOR PAX 1"],
      marks: ["SSR DOCS MISSING", "DATE OF BIRTH REQUIRED"],
      why: "여권 정보나 유아 생년월일이 비어 있습니다. 고객이 정보를 입력해야 진행할 수 있습니다.",
      steps: ["고객에게 탑승객 정보 입력 요청 알림톡을 보냅니다.", "정보가 들어오면 자동발권을 재시도합니다."] },
    { id: "cur", name: "로컬 운임 통화 불일치", n: 4, conf: 62, rec: "transfer", retryP: 0.2,
      logs: ["CURRENCY MISMATCH - POS KR / FARE USD", "UNABLE TO APPLY LOCAL FARE"],
      marks: ["CURRENCY MISMATCH", "LOCAL FARE"],
      why: "로컬 운임 적용 건에서 판매 지점과 운임 통화가 다릅니다. 사례가 적어 판단을 보류합니다.",
      steps: ["수동발권 담당자가 판매 지점과 운임 통화를 확인합니다.", "아래에서 실제 원인을 지정하면 다음 분류에 반영합니다."] },
    { id: "unk", name: "미분류", n: 2, conf: null, rec: "transfer", retryP: 0.3,
      logs: ["ERROR 4410 - CHECK PNR", "UNEXPECTED RESPONSE FROM HOST"], marks: [],
      why: "학습된 패턴과 맞는 원인이 없습니다. 담당자가 원인을 지정하면 다음부터 묶음에 포함됩니다.",
      steps: ["로그 원문과 PNR 이력을 확인합니다.", "아래에서 실제 원인을 지정합니다."] },
  ];
  const clusterOf = (id) => CLUSTERS.find((c) => c.id === id);
  const confident = (c) => c.conf != null && c.conf >= 70;

  // 새로고침해도 같은 샘플이 나오도록 고정 시드를 씁니다.
  let seed = 20261103;
  function rnd() {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
  const CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const pnr = () => Array.from({ length: 6 }, () => CHARS[Math.floor(rnd() * CHARS.length)]).join("");

  const rows = [];
  CLUSTERS.forEach((c) => {
    for (let i = 0; i < c.n; i++) {
      const route = pick(ROUTES);
      rows.push({
        id: rows.length, c: c.id, pnr: pnr(), ota: pick(OTAS), air: route[0], route: route[1],
        amt: Math.round((180000 + rnd() * 1270000) / 100) * 100,
        min: c.id === "sys" ? 640 + Math.floor(rnd() * 16) : 540 + Math.floor(rnd() * 330),
        log: pick(c.logs), st: "wait", notified: false,
      });
    }
  });

  const state = { cur: "card", filter: "open", sel: new Set(), fb: {}, cause: {}, auto: {}, retries: 0, retryOk: 0, history: [] };
  const isOpen = (r) => r.st === "wait" || r.st === "fail" || r.st === "notified";

  /* ---------- 화면 조각 ---------- */
  let kpiHost, clusterHost, detailHost, statusLine, historyHost;

  function say(text) { statusLine.textContent = text; }
  function log(act, cluster, n, result) {
    const item = { t: now(), act, cluster, n, result };
    state.history.unshift(item);
    renderHistory();
    return item;
  }

  function renderKpis() {
    const ok = rows.filter((r) => r.st === "ok").length;
    const open = rows.filter(isOpen).length;
    const manual = rows.filter((r) => r.st === "manual").length;
    const rate = ((FIRST_OK + ok) / ATTEMPTS) * 100;
    const tile = (label, metric, value, unit, note) =>
      el("div", {}, [
        el("dt", {}, [label, metric ? el("em", { textContent: "측정 지표" }) : null]),
        el("dd", {}, [value, el("small", { textContent: unit })]),
        el("p", { textContent: note }),
      ]);
    kpiHost.replaceChildren(
      tile("자동발권율", false, rate.toFixed(1), "%", `시도 ${won(ATTEMPTS)}건 · 1차 ${((FIRST_OK / ATTEMPTS) * 100).toFixed(1)}%${ok ? ` → +${((ok / ATTEMPTS) * 100).toFixed(1)}%p` : ""}`),
      tile("미처리 실패", false, String(open), "건", `전체 실패 ${rows.length}건 중`),
      tile("수동 처리", true, String(manual), "건", manual ? "수동발권 담당자 이관" : "이관한 건이 아직 없습니다"),
      tile("재시도 성공률", true, state.retries ? String(Math.round((state.retryOk / state.retries) * 100)) : "-", state.retries ? "%" : "", state.retries ? `${state.retries}건 중 ${state.retryOk}건 발권` : "재시도하면 계산됩니다")
    );
  }

  function renderClusters() {
    const tbody = el("tbody");
    CLUSTERS.forEach((c) => {
      const mine = rows.filter((r) => r.c === c.id);
      const open = mine.filter(isOpen).length;
      const tr = el("tr", { className: c.id === state.cur ? "on" : "" }, [
        el("th", { scope: "row" }, [button(c.name, "", () => { state.cur = c.id; state.sel.clear(); state.filter = "open"; say(""); renderAll(); })]),
        el("td", { className: "num", textContent: `${mine.length}건` }),
        confident(c) ? el("td", { className: "num", textContent: `${c.conf}%` }) : el("td", { className: "num hold", textContent: "판단 보류" }),
        el("td", { textContent: ACT[c.rec] + (state.auto[c.id] ? " · 자동 재시도 중" : "") }),
        el("td", { className: "num", textContent: open ? `${open}건` : "처리 완료" }),
      ]);
      if (c.id === state.cur) tr.querySelector("button").setAttribute("aria-current", "true");
      tbody.append(tr);
    });
    clusterHost.replaceChildren(
      el("table", { className: "cluster-table" }, [
        el("thead", {}, [el("tr", {}, [
          el("th", { scope: "col", textContent: "원인" }), el("th", { scope: "col", className: "num", textContent: "건수" }),
          el("th", { scope: "col", className: "num", textContent: "신뢰도" }), el("th", { scope: "col", textContent: "권장 조치" }),
          el("th", { scope: "col", className: "num", textContent: "미처리" }),
        ])]),
        tbody,
      ])
    );
  }

  function markedLog(text, marks) {
    const node = el("span");
    const hits = marks.slice().sort((a, b) => b.length - a.length);
    let rest = text;
    while (rest) {
      let best = null;
      hits.forEach((m) => { const i = rest.indexOf(m); if (i > -1 && (!best || i < best.i)) best = { i, m }; });
      if (!best) { node.append(rest); break; }
      node.append(rest.slice(0, best.i), el("mark", { textContent: best.m }));
      rest = rest.slice(best.i + best.m.length);
    }
    return node;
  }

  function renderDetail() {
    const c = clusterOf(state.cur);
    const mine = rows.filter((r) => r.c === c.id);

    const logs = el("div", { className: "logs" }, c.logs.map((text) =>
      el("div", { className: "log" }, [el("small", { textContent: `${mine.filter((r) => r.log === text).length}건 · 자동발권 응답 메시지` }), markedLog(text, c.marks)])
    ));

    const toggle = el("input", { type: "checkbox", id: `auto-${c.id}`, checked: !!state.auto[c.id], disabled: !c.autoOk });
    toggle.addEventListener("change", () => {
      state.auto[c.id] = toggle.checked;
      if (toggle.checked) {
        const targets = rows.filter((r) => r.c === c.id && (r.st === "wait" || r.st === "fail"));
        const entry = log("자동 재시도 정책 켬", c.name, targets.length, targets.length ? "진행 중" : "대기 건 없음");
        if (targets.length) retry(targets, entry, true); else renderAll();
      } else {
        log("자동 재시도 정책 끔", c.name, 0, "이후 건은 담당자 승인 후 처리");
        renderAll();
      }
    });

    const filters = [["open", "미처리", isOpen], ["all", "전체", () => true], ["done", "처리됨", (r) => !isOpen(r)]];
    const list = mine.filter(filters.find((f) => f[0] === state.filter)[2]).sort((a, b) => b.min - a.min);
    const selectable = list.filter(isOpen);

    let table;
    if (!list.length) {
      table = el("p", { className: "no-result", textContent: state.filter === "open" ? "미처리 건이 없습니다. ‘처리됨’에서 결과를 확인하세요." : "해당하는 PNR이 없습니다." });
    } else {
      const all = el("input", { type: "checkbox", ariaLabel: "전체 선택", disabled: !selectable.length, checked: selectable.length > 0 && selectable.every((r) => state.sel.has(r.id)) });
      all.addEventListener("change", () => { selectable.forEach((r) => (all.checked ? state.sel.add(r.id) : state.sel.delete(r.id))); renderDetail(); });
      table = el("div", { className: "pnr-wrap" }, [el("table", { className: "pnr-table" }, [
        el("thead", {}, [el("tr", {}, [el("th", {}, [all]), ...["PNR", "OTA", "항공사·노선", "결제 금액(원)", "실패 시각", "응답 메시지", "상태"].map((h, i) =>
          el("th", { scope: "col", className: i === 3 ? "num" : "", textContent: h }))])]),
        el("tbody", {}, list.map((r) => {
          const cb = el("input", { type: "checkbox", ariaLabel: `${r.pnr} 선택`, checked: state.sel.has(r.id), disabled: !isOpen(r) });
          cb.addEventListener("change", () => { cb.checked ? state.sel.add(r.id) : state.sel.delete(r.id); renderDetail(); });
          return el("tr", {}, [
            el("td", {}, [cb]),
            el("td", { className: "code", textContent: r.pnr }),
            el("td", { textContent: r.ota }),
            el("td", { className: "code", textContent: `${r.air} ${r.route}` }),
            el("td", { className: "num", textContent: won(r.amt) }),
            el("td", { textContent: `11/03 ${hhmm(r.min)}` }),
            el("td", {}, [el("span", { className: "msg", textContent: r.log, title: r.log })]),
            el("td", {}, [el("span", { className: `state ${r.st}`, textContent: STATE[r.st] })]),
          ]);
        })),
      ])]);
    }

    const picked = [...state.sel].map((id) => rows[id]).filter((r) => r.c === c.id && isOpen(r));
    const actions = ["retry", "notify", "transfer"].map((k) => {
      const b = button(ACT[k], k === c.rec && confident(c) ? "solid" : "line-btn", () => act(k, picked, c));
      b.disabled = !picked.length;
      return b;
    });

    const feedback = el("div", { className: "feedback" }, [mark(6)]);
    if (confident(c)) {
      feedback.append(el("span", { className: "q", textContent: "이 원인 추천이 맞았나요?" }));
      [["right", "맞음"], ["wrong", "다른 원인"]].forEach(([key, label]) => {
        const b = button(label, "line-btn", () => {
          state.fb[c.id] = key;
          log("추천 피드백", c.name, 0, key === "right" ? "맞음" : "다른 원인으로 표시");
          say(key === "right" ? "피드백을 기록했습니다. 추천 정확도 지표에 반영됩니다." : "실제 원인을 고르면 재학습 데이터로 저장합니다.");
          renderDetail();
        });
        b.setAttribute("aria-pressed", String(state.fb[c.id] === key));
        feedback.append(b);
      });
      if (state.fb[c.id] === "wrong") feedback.append(causeSelect(c));
    } else {
      feedback.append(el("span", { className: "q", textContent: "판단 보류 건입니다. 실제 원인을 지정해 주세요." }), causeSelect(c));
    }

    detailHost.replaceChildren(
      el("div", { className: "detail-head" }, [
        el("b", { textContent: c.name }),
        el("span", { textContent: confident(c) ? `신뢰도 ${c.conf}% · 권장 조치 ${ACT[c.rec]}` : "판단 보류 · 담당자 확인 필요" }),
      ]),
      el("p", { className: "detail-why", textContent: c.why }),
      el("div", { className: "detail-grid" }, [
        el("div", {}, [screenTitle(3, "AI 판단 근거 · 로그 원문"), el("p", { className: "label", textContent: "원인 판단에 쓴 문구를 표시했습니다." }), logs]),
        el("div", {}, [
          el("h3", { className: "screen-title", textContent: "권장 처리 순서" }),
          el("ol", { className: "order" }, c.steps.map((s) => el("li", { textContent: s }))),
          el("div", { className: "policy" }, [
            el("div", {}, [el("b", {}, [mark(5), " 자동 재시도 정책"]), el("small", { textContent: c.autoOk ? "일시 오류 · 신뢰도 90% 이상 · 5분 간격 최대 3회" : "일시 오류가 아닌 원인이라 사용할 수 없습니다" })]),
            el("label", { htmlFor: `auto-${c.id}` }, [toggle, el("span", { textContent: "사용" })]),
          ]),
        ]),
      ]),
      el("div", { className: "pnr-head" }, [
        screenTitle(4, "대상 PNR · 담당자 승인 후 실행"),
        el("div", { className: "filter-tabs" }, filters.map(([key, label, fn]) => {
          const b = button(`${label} ${mine.filter(fn).length}`, "", () => { state.filter = key; renderDetail(); });
          b.setAttribute("aria-pressed", String(state.filter === key));
          return b;
        })),
      ]),
      table,
      el("div", { className: "act-bar" }, [el("span", { className: "sel-info", textContent: picked.length ? `${picked.length}건 선택` : "PNR을 선택하면 조치를 실행할 수 있습니다" }), ...actions]),
      feedback,
    );
  }

  function causeSelect(c) {
    const select = el("select", { ariaLabel: "실제 원인" }, [
      el("option", { value: "", textContent: "실제 원인 선택" }),
      ...CLUSTERS.filter((x) => x.id !== c.id && x.id !== "unk").map((x) => el("option", { value: x.id, textContent: x.name })),
      el("option", { value: "etc", textContent: "기타 (새 원인)" }),
    ]);
    select.value = state.cause[c.id] || "";
    select.addEventListener("change", () => {
      if (!select.value) return;
      state.cause[c.id] = select.value;
      log("원인 지정", c.name, 0, `→ ${select.value === "etc" ? "기타 (새 원인)" : clusterOf(select.value).name}`);
      say("원인을 저장했습니다. 다음 분류부터 반영됩니다.");
    });
    return select;
  }

  function act(kind, list, c) {
    if (!list.length) return;
    state.sel.clear();
    if (kind === "retry") { retry(list, log("재시도 실행", c.name, list.length, "진행 중"), false); return; }
    if (kind === "notify") {
      list.forEach((r) => { r.st = "notified"; r.notified = true; });
      log("고객 알림톡 발송", c.name, list.length, c.id === "card" ? "결제수단 변경 요청" : c.id === "pax" ? "탑승객 정보 입력 요청" : "안내 발송");
      say(`${list.length}건에 알림톡을 보냈습니다. 고객이 응답하면 재시도하세요.`);
    } else {
      list.forEach((r) => { r.st = "manual"; });
      log("수동발권 이관", c.name, list.length, "수동발권 담당자 대기열로 이동");
      say(`${list.length}건을 수동발권 대기열로 넘겼습니다.`);
    }
    renderAll();
  }

  function retry(list, entry, auto) {
    const c = clusterOf(list[0].c);
    list.forEach((r) => { r.st = "run"; });
    renderAll();
    let done = 0, ok = 0;
    list.forEach((r, i) => {
      setTimeout(() => {
        let p = r.notified && c.afterNotify ? c.afterNotify : c.retryP;
        if (c.id === "seg" && !r.log.includes("TK")) p = 0.05;
        const success = rnd() < p;
        r.st = success ? "ok" : "fail";
        state.retries += 1;
        if (success) { state.retryOk += 1; ok += 1; }
        done += 1;
        if (done === list.length) {
          entry.result = `${list.length}건 중 ${ok}건 발권 완료`;
          renderHistory();
          say(`${auto ? "자동 재시도" : "재시도"}: ${entry.result}${c.id === "rule" ? " · 제한 설정 건은 이관하세요" : ""}`);
        }
        renderAll();
      }, 400 + i * 60 + Math.floor(rnd() * 250));
    });
  }

  function renderHistory() {
    if (!historyHost) return;
    if (!state.history.length) {
      historyHost.replaceChildren(el("li", { className: "empty", textContent: "아직 실행한 조치가 없습니다. ‘실패 원인 추천’ 탭에서 PNR을 골라 조치를 실행해 보세요." }));
      return;
    }
    historyHost.replaceChildren(...state.history.map((h) =>
      el("li", {}, [el("time", { textContent: h.t }), el("div", {}, [
        `${h.act}${h.n ? ` · ${h.n}건` : ""} — ${h.result}`,
        el("small", { textContent: `${h.cluster} · 담당자` }),
      ])])
    ));
  }

  function renderAll() { renderKpis(); renderClusters(); renderDetail(); }

  /* ---------- 탭 내용 ---------- */
  function buildRecommend() {
    kpiHost = el("dl", { className: "kpis" });
    clusterHost = el("div", { className: "table-wrap" });
    detailHost = el("div", { className: "detail" });
    statusLine = el("p", { className: "ai-status", role: "status" });
    return [
      el("div", { className: "screen-block" }, [el("div", { className: "block-head" }, [screenTitle(1, "오늘 자동발권 현황")]), kpiHost]),
      el("div", { className: "screen-block" }, [
        el("div", { className: "block-head" }, [screenTitle(2, "실패 원인 묶음"), el("span", { className: "total", textContent: "원인 이름을 누르면 아래에 상세가 열립니다" })]),
        clusterHost, detailHost, statusLine,
      ]),
    ];
  }

  function buildEffect() {
    historyHost = el("ul", { className: "history" });
    renderHistory();
    return [
      el("div", { className: "screen-block" }, [
        el("div", { className: "block-head" }, [screenTitle(1, "도입 전후 비교 · 최근 14일")]),
        el("dl", { className: "compare" }, [
          el("div", {}, [el("dt", { textContent: "일 평균 수동 처리" }), el("dd", {}, ["42.4", el("span", { textContent: "→" }), el("b", { textContent: "19.9건" })])]),
          el("div", {}, [el("dt", { textContent: "재시도 성공률" }), el("dd", {}, ["52%", el("span", { textContent: "→" }), el("b", { textContent: "81%" })])]),
        ]),
        chart(),
        el("div", { className: "legend" }, [
          el("span", {}, [el("i", { style: "background:#c4c4c4" }), "도입 전: 담당자가 로그를 직접 확인"]),
          el("span", {}, [el("i", { style: "background:var(--link)" }), "도입 후: AI 원인 추천 + 담당자 승인 실행"]),
        ]),
        el("p", { className: "total", textContent: "효과 수치는 기획 단계의 목표 예시이며 실제 운영 결과가 아닙니다." }),
      ]),
      el("div", { className: "screen-block" }, [el("div", { className: "block-head" }, [screenTitle(2, "처리 이력")]), historyHost]),
    ];
  }

  function chart() {
    const before = [44, 39, 47, 41, 38, 45, 43];
    const after = [29, 24, 21, 19, 17, 15, 14];
    const vals = before.concat(after);
    const W = 640, H = 220, L = 30, R = 6, T = 24, B = 26, MAX = 50;
    const iw = W - L - R, ih = H - T - B, step = iw / vals.length, bw = step * 0.6;
    const NS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(NS, "svg");
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    svg.setAttribute("class", "chart");
    svg.setAttribute("role", "img");
    svg.setAttribute("aria-label", "AI 추천 도입 전 7일과 후 7일의 일별 수동 처리 건수");
    const add = (tag, attrs, text) => {
      const n = document.createElementNS(NS, tag);
      Object.entries(attrs).forEach(([k, v]) => n.setAttribute(k, v));
      if (text != null) n.textContent = text;
      svg.append(n);
    };
    const txt = { "font-size": 11, fill: "#6b6b6b", "font-family": "Pretendard Variable, sans-serif" };
    [0, 10, 20, 30, 40, 50].forEach((v) => {
      const y = T + ih - (v / MAX) * ih;
      add("line", { x1: L, x2: W - R, y1: y, y2: y, stroke: "#e4e4e4" });
      add("text", { ...txt, x: L - 6, y: y + 4, "text-anchor": "end" }, String(v));
    });
    const start = new Date(2026, 9, 20);
    vals.forEach((v, i) => {
      const x = L + i * step + (step - bw) / 2, h = (v / MAX) * ih, y = T + ih - h;
      add("rect", { x, y, width: bw, height: h, fill: i >= 7 ? "#0b57d0" : "#c4c4c4" });
      if ([0, 6, 7, 13].includes(i)) add("text", { ...txt, fill: "#191919", x: x + bw / 2, y: y - 5, "text-anchor": "middle" }, String(v));
      if (i % 2 === 0 || i === 13) {
        const d = new Date(start); d.setDate(start.getDate() + i);
        add("text", { ...txt, x: x + bw / 2, y: H - 8, "text-anchor": "middle" }, `${d.getMonth() + 1}/${pad(d.getDate())}`);
      }
    });
    const xd = L + 7 * step;
    add("line", { x1: xd, x2: xd, y1: T - 16, y2: T + ih, stroke: "#191919", "stroke-dasharray": "4 3" });
    add("text", { ...txt, fill: "#191919", "font-weight": 700, x: xd + 6, y: T - 8 }, "AI 추천 도입 10/27");
    return svg;
  }

  const TABS = [
    { id: "recommend", label: "실패 원인 추천", build: buildRecommend, spec: [
      ["측정 지표 고정", "제안서의 측정 지표인 수동 처리 건수와 재시도 성공률을 맨 위에 둡니다. 조치를 실행하면 바로 다시 계산합니다."],
      ["원인 묶음", "실패 로그 원문을 오류 코드와 문구 패턴으로 묶어 건수 순으로 보여 줍니다. 신뢰도 70% 미만은 ‘판단 보류’로 사람이 먼저 봅니다."],
      ["판단 근거 공개", "AI가 근거로 쓴 로그 문구를 강조합니다. 담당자가 추천을 그대로 믿지 않고 원문으로 검증할 수 있게 합니다."],
      ["승인 후 실행", "AI는 추천만 하고 실행은 담당자가 PNR을 골라 승인합니다. 권장 조치 버튼만 진하게 표시합니다."],
      ["자동 재시도 정책", "GDS 응답 지연처럼 일시 오류이면서 신뢰도 90% 이상인 원인만 켤 수 있습니다. 나머지는 사람이 승인해야 합니다."],
      ["추천 피드백", "추천이 맞았는지 기록해 정확도를 재고, 다른 원인으로 고친 건은 재학습 데이터로 씁니다."],
    ] },
    { id: "effect", label: "효과 측정", build: buildEffect, spec: [
      ["도입 전후 비교", "도입 전후 7일씩 일별 수동 처리 건수를 비교합니다. 기존 기획의 성과 지표(자동발권율)와 함께 보고합니다."],
      ["처리 이력", "추천과 실행 결과를 남깁니다. 기존 기획의 ‘사유·히스토리’ 규칙처럼 누가 언제 무엇을 했는지 추적합니다."],
    ] },
  ];

  function buildConsole() {
    const tabBar = el("div", { className: "tabs", role: "tablist", ariaLabel: "AI 콘솔 메뉴" });
    const panels = el("div");
    function select(id, focus) {
      TABS.forEach((t) => {
        const on = t.id === id;
        t.button.setAttribute("aria-selected", String(on));
        t.button.tabIndex = on ? 0 : -1;
        t.panel.hidden = !on;
        if (on && focus) t.button.focus();
      });
      if (id === "effect") renderHistory();
    }
    TABS.forEach((t, index) => {
      t.button = el("button", { type: "button", id: `ai-tab-${t.id}`, textContent: t.label, role: "tab" });
      t.button.setAttribute("aria-controls", `ai-panel-${t.id}`);
      t.button.addEventListener("click", () => select(t.id));
      t.button.addEventListener("keydown", (e) => {
        const stepKey = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
        if (!stepKey) return;
        e.preventDefault();
        select(TABS[(index + stepKey + TABS.length) % TABS.length].id, true);
      });
      tabBar.append(t.button);
      t.panel = el("div", { className: "panel", id: `ai-panel-${t.id}`, role: "tabpanel" }, [
        el("div", { className: "screen ai-screen" }, t.build()),
        el("aside", { className: "spec" }, [
          el("h2", { textContent: "기획 설명" }),
          el("ol", {}, t.spec.map(([title, body], i) => el("li", {}, [mark(i + 1), el("div", {}, [el("b", { textContent: title }), body])]))),
        ]),
      ]);
      t.panel.setAttribute("aria-labelledby", `ai-tab-${t.id}`);
      panels.append(t.panel);
    });
    select("recommend");
    renderAll();
    return el("div", { className: "console" }, [
      el("div", { className: "console-bar" }, [el("b", { textContent: "자동발권 실패 원인 추천" }), button("샘플 초기화", "", () => { location.hash = "ai"; location.reload(); })]),
      tabBar, panels,
    ]);
  }

  function buildView() {
    const story = [
      ["출발점", "자동발권 고도화로 자동발권율 약 85~90%를 만들었지만, 나머지 실패 건은 담당자가 로그를 하나씩 읽고 처리했습니다."],
      ["AI 적용", "실패 로그를 원인별로 묶고 조치를 추천합니다. 실행은 담당자가 승인하고, 일시 오류만 규칙으로 자동 재시도합니다."],
      ["측정 지표", "수동 처리 건수, 재시도 성공률, 추천 정확도"],
    ];
    const bridge = [
      ["자동발권 제한 설정·항공사별 설정", "설정에 걸린 실패를 ‘제한 설정 해당’으로 분류해, 재시도 대신 이관을 추천"],
      ["카드 오류 메시지 유형 정리", "카드사 응답 코드를 원인 라벨로 써서 분류 기준과 평가 데이터로 활용"],
      ["로컬 운임 적용·Endorsement 추가", "통화 불일치·문구 누락을 별도 원인으로 묶고 조치 순서를 제시"],
      ["등록·수정 사유와 히스토리", "AI 추천과 담당자 실행을 같은 방식으로 이력에 남김"],
    ];
    return [
      el("header", { className: "sample-head" }, [
        el("p", { className: "sample-meta", textContent: "AI 기획 확장 · 기존 기획 기반 제안" }),
        el("h1", {}, ["자동발권 실패 원인 추천", el("span", { className: "ai-tag", textContent: "AI 기획 제안" })]),
        el("p", { className: "sample-result", textContent: "기존 자동발권 고도화 기획을 AI로 확장하면 어떤 운영 화면이 되는지 그려 본 샘플입니다. 자동발권에 실패한 건을 AI가 원인별로 묶고 조치를 추천해, 수동 처리 건수를 줄이는 것이 목표입니다." }),
        el("dl", { className: "story" }, story.map(([t, b]) => el("div", {}, [el("dt", { textContent: t }), el("dd", { textContent: b })]))),
      ]),
      el("main", {}, [
        el("section", { className: "changes bridge" }, [
          el("h2", { textContent: "기존 기획에서 이어지는 부분" }),
          el("div", { className: "table-wrap" }, [el("table", {}, [
            el("thead", {}, [el("tr", {}, [el("th", { scope: "col", textContent: "기존 기획 산출물" }), el("th", { scope: "col", textContent: "AI 기획에서 쓰는 방식" })])]),
            el("tbody", {}, bridge.map(([a, b]) => el("tr", {}, [el("td", { textContent: a }), el("td", { textContent: b })]))),
          ])]),
        ]),
        el("div", { className: "sample-notice" }, [
          el("b", { textContent: "AI 기획 제안을 화면으로 구체화한 샘플입니다." }),
          " 실제로 구현·운영한 결과가 아니며, 실패 로그·PNR·OTA·효과 수치는 모두 가상 데이터입니다.",
        ]),
        buildConsole(),
      ]),
    ];
  }

  /* ---------- 페이지 탭 ---------- */
  const viewAi = byId("view-ai");
  const viewPlan = byId("view-plan");
  let built = false;
  function show() {
    const ai = location.hash === "#ai";
    if (ai && !built) { viewAi.append(...buildView()); built = true; }
    viewAi.hidden = !ai;
    viewPlan.hidden = ai;
    document.querySelectorAll(".page-tabs a").forEach((a) => {
      if ((a.dataset.view === "ai") === ai) a.setAttribute("aria-current", "page");
      else a.removeAttribute("aria-current");
    });
    byId("back").href = ai ? "../index.html#ai" : "../index.html#bo-ticket";
  }
  window.addEventListener("hashchange", show);
  show();
})();
