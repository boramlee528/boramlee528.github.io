// 여행사 정산 자동화 개인 기획 샘플입니다. 항공사·채널·예약·금액은 모두 가상입니다.
// 금액 계산과 대조는 규칙으로 처리하고, AI는 어긋난 건의 원인과 조치만 추천합니다.
(function () {
  const { el, btn, block, input, select, field, table, badge, won, render } = Kit;

  const flow = (steps) => el("div", { className: "flow-row" }, steps.flatMap((s, i) => [
    el("span", { className: "flow-step " + (s[1] || ""), textContent: s[0] }),
    i < steps.length - 1 ? el("i", { textContent: "›", ariaHidden: "true" }) : null,
  ]));
  const verdict = (tone, title, lines) => el("div", { className: "verdict " + tone }, [
    el("b", { textContent: title }),
    ...lines.map((t) => el("p", { textContent: t })),
  ]);
  const refreshers = [];
  const refreshAll = () => refreshers.forEach((fn) => fn());
  const sum = (list) => list.reduce((a, b) => a + b, 0);
  const signed = (n) => (n > 0 ? `+${won(n)}` : won(n));
  const minus = (n) => (n ? `−${won(n)}` : "0");

  /* ---------- 정산 데이터 ---------- */
  // 여행사 수수료: 예약관리자 > 취급수수료 관리에 채널·처리 유형별로 설정한 금액을 그대로 씁니다.
  const channels = [
    { name: "채널 A", issue: 10000, void: 20000, refund: 15000 },
    { name: "채널 B", issue: 5000, void: 20000, refund: 10000 },
    { name: "자사", issue: 0, void: 10000, refund: 5000 },
  ];
  const channelFee = (name, type) => {
    const c = channels.find((x) => x.name === name);
    return c ? c[type] : 0;
  };

  const tickets = [
    { no: "T-1001", air: "A1", pax: "HONG/GILDONG MR", channel: "채널 A", pay: "카드", fare: 360000, disc: 10000, qc: 4600, tax: 65000, card: 419600, deposits: [], feePaid: 10000 },
    { no: "T-1002", air: "B2", pax: "KIM/MINA MS", channel: "자사", pay: "가상계좌", fare: 440800, disc: 0, qc: 0, tax: 57300, card: 0, deposits: [300000, 198100], feePaid: 0 },
    { no: "T-1003", air: "C3", pax: "LEE/JUNHO MR", channel: "채널 B", pay: "카드", fare: 610000, disc: 0, qc: 19500, tax: 132000, card: 742000, deposits: [], feePaid: 5000,
      ai: { conf: 92, cause: "발권 시점 유류할증료 변동", basis: ["예약 시점보다 큐차지가 19,500원 큼", "같은 항공사·기간에 동일 유형 3건"], action: "차액 19,500원을 항공사 정산 조정 항목으로 등록합니다.", fix: (t) => { t.card += 19500; } } },
    { no: "T-1004", air: "A1", pax: "PARK/SORA MS", channel: "자사", pay: "가상계좌", fare: 288000, disc: 0, qc: 0, tax: 61200, card: 0, deposits: [], feePaid: 0,
      ai: { conf: 84, cause: "입금자명 불일치로 입금 매칭 실패", basis: ["같은 금액의 미매칭 입금 1건", "입금일이 결제 기한 안에 있음"], action: "미매칭 입금 349,200원을 이 예약에 연결합니다.", fix: (t) => { t.deposits.push(349200); } } },
    { no: "T-1005", air: "B2", pax: "CHOI/YUNA MS", channel: "채널 A", pay: "카드", fare: 520000, disc: 0, qc: 0, tax: 88000, card: 608000, deposits: [], feePaid: 0,
      ai: { conf: 55, cause: "수수료 승인 내역 없음 (원인 불명확)", basis: ["채널 A 발권 수수료 10,000원 설정", "카드 매입·입금 내역 없음"], action: "매입 누락, 면제, 현금 입금 중 담당자가 확인합니다." } },
    { no: "T-1006", air: "C3", pax: "JUNG/HOON MR", channel: "채널 B", pay: "카드", fare: 195000, disc: 5000, qc: 0, tax: 42000, card: 232000, deposits: [], feePaid: 5000 },
    { no: "T-1007", air: "A1", pax: "YOON/SEO MS", channel: "채널 A", pay: "카드", fare: 720000, disc: 20000, qc: 12000, tax: 98000, card: 810000, deposits: [], feePaid: 10000 },
    { no: "T-1008", air: "B2", pax: "KANG/MIN MR", channel: "자사", pay: "가상계좌", fare: 330000, disc: 0, qc: 0, tax: 54000, card: 0, deposits: [384000], feePaid: 0 },
    { no: "T-1009", air: "C3", pax: "SEO/JIN MS", channel: "채널 B", pay: "카드", fare: 410000, disc: 0, qc: 0, tax: 70000, card: 480000, deposits: [], feePaid: 5000, bsp: 495000,
      ai: { conf: 81, cause: "BSP 빌링과 여행사 저장 금액 불일치", basis: ["빌링 금액이 저장 금액보다 15,000원 큼", "카드 매입은 저장 금액과 일치"], action: "항공사에 빌링 확인을 요청하고 차액을 조정 항목으로 등록합니다.", fix: (t) => { t.bsp = 480000; } } },
  ];
  // BSP 빌링 → 여행사 저장 금액 → 카드 매입·입금 순서로 대조합니다. bsp가 없으면 저장 금액과 같은 건입니다.
  const ticketCalc = (t) => {
    const sale = t.fare - t.disc;
    const charge = sale + t.qc + t.tax;
    const bsp = t.bsp === undefined ? charge : t.bsp;
    const fee = channelFee(t.channel, "issue");
    const due = charge + fee;
    const received = t.card + sum(t.deposits) + t.feePaid;
    return { sale, charge, bsp, fee, due, received, diff: charge - bsp || due - received };
  };

  const refunds = [
    { no: "R-2001", air: "A1", pax: "HONG/GILDONG MR", kind: "환불", pay: "카드", fareIssued: 350000, fareUsed: 0, taxIssued: 69600, taxUsed: 0, airFee: 60000, channel: "채널 A", method: "공제", stmt: 359600, paid: 344600 },
    { no: "R-2002", air: "C3", pax: "JUNG/HOON MR", kind: "VOID", pay: "카드", fareIssued: 190000, fareUsed: 0, taxIssued: 42000, taxUsed: 0, airFee: 0, channel: "채널 B", method: "별도 결제", stmt: 232000, paid: 232000 },
    { no: "R-2003", air: "B2", pax: "KANG/MIN MR", kind: "환불", pay: "현금", fareIssued: 330000, fareUsed: 120000, taxIssued: 54000, taxUsed: 20000, airFee: 30000, channel: "자사", method: "공제", stmt: 214000, paid: 209000 },
    { no: "R-2004", air: "A1", pax: "YOON/SEO MS", kind: "환불", pay: "카드", fareIssued: 700000, fareUsed: 0, taxIssued: 110000, taxUsed: 0, airFee: 70000, channel: "채널 A", method: "공제", stmt: 780000, paid: 765000,
      ai: { conf: 88, cause: "항공사 수수료 구간을 잘못 입력", basis: ["출발 52일 전 취소", "규정상 30,000원 구간인데 70,000원 입력"], action: "항공사 수수료를 30,000원으로 고칩니다.", fix: (r) => { r.airFee = 30000; } } },
    { no: "R-2005", air: "C3", pax: "LEE/JUNHO MR", kind: "환불", pay: "카드", fareIssued: 610000, fareUsed: 200000, taxIssued: 151500, taxUsed: 60000, airFee: 50000, channel: "채널 B", method: "공제", stmt: 430000, paid: 441500,
      ai: { conf: 58, cause: "부분 사용 운임 계산 차이 (원인 불명확)", basis: ["일부 구간 탑승 후 환불", "BSP 빌링 환불액과 21,500원 차이"], action: "사용 운임과 세금을 담당자가 확인합니다." } },
  ];
  const refundCalc = (r) => {
    const fareBack = r.fareIssued - r.fareUsed;
    const taxBack = r.taxIssued - r.taxUsed;
    const airRefund = Math.max(0, fareBack + taxBack - r.airFee);
    const agencyFee = channelFee(r.channel, r.kind === "VOID" ? "void" : "refund");
    const deducted = r.method === "공제" ? agencyFee : 0;
    const customer = Math.max(0, airRefund - deducted);
    // BSP 빌링 환불액을 먼저 맞추고, 그다음 여행사에 저장된 카드 취소·지급 내역과 대조합니다.
    return { fareBack, taxBack, airRefund, agencyFee, customer, diff: airRefund - r.stmt || customer - r.paid };
  };

  // 두 정산의 공통 상태: 규칙이 맞으면 자동 확정, 어긋나면 담당자 검토로 넘깁니다.
  function stateOf(row, diff) {
    if (row.manual) return ["담당자 처리", "info"];
    if (diff !== 0) return ["검토 필요", "stop"];
    return row.approved ? ["담당자 승인", "info"] : ["자동 확정", "ok"];
  }
  const isConfirmed = (s) => s[0] !== "검토 필요";

  /* 어긋난 건의 AI 추천과 담당자 처리 */
  function reviewBox(row, diff, onDone) {
    if (diff === 0 && !row.manual && !row.approved) {
      return verdict("pass", "자동 정산 확정", ["BSP 빌링, 여행사 저장 금액, 카드 매입·입금 내역이 모두 일치해 담당자 확인 없이 확정했습니다."]);
    }
    if (row.manual) return verdict("info", "담당자 처리 완료", [`처리 사유: ${row.manual}`]);
    if (row.approved && diff === 0) return verdict("info", "AI 추천 승인 완료", [`${row.ai.cause}. ${row.ai.action}`]);
    const ai = row.ai;
    const reason = input("", "처리 사유");
    reason.placeholder = "예: 현금 입금 확인";
    const manual = btn("사유 입력 후 처리", "line-btn", async () => {
      if (reason.value.trim().length < 4) { await Kit.alert("처리 사유를 4자 이상 입력해 주세요."); reason.focus(); return; }
      row.manual = reason.value.trim();
      onDone();
    });
    if (!ai) {
      return el("div", {}, [
        verdict("stop", `차액 ${signed(diff)}원`, ["입력을 바꿔 생긴 차이입니다. 금액을 다시 확인하거나 사유를 입력해 처리합니다."]),
        el("div", { className: "row gap-top" }, [field("처리 사유", reason), manual]),
      ]);
    }
    const low = ai.conf < 70;
    return el("div", {}, [
      verdict(low ? "warn" : "stop", `차액 ${signed(diff)}원 · AI 추천 ${low ? "보류" : ""}`.trim(), [`추정 원인: ${ai.cause} (신뢰도 ${ai.conf}%)`, `조치: ${ai.action}`]),
      el("div", { className: "chips gap-top" }, ai.basis.map((b) => badge(b, "info"))),
      el("div", { className: "row gap-top" }, [
        low ? null : btn("추천 승인 후 확정", "solid", () => { ai.fix(row); row.approved = true; onDone(); }),
        field("직접 처리 사유", reason),
        manual,
      ]),
      low ? el("p", { className: "note", textContent: "신뢰도가 낮은 건은 AI 추천을 승인할 수 없고, 담당자가 사유를 입력해 처리합니다." }) : null,
    ]);
  }

  /* ---------- 정산 프로세스 ---------- */
  function buildProcess() {
    return [
      block(1, "발권 후 자동 정산", [flow([["BSP 빌링 데이터 수집"], ["카드 매입·입금 내역 수집"], ["청구금액 계산"], ["티켓 단위 자동 대조"], ["일치: 자동 확정", "ok"], ["불일치: AI 원인 추천", "stop"], ["담당자 승인 후 확정"], ["채널별 수수료 집계", "ok"]])]),
      block(2, "환불 후 정산", [flow([["BSP 빌링 환불 데이터 수집"], ["카드 취소·지급 내역 수집"], ["환불 운임·세금 계산"], ["항공사·여행사 수수료 반영"], ["티켓 단위 자동 대조"], ["일치: 자동 확정", "ok"], ["불일치: AI 원인 추천", "stop"], ["담당자 승인 후 확정"], ["고객 환불·미수 반영", "ok"]])]),
      block(3, "수동 업무를 무엇으로 바꾸나", [table(["현재 수동 업무", "시스템 처리"], [
        ["BSP 빌링 데이터와 여행사에 저장된 카드 매입·입금 내역을 담당자가 엑셀로 내려받아 수동 대조", "세 데이터를 자동 수집해 티켓 단위로 연결하고 자동 대조"],
        ["재발행·VOID·환불 수수료를 금액 칸에 직접 입력", "취급수수료 관리에 설정된 채널·처리 유형별 금액을 자동 반영"],
        ["담당자가 공유 시트에 올린 환불 내역을 보고 환불 수수료 확인", "환불 완료 데이터에서 항공사·여행사 수수료를 자동 수집"],
        ["가상계좌가 여러 개면 입금 내역을 손으로 합산", "매칭된 입금을 합산하고 최근 입금자·입금일을 표시"],
        ["수수료 금액이 있는 건을 하나씩 승인·면제·현금 입금 여부 확인", "승인 내역이 없는 건만 예외로 모아 AI가 원인 추천"],
      ])]),
      block(4, "정산 기준 정리", [table(["항목", "기준 데이터", "적용 방식"], [
        ["항공사 대금", "BSP 빌링", "발권·환불 대조의 기준 금액"],
        ["항공사 환불 수수료", "항공사 규정", "취소 시점에 해당하는 규정 금액을 반영"],
        ["여행사 수수료", "예약관리자 > 취급수수료 관리", "채널·처리 유형별 설정 금액을 반영"],
        ["고객 결제·환불", "여행사에 저장된 카드 매입·취소, 입금·지급 내역", "청구금액과 고객 환불액에 대조"],
      ])]),
    ];
  }

  /* ---------- 발권 후 정산 ---------- */
  function buildTicket() {
    let cur = tickets[2].no;
    const listHost = el("div");
    const calcHost = el("div");
    const reviewHost = el("div");
    function draw() {
      listHost.replaceChildren(table(["발권 건", "항공사", "채널", "결제", "#BSP 빌링", "#청구+수수료", "#매입·입금", "#차액", "상태"], tickets.map((t) => {
        const c = ticketCalc(t), s = stateOf(t, c.diff);
        return { cells: [btn(t.no, "text-btn", () => { cur = t.no; draw(); }), t.air, t.channel, t.pay, won(c.bsp), won(c.due), won(c.received), c.diff ? signed(c.diff) : "0", badge(s[0], s[1])], className: t.no === cur ? "on" : "" };
      })));
      const t = tickets.find((x) => x.no === cur), c = ticketCalc(t);
      calcHost.replaceChildren(table(["항목", "#금액(원)", "계산"], [
        ["예약판매가", won(t.fare), "예약카드"],
        ["할인금액", minus(t.disc), "여행사 할인 + 커미션 할인 − 할증"],
        ["실제판매가", won(c.sale), "예약판매가 − 할인금액"],
        ["큐차지", won(t.qc), "세금 항목 중 큐차지 합계"],
        ["세금", won(t.tax), "발권 데이터"],
        [el("b", { textContent: "청구금액" }), el("b", { textContent: won(c.charge) }), "실제판매가 + 큐차지 + 세금"],
        ["BSP 빌링 금액", won(c.bsp), "BSP 빌링 데이터, 청구금액과 대조"],
        ["여행사 수수료", won(c.fee), `취급수수료 관리 · ${t.channel} 발권 수수료`],
        ["카드 매입·입금 합계", won(c.received), t.deposits.length > 1 ? `입금 ${t.deposits.length}건 합산` : "카드 매입 + 입금 + 수수료 승인"],
      ]));
      reviewHost.replaceChildren(reviewBox(t, c.diff, refreshAll));
    }
    refreshers.push(draw);
    draw();
    return [
      block(1, "발권 정산 대상", [listHost]),
      block(2, "규칙 계산", [calcHost]),
      block(3, "자동 확정과 예외 처리", [reviewHost]),
    ];
  }

  /* ---------- 환불 후 정산 ---------- */
  function buildRefund() {
    let cur = refunds[3].no;
    const listHost = el("div");
    const formHost = el("div");
    const calcHost = el("div");
    const reviewHost = el("div");
    function drawResult() {
      listHost.replaceChildren(table(["환불 건", "구분", "항공사", "결제", "#항공사 환불액", "#BSP 빌링 환불액", "#차액", "상태"], refunds.map((r) => {
        const c = refundCalc(r), s = stateOf(r, c.diff);
        return { cells: [btn(r.no, "text-btn", () => { cur = r.no; drawAll(); }), r.kind, r.air, r.pay, won(c.airRefund), won(r.stmt), c.diff ? signed(c.diff) : "0", badge(s[0], s[1])], className: r.no === cur ? "on" : "" };
      })));
      const r = refunds.find((x) => x.no === cur), c = refundCalc(r);
      calcHost.replaceChildren(
        table(["항목", "#금액(원)", "계산"], [
          ["환불 운임", won(c.fareBack), "발권 운임 − 사용 운임"],
          ["환불 세금", won(c.taxBack), "발권 세금 − 사용 세금"],
          ["항공사 수수료", minus(r.airFee), r.kind === "VOID" ? "VOID는 항공사 수수료 없음" : "항공사 규정의 취소 시점 금액"],
          [el("b", { textContent: "항공사 환불액" }), el("b", { textContent: won(c.airRefund) }), "환불 운임 + 환불 세금 − 항공사 수수료"],
          ["BSP 빌링 환불액", won(r.stmt), "BSP 빌링 데이터, 항공사 환불액과 대조"],
          ["여행사 수수료", r.method === "공제" ? minus(c.agencyFee) : `${won(c.agencyFee)} (별도)`, `취급수수료 관리 · ${r.channel} ${r.kind === "VOID" ? "VOID" : "환불"} 수수료, ${r.method === "공제" ? "환불금에서 공제" : "고객이 별도 결제"}`],
          [el("b", { textContent: "고객 환불액" }), el("b", { textContent: won(c.customer) }), r.pay === "카드" ? "카드 부분취소" : "환불 계좌로 지급"],
          [r.pay === "카드" ? "카드 취소 내역" : "계좌 지급 내역", won(r.paid), "여행사 저장 내역, 고객 환불액과 대조"],
        ]),
        el("div", { className: "gap-top" }, [flow(r.pay === "카드"
          ? [["환불 완료"], [`BSP 환불 정산 ${won(c.airRefund)}원`], [`카드 부분취소 ${won(c.customer)}원`, "ok"], ["여행사 수수료 수익 반영"]]
          : [["환불 완료"], [`BSP 환불 정산 ${won(c.airRefund)}원`], [`계좌 지급 ${won(c.customer)}원`, "ok"], ["여행사 수수료 수익 반영"]])]),
      );
      reviewHost.replaceChildren(reviewBox(r, c.diff, refreshAll));
    }
    function drawForm() {
      const r = refunds.find((x) => x.no === cur);
      const num = (key, label) => {
        const c = input(String(r[key]), label, "number");
        c.step = 1000;
        c.addEventListener("input", () => { r[key] = Math.max(0, +c.value || 0); r.manual = null; r.approved = false; drawResult(); refreshSummary(); });
        return field(`${label}(원)`, c);
      };
      const method = select(["공제", "별도 결제"], r.method, "여행사 수수료 징수");
      method.addEventListener("change", () => { r.method = method.value; drawResult(); refreshSummary(); });
      formHost.replaceChildren(el("div", { className: "form-grid" }, [num("fareUsed", "사용 운임"), num("taxUsed", "사용 세금"), num("airFee", "항공사 수수료"), field("여행사 수수료 징수", method)]));
    }
    function drawAll() { drawForm(); drawResult(); }
    refreshers.push(drawAll);
    drawAll();
    return [
      block(1, "환불 정산 대상", [listHost]),
      block(2, "환불 금액 계산", [formHost, el("div", { className: "gap-top" }, [calcHost])]),
      block(3, "자동 확정과 예외 처리", [reviewHost]),
    ];
  }

  /* ---------- 정산 현황 ---------- */
  let refreshSummary = () => {};
  function buildSummary() {
    const kpiHost = el("div");
    const channelHost = el("div");
    function draw() {
      const rows = [...tickets.map((t) => stateOf(t, ticketCalc(t).diff)), ...refunds.map((r) => stateOf(r, refundCalc(r).diff))];
      const count = (name) => rows.filter((s) => s[0] === name).length;
      kpiHost.replaceChildren(Kit.kpis([
        ["전체 대상", rows.length, "건", `발권 ${tickets.length} · 환불 ${refunds.length}`],
        ["자동 확정", count("자동 확정"), "건", "담당자 확인 없음"],
        ["검토 필요", rows.filter((s) => !isConfirmed(s)).length, "건", "AI 추천 대기"],
        ["담당자 처리", count("담당자 승인") + count("담당자 처리"), "건", "승인 또는 사유 입력"],
      ]));
      channelHost.replaceChildren(table(["판매 채널", "#발권 수수료(원)", "#VOID 수수료(원)", "#환불 수수료(원)", "#발권·환불 건수", "#수수료 합계(원)"], channels.map((c) => {
        const issued = tickets.filter((t) => t.channel === c.name);
        const refunded = refunds.filter((r) => r.channel === c.name);
        const amount = (key, label) => {
          const box = input(String(c[key]), `${c.name} ${label}`, "number");
          box.step = 1000; box.style.maxWidth = "110px";
          box.addEventListener("change", () => { c[key] = Math.max(0, +box.value || 0); refreshAll(); });
          return box;
        };
        const total = sum(issued.map((t) => ticketCalc(t).fee)) + sum(refunded.map((r) => refundCalc(r).agencyFee));
        return [c.name, amount("issue", "발권 수수료"), amount("void", "VOID 수수료"), amount("refund", "환불 수수료"), `${issued.length} · ${refunded.length}`, won(total)];
      })));
    }
    refreshSummary = draw;
    refreshers.push(draw);
    draw();
    return [
      block(1, "처리 현황", [kpiHost, el("p", { className: "note", textContent: "예외 유형을 보여 주기 위한 샘플 건수이며, 실제 처리율이 아닙니다." })]),
      block(2, "취급수수료 관리 (채널별 여행사 수수료)", [channelHost, el("p", { className: "note", textContent: "금액을 바꾸면 발권·환불 정산에 바로 반영되고, 입금·카드 내역과 달라진 건은 검토 필요로 넘어갑니다." })]),
    ];
  }

  render({
    id: "ai-settle",
    plan: {
      name: "여행사 정산 자동화",
      console: "여행사 정산 관리자",
      notice: [el("b", { textContent: "개인 기획을 화면으로 구체화한 샘플입니다." }), " 실제로 구현·운영한 결과가 아니며, AI 결과는 정해 둔 규칙으로 흉내 낸 가상 데이터입니다. 항공사·채널·금액은 모두 가상입니다."],
      changes: [
        ["정산 화면", "해외 예약관리자 안에 정산관리자 페이지가 없음", "발권·환불 정산을 한 곳에서 처리하는 정산 관리자 신설"],
        ["발권 정산", "BSP 빌링을 기준으로, 여행사에 저장된 카드 매입과 입금 내역을 담당자가 엑셀로 내려받아 수동 대조", "세 데이터를 티켓 단위로 자동 수집·대조하고, 일치하면 자동 확정"],
        ["환불 정산", "BSP 빌링을 기준으로, 여행사에 저장된 카드 취소와 지급 내역을 담당자가 엑셀로 내려받아 수동 대조", "환불액을 계산해 BSP 빌링과 카드 취소·지급 내역에 자동 대조"],
        ["수수료 반영", "담당자가 수수료를 확인해 금액 칸에 직접 입력", "항공사 수수료는 항공사 규정, 여행사 수수료는 취급수수료 관리의 설정 금액으로 자동 반영"],
        ["예외 처리", "담당자가 원인을 직접 찾음", "AI가 원인과 조치를 추천하고 담당자가 승인"],
      ],
      tabs: [
        { label: "정산 프로세스", build: buildProcess, spec: [
          ["발권 후 흐름", "청구금액을 규칙으로 계산해 BSP 빌링, 카드 매입, 입금 내역과 대조합니다. 일치하면 사람을 거치지 않고 확정합니다."],
          ["환불 후 흐름", "환불 운임과 세금에서 수수료를 반영해 BSP 빌링 환불액과 대조하고, 고객 환불액을 카드 취소·지급 내역과 대조합니다."],
          ["수동 업무 전환", "기존 정산 기획서와 수동 정산 절차를 바탕으로, 사람이 하던 일을 시스템 처리로 옮길 대상을 정리했습니다."],
          ["기준 먼저 정의", "자동화 전에 금액마다 어느 데이터를 기준으로 삼을지 정했습니다. 기준이 하나여야 차액의 원인을 가릴 수 있습니다."],
        ] },
        { label: "발권 후 정산", build: buildTicket, spec: [
          ["티켓 단위 대조", "청구금액을 BSP 빌링과 먼저 비교하고, 수수료를 더한 금액을 카드 매입·입금 합계와 비교합니다. 차액이 없으면 자동 확정합니다."],
          ["계산 규칙", "금액은 AI가 아니라 정해진 수식으로 계산합니다. 가상계좌 입금은 합산하고, 여행사 수수료는 채널별 설정 금액을 그대로 씁니다."],
          ["사람 승인의 경계", "AI는 원인과 조치만 추천합니다. 신뢰도가 낮은 건은 승인할 수 없고 담당자가 사유를 남겨 처리합니다."],
        ] },
        { label: "환불 후 정산", build: buildRefund, spec: [
          ["BSP·카드 대조", "항공사 환불액은 BSP 빌링 환불액과, 고객 환불액은 카드 취소·지급 내역과 비교합니다. 금액을 고치면 상태가 바로 달라집니다."],
          ["환불 계산", "항공사 수수료는 항공사 규정, 여행사 수수료는 취급수수료 관리의 설정 금액을 씁니다. VOID와 환불, 카드와 현금, 수수료 공제와 별도 결제에 따라 고객 환불액과 처리 흐름이 나뉩니다."],
          ["예외 처리", "R-2004를 선택해 AI 추천을 승인하거나, 항공사 수수료를 30,000원으로 고치면 차액이 사라집니다."],
        ] },
        { label: "정산 현황", build: buildSummary, spec: [
          ["처리 현황", "자동 확정과 검토 필요 건수를 보여 줍니다. 측정 지표는 자동 확정 비율, 건당 처리 시간, 정산 오류 건수입니다."],
          ["수수료 설정", "예약관리자의 취급수수료 관리 페이지에 채널·처리 유형별 금액을 설정하면 발권·환불 정산에 그대로 반영됩니다."],
        ] },
      ],
    },
  });
})();
