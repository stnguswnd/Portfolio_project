const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => document.querySelectorAll(selector);

const state = {
  theme: localStorage.getItem("portfolio-theme") || getSystemTheme(),
  menuOpen: false,
  navScrolled: false,
  projects: [],
  filteredLanguage: "all",
  projectStatus: "idle",
  projectError: "",
};

const elements = {
  siteHeader: $("#siteHeader"),
  menuToggle: $("#menuToggle"),
  navMenu: $("#navMenu"),
  navLinks: $$(".nav-link"),
  themeToggle: $("#themeToggle"),
  themeIcon: $("#themeIcon"),
  themeLabel: $("#themeLabel"),
  scrollTopBtn: $("#scrollTopBtn"),
  projectFilters: $("#projectFilters"),
  projectStatus: $("#projectStatus"),
  projectList: $("#projectList"),
  contactForm: $("#contactForm"),
  formResult: $("#formResult"),
};

const githubUsername = document.body.dataset.githubUsername || "stnguswnd";

function getSystemTheme() {
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function applyTheme(theme) {
  state.theme = theme;
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem("portfolio-theme", theme);

  const isDark = theme === "dark";
  elements.themeIcon.textContent = isDark ? "☀️" : "🌙";
  elements.themeLabel.textContent = isDark ? "Light" : "Dark";
  elements.themeToggle.setAttribute(
    "aria-label",
    isDark ? "라이트 모드로 전환" : "다크 모드로 전환",
  );
}

function toggleTheme() {
  const nextTheme = state.theme === "dark" ? "light" : "dark";
  applyTheme(nextTheme);
}

function setMenuOpen(isOpen) {
  state.menuOpen = isOpen;

  if (isOpen) {
    elements.navMenu.classList.add("active");
    elements.menuToggle.classList.add("active");
    document.body.classList.add("menu-open");
  } else {
    elements.navMenu.classList.remove("active");
    elements.menuToggle.classList.remove("active");
    document.body.classList.remove("menu-open");
  }

  elements.menuToggle.setAttribute("aria-expanded", String(isOpen));
  elements.menuToggle.setAttribute(
    "aria-label",
    isOpen ? "메뉴 닫기" : "메뉴 열기",
  );
}

function handleMenuToggle() {
  setMenuOpen(!state.menuOpen);
}

function handleSmoothScroll(event) {
  const href = event.currentTarget.getAttribute("href");

  if (!href || !href.startsWith("#")) {
    return;
  }

  const target = $(href);

  if (!target) {
    return;
  }

  event.preventDefault();
  setMenuOpen(false);
  target.scrollIntoView({ behavior: "smooth", block: "start" });
  history.pushState(null, "", href);
}

function handleScroll() {
  const shouldShowScrollTop = window.scrollY > 300;
  const shouldUseScrolledHeader = window.scrollY > 60;

  elements.scrollTopBtn.classList.toggle("visible", shouldShowScrollTop);

  if (state.navScrolled !== shouldUseScrolledHeader) {
    state.navScrolled = shouldUseScrolledHeader;
    elements.siteHeader.classList.toggle("scrolled", shouldUseScrolledHeader);
  }

  updateActiveNavLink();
}

function updateActiveNavLink() {
  const sections = ["hero", "about", "skills", "projects", "contact"];
  const currentSection = sections.find((sectionId) => {
    const section = document.getElementById(sectionId);
    const rect = section.getBoundingClientRect();
    return rect.top <= 120 && rect.bottom >= 120;
  });

  elements.navLinks.forEach((link) => {
    const isActive = link.getAttribute("href") === `#${currentSection}`;
    link.classList.toggle("active", isActive);
  });
}

function scrollToTop() {
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function observeSections() {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
        }
      });
    },
    { threshold: 0.25 },
  );

  $$("[data-observe]").forEach((section) => observer.observe(section));
}

function setProjectStatus(status, errorMessage = "") {
  state.projectStatus = status;
  state.projectError = errorMessage;
  renderProjectStatus();
}

function renderProjectStatus() {
  const statusMessages = {
    idle: "",
    loading: `
      <div class="status-box">
        <span class="spinner" aria-hidden="true"></span>
        <span>로딩 중... GitHub 저장소를 요청하고 있습니다.</span>
      </div>
    `,
    success: `
      <div class="status-box success">
        <span aria-hidden="true">✓</span>
        <span>성공: GitHub 저장소를 불러왔습니다.</span>
      </div>
    `,
    empty: `
      <div class="status-box">
        <span>표시할 프로젝트가 없습니다.</span>
      </div>
    `,
    error: `
      <div class="status-box error">
        <span>${state.projectError}</span>
        <button class="retry-button" type="button" data-retry-projects>다시 시도</button>
      </div>
    `,
  };

  elements.projectStatus.innerHTML = statusMessages[state.projectStatus];
}

