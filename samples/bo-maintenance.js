// OTA 서비스 유지보수 샘플 (접수 건수·환불 건수는 모두 가상)
(function () {
  const { el, btn, block, table, badge, won, rng, render } = Kit;

  const TYPES = [
    { t: "환불 금액 문의", n: 142, cases: ["환불 예정 금액이 화면과 다름", "수수료 차감 기준 문의", "부분 환불 금액 확인"], fix: "환불 예정 금액 계산식을 화면에 노출하고 수수료 항목을 분리 표시", done: true },
    { t: "환불 처리 지연", n: 96, cases: ["접수 후 3일째 처리 안 됨", "카드 취소 반영 시점 문의"], fix: "자동 환불 대상 확대(발권 전 취소), 처리 단계 표시", done: true },
    { t: "발권 상태 확인", n: 71, cases: ["결제했는데 발권 안 됨", "전자항공권 메일 미수신"], fix: "마이페이지 대표 상태값과 발권 예정 시각 표시", done: false },
    { t: "탑승객 정보 수정", n: 44, cases: ["영문 이름 오타 수정", "생년월일 수정"], fix: "수정 가능 범위 안내 문구와 대리점 수정 요청 양식", done: false },
    { t: "기타", n: 23, cases: ["영수증 재발행", "좌석 지정 문의"], fix: "자주 묻는 질문 연결", done: false },
  ];

  /* ---------- 기존 기획: 접수 분석 ---------- */
  function buildAnalysis() {
    const bars = el("div");
    const detail = el("div");
    let cur = 0;
    const max = Math.max(...TYPES.map((x) => x.n));
    function draw() {
      bars.replaceChildren(...TYPES.map((x, i) => el("div", { className: "hbar" + (i === cur ? " on" : "") }, [
        btn(x.t, "", () => { cur = i; draw(); }), el("div", { className: "meter" }, [el("i", { style: `width:${(x.n / max) * 100}%` })]), el("b", { textContent: String(x.n) }),
      ])));
      const x = TYPES[cur];
      detail.replaceChildren(el("div", { className: "box" }, [
        el("h4", { textContent: `${x.t} · ${x.n}건 (${Math.round((x.n / TYPES.reduce((a, y) => a + y.n, 0)) * 100)}%)` }),
        el("p", { className: "label", textContent: "대표 접수 내용" }), el("ul", { className: "list-plain small" }, x.cases.map((c) => el("li", { textContent: c }))),
        el("p", { className: "label", style: "margin-top:10px", textContent: "기능 개선안" }),
        el("p", { className: "row" }, [el("span", { textContent: x.fix }), x.done ? badge("반영 완료", "ok") : btn("개선 요청 등록", "text-btn", () => { x.done = true; draw(); })]),
      ]));
    }
    draw();
    return [block(1, "최근 3개월 접수 유형 (대리점 OTA)", [bars, el("p", { className: "note", textContent: "유형을 누르면 대표 접수 내용과 개선안을 아래에 보여 줍니다." })]), block(2, "유형별 원인과 개선안", [detail])];
  }

  /* ---------- 기존 기획: 자동 환불 현황 ---------- */
  function buildRefund() {
    const r = rng(1104);
    const rows = Array.from({ length: 8 }, (_, i) => {
      const auto = r() < 0.7;
      return { no: `O2611-${3300 + i * 13}`, ota: ["하늘길투어", "온에어트립", "여행공방"][i % 3], amt: Math.round((150000 + r() * 900000) / 100) * 100, auto, why: auto ? "발권 전 취소 · 자동" : ["발권 후 부분 환불", "항공사 수수료 확인 필요", "결제수단 2개 이상"][i % 3] };
    });
    const autoN = rows.filter((x) => x.auto).length;
    return [
      block(1, "오늘 환불 처리 현황", [Kit.kpis([["전체 환불", rows.length, "건"], ["자동 처리", autoN, "건", `${Math.round((autoN / rows.length) * 100)}%`], ["수동 처리", rows.length - autoN, "건", "사유 아래 표시"], ["평균 처리", "0.4", "일", "자동 건 기준"]])]),
      block(2, "환불 목록", [table(["예약번호", "OTA", "#금액(원)", "처리", "사유"], rows.map((x) => [x.no, x.ota, won(x.amt), x.auto ? badge("자동", "ok") : badge("수동", "warn"), x.why]))]),
    ];
  }

  /* ---------- AI: 자동 환불 이상 탐지 ---------- */
  function buildAi() {
    const r = rng(77);
    const days = Array.from({ length: 21 }, (_, i) => {
      let v = Math.round(60 + r() * 25 + (i % 7 === 5 || i % 7 === 6 ? -18 : 0));
      if (i === 14) v = 148;
      if (i === 18) v = 18;
      const dt = new Date(2026, 9, 14 + i);
      return { d: `${dt.getMonth() + 1}/${String(dt.getDate()).padStart(2, "0")}`, v };
    });
    let k = 2.2;
    const fb = {};
    const chartHost = el("div");
    const listHost = el("div");
    const slider = el("input", { type: "range", min: "1.5", max: "3.5", step: "0.1", value: String(k), ariaLabel: "민감도" });
    const sLabel = el("b");
    function stats() {
      const vals = days.map((x) => x.v);
      const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
      const sd = Math.sqrt(vals.reduce((a, b) => a + (b - mean) ** 2, 0) / vals.length);
      return { mean, sd };
    }
    function draw() {
      const { mean, sd } = stats();
      sLabel.textContent = `${k.toFixed(1)}σ`;
      const hi = mean + k * sd, lo = Math.max(0, mean - k * sd);
      const W = 640, H = 200, L = 30, B = 24, T = 10, max = 160;
      const x = (i) => L + (i * (W - L - 8)) / (days.length - 1);
      const y = (v) => T + (H - T - B) * (1 - v / max);
      const NS = "http://www.w3.org/2000/svg";
      const svg = document.createElementNS(NS, "svg");
      svg.setAttribute("viewBox", `0 0 ${W} ${H}`); svg.setAttribute("class", "chart"); svg.setAttribute("role", "img"); svg.setAttribute("aria-label", "일별 자동 환불 건수와 이상 구간");
      const add = (tag, at, txt) => { const n = document.createElementNS(NS, tag); Object.entries(at).forEach(([a, b]) => n.setAttribute(a, b)); if (txt) n.textContent = txt; svg.append(n); return n; };
      add("rect", { x: L, y: y(hi), width: W - L - 8, height: Math.max(0, y(lo) - y(hi)), fill: "#f1f5fd" });
      [0, 50, 100, 150].forEach((v) => { add("line", { x1: L, x2: W - 8, y1: y(v), y2: y(v), stroke: "#e4e4e4" }); add("text", { x: L - 6, y: y(v) + 4, "text-anchor": "end", "font-size": 11, fill: "#6b6b6b" }, String(v)); });
      add("polyline", { points: days.map((d, i) => `${x(i)},${y(d.v)}`).join(" "), fill: "none", stroke: "#191919", "stroke-width": 1.5 });
      days.forEach((d, i) => {
        const out = d.v > hi || d.v < lo;
        add("circle", { cx: x(i), cy: y(d.v), r: out ? 5 : 2.5, fill: out ? "#b3261e" : "#191919" });
        if (i % 3 === 0) add("text", { x: x(i), y: H - 6, "text-anchor": "middle", "font-size": 11, fill: "#6b6b6b" }, d.d);
      });
      chartHost.replaceChildren(svg, el("div", { className: "legend" }, [el("span", {}, [el("i", { style: "background:#f1f5fd;border:1px solid #c4d6f5" }), "정상 범위"]), el("span", {}, [el("i", { style: "background:#b3261e" }), "이상 탐지"])]));
      const outs = days.filter((d) => d.v > hi || d.v < lo);
      listHost.replaceChildren(outs.length ? table(["날짜", "#건수", "판단", "추정 원인", "피드백"], outs.map((d) => [d.d, String(d.v), d.v > hi ? badge("급증", "stop") : badge("급감", "warn"),
        d.v > hi ? "특정 항공사 운항 취소로 일괄 환불 접수 추정 (항공사 1곳 비중 72%)" : "자동 환불 배치 실행 실패 가능성 (수동 처리 비중 급증)",
        fb[d.d] ? badge(fb[d.d], "info") : el("span", { className: "row" }, [btn("실제 이상", "text-btn", () => { fb[d.d] = "실제 이상"; draw(); }), btn("오탐", "text-btn", () => { fb[d.d] = "오탐"; draw(); })])])) : el("p", { className: "no-result", textContent: "현재 민감도에서 이상으로 판단한 날이 없습니다." }));
    }
    slider.addEventListener("input", () => { k = Number(slider.value); draw(); });
    draw();
    return [
      block(1, "일별 자동 환불 건수", [chartHost]),
      block(2, "알림 기준 (민감도)", [el("div", { className: "row" }, [el("span", { className: "small", textContent: "낮을수록 민감" }), el("div", { style: "flex:1;min-width:140px" }, [slider]), sLabel]),
        el("p", { className: "note", textContent: "평균에서 표준편차의 몇 배 벗어나면 알릴지 정합니다. 오탐 피드백이 쌓이면 기준을 조정합니다." })]),
      block(3, "이상 탐지 목록", [listHost]),
    ];
  }

  render({
    id: "bo-maintenance",
    plan: {
      name: "OTA 서비스 유지보수",
      changes: [
        ["문의 분석", "들어오는 순서대로 개별 처리", "접수 유형별로 묶어 건수가 많은 원인부터 개선"],
        ["환불", "모든 환불을 담당자가 수동 처리", "발권 전 취소 등 규칙이 명확한 건은 자동 환불"],
        ["효과 확인", "체감으로 판단", "자동 처리 비율과 유형별 접수 건수를 오픈 후 별도 집계"],
      ],
      tabs: [
        { label: "접수 분석", build: buildAnalysis, spec: [
          ["유형별 건수", "최근 3개월 접수를 유형으로 묶어 건수 순으로 보여 줍니다."],
          ["원인과 개선안", "유형마다 대표 사례와 기능 개선안을 연결하고, 반영 여부를 표시합니다."],
        ] },
        { label: "자동 환불 현황", build: buildRefund, spec: [
          ["처리 현황", "자동·수동 처리 건수와 비율을 위에 고정합니다."],
          ["수동 사유", "자동으로 처리하지 못한 건은 사유를 남겨 다음 자동화 후보로 씁니다."],
        ] },
      ],
    },
    ai: {
      name: "자동 환불 이상 탐지",
      result: "일별 자동 환불 건수 추이에서 평소와 다른 날을 AI가 찾아 원인을 추정하고 담당자에게 알리는 모니터링 화면입니다.",
      story: [
        ["출발점", "자동 환불로 처리량은 늘었지만, 배치 실패나 대량 취소 같은 이상은 다음 날 집계를 보고서야 알았습니다."],
        ["AI 적용", "평소 범위를 벗어난 날을 표시하고, 항공사·처리 방식 비중으로 원인을 추정합니다."],
        ["측정 지표", "이상 탐지까지 걸린 시간, 오탐률"],
      ],
      bridge: [
        ["자동 환불 처리 건수 별도 집계", "이상 탐지의 기준 데이터"],
        ["수동 처리 사유", "급감(배치 실패) 원인 추정 근거"],
        ["접수 유형 분석", "급증 시 함께 늘어난 문의 유형 확인"],
      ],
      tabs: [
        { label: "이상 탐지", build: buildAi, spec: [
          ["추이 차트", "파란 띠가 정상 범위, 빨간 점이 이상으로 판단한 날입니다."],
          ["민감도", "알림 기준을 직접 조절해 볼 수 있습니다. 너무 민감하면 오탐이 늘어납니다."],
          ["피드백", "실제 이상인지 오탐인지 기록해 기준을 보정합니다."],
        ] },
      ],
    },
  });
})();
