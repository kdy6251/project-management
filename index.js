/* ========= Storage ========= */
const STORAGE_KEY = "projectFiles";

function getDefaultFiles() {
  return [
    {
      id: 1,
      name: "index.html",
      type: "HTML",
      category: "메인페이지",
      project: "학생 소통 사이트",
      code:
`<!DOCTYPE html>
<html>
<head>
  <title>학생 소통 사이트</title>
</head>
<body>
  <h1>환영합니다!</h1>
</body>
</html>`,
      tags: ["메인", "레이아웃"],
      date: "2026-01-15",
      status: "완료",
      fileSize: "234 bytes",
      isImportant: true,
      memo: "메인 페이지 레이아웃",
      relatedFiles: []
    }
  ];
}

function loadFiles() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return getDefaultFiles();
  try {
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed : getDefaultFiles();
  } catch {
    return getDefaultFiles();
  }
}

function saveFiles(files) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(files));
}

/* ========= State ========= */
let files = loadFiles();
let selectedId = null;

let searchTerm = "";
let filterCategory = "전체";
let filterProject = "전체";
let filterStatus = "전체";
let sortBy = "date";

let memoEditing = false;
let copyTimer = null;

/* ========= Constants ========= */
const fileTypes = [
  "HTML","CSS","JavaScript","TypeScript","Python","Java","C++","C#",
  "PHP","Ruby","Go","JSON","XML","SQL","TXT","MD",
  "ZIP","RAR","7Z","TAR","GZ",
  "EXE","DLL","MSI","APP","APK",
  "PDF","DOC","DOCX","XLS","XLSX","PPT","PPTX",
  "JPG","JPEG","PNG","GIF","SVG","BMP","WEBP","ICO",
  "MP4","AVI","MOV","WMV","MP3","WAV",
  "CRX","XPI","CRDOWNLOAD",
  "BAT","SH","CMD","PS1",
  "INI","CFG","CONF","ENV",
  "기타"
];

const statusOptions = ["계획", "진행중", "완료", "보류", "취소"];

const statusColorClass = {
  "완료": "green",
  "진행중": "blue",
  "계획": "gray",
  "보류": "yellow",
  "취소": "red"
};

/* ========= DOM ========= */
const $ = (id) => document.getElementById(id);

const saveStatusEl = $("saveStatus");

const uploadModal = $("uploadModal");
const btnOpenUpload = $("btnOpenUpload");
const btnCloseUpload = $("btnCloseUpload");
const inputUpload = $("inputUpload");

const btnExport = $("btnExport");
const inputImport = $("inputImport");

const btnToggleAdd = $("btnToggleAdd");
const addForm = $("addForm");

const searchEl = $("searchTerm");
const sortEl = $("sortBy");
const filterCategoryEl = $("filterCategory");
const filterProjectEl = $("filterProject");
const filterStatusEl = $("filterStatus");

const newName = $("newName");
const newType = $("newType");
const newCategory = $("newCategory");
const newProject = $("newProject");
const newTags = $("newTags");
const btnAddFile = $("btnAddFile");

const fileListEl = $("fileList");

const emptyState = $("emptyState");
const detailView = $("detailView");
const detailName = $("detailName");
const btnToggleImportant = $("btnToggleImportant");
const btnCopy = $("btnCopy");
const copyText = $("copyText");

const detailType = $("detailType");
const detailCategory = $("detailCategory");
const detailDate = $("detailDate");
const detailSize = $("detailSize");

const projectBadge = $("projectBadge");
const detailProject = $("detailProject");

const statusButtons = $("statusButtons");

const memoView = $("memoView");
const memoEdit = $("memoEdit");
const btnEditMemo = $("btnEditMemo");
const memoEditActions = $("memoEditActions");
const btnSaveMemo = $("btnSaveMemo");
const btnCancelMemo = $("btnCancelMemo");

const codeArea = $("codeArea");

