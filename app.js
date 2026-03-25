const fileInput = document.getElementById("fileInput");
const folderInput = document.getElementById("folderInput");
const reportInput = document.getElementById("reportInput");
const sourceInput = document.getElementById("sourceInput");
const analyzeButton = document.getElementById("analyzeButton");
const sampleButton = document.getElementById("sampleButton");
const resetButton = document.getElementById("resetButton");
const progressPanel = document.getElementById("progressPanel");
const progressTitle = document.getElementById("progressTitle");
const progressStageLabel = document.getElementById("progressStageLabel");
const readProgressPercent = document.getElementById("readProgressPercent");
const readProgressFill = document.getElementById("readProgressFill");
const indexProgressPercent = document.getElementById("indexProgressPercent");
const indexProgressFill = document.getElementById("indexProgressFill");
const renderProgressPercent = document.getElementById("renderProgressPercent");
const renderProgressFill = document.getElementById("renderProgressFill");
const progressMessage = document.getElementById("progressMessage");
const summaryCards = document.getElementById("summaryCards");
const datasetMeta = document.getElementById("datasetMeta");
const fileList = document.getElementById("fileList");
const fileListFooter = document.getElementById("fileListFooter");
const clearDocumentFilterButton = document.getElementById("clearDocumentFilterButton");
const saveSnapshotButton = document.getElementById("saveSnapshotButton");
const snapshotList = document.getElementById("snapshotList");
const compareBody = document.getElementById("compareBody");
const resultGrid = document.getElementById("resultGrid");
const searchInput = document.getElementById("searchInput");
const sortSelect = document.getElementById("sortSelect");
const activeScope = document.getElementById("activeScope");
const filterGroup = document.getElementById("filterGroup");
const fileTypeGroup = document.getElementById("fileTypeGroup");
const copyFilteredButton = document.getElementById("copyFilteredButton");
const copyAllButton = document.getElementById("copyAllButton");
const downloadCsvButton = document.getElementById("downloadCsvButton");
const detailTitle = document.getElementById("detailTitle");
const detailMeta = document.getElementById("detailMeta");
const detailBody = document.getElementById("detailBody");
const graphModal = document.getElementById("graphModal");
const graphModalBackdrop = document.getElementById("graphModalBackdrop");
const graphModalTitle = document.getElementById("graphModalTitle");
const graphModalMeta = document.getElementById("graphModalMeta");
const graphModalCanvas = document.getElementById("graphModalCanvas");
const graphModalCloseButton = document.getElementById("graphModalCloseButton");
const graphZoomOutButton = document.getElementById("graphZoomOutButton");
const graphZoomInButton = document.getElementById("graphZoomInButton");
const graphResetViewButton = document.getElementById("graphResetViewButton");

const summaryCardTemplate = document.getElementById("summaryCardTemplate");
const resultSectionTemplate = document.getElementById("resultSectionTemplate");

const { buildIndex, buildSummary, createEmptyIndex, getDocumentType, hydrateIndexFromSnapshot, serializeIndex } =
  window.SpringMinerIndexer;
const { buildDatasetMeta, buildDependencyGraphData, buildRelationGroups, buildRelatedMap, buildResultMap, buildScopeLabel, buildSummaryCards, getFilteredNames, getSelectedEntry, getUnfilteredNames, getVisibleOccurrences } =
  window.SpringMinerViewModel;

const categories = [
  { key: "classes", label: "클래스명" },
  { key: "methods", label: "메소드명" },
  { key: "variables", label: "변수명" },
  { key: "mappers", label: "매퍼명" },
  { key: "namespaces", label: "네임스페이스" },
  { key: "tables", label: "테이블명" },
  { key: "columns", label: "컬럼명" }
];

const categoryLabels = Object.fromEntries(categories.map((category) => [category.key, category.label]));
const fileTypes = [
  { key: "java", label: "Java" },
  { key: "xml", label: "XML" },
  { key: "sql", label: "SQL" },
  { key: "txt", label: "TXT" },
  { key: "mixed", label: "Mixed" }
];
const storageKey = "spring-miner-snapshots";
const supportedAnalysisTypes = new Set(["java", "xml", "sql", "txt", "mixed"]);

const sampleSource = `
package com.inhouse.member.service;

public class MemberService {
    private final MemberMapper memberMapper;
    private String memberStatus;

    public MemberDetail getMemberDetail(Long memberId) {
        return memberMapper.selectMemberDetail(memberId);
    }
}

<mapper namespace="com.inhouse.member.mapper.MemberMapper">
    <select id="selectMemberDetail" resultType="MemberDetail">
        SELECT MEMBER_ID, MEMBER_NAME, MEMBER_STATUS
        FROM TB_MEMBER
        WHERE MEMBER_ID = #{memberId}
    </select>
</mapper>

CREATE TABLE TB_MEMBER_AUDIT (
    AUDIT_ID BIGINT PRIMARY KEY,
    MEMBER_ID BIGINT,
    CHANGED_AT TIMESTAMP,
    CHANGED_BY VARCHAR(50)
);
`;

const appState = {
  index: createEmptyIndex(),
  indexRevision: 0,
  resultMapCache: null,
  resultMapRevision: -1,
  analysisMeta: null,
  isAnalyzing: false,
  searchKeyword: "",
  sortMode: "count",
  activeCategories: new Set(categories.map((category) => category.key)),
  activeFileTypes: new Set(fileTypes.map((type) => type.key)),
  categoryVisibleCounts: {},
  categoryCollapsed: {},
  detailVisibleCount: 0,
  documentListVisibleCount: 0,
  selectedDocumentPath: null,
  selectedItem: null,
  compareSnapshotId: null,
  graphModalState: null
};

analyzeButton.addEventListener("click", analyzeSources);
sampleButton.addEventListener("click", () => {
  resetProgressState();
  sourceInput.value = sampleSource.trim();
  analyzeSources();
});
resetButton.addEventListener("click", resetAll);
fileInput.addEventListener("change", () => {
  if (!appState.isAnalyzing) {
    resetProgressState();
  }
});
folderInput.addEventListener("change", () => {
  if (!appState.isAnalyzing) {
    resetProgressState();
  }
});
reportInput.addEventListener("change", () => {
  if (!appState.isAnalyzing) {
    resetProgressState();
  }
});
sourceInput.addEventListener("input", () => {
  if (!appState.isAnalyzing) {
    resetProgressState();
  }
});
searchInput.addEventListener("input", (event) => {
  appState.searchKeyword = event.target.value.trim().toLowerCase();
  renderResults();
});
sortSelect.addEventListener("change", (event) => {
  appState.sortMode = event.target.value;
  renderResults();
});
copyFilteredButton.addEventListener("click", () => copyResults(true));
copyAllButton.addEventListener("click", () => copyResults(false));
downloadCsvButton.addEventListener("click", downloadCsv);
saveSnapshotButton.addEventListener("click", saveCurrentSnapshot);
clearDocumentFilterButton.addEventListener("click", () => {
  appState.selectedDocumentPath = null;
  renderSummary();
  renderResults();
});
graphModalCloseButton.addEventListener("click", closeGraphModal);
graphModalBackdrop.addEventListener("click", closeGraphModal);
graphZoomInButton.addEventListener("click", () => adjustGraphZoom(0.12));
graphZoomOutButton.addEventListener("click", () => adjustGraphZoom(-0.12));
graphResetViewButton.addEventListener("click", resetGraphZoom);
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !graphModal.hidden) {
    closeGraphModal();
  }
});

