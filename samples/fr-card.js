// 카드 청구할인 샘플 (카드사 조건은 모두 가상)
(function () {
  const { el, btn, block, select, input, field, table, badge, won, render } = Kit;

  const promos = [
    { card: "가나카드", rate: 7, min: 300000, cap: 50000, scope: "국제선", from: "2026-11-01", to: "2026-12-31", use: true },
    { card: "다라카드", rate: 5, min: 100000, cap: 20000, scope: "전체", from: "2026-11-01", to: "2026-11-30", use: true },
    { card: "마바카드", rate: 10, min: 500000, cap: 70000, scope: "국제선", from: "2026-12-01", to: "2027-01-31", use: true },
    { card: "사아카드", rate: 3, min: 50000, cap: 10000, scope: "국내선", from: "2026-10-01", to: "2026-12-31", use: false },
  ];
  function apply(p, amt, scope, date) {
    if (!p) return { ok: false, why: "할인 대상 카드가 아닙니다." };
    if (!p.use) return { ok: false, why: "현재 진행하지 않는 할인입니다." };
    if (p.scope !== "전체" && p.scope !== scope) return { ok: false, why: `${p.scope} 전용 할인입니다.` };
    if (date < p.from || date > p.to) return { ok: false, why: `할인 기간(${p.from} ~ ${p.to})이 아닙니다.` };
    if (amt < p.min) return { ok: false, why: `${won(p.min)}원 이상 결제 시 적용됩니다. ${won(p.min - amt)}원 부족합니다.` };
    const dc = Math.min(Math.floor((amt * p.rate) / 100 / 10) * 10, p.cap);
    return { ok: true, dc, why: `${p.rate}% 청구할인${dc === p.cap ? ` (최대 ${won(p.cap)}원)` : ""}` };
  }

  /* ---------- 기존 기획: 결제 화면 ---------- */
  function buildPay() {
    const amt = input("412000", "결제 금액", "number");
    const scope = select(["국제선", "국내선"], "국제선", "구분");
    const date = input("2026-11-20", "결제일", "date");
    const out = el("div", { className: "device-body" });
    function draw() {
      const a = Number(amt.value) || 0;
      out.replaceChildren(
        el("div", { className: "row" }, [el("span", { textContent: "항공권 결제 금액" }), el("b", { className: "price", style: "margin-left:auto", textContent: `${won(a)}원` })]),
        el("p", { className: "label", textContent: "카드사 청구할인 (결제 후 카드 청구 시 차감)" }),
        ...promos.map((p) => {
          const r = apply(p, a, scope.value, date.value);
          return el("div", { className: "flight" }, [
            el("div", { className: "top" }, [el("span", { textContent: p.card }), r.ok ? el("span", { textContent: `-${won(r.dc)}원` }) : badge("미적용", "")]),
            el("span", { className: "small " + (r.ok ? "" : "muted"), textContent: r.ok ? `${r.why} · 실 부담 ${won(a - r.dc)}원` : r.why }),
          ]);
        }),
        el("p", { className: "small muted", textContent: "청구할인은 결제 금액에서 바로 빠지지 않고 카드 청구서에서 차감됩니다. 이 문구를 결제 버튼 위에 고정합니다." })
      );
    }
    [amt, scope, date].forEach((c) => c.addEventListener("input", draw));
    draw();
    return [
      block(1, "조건 입력 (테스트용)", [el("div", { className: "form-grid" }, [field("결제 금액(원)", amt), field("구분", scope), field("결제일", date, "span-2")])]),
      block(2, "결제 화면 할인 안내", [el("div", { className: "device" }, [el("div", { className: "device-bar", textContent: "결제 수단 선택" }), out])]),
    ];
  }

  /* ---------- 기존 기획: 관리자 할인 조건 ---------- */
  function buildAdmin() {
    const host = el("div");
    const status = el("p", { className: "status-line" });
    const history = [["v1.0", "2022.05", "최초 오픈: 카드사 3곳, 국제선"], ["v1.1", "2023.03", "국내선 예약카드에 할인 노출 추가"], ["v1.2", "2024.02", "할인 기간 겹침 검사, 최소 금액 문구 개선"]];
    function draw() {
      host.replaceChildren(table(["카드사", "#할인율", "#최소 결제", "#최대 할인", "대상", "기간", "사용"], promos.map((p) => [p.card, `${p.rate}%`, won(p.min), won(p.cap), p.scope, `${p.from} ~ ${p.to}`,
        btn(p.use ? "Y" : "N", "line-btn", () => { p.use = !p.use; status.textContent = `${p.card} 할인을 ${p.use ? "사용" : "중지"}로 바꿨습니다. 결제 화면 탭에 바로 반영됩니다.`; draw(); })])));
    }
    draw();
    return [block(1, "카드사별 청구할인 조건", [host, status]), block(2, "기획서 개정 이력", [table(["버전", "시기", "주요 변경"], history)])];
  }

  /* ---------- AI: 카드사 공지 → 할인 조건 추출 ---------- */
  const notices = [
    { id: "N1", card: "자차카드", text: "[자차카드] 항공권 결제 시 청구할인 이벤트\n- 기간: 2026.12.01 ~ 2026.12.31\n- 대상: 국제선 항공권\n- 혜택: 40만원 이상 결제 시 6% 청구할인 (최대 4만원)\n- 법인카드·체크카드 제외",
      out: { rate: [6, "6% 청구할인"], min: [400000, "40만원 이상"], cap: [40000, "최대 4만원"], scope: ["국제선", "국제선 항공권"], from: ["2026-12-01", "2026.12.01"], to: ["2026-12-31", "2026.12.31"], extra: ["법인·체크카드 제외", "법인카드·체크카드 제외"] }, conf: 95 },
    { id: "N2", card: "가나카드", text: "[가나카드] 연말 항공 프로모션 연장 안내\n기존 7% 청구할인을 2027년 1월 15일까지 연장합니다.\n최소 결제 금액 30만원, 할인 한도 5만원은 동일합니다.",
      out: { rate: [7, "7% 청구할인"], min: [300000, "최소 결제 금액 30만원"], cap: [50000, "할인 한도 5만원"], scope: ["국제선", "(기존 조건 유지)"], from: ["2026-11-01", "(기존 조건 유지)"], to: ["2027-01-15", "2027년 1월 15일까지"] }, conf: 89 },
  ];
  function buildAi() {
    const host = el("div");
    let cur = "N1";
    const done = {};
    const chips = el("div", { className: "chips" });
    function draw() {
      chips.replaceChildren(...notices.map((n) => { const b = btn(`${n.card} 공지`, "", () => { cur = n.id; draw(); }); b.setAttribute("aria-pressed", String(n.id === cur)); return b; }));
      const n = notices.find((x) => x.id === cur);
      const exist = promos.find((p) => p.card === n.card);
      const rows = Object.entries({ rate: "할인율", min: "최소 결제", cap: "최대 할인", scope: "대상", from: "시작일", to: "종료일", extra: "제외 조건" }).filter(([k]) => n.out[k]).map(([k, label]) => {
        const [val, src] = n.out[k];
        const before = exist ? exist[k] : undefined;
        const changed = exist && before !== undefined && String(before) !== String(val);
        const shown = typeof val === "number" ? (k === "rate" ? `${val}%` : `${won(val)}원`) : val;
        return [label, shown, el("span", { className: "small muted", textContent: `"${src}"` }), exist ? (changed ? el("span", { className: "diff", textContent: `변경 (기존 ${typeof before === "number" ? (k === "rate" ? before + "%" : won(before) + "원") : before})` }) : "동일") : badge("신규", "info")];
      });
      host.replaceChildren(el("div", {}, [
        el("div", {}, [el("p", { className: "label", textContent: "카드사 공지 원문" }), Kit.json(n.text)]),
        el("div", { style: "margin-top:14px" }, [
          el("p", { className: "label", textContent: `AI 추출 결과 · 신뢰도 ${n.conf}%` }),
          table(["항목", "값", "근거 문구", "기존 대비"], rows),
          el("div", { className: "row", style: "margin-top:10px" }, [
            done[n.id] ? badge(done[n.id], "ok") : null,
            btn(exist ? "기존 조건 수정으로 반영" : "신규 할인으로 등록", "solid", () => { done[n.id] = "반영 대기 (담당자 확인)"; draw(); }),
          ]),
        ]),
      ]));
    }
    draw();
    return [block(1, "카드사 공지 선택", [chips]), block(2, "할인 조건 추출과 기존 조건 비교", [host])];
  }

  render({
    id: "fr-card",
    plan: {
      name: "카드 청구할인",
      changes: [
        ["할인 안내", "이벤트 배너로만 안내, 적용 여부는 고객이 판단", "결제 화면에서 카드사별 적용 여부와 실 부담액을 계산해 표시"],
        ["조건 관리", "개발 배포로 조건 변경", "관리자에서 할인율·최소 금액·한도·기간·대상 관리"],
        ["노출 범위", "국제선 결제 화면", "국내선 예약카드까지 같은 조건으로 노출 (v1.1)"],
      ],
      tabs: [
        { label: "결제 화면", build: buildPay, spec: [
          ["테스트 입력", "금액·구분·결제일을 바꿔 카드사별 적용 여부가 어떻게 달라지는지 확인합니다."],
          ["적용 이유 표시", "미적용이면 이유(기간·대상·최소 금액 부족액)를 함께 보여 줘 문의를 줄입니다. 청구 시 차감된다는 안내를 고정합니다."],
        ] },
        { label: "관리자 할인 조건", build: buildAdmin, spec: [
          ["할인 조건", "카드사별 조건을 표로 관리하고 사용 여부를 바로 바꿀 수 있습니다."],
          ["개정 이력", "운영 중 수정사항을 기획서 버전으로 관리했습니다(v1.0 → v1.2)."],
        ] },
      ],
    },
    ai: {
      name: "카드사 공지 → 할인 조건 추출",
      result: "카드사가 보내는 프로모션 공지문에서 할인율·최소 금액·한도·기간을 AI가 뽑아 기존 조건과 비교하고, 담당자 확인 후 관리자에 반영하는 화면입니다.",
      story: [
        ["출발점", "할인 조건은 관리자에서 바꿀 수 있게 됐지만, 공지문을 읽고 숫자를 옮기는 일은 사람이 했고 입력 실수가 생겼습니다."],
        ["AI 적용", "공지문에서 조건을 추출하고 근거 문구를 함께 보여 줍니다. 기존 조건과 다른 값은 빨간색으로 표시합니다."],
        ["측정 지표", "조건 입력 시간, 입력 오류 건수"],
      ],
      bridge: [
        ["할인 조건 항목 정의(할인율·최소·한도·대상·기간)", "AI가 추출할 필드 목록"],
        ["관리자 할인 조건 표", "기존 값과 비교해 변경점을 표시하는 기준"],
        ["기획서 개정 이력", "반영 시 변경 사유를 이력으로 남김"],
      ],
      tabs: [
        { label: "공지 반영", build: buildAi, spec: [
          ["공지 선택", "신규 카드사 공지와 기존 할인 연장 공지를 비교해 볼 수 있습니다."],
          ["추출과 비교", "값마다 근거 문구를 보여 주고, 기존 조건과 달라진 값은 빨간색으로 표시합니다. 반영은 담당자 확인을 거칩니다."],
        ] },
      ],
    },
  });
})();