const statAll = $("statAll");
const statPlan = $("statPlan");
const statDoing = $("statDoing");
const statDone = $("statDone");
const statHoldCancel = $("statHoldCancel");

/* ========= Utils ========= */
function showSaved() {
  saveStatusEl.textContent = "✓ 저장됨";
  setTimeout(() => (saveStatusEl.textContent = ""), 1500);
}

function formatFileSize(bytes) {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const v = Math.round((bytes / Math.pow(k, i)) * 100) / 100;
  return `${v} ${sizes[i]}`;
}

function getFileIcon(type) {
  const iconMap = {
    HTML:"🌐", CSS:"🎨", JavaScript:"⚡", TypeScript:"💙", Python:"🐍",
    Java:"☕", "C++":"🔷", "C#":"🔶", PHP:"🐘", Ruby:"💎", Go:"🐹",
    JSON:"📋", XML:"📋", SQL:"🗄️", TXT:"📝", MD:"📖",
    PDF:"📄", DOC:"📘", DOCX:"📘", XLS:"📊", XLSX:"📊", PPT:"📽️", PPTX:"📽️",
    ZIP:"📦", RAR:"📦", "7Z":"📦", TAR:"📦", GZ:"📦",
    EXE:"⚙️", DLL:"🔧", MSI:"💿", APP:"📱", APK:"🤖",
    JPG:"🖼️", JPEG:"🖼️", PNG:"🖼️", GIF:"🎞️", SVG:"🎨", BMP:"🖼️", WEBP:"🖼️", ICO:"🎯",
    MP4:"🎬", AVI:"🎬", MOV:"🎬", WMV:"🎬", MP3:"🎵", WAV:"🎵",
    CRX:"🧩", XPI:"🧩", CRDOWNLOAD:"⬇️",
    BAT:"⚡", SH:"⚡", CMD:"⚡", PS1:"⚡",
    INI:"⚙️", CFG:"⚙️", CONF:"⚙️", ENV:"🔐"
  };
  return iconMap[type] || "📄";
}

function setSelected(id) {
  selectedId = id;
  render();
}

function getSelectedFile() {
  return files.find(f => f.id === selectedId) || null;
}

function updateFile(id, patch) {
  files = files.map(f => (f.id === id ? { ...f, ...patch } : f));
  saveFiles(files);
  showSaved();
}

function removeFile(id) {
  files = files.filter(f => f.id !== id);
  if (selectedId === id) selectedId = null;
  saveFiles(files);
  showSaved();
}

function buildCategories() {
  const set = new Set(files.map(f => f.category).filter(Boolean));
  return ["전체", ...Array.from(set)];
}
function buildProjects() {
  const set = new Set(files.map(f => f.project).filter(Boolean));
  return ["전체", ...Array.from(set)];
}

function filteredAndSortedFiles() {
  const s = searchTerm.trim().toLowerCase();

  const list = files.filter(file => {
    const matchesSearch =
      file.name.toLowerCase().includes(s) ||
      (file.project || "").toLowerCase().includes(s) ||
      (file.tags || []).some(t => (t || "").toLowerCase().includes(s));

    const matchesCategory = filterCategory === "전체" || file.category === filterCategory;
    const matchesProject = filterProject === "전체" || file.project === filterProject;
    const matchesStatus = filterStatus === "전체" || file.status === filterStatus;

    return matchesSearch && matchesCategory && matchesProject && matchesStatus;
  });

  list.sort((a, b) => {
    if (sortBy === "date") return new Date(b.date) - new Date(a.date);
    if (sortBy === "name") return a.name.localeCompare(b.name);
    if (sortBy === "important") return (b.isImportant ? 1 : 0) - (a.isImportant ? 1 : 0);
    return 0;
  });

  return list;
}