initializeFilters();
initializeFileTypeFilters();
renderEmptyState();
renderSnapshotList();

async function analyzeSources() {
  if (appState.isAnalyzing) {
    return;
  }

  const uploadedFiles = Array.from(fileInput.files || []);
  const folderFiles = Array.from(folderInput.files || []);
  const manualText = sourceInput.value.trim();
  const reportFile = reportInput.files?.[0];

  if (reportFile && !uploadedFiles.length && !manualText && !folderFiles.length) {
    await loadReportFile(reportFile);
    return;
  }

  if (!uploadedFiles.length && !manualText && !folderFiles.length) {
    alert("업로드한 파일 또는 붙여넣은 텍스트가 필요합니다.");
    return;
  }

  appState.isAnalyzing = true;
  setAnalyzingState(true);

  try {
    const documents = [];

    if (manualText) {
      documents.push({
        name: "manual-input.txt",
        content: manualText,
        type: "mixed",
        sourcePath: "manual-input.txt"
      });
      updateProgress({
        stage: "read",
        percent: 100,
        title: "입력 준비 완료",
        stageLabel: "파일 읽기",
        message: "붙여넣은 텍스트를 분석 대기열에 추가했습니다."
      });
      await yieldToBrowser();
    }

    const inputFiles = [...uploadedFiles, ...folderFiles];
    const readableFiles = inputFiles.filter(shouldAnalyzeFile);
    const skippedFiles = inputFiles.length - readableFiles.length;

    if (inputFiles.length && !readableFiles.length && !documents.length) {
      throw new Error("분석 가능한 파일이 없습니다. .java, .xml, .sql, .txt 파일만 읽을 수 있습니다.");
    }

    if (readableFiles.length) {
      for (let index = 0; index < readableFiles.length; index += 1) {
        const file = readableFiles[index];
        updateProgress({
          stage: "read",
          percent: calculateProgress(index + 1, readableFiles.length, 0, 100),
          title: "파일 읽는 중",
          stageLabel: "파일 읽기",
          message: buildReadingProgressMessage(index + 1, readableFiles.length, file, skippedFiles)
        });
        const documentEntry = await readFileAsText(file);
        documents.push(documentEntry);
        await yieldToBrowser();
      }
    }

    updateProgress({
      stage: "index",
      percent: 0,
      title: "인덱스 생성 시작",
      stageLabel: "인덱스 생성",
      message: `문서 ${documents.length}건을 심볼 인덱스로 변환하고 있습니다.`
    });

    setIndexState(await buildIndexWithWorker(documents));

    appState.analysisMeta = {
      source: "browser",
      analyzedAt: new Date().toISOString()
    };
    appState.selectedItem = null;

    updateProgress({
      stage: "render",
      percent: 15,
      title: "화면 구성 중",
      stageLabel: "화면 구성",
      message: "문서 목록과 결과 카드를 그리고 있습니다."
    });

    await renderAnalysisView();

    updateProgress({
      stage: "render",
      percent: 100,
      title: "분석 완료",
      stageLabel: "완료",
      message: `문서 ${documents.length}건 분석과 화면 구성을 마쳤습니다.`
    });

    renderComparePanel();
  } catch (error) {
    updateProgress({
      stage: "read",
      percent: 0,
      title: "분석 실패",
      stageLabel: "오류",
      message: error instanceof Error ? error.message : String(error)
    });
    alert(error instanceof Error ? error.message : "분석 중 오류가 발생했습니다.");
  } finally {
    appState.isAnalyzing = false;
    window.setTimeout(() => {
      if (!appState.isAnalyzing) {
        setAnalyzingState(false);
      }
    }, 500);
  }
}

function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      resolve({
        name: file.name,
        content: String(reader.result || ""),
        type: getDocumentType(file.name),
        sourcePath: file.webkitRelativePath || file.name
      });
    };

    reader.onerror = () => reject(reader.error);
    reader.readAsText(file, "utf-8");
  });
}

function shouldAnalyzeFile(file) {
  const extension = file.name.split(".").pop()?.toLowerCase();
  return Boolean(extension && ["java", "xml", "sql", "txt"].includes(extension));
}

function buildReadingProgressMessage(current, total, file, skippedFiles) {
  const parts = [`${current}/${total} · ${file.webkitRelativePath || file.name}`];

  if (skippedFiles > 0) {
    parts.push(`건너뜀 ${skippedFiles}건`);
  }

  return parts.join(" · ");
}

async function loadReportFile(file) {
  try {
    const text = await file.text();
    const report = JSON.parse(text);
    appState.analysisMeta = {
      source: report.root ? "scan-report" : "snapshot",
      root: report.root || null,
      analyzedAt: report.analyzedAt || report.savedAt || null
    };
    applySerializedSnapshot(report);
  } catch (error) {
    alert("JSON 결과 파일을 읽지 못했습니다. scan-project.mjs 출력 형식인지 확인하세요.");
  }
}

function saveCurrentSnapshot() {
  if (!appState.index.documents.length) {
    alert("저장할 분석 결과가 없습니다.");
    return;
  }

  const snapshots = getSnapshots();
  const timestamp = new Date();
  const summary = buildSummary(appState.index);
  const snapshot = {
    id: `snapshot-${timestamp.getTime()}`,
    label: buildSnapshotLabel(timestamp),
    savedAt: timestamp.toISOString(),
    index: serializeIndex(appState.index),
    documents: appState.index.documents.map((document) => ({
      id: document.id,
      name: document.name,
      sourcePath: document.sourcePath,
      type: document.type
    })),
    summary
  };

  snapshots.unshift(snapshot);
  localStorage.setItem(storageKey, JSON.stringify(snapshots.slice(0, 20)));
  renderSnapshotList();
  alert("현재 분석 결과를 저장했습니다.");
}

