// 오픈마켓 채널 신규 입점 샘플 (채널·항공사·금액은 모두 가상)
(function () {
  const { el, btn, block, table, badge, won, rng, render } = Kit;

  /* ---------- 기존 기획: 요금 변경 재확인 배치 ---------- */
  function buildBatch() {
    const r = rng(2306);
    const rows = Array.from({ length: 10 }, (_, i) => {
      const sale = Math.round((220000 + r() * 600000) / 100) * 100;
      const change = r() < 0.3 ? Math.round((r() * 60000 - 15000) / 100) * 100 : 0;
      return { no: `M23-${String(4100 + i * 7)}`, air: ["A1", "B2", "C3", "E5"][i % 4], route: ["ICN-NRT", "ICN-BKK", "ICN-DAD", "ICN-TPE"][i % 4], sale, now: sale + change, st: "대기" };
    });
    const host = el("div");
    const status = el("p", { className: "status-line" });
    let ran = false;
    function draw() {
      host.replaceChildren(table(["주문번호", "항공사·노선", "#판매가", "#재조회가", "#차액", "처리"], rows.map((x) => {
        const diff = x.now - x.sale;
        const act = !ran ? "재확인 전" : diff === 0 ? badge("변동 없음", "ok") : x.st !== "대기" ? badge(x.st, "info") : el("span", { className: "row" }, [
          btn(diff > 0 ? "차액 안내" : "판매가 유지", "text-btn", () => { x.st = diff > 0 ? "고객 차액 안내" : "판매가 유지"; draw(); }),
          btn("취소 안내", "text-btn danger", () => { x.st = "취소 안내"; draw(); }),
        ]);
        return { cells: [x.no, `${x.air} ${x.route}`, won(x.sale), ran ? won(x.now) : "-", ran ? el("span", { className: diff ? "diff" : "", textContent: diff ? (diff > 0 ? "+" : "") + won(diff) : "0" }) : "-", act], className: ran && diff ? "on" : "" };
      })));
    }
    draw();
    return [block(1, "발권 전 요금 변경 재확인 배치", [
      el("div", { className: "row" }, [el("span", { className: "small muted", textContent: "결제 완료 후 발권 전 주문의 요금을 다시 조회합니다. 오픈마켓은 결제와 발권 사이 시간이 길어 변동이 생깁니다." }), btn("배치 실행", "solid", () => { ran = true; const n = rows.filter((x) => x.now !== x.sale).length; status.textContent = `10건 재조회 완료 · 요금 변동 ${n}건. 변동 건만 처리 버튼이 나옵니다.`; draw(); })]),
      el("div", { style: "margin-top:10px" }, [host]), status])];
  }

  /* ---------- 기존 기획: 항공사별 테스트 예약 ---------- */
  function buildTest() {
    const AIRS = ["A1", "B2", "C3", "E5"];
    const CASES = ["성인 1 왕복 예약·결제", "성인 2 + 소아 1 예약", "결제 후 요금 변경 재확인", "발권 전 취소·환불", "발권 후 취소 수수료 계산"];
    const res = {};
    const host = el("div");
    function draw() {
      const total = AIRS.length * CASES.length;
      const pass = Object.values(res).filter((v) => v === "통과").length;
      const fail = Object.values(res).filter((v) => v === "실패").length;
      host.replaceChildren(
        el("div", { className: "row" }, [el("b", { textContent: `${pass} / ${total} 통과` }), fail ? badge(`실패 ${fail}`, "stop") : null, el("div", { className: "meter blue", style: "flex:1;min-width:120px" }, [el("i", { style: `width:${(pass / total) * 100}%` })])]),
        el("div", { style: "margin-top:10px" }, [table(["테스트 케이스", ...AIRS], CASES.map((c) => [c, ...AIRS.map((a) => {
          const k = `${a}|${c}`;
          const b = btn(res[k] || "미실행", "line-btn", () => { res[k] = res[k] === "통과" ? "실패" : res[k] === "실패" ? undefined : "통과"; draw(); });
          if (res[k] === "통과") b.style.cssText = "color:var(--pass);border-color:#b9dcc8";
          if (res[k] === "실패") b.style.cssText = "color:var(--stop);border-color:#efc6c2";
          return b;
        })]))]),
        el("p", { className: "note", textContent: "칸을 누르면 미실행 → 통과 → 실패 순으로 바뀝니다. 실패가 0이고 모두 통과해야 오픈 승인합니다." }),
        el("div", { className: "row end", style: "margin-top:8px" }, [btn("오픈 승인 요청", "solid", () => Kit.alert(pass === total ? "모든 케이스를 통과했습니다. 오픈 승인을 요청합니다." : `아직 ${total - pass}건이 통과하지 않았습니다. 모두 통과해야 요청할 수 있습니다.`))])
      );
    }
    draw();
    return [block(1, "항공사별 테스트 예약 체크리스트", [host])];
  }

  /* ---------- AI: 판매 페이지 고지 누락 검수 ---------- */
  const REQUIRED = [
    ["수하물", /수하물|위탁/],
    ["취소·환불 규정", /취소|환불/],
    ["발권 수수료", /수수료|TASF/],
    ["요금 변동 가능", /변동|재확인/],
    ["여권·비자 안내", /여권|비자/],
  ];
  const listings = [
    { id: "L-201", title: "[A1] 인천-도쿄 왕복 특가", body: "인천-나리타 왕복 항공권입니다. 위탁 수하물 15kg 포함. 취소 시 항공사 규정에 따라 수수료가 부과됩니다. 결제 후 요금이 변동되면 재확인 후 안내드립니다. 여권 유효기간 6개월 이상 필요." },
    { id: "L-202", title: "[B2] 방콕 땡처리 항공권", body: "방콕 왕복 최저가! 지금 바로 예약하세요. 좌석 한정. 취소 불가 상품입니다." },
    { id: "L-203", title: "[E5] 타이베이 주말 왕복", body: "타이베이 왕복. 기내 수하물 7kg. 발권 수수료 1만원 별도. 취소·환불은 출발 3일 전까지 가능(수수료 있음)." },
  ];
  function buildAi() {
    const listHost = el("div");
    const detail = el("div");
    let cur = "L-202";
    const decided = {};
    const check = (l) => REQUIRED.map(([k, re]) => [k, re.test(l.body)]);
    function drawList() {
      listHost.replaceChildren(table(["상품", "#누락 항목", "결과"], listings.map((l) => {
        const miss = check(l).filter(([, ok]) => !ok).length;
        return { cells: [btn(l.title, "text-btn", () => { cur = l.id; drawList(); drawDetail(); }), String(miss), decided[l.id] ? badge(decided[l.id], "info") : miss ? badge("보완 필요", "stop") : badge("게시 가능", "ok")], className: l.id === cur ? "on" : "" };
      })));
    }
    function drawDetail() {
      const l = listings.find((x) => x.id === cur);
      const res = check(l);
      let body = l.body;
      REQUIRED.forEach(([, re]) => { body = body.replace(new RegExp(re.source, "g"), (m) => `⟦${m}⟧`); });
      const p = el("p", { className: "box wash small" });
      body.split(/(⟦[^⟧]+⟧)/).forEach((part) => p.append(part.startsWith("⟦") ? el("mark", { className: "hl", textContent: part.slice(1, -1) }) : part));
      const missing = res.filter(([, ok]) => !ok).map(([k]) => k);
      detail.replaceChildren(el("div", { className: "two" }, [
        el("div", {}, [el("p", { className: "label", textContent: "판매 페이지 문구 (근거 표시)" }), p]),
        el("div", {}, [
          el("p", { className: "label", textContent: "필수 고지 점검" }),
          el("ul", { className: "list-plain" }, res.map(([k, ok]) => el("li", {}, [ok ? badge("있음", "ok") : badge("없음", "stop"), ` ${k}`]))),
          missing.length ? el("p", { className: "small", style: "margin-top:8px" }, [badge("AI 보완 문구", "info"), ` ${missing.map((k) => ({ "수하물": "위탁 수하물 포함 여부와 무게를 표기해 주세요.", "취소·환불 규정": "취소·환불 가능 시점과 수수료를 표기해 주세요.", "발권 수수료": "발권 수수료(TASF) 별도 여부를 표기해 주세요.", "요금 변동 가능": "결제 후 발권 전 요금이 바뀔 수 있다는 안내가 필요합니다.", "여권·비자 안내": "여권 유효기간·비자 필요 여부를 안내해 주세요." })[k]).join(" ")}`]) : null,
          el("div", { className: "row", style: "margin-top:10px" }, [btn("판매자에게 보완 요청", "solid", () => { decided[l.id] = "보완 요청"; drawList(); }), btn("예외 승인", "line-btn", () => { decided[l.id] = "예외 승인"; drawList(); })]),
        ]),
      ]));
    }
    drawList(); drawDetail();
    return [block(1, "입점 상품 검수 대기", [listHost]), block(2, "고지 누락 점검", [detail])];
  }

  render({
    id: "fr-market",
    plan: {
      name: "오픈마켓 채널 신규 입점",
      changes: [
        ["요금 변동", "발권 시점에 차액이 발견되면 개별 연락", "발권 전 요금 재확인 배치로 변동 건을 미리 분류"],
        ["검증", "대표 항공사 1~2곳만 테스트", "항공사별 × 케이스별 테스트 예약 체크리스트"],
        ["오픈 기준", "담당자 판단", "전 케이스 통과 시에만 오픈 승인 요청"],
      ],
      tabs: [
        { label: "요금 재확인 배치", build: buildBatch, spec: [
          ["재확인 배치", "결제 완료·발권 전 주문의 요금을 다시 조회합니다. 변동이 있는 주문만 처리 버튼이 생깁니다. 오르면 차액 안내, 내리면 판매가 유지가 기본입니다."],
        ] },
        { label: "테스트 예약", build: buildTest, spec: [
          ["체크리스트", "항공사별로 같은 5개 케이스를 테스트합니다. 진행률과 실패 건수를 위에 표시하고, 모두 통과해야 오픈 승인을 요청할 수 있습니다."],
        ] },
      ],
    },
    ai: {
      name: "판매 페이지 고지 누락 검수",
      result: "오픈마켓에 올라가는 항공권 판매 문구에서 수하물·환불·수수료 등 필수 고지가 빠졌는지 AI가 점검하고 보완 문구를 제안하는 검수 화면입니다.",
      story: [
        ["출발점", "채널이 늘면서 판매 페이지 문구를 사람이 하나씩 검수하기 어려워졌고, 고지 누락은 분쟁으로 이어졌습니다."],
        ["AI 적용", "필수 고지 항목별로 문구 근거를 찾고, 없는 항목은 보완 문구를 제안합니다. 게시 여부는 담당자가 정합니다."],
        ["측정 지표", "누락 탐지율, 검수 시간, 고지 관련 분쟁 건수"],
      ],
      bridge: [
        ["항공사별 테스트 예약 체크리스트", "필수 고지 항목 목록의 기준"],
        ["요금 변경 재확인 배치", "'요금 변동 가능' 고지를 필수 항목으로 지정한 근거"],
        ["오픈 승인 절차", "검수 통과 상품만 게시하는 흐름에 연결"],
      ],
      tabs: [
        { label: "상품 문구 검수", build: buildAi, spec: [
          ["검수 대기", "상품마다 누락 항목 수를 보여 줍니다. 누락이 있으면 '보완 필요'로 표시합니다."],
          ["근거와 보완 문구", "찾은 문구는 노란색으로 표시해 담당자가 확인할 수 있게 하고, 없는 항목은 보완 문구를 제안합니다."],
        ] },
      ],
    },
  });
})();