/* ========= Render ========= */
function renderFilters() {
  // types
  newType.innerHTML = fileTypes.map(t => `<option value="${t}">${t}</option>`).join("");

  // categories
  const cats = buildCategories();
  filterCategoryEl.innerHTML = cats
    .map(c => `<option value="${escapeHtml(c)}">${c === "전체" ? "모든 카테고리" : c}</option>`)
    .join("");

  // projects
  const projs = buildProjects();
  filterProjectEl.innerHTML = projs
    .map(p => `<option value="${escapeHtml(p)}">${p === "전체" ? "모든 프로젝트" : p}</option>`)
    .join("");

  // keep current selections if still exist
  if (!cats.includes(filterCategory)) filterCategory = "전체";
  if (!projs.includes(filterProject)) filterProject = "전체";

  filterCategoryEl.value = filterCategory;
  filterProjectEl.value = filterProject;
  filterStatusEl.value = filterStatus;
  sortEl.value = sortBy;
}

function renderList() {
  const list = filteredAndSortedFiles();

  if (!list.length) {
    fileListEl.innerHTML = `<div class="muted" style="padding:8px 2px;">표시할 파일이 없습니다.</div>`;
    return;
  }

  fileListEl.innerHTML = list.map(file => {
    const selected = file.id === selectedId;
    const chipClass = statusColorClass[file.status] || "gray";
    const star = file.isImportant
      ? `<i data-lucide="star" class="file-star"></i>`
      : "";

    return `
      <div class="file-item ${selected ? "selected" : ""}" role="listitem" data-id="${file.id}">
        <div class="file-top">
          <div class="file-main">
            ${star}
            <span class="file-emoji">${getFileIcon(file.type)}</span>
            <div class="minw0">
              <p class="file-name" title="${escapeHtml(file.name)}">${escapeHtml(file.name)}</p>
              <p class="file-type">${escapeHtml(file.type)}</p>
            </div>
          </div>
          <button class="delete-btn" data-action="delete" data-id="${file.id}" title="삭제">
            <i data-lucide="trash-2"></i>
          </button>
        </div>
        <div class="file-bottom">
          <span class="chip ${chipClass}">${escapeHtml(file.status)}</span>
          <span class="muted">${escapeHtml(file.fileSize || "")}</span>
        </div>
      </div>
    `;
  }).join("");
}

function renderDetail() {
  const file = getSelectedFile();

  if (!file) {
    emptyState.classList.remove("hidden");
    detailView.classList.add("hidden");
    return;
  }

  emptyState.classList.add("hidden");
  detailView.classList.remove("hidden");

  detailName.textContent = file.name || "";
  detailType.textContent = file.type || "";
  detailCategory.textContent = file.category || "";
  detailDate.textContent = file.date || "";
  detailSize.textContent = file.fileSize || "";

  if (file.project) {
    projectBadge.classList.remove("hidden");
    detailProject.textContent = `프로젝트: ${file.project}`;
  } else {
    projectBadge.classList.add("hidden");
    detailProject.textContent = "";
  }

  // important
  btnToggleImportant.classList.toggle("on", !!file.isImportant);

  // memo
  if (!memoEditing) {
    memoView.textContent = file.memo ? file.memo : "메모 없음";
    memoView.classList.remove("hidden");
    memoEdit.classList.add("hidden");
    memoEditActions.classList.add("hidden");
    btnEditMemo.classList.remove("hidden");
  } else {
    memoEdit.value = file.memo || "";
    memoView.classList.add("hidden");
    memoEdit.classList.remove("hidden");
    memoEditActions.classList.remove("hidden");
    btnEditMemo.classList.add("hidden");
  }

  // code
  codeArea.value = file.code || "";

  // status buttons
  statusButtons.innerHTML = statusOptions.map(s => {
    const active = file.status === s;
    const chipClass = statusColorClass[s] || "gray";
    return `
      <button class="status-btn ${active ? "active" : ""}" data-action="status" data-status="${s}"
        style="${active ? statusInlineStyle(chipClass) : ""}">
        ${s}
      </button>
    `;
  }).join("");
}