function renderSnapshotList() {
  snapshotList.innerHTML = "";
  const snapshots = getSnapshots();

  if (!snapshots.length) {
    const item = document.createElement("li");
    item.className = "snapshot-item";
    item.innerHTML = '<p class="empty-state">저장된 스냅샷이 없습니다.</p>';
    snapshotList.appendChild(item);
    renderComparePanel();
    return;
  }

  snapshots.forEach((snapshot) => {
  const summary = snapshot.summary || buildSummary(hydrateIndexFromSnapshot(snapshot));
    const item = document.createElement("li");
    item.className = "snapshot-item";
    item.innerHTML = `
      <strong class="snapshot-title">${escapeHtml(snapshot.label)}</strong>
      <p class="snapshot-meta">문서 ${summary.totalDocuments ?? 0}건 · 클래스 ${summary.totalClasses ?? 0}건 · 메소드 ${summary.totalMethods ?? 0}건</p>
      <div class="snapshot-actions">
        <button type="button" class="snapshot-button" data-action="load">불러오기</button>
        <button type="button" class="snapshot-button" data-action="compare">현재와 비교</button>
        <button type="button" class="snapshot-button" data-action="copy">JSON 복사</button>
        <button type="button" class="snapshot-button" data-action="delete">삭제</button>
      </div>
    `;
    item.querySelector('[data-action="load"]').addEventListener("click", () => loadSnapshot(snapshot.id));
    item.querySelector('[data-action="compare"]').addEventListener("click", () => compareWithCurrent(snapshot.id));
    item.querySelector('[data-action="copy"]').addEventListener("click", () => copySnapshotJson(snapshot.id));
    item.querySelector('[data-action="delete"]').addEventListener("click", () => deleteSnapshot(snapshot.id));
    snapshotList.appendChild(item);
  });

  renderComparePanel();
}

function loadSnapshot(snapshotId) {
  const snapshot = getSnapshots().find((item) => item.id === snapshotId);

  if (!snapshot) {
    alert("불러올 스냅샷을 찾지 못했습니다.");
    return;
  }

  applySerializedSnapshot(snapshot);
  alert("저장된 스냅샷을 불러왔습니다.");
}

async function copySnapshotJson(snapshotId) {
  const snapshot = getSnapshots().find((item) => item.id === snapshotId);

  if (!snapshot) {
    alert("복사할 스냅샷을 찾지 못했습니다.");
    return;
  }

  await writeClipboard(JSON.stringify(snapshot, null, 2));
  alert("스냅샷 JSON을 복사했습니다.");
}

function deleteSnapshot(snapshotId) {
  const snapshots = getSnapshots().filter((item) => item.id !== snapshotId);
  localStorage.setItem(storageKey, JSON.stringify(snapshots));

  if (appState.compareSnapshotId === snapshotId) {
    appState.compareSnapshotId = null;
  }

  renderSnapshotList();
}

function compareWithCurrent(snapshotId) {
  appState.compareSnapshotId = snapshotId;
  renderComparePanel();
}

function renderComparePanel() {
  compareBody.innerHTML = "";

  if (!appState.compareSnapshotId) {
    compareBody.innerHTML = '<p class="empty-state">비교할 스냅샷을 선택하세요.</p>';
    return;
  }

  const snapshot = getSnapshots().find((item) => item.id === appState.compareSnapshotId);

  if (!snapshot) {
    appState.compareSnapshotId = null;
    compareBody.innerHTML = '<p class="empty-state">선택한 스냅샷을 찾지 못했습니다.</p>';
    return;
  }

  const snapshotIndex = hydrateIndexFromSnapshot(snapshot);
  const snapshotResultMap = buildResultMap(snapshotIndex, categories);
  const currentResultMap = getCachedResultMap();

  categories.forEach((category) => {
    const snapshotNames = new Set(Array.from(snapshotResultMap[category.key].keys()));
    const currentNames = new Set(Array.from(currentResultMap[category.key].keys()));
    const added = Array.from(currentNames).filter((name) => !snapshotNames.has(name)).sort((left, right) => left.localeCompare(right));
    const removed = Array.from(snapshotNames).filter((name) => !currentNames.has(name)).sort((left, right) => left.localeCompare(right));

    if (!added.length && !removed.length) {
      return;
    }

    const card = document.createElement("article");
    card.className = "compare-card";
    card.innerHTML = `
      <h4>${category.label}</h4>
      <p class="compare-summary">추가 ${added.length}건 · 제거 ${removed.length}건</p>
      <div class="compare-tags"></div>
    `;

    const tags = card.querySelector(".compare-tags");
    added.forEach((name) => tags.appendChild(createCompareTag(`+ ${name}`, "added")));
    removed.forEach((name) => tags.appendChild(createCompareTag(`- ${name}`, "removed")));
    compareBody.appendChild(card);
  });

  if (!compareBody.childElementCount) {
    compareBody.innerHTML = '<p class="empty-state">현재 결과와 선택한 스냅샷 사이에 차이가 없습니다.</p>';
  }
}

function createCompareTag(text, type) {
  const tag = document.createElement("span");
  tag.className = `compare-tag ${type}`;
  tag.textContent = text;
  return tag;
}

function renderSummary() {
  summaryCards.innerHTML = "";
  datasetMeta.innerHTML = "";

  const summary = buildSummary(appState.index);
  const cards = buildSummaryCards(summary);
  const metaLines = buildDatasetMeta(appState.index, summary);
  activeScope.textContent = buildScopeLabel(appState.index, appState.selectedDocumentPath);
  clearDocumentFilterButton.disabled = !appState.selectedDocumentPath;

  cards.forEach((item) => {
    const node = summaryCardTemplate.content.firstElementChild.cloneNode(true);
    node.querySelector(".summary-label").textContent = item.label;
    node.querySelector(".summary-value").textContent = item.value;
    summaryCards.appendChild(node);
  });

  metaLines.forEach((line) => {
    const item = document.createElement("p");
    item.textContent = line;
    datasetMeta.appendChild(item);
  });

  if (appState.analysisMeta?.root) {
    const item = document.createElement("p");
    item.textContent = `루트 경로: ${appState.analysisMeta.root}`;
    datasetMeta.appendChild(item);
  }

  if (appState.analysisMeta?.analyzedAt) {
    const item = document.createElement("p");
    item.textContent = `분석 시각: ${appState.analysisMeta.analyzedAt}`;
    datasetMeta.appendChild(item);
  }
}

function renderSummaryDocumentList() {
  fileList.innerHTML = "";
  const visibleCount = getVisibleDocumentCount(appState.index.documents.length);
  const visibleDocuments = appState.index.documents.slice(0, visibleCount);

  visibleDocuments.forEach((documentEntry) => {
    const item = document.createElement("li");
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = documentEntry.sourcePath || documentEntry.name;
    button.classList.toggle("active", appState.selectedDocumentPath === documentEntry.sourcePath);
    button.addEventListener("click", () => toggleDocumentFilter(documentEntry.sourcePath));
    item.appendChild(button);
    fileList.appendChild(item);
  });

  renderFileListFooter(visibleCount, appState.index.documents.length);
}

function renderSummaryDocumentsChunk(start, size) {
  const totalVisible = getVisibleDocumentCount(appState.index.documents.length);
  const documentEntries = appState.index.documents.slice(start, Math.min(start + size, totalVisible));

  documentEntries.forEach((documentEntry) => {
    const item = document.createElement("li");
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = documentEntry.sourcePath || documentEntry.name;
    button.classList.toggle("active", appState.selectedDocumentPath === documentEntry.sourcePath);
    button.addEventListener("click", () => toggleDocumentFilter(documentEntry.sourcePath));
    item.appendChild(button);
    fileList.appendChild(item);
  });
}

