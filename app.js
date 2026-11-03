(function () {
  const data = window.PORTFOLIO;
  const byId = (id) => document.getElementById(id);
  const projectOf = (id) => data.projects.find((p) => p.id === id);

  function el(tag, props, children) {
    const node = Object.assign(document.createElement(tag), props);
    if (children) node.append(...children);
    return node;
  }

  function renderStatic() {
    byId("brand").textContent = data.site.name;
    byId("hero-role").textContent = `${data.site.role} · ${data.site.name}`;
    byId("hero-title").textContent = data.hero.title;
    byId("hero-summary").textContent = data.hero.summary;

    byId("roles").append(
      ...data.roles.map((role) => {
        const button = el("button", { type: "button", textContent: role.label });
        button.dataset.role = role.id;
        button.addEventListener("click", () => setRole(role.id, true));
        return button;
      })
    );

    byId("route").append(
      ...data.stages.map((stage, index) => {
        const button = el("button", { type: "button" }, [
          el("span", { className: "route-dot", textContent: index + 1 }),
          el("span", { textContent: stage.label }),
        ]);
        button.dataset.stage = stage.id;
        button.addEventListener("click", () => setStage(stage.id));
        return el("li", {}, [button]);
      })
    );

    byId("ai-intro").textContent = data.ai.intro;
    byId("ideas").append(
      ...data.ai.ideas.map((idea) =>
        el("li", { className: "idea" }, [
          el("h3", { textContent: idea.title }),
          el("dl", {}, [
            el("dt", { textContent: "근거 경험" }),
            el("dd", { textContent: idea.basis }),
            el("dt", { textContent: "AI 적용" }),
            el("dd", { textContent: idea.apply }),
            el("dt", { textContent: "측정 지표" }),
            el("dd", { textContent: idea.metric }),
          ]),
        ])
      )
    );
    byId("ai-outro").append(...data.ai.outro.map((text) => el("li", { textContent: text })));

    if (data.site.email) {
      const email = byId("email");
      email.href = `mailto:${data.site.email}`;
      email.textContent = data.site.email;
      email.hidden = false;
    }
    byId("print").addEventListener("click", () => window.print());
  }

  function ticket(project) {
    const rows = project.details.flatMap(([term, body]) => [
      el("dt", { textContent: term }),
      el("dd", { textContent: body }),
    ]);
    return el("details", { className: "ticket", id: project.id }, [
      el("summary", {}, [
        el("div", { className: "stub" }, [
          el("span", { className: "code", textContent: project.code }),
          el("span", { className: "stub-period", textContent: project.period }),
        ]),
        el("div", { className: "ticket-main" }, [
          el("div", { className: "ticket-title", textContent: project.title }),
          el("p", { className: "ticket-summary", textContent: project.summary }),
          el("p", { className: "ticket-result" }, [el("b", { textContent: "성과" }), project.result]),
        ]),
        el("span", { className: "chevron", ariaHidden: "true" }),
      ]),
      el("dl", { className: "ticket-details" }, rows),
    ]);
  }

  function groupsFor(role) {
    if (!role.primary) {
      return data.groups.map((group) => ({
        title: group.title,
        intro: group.intro,
        projects: data.projects.filter((p) => p.area === group.area),
      }));
    }
    return [
      { title: `${role.label} 핵심 프로젝트`, projects: role.primary.map(projectOf) },
      { title: "그 외 프로젝트", projects: data.projects.filter((p) => !role.primary.includes(p.id)) },
    ];
  }

  function renderProjects(role) {
    byId("project-groups").replaceChildren(
      ...groupsFor(role).map((group) =>
        el("div", { className: "group" }, [
          el("h3", { textContent: group.title }),
          ...(group.intro ? [el("p", { className: "group-intro", textContent: group.intro })] : []),
          el("div", { className: "cards" }, group.projects.map(ticket)),
        ])
      )
    );
  }

  function renderBoard(role) {
    byId("board").replaceChildren(
      ...role.stats.map((id) => {
        const stat = data.stats[id];
        return el("li", {}, [
          projectLink(id, [
            el("span", { className: "board-value", textContent: stat.value }),
            el("span", { className: "board-code", textContent: projectOf(id).code }),
            el("span", { className: "board-label", textContent: stat.label }),
          ]),
        ]);
      })
    );
  }

  function renderSkills(role) {
    byId("skill-list").replaceChildren(
      ...data.skills.map((skill) =>
        el("div", { className: role.id === "all" || skill.roles.includes(role.id) ? "" : "dim" }, [
          el("dt", { textContent: skill.name }),
          el("dd", { textContent: skill.body }),
        ])
      )
    );
  }

  function projectLink(id, children) {
    const link = el("a", { href: `#${id}` }, children);
    link.addEventListener("click", (event) => {
      event.preventDefault();
      openProject(id);
    });
    return link;
  }

  function openProject(id) {
    const card = byId(id);
    if (!card) return;
    card.open = true;
    card.scrollIntoView();
    card.querySelector("summary").focus({ preventScroll: true });
    history.replaceState(null, "", `${location.search}#${id}`);
    document.querySelectorAll(".ticket.flash").forEach((t) => t.classList.remove("flash"));
    card.classList.add("flash");
  }

  function setStage(id) {
    const stage = data.stages.find((s) => s.id === id);
    document.querySelectorAll("#route button").forEach((button) => {
      button.setAttribute("aria-pressed", String(button.dataset.stage === id));
    });
    byId("route-projects").replaceChildren(
      ...stage.projects.map((projectId) => {
        const project = projectOf(projectId);
        return el("li", {}, [
          projectLink(projectId, [
            el("span", { className: "code", textContent: project.code }),
            el("span", { textContent: project.title }),
          ]),
        ]);
      })
    );
  }

  // AI 직무로 볼 때는 제안 섹션을 프로젝트 앞으로 옮깁니다.
  function placeAiSection(role) {
    const before = role.id === "ai" ? "projects" : "contact";
    byId("main").insertBefore(byId("ai"), byId(before));
    const nav = byId("nav");
    nav.insertBefore(nav.querySelector('[data-for="ai"]'), nav.querySelector(`[data-for="${before}"]`));
  }

  function setRole(id, updateUrl) {
    const role = data.roles.find((r) => r.id === id) || data.roles[0];
    document.querySelectorAll("#roles button").forEach((button) => {
      button.setAttribute("aria-pressed", String(button.dataset.role === role.id));
    });
    byId("role-message").textContent = role.message;
    renderBoard(role);
    renderProjects(role);
    renderSkills(role);
    placeAiSection(role);
    if (updateUrl) {
      const url = new URL(location.href);
      if (role.id === "all") url.searchParams.delete("role");
      else url.searchParams.set("role", role.id);
      url.hash = "";
      history.replaceState(null, "", url);
    }
  }

  // 인쇄할 때는 접힌 카드를 모두 펼쳤다가 원래대로 돌립니다.
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
  setStage(data.stages[0].id);
  if (location.hash) openProject(location.hash.slice(1));
})();