async function fetchGitHubProjects() {
  setProjectStatus("loading");
  elements.projectList.innerHTML = "";
  elements.projectFilters.innerHTML = "";

  try {
    const response = await fetch(
      `https://api.github.com/users/${githubUsername}/repos?sort=updated&per_page=12`,
    );

    if (!response.ok) {
      if (response.status === 403) {
        throw new Error(
          "프로젝트를 불러올 수 없습니다. GitHub API 레이트 리밋이 발생했습니다.",
        );
      }
      throw new Error("프로젝트를 불러올 수 없습니다.");
    }

    const repos = await response.json();
    state.projects = repos
      .filter((repo) => !repo.fork)
      .map(
        ({
          name,
          description,
          html_url,
          homepage,
          language,
          stargazers_count,
          updated_at,
        }) => ({
          name,
          description: description || "설명이 등록되지 않은 저장소입니다.",
          url: html_url,
          homepage,
          language: language || "기타",
          stars: stargazers_count,
          updatedAt: updated_at,
        }),
      )
      .sort(
        (first, second) =>
          second.stars - first.stars ||
          new Date(second.updatedAt) - new Date(first.updatedAt),
      );

    if (state.projects.length === 0) {
      setProjectStatus("empty");
      renderProjects();
      return;
    }

    state.filteredLanguage = "all";
    setProjectStatus("success");
    renderFilters();
    renderProjects();
  } catch (error) {
    setProjectStatus("error", error.message);
    elements.projectList.innerHTML = "";
  }
}

function getLanguages() {
  return ["all", ...new Set(state.projects.map(({ language }) => language))];
}

function renderFilters() {
  const languages = getLanguages();

  elements.projectFilters.innerHTML = languages
    .map((language) => {
      const label = language === "all" ? "전체" : language;
      const isActive = state.filteredLanguage === language;
      return `<button class="filter-button ${isActive ? "active" : ""}" type="button" data-language="${language}">${label}</button>`;
    })
    .join("");
}

function renderProjects() {
  const filteredProjects = state.projects.filter(
    ({ language }) =>
      state.filteredLanguage === "all" || language === state.filteredLanguage,
  );

  if (filteredProjects.length === 0) {
    elements.projectList.innerHTML = `
      <div class="empty-card">
        <strong>표시할 프로젝트가 없습니다.</strong>
        <p>다른 언어 필터를 선택해 주세요.</p>
      </div>
    `;
    return;
  }

  elements.projectList.innerHTML = filteredProjects
    .map(
      ({ name, description, url, homepage, language, stars, updatedAt }) => `
        <article class="project-card">
          <h3>${name}</h3>
          <p>${description}</p>
          <div class="project-meta">
            <span>${language}</span>
            <span>★ ${stars}</span>
            <span>${formatDate(updatedAt)}</span>
          </div>
          <a class="project-link" href="${homepage || url}" target="_blank" rel="noopener noreferrer">
            프로젝트 열기 →
          </a>
        </article>
      `,
    )
    .join("");
}

function formatDate(dateText) {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(dateText));
}

function handleFilterClick(event) {
  const button = event.target.closest("[data-language]");

  if (!button) {
    return;
  }

  state.filteredLanguage = button.dataset.language;
  renderFilters();
  renderProjects();
}

function validateField(field) {
  const value = field.value.trim();
  const errorElement = $(`#${field.id}Error`);
  const fieldWrapper = field.closest(".form-field");
  let message = "";

  if (!value) {
    message = "필수 입력 항목입니다.";
  } else if (field.type === "email" && !isValidEmail(value)) {
    message = "올바른 이메일 형식으로 입력해 주세요.";
  }

  errorElement.textContent = message;
  fieldWrapper.classList.toggle("invalid", Boolean(message));
  field.setAttribute("aria-invalid", String(Boolean(message)));

  return !message;
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function handleFormInput(event) {
  if (event.target.matches("input, textarea")) {
    validateField(event.target);
    elements.formResult.textContent = "";
  }
}

function handleFormSubmit(event) {
  event.preventDefault();

  const fields = [...elements.contactForm.querySelectorAll("input, textarea")];
  const isValid = fields.map(validateField).every(Boolean);

  if (!isValid) {
    elements.formResult.textContent = "";
    return;
  }

  const formData = new FormData(elements.contactForm);
  const formValues = Object.fromEntries(formData.entries());
  const { name } = formValues;

  elements.formResult.textContent = `${name}님, 메시지가 정상적으로 확인되었습니다.`;
  elements.contactForm.reset();
  fields.forEach((field) => field.setAttribute("aria-invalid", "false"));
}

function handleProjectRetry(event) {
  if (event.target.matches("[data-retry-projects]")) {
    fetchGitHubProjects();
  }
}

function bindEvents() {
  elements.menuToggle.addEventListener("click", handleMenuToggle);
  elements.themeToggle.addEventListener("click", toggleTheme);
  elements.scrollTopBtn.addEventListener("click", scrollToTop);
  elements.navLinks.forEach((link) =>
    link.addEventListener("click", handleSmoothScroll),
  );
  elements.projectFilters.addEventListener("click", handleFilterClick);
  elements.projectStatus.addEventListener("click", handleProjectRetry);
  elements.contactForm.addEventListener("input", handleFormInput);
  elements.contactForm.addEventListener("submit", handleFormSubmit);
  window.addEventListener("scroll", handleScroll);
  window.addEventListener("resize", () => {
    if (window.innerWidth >= 768) {
      setMenuOpen(false);
    }
  });
}

function init() {
  applyTheme(state.theme);
  bindEvents();
  observeSections();
  handleScroll();
  fetchGitHubProjects();
}

init();
