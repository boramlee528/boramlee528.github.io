// 무료취소 가능기간 표기 샘플 (항공사·규칙·금액은 모두 가상)
(function () {
  const { el, btn, block, input, select, field, table, badge, won, pad, render } = Kit;
  const plan = Kit.plans["fr-cancel"];

  /* ---------- AI: 운임 규정 요약과 환불 금액 ---------- */
  // found: 원문에서 읽어 낸 무료취소 조건. tiers: 시점별 1인 항공사 수수료.
  // tiers의 min·max는 출발까지 남은 일수이고, fee가 null이면 항공권 환불 불가입니다.
  const fareRules = [
    { air: "A1", cls: "Y", conf: 94, found: { base: "출발일", sign: "-", days: 60 },
      tiers: [{ min: 60, max: null, fee: 0 }, { min: 31, max: 59, fee: 30000 }, { min: 8, max: 30, fee: 70000 }, { min: 0, max: 7, fee: 100000 }, { min: null, max: -1, fee: null }],
      raw: "CANCELLATIONS\n  FREE OF CHARGE UNTIL 60 DAYS BEFORE DEPARTURE.\n  59-31 DAYS BEFORE DEPARTURE CHARGE KRW 30000.\n  30-8 DAYS BEFORE DEPARTURE CHARGE KRW 70000.\n  7-0 DAYS BEFORE DEPARTURE CHARGE KRW 100000.\n  AFTER DEPARTURE TICKET IS NON-REFUNDABLE.",
      ai: "출발 60일 전까지는 무료로 취소할 수 있습니다.\n이후에는 취소 시점에 따라 30,000원에서 100,000원의 수수료가 있습니다.\n출발 후에는 항공권이 환불되지 않습니다." },
    { air: "B2", cls: "Y", conf: 91, found: { base: "출발일", sign: "-", days: 45 },
      tiers: [{ min: 45, max: null, fee: 0 }, { min: 15, max: 44, fee: 50000 }, { min: 0, max: 14, fee: 90000 }, { min: null, max: -1, fee: null }],
      raw: "CANCELLATIONS\n  FREE OF CHARGE UNTIL 45 DAYS BEFORE DEPARTURE.\n  44-15 DAYS BEFORE DEPARTURE CHARGE KRW 50000.\n  14-0 DAYS BEFORE DEPARTURE CHARGE KRW 90000.\n  AFTER DEPARTURE TICKET IS NON-REFUNDABLE.",
      ai: "출발 45일 전까지는 무료로 취소할 수 있습니다.\n이후에는 취소 시점에 따라 50,000원 또는 90,000원의 수수료가 있습니다.\n출발 후에는 항공권이 환불되지 않습니다." },
    { air: "C3", cls: "C", conf: 96, found: { base: "출발일", sign: "+", days: 0 },
      tiers: [{ min: 0, max: null, fee: 0 }, { min: null, max: -1, fee: 80000 }],
      raw: "CANCELLATIONS\n  FREE OF CHARGE UNTIL DEPARTURE.\n  NO-SHOW CHARGE KRW 80000.",
      ai: "출발 전까지는 무료로 취소할 수 있습니다.\n탑승하지 않으면(노쇼) 80,000원이 부과됩니다." },
    { air: "D4", cls: "B", conf: 58, found: null,
      tiers: [{ min: null, max: null, fee: 30000 }],
      raw: "CANCELLATIONS\n  PERMITTED. CHARGE KRW 30000.\n  FREE CANCEL WITHIN 1 DAY - SEE PROMO NOTE.",
      ai: "취소 수수료는 30,000원입니다.\n프로모션 조건에 따라 1일 안에 무료 취소가 가능할 수 있습니다." },
    { air: "E5", cls: "Q", conf: 97, found: null,
      tiers: [{ min: null, max: null, fee: null }],
      raw: "CANCELLATIONS\n  TICKET IS NON-REFUNDABLE.\n  TAXES REFUNDABLE ON REQUEST.",
      ai: "항공권은 환불되지 않습니다.\n세금은 요청하면 환불됩니다." },
  ];
  // 검수 상태는 두 탭이 함께 씁니다. 처음 볼 때 계산 결과가 보이도록 일부를 승인해 둡니다.
  const review = { A1: "승인", C3: "승인" };
  const summaries = Object.fromEntries(fareRules.map((f) => [f.air, f.ai]));
  const refreshers = [];
  const refreshAll = () => refreshers.forEach((fn) => fn());
  const ruleText = (r) => `${r.base} ${r.sign}${r.days}일`;
  const feeText = (fee) => (fee === null ? "환불 불가" : fee === 0 ? "무료" : `${won(fee)}원`);

  const parseDate = (s) => new Date(`${s}T00:00:00`);
  const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
  const fmtDate = (d) => `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())}`;
  const daysBetween = (from, to) => Math.round((to - from) / 86400000);

  function tierLabel(t) {
    if (t.min === null && t.max === null) return "전 기간";
    if (t.min === null) return "출발 후";
    if (t.max === null) return t.min === 0 ? "출발 전까지" : `출발 ${t.min}일 전까지`;
    return t.min === 0 ? `출발 ${t.max}일 전 ~ 출발일` : `출발 ${t.max}~${t.min}일 전`;
  }
  function tierDates(t, dep) {
    if (t.min === null && t.max === null) return "-";
    if (t.min === null) return `${fmtDate(addDays(dep, 1))} 이후`;
    if (t.max === null) return `${fmtDate(addDays(dep, -t.min))}까지`;
    return `${fmtDate(addDays(dep, -t.max))} ~ ${fmtDate(addDays(dep, -t.min))}`;
  }
  const tierOf = (f, left) => f.tiers.find((t) => (t.min === null || left >= t.min) && (t.max === null || left <= t.max));

  // 원문에서 읽은 조건을 설정 탭에 등록된 규칙과 대조합니다.
  function compare(f) {
    if (f.conf < 70) return { label: "판단 보류", tone: "warn", blocked: true, why: "요약 신뢰도가 낮습니다. 담당자가 원문을 먼저 확인합니다." };
    const registered = plan.rules
      .filter((r) => r[0] === f.air && (!r[1] || r[1].split(",").includes(f.cls)))
      .map((r) => ({ base: r[2], sign: r[3], days: r[4] }));
    if (!f.found) {
      return registered.length
        ? { label: "등록 규칙과 다름", tone: "stop", blocked: true, why: `원문에는 무료취소 조건이 없지만 ${registered.map(ruleText).join(", ")} 규칙이 등록되어 있습니다.` }
        : { label: "등록 규칙과 일치", tone: "ok", why: "무료취소 조건이 원문과 등록 규칙에 모두 없어 기간을 표기하지 않습니다." };
    }
    if (registered.some((r) => ruleText(r) === ruleText(f.found))) {
      return { label: "등록 규칙과 일치", tone: "ok", why: `원문과 등록 규칙이 모두 ${ruleText(f.found)}입니다.` };
    }
    return { label: "등록 규칙과 다름", tone: "stop", blocked: true, why: `원문: ${ruleText(f.found)} / 등록: ${registered.map(ruleText).join(", ") || "없음"}. 규칙을 확인한 뒤 다시 검수합니다.` };
  }

  /* 고객 화면: 취소 날짜별 환불 금액 */
  function buildRefund() {
    const rule = select(fareRules.map((f) => f.air), "A1", "항공권");
    const dep = input("2027-02-20", "출발일", "date");
    const when = input("2026-12-30", "취소 예정일", "date");
    const pax = input("2", "탑승객 수", "number"); pax.min = 1; pax.max = 9;
    const fare = input("412000", "1인 항공료", "number"); fare.step = 1000;
    const tax = input("88000", "1인 세금", "number"); tax.step = 1000;
    const freeLine = el("div");
    const tierHost = el("div");
    const result = el("div");
    function draw() {
      const keep = rule.value;
      rule.replaceChildren(...fareRules.map((f) => el("option", { value: f.air, textContent: `${f.air} · ${f.cls}${review[f.air] === "승인" ? "" : " (검수 전)"}` })));
      rule.value = keep;
      const f = fareRules.find((x) => x.air === rule.value);
      const depDate = parseDate(dep.value), cancelDate = parseDate(when.value);
      if (Number.isNaN(+depDate) || Number.isNaN(+cancelDate)) {
        result.replaceChildren(el("div", { className: "verdict warn" }, [el("b", { textContent: "날짜를 입력해 주세요" })]));
        tierHost.replaceChildren(); freeLine.replaceChildren();
        return;
      }
      if (review[f.air] !== "승인") {
        const notice = "담당자 검수가 끝나지 않은 규정이라 금액을 계산하지 않습니다. 잘못된 안내를 막기 위해 원문만 보여 줍니다.";
        freeLine.replaceChildren(badge("검수 전", "warn"));
        tierHost.replaceChildren(Kit.json(f.raw));
        result.replaceChildren(el("div", { className: "verdict warn" }, [el("b", { textContent: "환불 금액을 계산할 수 없습니다" }), el("p", { textContent: notice })]));
        return;
      }
      const people = Math.min(9, Math.max(1, +pax.value || 1));
      const fareAmt = Math.max(0, +fare.value || 0), taxAmt = Math.max(0, +tax.value || 0);
      const left = daysBetween(cancelDate, depDate);
      const cur = tierOf(f, left);
      const refundOf = (t) => (t.fee === null ? taxAmt : Math.max(0, fareAmt + taxAmt - t.fee));
      const freeTier = f.tiers.find((t) => t.fee === 0);
      freeLine.replaceChildren(freeTier
        ? el("p", {}, [badge("무료취소", "ok"), ` ${fmtDate(addDays(depDate, -freeTier.min))}까지 가능합니다.`])
        : el("p", {}, [badge("무료취소 없음", "warn"), " 이 항공권은 무료취소 기간이 없습니다."]));
      tierHost.replaceChildren(table(["취소 시점", "날짜", "#1인 항공사 수수료", "#1인 환불액(원)"], f.tiers.map((t) => ({
        cells: [t === cur ? el("span", {}, [tierLabel(t), " ", badge("선택일", "info")]) : tierLabel(t), tierDates(t, depDate), feeText(t.fee), won(refundOf(t))],
        className: t === cur ? "on" : "",
      }))));
      const paid = (fareAmt + taxAmt) * people, refund = refundOf(cur) * people, charge = paid - refund;
      const timing = left < 0 ? `출발 ${-left}일 후` : left === 0 ? "출발 당일" : `출발 ${left}일 전`;
      result.replaceChildren(
        table(["항목", "#금액(원)"], [
          [`결제 금액 (${won(fareAmt + taxAmt)}원 × ${people}명)`, won(paid)],
          [cur.fee === null ? "환불되지 않는 항공료" : `항공사 수수료 (${feeText(cur.fee)} × ${people}명)`, `−${won(charge)}`],
        ]),
        el("div", { className: `verdict ${cur.fee === 0 ? "pass" : cur.fee === null ? "stop" : "warn"}` }, [
          el("b", { textContent: `${fmtDate(cancelDate)} 취소 시 환불 예상 ${won(refund)}원` }),
          el("p", { textContent: `${timing} 취소입니다. ${cur.fee === 0 ? "무료취소 기간이라 전액 환불됩니다." : cur.fee === null ? "항공권은 환불되지 않고 세금만 환불됩니다." : "항공사 수수료를 뺀 금액입니다."}` }),
        ]),
      );
    }
    [rule, dep, when, pax, fare, tax].forEach((c) => { c.addEventListener("input", draw); c.addEventListener("change", draw); });
    refreshers.push(draw);
    draw();
    return [
      block(1, "항공권과 취소 날짜 선택", [
        el("div", { className: "form-grid" }, [field("항공권 (항공사 · 클래스)", rule), field("출발일", dep), field("취소 예정일", when), field("탑승객 수", pax), field("1인 항공료(원)", fare), field("1인 세금(원)", tax)]),
      ]),
      block(2, "시점별 항공사 수수료", [freeLine, el("div", { className: "gap-top" }, [tierHost])]),
      block(3, "최종 환불 금액", [result, el("p", { className: "note", textContent: "항공사 수수료만 반영한 예상 금액이며, 여행사 수수료는 별도입니다. 항공권·금액·규정은 모두 가상입니다." })]),
    ];
  }

  /* 관리자 화면: 요약 검수 */
  function buildAiReview() {
    const listHost = el("div");
    const detail = el("div");
    const preview = el("div", { className: "device-body" });
    let cur = fareRules[0].air;
    function drawList() {
      listHost.replaceChildren(table(["항공사 · 클래스", "#요약 신뢰도", "규칙 대조", "검수"], fareRules.map((f) => {
        const c = compare(f);
        return {
          cells: [btn(`${f.air} · ${f.cls}`, "text-btn", () => { cur = f.air; drawAll(); }), `${f.conf}%`, badge(c.label, c.tone), review[f.air] ? badge(review[f.air], review[f.air] === "승인" ? "ok" : "info") : "대기"],
          className: f.air === cur ? "on" : "",
        };
      })));
    }
    function drawDetail() {
      const f = fareRules.find((x) => x.air === cur);
      const c = compare(f);
      const edit = el("textarea", { value: summaries[f.air], ariaLabel: "고객용 요약 문장" });
      edit.style.minHeight = "96px";
      detail.replaceChildren(
        el("div", { className: "two" }, [
          el("div", {}, [el("p", { className: "label", textContent: "운임 규정 원문" }), Kit.json(f.raw)]),
          el("div", {}, [
            el("p", { className: "label", textContent: "AI 고객용 요약 (수정 가능)" }), edit,
            el("p", { className: "small", style: "margin-top:6px" }, [badge(c.label, c.tone), " ", c.why]),
            el("div", { className: "row", style: "margin-top:10px" }, [
              btn("승인 후 노출", "solid", async () => {
                if (c.blocked) { await Kit.alert("판단 보류이거나 등록 규칙과 다른 건은 승인할 수 없습니다. 원문과 등록 규칙을 먼저 확인해 주세요."); return; }
                if (!edit.value.trim()) { await Kit.alert("요약 문장을 입력해 주세요."); return; }
                summaries[f.air] = edit.value;
                review[f.air] = "승인";
                refreshAll();
              }),
              btn("수정 요청", "line-btn", () => { review[f.air] = "수정 요청"; refreshAll(); }),
            ]),
          ]),
        ]),
        el("p", { className: "label", style: "margin-top:14px", textContent: "AI가 읽어 낸 시점별 수수료" }),
        table(["취소 시점", "#1인 항공사 수수료"], f.tiers.map((t) => [tierLabel(t), feeText(t.fee)])),
      );
    }
    function drawPreview() {
      const f = fareRules.find((x) => x.air === cur);
      const ok = review[f.air] === "승인";
      preview.replaceChildren(el("div", { className: "flight" }, [
        el("div", { className: "top" }, [el("span", { textContent: `${f.air} · ${f.cls} 취소 규정` }), ok ? badge("요약 노출", "ok") : badge("노출 안 함")]),
        el("ul", { className: "list-plain" }, ok
          ? summaries[f.air].split("\n").filter(Boolean).map((t) => el("li", { textContent: t }))
          : [el("li", { className: "muted", textContent: "승인 전에는 원문 규정만 보이고 요약과 환불 금액은 노출되지 않습니다." })]),
      ]));
    }
    function drawAll() { drawList(); drawDetail(); drawPreview(); }
    refreshers.push(drawAll);
    drawAll();
    return [
      block(1, "요약 대기 목록", [listHost]),
      block(2, "원문과 요약 비교", [detail]),
      block(3, "고객 화면 미리보기", [el("div", { className: "device" }, [el("div", { className: "device-bar", textContent: "조회 결과 · 취소 규정" }), preview])]),
    ];
  }

  render({
    id: "fr-cancel",
    plan,
    ai: {
      name: "규정 요약·환불 금액 안내",
      result: "어려운 영문 운임 규정에서 무료취소 날짜와 시점별 항공사 수수료를 읽어 내, 고객이 고른 취소 날짜의 최종 환불 금액까지 보여 주는 화면입니다. 담당자가 승인한 규정만 노출합니다.",
      story: [
        ["출발점", "무료취소 기간은 조회 화면에 표기하도록 기획했지만, 그 이후 취소하면 얼마를 돌려받는지는 고객이 원문으로 이해하기 어렵다는 문제가 남습니다."],
        ["AI 적용", "원문을 고객용 문장으로 요약하고, 무료취소 조건과 시점별 수수료를 구조화해 등록 규칙과 대조한 뒤 환불 금액 계산에 씁니다."],
        ["측정 지표", "요약 오류율, 건당 검수 시간, 환불 금액 관련 문의 건수"],
      ],
      bridge: [
        ["항공사·클래스별 무료취소 규칙", "AI가 읽어 낸 조건을 검증하는 기준 데이터"],
        ["기준일과 시점 입력 규칙", "원문에서 읽어 낼 조건의 형식"],
        ["수수료 카드결제의 환불 금액 항목", "결제 금액, 항공사 수수료, 환불 예정액의 계산 구조"],
      ],
      tabs: [
        { label: "환불 금액 확인", build: buildRefund, spec: [
          ["날짜 선택", "항공권과 취소 예정일을 고릅니다. 검수 전 규정은 금액을 계산하지 않고 원문만 보여 줍니다."],
          ["시점별 수수료", "무료취소 마감일과 구간별 날짜·수수료를 표로 보여 주고, 고른 날짜가 속한 구간을 강조합니다."],
          ["최종 금액", "결제 금액에서 항공사 수수료를 빼 환불 예상액을 계산합니다. 환불 불가 항공권은 세금만 환불합니다."],
        ] },
        { label: "규정 요약 검수", build: buildAiReview, spec: [
          ["대기 목록", "요약 신뢰도와 규칙 대조 결과를 함께 보여 줍니다. 신뢰도가 낮은 건은 판단 보류로 둡니다."],
          ["오답 차단", "원문과 등록 규칙이 다르거나 판단 보류인 건은 승인할 수 없습니다. 환불 분쟁으로 이어질 수 있어 사람이 먼저 확인합니다."],
          ["승인 후 노출", "담당자가 승인해야 요약과 환불 금액이 고객 화면에 나갑니다. 자동 노출은 하지 않습니다."],
        ] },
      ],
    },
  });
})();
