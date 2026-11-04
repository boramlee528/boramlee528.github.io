// 무료취소 가능기간 표기 샘플 (항공사·규칙은 모두 가상)
(function () {
  const { el, btn, block, select, input, field, table, badge, pad, render } = Kit;

  // 무료취소 기준: 예약 후 N시간 이내 + 출발 N일 전까지 둘 다 만족해야 무료취소
  const rules = [
    { code: "A1", name: "A1 항공", hours: 24, beforeDays: 7, use: true },
    { code: "B2", name: "B2 항공", hours: 48, beforeDays: 3, use: true },
    { code: "C3", name: "C3 항공", hours: 0, beforeDays: 0, use: true },
    { code: "D4", name: "D4 항공", hours: 24, beforeDays: 1, use: false },
  ];
  const fmt = (d) => `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  const ruleText = (r) => (r.hours === 0 ? "무료취소 없음" : `예약 후 ${r.hours}시간 이내 · 출발 ${r.beforeDays}일 전까지`);

  function judge(r, booked, depart) {
    if (!r.use) return { tone: "", head: "무료취소 정보 없음", body: "사용하지 않는 규칙입니다. 표기하지 않고 항공사 규정 보기만 노출합니다." };
    if (r.hours === 0) return { tone: "stop", head: "무료취소 불가", body: "이 항공사는 예약 직후에도 취소 수수료가 있습니다." };
    const byHours = new Date(booked.getTime() + r.hours * 3600e3);
    const byDepart = new Date(depart.getTime() - r.beforeDays * 86400e3);
    byDepart.setHours(23, 59, 0, 0);
    if (r.beforeDays) byDepart.setDate(byDepart.getDate());
    const until = byHours < byDepart ? byHours : byDepart;
    if (until <= booked) return { tone: "stop", head: "무료취소 불가", body: `출발 ${r.beforeDays}일 이내 예약이라 무료취소 기간이 없습니다.` };
    const left = until - booked;
    const d = Math.floor(left / 86400e3), h = Math.floor((left % 86400e3) / 3600e3);
    return { tone: "ok", head: `${fmt(until)}까지 무료취소`, body: `예약 시점 기준 ${d ? d + "일 " : ""}${h}시간 남음 · 기준: ${ruleText(r)}`, until };
  }

  /* ---------- 기존 기획: 고객 화면 ---------- */
  function buildCustomer() {
    const air = select(rules.map((r) => [r.code, r.name]), "A1", "항공사");
    const booked = input("2026-11-04T10:00", "예약 일시", "datetime-local");
    const depart = input("2026-11-20", "출발일", "date");
    const out = el("div", { className: "device-body" });
    function refresh() {
      const r = rules.find((x) => x.code === air.value);
      const b = new Date(booked.value), d = new Date(depart.value + "T09:00");
      if (isNaN(b) || isNaN(d)) return out.replaceChildren(el("p", { className: "muted", textContent: "날짜를 입력해 주세요." }));
      if (d <= b) return out.replaceChildren(el("p", { className: "diff", textContent: "출발일은 예약 일시보다 뒤여야 합니다." }));
      const j = judge(r, b, d);
      out.replaceChildren(
        el("div", { className: "flight" }, [
          el("div", { className: "top" }, [el("span", { textContent: `${r.code} 101 · ICN → NRT` }), el("span", { textContent: "312,400원" })]),
          el("span", { className: "muted small", textContent: `${depart.value} 09:00 출발 · 성인 1명` }),
          el("div", {}, [badge(j.head, j.tone)]),
          el("span", { className: "small", textContent: j.body }),
        ]),
        el("p", { className: "small muted", textContent: "결제 전 확인 화면과 예약 완료 화면, 마이페이지 예약 상세에 같은 문구를 노출합니다." })
      );
    }
    [air, booked, depart].forEach((c) => c.addEventListener("input", refresh));
    refresh();
    return [
      block(1, "조건 입력 (테스트용)", [el("div", { className: "form-grid" }, [field("항공사", air), field("예약 일시", booked, "span-2"), field("출발일", depart)])]),
      block(2, "검색 결과·결제 전 화면", [el("div", { className: "device" }, [el("div", { className: "device-bar", textContent: "항공권 예약 · 결제 전 확인" }), out])]),
    ];
  }

  /* ---------- 기존 기획: 관리자 등록 ---------- */
  function buildAdmin() {
    const host = el("div");
    const code = input("", "항공사 코드"); code.maxLength = 2;
    const hours = input("24", "예약 후 시간", "number");
    const days = input("1", "출발 전 일수", "number");
    const status = el("p", { className: "status-line" });
    function render() {
      host.replaceChildren(table(["항공사", "무료취소 기준", "사용", ""], rules.map((r) => {
        const toggle = btn(r.use ? "Y" : "N", "line-btn", () => { r.use = !r.use; status.textContent = `${r.code} 사용 여부를 ${r.use ? "Y" : "N"}로 바꿨습니다.`; render(); });
        return [r.name, ruleText(r), toggle, btn("삭제", "text-btn danger", async () => {
          if (await Kit.confirm(`${r.code} 규칙을 삭제할까요? 삭제하면 고객 화면에 무료취소 기간이 표기되지 않습니다.`)) {
            rules.splice(rules.indexOf(r), 1); render();
          }
        })];
      })));
    }
    async function add() {
      const c = code.value.trim().toUpperCase();
      if (!/^[A-Z0-9]{2}$/.test(c)) return Kit.alert("항공사 코드는 영문·숫자 2자리로 입력해 주세요.");
      if (rules.some((r) => r.code === c)) return Kit.alert(`${c}는 이미 등록된 항공사입니다. 목록에서 수정해 주세요.`);
      const h = Number(hours.value), d = Number(days.value);
      if (!(h >= 0 && h <= 72) || !(d >= 0 && d <= 30)) return Kit.alert("예약 후 시간은 0~72, 출발 전 일수는 0~30 사이로 입력해 주세요.");
      rules.push({ code: c, name: `${c} 항공`, hours: h, beforeDays: d, use: true });
      code.value = ""; status.textContent = `${c} 규칙을 등록했습니다. 고객 화면 탭에서 바로 확인할 수 있습니다.`;
      render();
    }
    render();
    return [
      block(1, "항공사별 무료취소 기간 등록", [
        el("div", { className: "form-box" }, [
          el("div", { className: "form-grid" }, [field("항공사 코드", code), field("예약 후 (시간)", hours), field("출발 전 (일)", days), el("div", { className: "row end" }, [btn("등록", "solid", add)])]),
          el("p", { className: "note", textContent: "예약 후 시간이 0이면 '무료취소 없음'으로 표기합니다." }),
        ]),
      ]),
      block(2, "등록된 규칙", [host, status]),
    ];
  }

  /* ---------- AI: 규정 요약 검수 ---------- */
  const fareRules = [
    { code: "A1", raw: "CANCELLATIONS\nBEFORE DEPARTURE\n  CHARGE KRW 0 FOR CANCEL WITHIN 24 HOURS AFTER RESERVATION.\n  TICKET IS NON-REFUNDABLE WITHIN 7 DAYS BEFORE DEPARTURE.\n  OTHERWISE CHARGE KRW 100000 FOR CANCEL.",
      ai: ["예약 후 24시간 안에 취소하면 수수료가 없습니다.", "출발 7일 전부터는 환불되지 않습니다.", "그 밖에는 취소 수수료 100,000원이 있습니다."], hours: 24, beforeDays: 7, conf: 94 },
    { code: "B2", raw: "CANCELLATIONS\n  ANY TIME CHARGE KRW 50000 FOR CANCEL/REFUND.\n  WAIVED IF CANCELLED WITHIN 48 HOURS OF BOOKING AND\n  NOT LATER THAN 2 DAYS BEFORE DEPARTURE.",
      ai: ["예약 후 48시간 안, 출발 2일 전까지 취소하면 수수료가 없습니다.", "그 밖에는 취소 수수료 50,000원이 있습니다."], hours: 48, beforeDays: 2, conf: 91 },
    { code: "C3", raw: "CANCELLATIONS\n  TICKET IS NON-REFUNDABLE.\n  TAXES AND FEES REFUNDABLE ON REQUEST.",
      ai: ["항공권은 환불되지 않습니다.", "세금과 공항 이용료는 요청하면 환불됩니다."], hours: 0, beforeDays: 0, conf: 97 },
    { code: "D4", raw: "CANCELLATIONS\n  PERMITTED. CHARGE KRW 30000.\n  NO-SHOW CHARGE KRW 80000.\n  FREE CANCEL WITHIN 1 DAY - SEE PROMO NOTE.",
      ai: ["취소 수수료는 30,000원입니다.", "탑승하지 않으면(노쇼) 80,000원이 부과됩니다.", "예약 후 1일 안에는 무료 취소 가능 (프로모션 조건 확인 필요)"], hours: 24, beforeDays: null, conf: 58 },
  ];
  function buildAiReview() {
    const state = {};
    const listHost = el("div");
    const detail = el("div");
    let cur = "A1";
    function verdict(f) {
      const db = rules.find((r) => r.code === f.code) || { hours: 24, beforeDays: 1 };
      if (f.conf < 70) return ["판단 보류", "warn", "원문에 조건이 덜 적혀 있어 사람이 먼저 확인합니다."];
      if (f.hours === db.hours && f.beforeDays === db.beforeDays) return ["DB 규칙과 일치", "ok", "등록된 무료취소 기준과 요약이 같습니다."];
      return ["DB 규칙과 다름", "stop", `요약: ${f.hours}시간·${f.beforeDays}일 / 등록: ${db.hours}시간·${db.beforeDays}일`];
    }
    function renderList() {
      listHost.replaceChildren(table(["항공사", "요약 신뢰도", "DB 대조", "검수"], fareRules.map((f) => {
        const [v, tone] = verdict(f);
        const pick = btn(f.code, "text-btn", () => { cur = f.code; renderList(); renderDetail(); });
        return { cells: [pick, `${f.conf}%`, badge(v, tone), state[f.code] ? badge(state[f.code], state[f.code] === "승인" ? "ok" : "info") : "대기"], className: f.code === cur ? "on" : "" };
      })));
    }
    function renderDetail() {
      const f = fareRules.find((x) => x.code === cur);
      const [v, tone, why] = verdict(f);
      const edit = el("textarea", { value: f.ai.join("\n"), ariaLabel: "고객용 요약 문장" });
      edit.style.minHeight = "96px";
      detail.replaceChildren(el("div", { className: "two" }, [
        el("div", {}, [el("p", { className: "label", textContent: "운임 규정 원문" }), Kit.json(f.raw)]),
        el("div", {}, [
          el("p", { className: "label", textContent: "AI 고객용 요약 (수정 가능)" }), edit,
          el("p", { className: "small", style: "margin-top:6px" }, [badge(v, tone), " ", why]),
          el("div", { className: "row", style: "margin-top:10px" }, [
            btn("승인 후 노출", "solid", () => { state[f.code] = "승인"; f.ai = edit.value.split("\n").filter(Boolean); renderList(); }),
            btn("수정 요청", "line-btn", () => { state[f.code] = "수정 요청"; renderList(); }),
          ]),
        ]),
      ]));
    }
    renderList(); renderDetail();
    return [block(1, "요약 대기 목록", [listHost]), block(2, "원문과 요약 비교", [detail])];
  }

  render({
    id: "fr-cancel",
    plan: {
      name: "무료취소 가능기간 표기",
      changes: [
        ["안내 시점", "예약 후 고객센터 문의로 확인", "검색 결과·결제 전·예약 완료 화면에 바로 표기"],
        ["기준 데이터", "상담원이 항공사 규정을 건별로 확인", "항공사별 무료취소 기간을 관리자에서 등록"],
        ["표기 방식", "항공사마다 다른 원문 규정", "'○월 ○일 ○시까지 무료취소' 표준 문구와 남은 시간"],
      ],
      tabs: [
        { label: "고객 화면", build: buildCustomer, spec: [
          ["테스트 입력", "항공사·예약 일시·출발일을 바꿔 표기가 어떻게 달라지는지 확인합니다."],
          ["표준 문구", "예약 후 N시간과 출발 N일 전 중 빠른 시점을 무료취소 마감으로 계산해 날짜·시간으로 보여 줍니다. 기간이 없으면 '무료취소 불가'를 표시합니다."],
        ] },
        { label: "관리자: 기간 등록", build: buildAdmin, spec: [
          ["입력 규칙", "항공사 코드 2자리, 예약 후 0~72시간, 출발 전 0~30일. 중복 항공사는 등록하지 않고 안내합니다."],
          ["사용 여부", "N이면 고객 화면에 무료취소 기간을 표기하지 않습니다. 삭제는 확인 팝업을 거칩니다."],
        ] },
      ],
    },
    ai: {
      name: "항공 규정 요약·표시",
      result: "영문 운임 규정 원문을 고객이 읽기 쉬운 문장으로 요약하고, 관리자에 등록된 무료취소 기준과 자동으로 대조하는 검수 화면입니다.",
      story: [
        ["출발점", "무료취소 기간은 DB로 표기했지만, 나머지 취소·환불 규정은 영문 원문 그대로 노출되어 문의가 이어졌습니다."],
        ["AI 적용", "원문을 고객용 문장으로 요약하고, 요약에서 뽑은 무료취소 조건을 DB 규칙과 대조합니다."],
        ["측정 지표", "요약 오류율, 검수 시간, 규정 관련 문의 건수"],
      ],
      bridge: [
        ["항공사별 무료취소 기간 DB", "요약 결과를 검증하는 정답 데이터로 사용"],
        ["표준 문구 규칙", "AI 요약 문장의 형식(시점·금액·조건)을 맞추는 기준"],
        ["관리자 사용 여부 설정", "승인된 요약만 고객 화면에 노출"],
      ],
      tabs: [
        { label: "규정 요약 검수", build: buildAiReview, spec: [
          ["대기 목록", "요약 신뢰도와 DB 대조 결과를 함께 보여 줍니다. 신뢰도 70% 미만은 '판단 보류'로 사람이 먼저 봅니다."],
          ["승인 후 노출", "담당자가 문장을 고쳐 승인해야 고객 화면에 나갑니다. DB와 다르면 빨간 표시로 검수를 유도합니다."],
        ] },
      ],
    },
  });
})();
