// 프로젝트별 '기존 기획' 샘플 화면입니다. 기획서의 정책 규칙을 바탕으로 재구성했습니다.
// 항공사·채널·카드사 이름과 금액, 정책 수치는 모두 가상입니다.
(function () {
  const { el, btn, block, select, input, field, table, badge, won, pad } = Kit;

  const onChange = (control, fn) => {
    control.addEventListener("input", fn);
    control.addEventListener("change", fn);
    return control;
  };
  const number = (value, label, step) => {
    const node = input(value, label, "number");
    if (step) node.step = step;
    return node;
  };
  const grid = (...fields) => el("div", { className: "form-grid" }, fields);
  const flow = (steps) => el("div", { className: "flow-row" }, steps.flatMap((s, i) => [
    el("span", { className: "flow-step " + (s[1] || ""), textContent: s[0] }),
    i < steps.length - 1 ? el("i", { textContent: "›", ariaHidden: "true" }) : null,
  ]));
  const verdict = (tone, title, lines) => el("div", { className: "verdict " + tone }, [
    el("b", { textContent: title }),
    ...lines.map((t) => el("p", { textContent: t })),
  ]);
  // 항목 하나를 고르는 버튼 묶음입니다.
  function chips(options, value, onPick) {
    let current = value;
    const box = el("div", { className: "chips" });
    function draw() {
      box.replaceChildren(...options.map((o) => {
        const [v, t] = Array.isArray(o) ? o : [o, o];
        const b = btn(t, "", () => { current = v; draw(); onPick(v); });
        b.setAttribute("aria-pressed", String(v === current));
        return b;
      }));
    }
    draw();
    return box;
  }
  const floorTo = (n, unit) => Math.floor(n / unit) * unit;
  const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
  const parseDate = (s) => new Date(s + "T00:00:00");
  const fmtDate = (d) => `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())}`;

  /* ---------- 예약관리자 신규 구축 (국내) ---------- */
  function domesticBranch() {
    const stage = select([["book", "예약 생성 중"], ["pay", "결제 승인 완료"], ["tkt", "발권 처리 중"]], "tkt", "진행 단계");
    const res = select([["ok", "정상"], ["err", "오류 발생"], ["notry", "발권 시도 못함"]], "ok", "결과");
    const fee = select([["ok", "성공"], ["fail", "실패"]], "ok", "수수료 결제");
    const out = el("div", { className: "gap-top" });
    function run() {
      const s = stage.value, r = res.value, f = fee.value;
      let to, why, tone = "pass";
      if (s === "book") {
        if (r === "err") { to = "예약오류 리스트"; why = "예약 생성 중 오류는 담당자가 확인하도록 구분해 적재합니다."; tone = "warn"; }
        else { to = "예약카드 생성"; why = "예약이 정상 생성되어 다음 단계로 진행합니다."; }
      } else if (s === "pay") {
        if (r === "notry") { to = "발권요청 리스트"; why = "결제 승인은 정상이지만 발권 시도가 안 된 건은 발권요청 리스트에 남습니다."; tone = "warn"; }
        else if (r === "err") { to = "발권오류 리스트"; why = "발권 처리에 진입한 뒤 생긴 오류입니다."; tone = "stop"; }
        else { to = "발권요청 리스트"; why = "발권 상태가 ‘발권 요청’으로 쌓입니다."; }
      } else if (r === "err" || f === "fail") {
        to = "발권오류 리스트"; tone = "stop";
        why = f === "fail" && r !== "err" ? "발권은 되었지만 여행사 수수료 결제가 실패했습니다." : "발권 실패입니다. PNR과 예약카드 취소 처리 여부를 확인합니다.";
      } else if (r === "notry") {
        to = "발권요청 리스트"; why = "발권이 시작되지 않아 요청 리스트에 남습니다."; tone = "warn";
      } else {
        to = "발권완료 리스트 + 국내선 통계"; why = "발권 성공 데이터는 통계와 일치하게 반영합니다.";
      }
      out.replaceChildren(verdict(tone, `→ ${to}`, [why]));
    }
    [stage, res, fee].forEach((c) => onChange(c, run));
    run();
    return [
      block(1, "조건 선택", [grid(field("진행 단계", stage), field("결과", res), field("수수료 결제", fee))]),
      block(2, "어느 리스트에 쌓일까요?", [out]),
    ];
  }
  function domesticProcess() {
    return [
      block(1, "예약 단계", [el("ol", { className: "list-plain" }, ["예약 생성 (간편결제는 일부 항공사만 가능)", "예약 오류가 나면 예약오류 리스트에서 확인", "카드 결제: 항공사와 카드 유형에 따라 키인 또는 모듈로 처리"].map((t) => el("li", { textContent: t })))]),
      block(2, "발권 단계", [el("ol", { className: "list-plain" }, ["발권요청 리스트에 발권 요청 건 적재", "항공사 API로 발권 처리, 성공하면 발권완료 리스트와 통계에 반영", "발권 실패나 수수료 결제 실패는 발권오류 리스트에 적재"].map((t) => el("li", { textContent: t })))]),
      block(3, "해외항공 예약관리자와의 차이", [table(["항목", "해외항공", "국내선"], [
        ["발권 방식", "GDS 기반 발권과 자동발권 창", "항공사 API 발권"],
        ["오류 관리", "발권 오류 리스트", "예약오류 리스트와 발권오류 리스트를 분리"],
        ["결제", "카드·현금 결제", "카드 키인/모듈 구분, 간편결제는 일부 항공사만"],
        ["화면 구성", "기존 UI", "전체 페이지 6단 구성으로 정리"],
        ["통계", "해외 통계", "국내선 통계 신규"],
      ])]),
    ];
  }

  /* ---------- 예약관리자 신규 구축 (해외) ---------- */
  const INT_MENU = {
    "예약관리": [["예약 조건 검색", "조건별 예약 조회·관리"], ["요청관리", "변경·취소·환불·기타 요청 처리"], ["수수료 조회", "항공사·여행사 수수료 확인"]],
    "입금/결제관리": [["결제 내역", "요금·수수료 결제 확인"], ["정산", "기간별 카드 매입, 입금 내역 리스트 조회"]],
    "발권관리": [["발권 요청 리스트", "결제 후 발권 대기 건"], ["발권 의뢰 리스트", "발권 의뢰 처리"], ["발권 완료 리스트", "티켓번호 확인"], ["발권 오류 리스트", "발권 실패·재처리"]],
    "커뮤니케이션": [["온라인 상담", "1:1 문의·환불접수 유입"], ["Q방 관리", "큐 관리"]],
    "통계": [["항공사별 실적", "기간·항목별 집계 조회"], ["노선별 실적", "기간·항목별 집계 조회"], ["기간별 실적", "기간·항목별 집계 조회"], ["CRS별 실적", "기간·항목별 집계 조회"]],
    "관리자": [["관리자 계정", "권한·계정 관리"]],
  };
  const INT_CARD = [
    ["기본 예약정보", "예약자, 전체 요금, TL, 예약취소(취소전·취소요청·취소철회·취소완료)와 상태 변경 이력"],
    ["예약정보", "세그별 스케줄, PNR 정보(텍스트 복사), 실시간 PNR 조회"],
    ["커뮤니케이션", "직원 메모, 고객 문의 게시글(Q&A)"],
    ["요금정보", "탑승객별 판매가·할인·TAX·수수료, 요금 수정과 변경 이력, 확정/미확정"],
    ["결제정보", "카드 결제 상세, 요금·수수료 결제 확인, 택스 업데이트"],
    ["발권정보", "발권 상태 확인·수정, 티켓 수동 등록, 자동발권창(Fare Quote·카드 키인 승인/취소·보이드)"],
    ["부가정보", "탑승객 이름, 여권·마일리지, 체류지, 승객 추가(INF), 증빙서류"],
  ];
  const INT_STATE = [
    ["PNR 상태", "HK 확약 · HL 대기 · UC 대기마감 · XX 취소"],
    ["요금 상태", "확정 · 미확정"],
    ["여권정보 입력", "요청 · 완료 · 불가 · 나중"],
    ["체류지 입력", "요청 · 완료"],
    ["취소 상태", "취소전 · 취소요청 · 취소철회 · 취소완료"],
    ["발권 상태", "발권전 · 발권요청 · 발권의뢰 · 발권보류 · 발권완료"],
  ];
  function intlMenu() {
    const list = el("div", { className: "gap-top" });
    const draw = (group) => list.replaceChildren(table(["화면", "설명"], INT_MENU[group]));
    draw("예약관리");
    return [block(1, "메뉴 구성 (IA)", [chips(Object.keys(INT_MENU), "예약관리", draw), list])];
  }
  function intlCard() {
    const desc = el("div", { className: "gap-top" });
    const draw = (name) => {
      const card = INT_CARD.find((c) => c[0] === name);
      desc.replaceChildren(verdict("info", card[0], [card[1]]));
    };
    draw(INT_CARD[0][0]);
    return [
      block(1, "예약카드 영역", [chips(INT_CARD.map((c) => c[0]), INT_CARD[0][0], draw), desc]),
      block(2, "예약카드 상태값", [table(["구분", "상태"], INT_STATE)]),
    ];
  }

  /* ---------- 국내선 컨텐츠 관리 ---------- */
  const DC_MENU = [
    ["항공사별 규정 관리", "항공사 공지 규정과 여행사 요청 규정을 입력·관리합니다."],
    ["클래스별 규정 관리", "항공사 클래스 단위 취소/환불 수수료·수하물을 입력합니다. 규정 안내와 자동환불에 연결되며, 적용기간별 수수료 테이블을 추가·삭제할 수 있습니다."],
    ["클래스/등급 관리", "조회와 예약 때 클래스별로 설정된 ‘운임종류’ 값을 적용합니다."],
    ["할인코드 관리", "예약정보 입력 페이지의 ‘요금조건선택’ 리스트에 쓰이는 항공사별 할인 설정입니다."],
    ["유류할증료 관리", "조회 API에 유류할증료 정보가 없을 때 등록 데이터로 대신 노출합니다. 조회 페이지에서만 사용합니다."],
  ];
  function contentMenu() {
    const desc = el("div", { className: "gap-top" });
    const draw = (name) => {
      const m = DC_MENU.find((x) => x[0] === name);
      desc.replaceChildren(verdict("info", m[0], [m[1]]));
    };
    draw(DC_MENU[0][0]);
    return [
      block(1, "5개 관리 메뉴", [chips(DC_MENU.map((m) => m[0]), DC_MENU[0][0], draw), desc]),
      block(2, "운영 방식", [el("ol", { className: "list-plain" }, ["항공사 공지 규정과 여행사 요청 규정을 모두 요금 관리 시스템에서 입력", "여행사 요금관리자에서는 해당 데이터를 불러 노출"].map((t) => el("li", { textContent: t })))]),
    ];
  }
  function contentCode() {
    const value = number("10", "요금 할인 값", "1");
    const fare = number("80000", "예시 운임(원)", "1000");
    const airport = input("", "공항 코드");
    airport.maxLength = 3;
    const classes = input("c, y,B , h", "클래스");
    const out = el("div", { className: "gap-top" });
    function run() {
      const v = +value.value || 0, f = +fare.value || 0, pct = v <= 100;
      const amount = pct ? (f * v) / 100 : Math.min(v, f);
      const ap = airport.value.trim();
      const apOk = ap === "" || /^[A-Za-z]{3}$/.test(ap);
      const cls = [...new Set(classes.value.split(/[,\s]+/).map((x) => x.trim().toUpperCase()).filter(Boolean))].join(",");
      out.replaceChildren(table(["항목", "결과"], [
        ["단위", badge(pct ? "% 단위" : "원 단위", pct ? "info" : "warn")],
        ["화면 표기", `${v >= 1000 ? won(v) : v}${pct ? "%" : "원"}`],
        ["예시 운임 할인액", `${won(amount)}원`],
        ["할인 적용 후", `${won(f - amount)}원`],
        ["공항 코드", apOk ? (ap ? `${ap.toUpperCase()} 노선만` : "전체 지역") : badge("영문 3자리만 입력", "stop")],
        ["클래스 정리", cls || "전체"],
      ]));
    }
    [value, fare, airport, classes].forEach((c) => onChange(c, run));
    run();
    return [
      block(1, "할인코드 입력값 검증", [grid(field("요금 할인 값", value), field("예시 운임(원)", fare), field("공항 코드 (비우면 전체)", airport), field("클래스 (쉼표 구분)", classes)), out]),
      block(2, "등록 목록 예시", [table(["항공사", "할인코드", "운임코드", "운임할인명", "요금 할인"], [
        ["A1", "ADT", "", "[성인] 정상운임", "0%"],
        ["A1", "SIL", "D10", "[성인] 지역 주민", "10%"],
        ["A1", "CH", "C25", "[소아] 정상운임", "25%"],
        ["A1", "INF", "", "[유아] 정상운임", "0%"],
      ]), el("p", { className: "note", textContent: "API로 할인코드를 받는 일부 항공사를 제외하고 항공사별 설정이 필요합니다." })]),
    ];
  }

  /* ---------- 카드 청구할인 ---------- */
  function cardCalc() {
    const f = {
      ad: number("2", "성인 수"), ch: number("1", "소아 수"), inf: number("1", "유아 수"),
      rate: number("5", "청구할인율", "0.1"), cap: number("100000", "일한도", "10000"),
      d2: number("0", "제휴사 할인2", "10000"), fee: number("0", "1인 수수료", "1000"),
      fa: number("1741400", "성인 총요금", "1000"), fc: number("1463900", "소아 총요금", "1000"), fi: number("191200", "유아 총요금", "1000"),
    };
    const out = el("div", { className: "gap-top" });
    const v = (c) => +c.value || 0;
    function run() {
      const ad = v(f.ad), ch = v(f.ch), inf = v(f.inf), rate = v(f.rate) / 100, cap = v(f.cap), d2 = v(f.d2), fee = v(f.fee);
      const limit = cap > 0 && ad + ch > 0 ? floorTo(cap / (ad + ch), 100) : Infinity;
      let total = 0, applied = 0, pay = 0;
      const rows = [["성인", ad, v(f.fa)], ["소아", ch, v(f.fc)], ["유아", inf, v(f.fi)]].filter((p) => p[1] > 0).map(([name, n, t]) => {
        const isInf = name === "유아";
        const calc = floorTo(t * rate, 100);
        const use = isInf ? 0 : Math.min(calc, limit);
        const dd = isInf ? 0 : Math.min(d2, t);
        const benefit = t - use - dd;
        const mult = isInf || rate >= 1 ? 1 : 1 / (1 - rate);
        const amount = (d2 > 0 && !isInf ? floorTo(benefit * mult, 100) : benefit) + (isInf ? 0 : fee);
        total += t * n; applied += use * n; pay += amount * n;
        return [`${name} ×${n}`, won(t), isInf ? "-" : won(calc), limit === Infinity ? "-" : won(limit), isInf ? "0 (제외)" : won(use), won(t - use), dd ? won(dd) : "-", won(amount)];
      });
      out.replaceChildren(
        table(["구분", "#총요금", "#계산액", "#1인 한도", "#적용 할인", "#혜택가", "#할인2", "#결제금액"], rows),
        verdict("pass", `카드사 청구 예상 ${won(total - applied)}원`, [`총요금 합계 ${won(total)}원에서 적용 청구할인 ${won(applied)}원(한도 이내)을 뺀 금액입니다. 제휴사 할인2와 수수료까지 반영한 최종 결제금액 합계는 ${won(pay)}원입니다.`]),
      );
    }
    Object.values(f).forEach((c) => onChange(c, run));
    run();
    return [
      block(1, "승객과 할인 조건", [grid(field("성인 수", f.ad), field("소아 수", f.ch), field("유아 수", f.inf), field("청구할인율(%)", f.rate), field("일한도(원, 0이면 없음)", f.cap), field("제휴사 할인2(1인, 원)", f.d2), field("1인 수수료(원)", f.fee), field("성인 총요금(원)", f.fa), field("소아 총요금(원)", f.fc), field("유아 총요금(원)", f.fi))]),
      block(2, "탑승객별 금액 계산", [out, el("p", { className: "note", textContent: "청구할인액은 100원 단위로 내리고, 한도는 성인+소아 수로 나눕니다. 유아는 할인에서 제외합니다." })]),
    ];
  }
  function cardAdmin() {
    return [
      block(1, "청구할인 설정 목록", [table(["카드사", "할인율", "청구할인코드"], [["카드사 A", "5%", "A01"], ["카드사 A", "7%", "A02"], ["카드사 A", "10%", "A03"], ["카드사 B", "3%", "B01"], ["카드사 C", "5%", "C01"]])]),
      block(2, "구성", [table(["영역", "내용"], [
        ["설정관리", "카드사, 할인율(0.1~99는 %, 100 이상은 원), 최대 할인 한도, 요약·상세 안내 문구를 등록"],
        ["계산", "탑승객별로 계산하고, 모든 금액 계산 영역에서 같은 식을 사용"],
        ["화면 노출", "예약카드와 조회·랜딩·마이페이지의 PC/모바일 노출을 정의"],
      ])]),
    ];
  }

  /* ---------- 국내선 캘린더 서치 ---------- */
  const CAL_ROUTES = { "GMP-CJU": ["김포 → 제주", 52000, []], "GMP-PUS": ["김포 → 부산", 48000, []], "GMP-KWJ": ["김포 → 광주", 46000, [6]], "CJU-GMP": ["제주 → 김포", 54000, []] };
  const CAL_HOLIDAY = { "2026-12-25": "성탄절", "2027-01-01": "신정" };
  const hash = (s) => { let h = 7; for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h; };
  function calCell(route, y, m, d, today) {
    const key = `${y}-${pad(m + 1)}-${pad(d)}`, date = new Date(y, m, d), R = CAL_ROUTES[route], w = date.getDay();
    if (date < today) return { key, st: "past", w };
    if (R[2].includes(w)) return { key, st: "off", w };
    const h = hash(route + key);
    if (h % 13 === 0) return { key, st: "soldout", w };
    const factor = [1, 0.92, 0.9, 0.95, 1.05, 1.25, 1.2][w];
    return { key, st: "price", w, hol: CAL_HOLIDAY[key], p: Math.round((R[1] * factor * (0.85 + (h % 30) / 100)) / 1000) * 1000 };
  }
  function calendarSearch() {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const months = [0, 1, 2].map((i) => new Date(today.getFullYear(), today.getMonth() + i, 1));
    const state = { month: 1, picked: null };
    const route = select(Object.entries(CAL_ROUTES).map(([k, v]) => [k, v[0]]), "GMP-CJU", "구간");
    const trip = select(["편도", "왕복"], "편도", "여정");
    const view = select([["PC", "PC"], ["MO", "모바일 (최저가만)"]], "PC", "화면");
    const pax = number("1", "승객 수"); pax.min = 1; pax.max = 9;
    const host = el("div", { className: "gap-top" });
    const list = el("div", { className: "gap-top" });
    const monthBar = el("div", { className: "gap-top" }, [chips(months.map((m, i) => [i, `${m.getFullYear()}.${pad(m.getMonth() + 1)}`]), 1, (i) => { state.month = i; draw(); })]);
    function draw() {
      const base = months[state.month], y = base.getFullYear(), m = base.getMonth();
      const count = new Date(y, m + 1, 0).getDate();
      const cells = Array.from({ length: count }, (_, i) => calCell(route.value, y, m, i + 1, today));
      const low = Math.min(...cells.filter((c) => c.p).map((c) => c.p));
      const nodes = ["일", "월", "화", "수", "목", "금", "토"].map((d) => el("div", { className: "dow", textContent: d }));
      for (let i = 0; i < base.getDay(); i++) nodes.push(el("div", { className: "blank" }));
      cells.forEach((c, i) => {
        const className = [c.w === 0 ? "sun" : "", c.w === 6 ? "sat" : "", c.hol ? "hol" : "", c.p === low ? "low" : ""].join(" ");
        const text = c.st === "price" ? `${won(c.p / 1000)}천` : c.st === "off" ? "비운항" : "";
        const cell = el("button", { type: "button", className, disabled: c.st === "past" }, [el("span", { className: "d", textContent: String(i + 1) }), el("span", { className: "p", textContent: text })]);
        cell.setAttribute("aria-pressed", String(c.key === state.picked));
        cell.ariaLabel = `${i + 1}일 ${c.st === "soldout" ? "매진" : text || "선택 불가"}${c.hol ? " " + c.hol : ""}`;
        cell.addEventListener("click", () => { state.picked = c.key; draw(); });
        nodes.push(cell);
      });
      host.replaceChildren(el("div", { className: "cal" }, nodes));
      const pick = cells.find((c) => c.key === state.picked);
      const people = Math.min(9, Math.max(1, +pax.value || 1));
      if (view.value === "MO") {
        list.replaceChildren(el("p", { className: "note", textContent: "모바일은 날짜를 고르면 목록 대신 달력 안의 최저가만 보여 줍니다." }));
      } else if (pick && pick.st === "price") {
        const air = [["A1", 1.08, "07:30"], ["B2", 1.04, "09:10"], ["C3", 1, "11:05"], ["D4", 1.02, "13:20"], ["E5", 1.01, "18:45"]];
        list.replaceChildren(
          el("h4", { textContent: `${pick.key.replace(/-/g, ".")} 최저가 조회 리스트 · ${trip.value} · 승객 ${people}명` }),
          table(["항공사", "출발", "#1인 운임(원)", "#총 예상금액(원)"], air.map(([a, f, t]) => { const p = Math.round((pick.p * f) / 1000) * 1000; return [a, t, won(p), won(p * people)]; })),
        );
      } else {
        list.replaceChildren(el("p", { className: "note", textContent: pick ? "매진이거나 운항이 없는 날은 조회 리스트가 없습니다." : "날짜를 누르면 항공사별 최저가 리스트가 나옵니다." }));
      }
    }
    [route, trip, view, pax].forEach((c) => onChange(c, draw));
    draw();
    return [
      block(1, "조회 조건", [grid(field("구간", route), field("여정", trip), field("화면", view), field("승객 수", pax)), monthBar]),
      block(2, "최저가 달력", [host, el("p", { className: "note", textContent: "금액은 예시입니다. 공휴일은 붉게 표시하고, 지난 날짜는 선택할 수 없습니다." })]),
      block(3, "조회 결과", [list]),
    ];
  }
  function calendarRules() {
    return [
      block(1, "표기 규칙", [table(["표기", "의미", "데이터"], [
        ["금액", "그 날의 최저가", "항공사, 날짜, 출발지, 도착지, 좌석등급, 운임, 출발·도착 시간을 캐시에 저장"],
        ["공란", "매진 또는 데이터 없음", "잔여 좌석 수 0, 또는 조회 기간에 저장된 캐시가 없음"],
        ["비운항", "운항 스케줄이 없는 날", "운항 정보 조회 페이지의 요일 데이터를 사용"],
      ])]),
      block(2, "PC와 모바일 차이", [table(["구분", "PC", "모바일"], [
        ["제공 방식", "캘린더 서치 신규 페이지와 메인 달력", "날짜 선택 달력 안에 최저가만 노출"],
        ["도착 도시", "출발지에 따라 공공데이터 기준 목록 제공", "PC와 같은 도시 목록 사용"],
        ["노출 항목", "최저가, 비운항, 매진(공란)", "최저가, 비운항"],
        ["디자인 협업", "디자인 시안 6차 수정까지 요청 문서로 전달", "1차·2차 디자인 요청 문서로 전달"],
      ])]),
    ];
  }

  /* ---------- 오픈마켓 채널 신규 입점 ---------- */
  function marketCalc() {
    const fa = number("1000000", "성인 요금", "10000"), fc = number("800000", "소아 요금", "10000"), fee = number("10000", "수수료", "1000");
    const rate = number("10", "청구할인율", "1"), min = number("1500000", "쿠폰 최소금액", "10000");
    const type = select([["fix", "정액 60,000원"], ["pct", "정률 4%"]], "fix", "바이어 쿠폰");
    const out = el("div", { className: "gap-top" });
    function run() {
      const A = +fa.value || 0, C = +fc.value || 0, T = +fee.value || 0, r = (+rate.value || 0) / 100;
      const sum = A + C, claim = Math.round(sum * r), after = sum - claim + T * 2, total = sum + T * 2;
      const fix = type.value === "fix", ok = total >= (+min.value || 0);
      const coupon = ok ? (fix ? 60000 : Math.round(after * 0.04)) : 0;
      out.replaceChildren(
        table(["항목", "#금액(원)"], [
          ["항공운임 등 총액 (수수료 제외)", won(sum)],
          [`청구할인 ${r * 100}%`, `−${won(claim)}`],
          ["청구할인 적용금액 (수수료 포함, 쿠폰 전)", won(after)],
          [`바이어 쿠폰 ${fix ? "(정액)" : "(정률 4%)"}${ok ? "" : " · 최소금액 미달"}`, `−${won(coupon)}`],
          ["청구할인 예상가 (쿠폰 후)", el("b", { textContent: won(after - coupon) })],
          ["카드 승인금액", won(total - coupon)],
        ]),
        verdict(ok ? "pass" : "warn", ok ? "쿠폰이 적용됩니다" : "쿠폰 최소금액에 못 미칩니다", [`승인금액 합계 ${won(total)}원(수수료 포함) 기준으로 최소 결제금액 조건을 판단합니다.`]),
      );
    }
    [fa, fc, fee, rate, min, type].forEach((c) => onChange(c, run));
    run();
    return [
      block(1, "쿠폰 + 청구할인 계산", [grid(field("성인 요금+TAX(원)", fa), field("소아 요금+TAX(원)", fc), field("수수료(1인, 원)", fee), field("청구할인율(%)", rate), field("바이어 쿠폰", type), field("쿠폰 적용 최소금액(원)", min)), out]),
      block(2, "쿠폰 적용 정책", [table(["구분", "정책"], [
        ["아이템 할인", "승객별로 적용하고 성인만 할인합니다."],
        ["바이어 할인", "PNR 단위로 적용합니다. 성인·소아·유아 총액으로 계산해 1번 승객에게 모두 붙입니다."],
        ["수수료 포함 여부", "할인 대상에 수수료를 포함하는지 구분해 저장하고, 제휴사 할인2를 계산할 때 반영합니다."],
      ])]),
      block(3, "결제금액 노출 수식", [table(["영역", "노출 항목", "수식"], [
        ["1", "항공운임 등 총액", "총요금 + 수수료"],
        ["2", "최종 결제 예상 금액", "총요금 − 제휴사할인2 + 수수료"],
        ["3", "청구할인 예상가", "총요금 − 청구할인 − 제휴사할인2 + 수수료"],
      ])]),
    ];
  }
  function marketCancel() {
    const st = select([["pre", "발권 전"], ["prog", "발권 진행 중 (발권요청·의뢰·보류)"], ["done", "발권 완료"]], "done", "발권 상태");
    const scope = select([["all", "모든 탑승객"], ["part", "일부 탑승객"]], "all", "대상");
    const pay = select([["card", "카드"], ["cash", "현금"]], "card", "결제");
    const out = el("div", { className: "gap-top" });
    function run() {
      let steps;
      if (st.value === "pre") steps = [["취소신청"], [scope.value === "all" ? "전체 취소 완료" : "취소요청 (일부)", "ok"]];
      else if (st.value === "prog") steps = [["취소 탭 선택"], ["[Alert] 발권이 진행중입니다. 진행중에는 변경요청이 불가합니다.", "stop"]];
      else steps = [["환불접수"], [pay.value === "cash" ? "고객 계좌정보 입력 (은행·계좌·예금주)" : "카드 결제 환불 접수"], ["예약카드 환불정보로 유입"], ["1:1 문의에 환불접수 건 생성", "ok"]];
      out.replaceChildren(flow(steps));
    }
    [st, scope, pay].forEach((c) => onChange(c, run));
    run();
    return [block(1, "발권 상태별 처리", [grid(field("발권 상태", st), field("대상", scope), field("결제", pay)), out])];
  }

  /* ---------- 마이페이지 수수료 카드결제 ---------- */
  function feeRefund() {
    const payBy = select([["card", "카드"], ["cash", "현금"]], "card", "항공권 지불수단");
    const when = select([["void", "발권 당일 (VOID)"], ["refund", "발권 다음 날 이후 (환불)"]], "refund", "신청 시점");
    const n = number("2", "환불 탑승객 수"), fare = number("412000", "1인 항공료", "1000"), air = number("60000", "1인 항공사 수수료", "1000"), fee = number("15000", "1인 여행사 수수료", "1000");
    const out = el("div", { className: "gap-top" });
    const flowOut = el("div");
    function run() {
      const card = payBy.value === "card", isVoid = when.value === "void", people = Math.max(1, +n.value || 1);
      const f = +fare.value || 0, a = isVoid ? 0 : +air.value || 0, t = +fee.value || 0;
      const gross = (f - a) * people, feeTotal = t * people;
      const rows = [
        ["환불 구분", isVoid ? "VOID (항공사 수수료 없음)" : "환불"],
        ["항공료 환불 대상", `${won(f * people)}원`],
        ["항공사 수수료", `${won(a * people)}원`],
        ["여행사 수수료", `${won(feeTotal)}원`],
        ...(card
          ? [["추가 결제(카드)", `${won(feeTotal)}원`], ["환불 예정액", el("b", { textContent: `${won(gross)}원` })]]
          : [["추가 결제", "없음 (환불금에서 공제)"], ["환불 예정액", el("b", { textContent: `${won(gross - feeTotal)}원` })]]),
      ];
      out.replaceChildren(table(["항목", "금액"], rows), el("p", { className: "note", textContent: card ? "카드 발권건은 여행사 수수료를 카드로 추가 결제해야 환불 신청이 완료됩니다. 간편결제도 같은 방식입니다." : "현금 발권건은 수수료를 따로 결제하지 않고 환불받을 은행 계좌만 입력합니다." }));
      flowOut.replaceChildren(flow(card
        ? [["환불신청 팝업"], ["탑승객 선택"], ["카드정보 입력"], ["카드 승인", "ok"], ["취소요청 · 카드완료"], ["환불정보 생성 · 환불요청", "ok"]]
        : [["환불신청 팝업"], ["탑승객 선택"], ["환불 계좌 입력"], ["취소요청"], ["수수료 공제 항목 추가"], ["환불정보 생성 · 환불요청", "ok"]]));
    }
    [payBy, when, n, fare, air, fee].forEach((c) => onChange(c, run));
    run();
    return [
      block(1, "환불 신청 팝업", [grid(field("항공권 지불수단", payBy), field("신청 시점", when), field("환불 탑승객 수", n), field("1인 항공료(원)", fare), field("1인 항공사 수수료(원)", air), field("1인 여행사 수수료(원)", fee)), out]),
      block(2, "신청 이후 처리 상태", [flowOut, el("p", { className: "note", textContent: "신청이 끝나면 환불&VOID 리스트로 유입되고, 예약관리자에서 탑승객별 취소 상태가 ‘취소요청’, 환불 상태가 ‘환불요청’으로 바뀝니다." })]),
    ];
  }
  function feeButtons() {
    return [block(1, "마이페이지 버튼 정리", [table(["구분", "AS-IS", "TO-BE"], [
      ["환불 신청", "[환불문의] · [환불접수] · [예약취소]", "[취소/환불] 하나로 통합"],
      ["일반 문의", "환불문의와 함께 처리", "[문의하기]로 분리"],
      ["환불과 VOID", "담당자가 구분", "팝업을 연 시점으로 자동 구분해 수수료를 다르게 적용"],
    ])])];
  }

  /* ---------- 무료취소 가능기간 표기 ---------- */
  const freeRules = [
    ["A1", "B,H,M,Y", "출발일", "-", 60], ["A1", "", "발권일", "+", 0],
    ["B2", "C,F", "출발일", "+", 0], ["B2", "B,M,Y", "출발일", "-", 60],
    ["C3", "C", "출발일", "+", 0], ["C3", "H,M,Y", "출발일", "-", 60],
    ["D4", "C,F,Y", "출발일", "+", 0], ["D4", "B,H,M", "출발일", "-", 60],
    ["E5", "B,H,M,Y", "출발일", "-", 60],
  ];
  const freeListeners = [];
  const refreshFree = () => freeListeners.forEach((fn) => fn());
  function freeDisplay() {
    const codes = () => [...new Set(freeRules.map((r) => r[0]))];
    const query = input("2026-11-04", "조회일", "date"), d1 = input("2027-02-20", "가는 날", "date"), d2 = input("2027-02-27", "오는 날", "date");
    const a1 = select(codes(), "A1", "출국 항공사"), c1 = input("Y", "출국 클래스");
    const a2 = select(codes(), "C3", "귀국 항공사"), c2 = input("M", "귀국 클래스");
    const out = el("div", { className: "gap-top" });
    function run() {
      const q = parseDate(query.value);
      const finals = [];
      const rows = [["출국", a1.value, c1.value, d1.value], ["귀국", a2.value, c2.value, d2.value]].map(([name, air, clsRaw, dep]) => {
        const cls = clsRaw.trim().toUpperCase();
        const hit = freeRules.filter((r) => r[0] === air && (!r[1] || r[1].split(",").includes(cls)));
        const dates = hit.map((r) => addDays(r[2] === "발권일" ? q : parseDate(dep), (r[3] === "-" ? -1 : 1) * r[4])).filter((d) => d >= q).sort((x, y) => y - x);
        finals.push(dates[0] || null);
        return [name, `${air} · ${cls || "-"}`, hit.length ? hit.map((r) => `${r[2]} ${r[3]}${r[4]}`).join(", ") : "일치 조건 없음", dates[0] ? fmtDate(dates[0]) : "표시 안 함"];
      });
      const ok = finals.every(Boolean);
      const first = ok ? finals.reduce((x, y) => (x < y ? x : y)) : null;
      out.replaceChildren(
        table(["구간", "항공사 · 클래스", "일치한 조건", "구간별 날짜"], rows),
        ok
          ? verdict("pass", `무료취소 가능 (${fmtDate(first)} 까지)`, ["모든 구간의 항공사에 해당 조건이 있어 기간을 표기합니다."])
          : verdict("warn", "무료취소 기간을 표기하지 않음", ["한 구간이라도 조건이 없거나 날짜가 지났으면 표기하지 않습니다."]),
      );
    }
    [query, d1, d2, a1, c1, a2, c2].forEach((c) => onChange(c, run));
    freeListeners.push(() => {
      [a1, a2].forEach((s) => {
        const keep = s.value;
        s.replaceChildren(...codes().map((c) => el("option", { value: c, textContent: c })));
        s.value = codes().includes(keep) ? keep : codes()[0];
      });
      run();
    });
    run();
    return [
      block(1, "조회 조건", [grid(field("조회일", query), field("가는 날", d1), field("오는 날", d2), field("출국 항공사", a1), field("출국 클래스", c1), field("귀국 항공사", a2), field("귀국 클래스", c2))]),
      block(2, "조회 결과 표기", [out, el("p", { className: "note", textContent: "같은 항공사에서 여러 조건이 걸리면 가장 먼 날짜를 쓰고, 지난 날짜는 표시하지 않습니다. 여정의 항공사가 모두 해당될 때만 구간별 날짜 중 가장 이른 날을 표기합니다." })]),
    ];
  }
  function freeAdmin() {
    const air = input("", "항공사"), cls = input("", "클래스");
    air.maxLength = 2;
    const base = select(["출발일", "발권일"], "출발일", "기준일");
    const sign = select(["-", "+"], "-", "시점 부호");
    const days = number("60", "시점 일수");
    const host = el("div");
    function draw() {
      host.replaceChildren(table(["항공사", "적용구간", "클래스", "기준일", "시점", ""], freeRules.map((r) => [
        r[0], "한국 출발", r[1] || "전체", r[2], `${r[3]}${r[4]}일`,
        btn("삭제", "text-btn danger", async () => {
          if (!(await Kit.confirm("삭제하시겠습니까?"))) return;
          freeRules.splice(freeRules.indexOf(r), 1);
          draw();
          refreshFree();
        }),
      ])));
    }
    draw();
    const add = btn("규칙 추가", "solid", async () => {
      const code = air.value.trim().toUpperCase();
      if (!/^[A-Z0-9]{2}$/.test(code)) { await Kit.alert("항공사를 확인해 주세요."); air.focus(); return; }
      const list = [...new Set(cls.value.split(/[,\s]+/).map((x) => x.trim().toUpperCase()).filter(Boolean))].sort().join(",");
      freeRules.unshift([code, list, base.value, sign.value, Math.max(0, +days.value || 0)]);
      air.value = cls.value = "";
      draw();
      refreshFree();
    });
    return [
      block(1, "규칙 등록", [grid(field("항공사 (2자리)", air), field("클래스 (쉼표 구분, 공란은 전체)", cls), field("기준일", base), field("부호", sign), field("일수", days)), el("div", { className: "form-foot" }, [add])]),
      block(2, "등록된 설정 목록", [host, el("p", { className: "note", textContent: "조회 리스트는 항공사 → 적용구간 → 기준일 순서로 보여 주고, 수정자와 최종수정일을 남깁니다." })]),
    ];
  }

  /* ---------- 여행사 서비스 유지보수 ---------- */
  const MT = [
    ["조회", "스케줄/운임 노출 조건 조정", "접수 → 영향 범위 확인 → 설정 변경", "설정"],
    ["예약", "예약카드 항목 추가·변경", "회의 협의 → 기획서 수정 → 개발", "개발"],
    ["발권", "발권 실패 사유 안내 문구 개선", "접수 → 재현 → Alert 수정", "문구"],
    ["결제", "카드 결제 분기와 수수료 처리 보완", "접수 → 정책 협의 → 개발", "개발"],
    ["환불", "환불 수수료 계산 기준 확인", "접수 → 규정 확인 → 계산식 수정", "정책"],
    ["정산", "정산 리스트 조회 항목 추가", "회의 협의 → 기획서 → QA", "개발"],
    ["게시판", "1:1 문의 분류와 답변 항목 정리", "접수 → 화면 수정", "설정"],
  ];
  function maintBoard() {
    const host = el("div", { className: "gap-top" });
    const draw = (type) => host.replaceChildren(table(["영역", "요청", "처리 흐름", "유형"], MT.filter((r) => type === "전체" || r[3] === type).map((r) => [r[0], r[1], r[2], badge(r[3], "info")])));
    draw("전체");
    return [
      block(1, "요청 유형 보드", [chips(["전체", "설정", "문구", "개발", "정책"], "전체", draw), host, el("p", { className: "note", textContent: "요청 내용은 실제 이슈를 비식별로 단순화한 예시입니다." })]),
      block(2, "처리 흐름", [flow([["요청 접수"], ["영향 범위 확인"], ["정책 협의"], ["기획서 반영"], ["개발·QA"], ["배포·공지", "ok"]])]),
    ];
  }
  function maintBasis() {
    return [block(1, "이 일을 하며 쌓은 것", [table(["구분", "내용"], [
      ["기준 문서", "변경이 쌓이는 예약관리자 기획서에 버전별 변경 사유를 남겨 다음 담당자가 흐름을 알 수 있게 했습니다."],
      ["공통 처리 기준", "여행사마다 달라 보이는 요청도 공통 설정으로 풀 수 있는지 먼저 검토했습니다."],
      ["운영·개발 사이 번역", "현장의 표현을 상태값과 화면 ID로 바꿔 개발에 전달했습니다."],
    ])])];
  }

  const claims = [
    { at: "11/04 09:20", agency: "하늘길투어", type: "금액 불일치", no: "O2610-8812", text: "고객 결제 금액과 정산 금액이 12,000원 다릅니다.", st: "접수" },
    { at: "11/04 08:51", agency: "온에어트립", type: "발권 요청", no: "O2611-0153", text: "결제 완료 건 발권 부탁드립니다.", st: "처리 중" },
    { at: "11/03 17:33", agency: "여행공방", type: "금액 불일치", no: "O2610-8790", text: "항공사 청구 금액이 판매가보다 큽니다. 유류할증료 확인 요청.", st: "접수" },
    { at: "11/03 14:02", agency: "하늘길투어", type: "환불 요청", no: "O2610-8701", text: "고객 사정으로 환불 요청합니다.", st: "완료" },
    { at: "11/03 10:45", agency: "트래블메이트", type: "금액 불일치", no: "O2610-8655", text: "수수료가 두 번 청구된 것 같습니다.", st: "접수" },
  ];
  // 판매가(여행사 판매) / 결제가(고객 결제) / 정산가(항공사 청구) 구성
  const claimAmounts = {
    "O2610-8812": { fare: [420000, 420000, 420000], tax: [86400, 86400, 98400], fee: [20000, 20000, 20000], cause: "유류할증료 인상분(발권일 기준) 반영 누락" },
    "O2610-8790": { fare: [610000, 610000, 610000], tax: [132000, 132000, 151500], fee: [30000, 30000, 30000], cause: "유류할증료 인상분(발권일 기준) 반영 누락" },
    "O2610-8655": { fare: [288000, 288000, 288000], tax: [61200, 61200, 61200], fee: [10000, 20000, 10000], cause: "수수료 중복 결제" },
  };
  const CLAIM_CAUSES = ["유류할증료 인상분(발권일 기준) 반영 누락", "수수료 중복 결제", "환율 적용 시점 차이", "할인 금액 정산 누락", "기타"];
  function maintClaims() {
    const type = select(["전체", "금액 불일치", "발권 요청", "환불 요청"], "전체", "유형");
    const host = el("div");
    function draw() {
      const rows = claims.filter((c) => type.value === "전체" || c.type === type.value);
      host.replaceChildren(
        Kit.kpis([["오늘 접수", claims.filter((c) => c.at.startsWith("11/04")).length, "건"], ["미처리", claims.filter((c) => c.st !== "완료").length, "건"], ["금액 불일치", claims.filter((c) => c.type === "금액 불일치").length, "건", "가장 많은 유형"], ["평균 처리", "1.6", "일"]]),
        el("div", { className: "gap-top" }, [table(["접수", "여행사", "유형", "예약번호", "내용", "상태", ""], rows.map((c) => [c.at, c.agency, c.type, c.no, c.text,
          badge(c.st, c.st === "완료" ? "ok" : c.st === "처리 중" ? "info" : "warn"),
          c.st === "완료" ? "" : btn(c.st === "접수" ? "처리 시작" : "완료", "text-btn", () => { c.st = c.st === "접수" ? "처리 중" : "완료"; draw(); })]))]),
      );
    }
    type.addEventListener("change", draw);
    draw();
    return [block(1, "여행사 접수 목록", [grid(field("유형", type, "span-2")), el("div", { className: "gap-top" }, [host])])];
  }
  function maintCompare() {
    const pick = select(Object.keys(claimAmounts), "O2610-8812", "예약번호");
    const host = el("div");
    const decided = {};
    function draw() {
      const a = claimAmounts[pick.value];
      const rows = [["항공 운임", a.fare], ["세금·유류할증료", a.tax], ["발권 수수료", a.fee]];
      const sum = [0, 1, 2].map((i) => rows.reduce((s, [, v]) => s + v[i], 0));
      const cause = select(CLAIM_CAUSES, decided[pick.value] || a.cause, "불일치 원인");
      host.replaceChildren(
        table(["항목", "#여행사 판매가", "#고객 결제가", "#항공사 정산가", "판정"], [...rows, ["합계", sum]].map(([label, v]) => {
          const same = v[0] === v[1] && v[1] === v[2];
          return [label, won(v[0]), el("span", { className: v[1] !== v[0] ? "diff" : "", textContent: won(v[1]) }), el("span", { className: v[2] !== v[0] ? "diff" : "", textContent: won(v[2]) }), same ? badge("일치", "ok") : badge(`차이 ${won(Math.max(...v) - Math.min(...v))}`, "stop")];
        })),
        el("div", { className: "form-grid gap-top" }, [field("불일치 원인 (유형화)", cause, "span-2"), el("div", { className: "row", style: "align-self:end" }, [btn("원인 저장", "solid", () => { decided[pick.value] = cause.value; Kit.alert(`'${cause.value}'로 저장했습니다. 같은 원인이 반복되면 기능 개선 후보로 올립니다.`); })])]),
      );
    }
    pick.addEventListener("change", draw);
    draw();
    return [
      block(1, "판매가·결제가·정산가 대조", [grid(field("예약번호", pick, "span-2")), el("div", { className: "gap-top" }, [host])]),
      block(2, "유형화 결과로 만든 개선", [el("ul", { className: "list-plain" }, ["유류할증료 반영 누락 → 발권 직전 세금 재조회 후 차액 안내 단계 추가", "수수료 중복 결제 → 같은 예약의 수수료 결제 버튼 비활성화와 중복 결제 자동 취소"].map((t) => el("li", { textContent: t })))]),
    ];
  }

  /* ---------- Direct API 연동 ---------- */
  const DA_TABS = {
    "항공사 A": [["적용 사이트", "제휴 채널(PC·모바일)"], ["판매 노선", "한국 출발 일부 노선. 해외 출발은 환불불가 운임이라 제외"], ["여정", "편도·왕복 (편도결합 제외)"], ["결제", "고객 카드결제 → PG 승인, 항공권은 현금 발권(예치금 차감)"], ["발권", "예약 생성 = 발권 완료 (티켓번호 없는 Ticketless 항공사)"], ["미제공 기능", "스케줄 변경, 영문 이름 변경, 마일리지 등록 버튼 미노출"], ["예약관리자", "입금/결제관리 > 결제 내역 메뉴 추가"]],
    "항공사 B": [["오픈 사이트", "1차 자사, 제휴 채널 PC·모바일 동시 검수"], ["CRS 구분자", "Direct API 구분자 신규 추가. 공급 컨텐츠는 이 구분자로 조회·예약"], ["노출 우선순위", "같은 스케줄은 저렴한 운임 우선, 같으면 GDS 운임 우선"], ["성인/소아/유아", "필수 입력 항목 정의. 유아 금액 0원이면 판매 안 함"], ["결제·수수료", "고객 카드 결제 후 항공권 승인, 이어서 수수료 자동 승인"], ["이티켓", "발권 시 예약자 이메일로 자동 발송"], ["파트너 어드민", "로그인 계정에 따라 Direct API 예약만 노출"]],
    "항공사 C": [["판매 구간", "1차 한국-해외 OW/RT 직항, 해외-한국은 노선 제한 없이"], ["오픈 사이트", "1차 자사·제휴 채널, 2차 추가 채널"], ["노출시간", "제한 없음"], ["요금규정", "환불 수수료를 공통으로 두고 추가 문구로 규정 제공"], ["이티켓", "항공사 자동 발송, 별도 이티켓 화면 없음"], ["환불", "예약카드에서 항공사로 환불요청 메일 자동 발송 버튼 (실패 시 Alert 추가)"]],
  };
  function directCheck() {
    const host = el("div", { className: "gap-top" });
    const draw = (name) => host.replaceChildren(table(["항목", "내용"], DA_TABS[name]));
    draw("항공사 A");
    return [block(1, "항공사별 연동 체크리스트", [chips(Object.keys(DA_TABS), "항공사 A", draw), host])];
  }
  function directPay() {
    const charge = number("2000000", "항공사 예치금", "100000"), fare = number("1850000", "항공권 금액", "10000"), fee = number("30000", "수수료", "1000");
    const res = select([["ok", "생성됨"], ["fail", "생성 실패"]], "ok", "예약 카드 생성");
    const out = el("div", { className: "gap-top" });
    function run() {
      const c = +charge.value || 0, f = +fare.value || 0, t = +fee.value || 0;
      const steps = [[`고객 카드 승인 ${won(f + t)}원`, "ok"]];
      if (res.value !== "ok") steps.push(["예약 카드 생성 실패", "stop"], ["카드 승인 자동 취소", "ok"]);
      else if (c < f) steps.push([`예치금 부족 ${won(c)}원 < ${won(f)}원`, "stop"], ["발권 실패 → 발권 오류 리스트"], ["관리자 확인 후 처리"]);
      else steps.push([`항공권 발권 (예치금 ${won(f)}원 차감)`, "ok"], [`수수료 자동 승인 ${won(t)}원`, "ok"], ["이티켓 이메일 자동 발송", "ok"]);
      out.replaceChildren(flow(steps));
    }
    [charge, fare, fee, res].forEach((c) => onChange(c, run));
    run();
    return [block(1, "카드 승인 → 항공권 발권", [grid(field("항공사 예치금(원)", charge), field("항공권 금액(원)", fare), field("수수료(원)", fee), field("예약 카드 생성", res)), out])];
  }
  function directCancel() {
    const air = select([["B", "항공사 B"], ["D", "항공사 D"], ["A", "항공사 A"]], "B", "항공사");
    const type = select([["DA", "Direct API"], ["GD", "GDS"]], "DA", "예약 유형");
    const hours = number("10", "예약 후 경과"), dep = number("120", "출발까지 남은 일수"), cls = input("Y,M", "한국 출발 세그 클래스");
    const out = el("div", { className: "gap-top" });
    function run() {
      const list = cls.value.toUpperCase().split(/[,\s]+/).filter(Boolean);
      const reasons = [], hits = [];
      const airOk = air.value === "B" || air.value === "D";
      if (type.value !== "DA") reasons.push("Direct API 예약이 아닙니다.");
      if (!airOk) reasons.push("대상 항공사가 아닙니다.");
      const base = type.value === "DA" && airOk;
      if (base && (+hours.value || 0) <= 24) hits.push("예약 후 24시간 이내");
      if (base && (+dep.value || 0) >= 60 && !list.some((x) => "XWZ".includes(x))) hits.push("한국 출발 · 출발 60일 이전(일부 클래스 제외)");
      if (base && !hits.length) reasons.push("시간·출발일 조건을 모두 벗어났거나 제외 클래스가 포함되었습니다.");
      out.replaceChildren(hits.length ? verdict("pass", "버튼 노출", hits) : verdict("stop", "버튼 미노출", reasons));
    }
    [air, type, hours, dep, cls].forEach((c) => onChange(c, run));
    run();
    return [block(1, "무료취소 버튼 노출 판단", [grid(field("항공사", air), field("예약 유형", type), field("예약 후 경과(시간)", hours), field("출발까지 남은 일수", dep), field("한국 출발 세그 클래스", cls)), out, el("p", { className: "note", textContent: "노출 조건은 기획서를 단순화한 예시이며 시간과 일수, 클래스는 가상 값입니다. 버튼을 누르면 항공사 PNR만 취소하고, 취소 API 응답을 메모로 남깁니다." })])];
  }

  /* ---------- Direct API 부가서비스 ---------- */
  const ANC = {
    좌석: [["SEAT-12A", "창가 일반석", "12A · ICN→BKK", 12000], ["SEAT-12B", "중앙 일반석", "12B · ICN→BKK", 8000], ["SEAT-03C", "앞좌석", "03C · ICN→BKK", 25000]],
    기내식: [["MEAL-01", "닭가슴살샐러드와 소프트롤", "알레르기 성분: 대두, 토마토, 닭고기, 우유, 밀", 9000], ["MEAL-02", "비빔밥 세트", "알레르기 성분: 대두, 참깨, 쇠고기", 11000]],
    수하물: [["BAG-15", "수하물 15kg 추가", "구간별 구매", 30000], ["BAG-20", "수하물 20kg 추가", "구간별 구매", 42000]],
  };
  function ancBuy() {
    const picked = new Set(["MEAL-01"]);
    let tab = "좌석";
    const host = el("div", { className: "device-body" });
    const total = el("b", { style: "margin-left:auto" });
    function draw() {
      host.replaceChildren(...ANC[tab].map(([id, name, sub, price]) => {
        const on = picked.has(id);
        return el("div", { className: "flight" }, [
          el("div", { className: "top" }, [el("span", { textContent: name }), el("span", { textContent: `${won(price)}원` })]),
          el("span", { className: "small muted", textContent: sub }),
          el("div", { className: "row end" }, [btn(on ? "선택 취소" : "담기", on ? "line-btn" : "solid", () => { if (on) picked.delete(id); else picked.add(id); draw(); })]),
        ]);
      }));
      const sum = Object.values(ANC).flat().filter((i) => picked.has(i[0])).reduce((a, i) => a + i[3], 0);
      total.textContent = `${won(sum)}원`;
    }
    draw();
    return [
      block(1, "마이페이지 부가서비스 구매", [
        chips(Object.keys(ANC), "좌석", (v) => { tab = v; draw(); }),
        el("div", { className: "device gap-top" }, [el("div", { className: "device-bar", textContent: "마이페이지 · 부가서비스 추가 구매" }), host]),
        el("div", { className: "row gap-top" }, [el("span", { textContent: "결제 예정 금액" }), total]),
        el("p", { className: "note", textContent: "모든 금액은 원화로 저장하고 천 단위 쉼표를 자동으로 넣습니다. 상품과 금액은 예시입니다." }),
      ]),
    ];
  }
  function ancRules() {
    return [
      block(1, "연동 API", [table(["API", "제공 내용"], [
        ["부가서비스 가용 조회", "PNR 세그먼트별 부가서비스 판매 가능 여부"],
        ["기내식 조회", "기내식 판매 가능 여부와 메뉴·가격"],
        ["좌석 조회", "좌석 배치와 지정 가능 여부"],
        ["수하물 조회", "수하물 판매 가능 여부"],
        ["예약 조회", "PNR 조회와 부가서비스 적용 가능 여부 확인"],
      ])]),
      block(2, "취소 단위", [table(["구분", "정의"], [
        ["일부취소", "모든 여정의 승객별로 구매한 부가서비스를 항목 단위로 취소합니다."],
        ["전체취소", "모든 여정의 승객별 구매 항목을 한 번에 취소합니다."],
      ])]),
      block(3, "범위", [table(["단계", "범위"], [
        ["벤치마킹", "타사 부가서비스 화면과 규정 출력 영역을 비교"],
        ["1차", "예약 후 추가 구매 (좌석·기내식·수하물), PC·모바일"],
        ["관리자", "예약카드에서 구매 내역 확인, 검수용 화면"],
      ])]),
    ];
  }

  Kit.plans = {
    "bo-domestic": {
      name: "국내선 예약관리자 구축",
      changes: [
        ["관리 페이지", "국내선 전용 여행사 관리 페이지 없음", "예약·발권·환불을 관리하는 국내선 예약관리자 신규 구축"],
        ["발권 방식", "해외항공: GDS 기반 발권과 자동발권 창", "국내선: 항공사 API 발권"],
        ["오류 관리", "해외항공: 발권 오류 리스트 하나", "예약오류 리스트와 발권오류 리스트 분리"],
      ],
      tabs: [
        { label: "발권 결과 분기", build: domesticBranch, spec: [
          ["진행 단계별 기준", "예약 생성, 결제 승인, 발권 처리 중 어느 단계인지와 결과에 따라 쌓일 리스트를 정의했습니다."],
          ["오류 리스트 분리", "발권 처리에 들어간 뒤 생긴 오류는 발권오류 리스트로 보내, 담당자가 확인할 대상을 줄였습니다."],
        ] },
        { label: "예약·발권 프로세스", build: domesticProcess, spec: [
          ["예약 단계", "결제 수단과 항공사에 따라 결제 처리를 나눕니다."],
          ["발권 단계", "발권 성공 데이터는 통계와 일치하게 반영하고, 실패는 오류 리스트로 모읍니다."],
          ["해외항공과 비교", "해외항공 예약관리자를 기준으로 국내선에 맞게 달라지는 부분을 표로 정리했습니다."],
        ] },
      ],
    },
    "bo-intl": {
      name: "해외항공 예약관리자 구축",
      changes: [
        ["화면 구성", "노후된 기존 관리자", "예약카드 한 장에서 예약부터 발권까지 확인·수정하고, 요청관리와 발권 4개 리스트를 담당자별 업무 화면으로 분리"],
        ["환불 처리", "1:1 문의로 유입되고 담당자가 수수료와 입금 계좌를 안내", "PNR·요금·취소·발권 상태를 카드에 표시하고 변경 이력을 기록"],
      ],
      tabs: [
        { label: "메뉴 구성", build: intlMenu, spec: [
          ["업무 흐름 기준 IA", "여행사가 하루 종일 쓰는 예약·결제·발권·상담·통계 업무 순서대로 메뉴를 나눴습니다."],
        ] },
        { label: "예약카드", build: intlCard, spec: [
          ["영역별 역할", "예약 하나의 정보를 7개 영역으로 나눠, 상담 중에 필요한 정보를 한 화면에서 찾게 했습니다."],
          ["상태값 체계", "상태를 구분별로 정의했습니다. 탑승객 이름이 CRS와 다르면 CRS 기준으로 자동 변경합니다."],
        ] },
      ],
    },
    "bo-content": {
      name: "국내선 컨텐츠 관리",
      changes: [
        ["관리 페이지", "국내선 판매 정보를 관리할 페이지 없음", "규정·클래스·할인코드·유류할증료를 다루는 5개 관리 메뉴 신설"],
        ["요금 규정", "자동환불에 쓸 규정 입력 기준 없음", "클래스 단위 취소·환불 수수료를 입력해 자동환불과 연결"],
        ["운영 주체", "운영 위치 미정", "요금 관리 시스템에만 기능을 두고 운영 담당 부서가 관리"],
      ],
      tabs: [
        { label: "관리 메뉴", build: contentMenu, spec: [
          ["메뉴별 역할", "메뉴마다 어느 화면에 쓰이는 데이터인지 정의해 입력 담당자가 영향을 알 수 있게 했습니다."],
          ["운영 주체 정리", "최종 결정에 따라 입력은 한 곳으로 모으고, 여행사 요금관리자는 데이터를 불러 노출합니다."],
        ] },
        { label: "할인코드 등록", build: contentCode, spec: [
          ["입력값 규칙", "0~100은 %, 101 이상은 원 단위로 분기하고, 1000 이상은 천 단위 쉼표를 붙입니다. 공항은 영문 3자리, 클래스는 대문자로 정리합니다."],
          ["등록 목록", "예약정보 입력의 ‘요금조건선택’에 쓰이는 값입니다. QA에서 나온 수정 요청은 v2.2에 모두 반영했습니다."],
        ] },
      ],
    },
    "fr-card": {
      name: "카드 청구할인 계산",
      changes: [
        ["최저가 노출", "신규 기능", "청구할인을 반영한 최저가를 제휴 채널에 노출"],
        ["금액 계산", "신규 기능", "탑승객별로 계산하고 일한도는 성인·소아 수로 나눠 적용"],
        ["금액 불일치", "혜택가와 청구 예상액이 어긋날 수 있음", "결제금액 보정 배율을 정의해 혜택가와 청구 예상액을 일치"],
      ],
      tabs: [
        { label: "청구할인 계산기", build: cardCalc, spec: [
          ["입력 조건", "승객 구성과 할인율, 일한도, 제휴사 할인2를 바꾸면 결과가 바로 달라집니다."],
          ["계산 규칙", "일한도를 인원으로 나누고 탑승객별 계산액과 비교해 낮은 쪽을 적용합니다. 제휴사 할인2가 있으면 혜택가에 배율(1 ÷ (1 − 할인율))을 곱해 보정합니다."],
        ] },
        { label: "설정관리", build: cardAdmin, spec: [
          ["코드 자동 생성", "카드사별 기본 코드에 순번을 붙여 저장 시 자동 생성합니다."],
          ["구성", "설정, 계산, 화면 노출을 나눠 정의하고 카드사별·채널별 QA 시나리오를 문서로 남겼습니다."],
        ] },
      ],
    },
    "fr-calendar": {
      name: "최저가 달력",
      changes: [
        ["최저가 확인", "날짜를 하나씩 바꿔 가며 조회", "한 달 치 일별 최저가를 달력 한 장에서 확인"],
        ["예외 표기", "신규 기능", "매진은 공란, 운항 없는 날은 비운항으로 구분"],
        ["데이터", "실시간 조회 부담", "최저가를 저장해 쓰는 1일 캐시 구조"],
      ],
      tabs: [
        { label: "캘린더 서치", build: calendarSearch, spec: [
          ["조회 조건", "구간과 여정, 화면, 승객 수를 고릅니다. 비운항 요일은 구간마다 다릅니다."],
          ["달력 표기", "달의 최저가를 강조하고 공휴일은 붉게 표시합니다. 데이터가 없는 날짜를 조회하면 그 결과가 저장되어 다음 조회부터 노출됩니다."],
          ["PC와 모바일", "PC는 날짜를 누르면 항공사별 목록을, 모바일은 달력 안의 최저가만 보여 줍니다."],
        ] },
        { label: "표기 규칙", build: calendarRules, spec: [
          ["표기와 데이터", "표기마다 의미와 데이터 출처를 정의해 개발과 QA의 기준을 맞췄습니다."],
          ["기기별 차이", "도시 목록은 같게 두고, 제공 방식과 노출 항목을 기기에 맞췄습니다. 기획서는 v2.1까지 변경 이력을 남겼습니다."],
        ] },
      ],
    },
    "fr-market": {
      name: "쿠폰·청구할인 금액 계산",
      changes: [
        ["판매 채널", "오픈마켓 채널 없음", "오픈마켓에서 들어온 예약을 여행사 시스템에서 처리"],
        ["금액 표기", "화면에 결제 승인금액 보정 로직", "보정 로직을 없애고 PC·모바일 6개 화면을 같은 수식으로 통일"],
        ["취소·환불", "신규 기능", "발권 상태에 따라 취소신청, 불가 안내, 환불접수로 분기"],
      ],
      tabs: [
        { label: "쿠폰 + 청구할인", build: marketCalc, spec: [
          ["할인 순서", "청구할인 → 수수료 합산 → 제휴사 할인2 순서를 계산식으로 확정해 노출 금액과 승인 금액이 어긋나지 않게 했습니다."],
          ["쿠폰 정책", "아이템 할인은 승객별, 바이어 할인은 PNR 단위로 적용합니다."],
          ["노출 수식", "영역별 수식을 표로 고정했습니다. 관리자 화면에도 할인 정보 팝업을 추가해 상담사가 금액을 설명할 수 있게 했습니다."],
        ] },
        { label: "취소·환불 접수", build: marketCancel, spec: [
          ["발권 상태별 분기", "발권 전은 취소신청, 진행 중은 불가 안내, 완료 후에는 환불접수로 나눕니다. 현금 환불은 계좌 입력 팝업과 예약카드 환불정보를 연결했습니다."],
        ] },
      ],
    },
    "fr-tasf": {
      name: "환불 신청과 수수료 결제",
      changes: [
        ["환불 문의", "1:1 문의로 유입되고 담당자가 수수료와 입금 계좌를 안내", "[취소/환불] 버튼 하나로 발권 여부에 따라 팝업 분기"],
        ["카드 발권건", "수수료 입금을 확인한 뒤 환불 진행", "팝업 안에서 수수료를 카드로 결제"],
        ["현금 발권건", "담당자가 수수료를 안내하고 처리", "환불금에서 수수료를 공제하고 계좌만 입력"],
      ],
      tabs: [
        { label: "환불 신청 팝업", build: feeRefund, spec: [
          ["지불수단별 분기", "카드는 수수료를 추가 결제하고, 현금은 환불금에서 공제합니다. 발권 당일은 VOID로 구분해 항공사 수수료를 적용하지 않습니다."],
          ["처리 상태 연결", "신청 결과가 예약관리자의 취소·환불 상태로 이어지도록 상태 변화를 정의했습니다."],
        ] },
        { label: "버튼 정리", build: feeButtons, spec: [
          ["버튼 통합", "여러 안을 비교해 확정하고, 여행사 공유 문서와 디자인 요청 문서를 함께 만들었습니다."],
        ] },
      ],
    },
    "fr-cancel": {
      name: "무료취소 기간 표기",
      rules: freeRules,
      changes: [
        ["안내 시점", "고객이 예약 후에야 기한을 알게 됨", "조회 결과에서 “무료취소 가능 (YYYYMMDD 까지)”로 표기"],
        ["설정", "항공사와 클래스마다 달라 확인이 어려움", "항공사·구간·클래스·기준일·시점을 설정 페이지에 등록"],
        ["적용 범위", "신규 기능", "한국 출발 직항에 적용하고, 여정의 항공사가 모두 해당될 때만 표기"],
      ],
      tabs: [
        { label: "조회 결과 표기", build: freeDisplay, spec: [
          ["조회 조건", "조회일과 여정, 항공사, 클래스를 바꾸면 표기 날짜가 바로 달라집니다."],
          ["표기 규칙", "구간별 날짜를 계산해 가장 이른 날을 표기합니다. 설정 탭에서 규칙을 바꾸면 이 결과도 달라집니다."],
        ] },
        { label: "설정 관리", build: freeAdmin, spec: [
          ["입력 규칙", "항공사는 2자리 코드로 받고, 형식이 틀리면 “항공사를 확인해 주세요.” Alert을 띄웁니다. 클래스는 알파벳 순으로 정렬합니다."],
          ["조건 단순화", "무료취소 가능 조건만 입력하는 구조로 만들어 설정 오류 가능성을 줄였습니다."],
        ] },
      ],
    },
    "bo-maintenance": {
      name: "여행사 요청 처리",
      changes: [
        ["요청 접수", "메일·전화로 들어온 접수를 담당자가 엑셀에 정리", "접수 시스템에서 유형·상태로 관리하고 정기 회의 요청과 같은 흐름으로 처리"],
        ["처리 판단", "요청별 개별 대응", "설정·문구·개발·정책 중 어떤 처리인지 먼저 분류"],
        ["금액 불일치", "판매·결제·정산 금액을 각각 다른 화면에서 확인", "세 금액을 항목별로 한 표에서 대조"],
        ["원인 관리", "건별 처리 후 종료", "원인을 유형화해 반복 원인을 기능 개선으로 연결"],
      ],
      tabs: [
        { label: "요청 보드", build: maintBoard, spec: [
          ["유형 분류", "개발이 필요한지, 설정으로 해결되는지, 정책 확인만 필요한지를 먼저 나눕니다."],
          ["처리 흐름", "정책 확인, 기획서 반영, QA, 배포까지 이어지게 처리합니다."],
        ] },
        { label: "접수 목록", build: maintClaims, spec: [
          ["접수 관리", "유형으로 걸러 보고, 접수 → 처리 중 → 완료로 상태를 바꿉니다. 위에 오늘 접수와 미처리 건수를 고정합니다."],
        ] },
        { label: "금액 불일치 점검", build: maintCompare, spec: [
          ["세 금액 대조", "여행사 판매가·고객 결제가·항공사 정산가를 항목별로 비교하고 다른 칸을 빨간색으로 표시합니다."],
          ["유형화와 개선", "원인을 정해진 목록에서 골라 저장합니다. 반복되는 원인은 기능 개선으로 이어졌습니다."],
        ] },
        { label: "운영 기준", build: maintBasis, spec: [
          ["쌓인 기준", "반복되는 요청에 같은 기준으로 답할 수 있도록 문서와 공통 설정으로 정리했습니다."],
        ] },
      ],
    },
    "api-direct": {
      name: "항공사 Direct API 연동",
      changes: [
        ["정책 확인", "항공사마다 다른 정책", "노출 시간, 판매 구간, 결제·발권, 이티켓을 같은 항목의 체크리스트로 비교"],
        ["승인 처리", "신규 기능", "예약 카드 생성에 실패하면 카드 승인을 자동 취소"],
        ["후속 과제", "신규 기능", "부가서비스, 정산 관리 등 2차 과제를 우선순위와 함께 정리"],
      ],
      tabs: [
        { label: "연동 체크리스트", build: directCheck, spec: [
          ["항목별 확인표", "같은 항목으로 항공사를 비교해 누락을 막았습니다."],
        ] },
        { label: "결제·발권 처리", build: directPay, spec: [
          ["자동 처리 흐름", "금액과 생성 결과를 바꾸면 승인 취소, 발권 실패, 정상 발권 흐름이 달라집니다."],
        ] },
        { label: "무료취소 버튼", build: directCancel, spec: [
          ["노출 판단", "예약 유형, 항공사, 경과 시간, 출발일, 클래스를 조합해 버튼 노출을 결정합니다."],
        ] },
      ],
    },
    "api-ancillary": {
      name: "예약 후 부가서비스 구매",
      changes: [
        ["구매 시점", "신규 기능", "예약이 끝난 뒤에도 마이페이지에서 좌석·기내식·수하물 구매"],
        ["화면 구성", "신규 기능", "항공사 API 응답에 따라 제공 항목이 달라지도록 화면 분기"],
        ["취소", "신규 기능", "승객별 항목 단위의 일부취소와 전체취소 정의"],
      ],
      tabs: [
        { label: "부가서비스 구매", build: ancBuy, spec: [
          ["구매 흐름", "좌석, 기내식, 수하물을 탭으로 나누고 담은 항목의 합계를 바로 보여 줍니다. 구간별(세그별)과 여정별 단위를 구분해 정의했습니다."],
        ] },
        { label: "연동·취소 기준", build: ancRules, spec: [
          ["연동 API", "항공사 API에서 받는 정보를 기능 단위로 정리했습니다."],
          ["취소 단위", "일부취소와 전체취소의 범위를 정의했습니다."],
          ["단계별 범위", "타사 화면을 비교해 규정 안내 영역을 넓히고, 1차 범위를 정했습니다."],
        ] },
      ],
    },
  };
})();
