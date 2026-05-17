// 1. HTML 요소를 쉽게 찾기 위한 도구 만들기
const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => document.querySelectorAll(selector);

const THEME_STORAGE_KEY = "portfolio-theme";
const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
const systemThemeMedia = window.matchMedia("(prefers-color-scheme: dark)");

// 2. 현재 화면 상태를 저장하는 state 만들기
const state = {
  theme: savedTheme || getSystemTheme(),
  themeSource: savedTheme ? "manual" : "system",
  menuOpen: false,
  navScrolled: false,
  projects: [],
  filteredLanguage: "all",
  projectStatus: "idle",
  projectError: "",
  formSubmitting: false,
};

// 3. 자주 쓰는 HTML 요소들을 elements에 저장하기
const elements = {
  siteHeader: $("#siteHeader"),
  menuToggle: $("#menuToggle"),
  navMenu: $("#navMenu"),
  navLinks: $$(".nav-link"),
  themeToggle: $("#themeToggle"),
  themeIcon: $("#themeIcon"),
  themeLabel: $("#themeLabel"),
  typedHeadline: $("#typedHeadline"),
  scrollTopBtn: $("#scrollTopBtn"),
  projectFilters: $("#projectFilters"),
  projectStatus: $("#projectStatus"),
  projectList: $("#projectList"),
  contactForm: $("#contactForm"),
  contactSubmit: $("#contactSubmit"),
  formResult: $("#formResult"),
};

const githubUsername = document.body.dataset.githubUsername || "stnguswnd";

// 4. 다크 모드 관련 함수
function getSystemTheme() {
  return systemThemeMedia.matches ? "dark" : "light";
}

function applyTheme(theme, options = {}) {
  const { persist = false } = options;

  state.theme = theme;
  document.documentElement.setAttribute("data-theme", theme);

  if (persist) {
    state.themeSource = "manual";
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  }

  const isDark = theme === "dark";
  const sourceText = state.themeSource === "system" ? "시스템 설정 기준" : "사용자 설정 기준";

  elements.themeIcon.textContent = isDark ? "☀️" : "🌙";
  elements.themeLabel.textContent = isDark ? "Light" : "Dark";
  elements.themeToggle.setAttribute(
    "aria-label",
    isDark ? "라이트 모드로 전환" : "다크 모드로 전환",
  );
  elements.themeToggle.title = `현재 테마: ${isDark ? "다크" : "라이트"} (${sourceText})`;
}

function toggleTheme() {
  const nextTheme = state.theme === "dark" ? "light" : "dark";
  applyTheme(nextTheme, { persist: true });
}

function handleSystemThemeChange(event) {
  if (state.themeSource !== "system") {
    return;
  }

  const nextTheme = event.matches ? "dark" : "light";
  applyTheme(nextTheme);
}

// 5. 햄버거 메뉴 관련 함수
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

// 6. 스크롤 관련 함수
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

// 7. 타이핑 효과 관련 함수
function startTypingEffect() {
  const headline = elements.typedHeadline;

  if (!headline) {
    return;
  }

  const text = headline.dataset.typingText || headline.textContent.trim();
  const shouldReduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  headline.setAttribute("aria-label", text);

  if (shouldReduceMotion) {
    headline.textContent = text;
    headline.classList.add("typing-done");
    return;
  }

  const characters = Array.from(text);
  let index = 0;

  headline.textContent = "";
  headline.classList.remove("typing-done");

  function typeNextCharacter() {
    headline.textContent += characters[index] || "";
    index += 1;

    if (index < characters.length) {
      window.setTimeout(typeNextCharacter, 65);
      return;
    }

    window.setTimeout(() => {
      headline.classList.add("typing-done");
    }, 700);
  }

  typeNextCharacter();
}

// 8. GitHub API 관련 함수
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
        <span>${escapeHtml(state.projectError)}</span>
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
    //repo.fork가 false인 저장소만 통과시킨다. 
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
      )// starts 많은 순, starts가 많으면 updateAt이 최근인 순
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
    // 언어 목록을 버튼 UI로 변환 
    renderFilters();
    //선택한 언어의 프로젝트만 남기기
    renderProjects();
  } catch (error) {
    setProjectStatus("error", error.message);
    elements.projectList.innerHTML = "";
  }
}

function getLanguages() {
  return ["all", ...new Set(state.projects.map(({ language }) => language))];
}

// 9. 프로젝트 필터링 함수
function renderFilters() {
  const languages = getLanguages();

  elements.projectFilters.innerHTML = languages
    .map((language) => {
      const label = language === "all" ? "전체" : language;
      const isActive = state.filteredLanguage === language;
      return `<button class="filter-button ${isActive ? "active" : ""}" type="button" data-language="${escapeHtml(language)}" aria-pressed="${String(isActive)}">${escapeHtml(label)}</button>`;
    })
    .join("");
}

