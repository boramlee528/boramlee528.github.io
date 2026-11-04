// 예약관리자 신규 구축 (해외) 샘플 (예약·고객·금액은 모두 가상)
(function () {
  const { el, btn, block, select, field, table, badge, won, render } = Kit;

  const ST = {
    hold: ["예약 완료", "info"], paid: ["결제 완료", "warn"], ticketed: ["발권 완료", "ok"],
    refundReq: ["환불 접수", "stop"], refunded: ["환불 완료", ""],
  };
  const NEXT = { hold: [["결제 확인", "paid"]], paid: [["발권 처리", "ticketed"]], ticketed: [["환불 접수", "refundReq"]], refundReq: [["환불 완료", "refunded"]], refunded: [] };
  const TPL = {
    paid: "[결제 완료] #{이름}님, #{여정} 항공권 결제가 완료되었습니다. 발권까지 최대 1영업일 걸립니다.",
    ticketed: "[발권 완료] #{이름}님, #{여정} 항공권이 발권되었습니다. 전자항공권 번호: #{티켓}",
    refundReq: "[환불 접수] #{이름}님, #{여정} 환불 요청이 접수되었습니다. 항공사 규정에 따라 수수료가 차감될 수 있습니다.",
    refunded: "[환불 완료] #{이름}님, #{여정} 환불이 완료되었습니다. 환불 금액: #{금액}원",
  };
  const resv = [
    { no: "W2611-1021", name: "김*연", trip: "ICN-BKK 12/18 · BKK-ICN 12/22", pax: 2, amt: 742000, st: "paid", ota: "하늘길투어" },
    { no: "W2611-1018", name: "박*호", trip: "ICN-CDG 01/09 · CDG-ICN 01/20", pax: 1, amt: 1386000, st: "ticketed", ota: "온에어트립" },
    { no: "W2611-1007", name: "이*수", trip: "ICN-NRT 11/28 · NRT-ICN 12/01", pax: 3, amt: 961500, st: "hold", ota: "트래블메이트" },
    { no: "W2611-0995", name: "최*아", trip: "ICN-SGN 12/03 · SGN-ICN 12/08", pax: 2, amt: 688000, st: "refundReq", ota: "하늘길투어" },
    { no: "W2611-0981", name: "정*민", trip: "ICN-DAD 11/22 · DAD-ICN 11/26", pax: 4, amt: 1204000, st: "refunded", ota: "여행공방" },
  ];
  resv.forEach((r, i) => { r.log = [["11/0" + (1 + i) + " 10:1" + i, "예약 생성", "시스템"]]; if (r.st !== "hold") r.log.unshift(["11/0" + (2 + i) + " 14:0" + i, `상태 변경 → ${ST[r.st][0]}`, "담당자"]); });
  const now = () => { const d = new Date(); return `${d.getMonth() + 1}/${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`; };
  const fill = (tpl, r) => tpl.replace("#{이름}", r.name).replace("#{여정}", r.trip.split(" · ")[0]).replace("#{티켓}", "180-2345678901").replace("#{금액}", won(r.amt * 0.9));

  /* ---------- 기존 기획: 예약 목록 + 상세 ---------- */
  function buildList() {
    const filter = select([["all", "전체 상태"], ...Object.entries(ST).map(([k, [t]]) => [k, t])], "all", "상태");
    const q = el("input", { type: "text", placeholder: "예약번호·이름", ariaLabel: "검색어" });
    const listHost = el("div");
    const detail = el("div");
    let cur = resv[0].no;
    function drawList() {
      const rows = resv.filter((r) => (filter.value === "all" || r.st === filter.value) && (!q.value || r.no.includes(q.value) || r.name.includes(q.value)));
      listHost.replaceChildren(rows.length ? table(["예약번호", "OTA", "고객", "여정", "#금액(원)", "상태"], rows.map((r) => {
        const pick = btn(r.no, "text-btn", () => { cur = r.no; drawList(); drawDetail(); });
        return { cells: [pick, r.ota, r.name, r.trip, won(r.amt), badge(...ST[r.st])], className: r.no === cur ? "on" : "" };
      })) : el("p", { className: "no-result", textContent: "조건에 맞는 예약이 없습니다." }));
    }
    function drawDetail() {
      const r = resv.find((x) => x.no === cur);
      detail.replaceChildren(el("div", { className: "two" }, [
        el("div", {}, [
          el("dl", { className: "kv" }, [["예약번호", r.no], ["고객", `${r.name} 외 ${r.pax - 1}명`], ["여정", r.trip], ["결제 금액", `${won(r.amt)}원`], ["현재 상태", ""]].flatMap(([a, b]) => [el("dt", { textContent: a }), el("dd", {}, [a === "현재 상태" ? badge(...ST[r.st]) : b])])),
          el("div", { className: "row", style: "margin-top:12px" }, NEXT[r.st].length ? NEXT[r.st].map(([label, to]) => btn(label, "solid", async () => {
            if (!(await Kit.confirm(`${r.no}를 '${ST[to][0]}' 상태로 바꿀까요? 고객에게 알림톡이 발송됩니다.`))) return;
            r.st = to; r.log.unshift([now(), `상태 변경 → ${ST[to][0]}`, "담당자"], [now(), `알림톡 발송: ${fill(TPL[to], r).slice(0, 28)}…`, "시스템"]);
            drawList(); drawDetail();
          })) : [el("span", { className: "muted small", textContent: "처리가 끝난 예약입니다." })]),
        ]),
        el("div", {}, [el("p", { className: "label", textContent: "상태 히스토리" }), el("ul", { className: "timeline" }, r.log.map(([t, m, who]) => el("li", {}, [el("time", { textContent: `${t} · ${who}` }), el("span", { textContent: m })])))]),
      ]));
    }
    filter.addEventListener("change", drawList);
    q.addEventListener("input", drawList);
    drawList(); drawDetail();
    return [
      block(1, "예약 검색", [el("div", { className: "form-grid" }, [field("상태", filter, "span-2"), field("검색어", q, "span-2")]), el("div", { style: "margin-top:10px" }, [listHost])]),
      block(2, "예약 상세 · 처리", [detail]),
    ];
  }

  /* ---------- 기존 기획: 알림톡 템플릿 ---------- */
  function buildTpl() {
    const pick = select(Object.keys(TPL).map((k) => [k, ST[k][0]]), "ticketed", "템플릿");
    const area = el("textarea", { ariaLabel: "템플릿 문구" });
    area.style.minHeight = "90px";
    const preview = el("div", { className: "box wash small" });
    function load() { area.value = TPL[pick.value]; draw(); }
    function draw() {
      const unknown = (area.value.match(/#\{[^}]+\}/g) || []).filter((v) => !["#{이름}", "#{여정}", "#{티켓}", "#{금액}"].includes(v));
      preview.replaceChildren(unknown.length ? el("span", { className: "diff", textContent: `알 수 없는 변수: ${unknown.join(", ")}` }) : fill(area.value, resv[1]));
    }
    pick.addEventListener("change", load);
    area.addEventListener("input", draw);
    load();
    return [block(1, "상태별 알림톡 템플릿", [el("div", { className: "form-grid" }, [field("발송 시점", pick, "span-2")]), el("div", { style: "margin-top:10px" }, [area]),
      el("p", { className: "note", textContent: "변수: #{이름} #{여정} #{티켓} #{금액}. 상태가 바뀌면 해당 템플릿이 자동 발송됩니다." })]),
      block(2, "미리보기 (박*호 고객 기준)", [preview])];
  }

  /* ---------- AI: 예약 메모 요약·다음 조치 ---------- */
  const memos = [
    { no: "W2611-0995", lines: ["11/02 고객 전화: 일정 변경 가능한지 문의 → 변경 불가 운임 안내", "11/03 고객 카톡: 그럼 환불하겠다, 수수료 얼마인지", "11/03 담당자: 항공사 규정 확인 중(취소 수수료 1인 50,000원 예상)", "11/04 고객 전화: 환불 금액 확정되면 알려 달라, 카드 취소로 원함", "11/04 시스템: 환불 접수 상태 변경"],
      sum: ["변경 불가 운임이라 고객이 환불을 선택함", "취소 수수료 1인 50,000원 예상, 2인 기준 100,000원", "카드 승인 취소로 환불 원함, 금액 확정 연락 대기"], next: ["항공사 환불 수수료 확정", "고객에게 확정 금액 알림톡 발송", "카드 승인 취소 요청"], conf: 92 },
    { no: "W2611-1021", lines: ["11/04 결제 완료", "11/04 고객 메모: 아이 생일 축하 기내식 가능?", "11/04 담당자: 항공사에 특별 기내식 요청 가능 여부 확인 예정"],
      sum: ["결제 완료, 발권 대기", "특별 기내식(생일) 요청 문의, 항공사 확인 전"], next: ["발권 처리", "항공사에 특별 기내식 가능 여부 문의 후 고객 회신"], conf: 88 },
  ];
  function buildAi() {
    const chips = el("div", { className: "chips" });
    const host = el("div");
    let cur = memos[0].no;
    const done = {};
    function draw() {
      chips.replaceChildren(...memos.map((m) => { const b = btn(m.no, "", () => { cur = m.no; draw(); }); b.setAttribute("aria-pressed", String(m.no === cur)); return b; }));
      const m = memos.find((x) => x.no === cur);
      host.replaceChildren(el("div", { className: "two" }, [
        el("div", {}, [el("p", { className: "label", textContent: `상담 메모·이력 ${m.lines.length}건 (원문)` }), el("ul", { className: "list-plain small" }, m.lines.map((l) => el("li", { textContent: l })))]),
        el("div", {}, [
          el("p", { className: "label", textContent: `AI 요약 · 신뢰도 ${m.conf}%` }), el("ul", { className: "list-plain" }, m.sum.map((s) => el("li", { textContent: s }))),
          el("p", { className: "label", style: "margin-top:12px", textContent: "다음 조치 추천 (담당자가 골라 실행)" }),
          el("ul", { className: "list-plain" }, m.next.map((n, i) => el("li", { className: "row" }, [el("span", { textContent: `${i + 1}. ${n}` }), done[m.no + i] ? badge("할 일 등록", "ok") : btn("할 일로 등록", "text-btn", () => { done[m.no + i] = true; draw(); })]))),
        ]),
      ]));
    }
    draw();
    return [block(1, "예약 선택", [chips]), block(2, "메모 요약과 다음 조치", [host])];
  }

  render({
    id: "bo-intl",
    plan: {
      name: "예약관리자 신규 구축 (해외)",
      changes: [
        ["처리 화면", "예약·발권·환불을 화면마다 따로 처리", "예약 상세 한 화면에서 상태별 다음 처리 버튼 제공"],
        ["상태 관리", "담당자가 메모로 진행 상황 기록", "상태값 정의와 상태 변경 히스토리 자동 기록"],
        ["고객 안내", "상태 변경 후 담당자가 개별 문자 발송", "상태별 알림톡 템플릿 자동 발송"],
      ],
      tabs: [
        { label: "예약 목록·상세", build: buildList, spec: [
          ["예약 검색", "상태와 예약번호·이름으로 찾습니다. 상태는 색 배지로 구분합니다."],
          ["상태별 처리", "현재 상태에서 가능한 다음 처리만 버튼으로 보여 줍니다. 처리하면 히스토리와 알림톡 발송 기록이 함께 남습니다."],
        ] },
        { label: "알림톡 템플릿", build: buildTpl, spec: [
          ["템플릿 관리", "상태별 문구를 관리하고, 정해진 변수만 쓸 수 있게 검사합니다."],
          ["미리보기", "실제 예약 데이터를 넣은 문구를 바로 확인합니다. 모르는 변수가 있으면 빨간색으로 알립니다."],
        ] },
      ],
    },
    ai: {
      name: "예약 메모 요약·다음 조치 추천",
      result: "예약마다 쌓인 상담 메모와 상태 이력을 AI가 3줄로 요약하고 다음에 할 일을 추천해, 담당자가 바뀌어도 바로 이어서 처리할 수 있게 하는 기획입니다.",
      story: [
        ["출발점", "상태 히스토리는 남지만, 고객 요청 사항은 메모에 흩어져 있어 담당자가 처음부터 다시 읽어야 했습니다."],
        ["AI 적용", "메모와 히스토리를 요약하고 다음 조치를 추천합니다. 실행은 담당자가 골라 할 일로 등록합니다."],
        ["측정 지표", "예약당 파악 시간, 인수인계 누락 건수"],
      ],
      bridge: [
        ["상태값 정의·상태 히스토리", "요약의 뼈대(현재 상태와 다음 상태)로 사용"],
        ["상태별 다음 처리 버튼", "추천 조치의 후보 목록"],
        ["알림톡 템플릿", "'고객에게 안내' 조치를 바로 실행하는 연결 고리"],
      ],
      tabs: [
        { label: "메모 요약", build: buildAi, spec: [
          ["예약 선택", "메모가 많은 예약을 골라 요약을 확인합니다."],
          ["요약과 추천", "원문 메모를 왼쪽에 그대로 두어 요약을 검증할 수 있게 합니다. 추천 조치는 자동 실행하지 않고 할 일로 등록만 합니다."],
        ] },
      ],
    },
  });
})();