function statusInlineStyle(chip) {
  // 활성 버튼은 chip 색감과 맞춰서 배경/글자만 살짝
  const map = {
    green: "background:#eaf7ee;color:#0f6a2e;border-color:transparent;",
    blue: "background:#e9f2ff;color:#1e4fb8;border-color:transparent;",
    gray: "background:#f3f4f6;color:#374151;border-color:transparent;",
    yellow:"background:#fff7e6;color:#8a5a00;border-color:transparent;",
    red:  "background:#ffecec;color:#9f1c1c;border-color:transparent;"
  };
  return map[chip] || map.gray;
}

function renderStats() {
  statAll.textContent = String(files.length);
  statPlan.textContent = String(files.filter(f => f.status === "계획").length);
  statDoing.textContent = String(files.filter(f => f.status === "진행중").length);
  statDone.textContent = String(files.filter(f => f.status === "완료").length);
  statHoldCancel.textContent = String(files.filter(f => f.status === "보류" || f.status === "취소").length);
}

function render() {
  renderFilters();
  renderList();
  renderDetail();
  renderStats();
  lucide.createIcons(); // redraw icons
}

/* ========= Events ========= */
btnToggleAdd.addEventListener("click", () => {
  addForm.classList.toggle("hidden");
});

searchEl.addEventListener("input", (e) => {
  searchTerm = e.target.value || "";
  renderList();
  lucide.createIcons();
});

sortEl.addEventListener("change", (e) => {
  sortBy = e.target.value;
  renderList();
  lucide.createIcons();
});

filterCategoryEl.addEventListener("change", (e) => {
  filterCategory = e.target.value;
  renderList();
  lucide.createIcons();
});

filterProjectEl.addEventListener("change", (e) => {
  filterProject = e.target.value;
  renderList();
  lucide.createIcons();
});

filterStatusEl.addEventListener("change", (e) => {
  filterStatus = e.target.value;
  renderList();
  lucide.createIcons();
});

btnAddFile.addEventListener("click", () => {
  const name = (newName.value || "").trim();
  if (!name) {
    alert("파일명을 입력해주세요!");
    return;
  }

  const file = {
    id: Date.now(),
    name,
    type: newType.value,
    category: (newCategory.value || "").trim(),
    project: (newProject.value || "").trim(),
    code: "",
    tags: (newTags.value || "")
      .split(",")
      .map(t => t.trim())
      .filter(Boolean),
    status: "계획",
    memo: "",
    date: new Date().toISOString().split("T")[0],
    fileSize: "0 bytes",
    isImportant: false,
    relatedFiles: []
  };

  files = [...files, file];
  saveFiles(files);
  showSaved();

  // reset inputs
  newName.value = "";
  newType.value = "HTML";
  newCategory.value = "";
  newProject.value = "";
  newTags.value = "";

  addForm.classList.add("hidden");
  render();
});

fileListEl.addEventListener("click", (e) => {
  const delBtn = e.target.closest("[data-action='delete']");
  if (delBtn) {
    const id = Number(delBtn.getAttribute("data-id"));
    removeFile(id);
    render();
    return;
  }

  const item = e.target.closest(".file-item");
  if (!item) return;

  const id = Number(item.getAttribute("data-id"));
  setSelected(id);
});

btnToggleImportant.addEventListener("click", () => {
  const file = getSelectedFile();
  if (!file) return;
  updateFile(file.id, { isImportant: !file.isImportant });
  render();
});

statusButtons.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-action='status']");
  if (!btn) return;
  const file = getSelectedFile();
  if (!file) return;

  const status = btn.getAttribute("data-status");
  updateFile(file.id, { status });
  render();
});

btnEditMemo.addEventListener("click", () => {
  memoEditing = true;
  renderDetail();
  lucide.createIcons();
});

btnCancelMemo.addEventListener("click", () => {
  memoEditing = false;
  renderDetail();
  lucide.createIcons();
});

btnSaveMemo.addEventListener("click", () => {
  const file = getSelectedFile();
  if (!file) return;

  updateFile(file.id, { memo: memoEdit.value });
  memoEditing = false;
  renderDetail();
  lucide.createIcons();
});

