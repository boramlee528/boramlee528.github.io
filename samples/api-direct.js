// Direct API 연동 샘플 (연동사·요청·응답은 모두 가상)
(function () {
  const { el, btn, block, select, field, table, badge, json, render } = Kit;

  const STEPS = [
    { id: "search", name: "운임 검색", req: { api: "POST /v1/fares/search", body: { origin: "ICN", destination: "NRT", departDate: "2026-12-18", pax: { adt: 1 } } }, res: { code: "0000", fares: [{ fareId: "F-1029", airline: "A1", total: 312400 }] } },
    { id: "price", name: "운임 확정", req: { api: "POST /v1/fares/price", body: { fareId: "F-1029" } }, res: { code: "0000", total: 312400, ttl: "2026-11-05T23:59:00+09:00" } },
    { id: "book", name: "예약 생성", req: { api: "POST /v1/bookings", body: { fareId: "F-1029", passengers: [{ type: "ADT", lastName: "HONG", firstName: "GILDONG" }] } }, res: { code: "0000", bookingNo: "DA-77120", status: "HOLD" } },
    { id: "ticket", name: "발권 요청", req: { api: "POST /v1/bookings/DA-77120/ticket", body: { payment: "AGENCY_DEPOSIT" } }, res: { code: "0000", status: "TICKETED", ticketNo: "180-2345678901" } },
    { id: "cancel", name: "취소·환불", req: { api: "POST /v1/bookings/DA-77120/refund", body: { reason: "CUSTOMER" } }, res: { code: "0000", refundAmount: 212400, fee: 100000 } },
  ];
  const PARTNERS = ["가온여행 (B2B)", "나래투어 (메타)", "다솜트립 (OTA)"];
  const failAt = { "나래투어 (메타)": "price", "다솜트립 (OTA)": "ticket" };
  const failRes = { price: { code: "E201", message: "FARE NO LONGER AVAILABLE" }, ticket: { code: "E405", message: "DEPOSIT BALANCE INSUFFICIENT" } };

  /* ---------- 기존 기획: 검수 시나리오 ---------- */
  function buildScenario() {
    const partner = select(PARTNERS, PARTNERS[0], "연동사");
    const host = el("div");
    const viewer = el("div");
    let results = {};
    let view = null;
    function run(step) {
      const fail = failAt[partner.value] === step.id;
      const idx = STEPS.indexOf(step);
      if (idx > 0 && results[STEPS[idx - 1].id] !== "통과") return Kit.alert(`앞 단계(${STEPS[idx - 1].name})를 먼저 통과해야 합니다.`);
      results[step.id] = fail ? "실패" : "통과";
      view = { step, res: fail ? failRes[step.id] : step.res, fail };
      draw();
    }
    function draw() {
      const pass = Object.values(results).filter((v) => v === "통과").length;
      host.replaceChildren(
        el("div", { className: "row" }, [el("b", { textContent: `${pass} / ${STEPS.length} 단계 통과` }), el("div", { className: "meter blue", style: "flex:1;min-width:120px" }, [el("i", { style: `width:${(pass / STEPS.length) * 100}%` })])]),
        el("div", { style: "margin-top:10px" }, [table(["#", "단계", "API", "결과", ""], STEPS.map((s, i) => [String(i + 1), s.name, el("span", { className: "small", textContent: s.req.api }),
          results[s.id] ? badge(results[s.id], results[s.id] === "통과" ? "ok" : "stop") : "미실행", btn("실행", "text-btn", () => run(s))]))])
      );
      viewer.replaceChildren(view ? el("div", { className: "two" }, [
        el("div", {}, [el("p", { className: "label", textContent: `요청 · ${view.step.name}` }), json(view.step.req)]),
        el("div", {}, [el("p", { className: "label", textContent: "응답" }), json(view.res), view.fail ? el("p", { className: "small diff", style: "margin-top:6px", textContent: "검수 실패: 연동사에 오류 코드와 재현 조건을 회신하고 재검수 일정을 잡습니다." }) : null]),
      ]) : el("p", { className: "muted", textContent: "단계를 실행하면 요청과 응답이 여기에 나옵니다." }));
    }
    partner.addEventListener("change", () => { results = {}; view = null; draw(); });
    draw();
    return [block(1, "연동사별 검수 시나리오", [el("div", { className: "form-grid" }, [field("연동사", partner, "span-2")]), el("p", { className: "note", textContent: "연동사를 바꾸면 처음부터 다시 검수합니다. 단계는 순서대로만 실행됩니다." }), el("div", { style: "margin-top:10px" }, [host])]),
      block(2, "요청·응답 확인", [viewer])];
  }

  /* ---------- 기존 기획: 연동 개발 체크리스트 ---------- */
  function buildChecklist() {
    const items = [
      ["계약·준비", "API 키 발급과 IP 허용 목록 등록", true], ["계약·준비", "테스트 계정·예치금 설정", true],
      ["기능", "검색 응답 30초 타임아웃 처리", true], ["기능", "운임 확정 후 TTL 만료 처리", false], ["기능", "발권 실패 시 예약 자동 취소", false],
      ["예외", "중복 예약 요청 방지 (같은 요청 ID)", false], ["예외", "부분 환불 금액 계산 일치", false],
      ["운영", "예약관리자에서 연동사별 예약 조회", true], ["운영", "오류 코드표 연동사 공유", true],
    ];
    const host = el("div");
    function draw() {
      const done = items.filter((x) => x[2]).length;
      host.replaceChildren(
        el("p", { className: "row" }, [el("b", { textContent: `${done} / ${items.length} 완료` }), done === items.length ? badge("오픈 가능", "ok") : badge(`남은 항목 ${items.length - done}`, "warn")]),
        el("div", { style: "margin-top:8px" }, [table(["구분", "확인 항목", "완료"], items.map((x) => {
          const cb = el("input", { type: "checkbox", checked: x[2], ariaLabel: x[1] });
          cb.addEventListener("change", () => { x[2] = cb.checked; draw(); });
          return [x[0], x[1], cb];
        }))])
      );
    }
    draw();
    return [block(1, "연동 개발 체크리스트", [host])];
  }

  /* ---------- AI: 요구사항에서 QA 케이스 생성 ---------- */
  const REQS = {
    ttl: { text: "운임 확정 후 TTL(발권 시한)이 지나면 예약을 자동 취소한다. 취소 10분 전 연동사에 알림을 보낸다.", cases: [
      ["정상", "TTL 전 발권 요청 → 발권 성공", "TTL: 23:59 / 요청 23:40"], ["정상", "TTL 10분 전 알림 발송", "TTL 23:59 → 23:49 알림"],
      ["예외", "TTL 지난 뒤 발권 요청 → 오류 코드 반환", "요청 00:01 → E301"], ["경계", "TTL 정각에 발권 요청", "요청 23:59:00 → 처리 기준 확인 필요"],
      ["예외", "알림 발송 실패 시 재시도", "웹훅 응답 500 → 3회 재시도"], ["누락 의심", "자동 취소 후 같은 운임 재검색 가능 여부", "요구사항에 없음 → 기획 확인"]] },
    dup: { text: "같은 요청 ID로 예약 생성 요청이 두 번 오면 두 번째 요청은 첫 번째 결과를 그대로 돌려준다.", cases: [
      ["정상", "같은 요청 ID 두 번 → 같은 예약번호 반환", "requestId R-1 ×2"], ["정상", "다른 요청 ID → 각각 예약 생성", "R-1, R-2"],
      ["경계", "첫 요청 처리 중에 두 번째 요청 도착", "동시 요청 → 처리 중 응답 기준 확인"], ["예외", "같은 요청 ID에 다른 승객 정보", "→ 오류로 거절할지 기획 확인"],
      ["누락 의심", "요청 ID 보관 기간", "요구사항에 없음 → 24시간 제안"]] },
  };
  function buildAi() {
    const pick = select([["ttl", "요구사항 A: TTL 자동 취소"], ["dup", "요구사항 B: 중복 요청 방지"]], "ttl", "요구사항");
    const area = el("textarea", { ariaLabel: "요구사항 원문" });
    area.style.minHeight = "70px";
    const host = el("div");
    let adopted = {};
    function load() { area.value = REQS[pick.value].text; adopted = {}; draw(); }
    function draw() {
      const cs = REQS[pick.value].cases;
      const n = Object.values(adopted).filter(Boolean).length;
      host.replaceChildren(
        el("p", { className: "row small" }, [el("span", { textContent: `AI 생성 ${cs.length}건 · 채택 ${n}건` }), badge(`정상 ${cs.filter((c) => c[0] === "정상").length}`, "ok"), badge(`예외 ${cs.filter((c) => c[0] === "예외").length}`, "stop"), badge(`경계 ${cs.filter((c) => c[0] === "경계").length}`, "warn"), badge(`누락 의심 ${cs.filter((c) => c[0] === "누락 의심").length}`, "info")]),
        table(["유형", "테스트 케이스", "테스트 데이터", "채택"], cs.map((c, i) => {
          const cb = el("input", { type: "checkbox", checked: !!adopted[i], ariaLabel: `${c[1]} 채택` });
          cb.addEventListener("change", () => { adopted[i] = cb.checked; draw(); });
          return [badge(c[0], { 정상: "ok", 예외: "stop", 경계: "warn", "누락 의심": "info" }[c[0]]), c[1], el("span", { className: "small", textContent: c[2] }), cb];
        })),
        el("div", { className: "row end", style: "margin-top:8px" }, [btn("채택한 케이스를 검수 시나리오에 추가", "solid", () => Kit.alert(n ? `${n}건을 검수 시나리오에 추가했습니다. '누락 의심' 항목은 기획서에 반영할지 따로 확인합니다.` : "채택한 케이스가 없습니다."))])
      );
    }
    pick.addEventListener("change", load);
    load();
    return [block(1, "요구사항 입력", [el("div", { className: "form-grid" }, [field("샘플 요구사항", pick, "span-2")]), el("div", { style: "margin-top:8px" }, [area])]),
      block(2, "AI가 만든 테스트 케이스", [host])];
  }

  render({
    id: "api-direct",
    plan: {
      name: "Direct API 연동",
      changes: [
        ["검수", "연동사마다 담당자가 임의로 테스트", "검색→확정→예약→발권→취소 5단계 표준 검수 시나리오"],
        ["오류 대응", "오류 메시지를 메일로 주고받음", "오류 코드표 공유, 실패 단계와 재현 조건 회신"],
        ["오픈 판단", "개발 완료 = 오픈", "연동 개발 체크리스트 전 항목 완료 시 오픈"],
      ],
      tabs: [
        { label: "검수 시나리오", build: buildScenario, spec: [
          ["표준 시나리오", "모든 연동사에 같은 5단계를 순서대로 실행합니다. 앞 단계를 통과해야 다음 단계를 실행할 수 있습니다."],
          ["요청·응답", "단계마다 실제 요청과 응답 형태를 보여 줍니다. 연동사에 따라 실패 사례도 재현됩니다."],
        ] },
        { label: "개발 체크리스트", build: buildChecklist, spec: [
          ["체크리스트", "계약·기능·예외·운영으로 나눠 오픈 전 확인 항목을 관리합니다. 모두 완료해야 '오픈 가능'이 됩니다."],
        ] },
      ],
    },
    ai: {
      name: "요구사항에서 QA 케이스 생성",
      result: "기획서의 요구사항 문장을 넣으면 AI가 정상·예외·경계 테스트 케이스와 기획 누락 의심 항목을 만들어 주고, 담당자가 골라 검수 시나리오에 추가하는 기획입니다.",
      story: [
        ["출발점", "연동사마다 검수 시나리오를 직접 써야 했고, 예외·경계 케이스가 빠지면 오픈 후 장애로 이어졌습니다."],
        ["AI 적용", "요구사항에서 테스트 케이스를 유형별로 생성하고, 요구사항에 답이 없는 부분은 '누락 의심'으로 표시합니다."],
        ["측정 지표", "케이스 작성 시간, 오픈 후 발견된 결함 수"],
      ],
      bridge: [
        ["5단계 표준 검수 시나리오", "생성된 케이스를 붙일 틀"],
        ["연동 개발 체크리스트의 예외 항목", "예외·경계 케이스 생성 기준"],
        ["오류 코드표", "예외 케이스의 기대 결과"],
      ],
      tabs: [
        { label: "QA 케이스 생성", build: buildAi, spec: [
          ["요구사항 입력", "샘플 요구사항 두 개 중 하나를 고르거나 문장을 고쳐 봅니다."],
          ["케이스 검토", "유형별 개수를 위에 요약하고, 담당자가 채택한 것만 검수 시나리오에 넣습니다. '누락 의심'은 기획 보완 과제로 넘깁니다."],
        ] },
      ],
    },
  });
})();