async function renderSummaryAsync() {
  summaryCards.innerHTML = "";
  datasetMeta.innerHTML = "";
  fileList.innerHTML = "";

  const summary = buildSummary(appState.index);
  const cards = buildSummaryCards(summary);
  const metaLines = buildDatasetMeta(appState.index, summary);
  activeScope.textContent = buildScopeLabel(appState.index, appState.selectedDocumentPath);
  clearDocumentFilterButton.disabled = !appState.selectedDocumentPath;

  cards.forEach((item) => {
    const node = summaryCardTemplate.content.firstElementChild.cloneNode(true);
    node.querySelector(".summary-label").textContent = item.label;
    node.querySelector(".summary-value").textContent = item.value;
    summaryCards.appendChild(node);
  });

  metaLines.forEach((line) => {
    const item = document.createElement("p");
    item.textContent = line;
    datasetMeta.appendChild(item);
  });

  if (appState.analysisMeta?.root) {
    const item = document.createElement("p");
    item.textContent = `루트 경로: ${appState.analysisMeta.root}`;
    datasetMeta.appendChild(item);
  }

  if (appState.analysisMeta?.analyzedAt) {
    const item = document.createElement("p");
    item.textContent = `분석 시각: ${appState.analysisMeta.analyzedAt}`;
    datasetMeta.appendChild(item);
  }

  const batchSize = 80;
  const totalVisible = getVisibleDocumentCount(appState.index.documents.length);
  for (let start = 0; start < totalVisible; start += batchSize) {
    renderSummaryDocumentsChunk(start, batchSize);
    updateProgress({
      stage: "render",
      percent: calculateProgress(Math.min(start + batchSize, totalVisible), Math.max(totalVisible, 1), 10, 45),
      title: "화면 구성 중",
      stageLabel: "화면 구성",
      message: "인덱스 개요와 문서 탐색 목록을 구성하고 있습니다."
    });
    await yieldToBrowser();
  }

  renderFileListFooter(totalVisible, appState.index.documents.length);
}

function renderResults() {
  resultGrid.innerHTML = "";

  const resultMap = getCachedResultMap();
  const filteredData = getFilteredNames(
    resultMap,
    categories,
    appState.activeFileTypes,
    appState.searchKeyword,
    appState.selectedDocumentPath,
    appState.sortMode
  );
  const visibleSections = categories.filter((category) => appState.activeCategories.has(category.key));

  if (!visibleSections.length) {
    resultGrid.appendChild(createGridEmptyState("표시할 결과 유형이 없습니다. 필터를 다시 선택하세요."));
    renderDetailPanel(null, resultMap);
    return;
  }

  visibleSections.forEach((category) => {
    const node = resultSectionTemplate.content.firstElementChild.cloneNode(true);
    const values = filteredData[category.key];
    const visibleCount = getVisibleCount(category.key, values.length);
    const visibleValues = values.slice(0, visibleCount);
    const isCollapsed = isCategoryCollapsed(category.key, values.length);

    node.querySelector("h3").textContent = category.label;
    node.querySelector(".count-badge").textContent = values.length;
    node.querySelector(".result-card-summary").textContent = buildResultCardSummary(values.length, visibleValues.length, isCollapsed);
    node.classList.toggle("collapsed", isCollapsed);
    node.querySelector(".mini-toggle-button").textContent = isCollapsed ? "펼치기" : "접기";
    node.querySelector(".mini-toggle-button").addEventListener("click", () => toggleCategoryCollapse(category.key));
    node.querySelector(".mini-copy-button").addEventListener("click", () => copyCategory(category.label, values));

    const chipBox = node.querySelector(".chip-box");

    if (!values.length) {
      const empty = document.createElement("p");
      empty.className = "empty-state";
      empty.textContent = "추출된 항목이 없습니다.";
      chipBox.appendChild(empty);
    } else if (!isCollapsed) {
      visibleValues.forEach((value) => {
        const chip = document.createElement("button");
        chip.type = "button";
        chip.className = "chip";
        chip.textContent = value;
        chip.classList.toggle("active", isSelectedItem(category.key, value));
        chip.addEventListener("click", () => selectItem(category.key, value));
        chipBox.appendChild(chip);
      });
    }

    if (values.length > visibleValues.length) {
      node.appendChild(createResultFooter(category, visibleValues.length, values.length));
    }

    resultGrid.appendChild(node);
  });

  const hasAnyResults = visibleSections.some((category) => filteredData[category.key].length > 0);

  if (!hasAnyResults) {
    resultGrid.innerHTML = "";
    resultGrid.appendChild(createGridEmptyState("검색 조건에 맞는 결과가 없습니다. 다른 키워드나 유형 필터를 사용해 보세요."));
  }

  const selectedEntry = getSelectedEntry(
    resultMap,
    appState.selectedItem,
    appState.activeFileTypes,
    appState.selectedDocumentPath
  );
  const selectedStillVisible =
    selectedEntry &&
    appState.activeCategories.has(appState.selectedItem.categoryKey) &&
    filteredData[appState.selectedItem.categoryKey].includes(appState.selectedItem.name);

  renderDetailPanel(selectedStillVisible ? selectedEntry : null, resultMap);
}

