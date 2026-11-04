(function () {
  const data = window.PORTFOLIO;
  const byId = (id) => document.getElementById(id);
  const projectOf = (id) => data.projects.find((p) => p.id === id);

  function el(tag, props, children) {
    const node = Object.assign(document.createElement(tag), props);
    if (children) node.append(...children.filter((c) => c != null));
    return node;
  }
  const pairs = (rows) =>
    rows.flatMap(([term, body]) => [el("dt", { textContent: term }), el("dd", { textContent: body })]);

  /* ---------- 고정 내용 ---------- */
  function renderStatic() {
    const { name, role, headline, summary } = data.site;
    byId("name").textContent = name;
    byId("role").textContent = role;
    byId("headline").textContent = headline;
    byId("summary").textContent = summary;

    byId("facts").append(
      ...data.facts.map(([t, b]) => el("div", {}, [el("dt", { textContent: t }), el("dd", { textContent: b })]))
    );
    byId("highlights").append(
      ...data.highlights.map((h) => el("li", {}, [el("b", { textContent: h.value }), el("span", { textContent: h.text })]))
    );
    byId("strengths").append(
      ...data.strengths.map(([t, b]) => el("div", {}, [el("dt", { textContent: t }), el("dd", { textContent: b })]))
    );

    const total = data.facts.find(([t]) => t === "총 경력");
    if (total) byId("career-total").textContent = total[1];
    byId("career").append(
      ...data.career.map((c) =>
        el("li", {}, [
          el("p", { className: "when" }, [el("b", { textContent: c.period }), `${c.length} · ${c.job}`]),
          el("div", {}, [
            el("h3", {}, [c.company, el("span", { textContent: c.title })]),
            el("ul", {}, c.work.map((w) => el("li", { textContent: w }))),
            el("ul", { className: "results" }, c.results.map((r) => el("li", { textContent: r }))),
          ]),
        ])
      )
    );

    byId("education").append(
      ...data.education.map((e) =>
        el("li", {}, [el("div", {}, [el("b", { textContent: e.school }), ` · ${e.major}`]), el("span", { textContent: e.period })])
      )
    );
    byId("tools").append(...data.tools.map((t) => el("li", { textContent: t })));
  }

  /* ---------- 프로젝트 ---------- */
  const inFilter = (p, f) => !f.area || p.area === f.area || (p.tags || []).includes(f.area);

  function projectRow(p) {
    return el("details", { className: "project", id: p.id }, [
      el("summary", {}, [
        el("span", { className: "period", textContent: p.period }),
        el("div", { className: "project-main" }, [
          el("div", { className: "project-title" }, [
            p.title,
            p.sample ? el("span", { className: "sample-tag", textContent: "샘플 화면" }) : null,
          ]),
          el("p", { className: "project-result", textContent: p.result }),
        ]),
        el("span", { className: "area" + (p.area === "AI 기획" ? " ai" : ""), textContent: p.area }),
        el("span", { className: "toggle", ariaHidden: "true" }),
      ]),
      el("div", { className: "project-body" }, [
        el("p", { textContent: p.summary }),
        el("dl", { className: "pairs" }, pairs(p.details)),
        p.sample ? el("a", { className: "sample-link", href: p.sample, textContent: p.sampleLabel || "샘플 화면 보기 →" }) : null,
      ]),
    ]);
  }

  function setFilter(id) {
    const f = data.filters.find((x) => x.id === id) || data.filters[0];
    document.querySelectorAll("#filters button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.id === f.id)));
    byId("filter-note").textContent = f.note || "";
    const list = data.projects.filter((p) => inFilter(p, f));
    byId("project-list").replaceChildren(
      ...(list.length ? list.map(projectRow) : [el("p", { className: "empty", textContent: "해당하는 프로젝트가 없습니다." })])
    );
  }

  function renderFilters() {
    byId("filters").append(
      ...data.filters.map((f) => {
        const b = el("button", { type: "button" }, [f.label, el("span", { textContent: String(data.projects.filter((p) => inFilter(p, f)).length) })]);
        b.dataset.id = f.id;
        b.addEventListener("click", () => setFilter(f.id));
        return b;
      })
    );
    setFilter("all");
  }

  /* ---------- 연락처: 코드가 있을 때만 보여 줍니다 ---------- */
  const KEY = "portfolio-contact-code";
  let contact = null;
  const fromB64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

  async function decrypt(code) {
    const lock = data.contactLock;
    if (!lock || !code || !window.crypto || !crypto.subtle) return null;
    try {
      const base = await crypto.subtle.importKey("raw", new TextEncoder().encode(code), "PBKDF2", false, ["deriveKey"]);
      const key = await crypto.subtle.deriveKey(
        { name: "PBKDF2", salt: fromB64(lock.salt), iterations: lock.iter, hash: "SHA-256" },
        base, { name: "AES-GCM", length: 256 }, false, ["decrypt"]
      );
      const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: fromB64(lock.iv) }, key, fromB64(lock.data));
      return JSON.parse(new TextDecoder().decode(plain));
    } catch (e) {
      return null;
    }
  }

  function showContact(c) {
    contact = c;
    byId("phone").replaceChildren(el("a", { href: `tel:${c.phone.replace(/[^0-9+]/g, "")}`, textContent: c.phone }));
    byId("email").replaceChildren(el("a", { href: `mailto:${c.email}`, textContent: c.email }));
    if (c.name) byId("name").textContent = c.name;
  }

  async function tryCode(code) {
    const c = await decrypt(code);
    if (!c) return false;
    showContact(c);
    try { sessionStorage.setItem(KEY, code); } catch (e) {}
    return true;
  }

  function codeFromHash() {
    const m = /(?:^#|&)(?:c=|k-)([A-Za-z0-9]+)/.exec(location.hash);
    return m ? m[1] : null;
  }

  function wireUnlock() {
    const form = byId("unlock");
    const input = byId("unlock-code");
    const msg = byId("unlock-msg");
    byId("print").addEventListener("click", () => {
      if (contact) return window.print();
      form.hidden = false;
      msg.textContent = "";
      input.focus();
    });
    byId("unlock-cancel").addEventListener("click", () => { form.hidden = true; });
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      msg.textContent = "";
      if (!(await tryCode(input.value.trim()))) {
        msg.textContent = "코드가 맞지 않습니다. 공유 링크의 #c= 뒤에 있는 코드를 입력해 주세요.";
        input.select();
        return;
      }
      form.hidden = true;
      input.value = "";
      setTimeout(() => window.print(), 50);
    });
  }

  async function initContact() {
    let code = codeFromHash();
    if (!code) { try { code = sessionStorage.getItem(KEY); } catch (e) {} }
    if (code) await tryCode(code);
  }

  /* ---------- 인쇄: 접힌 프로젝트를 펼치고 전체 분류로 ---------- */
  let closedForPrint = [];
  window.addEventListener("beforeprint", () => {
    setFilter("all");
    closedForPrint = [...document.querySelectorAll("details:not([open])")];
    closedForPrint.forEach((d) => (d.open = true));
  });
  window.addEventListener("afterprint", () => closedForPrint.forEach((d) => (d.open = false)));

  /* ---------- 주소의 #으로 프로젝트 열기 ---------- */
  function openFromHash() {
    const id = location.hash.slice(1);
    if (!id || /^(c=|k-)/.test(id)) return;
    const target = byId(id);
    if (target && target.matches("details")) {
      target.open = true;
      target.scrollIntoView();
    }
  }

  renderStatic();
  renderFilters();
  wireUnlock();
  initContact();
  openFromHash();
  window.addEventListener("hashchange", () => { openFromHash(); const c = codeFromHash(); if (c && !contact) tryCode(c); });
})();
