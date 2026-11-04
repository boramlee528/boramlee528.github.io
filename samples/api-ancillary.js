// Direct API 부가서비스 샘플 (항공사·가격·정산은 모두 가상)
(function () {
  const { el, btn, block, select, field, table, badge, json, won, render } = Kit;

  const MEALS = [["none", "선택 안 함", 0], ["veg", "채식 기내식", 0], ["kid", "어린이 기내식", 0], ["premium", "프리미엄 기내식", 25000]];
  const BAGS = [["0", "추가 없음", 0], ["10", "+10kg", 40000], ["20", "+20kg", 70000]];
  const TAKEN = ["11B", "11C", "12A", "13E", "14F"];
  const EXTRA = ["11A", "11F"]; // 비상구·앞좌석 추가 요금

  /* ---------- 기존 기획: 판매 흐름 ---------- */
  function buildSell() {
    let seat = null;
    const meal = select(MEALS.map(([v, t, p]) => [v, p ? `${t} (+${won(p)}원)` : t]), "none", "기내식");
    const bag = select(BAGS.map(([v, t, p]) => [v, p ? `${t} (+${won(p)}원)` : t]), "0", "수하물");
    const seatHost = el("div");
    const sum = el("div");
    function seatPrice(s) { return !s ? 0 : EXTRA.includes(s) ? 30000 : 10000; }
    function draw() {
      const grid = el("div", { className: "seats" });
      for (let r = 11; r <= 15; r++) {
        ["A", "B", "C", "", "D", "E", "F"].forEach((c) => {
          if (!c) return grid.append(el("span", { textContent: String(r) }));
          const id = `${r}${c}`;
          const b = el("button", { type: "button", textContent: id, className: TAKEN.includes(id) ? "taken" : EXTRA.includes(id) ? "extra" : "", disabled: TAKEN.includes(id), ariaLabel: `${id} 좌석` });
          b.setAttribute("aria-pressed", String(seat === id));
          b.addEventListener("click", () => { seat = seat === id ? null : id; draw(); });
          grid.append(b);
        });
      }
      seatHost.replaceChildren(grid, el("p", { className: "note", textContent: "파란 테두리: 앞좌석·비상구 30,000원 / 일반 좌석 지정 10,000원 / 회색: 선택 불가" }));
      const m = MEALS.find((x) => x[0] === meal.value), g = BAGS.find((x) => x[0] === bag.value);
      const total = seatPrice(seat) + m[2] + g[2];
      const reqBody = { bookingNo: "DA-77120", segment: 1, passenger: 1, items: [seat && { type: "SEAT", code: seat, price: seatPrice(seat) }, m[0] !== "none" && { type: "MEAL", code: m[0].toUpperCase(), price: m[2] }, g[2] && { type: "BAGGAGE", weight: Number(g[0]), price: g[2] }].filter(Boolean) };
      sum.replaceChildren(
        el("dl", { className: "kv" }, [el("dt", { textContent: "좌석" }), el("dd", { textContent: seat ? `${seat} (${won(seatPrice(seat))}원)` : "선택 안 함" }), el("dt", { textContent: "기내식" }), el("dd", { textContent: m[1] }), el("dt", { textContent: "수하물" }), el("dd", { textContent: g[1] }), el("dt", { textContent: "합계" }), el("dd", {}, [el("b", { className: "price", textContent: `${won(total)}원` })])]),
        el("p", { className: "label", style: "margin-top:10px", textContent: "연동사가 보내는 API 요청" }),
        json({ api: "POST /v1/ancillaries/purchase", body: reqBody })
      );
    }
    [meal, bag].forEach((c) => c.addEventListener("change", draw));
    draw();
    return [block(1, "좌석 선택 (ICN → NRT, A1 101)", [seatHost]),
      block(2, "기내식·수하물", [el("div", { className: "form-grid" }, [field("기내식", meal, "span-2"), field("추가 수하물", bag, "span-2")])]),
      block(3, "구매 요약과 API 요청", [sum])];
  }

  /* ---------- 기존 기획: 지원 현황·정산 ---------- */
  function buildSettle() {
    const support = [["A1", "Y", "Y", "Y"], ["B2", "Y", "N", "Y"], ["C3", "N", "N", "Y"], ["E5", "Y", "Y", "N"]];
    const rows = [["가온여행", 128, 4210000, 3.5], ["나래투어", 64, 2018000, 3.5], ["다솜트립", 212, 6904000, 3.0]];
    const yn = (v) => (v === "Y" ? badge("지원", "ok") : badge("미지원", ""));
    return [
      block(1, "항공사별 부가서비스 지원 현황", [table(["항공사", "좌석", "기내식", "수하물"], support.map(([a, s, m, b]) => [a, yn(s), yn(m), yn(b)])),
        el("p", { className: "note", textContent: "항공사 스펙을 항공사별로 확인해 정리했습니다. 미지원 항목은 API 응답에서 판매 불가로 내려갑니다." })]),
      block(2, "11월 연동사별 판매·정산", [table(["연동사", "#판매 건수", "#판매 금액(원)", "#수수료율", "#정산 금액(원)"], [...rows.map(([n, c, a, r]) => [n, String(c), won(a), `${r}%`, won(a * (1 - r / 100))]),
        { cells: [el("b", { textContent: "합계" }), String(rows.reduce((s, x) => s + x[1], 0)), won(rows.reduce((s, x) => s + x[2], 0)), "", won(rows.reduce((s, x) => s + x[2] * (1 - x[3] / 100), 0))], className: "on" }])]),
    ];
  }

  /* ---------- AI: 여정 기반 부가서비스 추천 ---------- */
  const TRIPS = [
    { id: "t1", label: "가족 4명 · 인천→방콕 · 유아 1", facts: ["유아 동반", "5시간 30분 비행", "위탁 수하물 15kg/인"], recs: [
      ["좌석", "앞좌석 나란히 4석 (유아 요람 가능 열)", "유아 동반 + 4인 → 떨어져 앉을 위험", 82], ["기내식", "어린이 기내식 1", "소아 1명 탑승", 74], ["수하물", "+10kg 1개", "가족 여행 평균 초과 무게", 41]] },
    { id: "t2", label: "출장 1명 · 인천→파리 · 당일 미팅", facts: ["장거리 13시간", "도착 당일 일정", "기내 수하물만"], recs: [
      ["좌석", "앞좌석 통로 (빠른 하기)", "도착 당일 미팅 → 빠른 하기 선호", 77], ["기내식", "프리미엄 기내식", "장거리 · 출장", 38]] },
  ];
  function buildAi() {
    const chips = el("div", { className: "chips" });
    const host = el("div");
    let cur = "t1";
    const off = {};
    function draw() {
      chips.replaceChildren(...TRIPS.map((t) => { const b = btn(t.label, "", () => { cur = t.id; draw(); }); b.setAttribute("aria-pressed", String(t.id === cur)); return b; }));
      const t = TRIPS.find((x) => x.id === cur);
      const shown = t.recs.filter((r) => r[3] >= 50);
      host.replaceChildren(
        el("p", { className: "label", textContent: "추천에 쓴 여정 정보" }), el("div", { className: "chips" }, t.facts.map((f) => badge(f, "info"))),
        el("div", { style: "margin-top:12px" }, [table(["항목", "추천", "이유", "#예상 구매율", "노출"], t.recs.map((r, i) => {
          const k = cur + i;
          const visible = r[3] >= 50 && !off[k];
          return [r[0], r[1], el("span", { className: "small", textContent: r[2] }), `${r[3]}%`, r[3] < 50 ? badge("노출 안 함 (50% 미만)", "") : btn(visible ? "노출 중" : "끔", "line-btn", () => { off[k] = !off[k]; draw(); })];
        }))]),
        el("p", { className: "note", textContent: `고객 화면에는 ${shown.filter((r, i) => !off[cur + t.recs.indexOf(r)]).length}개만 '함께 많이 고른 서비스'로 보여 줍니다. 강제 선택이나 기본 체크는 하지 않습니다.` })
      );
    }
    draw();
    return [block(1, "예약 여정 선택", [chips]), block(2, "부가서비스 추천과 노출 기준", [host])];
  }

  render({
    id: "api-ancillary",
    plan: {
      name: "Direct API 부가서비스",
      changes: [
        ["판매 채널", "자사 웹에서만 좌석·기내식·수하물 판매", "연동사도 API로 부가서비스 조회·구매"],
        ["항공사 차이", "항공사마다 다른 스펙을 개별 처리", "항공사별 지원 현황표로 판매 가능 여부를 통일된 응답으로 제공"],
        ["정산", "부가서비스 매출을 수기로 분리", "연동사별 판매 건수·수수료·정산 금액 자동 집계"],
      ],
      tabs: [
        { label: "판매 흐름", build: buildSell, spec: [
          ["좌석 선택", "좌석 등급별 가격을 색으로 구분하고, 이미 팔린 좌석은 고를 수 없게 합니다."],
          ["기내식·수하물", "항공사가 지원하는 옵션만 보여 줍니다."],
          ["요약과 API", "고른 내용을 합계와 함께 보여 주고, 연동사가 보낼 API 요청 형태를 그대로 확인할 수 있게 했습니다."],
        ] },
        { label: "지원 현황·정산", build: buildSettle, spec: [
          ["지원 현황", "항공사별로 좌석·기내식·수하물 지원 여부를 관리합니다."],
          ["정산", "연동사별 판매 금액과 수수료율로 정산 금액을 계산합니다."],
        ] },
      ],
    },
    ai: {
      name: "여정 기반 부가서비스 추천",
      result: "예약 여정(동반자, 비행 시간, 일정)을 바탕으로 AI가 필요할 만한 부가서비스를 추천하고, 구매 가능성이 낮은 추천은 노출하지 않는 기획입니다.",
      story: [
        ["출발점", "부가서비스 판매 채널은 넓어졌지만, 모든 고객에게 같은 목록을 보여 줘 구매율이 낮았습니다."],
        ["AI 적용", "여정 정보로 추천 이유와 예상 구매율을 계산하고, 50% 이상만 노출합니다. 기본 선택은 하지 않습니다."],
        ["측정 지표", "부가서비스 구매율, 추천 노출 대비 구매 전환, 고객 불만 건수"],
      ],
      bridge: [
        ["항공사별 지원 현황", "추천 가능한 서비스 범위"],
        ["부가서비스 API 요청 구조", "추천을 바로 구매 요청으로 연결"],
        ["연동사별 판매·정산 집계", "추천 효과(구매율) 측정 데이터"],
      ],
      tabs: [
        { label: "추천 화면", build: buildAi, spec: [
          ["여정 선택", "가족 여행과 출장 두 가지 예약으로 추천이 어떻게 달라지는지 비교합니다."],
          ["추천 기준", "추천마다 이유를 보여 주고, 예상 구매율 50% 미만은 노출하지 않습니다. 담당자는 추천을 끌 수 있습니다."],
        ] },
      ],
    },
  });
})();
