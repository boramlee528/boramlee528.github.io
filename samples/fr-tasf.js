// 마이페이지 TASF(발권 수수료) 카드결제 샘플 (예약·금액은 모두 가상)
(function () {
  const { el, btn, block, select, field, table, badge, won, render } = Kit;

  const FAIL = {
    "51": ["한도 초과", "카드 한도가 부족합니다. 다른 카드로 결제해 주세요."],
    "05": ["승인 거절", "카드사에서 승인을 거절했습니다. 카드사에 문의하거나 다른 카드를 이용해 주세요."],
    "14": ["카드 번호 오류", "카드 번호를 다시 확인해 주세요."],
    "TO": ["응답 지연", "결제 응답이 늦어 승인되지 않았습니다. 잠시 후 다시 시도해 주세요. 중복 결제는 되지 않습니다."],
  };
  const resv = [
    { no: "R2611-0412", route: "ICN → BKK", date: "2026.12.18", pax: 2, tasf: 20000, st: "unpaid", log: [] },
    { no: "R2611-0398", route: "ICN → CDG", date: "2027.01.09", pax: 1, tasf: 30000, st: "paid", log: [["11/02 14:20", "카드결제 완료 · 신한 ****1234"]] },
  ];
  const adminRows = [
    { at: "11/04 09:12", no: "R2611-0355", card: "현대", amt: 20000, st: "승인" },
    { at: "11/04 09:40", no: "R2611-0361", card: "국민", amt: 30000, st: "실패(51)" },
    { at: "11/03 18:05", no: "R2611-0322", card: "삼성", amt: 10000, st: "승인" },
    { at: "11/03 16:47", no: "R2611-0310", card: "BC", amt: 20000, st: "취소" },
  ];
  const ST = { unpaid: ["결제 대기", "warn"], paid: ["결제 완료", "ok"], fail: ["결제 실패", "stop"], cancel: ["결제 취소", ""] };
  const now = () => { const d = new Date(); return `${d.getMonth() + 1}/${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`; };

  /* ---------- 기존 기획: 고객 결제 ---------- */
  function buildPay() {
    const host = el("div", { className: "device-body" });
    let open = null;
    const card = Kit.select(["신한", "국민", "현대", "삼성", "BC"], "신한", "카드사");
    const result = Kit.select([["00", "승인 (정상)"], ["51", "실패: 한도 초과"], ["05", "실패: 승인 거절"], ["TO", "실패: 응답 지연"]], "00", "테스트 결과");
    function draw() {
      host.replaceChildren(...resv.map((r) => {
        const [label, tone] = ST[r.st];
        const body = [
          el("div", { className: "top" }, [el("span", { textContent: `${r.route} · ${r.date}` }), badge(label, tone)]),
          el("span", { className: "small muted", textContent: `예약번호 ${r.no} · 탑승객 ${r.pax}명` }),
          el("div", { className: "row" }, [el("span", { textContent: "발권 수수료(TASF)" }), el("b", { textContent: `${won(r.tasf)}원`, style: "margin-left:auto" })]),
        ];
        if (r.st === "unpaid" || r.st === "fail") {
          if (open === r.no) {
            body.push(el("div", { className: "box wash" }, [
              el("div", { className: "form-grid" }, [field("카드사", card, "span-2"), field("테스트 결과", result, "span-2")]),
              el("p", { className: "note", textContent: "실제 결제창 대신 결과를 골라 흐름을 확인합니다." }),
              el("div", { className: "row end", style: "margin-top:8px" }, [btn("닫기", "text-btn", () => { open = null; draw(); }), btn(`${won(r.tasf)}원 결제`, "solid", () => pay(r))]),
            ]));
          } else body.push(btn(r.st === "fail" ? "다시 결제하기" : "카드로 결제하기", "solid", () => { open = r.no; draw(); }));
        }
        if (r.failMsg) body.push(el("p", { className: "small diff", textContent: r.failMsg }));
        if (r.log.length) body.push(el("ul", { className: "list-plain small muted" }, r.log.map(([t, m]) => el("li", { textContent: `${t} ${m}` }))));
        return el("div", { className: "flight" }, body);
      }));
    }
    function pay(r) {
      const code = result.value;
      if (code === "00") {
        r.st = "paid"; r.failMsg = ""; r.log.unshift([now(), `카드결제 완료 · ${card.value}`]);
        adminRows.unshift({ at: now(), no: r.no, card: card.value, amt: r.tasf, st: "승인" });
      } else {
        r.st = "fail"; r.failMsg = FAIL[code][1]; r.log.unshift([now(), `결제 실패(${code}) · ${FAIL[code][0]}`]);
        adminRows.unshift({ at: now(), no: r.no, card: card.value, amt: r.tasf, st: `실패(${code})` });
      }
      open = null; draw();
    }
    draw();
    return [block(1, "마이페이지 예약 상세", [el("div", { className: "device" }, [el("div", { className: "device-bar", textContent: "마이페이지 · 해외항공 예약" }), host])]),
      block(2, "결제 실패 안내 문구", [table(["코드", "원인", "고객 안내"], Object.entries(FAIL).map(([c, [a, b]]) => [c, a, b]))])];
  }

  /* ---------- 기존 기획: 관리자 결제 내역 ---------- */
  function buildAdmin() {
    const host = el("div");
    const status = el("p", { className: "status-line" });
    function draw() {
      const ok = adminRows.filter((r) => r.st === "승인");
      host.replaceChildren(
        Kit.kpis([["오늘 결제", ok.length, "건", `${won(ok.reduce((a, r) => a + r.amt, 0))}원`], ["실패", adminRows.filter((r) => r.st.startsWith("실패")).length, "건", "사유별 안내 발송"], ["취소", adminRows.filter((r) => r.st === "취소").length, "건", "발권 전 취소"], ["수기 처리", 0, "건", "카드결제 도입 후"]]),
        el("div", { style: "margin-top:12px" }, [table(["시각", "예약번호", "카드", "#금액(원)", "상태", ""], adminRows.map((r) => [r.at, r.no, r.card, won(r.amt),
          badge(r.st, r.st === "승인" ? "ok" : r.st === "취소" ? "" : "stop"),
          r.st === "승인" ? btn("결제 취소", "text-btn danger", async () => {
            if (!(await Kit.confirm(`${r.no} TASF ${won(r.amt)}원 결제를 취소할까요? 고객에게 취소 알림톡이 발송됩니다.`))) return;
            r.st = "취소"; status.textContent = `${r.no} 결제를 취소하고 알림톡을 보냈습니다.`; draw();
          }) : ""]))]),
      );
    }
    draw();
    return [block(1, "TASF 결제 내역", [host, status])];
  }

  /* ---------- AI: 결제 문의 답변 초안 ---------- */
  const inquiries = [
    { id: 1, text: "TASF 결제하려는데 계속 실패가 떠요. 카드 한도는 충분한데 왜 그런가요?", resv: "R2611-0361", fact: "11/04 09:40 실패(51) 한도 초과", type: "결제 실패", conf: 93,
      draft: "고객님, 확인 결과 11/4 09:40 결제는 카드사에서 '한도 초과(51)'로 승인되지 않았습니다. 일시불 한도와 해외 결제 한도가 따로 설정된 카드가 있어, 다른 카드로 결제하시거나 카드사에 한도를 확인해 주시기 바랍니다." },
    { id: 2, text: "수수료 영수증은 어디서 받을 수 있나요? 회사에 제출해야 해요.", resv: "R2611-0322", fact: "11/03 18:05 승인 · 삼성", type: "영수증", conf: 96,
      draft: "고객님, 마이페이지 > 예약 상세 > 발권 수수료 영역의 '영수증 보기'에서 카드 매출전표를 출력하실 수 있습니다. 법인 제출용 현금영수증이 필요하시면 회신 주세요." },
    { id: 3, text: "항공권 취소했는데 수수료도 돌려받나요?", resv: "R2611-0310", fact: "11/03 16:47 결제 취소 완료", type: "환불", conf: 88,
      draft: "고객님, 발권 전 취소 건으로 TASF 결제가 11/3에 취소 처리되었습니다. 카드사에 따라 영업일 기준 3~5일 안에 승인 취소가 반영됩니다." },
    { id: 4, text: "결제가 두 번 된 것 같아요", resv: "-", fact: "예약번호 확인 불가", type: "판단 보류", conf: 54,
      draft: "" },
  ];
  function buildAi() {
    const listHost = el("div");
    const detail = el("div");
    let cur = 1;
    const done = {};
    function drawList() {
      listHost.replaceChildren(table(["문의", "AI 분류", "#신뢰도", "처리"], inquiries.map((q) => ({
        cells: [btn(q.text.slice(0, 22) + "…", "text-btn", () => { cur = q.id; drawList(); drawDetail(); }), q.conf >= 70 ? q.type : badge("판단 보류", "warn"), `${q.conf}%`, done[q.id] ? badge(done[q.id], "ok") : "대기"],
        className: q.id === cur ? "on" : "",
      }))));
    }
    function drawDetail() {
      const q = inquiries.find((x) => x.id === cur);
      const ta = el("textarea", { value: q.draft, ariaLabel: "답변 초안" });
      ta.style.minHeight = "110px";
      detail.replaceChildren(el("div", { className: "two" }, [
        el("div", {}, [el("p", { className: "label", textContent: "고객 문의" }), el("div", { className: "box wash", textContent: q.text }),
          el("p", { className: "label", style: "margin-top:12px", textContent: "AI가 조회한 결제 이력 (판단 근거)" }), el("dl", { className: "kv" }, [el("dt", { textContent: "예약번호" }), el("dd", { textContent: q.resv }), el("dt", { textContent: "결제 이력" }), el("dd", { textContent: q.fact })])]),
        el("div", {}, [el("p", { className: "label", textContent: q.conf >= 70 ? "답변 초안 (수정 후 발송)" : "판단 보류: 예약번호를 먼저 확인해 주세요" }), ta,
          el("div", { className: "row", style: "margin-top:8px" }, [
            btn("수정 후 발송", "solid", () => { if (!ta.value.trim()) return Kit.alert("답변을 입력해 주세요."); done[q.id] = "발송"; drawList(); }),
            btn("담당자에게 넘기기", "line-btn", () => { done[q.id] = "이관"; drawList(); }),
          ])]),
      ]));
    }
    drawList(); drawDetail();
    return [block(1, "결제 문의 목록", [listHost]), block(2, "결제 이력 기반 답변 초안", [detail])];
  }

  render({
    id: "fr-tasf",
    plan: {
      name: "마이페이지 TASF 카드결제",
      changes: [
        ["결제 방법", "계좌이체 후 담당자가 입금 확인(수기)", "마이페이지에서 고객이 카드로 바로 결제"],
        ["실패 처리", "고객이 상담원에게 문의", "카드사 응답 코드별 안내 문구를 즉시 표시"],
        ["관리", "엑셀로 입금 대조", "관리자 결제 내역에서 승인·실패·취소 확인과 취소 처리"],
      ],
      tabs: [
        { label: "고객 결제", build: buildPay, spec: [
          ["마이페이지 결제", "결제 대기 예약에만 결제 버튼이 보입니다. 테스트 결과를 골라 성공·실패 흐름을 확인할 수 있습니다."],
          ["실패 안내", "카드사 응답 코드별로 원인과 다음 행동을 안내합니다. 응답 지연은 중복 결제가 없다는 점을 함께 알립니다."],
        ] },
        { label: "관리자 결제 내역", build: buildAdmin, spec: [
          ["결제 내역", "승인·실패·취소 건수와 금액을 상단에 요약하고, 승인 건만 취소할 수 있습니다. 취소 시 고객 알림톡을 발송합니다."],
        ] },
      ],
    },
    ai: {
      name: "결제 문의 답변 초안",
      result: "TASF 결제 관련 문의를 AI가 유형별로 나누고, 실제 결제 이력을 조회해 답변 초안을 만드는 상담 화면입니다. 발송은 담당자가 확인 후 합니다.",
      story: [
        ["출발점", "카드결제 도입으로 수기 처리는 줄었지만, 결제 실패·영수증·환불 문의는 상담원이 이력을 찾아 답했습니다."],
        ["AI 적용", "문의 유형을 분류하고 예약번호로 결제 이력을 조회해, 근거가 담긴 답변 초안을 씁니다."],
        ["측정 지표", "문의당 처리 시간, 초안 수정률, 재문의율"],
      ],
      bridge: [
        ["카드사 응답 코드별 안내 문구", "결제 실패 문의의 답변 근거"],
        ["관리자 결제 내역", "AI가 조회하는 사실 데이터(승인·실패·취소 시각)"],
        ["결제 상태값 정의", "문의 유형 분류 기준"],
      ],
      tabs: [
        { label: "결제 문의 처리", build: buildAi, spec: [
          ["문의 목록", "AI 분류와 신뢰도를 함께 보여 줍니다. 예약번호가 없거나 신뢰도 70% 미만이면 판단 보류로 둡니다."],
          ["근거 있는 초안", "조회한 결제 이력을 왼쪽에 보여 주고, 담당자가 고친 뒤 발송합니다. 자동 발송은 하지 않습니다."],
        ] },
      ],
    },
  });
})();