function renderProjects() {
  const filteredProjects = state.projects.filter(
    ({ language }) =>
      state.filteredLanguage === "all" || language === state.filteredLanguage,
  );

  //결과가 없으면 빈 상태 UI를 표시함. 
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
          <h3>${escapeHtml(name)}</h3>
          <p>${escapeHtml(description)}</p>
          <div class="project-meta">
            <span>${escapeHtml(language)}</span>
            <span>★ ${stars}</span>
            <span>${formatDate(updatedAt)}</span>
          </div>
          <a class="project-link" href="${getSafeUrl(homepage || url)}" target="_blank" rel="noopener noreferrer">
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

function escapeHtml(value) {
  const htmlMap = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  };

  return String(value).replace(/[&<>"']/g, (character) => htmlMap[character]);
}

function getSafeUrl(url) {
  const text = String(url || "").trim();
  return text.startsWith("https://") || text.startsWith("http://") ? escapeHtml(text) : "#";
}

// 10. Contact 폼 검증 및 실제 전송 함수
function validateField(field) {
  if (!field.id) {
    return true;
  }

  const value = field.value.trim();
  const errorElement = $(`#${field.id}Error`);
  const fieldWrapper = field.closest(".form-field");
  let message = "";

  if (!value) {
    message = "필수 입력 항목입니다.";
  } else if (field.type === "email" && !isValidEmail(value)) {
    message = "올바른 이메일 형식으로 입력해 주세요.";
  }

  if (errorElement) {
    errorElement.textContent = message;
  }

  if (fieldWrapper) {
    fieldWrapper.classList.toggle("invalid", Boolean(message));
  }

  field.setAttribute("aria-invalid", String(Boolean(message)));

  return !message;
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function handleFormInput(event) {
  if (event.target.matches("input, textarea")) {
    validateField(event.target);
    setFormResult("", false);
  }
}

async function handleFormSubmit(event) {
  event.preventDefault();

  const fields = [...elements.contactForm.querySelectorAll('input:not([type="hidden"]), textarea')];
  const isValid = fields.map(validateField).every(Boolean);

  if (!isValid) {
    setFormResult("", false);
    return;
  }

  const formData = new FormData(elements.contactForm);

  try {
    setFormSubmitting(true);
    setFormResult("메시지를 전송하는 중입니다...", false);
    await submitContactForm(formData);

    const name = formData.get("name");
    setFormResult(`${name}님, 메시지가 정상적으로 전송되었습니다.`, false);
    elements.contactForm.reset();
    clearFormErrors(fields);
  } catch (error) {
    setFormResult(error.message, true);
  } finally {
    setFormSubmitting(false);
  }
}

async function submitContactForm(formData) {
  const endpoint = getFormEndpoint();

  if (!endpoint) {
    throw new Error(
      "Formspree 주소가 아직 설정되지 않았습니다. form의 action 값을 본인 Formspree 주소로 바꿔 주세요.",
    );
  }

  const response = await fetch(endpoint, {
    method: "POST",
    body: formData,
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(await getFormErrorMessage(response));
  }
}

function getFormEndpoint() {
  const endpoint = elements.contactForm.getAttribute("action") || "";

  if (!endpoint || endpoint.includes("your-form-id")) {
    return "";
  }

  return endpoint;
}

async function getFormErrorMessage(response) {
  try {
    const data = await response.json();
    const firstError = data.errors?.[0]?.message;
    return firstError || "메시지 전송에 실패했습니다. 잠시 후 다시 시도해 주세요.";
  } catch {
    return "메시지 전송에 실패했습니다. 잠시 후 다시 시도해 주세요.";
  }
}

function setFormSubmitting(isSubmitting) {
  state.formSubmitting = isSubmitting;
  elements.contactForm.classList.toggle("is-submitting", isSubmitting);
  elements.contactSubmit.disabled = isSubmitting;
  elements.contactSubmit.textContent = isSubmitting ? "전송 중..." : "메시지 전송";
}

function setFormResult(message, isError) {
  elements.formResult.textContent = message;
  elements.formResult.classList.toggle("error", isError);
}

function clearFormErrors(fields) {
  fields.forEach((field) => {
    const errorElement = $(`#${field.id}Error`);
    const fieldWrapper = field.closest(".form-field");

    field.setAttribute("aria-invalid", "false");

    if (errorElement) {
      errorElement.textContent = "";
    }

    if (fieldWrapper) {
      fieldWrapper.classList.remove("invalid");
    }
  });
}

function handleProjectRetry(event) {
  if (event.target.matches("[data-retry-projects]")) {
    fetchGitHubProjects();
  }
}

// 11. 이벤트 연결 함수
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

  if (systemThemeMedia.addEventListener) {
    systemThemeMedia.addEventListener("change", handleSystemThemeChange);
  } else {
    systemThemeMedia.addListener(handleSystemThemeChange);
  }
}

// 12. init()으로 전체 실행 시작
function init() {
  //테마 적용 
  applyTheme(state.theme);
  //이벤트 연결
  bindEvents();
  //섹션 관찰 시작 
  observeSections();
  //타이핑 효과 시작 
  startTypingEffect();
  //현재 스크롤 상태 반영
  handleScroll();
  //요청시작 
  fetchGitHubProjects();
}

init();
