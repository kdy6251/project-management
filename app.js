(() => {
  const STORAGE_FILES = "pm_files";
  const STORAGE_TRASH = "pm_trash";

  const $ = (id) => document.getElementById(id);
  const todayISO = () => new Date().toISOString().split("T")[0];

  const safeParse = (v, d) => { try { return JSON.parse(v); } catch { return d; } };
  const loadLS = (k, d) => safeParse(localStorage.getItem(k), d);
  const saveLS = (k, v) => localStorage.setItem(k, JSON.stringify(v));

  const uniqueName = (name, project, files) => {
    const base = (name || "").trim();
    const exists = (n) => files.some(f => (f.project||"") === (project||"") && f.name === n);
    if (!exists(base)) return base;

    const dot = base.lastIndexOf(".");
    const stem = dot > 0 ? base.slice(0, dot) : base;
    const ext  = dot > 0 ? base.slice(dot) : "";
    let i = 1;
    while (exists(`${stem} (${i})${ext}`)) i++;
    return `${stem} (${i})${ext}`;
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return "0 bytes";
    const k = 1024, sizes = ["bytes","KB","MB","GB"];
    const i = Math.floor(Math.log(bytes)/Math.log(k));
    const v = bytes / Math.pow(k, i);
    return (i === 0 ? Math.round(v) : v.toFixed(1)) + " " + sizes[i];
  };

  const iconForType = (type) => {
    const t = String(type||"").toUpperCase();
    if (t === "HTML") return "🌐";
    if (t === "CSS") return "🎨";
    if (t === "JS" || t === "JAVASCRIPT") return "⚡";
    if (t === "JSON") return "📋";
    return "📄";
  };

  const state = {
    files: [],
    trash: [],
    selectedId: null,
    trashSelectedId: null,
    viewMode: "files", // files | trash

    draft: "",
    dirty: false,

    search: "",
    sort: "date",
    filterCategory: "전체",
    filterProject: "전체",
    filterStatus: "전체",
  };

  const defaultFiles = () => ([
    {
      id: 1,
      name: "index.html",
      type: "HTML",
      category: "메인페이지",
      project: "학생 소통 사이트",
      code: "<!doctype html>\n<html>\n<head><title>학생 소통 사이트</title></head>\n<body><h1>환영합니다!</h1></body>\n</html>",
      tags: ["메인"],
      date: todayISO(),
      status: "계획",
      fileSize: "0 bytes",
      isImportant: false,
      memo: "",
      relatedFiles: []
    }
  ]);

  const dom = {
    // top status
    saveStatus: $("saveStatus"),

    // left
    fileList: $("fileList"),
    searchInput: $("searchInput"),
    sortSelect: $("sortSelect"),
    categorySelect: $("categorySelect"),
    projectSelect: $("projectSelect"),
    statusSelect: $("statusSelect"),

    toggleAddFormBtn: $("toggleAddFormBtn"),
    addForm: $("addForm"),
    addFileBtn: $("addFileBtn"),
    newFileName: $("newFileName"),
    newFileType: $("newFileType"),
    newFileCategory: $("newFileCategory"),
    newFileProject: $("newFileProject"),

    openTrashBtn: $("openTrashBtn"),
    trashCount: $("trashCount"),

    // right
    emptyState: $("emptyState"),
    detailView: $("detailView"),

    detailName: $("detailName"),
    detailType: $("detailType"),
    detailDate: $("detailDate"),
    detailCategory: $("detailCategory"),
    detailSize: $("detailSize"),
    detailProjectWrap: $("detailProjectWrap"),
    detailProject: $("detailProject"),

    toggleImportantBtn: $("toggleImportantBtn"),
    statusButtons: $("statusButtons"),

    memoView: $("memoView"),
    memoEdit: $("memoEdit"),
    editMemoBtn: $("editMemoBtn"),
    saveMemoBtn: $("saveMemoBtn"),
    cancelMemoBtn: $("cancelMemoBtn"),

    codeEditor: $("codeEditor"),
    saveBtn: $("saveBtn"),
    discardBtn: $("discardBtn"),
    downloadBtn: $("downloadBtn"),
    copyBtn: $("copyBtn"),

    // modals
    saveConfirmModal: $("saveConfirmModal"),
    confirmSaveBtn: $("confirmSaveBtn"),
    cancelSaveBtn: $("cancelSaveBtn"),
    closeSaveConfirmModal: $("closeSaveConfirmModal"),

    deleteConfirmModal: $("deleteConfirmModal"),
    confirmDeleteBtn: $("confirmDeleteBtn"),
    cancelDeleteBtn: $("cancelDeleteBtn"),
    closeDeleteConfirmModal: $("closeDeleteConfirmModal"),

    trashModal: $("trashModal"),
    trashList: $("trashList"),
    closeTrashModal: $("closeTrashModal"),
    trashModalCloseBtn: $("trashModalCloseBtn"),

    uploadModal: $("uploadModal"),
    openUploadBtn: $("openUploadBtn"),
    uploadInput: $("uploadInput"),
    closeUploadModal: $("closeUploadModal"),
    uploadModalCloseBtn: $("uploadModalCloseBtn"),

    exportBtn: $("exportBtn"),
    importInput: $("importInput"),
  };

  let saveTimer = null;
  const showSaved = (text = "✓ 저장됨") => {
    if (!dom.saveStatus) return;
    dom.saveStatus.textContent = text;
    dom.saveStatus.style.display = "block";
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => (dom.saveStatus.style.display = "none"), 1200);
  };

  const renderTrashCount = () => {
    if (!dom.trashCount) return;
    dom.trashCount.textContent = String(state.trash.length);
  };

  const load = () => {
    const files = loadLS(STORAGE_FILES, null);
    const trash = loadLS(STORAGE_TRASH, []);
    state.files = Array.isArray(files) ? files : defaultFiles();
    state.trash = Array.isArray(trash) ? trash : [];
  };

  const save = () => {
    saveLS(STORAGE_FILES, state.files);
    saveLS(STORAGE_TRASH, state.trash);
    renderTrashCount();          // ✅ 휴지통 숫자 항상 갱신
    showSaved();
  };

  const selectedFile = () => {
    if (state.viewMode === "files") return state.files.find(f => f.id === state.selectedId) || null;
    return state.trash.find(t => t.id === state.trashSelectedId) || null;
  };

  const refreshFilterOptions = () => {
    const categories = ["전체", ...new Set(state.files.map(f => f.category).filter(Boolean))];
    const projects = ["전체", ...new Set(state.files.map(f => f.project).filter(Boolean))];

    const fill = (sel, items, keepValue) => {
      if (!sel) return;
      const old = keepValue;
      sel.innerHTML = "";
      items.forEach(v => {
        const o = document.createElement("option");
        o.value = v;
        o.textContent = v === "전체" ? (sel.id === "categorySelect" ? "모든 카테고리"
                           : sel.id === "projectSelect" ? "모든 프로젝트"
                           : "전체")
                         : v;
        sel.appendChild(o);
      });
      sel.value = items.includes(old) ? old : "전체";
    };

    fill(dom.categorySelect, categories, state.filterCategory);
    fill(dom.projectSelect, projects, state.filterProject);
  };

  const filteredFiles = () => {
    const q = (state.search || "").trim().toLowerCase();

    let list = state.files.filter(f => {
      const hit =
        !q ||
        (f.name||"").toLowerCase().includes(q) ||
        (f.project||"").toLowerCase().includes(q) ||
        (f.category||"").toLowerCase().includes(q) ||
        (f.memo||"").toLowerCase().includes(q) ||
        (f.code||"").toLowerCase().includes(q) ||
        (f.tags||[]).some(t => String(t).toLowerCase().includes(q));

      if (!hit) return false;
      if (state.filterCategory !== "전체" && f.category !== state.filterCategory) return false;
      if (state.filterProject !== "전체" && f.project !== state.filterProject) return false;
      if (state.filterStatus !== "전체" && f.status !== state.filterStatus) return false;
      return true;
    });

    list.sort((a,b) => {
      if (state.sort === "date") return new Date(b.date) - new Date(a.date);
      if (state.sort === "name") return String(a.name).localeCompare(String(b.name));
      if (state.sort === "important") return (b.isImportant?1:0)-(a.isImportant?1:0);
      return 0;
    });

    return list;
  };

  const setDirty = (v) => {
    state.dirty = v;
    if (dom.saveBtn) dom.saveBtn.disabled = !v;
    if (dom.discardBtn) dom.discardBtn.disabled = !v;
  };

  const renderList = () => {
    if (!dom.fileList) return;
    dom.fileList.innerHTML = "";

    const list = state.viewMode === "files" ? filteredFiles() : state.trash;

    list.forEach(f => {
      const item = document.createElement("div");
      const active =
        (state.viewMode === "files" && state.selectedId === f.id) ||
        (state.viewMode === "trash" && state.trashSelectedId === f.id);

      item.className = "fileItem" + (active ? " active" : "");

      const delBtnHtml = (state.viewMode === "files")
        ? `<button class="delBtn" title="삭제" data-del="${f.id}">🗑</button>`
        : "";

      item.innerHTML = `
        <div style="flex:1; min-width:0;">
          <div class="fileLeft">
            <div class="fileIcon">${iconForType(f.type)}</div>
            <div style="min-width:0;">
              <div class="fileName">${escapeHtml((f.isImportant ? "⭐ " : "") + f.name)}</div>
              <div class="fileType">${escapeHtml(f.type || "")}</div>
            </div>
          </div>

          <div class="fileBottom">
            <span class="badge">${escapeHtml(f.status || "계획")}</span>
            <span class="fileSize">${escapeHtml(f.fileSize || "0 bytes")}</span>
          </div>
        </div>
        ${delBtnHtml}
      `;

      item.addEventListener("click", (e) => {
        if (e.target?.dataset?.del) return;
        if (state.viewMode === "files") state.selectedId = f.id;
        else state.trashSelectedId = f.id;
        renderList();
        renderDetail();
      });

      item.querySelector("[data-del]")?.addEventListener("click", (e) => {
        e.stopPropagation();
        requestDelete(f.id);
      });

      dom.fileList.appendChild(item);
    });
  };

  const renderStatusButtons = (f) => {
    if (!dom.statusButtons) return;
    const statuses = ["계획","진행중","완료","보류","취소"];
    dom.statusButtons.innerHTML = "";
    statuses.forEach(s => {
      const b = document.createElement("button");
      b.className = "statusBtn" + (f.status === s ? " active" : "");
      b.textContent = s;
      b.addEventListener("click", () => {
        if (state.viewMode === "trash") return;
        f.status = s;
        save();
        renderList();
        renderDetail();
      });
      dom.statusButtons.appendChild(b);
    });
  };

  const enterMemoEdit = () => {
    if (state.viewMode === "trash") return;
    dom.memoView.style.display = "none";
    dom.memoEdit.style.display = "block";
    dom.editMemoBtn.style.display = "none";
    dom.saveMemoBtn.style.display = "inline-grid";
    dom.cancelMemoBtn.style.display = "inline-grid";
  };

  const exitMemoEdit = () => {
    dom.memoView.style.display = "block";
    dom.memoEdit.style.display = "none";
    dom.editMemoBtn.style.display = "inline-grid";
    dom.saveMemoBtn.style.display = "none";
    dom.cancelMemoBtn.style.display = "none";
  };

  const renderDetail = () => {
    const f = selectedFile();
    if (!f) {
      dom.emptyState.style.display = "flex";
      dom.detailView.style.display = "none";
      return;
    }

    dom.emptyState.style.display = "none";
    dom.detailView.style.display = "block";

    dom.detailName.textContent = f.name;
    dom.detailType.textContent = f.type || "-";
    dom.detailDate.textContent = f.date || "-";
    dom.detailCategory.textContent = f.category || "-";
    dom.detailSize.textContent = f.fileSize || "0 bytes";

    if (f.project) {
      dom.detailProjectWrap.style.display = "block";
      dom.detailProject.textContent = f.project;
    } else {
      dom.detailProjectWrap.style.display = "none";
    }

    // important
    dom.toggleImportantBtn.textContent = f.isImportant ? "★" : "☆";

    // status
    renderStatusButtons(f);

    // memo
    dom.memoView.textContent = f.memo || "메모 없음";
    dom.memoEdit.value = f.memo || "";
    exitMemoEdit();

    // code
    dom.codeEditor.value = f.code || "";

    const isTrash = state.viewMode === "trash";
    dom.codeEditor.disabled = isTrash;
    dom.saveBtn.disabled = true;
    dom.discardBtn.disabled = true;
    dom.editMemoBtn.style.display = isTrash ? "none" : "inline-grid";

    if (!isTrash) {
      state.draft = f.code || "";
      setDirty(false);
    }
  };

  /* ---------- Delete -> Trash ---------- */
  let pendingDeleteId = null;

  const requestDelete = (id) => {
    pendingDeleteId = id;
    dom.deleteConfirmModal.style.display = "flex";
  };

  const closeDeleteModal = () => {
    dom.deleteConfirmModal.style.display = "none";
    pendingDeleteId = null;
  };

  const confirmDelete = () => {
    const idx = state.files.findIndex(f => f.id === pendingDeleteId);
    if (idx >= 0) {
      const removed = state.files.splice(idx, 1)[0];
      state.trash.unshift({ ...removed, deletedAt: new Date().toISOString() });
    }
    if (state.selectedId === pendingDeleteId) state.selectedId = null;

    save();               // ✅ 여기서 trashCount 갱신됨
    refreshFilterOptions();
    renderList();
    renderDetail();
    closeDeleteModal();
  };

  /* ---------- Trash Modal ---------- */
  const openTrash = () => {
    state.viewMode = "trash";
    state.trashSelectedId = null;
    dom.trashModal.style.display = "flex";
    renderList();      // 왼쪽 리스트가 휴지통 리스트로 바뀌면서 클릭하면 내용 확인 가능
    renderDetail();
    renderTrashModalList();
  };

  const closeTrash = () => {
    state.viewMode = "files";
    dom.trashModal.style.display = "none";
    renderList();
    renderDetail();
  };

  const renderTrashModalList = () => {
    if (!dom.trashList) return;
    dom.trashList.innerHTML = "";

    if (state.trash.length === 0) {
      dom.trashList.innerHTML = `<div class="trashItem"><div class="trashMeta">휴지통이 비어있어요.</div></div>`;
      return;
    }

    state.trash.forEach(t => {
      const el = document.createElement("div");
      el.className = "trashItem";
      el.innerHTML = `
        <div class="trashTitle">${escapeHtml(t.name)}</div>
        <div class="trashMeta">삭제일: ${escapeHtml((t.deletedAt||"").slice(0,10) || "-")}</div>
        <div class="trashActions">
          <button class="btn btn-solid btn-dark" data-restore="${t.id}">복원</button>
          <button class="btn btn-solid btn-red" data-remove="${t.id}">영구삭제</button>
        </div>
      `;
      dom.trashList.appendChild(el);
    });
  };

  const restoreFromTrash = (id) => {
    const t = state.trash.find(x => x.id === id);
    if (!t) return;

    t.name = uniqueName(t.name, t.project, state.files);
    delete t.deletedAt;
    state.files.push(t);
    state.trash = state.trash.filter(x => x.id !== id);

    save(); // ✅ trashCount 갱신
    refreshFilterOptions();
    renderTrashModalList();
    renderList();
    renderDetail();
  };

  const removeForever = (id) => {
    state.trash = state.trash.filter(x => x.id !== id);
    save(); // ✅ trashCount 갱신
    renderTrashModalList();
    renderList();
    renderDetail();
  };

  /* ---------- Export / Import ---------- */
  const exportData = () => {
    const dataStr = JSON.stringify(state.files, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `프로젝트_백업_${todayISO()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importData = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const imported = JSON.parse(e.target.result);
        if (!Array.isArray(imported)) throw new Error("not array");
        state.files = imported;
        state.selectedId = null;

        save();
        refreshFilterOptions();
        renderList();
        renderDetail();
        alert("✓ 데이터를 성공적으로 불러왔습니다!");
      } catch {
        alert("✗ 파일 형식이 올바르지 않습니다.");
      }
    };
    reader.readAsText(file);
  };

  /* ---------- Upload ---------- */
  const openUpload = () => dom.uploadModal.style.display = "flex";
  const closeUpload = () => dom.uploadModal.style.display = "none";

  const handleUpload = (files) => {
    [...files].forEach((file, idx) => {
      const ext = (file.name.split(".").pop() || "").toUpperCase();
      const isText = file.type.startsWith("text/") || /\.(html|css|js|json|txt|md)$/i.test(file.name);
      const reader = new FileReader();

      reader.onload = (ev) => {
        const id = Date.now() + idx + Math.floor(Math.random()*10000);
        const obj = {
          id,
          name: uniqueName(file.name, "업로드", state.files),
          type: ext || "기타",
          category: "업로드",
          project: "업로드",
          code: isText ? String(ev.target.result || "") : `[${ext || "파일"} - 미리보기 불가]`,
          tags: [String(ext||"file").toLowerCase(), "업로드"],
          date: todayISO(),
          status: "계획",
          fileSize: formatFileSize(file.size),
          isImportant: false,
          memo: `업로드: ${file.name}`,
          relatedFiles: []
        };
        state.files.push(obj);

        save();
        refreshFilterOptions();
        renderList();
      };

      if (isText) reader.readAsText(file);
      else reader.readAsArrayBuffer(file);
    });

    closeUpload();
  };

  /* ---------- Utils ---------- */
  function escapeHtml(str){
    return String(str ?? "")
      .replaceAll("&","&amp;")
      .replaceAll("<","&lt;")
      .replaceAll(">","&gt;")
      .replaceAll('"',"&quot;")
      .replaceAll("'","&#039;");
  }

  /* ---------- Bind ---------- */
  const bind = () => {
    dom.searchInput.addEventListener("input", (e) => {
      state.search = e.target.value || "";
      renderList();
    });

    dom.sortSelect.addEventListener("change", (e) => {
      state.sort = e.target.value;
      renderList();
    });

    dom.categorySelect.addEventListener("change", (e) => {
      state.filterCategory = e.target.value;
      renderList();
    });

    dom.projectSelect.addEventListener("change", (e) => {
      state.filterProject = e.target.value;
      renderList();
    });

    dom.statusSelect.addEventListener("change", (e) => {
      state.filterStatus = e.target.value;
      renderList();
    });

    dom.toggleAddFormBtn.addEventListener("click", () => {
      dom.addForm.style.display = dom.addForm.style.display === "none" ? "grid" : "none";
    });

    dom.addFileBtn.addEventListener("click", () => {
      const nameRaw = dom.newFileName.value.trim();
      if (!nameRaw) return alert("파일명을 입력해주세요!");

      const project = dom.newFileProject.value.trim() || "";
      const name = uniqueName(nameRaw, project, state.files);

      state.files.push({
        id: Date.now(),
        name,
        type: dom.newFileType.value,
        category: dom.newFileCategory.value.trim() || "",
        project,
        code: "",
        tags: [],
        date: todayISO(),
        status: "계획",
        fileSize: "0 bytes",
        isImportant: false,
        memo: "",
        relatedFiles: []
      });

      dom.newFileName.value = "";
      dom.newFileCategory.value = "";
      dom.newFileProject.value = "";

      save();
      refreshFilterOptions();
      renderList();
    });

    dom.toggleImportantBtn.addEventListener("click", () => {
      const f = selectedFile();
      if (!f || state.viewMode === "trash") return;
      f.isImportant = !f.isImportant;
      save();
      renderList();
      renderDetail();
    });

    // memo
    dom.editMemoBtn.addEventListener("click", enterMemoEdit);
    dom.cancelMemoBtn.addEventListener("click", exitMemoEdit);
    dom.saveMemoBtn.addEventListener("click", () => {
      const f = selectedFile();
      if (!f || state.viewMode === "trash") return;
      f.memo = dom.memoEdit.value;
      save();
      renderDetail();
      renderList();
    });

    // code draft
    dom.codeEditor.addEventListener("input", (e) => {
      if (state.viewMode === "trash") return;
      const f = selectedFile();
      if (!f) return;
      state.draft = e.target.value;
      setDirty(state.draft !== (f.code || ""));
    });

    dom.discardBtn.addEventListener("click", () => {
      if (state.viewMode === "trash") return;
      const f = selectedFile();
      if (!f) return;
      state.draft = f.code || "";
      dom.codeEditor.value = state.draft;
      setDirty(false);
    });

    dom.saveBtn.addEventListener("click", () => {
      if (state.viewMode === "trash") return;
      if (!state.dirty) return;
      dom.saveConfirmModal.style.display = "flex";
    });

    const closeSaveModal = () => dom.saveConfirmModal.style.display = "none";
    dom.cancelSaveBtn.addEventListener("click", closeSaveModal);
    dom.closeSaveConfirmModal.addEventListener("click", closeSaveModal);

    dom.confirmSaveBtn.addEventListener("click", () => {
      const f = selectedFile();
      if (!f || state.viewMode === "trash") return closeSaveModal();
      f.code = state.draft;
      f.fileSize = `${(f.code?.length || 0)} bytes`;
      save();
      setDirty(false);
      closeSaveModal();
      renderList();
      renderDetail();
    });

    // delete confirm
    dom.cancelDeleteBtn.addEventListener("click", closeDeleteModal);
    dom.closeDeleteConfirmModal.addEventListener("click", closeDeleteModal);
    dom.confirmDeleteBtn.addEventListener("click", confirmDelete);

    // trash
    dom.openTrashBtn.addEventListener("click", openTrash);
    dom.closeTrashModal.addEventListener("click", closeTrash);
    dom.trashModalCloseBtn.addEventListener("click", closeTrash);

    dom.trashList.addEventListener("click", (e) => {
      const r = e.target?.dataset?.restore ? Number(e.target.dataset.restore) : null;
      const x = e.target?.dataset?.remove ? Number(e.target.dataset.remove) : null;
      if (r) restoreFromTrash(r);
      if (x) removeForever(x);
    });

    // upload
    dom.openUploadBtn.addEventListener("click", openUpload);
    dom.closeUploadModal.addEventListener("click", closeUpload);
    dom.uploadModalCloseBtn.addEventListener("click", closeUpload);
    dom.uploadInput.addEventListener("change", (e) => {
      if (e.target.files?.length) handleUpload(e.target.files);
      e.target.value = "";
    });

    // export/import
    dom.exportBtn.addEventListener("click", exportData);
    dom.importInput.addEventListener("change", (e) => {
      const f = e.target.files?.[0];
      if (f) importData(f);
      e.target.value = "";
    });

    // copy/download
    dom.copyBtn.addEventListener("click", async () => {
      const f = selectedFile();
      if (!f) return;
      await navigator.clipboard.writeText(f.code || "");
      showSaved("✓ 복사됨");
    });

    dom.downloadBtn.addEventListener("click", () => {
      const f = selectedFile();
      if (!f) return;
      const blob = new Blob([f.code || ""], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = f.name || "file.txt";
      a.click();
      URL.revokeObjectURL(url);
    });
  };

  /* ---------- Init ---------- */
  load();
  bind();
  refreshFilterOptions();
  renderTrashCount();
  renderList();
  renderDetail();
})();