async function renderResultsAsync() {
  resultGrid.innerHTML = "";

  const resultMap = getCachedResultMap();
  const filteredData = getFilteredNames(
    resultMap,
    categories,
    appState.activeFileTypes,
    appState.searchKeyword,
    appState.selectedDocumentPath,
    appState.sortMode
  );
  const visibleSections = categories.filter((category) => appState.activeCategories.has(category.key));

  if (!visibleSections.length) {
    resultGrid.appendChild(createGridEmptyState("표시할 결과 유형이 없습니다. 필터를 다시 선택하세요."));
    renderDetailPanel(null, resultMap);
    return;
  }

  for (let sectionIndex = 0; sectionIndex < visibleSections.length; sectionIndex += 1) {
    const category = visibleSections[sectionIndex];
    const node = resultSectionTemplate.content.firstElementChild.cloneNode(true);
    const values = filteredData[category.key];
    const visibleCount = getVisibleCount(category.key, values.length);
    const visibleValues = values.slice(0, visibleCount);
    const isCollapsed = isCategoryCollapsed(category.key, values.length);

    node.querySelector("h3").textContent = category.label;
    node.querySelector(".count-badge").textContent = values.length;
    node.querySelector(".result-card-summary").textContent = buildResultCardSummary(values.length, visibleValues.length, isCollapsed);
    node.classList.toggle("collapsed", isCollapsed);
    node.querySelector(".mini-toggle-button").textContent = isCollapsed ? "펼치기" : "접기";
    node.querySelector(".mini-toggle-button").addEventListener("click", () => toggleCategoryCollapse(category.key));
    node.querySelector(".mini-copy-button").addEventListener("click", () => copyCategory(category.label, values));

    const chipBox = node.querySelector(".chip-box");

    if (!values.length) {
      const empty = document.createElement("p");
      empty.className = "empty-state";
      empty.textContent = "추출된 항목이 없습니다.";
      chipBox.appendChild(empty);
    } else if (!isCollapsed) {
      const chipBatchSize = 120;
      for (let start = 0; start < visibleValues.length; start += chipBatchSize) {
        const batch = visibleValues.slice(start, start + chipBatchSize);
        batch.forEach((value) => {
          const chip = document.createElement("button");
          chip.type = "button";
          chip.className = "chip";
          chip.textContent = value;
          chip.classList.toggle("active", isSelectedItem(category.key, value));
          chip.addEventListener("click", () => selectItem(category.key, value));
          chipBox.appendChild(chip);
        });
        await yieldToBrowser();
      }
    }

    if (values.length > visibleValues.length) {
      node.appendChild(createResultFooter(category, visibleValues.length, values.length));
    }

    resultGrid.appendChild(node);
    updateProgress({
      stage: "render",
      percent: calculateProgress(sectionIndex + 1, visibleSections.length, 50, 100),
      title: "화면 구성 중",
      stageLabel: "화면 구성",
      message: `${sectionIndex + 1}/${visibleSections.length} 결과 카테고리를 렌더링했습니다.`
    });
    await yieldToBrowser();
  }

  const hasAnyResults = visibleSections.some((category) => filteredData[category.key].length > 0);

  if (!hasAnyResults) {
    resultGrid.innerHTML = "";
    resultGrid.appendChild(createGridEmptyState("검색 조건에 맞는 결과가 없습니다. 다른 키워드나 유형 필터를 사용해 보세요."));
  }

  const selectedEntry = getSelectedEntry(
    resultMap,
    appState.selectedItem,
    appState.activeFileTypes,
    appState.selectedDocumentPath
  );
  const selectedStillVisible =
    selectedEntry &&
    appState.activeCategories.has(appState.selectedItem.categoryKey) &&
    filteredData[appState.selectedItem.categoryKey].includes(appState.selectedItem.name);

  renderDetailPanel(selectedStillVisible ? selectedEntry : null, resultMap);
}

function renderDetailPanel(entry, resultMap) {
  if (!entry) {
    detailTitle.textContent = "항목을 선택하세요";
    detailMeta.textContent = "결과 칩을 클릭하면 정의 위치, 참조, 연관 항목을 확인할 수 있습니다.";
    detailBody.innerHTML = '<p class="empty-state">아직 선택된 결과가 없습니다.</p>';
    return;
  }

  detailTitle.textContent = entry.name;
  const definitionCount = entry.occurrences.filter((occurrence) => occurrence.role === "definition").length;
  const referenceCount = entry.occurrences.filter((occurrence) => occurrence.role === "reference").length;
  detailMeta.textContent = `${categoryLabels[entry.categoryKey]} · 정의 ${definitionCount}건 · 참조 ${referenceCount}건`;
  detailBody.innerHTML = "";

  const summary = document.createElement("div");
  summary.className = "detail-summary";
  summary.innerHTML = `<strong>${entry.name}</strong> · 현재 범위에서 ${entry.occurrences.length}개의 위치가 보입니다.`;
  detailBody.appendChild(summary);

  if (entry.definedAtOccurrence) {
    const definition = document.createElement("div");
    definition.className = "detail-summary";
    definition.textContent = `정의 위치: ${entry.definedAtOccurrence.documentName} · Line ${entry.definedAtOccurrence.lineNumber}`;
    detailBody.appendChild(definition);
  }

  const dependencyGraph = buildDependencyGraphData(
    entry,
    resultMap,
    appState.index,
    categories,
    appState.activeFileTypes,
    appState.selectedDocumentPath
  );
  const graphSection = buildDependencyGraphSection(dependencyGraph);

  if (graphSection) {
    detailBody.appendChild(graphSection);
  }

  const relationGroups = buildRelationGroups(entry, resultMap, appState.index, categories, categoryLabels);
  const relationSection = buildRelatedSection("심볼 관계", relationGroups);

  if (relationSection) {
    detailBody.appendChild(relationSection);
  }

  const relatedMap = buildRelatedMap(
    entry,
    resultMap,
    categories,
    appState.activeFileTypes,
    categoryLabels,
    appState.selectedDocumentPath
  );
  const relatedSection = buildRelatedSection("같은 문서의 연관 항목", relatedMap);

  if (relatedSection) {
    detailBody.appendChild(relatedSection);
  }

  const visibleOccurrenceCount = getVisibleDetailCount(entry.occurrences.length);

  entry.occurrences.slice(0, visibleOccurrenceCount).forEach((occurrence) => {
    const card = document.createElement("article");
    card.className = "detail-occurrence";
    card.innerHTML = `
      <div class="occurrence-head">
        <span class="occurrence-doc">${escapeHtml(occurrence.documentName)}</span>
        <span class="occurrence-role ${escapeHtml(occurrence.role)}">${occurrence.role === "definition" ? "정의" : "참조"}</span>
      </div>
      <p class="occurrence-line">Line ${occurrence.lineNumber}</p>
      <p class="occurrence-path">${escapeHtml(occurrence.sourcePath || occurrence.documentName)}</p>
      <pre class="occurrence-snippet">${escapeHtml(occurrence.snippet || "(스니펫 없음)")}</pre>
    `;
    detailBody.appendChild(card);
  });

  if (entry.occurrences.length > visibleOccurrenceCount) {
    detailBody.appendChild(createDetailFooter(entry, visibleOccurrenceCount));
  }
}

function selectItem(categoryKey, name) {
  appState.selectedItem = { categoryKey, name };
  appState.detailVisibleCount = 120;
  renderResults();
}

function isSelectedItem(categoryKey, name) {
  return Boolean(
    appState.selectedItem &&
      appState.selectedItem.categoryKey === categoryKey &&
      appState.selectedItem.name === name
  );
}

function buildRelatedSection(title, relatedMap) {
  if (!relatedMap) {
    return null;
  }

  const section = document.createElement("section");
  section.className = "related-section";
  section.innerHTML = `<h4>${escapeHtml(title)}</h4><div class="related-grid"></div>`;
  const grid = section.querySelector(".related-grid");

  Object.entries(relatedMap).forEach(([label, names]) => {
    const group = document.createElement("div");
    group.innerHTML = `<p class="related-group-title">${label}</p><div class="chip-box"></div>`;
    const chipBox = group.querySelector(".chip-box");
    names.slice(0, 12).forEach((item) => {
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = "chip";
      chip.classList.add("navigable");
      chip.textContent = item.label || item.name;
      chip.addEventListener("click", () => selectItem(item.categoryKey, item.name));
      chipBox.appendChild(chip);
    });
    grid.appendChild(group);
  });

  return section;
}

