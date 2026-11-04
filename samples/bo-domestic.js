// 예약관리자 신규 구축 (국내) 샘플 (예약·고객·금액은 모두 가상)
(function () {
  const { el, btn, block, select, input, field, table, badge, won, render } = Kit;

  const card = {
    no: "D2611-2207", st: "결제 완료", route: "김포 → 제주", date: "2026.12.19 (토) 08:10", flight: "A1 1203",
    pax: [{ name: "홍길동", type: "성인", birth: "1988.03.02" }, { name: "홍하늘", type: "소아", birth: "2017.06.15" }],
    fare: 168000, discount: 11760, card: "가나카드 7% 청구할인", hist: [["11/03 21:14", "예약 생성 · 결제 완료", "고객"]],
  };
  const errors = [
    { id: 1, at: "11/04 08:02", no: "D2611-2190", type: "좌석 확정 실패", detail: "항공사 응답 지연으로 좌석 확정(HK) 안 됨", dep: "11/06", st: "미처리" },
    { id: 2, at: "11/04 08:40", no: "D2611-2194", type: "결제-예약 불일치", detail: "결제 승인됐으나 예약 상태 '대기'", dep: "11/05", st: "미처리" },
    { id: 3, at: "11/04 09:15", no: "D2611-2198", type: "탑승객 정보 오류", detail: "소아 생년월일이 성인 기준", dep: "12/02", st: "미처리" },
    { id: 4, at: "11/03 22:31", no: "D2611-2186", type: "좌석 확정 실패", detail: "항공사 응답 지연", dep: "11/20", st: "처리 완료" },
    { id: 5, at: "11/03 19:02", no: "D2611-2177", type: "청구할인 미반영", detail: "할인 대상 카드인데 할인 금액 0원", dep: "12/14", st: "미처리" },
  ];
  const now = () => { const d = new Date(); return `${d.getMonth() + 1}/${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`; };

  /* ---------- 기존 기획: 예약카드 ---------- */
  function buildCard() {
    const host = el("div");
    const form = el("div");
    function draw() {
      host.replaceChildren(el("div", { className: "box" }, [
        el("div", { className: "row" }, [el("b", { textContent: `${card.no} · ${card.route}` }), badge(card.st, "warn"), el("span", { className: "muted small", style: "margin-left:auto", textContent: `${card.flight} · ${card.date}` })]),
        el("div", { style: "margin-top:10px" }, [table(["탑승객", "구분", "생년월일", ""], card.pax.map((p, i) => [p.name, p.type, p.birth, btn("수정", "text-btn", () => edit(i))]))]),
        el("div", { className: "two", style: "margin-top:12px" }, [
          el("dl", { className: "kv" }, [el("dt", { textContent: "항공 운임" }), el("dd", { textContent: `${won(card.fare)}원` }), el("dt", { textContent: "청구할인" }), el("dd", { textContent: `-${won(card.discount)}원 (${card.card})` }), el("dt", { textContent: "실 부담" }), el("dd", {}, [el("b", { textContent: `${won(card.fare - card.discount)}원` })])]),
          el("div", {}, [el("p", { className: "label", textContent: "변경 히스토리" }), el("ul", { className: "timeline" }, card.hist.map(([t, m, w]) => el("li", {}, [el("time", { textContent: `${t} · ${w}` }), el("span", { textContent: m })])))]),
        ]),
      ]));
    }
    function edit(i) {
      const p = card.pax[i];
      const name = input(p.name, "이름");
      const birth = input(p.birth, "생년월일");
      const reason = input("", "수정 사유");
      form.replaceChildren(el("div", { className: "form-box" }, [
        el("div", { className: "form-grid" }, [field("이름", name), field("생년월일 (YYYY.MM.DD)", birth), field("수정 사유 (필수)", reason, "span-2")]),
        el("div", { className: "form-foot" }, [btn("닫기", "line-btn", () => form.replaceChildren()), btn("저장", "solid", () => {
          if (!/^\d{4}\.\d{2}\.\d{2}$/.test(birth.value)) return Kit.alert("생년월일은 YYYY.MM.DD 형식으로 입력해 주세요.");
          if (reason.value.trim().length < 4) return Kit.alert("수정 사유를 4자 이상 입력해 주세요.");
          const age = 2026 - Number(birth.value.slice(0, 4));
          if (p.type === "소아" && (age < 2 || age >= 12)) return Kit.alert("소아는 만 2세 이상 12세 미만이어야 합니다. 구분이 바뀌면 운임이 달라져 재예약이 필요합니다.");
          card.hist.unshift([now(), `탑승객 ${i + 1} 수정: ${p.name}/${p.birth} → ${name.value}/${birth.value} (사유: ${reason.value})`, "담당자"]);
          p.name = name.value; p.birth = birth.value; form.replaceChildren(); draw();
        })]),
      ]));
    }
    draw();
    return [block(1, "예약카드", [host]), block(2, "탑승객 정보 수정", [form, el("p", { className: "note", textContent: "수정 버튼을 누르면 이 자리에 입력 폼이 열립니다. 사유 없이 저장할 수 없고, 모든 수정은 히스토리에 남습니다." })])];
  }

  /* ---------- 기존 기획: 예약오류 리스트 ---------- */
  function buildErrors() {
    const type = select(["전체", ...new Set(errors.map((e) => e.type))], "전체", "오류 유형");
    const st = select(["미처리", "처리 완료", "전체"], "미처리", "처리 상태");
    const host = el("div");
    function draw() {
      const rows = errors.filter((e) => (type.value === "전체" || e.type === type.value) && (st.value === "전체" || e.st === st.value));
      host.replaceChildren(
        el("p", { className: "small muted", textContent: `미처리 ${errors.filter((e) => e.st === "미처리").length}건 · 출발일이 가까운 순으로 처리해 주세요.` }),
        rows.length ? table(["발생", "예약번호", "오류 유형", "내용", "출발", "상태", ""], rows.map((e) => [e.at, e.no, e.type, e.detail, e.dep,
          badge(e.st, e.st === "미처리" ? "stop" : "ok"),
          e.st === "미처리" ? btn("처리 완료", "text-btn", () => { e.st = "처리 완료"; draw(); }) : ""])) : el("p", { className: "no-result", textContent: "해당하는 오류가 없습니다." })
      );
    }
    type.addEventListener("change", draw); st.addEventListener("change", draw);
    draw();
    return [block(1, "예약오류 리스트", [el("div", { className: "form-grid" }, [field("오류 유형", type, "span-2"), field("처리 상태", st)]), el("div", { style: "margin-top:10px" }, [host])])];
  }

  /* ---------- AI: 오류 우선순위 추천 ---------- */
  function score(e) {
    const days = { "11/05": 1, "11/06": 2, "11/20": 16, "12/02": 28, "12/14": 40 }[e.dep] || 30;
    const why = [];
    let s = 0;
    if (days <= 2) { s += 50; why.push(`출발 ${days}일 전`); } else if (days <= 7) { s += 25; why.push(`출발 ${days}일 전`); }
    if (e.type === "결제-예약 불일치") { s += 35; why.push("결제됐는데 예약 미확정 (고객 피해 큼)"); }
    if (e.type === "좌석 확정 실패") { s += 25; why.push("좌석 소진 위험"); }
    if (e.type === "탑승객 정보 오류") { s += 15; why.push("공항에서 탑승 거절 위험"); }
    if (e.type === "청구할인 미반영") { s += 5; why.push("결제 후 정산으로 보정 가능"); }
    return { s: Math.min(s, 99), why };
  }
  function buildAi() {
    const host = el("div");
    const fb = {};
    function draw() {
      const rows = errors.filter((e) => e.st === "미처리").map((e) => ({ e, ...score(e) })).sort((a, b) => b.s - a.s);
      host.replaceChildren(table(["#순위", "예약번호", "오류 유형", "#위험 점수", "AI 판단 근거", "맞나요?"], rows.map((r, i) => [String(i + 1), r.e.no, r.e.type,
        el("span", { className: r.s >= 70 ? "diff" : "", textContent: String(r.s) }), r.why.join(" · "),
        fb[r.e.id] ? badge(fb[r.e.id], "info") : el("span", { className: "row" }, [btn("맞음", "text-btn", () => { fb[r.e.id] = "맞음"; draw(); }), btn("순서 다름", "text-btn", () => { fb[r.e.id] = "순서 다름"; draw(); })])])),
        el("p", { className: "note", textContent: "점수 70 이상은 빨간색으로 표시하고 담당자 메신저로 바로 알립니다. '순서 다름' 피드백은 점수 기준을 고치는 데 씁니다." }));
    }
    draw();
    return [block(1, "오늘 처리 순서 추천", [host])];
  }

  render({
    id: "bo-domestic",
    plan: {
      name: "예약관리자 신규 구축 (국내)",
      changes: [
        ["관리자", "국제선 관리자를 국내선에도 같이 사용", "국내선 전용 예약카드와 메뉴 신규 구축"],
        ["예약 오류", "고객 문의가 오면 그때 발견", "예약오류 리스트로 오류를 먼저 모아 처리"],
        ["정보 수정", "수정 이력 없이 덮어쓰기", "사유 필수 입력과 변경 히스토리 기록, 청구할인 금액 표시"],
      ],
      tabs: [
        { label: "예약카드", build: buildCard, spec: [
          ["예약카드", "예약 한 건의 여정·탑승객·결제·청구할인을 한 장에 모았습니다. 할인 전후 금액을 함께 보여 줍니다."],
          ["정보 수정", "수정 사유를 필수로 받고, 소아 나이 기준처럼 운임에 영향을 주는 값은 저장 전에 검사합니다."],
        ] },
        { label: "예약오류 리스트", build: buildErrors, spec: [
          ["오류 모아 보기", "좌석 확정 실패, 결제-예약 불일치 등 오류를 유형·상태로 걸러 봅니다. 처리하면 '처리 완료'로 바뀝니다."],
        ] },
      ],
    },
    ai: {
      name: "예약 오류 처리 순서 추천",
      result: "예약오류 리스트의 미처리 건을 AI가 출발 임박도와 고객 피해 크기로 점수화해 오늘 처리할 순서를 추천하는 기획입니다.",
      story: [
        ["출발점", "오류 리스트로 오류는 모였지만, 어떤 건부터 처리할지는 담당자 경험에 달려 있었습니다."],
        ["AI 적용", "출발일·오류 유형·결제 상태로 위험 점수를 매기고, 근거를 함께 보여 줍니다."],
        ["측정 지표", "출발 전 미처리 건수, 고위험 건 평균 처리 시간"],
      ],
      bridge: [
        ["예약오류 유형 정의", "점수 계산의 기준 항목"],
        ["예약카드의 출발일·결제 상태", "위험도 판단 입력값"],
        ["처리 완료 상태", "추천 정확도 확인과 피드백 데이터"],
      ],
      tabs: [
        { label: "처리 순서", build: buildAi, spec: [
          ["순서 추천", "미처리 오류만 점수순으로 정렬하고, 점수를 매긴 이유를 문장으로 보여 줍니다. 담당자는 순서가 맞는지 피드백을 남깁니다."],
        ] },
      ],
    },
  });
})();
