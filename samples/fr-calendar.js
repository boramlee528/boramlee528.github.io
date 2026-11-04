// 국내선 캘린더 서치 샘플 (운임·편명은 모두 가상)
(function () {
  const { el, btn, block, select, field, table, badge, won, pad, rng, render } = Kit;

  const ROUTES = [["GMP-CJU", "김포 → 제주"], ["CJU-GMP", "제주 → 김포"], ["GMP-PUS", "김포 → 부산"], ["PUS-CJU", "부산 → 제주"]];
  const HOLIDAYS = { "2026-12-25": true, "2027-01-01": true };
  const key = (y, m, d) => `${y}-${pad(m + 1)}-${pad(d)}`;

  // 노선·날짜별 최저가를 고정 시드로 만듭니다. 주말·공휴일은 비싸게.
  function fareOf(route, y, m, d) {
    const r = rng([...route].reduce((a, c) => a + c.charCodeAt(0), 0) * 1000 + y * 400 + m * 40 + d)();
    const dow = new Date(y, m, d).getDay();
    const base = route.includes("PUS-CJU") ? 38000 : route.includes("PUS") ? 42000 : 29000;
    const peak = dow === 5 || dow === 6 || dow === 0 || HOLIDAYS[key(y, m, d)] ? 1.9 : 1;
    return Math.round((base + r * 52000) * peak / 100) * 100;
  }
  function flightsOf(route, y, m, d) {
    const r = rng(y * 500 + m * 40 + d + route.length);
    const air = ["A1", "B2", "C3", "E5"];
    return [7, 9, 11, 14, 17, 20].map((h, i) => {
      const min = Math.floor(r() * 6) * 10;
      const price = Math.round((fareOf(route, y, m, d) * (1 + r() * 0.8)) / 100) * 100;
      return { air: air[i % 4], no: `${air[i % 4]} ${120 + i * 7}`, time: `${pad(h)}:${pad(min)}`, price, seats: 1 + Math.floor(r() * 9) };
    }).map((f, i, arr) => (i === 0 ? { ...f, price: fareOf(route, y, m, d) } : f)).sort((a, b) => a.time.localeCompare(b.time));
  }

  function calendar(route, y, m, onPick, picked, matchFn) {
    const first = new Date(y, m, 1).getDay();
    const days = new Date(y, m + 1, 0).getDate();
    const fares = [];
    for (let d = 1; d <= days; d++) fares.push(fareOf(route, y, m, d));
    const low = Math.min(...fares);
    const grid = el("div", { className: "cal" }, ["일", "월", "화", "수", "목", "금", "토"].map((t) => el("div", { className: "dow", textContent: t })));
    for (let i = 0; i < first; i++) grid.append(el("div", { className: "blank" }));
    for (let d = 1; d <= days; d++) {
      const dow = new Date(y, m, d).getDay();
      const cls = [dow === 0 ? "sun" : dow === 6 ? "sat" : "", HOLIDAYS[key(y, m, d)] ? "hol" : "", fares[d - 1] === low ? "low" : "", matchFn && matchFn(y, m, d) ? "match" : ""].join(" ");
      const b = el("button", { type: "button", className: cls, ariaLabel: `${m + 1}월 ${d}일 최저 ${won(fares[d - 1])}원` }, [el("span", { className: "d", textContent: String(d) }), el("span", { className: "p", textContent: won(fares[d - 1]) })]);
      b.setAttribute("aria-pressed", String(picked === d));
      b.addEventListener("click", () => onPick(d));
      grid.append(b);
    }
    return grid;
  }

  /* ---------- 기존 기획: PC 캘린더 ---------- */
  function buildPc() {
    const route = select(ROUTES, "GMP-CJU", "노선");
    const month = select([["2026-11", "2026년 11월"], ["2026-12", "2026년 12월"], ["2027-01", "2027년 1월"]], "2026-12", "월");
    const calHost = el("div");
    const listHost = el("div");
    let picked = null;
    function draw() {
      const [y, m] = month.value.split("-").map(Number);
      calHost.replaceChildren(calendar(route.value, y, m - 1, (d) => { picked = d; draw(); }, picked));
      if (!picked) return listHost.replaceChildren(el("p", { className: "muted", textContent: "날짜를 누르면 그날 항공편이 아래에 나옵니다. 초록색 금액이 이달 최저가입니다." }));
      const list = flightsOf(route.value, y, m - 1, picked);
      listHost.replaceChildren(
        el("p", { className: "label", textContent: `${m}월 ${picked}일 · ${ROUTES.find((r) => r[0] === route.value)[1]} · ${list.length}편` }),
        table(["편명", "출발", "#잔여석", "#운임(원)", ""], list.map((f) => [f.no, f.time, String(f.seats), won(f.price), btn("선택", "text-btn", () => Kit.alert(`${f.no} ${f.time} 편을 선택했습니다. 다음 단계는 탑승객 정보 입력입니다.`))]))
      );
    }
    route.addEventListener("change", () => { picked = null; draw(); });
    month.addEventListener("change", () => { picked = null; draw(); });
    draw();
    return [
      block(1, "노선·월 선택", [el("div", { className: "form-grid" }, [field("노선", route, "span-2"), field("출발 월", month, "span-2")])]),
      block(2, "날짜별 최저가 달력", [calHost]),
      block(3, "선택한 날짜의 항공편", [listHost]),
    ];
  }

  /* ---------- 기존 기획: 모바일 날짜 바 ---------- */
  function buildMobile() {
    const strip = el("div", { className: "strip" });
    const list = el("div", { className: "device-body" });
    const start = new Date(2026, 11, 14);
    let pick = 3;
    function draw() {
      strip.replaceChildren(...Array.from({ length: 10 }, (_, i) => {
        const d = new Date(start); d.setDate(start.getDate() + i);
        const b = el("button", { type: "button" }, [`${d.getMonth() + 1}.${d.getDate()} (${"일월화수목금토"[d.getDay()]})`, el("b", { textContent: won(fareOf("GMP-CJU", d.getFullYear(), d.getMonth(), d.getDate())) })]);
        b.setAttribute("aria-pressed", String(i === pick));
        b.addEventListener("click", () => { pick = i; draw(); });
        return b;
      }));
      const d = new Date(start); d.setDate(start.getDate() + pick);
      list.replaceChildren(...flightsOf("GMP-CJU", d.getFullYear(), d.getMonth(), d.getDate()).slice(0, 4).map((f) =>
        el("div", { className: "flight" }, [el("div", { className: "top" }, [el("span", { textContent: `${f.time} ${f.no}` }), el("span", { textContent: `${won(f.price)}원` })]), el("span", { className: "muted small", textContent: `잔여 ${f.seats}석` })])
      ));
    }
    draw();
    return [block(1, "모바일: 가로 날짜 바 + 목록", [el("div", { className: "device" }, [el("div", { className: "device-bar", textContent: "김포 → 제주 · 성인 1" }), strip, list])]),
      block(2, "PC와 다르게 설계한 부분", [el("ul", { className: "list-plain" }, [
        el("li", { textContent: "한 달 달력 대신 앞뒤 10일 가로 바: 작은 화면에서 금액 비교가 쉽도록" }),
        el("li", { textContent: "날짜를 바꿔도 목록 위치 유지: 스크롤을 다시 하지 않도록" }),
        el("li", { textContent: "운임은 캐시된 최저가, 상세 운임은 편 선택 시 재조회" }),
      ])])];
  }

  /* ---------- AI: 자연어 항공권 검색 ---------- */
  const CITY = { 김포: "GMP", 서울: "GMP", 제주: "CJU", 제주도: "CJU", 부산: "PUS", 김해: "PUS" };
  function parse(text) {
    const t = text.replace(/\s+/g, " ").trim();
    const found = Object.keys(CITY).filter((c) => t.includes(c)).sort((a, b) => t.indexOf(a) - t.indexOf(b))
      .filter((c, i, arr) => arr.findIndex((x) => CITY[x] === CITY[c]) === i);
    const out = { slots: [], ask: [] };
    let from = null, to = null;
    const fromHit = /(\S+?)(에서|출발)/.exec(t);
    if (fromHit && CITY[fromHit[1]]) from = CITY[fromHit[1]];
    found.forEach((c) => { if (CITY[c] !== from && !to) to = CITY[c]; });
    if (!from && found.length > 1) { from = CITY[found[0]]; to = CITY[found[1]]; }
    if (!from) { from = "GMP"; out.ask.push("출발지가 없어 김포로 가정했습니다. 맞나요?"); }
    out.slots.push(["출발", from, fromHit ? 95 : found.length > 1 ? 85 : 60], ["도착", to || "?", to ? 96 : 0]);
    if (!to) out.ask.push("어디로 가시나요?");
    let month = 11;
    if (/다음 ?달/.test(t)) month = 11; else { const mm = /(\d{1,2})월/.exec(t); if (mm) month = Number(mm[1]) - 1; }
    out.slots.push(["월", `${month + 1}월`, 92]);
    let dows = null;
    if (/주말/.test(t)) dows = [5, 6, 0]; else if (/평일/.test(t)) dows = [1, 2, 3, 4];
    const wk = /(첫째|둘째|셋째|넷째) ?주/.exec(t);
    const week = wk ? ["첫째", "둘째", "셋째", "넷째"].indexOf(wk[1]) : null;
    if (dows) out.slots.push(["요일", dows.length === 3 ? "금·토·일" : "월~목", 88]);
    if (week !== null) out.slots.push(["주차", `${wk[1]} 주`, 90]);
    let time = null;
    if (/오전|아침/.test(t)) time = "오전"; else if (/오후|저녁/.test(t)) time = "오후";
    if (time) out.slots.push(["시간대", time, 90]);
    const sort = /최저가|싼|저렴/.test(t) ? "최저가순" : "출발시간순";
    out.slots.push(["정렬", sort, /최저가|싼|저렴/.test(t) ? 97 : 70]);
    out.q = { from, to, month, dows, week, time, sort };
    return out;
  }
  function buildAi() {
    const box = el("input", { type: "text", value: "다음 달 주말 제주도 최저가", ariaLabel: "자연어 검색어" });
    const chips = el("div", { className: "chips" });
    const slotsHost = el("div");
    const resultHost = el("div");
    const examples = ["다음 달 주말 제주도 최저가", "12월 첫째 주 부산에서 제주 오전", "1월 평일 김포 부산 싼 거", "제주 가는 비행기"];
    examples.forEach((ex) => chips.append(btn(ex, "", () => { box.value = ex; run(); })));
    function run() {
      const r = parse(box.value);
      slotsHost.replaceChildren(
        table(["조건", "AI가 이해한 값", "#신뢰도"], r.slots.map(([k, v, c]) => [k, v === "?" ? badge("확인 필요", "warn") : v, c ? `${c}%` : "-"])),
        ...r.ask.map((q) => el("p", { className: "small", style: "margin-top:6px" }, [badge("되묻기", "info"), " ", q]))
      );
      const q = r.q;
      if (!q.to) return resultHost.replaceChildren(el("p", { className: "muted", textContent: "도착지를 알아야 검색할 수 있습니다. 화면에서 도착지를 되묻고, 답을 받으면 바로 검색합니다." }));
      const route = `${q.from}-${q.to}`;
      const y = q.month >= 11 ? 2026 : 2027;
      const m = q.month;
      const match = (yy, mm, d) => {
        const dow = new Date(yy, mm, d).getDay();
        if (q.dows && !q.dows.includes(dow)) return false;
        if (q.week !== null && Math.floor((d - 1) / 7) !== q.week) return false;
        return true;
      };
      const days = new Date(y, m + 1, 0).getDate();
      const cands = [];
      for (let d = 1; d <= days; d++) if (match(y, m, d)) cands.push([d, fareOf(route, y, m, d)]);
      cands.sort((a, b) => a[1] - b[1]);
      resultHost.replaceChildren(
        el("p", { className: "label", textContent: `${route} · ${y}년 ${m + 1}월 · 조건에 맞는 날 ${cands.length}일 (파란 칸)` }),
        calendar(route, y, m, (d) => Kit.alert(`${m + 1}월 ${d}일 항공편 목록으로 이동합니다.`), null, match),
        el("p", { className: "small", style: "margin-top:8px" }, [badge("추천", "ok"), ` 가장 싼 날: ${cands.slice(0, 3).map(([d, f]) => `${m + 1}/${d} ${won(f)}원`).join(" · ")}`])
      );
    }
    box.addEventListener("keydown", (e) => { if (e.key === "Enter") run(); });
    run();
    return [
      block(1, "문장으로 검색", [el("div", { className: "row" }, [el("div", { style: "flex:1;min-width:200px" }, [box]), btn("검색", "solid", run)]), el("div", { style: "margin-top:8px" }, [chips])]),
      block(2, "AI가 이해한 검색 조건", [slotsHost]),
      block(3, "기존 캘린더 서치로 결과 표시", [resultHost]),
    ];
  }

  render({
    id: "fr-calendar",
    plan: {
      name: "국내선 캘린더 서치",
      changes: [
        ["최저가 찾기", "날짜를 하나씩 바꿔 가며 다시 검색", "한 달 날짜별 최저가를 달력 한 화면에서 비교"],
        ["모바일", "PC 화면을 그대로 축소", "앞뒤 10일 가로 날짜 바와 목록 분리"],
        ["운임 조회", "날짜 변경마다 실시간 조회", "달력은 최저가 캐시, 편 선택 시 실시간 재조회"],
      ],
      tabs: [
        { label: "PC 캘린더", build: buildPc, spec: [
          ["노선·월 선택", "노선과 월을 고르면 달력이 바로 바뀝니다. 지난 날짜는 노출하지 않습니다."],
          ["최저가 달력", "날짜마다 그날 최저가를 표시하고, 이달 최저가는 초록색으로 강조합니다. 토·일·공휴일은 색으로 구분합니다."],
          ["항공편 목록", "날짜를 누르면 편명·출발 시간·잔여석·운임 목록이 열립니다."],
        ] },
        { label: "모바일 날짜 바", build: buildMobile, spec: [
          ["가로 날짜 바", "좌우로 밀어 날짜를 바꾸고, 날짜마다 최저가를 함께 보여 줍니다."],
          ["설계 차이", "PC와 같은 데이터를 쓰되 작은 화면에 맞게 비교 범위를 10일로 줄였습니다."],
        ] },
      ],
    },
    ai: {
      name: "자연어 항공권 검색",
      result: "'다음 달 주말 제주도 최저가' 같은 문장을 검색 조건으로 바꿔, 기존 캘린더 서치 화면에 결과를 보여 주는 기획입니다.",
      story: [
        ["출발점", "캘린더 서치로 날짜 비교는 쉬워졌지만, 노선·월·요일을 하나씩 고르는 단계는 그대로였습니다."],
        ["AI 적용", "문장에서 출발·도착·기간·요일·시간대·정렬을 뽑고, 빠진 조건은 되묻습니다."],
        ["측정 지표", "검색 성공률(되묻기 없이 결과까지), 검색→예약 전환율"],
      ],
      bridge: [
        ["노선·월·날짜 검색 조건 정의", "AI가 채워야 할 슬롯(출발·도착·월·요일·시간대·정렬) 목록"],
        ["날짜별 최저가 달력", "AI 결과를 새 화면 없이 기존 달력에 표시"],
        ["공휴일·주말 구분 규칙", "'주말', '연휴' 같은 표현을 날짜로 바꾸는 기준"],
      ],
      tabs: [
        { label: "문장 검색", build: buildAi, spec: [
          ["문장 입력", "예시 문장을 누르거나 직접 입력합니다. 엔터로도 검색됩니다."],
          ["조건 확인", "AI가 이해한 조건과 신뢰도를 보여 줍니다. 출발지·도착지가 빠지면 가정하지 않고 되묻습니다."],
          ["결과 연결", "조건에 맞는 날을 기존 달력에 파란 칸으로 표시하고, 가장 싼 날 3개를 추천합니다."],
        ] },
      ],
    },
  });
})();