codeArea.addEventListener("input", (e) => {
  const file = getSelectedFile();
  if (!file) return;
  updateFile(file.id, { code: e.target.value });
});

btnCopy.addEventListener("click", async () => {
  const file = getSelectedFile();
  if (!file) return;

  try {
    await navigator.clipboard.writeText(file.code || "");
    copyText.textContent = "복사됨";
    btnCopy.querySelector("i").setAttribute("data-lucide", "check");
    lucide.createIcons();

    clearTimeout(copyTimer);
    copyTimer = setTimeout(() => {
      copyText.textContent = "복사";
      btnCopy.querySelector("i").setAttribute("data-lucide", "copy");
      lucide.createIcons();
    }, 2000);
  } catch {
    alert("클립보드 복사에 실패했습니다.");
  }
});

/* ========= Upload Modal ========= */
btnOpenUpload.addEventListener("click", () => {
  uploadModal.classList.remove("hidden");
});
btnCloseUpload.addEventListener("click", () => {
  uploadModal.classList.add("hidden");
  inputUpload.value = "";
});
uploadModal.addEventListener("click", (e) => {
  if (e.target === uploadModal) {
    uploadModal.classList.add("hidden");
    inputUpload.value = "";
  }
});

inputUpload.addEventListener("change", (e) => {
  const uploaded = Array.from(e.target.files || []);
  if (!uploaded.length) return;

  uploaded.forEach((file, idx) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      const ext = (file.name.split(".").pop() || "").toUpperCase();

      const isTextExt = [
        "HTML","CSS","JS","TXT","JSON","XML","MD","PY","JAVA","CPP","C","CS",
        "PHP","RB","GO","RS","TS","SQL"
      ].includes(ext);

      const uniqueId = Date.now() + idx + Math.floor(Math.random() * 10000);

      const newFileObj = {
        id: uniqueId,
        name: file.name,
        type: ext || "기타",
        category: "업로드",
        project: "새 프로젝트",
        code: isTextExt ? String(event.target.result || "") : `[${ext} 파일 - 미리보기 불가]`,
        tags: [(ext || "etc").toLowerCase(), "업로드"],
        date: new Date().toISOString().split("T")[0],
        status: "계획",
        fileSize: formatFileSize(file.size),
        isImportant: false,
        memo: `업로드: ${file.name}`,
        relatedFiles: []
      };

      files = [...files, newFileObj];
      saveFiles(files);
      showSaved();
      render();
    };

    const isTextFile =
      file.type.startsWith("text/") ||
      /\.(html|css|js|json|xml|txt|md|py|java|cpp|c|cs|php|rb|go|rs|ts|sql)$/i.test(file.name);

    if (isTextFile) reader.readAsText(file);
    else reader.readAsDataURL(file);
  });

  e.target.value = "";
  uploadModal.classList.add("hidden");
});

/* ========= Export / Import ========= */
btnExport.addEventListener("click", () => {
  const dataStr = JSON.stringify(files, null, 2);
  const blob = new Blob([dataStr], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = `프로젝트_백업_${new Date().toISOString().split("T")[0]}.json`;
  a.click();

  URL.revokeObjectURL(url);
});

inputImport.addEventListener("change", (e) => {
  const file = e.target.files && e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (ev) => {
    try {
      const imported = JSON.parse(String(ev.target.result || ""));
      if (!Array.isArray(imported)) throw new Error("not array");
      files = imported;
      saveFiles(files);
      showSaved();
      alert("✓ 데이터를 성공적으로 불러왔습니다!");
      selectedId = null;
      memoEditing = false;
      render();
    } catch {
      alert("✗ 파일 형식이 올바르지 않습니다.");
    }
  };
  reader.readAsText(file);
  e.target.value = "";
});

/* ========= Safety HTML escape for select options ========= */
function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

/* ========= Init ========= */
render();