function buildDependencyGraphSection(graph) {
  if (!graph) {
    return null;
  }

  const section = document.createElement("section");
  section.className = "dependency-section";
  section.innerHTML = `
    <div class="dependency-head">
      <div>
        <h4>의존성 그래프</h4>
        <p>선택한 심볼 주변 관계만 축약해 보여줍니다.</p>
      </div>
      <div class="dependency-actions">
        <div class="dependency-legend">
          <span><i class="legend-swatch incoming"></i>상위</span>
          <span><i class="legend-swatch outgoing"></i>하위</span>
          <span><i class="legend-swatch context"></i>같은 문서</span>
        </div>
        <button type="button" class="ghost dependency-expand-button">크게 보기</button>
      </div>
    </div>
    <div class="dependency-graph"></div>
  `;

  const graphHost = section.querySelector(".dependency-graph");
  mountDependencyGraph(graphHost, graph);
  section.querySelector(".dependency-expand-button").addEventListener("click", () => openGraphModal(graph));

  return section;
}

function mountDependencyGraph(host, graph, options = {}) {
  host.innerHTML = `
    <div class="dependency-graph${options.large ? " large" : ""}">
      <svg class="dependency-edges" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"></svg>
      <div class="dependency-nodes"></div>
    </div>
  `;

  const graphRoot = host.querySelector(".dependency-graph");
  const edgeLayer = graphRoot.querySelector(".dependency-edges");
  const nodeLayer = graphRoot.querySelector(".dependency-nodes");
  const nodeMap = new Map(graph.nodes.map((node) => [node.id, node]));

  graph.edges.forEach((edge) => {
    const fromNode = nodeMap.get(edge.from);
    const toNode = nodeMap.get(edge.to);

    if (!fromNode || !toNode) {
      return;
    }

    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", fromNode.x);
    line.setAttribute("y1", fromNode.y);
    line.setAttribute("x2", toNode.x);
    line.setAttribute("y2", toNode.y);
    line.setAttribute("class", `dependency-edge edge-${edge.type} from-${fromNode.role} to-${toNode.role}`);
    edgeLayer.appendChild(line);
  });

  graph.nodes.forEach((node) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `dependency-node role-${node.role} kind-${node.categoryKey}`;
    button.style.left = `${node.x}%`;
    button.style.top = `${node.y}%`;
    button.title = `${node.label} · ${categoryLabels[node.categoryKey]}`;
    button.innerHTML = `
      <span class="dependency-node-label">${escapeHtml(node.label)}</span>
      <span class="dependency-node-meta">${escapeHtml(categoryLabels[node.categoryKey])}</span>
    `;

    if (node.role === "center") {
      button.disabled = true;
      button.setAttribute("aria-current", "true");
    } else {
      button.addEventListener("click", () => {
        if (!graphModal.hidden) {
          closeGraphModal();
        }
        selectItem(node.categoryKey, node.name);
      });
    }

    nodeLayer.appendChild(button);
  });
}

function openGraphModal(graph) {
  graphModal.hidden = false;
  graphModalTitle.textContent = "의존성 그래프";
  graphModalMeta.textContent = "선택한 심볼 주변 관계를 확대해서 봅니다. 노드를 클릭하면 해당 심볼로 이동합니다.";
  appState.graphModalState = { graph, scale: 1 };
  mountDependencyGraph(graphModalCanvas, graph, { large: true });
  resetGraphZoom();
  document.body.classList.add("modal-open");
}

function closeGraphModal() {
  if (graphModal.hidden) {
    return;
  }

  graphModal.hidden = true;
  graphModalCanvas.innerHTML = "";
  graphModalCanvas.style.removeProperty("--graph-scale");
  appState.graphModalState = null;
  document.body.classList.remove("modal-open");
}

function adjustGraphZoom(delta) {
  if (!appState.graphModalState) {
    return;
  }

  appState.graphModalState.scale = Math.max(0.7, Math.min(1.9, appState.graphModalState.scale + delta));
  graphModalCanvas.style.setProperty("--graph-scale", String(appState.graphModalState.scale));
}

function resetGraphZoom() {
  if (!appState.graphModalState) {
    return;
  }

  appState.graphModalState.scale = 1;
  graphModalCanvas.style.setProperty("--graph-scale", "1");
}

function renderEmptyState() {
  closeGraphModal();
  setIndexState(createEmptyIndex());
  appState.analysisMeta = null;
  appState.categoryVisibleCounts = {};
  appState.categoryCollapsed = {};
  appState.detailVisibleCount = 0;
  appState.documentListVisibleCount = 0;
  appState.selectedDocumentPath = null;
  appState.selectedItem = null;
  setAnalyzingState(false);
  resetProgressState();
  renderSummary();
  renderSummaryDocumentList();
  renderResults();
  renderComparePanel();
}

function resetAll() {
  if (appState.isAnalyzing) {
    return;
  }

  closeGraphModal();
  fileInput.value = "";
  folderInput.value = "";
  reportInput.value = "";
  sourceInput.value = "";
  searchInput.value = "";
  sortSelect.value = "count";
  appState.searchKeyword = "";
  appState.analysisMeta = null;
  appState.sortMode = "count";
  appState.activeCategories = new Set(categories.map((category) => category.key));
  appState.activeFileTypes = new Set(fileTypes.map((type) => type.key));
  appState.categoryVisibleCounts = {};
  appState.categoryCollapsed = {};
  appState.detailVisibleCount = 0;
  appState.documentListVisibleCount = 0;
  appState.selectedDocumentPath = null;
  appState.selectedItem = null;
  appState.compareSnapshotId = null;
  syncFilterButtons();
  syncFileTypeButtons();
  renderEmptyState();
}

function initializeFilters() {
  filterGroup.innerHTML = "";

  categories.forEach((category) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "filter-chip active";
    button.dataset.category = category.key;
    button.textContent = category.label;
    button.addEventListener("click", () => toggleCategory(category.key));
    filterGroup.appendChild(button);
  });
}

function toggleCategory(categoryKey) {
  if (appState.activeCategories.has(categoryKey)) {
    appState.activeCategories.delete(categoryKey);
  } else {
    appState.activeCategories.add(categoryKey);
  }

  syncFilterButtons();
  renderResults();
}

function initializeFileTypeFilters() {
  fileTypeGroup.innerHTML = "";

  fileTypes.forEach((fileType) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "filter-chip active";
    button.dataset.fileType = fileType.key;
    button.textContent = fileType.label;
    button.addEventListener("click", () => toggleFileType(fileType.key));
    fileTypeGroup.appendChild(button);
  });
}

function toggleFileType(fileTypeKey) {
  if (appState.activeFileTypes.has(fileTypeKey)) {
    appState.activeFileTypes.delete(fileTypeKey);
  } else {
    appState.activeFileTypes.add(fileTypeKey);
  }

  syncFileTypeButtons();
  renderResults();
}

