(function () {
  const data = window.PORTFOLIO;
  const byId = (id) => document.getElementById(id);
  const projectOf = (id) => data.projects.find((p) => p.id === id);

  function el(tag, props, children) {
    const node = Object.assign(document.createElement(tag), props);
    if (children) node.append(...children);
    return node;
  }

  function pairs(rows) {
    return rows.flatMap(([term, body]) => [
      el("dt", { textContent: term }),
      el("dd", { textContent: body }),
    ]);
  }

  function renderOptional(sectionId, listId, items, toRow) {
    if (!items.length) return;
    byId(listId).append(...items.map(toRow));
    byId(sectionId).hidden = false;
  }

  function renderStatic() {
    const { name, role, email, summary } = data.site;
    byId("name").textContent = name;
    byId("role").textContent = role;
    byId("summary").textContent = summary;
    byId("email").href = `mailto:${email}`;
    byId("email").textContent = email;
    byId("print").addEventListener("click", () => window.print());

    byId("facts").append(
      ...data.facts.map(([term, body]) =>
        el("div", {}, [el("dt", { textContent: term }), el("dd", { textContent: body })])
      )
    );

    renderOptional("career-section", "career", data.career, (item) =>
      el("li", {}, [
        el("div", {}, [el("b", { textContent: item.company }), ` · ${item.title}`]),
        el("span", { textContent: item.period }),
      ])
    );
    renderOptional("education-section", "education", data.education, (item) =>
      el("li", {}, [
        el("div", {}, [el("b", { textContent: item.school }), ` · ${item.major}`]),
        el("span", { textContent: item.period }),
      ])
    );

    byId("highlights").append(
      ...data.highlights.map((item) =>
        el("li", {}, [el("b", { textContent: item.value }), el("span", { textContent: item.text })])
      )
    );

    byId("roles").append(
      ...data.roles.map((role) => {
        const button = el("button", { type: "button", textContent: role.label });
        button.dataset.role = role.id;
        button.addEventListener("click", () => setRole(role.id, true));
        return button;
      })
    );

    byId("skills").append(...pairs(data.skills));
    byId("skills").classList.add("pairs-wide");

    byId("ai-intro").textContent = data.ai.intro;
    byId("ideas").append(
      ...data.ai.ideas.map((idea) =>
        el("li", {}, [
          el("b", { textContent: idea.title }),
          el("div", { textContent: idea.apply }),
          el("span", { textContent: `근거 경험: ${idea.basis} · 측정 지표: ${idea.metric}` }),
        ])
      )
    );
  }

  function projectRow(project) {
    return el("details", { className: "project", id: project.id }, [
      el("summary", {}, [
        el("span", { className: "period", textContent: project.period }),
        el("div", { className: "project-main" }, [
          el("div", { className: "project-title", textContent: project.title }),
          el("p", { className: "project-result", textContent: project.result }),
        ]),
        el("span", { className: "area", textContent: project.area }),
        el("span", { className: "toggle", ariaHidden: "true" }),
      ]),
      el("div", { className: "project-body" }, [
        el("p", { textContent: project.summary }),
        el("dl", { className: "pairs" }, pairs(project.details)),
      ]),
    ]);
  }

  function renderProjects(role) {
    const lists = role.primary
      ? [
          { title: `${role.label} 직무 핵심 프로젝트`, projects: role.primary.map(projectOf) },
          { title: "그 외 프로젝트", projects: data.projects.filter((p) => !role.primary.includes(p.id)) },
        ]
      : [{ projects: data.projects }];

    byId("project-list").replaceChildren(
      ...lists.flatMap((list) => [
        ...(list.title ? [el("p", { className: "list-title", textContent: list.title })] : []),
        el("div", { className: "projects" }, list.projects.map(projectRow)),
      ])
    );
  }

  function setRole(id, updateUrl) {
    const role = data.roles.find((r) => r.id === id) || data.roles[0];
    document.querySelectorAll("#roles button").forEach((button) => {
      button.setAttribute("aria-pressed", String(button.dataset.role === role.id));
    });
    byId("role-message").textContent = role.message || "";
    renderProjects(role);
    if (updateUrl) {
      const url = new URL(location.href);
      if (role.id === "all") url.searchParams.delete("role");
      else url.searchParams.set("role", role.id);
      url.hash = "";
      history.replaceState(null, "", url);
    }
  }

  // 인쇄할 때는 접힌 프로젝트를 모두 펼쳤다가 원래대로 돌립니다.
  let closedForPrint = [];
  window.addEventListener("beforeprint", () => {
    closedForPrint = [...document.querySelectorAll("details:not([open])")];
    closedForPrint.forEach((d) => (d.open = true));
  });
  window.addEventListener("afterprint", () => {
    closedForPrint.forEach((d) => (d.open = false));
  });

  renderStatic();
  setRole(new URLSearchParams(location.search).get("role"), false);
})();
