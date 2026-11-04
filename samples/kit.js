// 프로젝트 샘플 화면 공통 틀입니다.
// 각 프로젝트 파일(samples/<id>.js)은 Kit.render({ id, plan, ai })만 부르면 됩니다. ai는 없어도 됩니다.
// 화면 구성: 기존 기획 / AI 기획 확장 탭 → 머리말 → 무엇을 바꿨나 → 안내 → 콘솔(화면 + 기획 설명)
(function () {
  function el(tag, props, children) {
    const node = Object.assign(document.createElement(tag), props || {});
    if (children != null) node.append(...[].concat(children).filter((c) => c != null && c !== false));
    return node;
  }
  function btn(label, className, onClick) {
    const node = el("button", { type: "button", className: className == null ? "line-btn" : className, textContent: label });
    if (onClick) node.addEventListener("click", onClick);
    return node;
  }
  const mark = (n) => el("span", { className: "mark", textContent: String(n), ariaLabel: `설명 ${n}` });
  const title = (n, text) => el("h3", { className: "screen-title" }, [mark(n), text]);
  function block(n, text, children, right) {
    return el("section", { className: "screen-block" }, [
      el("div", { className: "block-head" }, [title(n, text), right || null]),
      ...[].concat(children),
    ]);
  }
  function select(options, value, label) {
    const s = el("select", { ariaLabel: label || "" });
    options.forEach((o) => {
      const [v, t] = Array.isArray(o) ? o : [o, o];
      s.append(el("option", { value: v, textContent: t, selected: String(v) === String(value) }));
    });
    return s;
  }
  const input = (value, label, type) => el("input", { type: type || "text", value: value == null ? "" : value, ariaLabel: label || "" });
  const field = (label, control, className) => el("label", { className: "field " + (className || "") }, [el("span", { textContent: label }), control]);

  // headers: "#"로 시작하면 오른쪽 정렬 숫자 칸입니다. rows: 칸 배열 또는 { cells, className }
  function table(headers, rows, className) {
    const num = headers.map((h) => h.startsWith("#"));
    return el("div", { className: "table-wrap" }, [
      el("table", { className: className || "" }, [
        el("thead", {}, [el("tr", {}, headers.map((h, i) => el("th", { scope: "col", className: num[i] ? "num" : "", textContent: h.replace(/^#/, "") })))]),
        el("tbody", {}, rows.map((r) => {
          const cells = Array.isArray(r) ? r : r.cells;
          return el("tr", { className: (!Array.isArray(r) && r.className) || "" }, cells.map((c, i) => el("td", { className: num[i] ? "num" : "" }, [c])));
        })),
      ]),
    ]);
  }
  const badge = (text, tone) => el("span", { className: "badge " + (tone || ""), textContent: text });
  const json = (obj) => el("pre", { className: "code", textContent: typeof obj === "string" ? obj : JSON.stringify(obj, null, 2) });
  const won = (n) => Math.round(n).toLocaleString("ko-KR");
  const pad = (n) => String(n).padStart(2, "0");
  function kpis(items) {
    return el("dl", { className: "kpis" }, items.map(([label, value, unit, sub]) =>
      el("div", {}, [el("dt", { textContent: label }), el("dd", {}, [String(value), unit ? el("small", { textContent: unit }) : null]), sub ? el("p", { textContent: sub }) : null])
    ));
  }
  // 새로고침해도 같은 샘플이 나오도록 고정 시드 난수를 씁니다.
  function rng(seed) {
    let s = seed | 0;
    return () => {
      s = (s + 0x6d2b79f5) | 0;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* ---------- 팝업 ---------- */
  function modal(build) {
    return new Promise((resolve) => {
      const dialog = el("dialog");
      const finish = (v) => { if (dialog.open) dialog.close(); dialog.remove(); resolve(v); };
      dialog.append(...build(finish));
      dialog.addEventListener("cancel", (e) => { e.preventDefault(); finish(null); });
      document.body.append(dialog);
      dialog.showModal();
    });
  }
  const alertBox = (message) => modal((finish) => [el("p", { textContent: message }), el("div", { className: "form-foot" }, [btn("확인", "solid", () => finish(true))])]);
  const confirmBox = (message) => modal((finish) => [
    el("p", { textContent: message }),
    el("div", { className: "form-foot" }, [btn("취소", "line-btn", () => finish(false)), btn("확인", "solid", () => finish(true))]),
  ]);

  /* ---------- 페이지 조립 ---------- */
  const PLAN_NOTICE = [el("b", { textContent: "기획 내용을 바탕으로 화면 흐름을 재구성한 샘플입니다." }), " 실제 시스템 화면이 아니며, 항공사·고객·금액은 모두 가상 데이터입니다. 저장되지 않고 새로고침하면 처음으로 돌아갑니다."];
  const AI_NOTICE = [el("b", { textContent: "AI 기획 제안을 화면으로 구체화한 샘플입니다." }), " 실제로 구현·운영한 결과가 아니며, AI 결과는 정해 둔 규칙으로 흉내 낸 가상 데이터입니다."];

  function head(meta, h1, result, story, isAi) {
    return el("header", { className: "sample-head" }, [
      el("p", { className: "sample-meta", textContent: meta }),
      el("h1", {}, [h1, isAi ? el("span", { className: "ai-tag", textContent: "AI 기획 제안" }) : null]),
      el("p", { className: "sample-result", textContent: result }),
      el("dl", { className: "story" }, story.map(([t, b]) => el("div", {}, [el("dt", { textContent: t }), el("dd", { textContent: b })]))),
    ]);
  }

  function changes(heading, headers, rows, className) {
    return el("section", { className: "changes " + (className || "") }, [
      el("h2", { textContent: heading }),
      el("div", { className: "table-wrap" }, [el("table", {}, [
        el("thead", {}, [el("tr", {}, headers.map((h) => el("th", { scope: "col", textContent: h })))]),
        el("tbody", {}, rows.map((r) => el("tr", {}, r.map((c, i) => (i === 0 && headers.length === 3 ? el("th", { scope: "row", textContent: c }) : el("td", { textContent: c })))))),
      ])]),
    ]);
  }

  function consoleOf(name, tabs) {
    const tabBar = el("div", { className: "tabs", role: "tablist", ariaLabel: `${name} 메뉴` });
    const panels = el("div");
    const items = tabs.map((t, i) => {
      const button = el("button", { type: "button", textContent: t.label });
      button.setAttribute("role", "tab");
      const panel = el("div", { className: "panel" }, [
        el("div", { className: "screen" }, [].concat(t.build())),
        el("aside", { className: "spec" }, [
          el("h2", { textContent: "기획 설명" }),
          el("ol", {}, t.spec.map(([a, b], j) => el("li", {}, [mark(j + 1), el("div", {}, [el("b", { textContent: a }), b])]))),
        ]),
      ]);
      panel.setAttribute("role", "tabpanel");
      button.addEventListener("click", () => choose(i));
      button.addEventListener("keydown", (e) => {
        const step = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
        if (!step) return;
        e.preventDefault();
        choose((i + step + tabs.length) % tabs.length, true);
      });
      tabBar.append(button);
      panels.append(panel);
      return { button, panel };
    });
    function choose(index, focus) {
      items.forEach((it, i) => {
        it.button.setAttribute("aria-selected", String(i === index));
        it.button.tabIndex = i === index ? 0 : -1;
        it.panel.hidden = i !== index;
      });
      if (focus) items[index].button.focus();
    }
    choose(0);
    return el("div", { className: "console" }, [
      el("div", { className: "console-bar" }, [el("b", { textContent: name }), btn("샘플 초기화", "", () => location.reload())]),
      tabBar,
      panels,
    ]);
  }

  function render(cfg) {
    const projects = (window.PORTFOLIO && window.PORTFOLIO.projects) || [];
    const P = projects.find((p) => p.id === cfg.id) || {};
    // data.js에서 이 샘플의 #ai 화면을 링크한 프로젝트가 있을 때만 AI 기획 화면을 보여 줍니다.
    const aiPage = `samples/${cfg.id}.html#ai`;
    const aiProject = projects.find((p) => p.aiSample === aiPage || p.sample === aiPage);
    if (!aiProject) cfg = { ...cfg, ai: null };
    const app = document.getElementById("app");
    document.title = `${P.title || cfg.plan.name} 샘플 화면`;
    const pageTabs = el("nav", { className: "page-tabs", ariaLabel: "샘플 화면 선택" }, [
      el("a", { href: "#plan" }, [el("small", { textContent: "기존 기획" }), cfg.plan.name]),
      cfg.ai ? el("a", { href: "#ai" }, [el("small", { textContent: "AI 기획 확장" }), cfg.ai.name]) : null,
    ]);
    pageTabs.children[0].dataset.view = "plan";
    if (cfg.ai) pageTabs.children[1].dataset.view = "ai";

    const viewPlan = el("div", {}, [
      head(`${P.area || ""} · ${P.period || ""}`, P.title || cfg.plan.name, P.result || "", cfg.plan.story || P.details || []),
      el("main", {}, [
        changes("무엇을 바꿨나", ["구분", "AS-IS", "TO-BE"], cfg.plan.changes),
        el("div", { className: "sample-notice" }, cfg.plan.notice || PLAN_NOTICE),
        consoleOf(cfg.plan.console || cfg.plan.name, cfg.plan.tabs),
      ]),
    ]);
    const viewAi = el("div", { hidden: true });
    let aiBuilt = false;

    const back = el("a", { className: "back", href: `../index.html#${cfg.id}`, textContent: "← 포트폴리오로 돌아가기" });
    app.append(
      back,
      ...(cfg.ai ? [pageTabs] : []),
      viewPlan,
      viewAi
    );

    function show() {
      const ai = Boolean(cfg.ai) && location.hash === "#ai";
      back.href = `../index.html#${ai ? aiProject.id : cfg.id}`;
      if (ai && !aiBuilt) {
        viewAi.append(
          head("AI 기획 확장 · 기존 기획 기반 제안", cfg.ai.name, cfg.ai.result, cfg.ai.story, true),
          el("main", {}, [
            changes("기존 기획에서 이어지는 부분", ["기존 기획 산출물", "AI 기획에서 쓰는 방식"], cfg.ai.bridge, "bridge"),
            el("div", { className: "sample-notice" }, AI_NOTICE),
            consoleOf(cfg.ai.console || cfg.ai.name, cfg.ai.tabs),
          ])
        );
        aiBuilt = true;
      }
      viewAi.hidden = !ai;
      viewPlan.hidden = ai;
      pageTabs.querySelectorAll("a").forEach((a) => {
        if ((a.dataset.view === "ai") === ai) a.setAttribute("aria-current", "page");
        else a.removeAttribute("aria-current");
      });
    }
    window.addEventListener("hashchange", show);
    show();
  }

  window.Kit = { el, btn, mark, title, block, select, input, field, table, badge, json, won, pad, kpis, rng, alert: alertBox, confirm: confirmBox, render };
})();