function syncFilterButtons() {
  Array.from(filterGroup.querySelectorAll(".filter-chip")).forEach((button) => {
    const categoryKey = button.dataset.category;
    button.classList.toggle("active", appState.activeCategories.has(categoryKey));
  });
}

function syncFileTypeButtons() {
  Array.from(fileTypeGroup.querySelectorAll(".filter-chip")).forEach((button) => {
    const fileTypeKey = button.dataset.fileType;
    button.classList.toggle("active", appState.activeFileTypes.has(fileTypeKey));
  });
}

function createGridEmptyState(message) {
  const empty = document.createElement("div");
  empty.className = "result-grid-empty";
  empty.textContent = message;
  return empty;
}

async function copyResults(useFilteredData) {
  const payload = buildCopyPayload(useFilteredData);

  if (!payload.trim()) {
    alert("복사할 결과가 없습니다.");
    return;
  }

  await writeClipboard(payload);
  alert(useFilteredData ? "현재 결과를 복사했습니다." : "전체 결과를 복사했습니다.");
}

async function copyCategory(label, values) {
  if (!values.length) {
    alert("복사할 항목이 없습니다.");
    return;
  }

  const payload = `${label}\n${values.join("\n")}`;
  await writeClipboard(payload);
  alert(`${label} 목록을 복사했습니다.`);
}

function buildCopyPayload(useFilteredData) {
  const resultMap = getCachedResultMap();
  const sourceData = useFilteredData
    ? getFilteredNames(
        resultMap,
        categories,
        appState.activeFileTypes,
        appState.searchKeyword,
        appState.selectedDocumentPath,
        appState.sortMode
      )
    : getUnfilteredNames(resultMap, categories, appState.sortMode);
  const visibleCategories = categories.filter((category) => appState.activeCategories.has(category.key));

  return visibleCategories
    .filter((category) => sourceData[category.key].length > 0)
    .map((category) => `${category.label}\n${sourceData[category.key].join("\n")}`)
    .join("\n\n");
}

