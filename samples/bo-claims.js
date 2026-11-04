// OTA 접수 시스템 유지보수·기능개선 샘플 (접수·금액은 모두 가상)
(function () {
  const { el, btn, block, select, field, table, badge, won, render } = Kit;

  const claims = [
    { id: "C-4012", at: "11/04 09:20", ota: "하늘길투어", type: "금액 불일치", no: "O2610-8812", text: "고객 결제 금액과 정산 금액이 12,000원 다릅니다.", st: "접수" },
    { id: "C-4011", at: "11/04 08:51", ota: "온에어트립", type: "발권 요청", no: "O2611-0153", text: "결제 완료 건 발권 부탁드립니다.", st: "처리 중" },
    { id: "C-4009", at: "11/03 17:33", ota: "여행공방", type: "금액 불일치", no: "O2610-8790", text: "항공사 청구 금액이 판매가보다 큽니다. 유류할증료 확인 요청.", st: "접수" },
    { id: "C-4004", at: "11/03 14:02", ota: "하늘길투어", type: "환불 요청", no: "O2610-8701", text: "고객 사정으로 환불 요청합니다.", st: "완료" },
    { id: "C-3998", at: "11/03 10:45", ota: "트래블메이트", type: "금액 불일치", no: "O2610-8655", text: "TASF가 두 번 청구된 것 같습니다.", st: "접수" },
  ];
  // 판매가(OTA 판매) / 결제가(고객 결제) / 정산가(항공사 청구) 구성
  const amounts = {
    "O2610-8812": { fare: [420000, 420000, 420000], tax: [86400, 86400, 98400], tasf: [20000, 20000, 20000], cause: "유류할증료 인상분(발권일 기준) 반영 누락" },
    "O2610-8790": { fare: [610000, 610000, 610000], tax: [132000, 132000, 151500], tasf: [30000, 30000, 30000], cause: "유류할증료 인상분(발권일 기준) 반영 누락" },
    "O2610-8655": { fare: [288000, 288000, 288000], tax: [61200, 61200, 61200], tasf: [10000, 20000, 10000], cause: "TASF 중복 결제" },
  };
  const CAUSES = ["유류할증료 인상분(발권일 기준) 반영 누락", "TASF 중복 결제", "환율 적용 시점 차이", "할인 금액 정산 누락", "기타"];

  /* ---------- 기존 기획: 접수 목록 ---------- */
  function buildList() {
    const type = select(["전체", "금액 불일치", "발권 요청", "환불 요청"], "전체", "유형");
    const host = el("div");
    function draw() {
      const rows = claims.filter((c) => type.value === "전체" || c.type === type.value);
      host.replaceChildren(
        Kit.kpis([["오늘 접수", claims.filter((c) => c.at.startsWith("11/04")).length, "건"], ["미처리", claims.filter((c) => c.st !== "완료").length, "건"], ["금액 불일치", claims.filter((c) => c.type === "금액 불일치").length, "건", "가장 많은 유형"], ["평균 처리", "1.6", "일"]]),
        el("div", { style: "margin-top:12px" }, [table(["접수", "OTA", "유형", "예약번호", "내용", "상태", ""], rows.map((c) => [c.at, c.ota, c.type, c.no, c.text,
          badge(c.st, c.st === "완료" ? "ok" : c.st === "처리 중" ? "info" : "warn"),
          c.st === "완료" ? "" : btn(c.st === "접수" ? "처리 시작" : "완료", "text-btn", () => { c.st = c.st === "접수" ? "처리 중" : "완료"; draw(); })]))])
      );
    }
    type.addEventListener("change", draw);
    draw();
    return [block(1, "OTA 접수 목록", [el("div", { className: "form-grid" }, [field("유형", type, "span-2")]), el("div", { style: "margin-top:10px" }, [host])])];
  }

  /* ---------- 기존 기획: 금액 불일치 점검 ---------- */
  function buildCompare() {
    const pick = select(Object.keys(amounts), "O2610-8812", "예약번호");
    const host = el("div");
    const decided = {};
    function draw() {
      const a = amounts[pick.value];
      const rows = [["항공 운임", a.fare], ["세금·유류할증료", a.tax], ["발권 수수료(TASF)", a.tasf]];
      const sum = [0, 1, 2].map((i) => rows.reduce((s, [, v]) => s + v[i], 0));
      const cause = select(CAUSES, decided[pick.value] || a.cause, "불일치 원인");
      host.replaceChildren(
        table(["항목", "#OTA 판매가", "#고객 결제가", "#항공사 정산가", "판정"], [...rows, ["합계", sum]].map(([label, v]) => {
          const same = v[0] === v[1] && v[1] === v[2];
          return [label, won(v[0]), el("span", { className: v[1] !== v[0] ? "diff" : "", textContent: won(v[1]) }), el("span", { className: v[2] !== v[0] ? "diff" : "", textContent: won(v[2]) }), same ? badge("일치", "ok") : badge(`차이 ${won(Math.max(...v) - Math.min(...v))}`, "stop")];
        })),
        el("div", { className: "form-grid", style: "margin-top:12px" }, [field("불일치 원인 (유형화)", cause, "span-2"), el("div", { className: "row", style: "align-self:end" }, [btn("원인 저장", "solid", () => { decided[pick.value] = cause.value; Kit.alert(`'${cause.value}'로 저장했습니다. 같은 원인이 반복되면 기능 개선 후보로 올립니다.`); })])])
      );
    }
    pick.addEventListener("change", draw);
    draw();
    return [block(1, "판매가·결제가·정산가 대조", [el("div", { className: "form-grid" }, [field("예약번호", pick, "span-2")]), el("div", { style: "margin-top:10px" }, [host])]),
      block(2, "유형화 결과로 만든 개선", [el("ul", { className: "list-plain" }, [
        el("li", { textContent: "유류할증료 반영 누락 → 발권 직전 세금 재조회 후 차액 안내 단계 추가" },),
        el("li", { textContent: "TASF 중복 결제 → 같은 예약의 TASF 결제 버튼 비활성화와 중복 결제 자동 취소" }),
      ])])];
  }

  /* ---------- AI: 접수 문의 분류·답변 초안 ---------- */
  const inbox = [
    { id: 1, text: "O2610-8812 건 정산 금액이 고객 결제랑 12,000원 차이 나요. 확인 부탁드려요.", type: "금액 불일치", conf: 95, why: ["금액 차이 언급", "예약번호 포함", "정산 키워드"],
      draft: "확인 결과 O2610-8812 건은 발권일 기준 유류할증료가 12,000원 인상되어 항공사 정산가에 반영되었습니다. 고객 결제 시점에는 인상 전 금액이었습니다. 차액은 당사가 부담하며 정산서에서 조정하겠습니다." },
    { id: 2, text: "결제 완료한 건인데 아직 발권이 안 됐습니다. 오늘 출발이라 급해요!!", type: "발권 요청", conf: 91, why: ["발권 키워드", "긴급(오늘 출발)"], urgent: true,
      draft: "긴급 건으로 접수했습니다. 발권 담당자가 30분 안에 처리하고 전자항공권 번호를 회신드리겠습니다." },
    { id: 3, text: "TASF가 두 번 빠져나갔다고 고객이 항의합니다.", type: "금액 불일치", conf: 89, why: ["중복 결제 언급", "TASF"],
      draft: "확인 결과 TASF 10,000원이 두 번 결제되었습니다. 중복 결제분은 오늘 카드 승인 취소 처리하며, 영업일 기준 3~5일 안에 반영됩니다." },
    { id: 4, text: "다음 달 단체 견적 가능할까요? 30명 정도입니다.", type: "판단 보류", conf: 48, why: ["학습된 유형과 맞지 않음"], draft: "" },
  ];
  function buildAi() {
    const listHost = el("div");
    const detail = el("div");
    let cur = 1;
    const done = {};
    function drawList() {
      listHost.replaceChildren(table(["문의", "AI 분류", "#신뢰도", "처리"], inbox.map((q) => ({
        cells: [btn(q.text.slice(0, 24) + "…", "text-btn", () => { cur = q.id; drawList(); drawDetail(); }), el("span", {}, [q.conf >= 70 ? q.type : badge("판단 보류", "warn"), q.urgent ? " " : null, q.urgent ? badge("긴급", "stop") : null]), `${q.conf}%`, done[q.id] ? badge(done[q.id], "ok") : "대기"],
        className: q.id === cur ? "on" : "",
      }))));
    }
    function drawDetail() {
      const q = inbox.find((x) => x.id === cur);
      const ta = el("textarea", { value: q.draft, ariaLabel: "답변 초안" });
      ta.style.minHeight = "100px";
      const type = select(["금액 불일치", "발권 요청", "환불 요청", "기타"], q.conf >= 70 ? q.type : "기타", "유형 수정");
      detail.replaceChildren(el("div", { className: "two" }, [
        el("div", {}, [el("p", { className: "label", textContent: "접수 원문" }), el("div", { className: "box wash", textContent: q.text }),
          el("p", { className: "label", style: "margin-top:10px", textContent: "분류 근거" }), el("div", { className: "chips" }, q.why.map((w) => badge(w, "info"))),
          el("div", { className: "form-grid", style: "margin-top:10px" }, [field("유형 (틀리면 수정)", type, "span-4")])]),
        el("div", {}, [el("p", { className: "label", textContent: "답변 초안" }), ta, el("div", { className: "row", style: "margin-top:8px" }, [
          btn("승인 후 회신", "solid", () => { if (!ta.value.trim()) return Kit.alert("답변을 입력해 주세요."); done[q.id] = type.value !== q.type && q.conf >= 70 ? "회신 (유형 수정)" : "회신"; drawList(); }),
          btn("담당 부서로 이관", "line-btn", () => { done[q.id] = "이관"; drawList(); }),
        ])]),
      ]));
    }
    drawList(); drawDetail();
    return [block(1, "접수함", [listHost]), block(2, "분류 근거와 답변 초안", [detail])];
  }

  render({
    id: "bo-claims",
    plan: {
      name: "OTA 접수 시스템 유지보수·기능개선",
      changes: [
        ["접수 확인", "메일·전화로 들어온 접수를 담당자가 엑셀에 정리", "접수 시스템에서 유형·상태로 관리"],
        ["금액 불일치", "판매·결제·정산 금액을 각각 다른 화면에서 확인", "세 금액을 항목별로 한 표에서 대조"],
        ["원인 관리", "건별 처리 후 종료", "원인을 유형화해 반복 원인을 기능 개선으로 연결"],
      ],
      tabs: [
        { label: "접수 목록", build: buildList, spec: [
          ["접수 관리", "유형으로 걸러 보고, 접수 → 처리 중 → 완료로 상태를 바꿉니다. 위에 오늘 접수와 미처리 건수를 고정합니다."],
        ] },
        { label: "금액 불일치 점검", build: buildCompare, spec: [
          ["세 금액 대조", "OTA 판매가·고객 결제가·항공사 정산가를 항목별로 비교하고 다른 칸을 빨간색으로 표시합니다."],
          ["유형화와 개선", "원인을 정해진 목록에서 골라 저장합니다. 반복되는 원인은 기능 개선으로 이어졌습니다."],
        ] },
      ],
    },
    ai: {
      name: "접수 문의 분류·답변 초안",
      result: "OTA 접수 문의를 AI가 유형별로 분류하고 긴급 건을 표시하며, 원인과 조치를 담은 답변 초안을 제안하는 화면입니다. 회신은 담당자가 승인합니다.",
      story: [
        ["출발점", "접수 유형화로 반복 원인은 줄였지만, 매일 들어오는 접수를 읽고 분류하는 일은 사람이 했습니다."],
        ["AI 적용", "문의를 유형별로 나누고 근거 키워드를 보여 주며, 금액 대조 결과를 넣은 답변 초안을 씁니다."],
        ["측정 지표", "분류 정확도, 접수당 처리 시간, 긴급 건 대응 시간"],
      ],
      bridge: [
        ["접수 유형 정의", "AI 분류 라벨과 학습 데이터"],
        ["금액 불일치 원인 유형화", "답변 초안에 들어가는 원인 설명"],
        ["세 금액 대조 화면", "초안의 근거 데이터"],
      ],
      tabs: [
        { label: "접수 분류", build: buildAi, spec: [
          ["접수함", "AI 분류와 신뢰도, 긴급 여부를 보여 줍니다. 신뢰도 70% 미만은 판단 보류로 둡니다."],
          ["근거와 초안", "분류 근거를 키워드로 보여 주고, 틀린 유형은 담당자가 고칩니다. 고친 기록은 다시 학습 데이터로 씁니다."],
        ] },
      ],
    },
  });
})();
