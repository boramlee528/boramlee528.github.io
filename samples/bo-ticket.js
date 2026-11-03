// 자동발권 설정 페이지 고도화 기획서(v2.5)를 재구성한 샘플입니다.
// 항공사 코드와 규칙은 모두 가상이며, 저장되지 않고 새로고침하면 처음으로 돌아갑니다.
(function () {
  const project = window.PORTFOLIO.projects.find((p) => p.id === "bo-ticket");
  const byId = (id) => document.getElementById(id);

  function el(tag, props, children) {
    const node = Object.assign(document.createElement(tag), props);
    if (children) node.append(...children);
    return node;
  }

  const CLASSES = ["F", "C", "P", "Y"];
  const DAYS = ["월", "화", "수", "목", "금", "토", "일"];
  const KINDS = ["관리자", "로봇", "고객"];
  const PTCS = ["ADT", "CHD", "INF"];
  const YN_KEYS = KINDS.flatMap((kind) => PTCS.map((ptc) => `${kind}-${ptc}`));
  const PLACE_RULE = { 지역: /^[A-Za-z0-9]{2}$/, 국가: /^[A-Za-z]{2}$/, 공항: /^[A-Za-z]{3}$/ };
  const ANYWHERE = { mode: "ONLY", type: "무관", values: [] };
  const REGIONS = { E1: "유럽", J1: "일본", C1: "중국", D1: "동남아", U1: "미국", M1: "아프리카", N1: "대양주" };
  const AIRPORTS = {
    ICN: { label: "ICN 인천", 국가: "KR", 지역: "" },
    PUS: { label: "PUS 부산", 국가: "KR", 지역: "" },
    BKK: { label: "BKK 방콕 · 동남아", 국가: "TH", 지역: "D1" },
    NRT: { label: "NRT 도쿄 · 일본", 국가: "JP", 지역: "J1" },
    PEK: { label: "PEK 베이징 · 중국", 국가: "CN", 지역: "C1" },
    CDG: { label: "CDG 파리 · 유럽", 국가: "FR", 지역: "E1" },
    LAX: { label: "LAX 로스앤젤레스 · 미국", 국가: "US", 지역: "U1" },
    JNB: { label: "JNB 요하네스버그 · 아프리카", 국가: "ZA", 지역: "M1" },
    SYD: { label: "SYD 시드니 · 대양주", 국가: "AU", 지역: "N1" },
  };

  const nowStamp = () => stampOf(new Date());
  const pad = (n) => String(n).padStart(2, "0");
  function stampOf(d) {
    return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}${pad(d.getHours())}${pad(d.getMinutes())}`;
  }
  function displayNow() {
    const s = nowStamp();
    return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)} ${s.slice(8, 10)}:${s.slice(10)}`;
  }

  function yesAll(overrides) {
    return { ...Object.fromEntries(YN_KEYS.map((key) => [key, "Y"])), msp: "N", ntd: "N", ...overrides };
  }
  function seedHistory(item, reason) {
    return [{ type: "등록", item, reason, date: "샘플 데이터", user: "담당자" }];
  }

  const airlines = [
    { code: "A1", values: yesAll(), history: seedHistory("A1 / 전체 Y", "신규 취항 항공사 등록") },
    { code: "B2", values: yesAll({ "관리자-INF": "N", "로봇-INF": "N", "고객-INF": "N" }), history: seedHistory("B2 / INF N", "유아 발권 규정 확인 필요") },
    { code: "C3", values: yesAll(), history: seedHistory("C3 / 전체 Y", "신규 취항 항공사 등록") },
    { code: "D4", values: yesAll({ "고객-ADT": "N", "고객-CHD": "N", "고객-INF": "N" }), history: seedHistory("D4 / 고객 N", "고객발권 중단, 담당자 처리") },
  ];

  function makeRule(fields, reason) {
    const rule = {
      airlines: [], fare: "전체", trip: "전체", classes: [...CLASSES], ptc: "전체", fareCodes: [],
      stage: "전체", kinds: ["로봇", "고객"], dep: ANYWHERE, arr: ANYWHERE, holiday: false, days: [...DAYS],
      period: { sd: "", st: "", ed: "", et: "" }, ...fields,
    };
    rule.history = seedHistory(ruleSummary(rule), reason);
    return rule;
  }

  const rules = [
    makeRule({ airlines: ["A1"], fare: "로컬" }, "로컬 운임 티켓 조건 확인 필요"),
    makeRule({ airlines: ["C3"], ptc: "INF", stage: "예약" }, "유아 포함 예약 수동 확인"),
    makeRule({ airlines: ["YY"], arr: { mode: "ONLY", type: "지역", values: ["E1"] }, stage: "발권" }, "유럽 노선 발권 조건 점검"),
    makeRule({ airlines: ["A1"], holiday: true, days: [], period: { sd: "", st: "0000", ed: "", et: "2359" } }, "공휴일 발권 담당자 확인"),
  ];

  /* ---------- 팝업 ---------- */
  function modal(build, className) {
    return new Promise((resolve) => {
      const dialog = el("dialog", { className: className || "" });
      const finish = (value) => {
        if (dialog.open) dialog.close();
        dialog.remove();
        resolve(value);
      };
      dialog.append(...build(finish));
      dialog.addEventListener("cancel", (event) => {
        event.preventDefault();
        finish(null);
      });
      document.body.append(dialog);
      dialog.showModal();
    });
  }

  function button(label, className, onClick) {
    const node = el("button", { type: "button", className, textContent: label });
    node.addEventListener("click", onClick);
    return node;
  }

  async function alertBox(message, focusTarget) {
    await modal((finish) => [
      el("p", { textContent: message }),
      el("div", { className: "form-foot" }, [button("확인", "solid", () => finish(true))]),
    ]);
    if (focusTarget) focusTarget.focus();
  }

  function confirmBox(message) {
    return modal((finish) => [
      el("p", { textContent: message }),
      el("div", { className: "form-foot" }, [
        button("취소", "line-btn", () => finish(false)),
        button("확인", "solid", () => finish(true)),
      ]),
    ]);
  }

  // 등록·수정 사유를 받습니다. 닫으면 null을 돌려줍니다.
  function reasonBox(title, prompt, label) {
    return modal((finish) => {
      const area = el("textarea", { ariaLabel: title });
      return [
        el("h3", { textContent: title }),
        el("p", { className: "hint", textContent: `${prompt} (최소4자/최대100자)` }),
        area,
        el("div", { className: "form-foot" }, [
          button("닫기", "line-btn", () => finish(null)),
          button("확인", "solid", async () => {
            const text = area.value.trim();
            if (!text) return alertBox(`${label} 사유를 입력해 주세요.`, area);
            if (text.length < 4 || text.length > 100) return alertBox(`${label} 사유는 최소 4자/최대 100자까지 입력 가능합니다.`, area);
            finish(text);
          }),
        ]),
      ];
    });
  }

  function historyBox(title, history) {
    return modal(
      (finish) => [
        el("h3", { textContent: `${title} 히스토리` }),
        el("div", { className: "table-wrap" }, [
          el("table", {}, [
            el("thead", {}, [
              el("tr", {}, ["작업구분", "항목", "사유", "수정일자", "수정자"].map((text) => el("th", { scope: "col", textContent: text }))),
            ]),
            el("tbody", {}, history.map((h) =>
              el("tr", {}, [h.type, h.item, h.reason, h.date, h.user].map((text) => el("td", { textContent: text })))
            )),
          ]),
        ]),
        el("div", { className: "form-foot" }, [button("닫기", "solid", () => finish(true))]),
      ],
      "wide"
    );
  }

  /* ---------- 공통 입력 ---------- */
  function mark(n) {
    return el("span", { className: "mark", textContent: String(n), ariaLabel: `설명 ${n}` });
  }
  function screenTitle(n, text) {
    return el("h3", { className: "screen-title" }, [mark(n), text]);
  }
  function selectOf(options, value) {
    const control = el("select", {}, options.map((o) => {
      const [val, text] = Array.isArray(o) ? o : [o, o];
      return el("option", { value: val, textContent: text });
    }));
    control.value = value;
    return control;
  }
  function field(label, control, className, required) {
    return el("label", { className: `field ${className || ""}` }, [
      el("span", {}, [...(required ? [el("span", { className: "required", textContent: "*" })] : []), ...[].concat(label)]),
      control,
    ]);
  }
  function textInput(maxLength, placeholder, label) {
    const input = el("input", { type: "text", maxLength, placeholder: placeholder || "", ariaLabel: label || "" });
    input.addEventListener("keydown", (event) => {
      if (event.key === "Enter") event.preventDefault();
    });
    return input;
  }
  function checkSet(label, options, className) {
    const boxes = Object.fromEntries(options.map((o) => [o, el("input", { type: "checkbox", checked: true })]));
    const node = el("fieldset", { className: `field ${className || ""}` }, [
      el("legend", { textContent: label }),
      el("div", { className: "checkset" }, options.map((o) => el("label", {}, [boxes[o], o]))),
    ]);
    return {
      node,
      boxes,
      get: () => options.filter((o) => boxes[o].checked),
      set: (values) => options.forEach((o) => (boxes[o].checked = values.includes(o))),
      setDisabled: (off) => options.forEach((o) => (boxes[o].disabled = off)),
    };
  }
  // 발권종류: 전체는 로봇·고객과 함께 움직입니다.
  function kindSet() {
    const set = checkSet("발권종류", ["전체", "로봇", "고객"]);
    const sync = () => (set.boxes["전체"].checked = set.boxes["로봇"].checked && set.boxes["고객"].checked);
    set.boxes["전체"].addEventListener("change", () => {
      set.boxes["로봇"].checked = set.boxes["고객"].checked = set.boxes["전체"].checked;
    });
    set.boxes["로봇"].addEventListener("change", sync);
    set.boxes["고객"].addEventListener("change", sync);
    return {
      node: set.node,
      get: () => ["로봇", "고객"].filter((k) => set.boxes[k].checked),
      set: (values) => {
        ["로봇", "고객"].forEach((k) => (set.boxes[k].checked = values.includes(k)));
        sync();
      },
    };
  }

  const splitCodes = (text) => text.split(",").map((s) => s.trim().toUpperCase()).filter(Boolean);
  function codesValid(text, length) {
    if (!new RegExp(`^[A-Za-z0-9]{${length}}(,[A-Za-z0-9]{${length}})*$`).test(text)) return false;
    const codes = splitCodes(text);
    return new Set(codes).size === codes.length;
  }

  function placeText(place) {
    if (place.type === "무관") return "";
    const values = place.values.map((v) => (place.type === "지역" && REGIONS[v] ? `${v}(${REGIONS[v]})` : v));
    return `${place.mode} ${place.type} ${values.join(",")}`;
  }
  function periodText(p) {
    if (!p.sd && !p.ed && p.st) return `매일 ${p.st}–${p.et}`;
    if (!p.sd && !p.ed) return "";
    return `${p.sd}${p.st ? " " + p.st : ""} ~ ${p.ed}${p.et ? " " + p.et : ""}`;
  }
  function ruleSummary(rule) {
    const parts = [];
    if (rule.fare !== "전체") parts.push(`${rule.fare} 운임`);
    if (rule.trip !== "전체") parts.push(rule.trip);
    if (rule.classes.length < CLASSES.length) parts.push(`좌석 ${rule.classes.join(",")}`);
    if (rule.ptc !== "전체") parts.push(`${rule.ptc} 포함`);
    if (rule.fareCodes.length) parts.push(`요금 ${rule.fareCodes.join(",")}`);
    if (rule.dep.type !== "무관") parts.push(`출발 ${placeText(rule.dep)}`);
    if (rule.arr.type !== "무관") parts.push(`도착 ${placeText(rule.arr)}`);
    if (rule.holiday) parts.push("공휴일");
    else if (rule.days.length < DAYS.length) parts.push(`${rule.days.join("·")}요일`);
    const period = periodText(rule.period);
    if (period) parts.push(period);
    return parts.join(" · ") || "조건 없음(전체)";
  }

  /* ---------- 판정 ---------- */
  function validDate(text) {
    if (!/^\d{8}$/.test(text)) return false;
    const [y, m, d] = [+text.slice(0, 4), +text.slice(4, 6), +text.slice(6)];
    const date = new Date(y, m - 1, d);
    return date.getMonth() === m - 1 && date.getDate() === d;
  }
  const validTime = (text) => /^([01]\d|2[0-3])[0-5]\d$/.test(text);

  function validPeriod({ sd, st, ed, et }) {
    if ((sd && !validDate(sd)) || (ed && !validDate(ed)) || (st && !validTime(st)) || (et && !validTime(et))) return false;
    if (!sd && !ed) return Boolean(st) === Boolean(et) && (!st || et >= st); // 시간만: 시작·끝 세트
    if ((st && !sd) || (et && !ed)) return false; // 시간은 날짜와 함께
    const end = ed ? ed + (et || "2359") : "";
    if (end && end < nowStamp()) return false;
    return !(sd && end && sd + (st || "0000") > end);
  }

  function inPeriod({ sd, st, ed, et }, stamp) {
    if (!sd && !ed) {
      const time = stamp.slice(8);
      return !st || (time >= st && time <= et);
    }
    if (sd && stamp < sd + (st || "0000")) return false;
    return !(ed && stamp > ed + (et || "2359"));
  }

  function placeMatches(rule, airportCode) {
    if (rule.type === "무관") return true;
    const code = rule.type === "공항" ? airportCode : AIRPORTS[airportCode][rule.type];
    const found = rule.values.includes(code);
    return rule.mode === "ONLY" ? found : !found;
  }

  // 입력한 항목에 모두 부합하면 그 규칙으로 자동발권 불가입니다.
  function ruleMatches(rule, c) {
    const ptcs = c.pax.split("+");
    const when = new Date(c.when);
    const day = DAYS[(when.getDay() + 6) % 7];
    return (
      (rule.airlines.includes("YY") || rule.airlines.includes(c.airline)) &&
      (rule.fare === "전체" || rule.fare === c.fare) &&
      (rule.trip === "전체" || rule.trip === c.trip) &&
      rule.classes.includes(c.cabin) &&
      (rule.ptc === "전체" || ptcs.includes(rule.ptc)) &&
      (!rule.fareCodes.length || rule.fareCodes.includes(c.fareCode)) &&
      (rule.stage === "전체" || rule.stage === c.stage) &&
      rule.kinds.includes(c.kind) &&
      placeMatches(rule.dep, c.dep) &&
      placeMatches(rule.arr, c.arr) &&
      (rule.holiday ? c.holiday === "예" : rule.days.includes(day)) &&
      inPeriod(rule.period, stampOf(when))
    );
  }

  function judge(c) {
    const airline = airlines.find((a) => a.code === c.airline);
    if (!airline) return { missing: true };
    const ptcs = c.pax.split("+");
    const hasNo = YN_KEYS.some((key) => airline.values[key] === "N");
    const steps = [
      {
        name: "항공사별 설정 값 확인",
        state: "pass",
        note: hasNo ? `${c.airline}: N 값 포함` : `${c.airline}: 모두 Y`,
      },
      {
        name: "우선순위 결정",
        state: "pass",
        note: hasNo ? "N 포함 → 항공사별 설정 최우선" : "모두 Y → 자동발권 제한 설정 최우선",
      },
    ];

    let blocked = null;
    if (hasNo) {
      // 탑승객 중 한 유형이라도 N이면 예약 전체가 자동발권 불가입니다.
      const everyone = ptcs.length > 1 ? `같은 예약의 ${ptcs.join("·")} 모두 자동발권 불가입니다.` : "자동발권 불가입니다.";
      const adminNo = ptcs.find((ptc) => airline.values[`관리자-${ptc}`] === "N");
      const kindNo = YN_KEYS.find((key) => !key.startsWith("관리자") && ptcs.includes(key.split("-")[1]) && airline.values[key] === "N");
      if (adminNo) blocked = { reason: `관리자발권 ${adminNo} 설정 값이 N입니다. ${everyone}`, tab: "airlines", atBooking: true };
      // 관리자발권은 가능하므로 담당자가 수동으로 발권합니다.
      else if (kindNo) blocked = { reason: `${kindNo.replace("-", "발권 ")} 설정 값이 N입니다. ${everyone}`, tab: "airlines", manual: true };
      steps.push({
        name: "항공사별 설정 대조",
        state: blocked ? "stop" : "pass",
        note: blocked ? blocked.reason : `탑승객 ${ptcs.join("·")} 기준 발권 가능`,
      });
      steps.push({ name: "자동발권 제한 설정 대조", state: "skip", note: "우선순위에 따라 적용 안 함" });
    } else {
      const matched = rules.find((rule) => ruleMatches(rule, c));
      if (matched) {
        const reason = matched.history[matched.history.length - 1].reason;
        blocked = { reason: `제한 규칙 [${matched.airlines.join(",")}]에 부합합니다. 등록 사유: ${reason}`, tab: "rules", atBooking: c.stage === "예약" };
      }
      steps.push({ name: "항공사별 설정 대조", state: "pass", note: "모두 Y" });
      steps.push({
        name: "자동발권 제한 설정 대조",
        state: blocked ? "stop" : "pass",
        note: blocked ? blocked.reason : "부합하는 규칙 없음",
      });
    }
    return { steps, blocked, stage: c.stage, airline: c.airline };
  }

  function buildSim() {
    const conditions = {
      airline: "A1", fare: "호스트", trip: "왕복", cabin: "Y", pax: "ADT", fareCode: "ABC",
      dep: "ICN", arr: "BKK", stage: "발권", kind: "고객", when: "", holiday: "아니오",
    };
    // 평일 오전을 기본 처리 일시로 둡니다.
    const base = new Date();
    base.setDate(base.getDate() + ((8 - base.getDay()) % 7 || 7));
    conditions.when = `${stampOf(base).replace(/^(\d{4})(\d{2})(\d{2}).*/, "$1-$2-$3")}T10:00`;
    const defaults = { ...conditions };

    const airports = Object.entries(AIRPORTS).map(([code, a]) => [code, a.label]);
    const definitions = [
      ["airline", "항공사", () => airlines.map((a) => a.code)],
      ["fare", "운임구분", () => ["호스트", "로컬"]],
      ["trip", "여정", () => ["왕복", "편도"]],
      ["cabin", "좌석등급", () => CLASSES],
      ["pax", "승객 구성", () => ["ADT", "ADT+CHD", "ADT+INF", "ADT+CHD+INF"]],
      ["fareCode", "요금종류", () => ["ABC", "DEF"]],
      ["dep", "출발", () => airports],
      ["arr", "도착", () => airports],
      ["stage", "처리 시점", () => ["예약", "발권"]],
      ["kind", "발권종류", () => ["고객", "로봇"]],
    ];
    const controls = {};
    const fields = definitions.map(([key, label, options]) => {
      controls[key] = selectOf(options(), conditions[key]);
      controls[key].addEventListener("change", () => {
        conditions[key] = controls[key].value;
        refreshSim();
      });
      return field(label, controls[key]);
    });
    controls.when = el("input", { type: "datetime-local", value: conditions.when });
    controls.when.addEventListener("change", () => {
      if (controls.when.value) conditions.when = controls.when.value;
      refreshSim();
    });
    controls.holiday = selectOf(["아니오", "예"], conditions.holiday);
    controls.holiday.addEventListener("change", () => {
      conditions.holiday = controls.holiday.value;
      refreshSim();
    });

    const presets = [
      ["정상 발권", {}],
      ["로컬 운임 제한", { fare: "로컬" }],
      ["유아 포함, 예약 시점 제한", { airline: "C3", pax: "ADT+INF", stage: "예약" }],
      ["유럽행, 발권 시점 제한", { airline: "C3", arr: "CDG" }],
      ["같은 유럽행, 예약 시점", { airline: "C3", arr: "CDG", stage: "예약" }],
      ["공휴일 제한", { holiday: "예" }],
      ["유아만 N, 예약 전체 불가", { airline: "B2", pax: "ADT+CHD+INF", stage: "예약" }],
      ["고객발권 N, 담당자 수동 발권", { airline: "D4" }],
    ];
    const presetButtons = presets.map(([label, overrides]) =>
      button(label, "", () => {
        Object.assign(conditions, defaults, overrides);
        Object.keys(controls).forEach((key) => (controls[key].value = conditions[key]));
        refreshSim();
      })
    );

    const output = el("div", { ariaLive: "polite" });
    simListeners.push(() => {
      const options = airlines.map((a) => a.code);
      controls.airline.replaceChildren(...options.map((code) => el("option", { value: code, textContent: code })));
      if (!options.includes(conditions.airline)) conditions.airline = options[0] || "";
      controls.airline.value = conditions.airline;

      const result = judge(conditions);
      if (result.missing) {
        output.replaceChildren(el("p", { className: "no-result", textContent: "항공사별 설정에 등록된 항공사가 없습니다." }));
        return;
      }
      const list = result.steps.map((step, i) => {
        const row = el("li", { className: `step ${step.state}` }, [
          el("span", { className: "step-no", textContent: String(i + 1) }),
          el("div", {}, [step.name, el("small", { textContent: step.note })]),
          el("span", { className: "step-state", textContent: { pass: "통과", stop: "불가", skip: "미적용" }[step.state] }),
        ]);
        row.style.setProperty("--i", i);
        return row;
      });
      output.replaceChildren(el("ol", { className: "steps" }, list), verdictOf(result));
    });

    return [
      el("div", { className: "presets" }, presetButtons),
      el("div", { className: "sim" }, [
        el("div", {}, [
          el("h3", { className: "screen-title", textContent: "예약 조건" }),
          el("div", { className: "fields" }, [
            ...fields,
            field("처리 일시", controls.when, "span-2"),
            field("공휴일 여부", controls.holiday, "span-2"),
          ]),
        ]),
        el("div", {}, [
          screenTitle(1, "판정 순서"),
          output,
          el("p", { className: "note" }, [mark(2), " 처리 시점에 따라 결과가 달라집니다."]),
        ]),
      ]),
    ];
  }

  function verdictOf(result) {
    if (!result.blocked) {
      return el("div", { className: "verdict pass" }, [
        el("b", { textContent: "자동발권 가능" }),
        el("p", { textContent: result.stage === "예약" ? "관리자발권 가능으로 예약 카드에 유입됩니다." : "자동발권을 진행합니다." }),
      ]);
    }
    const children = result.blocked.manual
      ? [
          el("b", { textContent: "담당자 수동 발권" }),
          el("p", { textContent: result.blocked.reason }),
          el("p", { textContent: "관리자 발권으로 담당자가 수동 처리합니다." }),
        ]
      : result.blocked.atBooking
      ? [
          el("b", { textContent: "자동발권 불가로 예약 유입" }),
          el("p", { textContent: result.blocked.reason }),
          el("p", { textContent: "예약 카드에 관리자발권 불가로 유입됩니다." }),
        ]
      : [
          el("b", { textContent: "발권 시점 자동발권 중지" }),
          el("p", { textContent: result.blocked.reason }),
          el("p", { className: "message", textContent: `해당 항공사(${result.airline})의 발권 자동화 기능이 중지 되었습니다. 담당자에게 문의해 주시기 바랍니다.` }),
        ];
    children.push(button("관련 설정 보기 →", "", () => selectTab(result.blocked.tab, true)));
    return el("div", { className: "verdict stop" }, children);
  }

  /* ---------- 자동발권 제한 설정 ---------- */
  function placeField(label, markNo) {
    const mode = selectOf(["ONLY", "제외"], "ONLY");
    const type = selectOf(["무관", "지역", "국가", "공항"], "무관");
    const text = textInput(200, "", `${label} 입력값`);
    const syncText = () => {
      text.disabled = type.value === "무관";
      if (text.disabled) text.value = "";
    };
    type.addEventListener("change", syncText);
    syncText();
    return {
      node: el("fieldset", { className: "field span-2" }, [
        el("legend", {}, [mark(markNo), ` ${label}`]),
        el("div", { className: "triple" }, [mode, type, text]),
      ]),
      text,
      read: () => ({ mode: mode.value, type: type.value, values: splitCodes(text.value) }),
      write: (place) => {
        mode.value = place.mode;
        type.value = place.type;
        text.value = place.values.join(",");
        syncText();
      },
      reset: () => {
        mode.value = "ONLY";
        type.value = "무관";
        syncText();
      },
    };
  }

  function buildRules() {
    let sortDirection = "desc-date";
    let filter = () => true;
    let listOpen = true;
    let editing = null;

    /* 검색 */
    const q = {
      airline: textInput(200, "", "검색 항공사"),
      fare: selectOf(["전체", "로컬", "호스트"], "전체"),
      trip: selectOf(["전체", "편도", "왕복"], "전체"),
      classes: checkSet("좌석등급", CLASSES, "span-2"),
      ptc: selectOf(["전체", "CHD", "INF"], "전체"),
      fareCode: textInput(200, "", "검색 요금종류"),
      stage: selectOf(["전체", "예약", "발권"], "전체"),
      kinds: kindSet(),
    };
    const searchButton = button("검색", "solid", async () => {
      const airlineText = q.airline.value.trim();
      const fareText = q.fareCode.value.trim();
      if (airlineText && !codesValid(airlineText, 2)) return alertBox("항공사 입력 내용을 확인해 주세요.", q.airline);
      if (!q.classes.get().length) return alertBox("좌석등급을 체크해주세요.");
      if (fareText && !codesValid(fareText, 3)) return alertBox("요금종류 입력 내용을 확인해 주세요.", q.fareCode);
      const kinds = q.kinds.get();
      if (!kinds.length) return alertBox("발권 종류를 체크해 주세요.");
      const wanted = splitCodes(airlineText);
      const fares = splitCodes(fareText);
      filter = (rule) =>
        (!wanted.length || wanted.some((code) => rule.airlines.includes(code))) &&
        (q.fare.value === "전체" || rule.fare === q.fare.value) &&
        (q.trip.value === "전체" || rule.trip === q.trip.value) &&
        q.classes.get().some((c) => rule.classes.includes(c)) &&
        (q.ptc.value === "전체" || rule.ptc === q.ptc.value) &&
        (!fares.length || fares.some((code) => rule.fareCodes.includes(code))) &&
        (q.stage.value === "전체" || rule.stage === q.stage.value) &&
        kinds.some((k) => rule.kinds.includes(k));
      renderList();
      if (!rules.some(filter)) q.airline.focus();
    });
    const searchBox = el("div", { className: "form-box" }, [
      el("div", { className: "form-grid" }, [
        field("항공사", q.airline),
        field("운임구분", q.fare),
        field("여정", q.trip),
        field("승객타입", q.ptc),
        field("요금종류", q.fareCode),
        field("적용시점", q.stage),
        q.classes.node,
        q.kinds.node,
      ]),
      el("div", { className: "form-foot" }, [searchButton]),
    ]);

    /* 등록 */
    const f = {
      airline: textInput(200, "YY: 전체 항공사", "등록 항공사"),
      fare: selectOf(["전체", "로컬", "호스트"], "전체"),
      trip: selectOf(["전체", "편도", "왕복"], "전체"),
      classes: checkSet("좌석등급", CLASSES, "span-2"),
      ptc: selectOf(["전체", "CHD", "INF"], "전체"),
      fareCode: textInput(200, "공란: 전체", "등록 요금종류"),
      stage: selectOf(["전체", "예약", "발권"], "전체"),
      kinds: kindSet(),
      dep: placeField("출발지역", 3),
      arr: placeField("도착지역", 3),
      days: checkSet("적용요일", DAYS, "span-2"),
      holiday: el("input", { type: "checkbox" }),
      sd: textInput(8, "YYYYMMDD", "시작 날짜"),
      st: textInput(4, "HHMM", "시작 시간"),
      ed: textInput(8, "YYYYMMDD", "끝 날짜"),
      et: textInput(4, "HHMM", "끝 시간"),
    };
    // 공휴일: 적용요일 비활성화, 적용기간은 시간만 입력합니다.
    const syncHoliday = () => {
      const on = f.holiday.checked;
      f.days.setDisabled(on);
      if (on) {
        f.days.set([]);
        f.sd.value = f.ed.value = "";
      }
      f.sd.disabled = f.ed.disabled = on;
    };
    f.holiday.addEventListener("change", () => {
      syncHoliday();
      if (!f.holiday.checked) f.days.set(DAYS);
    });

    const submit = button("등록", "solid", () => submitForm());
    const cancel = button("닫기", "line-btn", () => closeForm());
    const formBox = el("div", { className: "form-box", hidden: true }, [
      el("div", { className: "form-grid" }, [
        field("항공사", f.airline, "", true),
        field("운임구분", f.fare),
        field("여정", f.trip),
        field("승객타입", f.ptc),
        f.classes.node,
        field("요금종류", f.fareCode),
        field([mark(2), " 적용시점"], f.stage),
        f.kinds.node,
        el("fieldset", { className: "field span-2" }, [
          el("legend", { textContent: "공휴일" }),
          el("div", { className: "checkset" }, [el("label", {}, [f.holiday, "적용"])]),
        ]),
        f.dep.node,
        f.arr.node,
        el("p", { className: "note span-4", textContent: `지역 코드: ${Object.entries(REGIONS).map(([code, name]) => `${code} ${name}`).join(" · ")}` }),
        f.days.node,
        el("fieldset", { className: "field span-2" }, [
          el("legend", {}, [mark(4), " 적용기간"]),
          el("div", { className: "period" }, [f.sd, f.st, el("span", { className: "tilde", textContent: "~" }), f.ed, f.et]),
        ]),
      ]),
      el("div", { className: "form-foot" }, [mark(5), cancel, submit]),
    ]);

    function resetForm() {
      f.airline.value = f.fareCode.value = f.sd.value = f.st.value = f.ed.value = f.et.value = "";
      f.fare.value = f.trip.value = f.ptc.value = f.stage.value = "전체";
      f.classes.set(CLASSES);
      f.kinds.set(["로봇", "고객"]);
      f.dep.reset();
      f.arr.reset();
      f.holiday.checked = false;
      f.days.set(DAYS);
      syncHoliday();
    }
    function closeForm() {
      formBox.hidden = true;
      editing = null;
      submit.textContent = "등록";
      resetForm();
      newButton.focus();
    }

    function readForm() {
      return {
        airlines: splitCodes(f.airline.value).sort(),
        fare: f.fare.value,
        trip: f.trip.value,
        classes: f.classes.get(),
        ptc: f.ptc.value,
        fareCodes: splitCodes(f.fareCode.value),
        stage: f.stage.value,
        kinds: f.kinds.get(),
        dep: f.dep.read(),
        arr: f.arr.read(),
        holiday: f.holiday.checked,
        days: f.days.get(),
        period: { sd: f.sd.value.trim(), st: f.st.value.trim(), ed: f.ed.value.trim(), et: f.et.value.trim() },
      };
    }

    async function validatePlace(place, name, control) {
      if (place.mode === "제외" && place.type === "무관") {
        await alertBox("지역/국가/공항을 입력해 주세요.");
        return false;
      }
      if (place.type === "무관") return true;
      if (!place.values.length) {
        await alertBox("지역/국가/공항을 입력해 주세요.", control.text);
        return false;
      }
      const unique = new Set(place.values).size === place.values.length;
      if (!unique || !place.values.every((v) => PLACE_RULE[place.type].test(v))) {
        await alertBox(`${name} 입력 내용을 확인해 주세요.`, control.text);
        return false;
      }
      return true;
    }

    async function submitForm() {
      const airlineText = f.airline.value.trim();
      const fareText = f.fareCode.value.trim();
      const data = readForm();
      if (!airlineText) return alertBox("항공사코드 입력 오류 입니다.", f.airline);
      if (!codesValid(airlineText, 2)) return alertBox("항공사 입력 내용을 확인해 주세요.", f.airline);
      if (!data.classes.length) return alertBox("좌석등급을 체크해주세요.");
      if (fareText && !codesValid(fareText, 3)) return alertBox("요금종류 입력 내용을 확인해 주세요.", f.fareCode);
      if (!data.kinds.length) return alertBox("발권종류를 체크해주세요.");
      // 로봇발권은 결제 요청 시점에 결정되어 예약 시점에는 제어할 수 없습니다.
      if (data.stage === "예약" && data.kinds.length === 1 && data.kinds[0] === "로봇") {
        return alertBox("“적용시점-예약” 선택 시 ‘발권종류-로봇’ 은 선택 불가 합니다.");
      }
      if (!(await validatePlace(data.dep, "출발지역", f.dep))) return;
      if (!(await validatePlace(data.arr, "도착지역", f.arr))) return;
      if (!data.holiday && !data.days.length) return alertBox("요일을 체크해 주세요.");
      if (!validPeriod(data.period)) return alertBox("적용기간의 입력 내용을 확인해 주세요.", f.sd.disabled ? f.st : f.sd);

      const label = editing ? "수정" : "등록";
      const title = `[${data.airlines.join(",")}] 제한 설정 ${label} 사유`;
      const reason = await reasonBox(title, `${label}하는 사유를 입력해주세요.`, label);
      if (reason === null) return;

      const entry = { type: label, item: `${data.airlines.join(",")} / ${ruleSummary(data)}`, reason, date: displayNow(), user: "담당자" };
      if (editing) {
        Object.assign(editing, data);
        editing.history.unshift(entry);
        await alertBox("수정완료 되었습니다.");
      } else {
        rules.unshift({ ...data, history: [entry] });
        await alertBox("등록 완료 되었습니다.");
      }
      closeForm();
      renderList();
      refreshSim();
    }

    function startEdit(rule) {
      editing = rule;
      f.airline.value = rule.airlines.join(",");
      f.fare.value = rule.fare;
      f.trip.value = rule.trip;
      f.classes.set(rule.classes);
      f.ptc.value = rule.ptc;
      f.fareCode.value = rule.fareCodes.join(",");
      f.stage.value = rule.stage;
      f.kinds.set(rule.kinds);
      f.dep.write(rule.dep);
      f.arr.write(rule.arr);
      f.holiday.checked = rule.holiday;
      f.days.set(rule.days);
      syncHoliday();
      f.sd.value = rule.period.sd;
      f.st.value = rule.period.st;
      f.ed.value = rule.period.ed;
      f.et.value = rule.period.et;
      submit.textContent = "수정";
      formBox.hidden = false;
      f.airline.focus();
    }

    /* 조회 */
    const listArea = el("div");
    const sortButton = button("항공사", "sort", () => {
      sortDirection = sortDirection === "asc" ? "desc" : "asc";
      renderList();
    });
    function renderList() {
      sortButton.textContent = `항공사 ${{ asc: "△", desc: "▽" }[sortDirection] || ""}`.trim();
      const shown = rules.filter(filter);
      if (sortDirection === "asc" || sortDirection === "desc") {
        const key = (rule) => rule.airlines.join(",");
        shown.sort((a, b) => key(a).localeCompare(key(b)) * (sortDirection === "asc" ? 1 : -1));
      }
      if (!shown.length) {
        listArea.replaceChildren(el("p", { className: "no-result", textContent: "검색 결과가 없습니다." }));
        return;
      }
      listArea.replaceChildren(
        el("div", { className: "table-wrap" }, [
          el("table", {}, [
            el("thead", {}, [
              el("tr", {}, [
                el("th", { scope: "col" }, [sortButton]),
                ...["조건", "적용시점", "발권종류", "관리", "히스토리"].map((text) => el("th", { scope: "col", textContent: text })),
              ]),
            ]),
            el("tbody", {}, shown.map((rule) =>
              el("tr", {}, [
                el("th", { scope: "row", textContent: rule.airlines.join(",") }),
                el("td", { textContent: ruleSummary(rule) }),
                el("td", { textContent: rule.stage }),
                el("td", { textContent: rule.kinds.length === 2 ? "전체" : rule.kinds.join("") }),
                el("td", {}, [
                  el("div", { className: "row-actions" }, [
                    button("수정", "text-btn", () => startEdit(rule)),
                    button("삭제", "text-btn danger", async () => {
                      if (!(await confirmBox("삭제 하시겠습니까?"))) return;
                      rules.splice(rules.indexOf(rule), 1);
                      await alertBox("삭제 완료 되었습니다.");
                      renderList();
                      refreshSim();
                      newButton.focus();
                    }),
                  ]),
                ]),
                el("td", {}, [button("내역", "text-btn", () => historyBox(`[${rule.airlines.join(",")}]`, rule.history))]),
              ])
            )),
          ]),
        ]),
        el("p", { className: "total", textContent: `총 : ${pad(shown.length)} 개` })
      );
    }
    renderList();

    const listButton = button("제한 설정 감추기", "line-btn", () => {
      listOpen = !listOpen;
      listArea.hidden = !listOpen;
      listButton.textContent = listOpen ? "제한 설정 감추기" : "제한 설정 펼치기";
    });
    const newButton = button("신규등록", "line-btn", () => {
      if (!formBox.hidden && !editing) return closeForm();
      editing = null;
      submit.textContent = "등록";
      resetForm();
      formBox.hidden = false;
      f.airline.focus();
    });

    return [
      el("div", { className: "screen-block" }, [
        el("div", { className: "block-head" }, [
          screenTitle(1, "자동발권 제한 설정"),
          el("div", { className: "actions" }, [newButton, listButton]),
        ]),
        formBox,
        searchBox,
        listArea,
      ]),
    ];
  }

  /* ---------- 항공사별 설정 ---------- */
  function buildAirlines() {
    let sortDirection = "";
    let filter = () => true;

    const q = {
      airline: textInput(200, "", "검색 항공사"),
      admin: selectOf(["전체", "Y", "N"], "전체"),
      robot: selectOf(["전체", "Y", "N"], "전체"),
      customer: selectOf(["전체", "Y", "N"], "전체"),
    };
    const searchBox = el("div", { className: "form-box" }, [
      el("div", { className: "form-grid" }, [
        field("항공사", q.airline),
        field("관리자발권 ADT", q.admin),
        field("로봇발권 ADT", q.robot),
        field("고객발권 ADT", q.customer),
      ]),
      el("div", { className: "form-foot" }, [
        button("검색", "solid", () => {
          const text = q.airline.value.trim();
          if (text && !codesValid(text, 2)) return alertBox("항공사 입력 내용을 확인해 주세요.", q.airline);
          const wanted = splitCodes(text);
          filter = (a) =>
            (!wanted.length || wanted.includes(a.code)) &&
            [[q.admin, "관리자"], [q.robot, "로봇"], [q.customer, "고객"]].every(
              ([control, kind]) => control.value === "전체" || a.values[`${kind}-ADT`] === control.value
            );
          renderList();
          if (!airlines.some(filter)) q.airline.focus();
        }),
      ]),
    ]);

    /* 등록 */
    const newCode = textInput(2, "", "등록 항공사");
    const newValues = Object.fromEntries(YN_KEYS.map((key) => [key, selectOf(["Y", "N"], "Y")]));
    const newNtd = selectOf(["N", "Y"], "N");
    const newMsp = selectOf(["N", "Y"], "N");
    newMsp.disabled = true;
    const addButton = button("등록", "solid", async () => {
      const code = newCode.value.trim().toUpperCase();
      if (!code) return alertBox("항공사코드 입력 오류 입니다.", newCode);
      if (!/^[A-Z0-9]{2}$/.test(code)) return alertBox("항공사 입력 내용을 확인해 주세요.", newCode);
      if (!(await confirmBox("등록하시겠습니까?"))) return;
      if (airlines.some((a) => a.code === code)) return alertBox("이미 등록된 항공사 입니다.", newCode);
      const values = yesAll({ ntd: newNtd.value });
      YN_KEYS.forEach((key) => (values[key] = newValues[key].value));
      airlines.unshift({ code, values, history: [{ type: "등록", item: valuesText(code, values), reason: "-", date: displayNow(), user: "담당자" }] });
      newCode.value = "";
      YN_KEYS.forEach((key) => (newValues[key].value = "Y"));
      newNtd.value = "N";
      formBox.hidden = true;
      renderList();
      refreshSim();
      newButton.focus();
    });
    const formBox = el("div", { className: "form-box", hidden: true }, [
      el("div", { className: "form-grid" }, [
        field("항공사", newCode, "", true),
        field("MSP 클래스결합발권", newMsp),
        field("NTD 적용여부", newNtd),
      ]),
      el("div", { className: "yn-grid", style: "margin-top:12px" }, YN_KEYS.map((key) => field(`${key.replace("-", "발권 ")}`, newValues[key]))),
      el("div", { className: "form-foot" }, [addButton]),
    ]);
    const newButton = button("신규등록", "line-btn", () => {
      formBox.hidden = !formBox.hidden;
      if (!formBox.hidden) newCode.focus();
    });

    function valuesText(code, values) {
      const no = YN_KEYS.filter((key) => values[key] === "N").map((key) => key.replace("-", " "));
      return `${code} / ${no.length ? `N: ${no.join(", ")}` : "전체 Y"}`;
    }

    /* 조회 */
    const listArea = el("div");
    const sortButton = button("항공사", "sort", () => {
      sortDirection = sortDirection === "asc" ? "desc" : "asc";
      renderList();
    });
    function renderList() {
      sortButton.textContent = `항공사 ${{ asc: "△", desc: "▽" }[sortDirection] || ""}`.trim();
      const shown = airlines.filter(filter);
      if (sortDirection) shown.sort((a, b) => a.code.localeCompare(b.code) * (sortDirection === "asc" ? 1 : -1));
      if (!shown.length) {
        listArea.replaceChildren(el("p", { className: "no-result", textContent: "검색 결과가 없습니다." }));
        return;
      }
      const head = [
        ...YN_KEYS.map((key) => key.replace("-", " ")),
        "MSP",
        "NTD",
        "관리",
        "히스토리",
      ];
      listArea.replaceChildren(
        el("div", { className: "table-wrap" }, [
          el("table", { className: "airline-table" }, [
            el("thead", {}, [
              el("tr", {}, [
                el("th", { scope: "col" }, [sortButton]),
                ...head.map((text) => el("th", { scope: "col", textContent: text })),
              ]),
            ]),
            el("tbody", {}, shown.map((airline) => {
              const controls = Object.fromEntries(
                [...YN_KEYS, "msp", "ntd"].map((key) => {
                  const control = selectOf(["Y", "N"], airline.values[key]);
                  control.ariaLabel = `${airline.code} ${key}`;
                  return [key, control];
                })
              );
              controls.msp.disabled = true; // 기능 개선 후 오픈 예정인 항목
              return el("tr", {}, [
                el("th", { scope: "row", textContent: airline.code }),
                ...[...YN_KEYS, "msp", "ntd"].map((key) => el("td", {}, [controls[key]])),
                el("td", {}, [
                  el("div", { className: "row-actions" }, [
                    button("수정", "text-btn", async () => {
                      const reason = await reasonBox(`[${airline.code}] 항공사별 설정 수정 사유`, "수정하는 사유를 입력해주세요.", "수정");
                      if (reason === null) return;
                      YN_KEYS.forEach((key) => (airline.values[key] = controls[key].value));
                      airline.values.ntd = controls.ntd.value;
                      airline.history.unshift({ type: "수정", item: valuesText(airline.code, airline.values), reason, date: displayNow(), user: "담당자" });
                      await alertBox("수정 완료 되었습니다.");
                      renderList();
                      refreshSim();
                    }),
                    button("삭제", "text-btn danger", async () => {
                      if (!(await confirmBox("삭제 하시겠습니까?"))) return;
                      airlines.splice(airlines.indexOf(airline), 1);
                      await alertBox("삭제 완료 되었습니다.");
                      renderList();
                      refreshSim();
                      newButton.focus();
                    }),
                  ]),
                ]),
                el("td", {}, [button("내역", "text-btn", () => historyBox(`[${airline.code}]`, airline.history))]),
              ]);
            })),
          ]),
        ]),
        el("p", { className: "total", textContent: `총 : ${pad(shown.length)} 개` })
      );
    }
    renderList();

    return [
      el("div", { className: "screen-block" }, [
        el("div", { className: "block-head" }, [
          screenTitle(1, "항공사별 설정"),
          el("div", { className: "actions" }, [newButton]),
        ]),
        formBox,
        searchBox,
        listArea,
        el("p", { className: "note" }, [mark(2), " 관리자발권의 N 값은 예약 시점부터 적용됩니다."]),
      ]),
    ];
  }

  /* ---------- 탭 ---------- */
  const simListeners = [];
  const refreshSim = () => simListeners.forEach((fn) => fn());

  const tabs = [
    {
      id: "sim",
      label: "발권 판정",
      build: buildSim,
      spec: [
        ["우선순위 로직", "기존에는 우선순위가 없었습니다. 항공사별 설정이 모두 Y면 제한 설정을, N이 하나라도 있으면 항공사별 설정을 먼저 적용합니다."],
        ["적용시점별 처리", "예약 시점은 자동발권 불가로 유입시키고, 발권 시점은 예약을 받은 뒤 발권 처리에서 중지 메시지를 보여 줍니다."],
      ],
    },
    {
      id: "rules",
      label: "자동발권 제한 설정",
      build: buildRules,
      spec: [
        ["항목 조합", "항공사만 필수이고 나머지는 전체가 기본값입니다. 입력한 조건에 부합하면 자동발권이 불가합니다. 항공사 YY는 전체 항공사입니다."],
        ["불가능한 조합 차단", "로봇발권은 결제 요청 시점에 결정되므로 ‘적용시점-예약’과 함께 설정할 수 없습니다. ‘제외+무관’도 대상이 없어 막습니다."],
        ["지역 조건", "ONLY는 입력값만, 제외는 입력값이 아닌 경우만 불가합니다. 지역·국가·공항 중에서 고릅니다."],
        ["기간·공휴일", "날짜, 날짜+시간, 시간(매일) 세 가지로 입력합니다. 공휴일을 체크하면 적용요일이 비활성화되고 시간만 입력합니다."],
        ["사유와 히스토리", "등록·수정 시 사유를 4~100자로 받아, 항목·사유·일시·담당자를 히스토리에 남깁니다."],
      ],
    },
    {
      id: "airlines",
      label: "항공사별 설정",
      build: buildAirlines,
      spec: [
        ["발권 유형×승객 유형", "관리자·로봇·고객 발권을 ADT·CHD·INF별로 Y/N 설정합니다. 관리자발권이 불가하면 로봇·고객발권도 불가합니다."],
        ["예약 전체에 적용", "탑승객 중 한 유형이라도 N이면 예약 전체가 자동발권 불가입니다. 성인·소아·유아 예약에서 유아만 N이어도 모두 불가하며, 관리자발권의 N은 예약 시점부터 적용합니다. 고객발권이 N이고 로봇발권이 Y면 관리자 발권으로 담당자가 수동 처리합니다. MSP는 추후 오픈 항목이라 비활성화했습니다."],
      ],
    },
  ];

  function selectTab(id, moveFocus) {
    tabs.forEach((tab) => {
      const active = tab.id === id;
      tab.button.setAttribute("aria-selected", String(active));
      tab.button.tabIndex = active ? 0 : -1;
      tab.panel.hidden = !active;
      if (active && moveFocus) tab.button.focus();
    });
  }

  function buildConsole() {
    const buttons = tabs.map((tab, index) => {
      const node = el("button", { type: "button", id: `tab-${tab.id}`, textContent: tab.label });
      node.setAttribute("role", "tab");
      node.setAttribute("aria-controls", `panel-${tab.id}`);
      node.addEventListener("click", () => selectTab(tab.id));
      node.addEventListener("keydown", (event) => {
        const step = { ArrowRight: 1, ArrowLeft: -1 }[event.key];
        if (!step) return;
        event.preventDefault();
        selectTab(tabs[(index + step + tabs.length) % tabs.length].id, true);
      });
      tab.button = node;
      return node;
    });
    byId("tabs").append(...buttons);

    byId("panels").append(
      ...tabs.map((tab) => {
        tab.panel = el("div", { className: "panel", id: `panel-${tab.id}` }, [
          el("div", { className: "screen" }, tab.build()),
          el("aside", { className: "spec" }, [
            el("h2", { textContent: "기획 설명" }),
            el("ol", {}, tab.spec.map(([title, body], i) => el("li", {}, [mark(i + 1), el("div", {}, [el("b", { textContent: title }), body])]))),
          ]),
        ]);
        tab.panel.setAttribute("role", "tabpanel");
        tab.panel.setAttribute("aria-labelledby", `tab-${tab.id}`);
        return tab.panel;
      })
    );
    selectTab("sim");
    refreshSim();
  }

  byId("meta").textContent = `${project.area} · ${project.period}`;
  byId("title").textContent = project.title;
  byId("result").textContent = project.result;
  byId("story").append(
    ...project.details.map(([term, body]) => el("div", {}, [el("dt", { textContent: term }), el("dd", { textContent: body })]))
  );
  byId("reset").addEventListener("click", () => location.reload());
  buildConsole();
})();