async function writeClipboard(text) {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const helper = document.createElement("textarea");
  helper.value = text;
  helper.setAttribute("readonly", "");
  helper.style.position = "absolute";
  helper.style.left = "-9999px";
  document.body.appendChild(helper);
  helper.select();
  document.execCommand("copy");
  document.body.removeChild(helper);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function downloadCsv() {
  const rows = buildCsvRows();

  if (!rows.length) {
    alert("다운로드할 결과가 없습니다.");
    return;
  }

  const normalizedHeader = ["category", "name", "sourceDocument", "sourcePath", "lineNumber", "snippet"];
  const csvText = [normalizedHeader, ...rows]
    .map((row) => row.map(csvEscape).join(","))
    .join("\n");

  const blob = new Blob([`\uFEFF${csvText}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "spring-miner-results.csv";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function buildCsvRows() {
  const resultMap = getCachedResultMap();
  const filteredData = getFilteredNames(
    resultMap,
    categories,
    appState.activeFileTypes,
    appState.searchKeyword,
    appState.selectedDocumentPath,
    appState.sortMode
  );
  const rows = [];

  categories
    .filter((category) => appState.activeCategories.has(category.key))
    .forEach((category) => {
      filteredData[category.key].forEach((name) => {
        const entry = resultMap[category.key].get(name);

        if (!entry) {
          return;
        }

        getVisibleOccurrences(entry.occurrences, appState.activeFileTypes, appState.selectedDocumentPath).forEach((occurrence) => {
          rows.push([
            category.label,
            name,
            occurrence.documentName,
            occurrence.sourcePath || occurrence.documentName,
            String(occurrence.lineNumber),
            occurrence.snippet
          ]);
        });
      });
    });

  return rows;
}

function csvEscape(value) {
  const normalized = String(value ?? "").replaceAll('"', '""');
  return `"${normalized}"`;
}

function getSnapshots() {
  try {
    return JSON.parse(localStorage.getItem(storageKey) || "[]");
  } catch (error) {
    return [];
  }
}

function buildSnapshotLabel(timestamp) {
  const yyyy = timestamp.getFullYear();
  const mm = String(timestamp.getMonth() + 1).padStart(2, "0");
  const dd = String(timestamp.getDate()).padStart(2, "0");
  const hh = String(timestamp.getHours()).padStart(2, "0");
  const mi = String(timestamp.getMinutes()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd} ${hh}:${mi} 분석 결과`;
}

function applySerializedSnapshot(snapshot) {
  setIndexState(hydrateIndexFromSnapshot(snapshot));
  appState.analysisMeta = appState.analysisMeta || {
    source: "snapshot",
    analyzedAt: snapshot.savedAt || null
  };
  appState.categoryVisibleCounts = {};
  appState.categoryCollapsed = {};
  appState.detailVisibleCount = 0;
  appState.documentListVisibleCount = 0;
  appState.selectedDocumentPath = null;
  appState.selectedItem = null;

  void renderAnalysisView().then(() => {
    renderComparePanel();
  });
}

function toggleDocumentFilter(sourcePath) {
  appState.selectedDocumentPath = appState.selectedDocumentPath === sourcePath ? null : sourcePath;
  renderSummary();
  renderSummaryDocumentList();
  renderResults();
}

function updateProgress({ stage = "read", percent = 0, title, stageLabel = "대기", message }) {
  progressPanel.hidden = false;
  progressTitle.textContent = title;
  progressStageLabel.textContent = stageLabel;
  progressMessage.textContent = message;

  const normalized = Math.max(0, Math.min(100, percent));

  if (stage === "read") {
    readProgressPercent.textContent = `${Math.round(normalized)}%`;
    readProgressFill.style.width = `${normalized}%`;
  }

  if (stage === "index") {
    indexProgressPercent.textContent = `${Math.round(normalized)}%`;
    indexProgressFill.style.width = `${normalized}%`;
  }

  if (stage === "render") {
    renderProgressPercent.textContent = `${Math.round(normalized)}%`;
    renderProgressFill.style.width = `${normalized}%`;
  }
}

function setAnalyzingState(isAnalyzing) {
  analyzeButton.disabled = isAnalyzing;
  sampleButton.disabled = isAnalyzing;
  resetButton.disabled = isAnalyzing;
  fileInput.disabled = isAnalyzing;
  folderInput.disabled = isAnalyzing;
  reportInput.disabled = isAnalyzing;
  sourceInput.disabled = isAnalyzing;
}

function resetProgressState() {
  progressPanel.hidden = true;
  progressTitle.textContent = "분석 준비 중";
  progressStageLabel.textContent = "대기";
  readProgressPercent.textContent = "0%";
  readProgressFill.style.width = "0%";
  indexProgressPercent.textContent = "0%";
  indexProgressFill.style.width = "0%";
  renderProgressPercent.textContent = "0%";
  renderProgressFill.style.width = "0%";
  progressMessage.textContent = "파일을 확인하고 있습니다.";
}

function calculateProgress(current, total, start, end) {
  if (!total) {
    return end;
  }

  const ratio = current / total;
  return start + (end - start) * ratio;
}

function yieldToBrowser() {
  return new Promise((resolve) => {
    if (typeof requestAnimationFrame === "function") {
      requestAnimationFrame(() => resolve());
      return;
    }

    setTimeout(resolve, 0);
  });
}

async function renderAnalysisView() {
  updateProgress({
    stage: "render",
    percent: 10,
    title: "화면 구성 중",
    stageLabel: "화면 구성",
    message: "요약 정보와 문서 목록을 그리고 있습니다."
  });

  await renderSummaryAsync();
  await yieldToBrowser();

  updateProgress({
    stage: "render",
    percent: 50,
    title: "화면 구성 중",
    stageLabel: "화면 구성",
    message: "결과 카드와 심볼 목록을 그리고 있습니다."
  });

  await renderResultsAsync();
}

async function buildIndexWithWorker(documents) {
  if (typeof Worker === "undefined") {
    return buildIndexLocally(documents);
  }

  try {
    return await buildIndexInWorker(documents);
  } catch (error) {
    updateProgress({
      stage: "index",
      percent: 0,
      title: "인덱스 생성 재시도",
      stageLabel: "인덱스 생성",
      message: "워커 실행에 실패해 기본 경로로 다시 분석하고 있습니다."
    });
    return buildIndexLocally(documents);
  }
}

function buildIndexLocally(documents) {
  return buildIndex(documents, {
    onProgress: ({ completed, total, document }) => {
      updateProgress({
        stage: "index",
        percent: calculateProgress(completed, total, 0, 100),
        title: "인덱스 생성 중",
        stageLabel: "인덱스 생성",
        message: `${completed}/${total} · ${document.sourcePath || document.name}`
      });
    }
  });
}

function buildIndexInWorker(documents) {
  return new Promise((resolve, reject) => {
    const worker = new Worker("./indexer-worker.js");

    worker.onmessage = (event) => {
      const payload = event.data || {};

      if (payload.type === "progress") {
        updateProgress({
          stage: "index",
          percent: calculateProgress(payload.completed, payload.total, 0, 100),
          title: "인덱스 생성 중",
          stageLabel: "인덱스 생성",
          message: `${payload.completed}/${payload.total} · ${payload.document?.sourcePath || payload.document?.name || ""}`
        });
        return;
      }

      if (payload.type === "done") {
        worker.terminate();
        resolve(payload.index);
        return;
      }

      if (payload.type === "error") {
        worker.terminate();
        reject(new Error(payload.message || "Worker index build failed"));
      }
    };

    worker.onerror = (error) => {
      worker.terminate();
      reject(error);
    };

    worker.postMessage({
      type: "build-index",
      documents
    });
  });
}

function setIndexState(nextIndex) {
  appState.index = nextIndex;
  appState.indexRevision += 1;
  appState.resultMapCache = null;
  appState.resultMapRevision = -1;
  appState.categoryVisibleCounts = {};
  appState.categoryCollapsed = {};
  appState.detailVisibleCount = 0;
  appState.documentListVisibleCount = 0;
}

function getCachedResultMap() {
  if (appState.resultMapCache && appState.resultMapRevision === appState.indexRevision) {
    return appState.resultMapCache;
  }

  appState.resultMapCache = buildResultMap(appState.index, categories);
  appState.resultMapRevision = appState.indexRevision;
  return appState.resultMapCache;
}

function getVisibleCount(categoryKey, total) {
  const defaultCount = 120;
  const current = appState.categoryVisibleCounts[categoryKey] ?? defaultCount;
  return Math.min(current, total);
}

function createResultFooter(category, visibleCount, totalCount) {
  const footer = document.createElement("div");
  footer.className = "result-card-footer";

  const meta = document.createElement("span");
  meta.className = "result-card-meta";
  meta.textContent = `${visibleCount} / ${totalCount} 표시`;
  footer.appendChild(meta);

  const button = document.createElement("button");
  button.type = "button";
  button.className = "ghost";
  button.textContent = "더 보기";
  button.addEventListener("click", () => {
    appState.categoryVisibleCounts[category.key] = visibleCount + 120;
    renderResults();
  });
  footer.appendChild(button);

  return footer;
}

function buildResultCardSummary(totalCount, visibleCount, isCollapsed) {
  if (!totalCount) {
    return "표시할 심볼이 없습니다.";
  }

  if (isCollapsed) {
    return `총 ${totalCount}개 심볼이 있습니다. 펼치면 목록을 볼 수 있습니다.`;
  }

  if (totalCount > visibleCount) {
    return `총 ${totalCount}개 중 ${visibleCount}개를 먼저 표시합니다. 카드 내부를 스크롤하거나 더 보기를 사용할 수 있습니다.`;
  }

  return `총 ${totalCount}개 심볼이 정리되어 있습니다. 카드 내부에서 바로 탐색할 수 있습니다.`;
}

function isCategoryCollapsed(categoryKey, totalCount) {
  if (typeof appState.categoryCollapsed[categoryKey] === "boolean") {
    return appState.categoryCollapsed[categoryKey];
  }

  return totalCount >= 80;
}

function toggleCategoryCollapse(categoryKey) {
  const current = appState.categoryCollapsed[categoryKey];
  appState.categoryCollapsed[categoryKey] = !(typeof current === "boolean" ? current : true);
  renderResults();
}

function getVisibleDetailCount(total) {
  const defaultCount = 120;
  const current = appState.detailVisibleCount || defaultCount;
  return Math.min(current, total);
}

function createDetailFooter(entry, visibleCount) {
  const footer = document.createElement("div");
  footer.className = "detail-footer";

  const meta = document.createElement("span");
  meta.textContent = `${visibleCount} / ${entry.occurrences.length} 위치 표시`;
  footer.appendChild(meta);

  const button = document.createElement("button");
  button.type = "button";
  button.className = "ghost";
  button.textContent = "위치 더 보기";
  button.addEventListener("click", () => {
    appState.detailVisibleCount = visibleCount + 120;
    renderResults();
  });
  footer.appendChild(button);

  return footer;
}

function getVisibleDocumentCount(total) {
  const defaultCount = 250;
  const current = appState.documentListVisibleCount || defaultCount;
  return Math.min(current, total);
}

function renderFileListFooter(visibleCount, totalCount) {
  fileListFooter.innerHTML = "";
  fileListFooter.hidden = totalCount <= visibleCount;

  if (totalCount <= visibleCount) {
    return;
  }

  const meta = document.createElement("span");
  meta.textContent = `${visibleCount} / ${totalCount} 문서 표시`;
  fileListFooter.appendChild(meta);

  const button = document.createElement("button");
  button.type = "button";
  button.className = "ghost";
  button.textContent = "문서 더 보기";
  button.addEventListener("click", () => {
    appState.documentListVisibleCount = visibleCount + 250;
    renderSummaryDocumentList();
  });
  fileListFooter.appendChild(button);
}
