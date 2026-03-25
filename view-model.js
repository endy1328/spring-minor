(function attachViewModel(global) {
  function buildResultMap(index, categories) {
    const occurrenceMap = new Map(index.occurrences.map((occurrence) => [occurrence.id, occurrence]));
    const map = Object.fromEntries(categories.map((category) => [category.key, new Map()]));

    index.symbols.forEach((symbol) => {
      if (!map[symbol.kind]) {
        return;
      }

      const occurrences = index.occurrences
        .filter((occurrence) => occurrence.symbolId === symbol.id)
        .sort((left, right) => left.lineNumber - right.lineNumber);

      map[symbol.kind].set(symbol.name, {
        id: symbol.id,
        categoryKey: symbol.kind,
        name: symbol.name,
        qualifiedName: symbol.qualifiedName,
        documentId: symbol.documentId,
        definedAtOccurrence: symbol.definedAtOccurrenceId ? occurrenceMap.get(symbol.definedAtOccurrenceId) || null : null,
        occurrences
      });
    });

    return map;
  }

  function getVisibleOccurrences(occurrences, activeFileTypes, selectedDocumentPath = null) {
    return occurrences.filter(
      (occurrence) =>
        activeFileTypes.has(occurrence.documentType) &&
        (!selectedDocumentPath || (occurrence.sourcePath || occurrence.documentName) === selectedDocumentPath)
    );
  }

  function getFilteredNames(
    resultMap,
    categories,
    activeFileTypes,
    searchKeyword,
    selectedDocumentPath = null,
    sortMode = "count"
  ) {
    const filtered = {};

    categories.forEach((category) => {
      const values = Array.from(resultMap[category.key].values())
        .map((entry) => ({
          name: entry.name,
          visibleCount: getVisibleOccurrences(entry.occurrences, activeFileTypes, selectedDocumentPath).length
        }))
        .filter((entry) => entry.visibleCount > 0)
        .sort((left, right) => {
          if (sortMode === "name") {
            return left.name.localeCompare(right.name);
          }

          if (right.visibleCount !== left.visibleCount) {
            return right.visibleCount - left.visibleCount;
          }

          return left.name.localeCompare(right.name);
        })
        .map((entry) => entry.name);

      filtered[category.key] = values.filter((value) => !searchKeyword || value.toLowerCase().includes(searchKeyword));
    });

    return filtered;
  }

  function getUnfilteredNames(resultMap, categories, sortMode = "count") {
    return Object.fromEntries(
      categories.map((category) => [
        category.key,
        Array.from(resultMap[category.key].values())
          .sort((left, right) => {
            if (sortMode === "name") {
              return left.name.localeCompare(right.name);
            }

            if (right.occurrences.length !== left.occurrences.length) {
              return right.occurrences.length - left.occurrences.length;
            }

            return left.name.localeCompare(right.name);
          })
          .map((entry) => entry.name)
      ])
    );
  }

  function getSelectedEntry(resultMap, selectedItem, activeFileTypes, selectedDocumentPath = null) {
    if (!selectedItem) {
      return null;
    }

    const item = resultMap[selectedItem.categoryKey]?.get(selectedItem.name);

    if (!item) {
      return null;
    }

    return {
      ...item,
      occurrences: getVisibleOccurrences(item.occurrences, activeFileTypes, selectedDocumentPath)
    };
  }

  function buildRelatedMap(entry, resultMap, categories, activeFileTypes, categoryLabels, selectedDocumentPath = null) {
    if (!entry) {
      return null;
    }

    const selectedPaths = new Set(entry.occurrences.map((occurrence) => occurrence.sourcePath || occurrence.documentName));
    const relatedMap = {};

    categories.forEach((category) => {
      if (category.key === entry.categoryKey) {
        return;
      }

      const relatedNames = Array.from(resultMap[category.key].values())
        .filter((candidate) =>
          getVisibleOccurrences(candidate.occurrences, activeFileTypes, selectedDocumentPath).some((occurrence) =>
            selectedPaths.has(occurrence.sourcePath || occurrence.documentName)
          )
        )
        .map((candidate) => ({
          name: candidate.name,
          categoryKey: candidate.categoryKey,
          label: `${candidate.name} · ${categoryLabels[candidate.categoryKey]}`
        }))
        .sort((left, right) => left.name.localeCompare(right.name));

      if (relatedNames.length) {
        relatedMap[categoryLabels[category.key]] = relatedNames;
      }
    });

    return Object.keys(relatedMap).length ? relatedMap : null;
  }

  function buildDependencyGraphData(entry, resultMap, index, categories, activeFileTypes, selectedDocumentPath = null) {
    if (!entry) {
      return null;
    }

    const bySymbolId = new Map();
    categories.forEach((category) => {
      Array.from(resultMap[category.key].values()).forEach((candidate) => {
        bySymbolId.set(candidate.id, candidate);
      });
    });

    const selectedPaths = new Set(entry.occurrences.map((occurrence) => occurrence.sourcePath || occurrence.documentName));
    const nodeLookup = new Map();
    const nodes = [];
    const edges = [];
    const centerNodeId = entry.id;

    nodeLookup.set(centerNodeId, {
      id: centerNodeId,
      name: entry.name,
      label: entry.name,
      categoryKey: entry.categoryKey,
      role: "center"
    });
    nodes.push(nodeLookup.get(centerNodeId));

    index.relations
      .filter((relation) => relation.toSymbolId === entry.id)
      .map((relation) => ({
        candidate: bySymbolId.get(relation.fromSymbolId),
        edgeType: relation.type,
        role: "incoming"
      }))
      .filter((item) => item.candidate)
      .slice(0, 3)
      .forEach((item) => {
        if (!nodeLookup.has(item.candidate.id)) {
          nodeLookup.set(item.candidate.id, {
            id: item.candidate.id,
            name: item.candidate.name,
            label: item.candidate.name,
            categoryKey: item.candidate.categoryKey,
            role: item.role
          });
          nodes.push(nodeLookup.get(item.candidate.id));
        }

        edges.push({
          from: item.candidate.id,
          to: centerNodeId,
          type: item.edgeType
        });
      });

    index.relations
      .filter((relation) => relation.fromSymbolId === entry.id)
      .map((relation) => ({
        candidate: bySymbolId.get(relation.toSymbolId),
        edgeType: relation.type,
        role: "outgoing"
      }))
      .filter((item) => item.candidate)
      .slice(0, 4)
      .forEach((item) => {
        if (!nodeLookup.has(item.candidate.id)) {
          nodeLookup.set(item.candidate.id, {
            id: item.candidate.id,
            name: item.candidate.name,
            label: item.candidate.name,
            categoryKey: item.candidate.categoryKey,
            role: item.role
          });
          nodes.push(nodeLookup.get(item.candidate.id));
        }

        edges.push({
          from: centerNodeId,
          to: item.candidate.id,
          type: item.edgeType
        });
      });

    categories
      .flatMap((category) => Array.from(resultMap[category.key].values()))
      .filter((candidate) => candidate.id !== entry.id)
      .filter((candidate) => !nodeLookup.has(candidate.id))
      .map((candidate) => ({
        candidate,
        visibleOccurrences: getVisibleOccurrences(candidate.occurrences, activeFileTypes, selectedDocumentPath)
      }))
      .filter((item) =>
        item.visibleOccurrences.some((occurrence) => selectedPaths.has(occurrence.sourcePath || occurrence.documentName))
      )
      .sort((left, right) => {
        if (right.visibleOccurrences.length !== left.visibleOccurrences.length) {
          return right.visibleOccurrences.length - left.visibleOccurrences.length;
        }

        return left.candidate.name.localeCompare(right.candidate.name);
      })
      .slice(0, 4)
      .forEach((item) => {
        nodeLookup.set(item.candidate.id, {
          id: item.candidate.id,
          name: item.candidate.name,
          label: item.candidate.name,
          categoryKey: item.candidate.categoryKey,
          role: "context"
        });
        nodes.push(nodeLookup.get(item.candidate.id));
        edges.push({
          from: centerNodeId,
          to: item.candidate.id,
          type: "co-located"
        });
      });

    if (nodes.length <= 1) {
      return null;
    }

    positionGraphNodes(nodes);

    return { nodes, edges };
  }

  function positionGraphNodes(nodes) {
    const centerNode = nodes.find((node) => node.role === "center");

    if (!centerNode) {
      return;
    }

    centerNode.x = 50;
    centerNode.y = 50;

    assignArcPositions(nodes.filter((node) => node.role === "incoming"), 50, 50, 34, 215, 325);
    assignArcPositions(nodes.filter((node) => node.role === "outgoing"), 50, 50, 34, 35, 145);

    nodes
      .filter((node) => node.role === "context")
      .forEach((node, index) => {
        node.x = index % 2 === 0 ? 15 : 85;
        node.y = 26 + Math.floor(index / 2) * 48;
      });
  }

  function assignArcPositions(nodes, centerX, centerY, radius, startAngle, endAngle) {
    if (!nodes.length) {
      return;
    }

    const step = nodes.length === 1 ? 0 : (endAngle - startAngle) / (nodes.length - 1);

    nodes.forEach((node, index) => {
      const angle = (startAngle + step * index) * (Math.PI / 180);
      node.x = centerX + Math.cos(angle) * radius;
      node.y = centerY + Math.sin(angle) * radius;
    });
  }

  function buildRelationGroups(entry, resultMap, index, categories, categoryLabels) {
    if (!entry) {
      return null;
    }

    const bySymbolId = new Map();
    categories.forEach((category) => {
      Array.from(resultMap[category.key].values()).forEach((candidate) => {
        bySymbolId.set(candidate.id, candidate);
      });
    });

    const outgoing = index.relations
      .filter((relation) => relation.fromSymbolId === entry.id)
      .map((relation) => bySymbolId.get(relation.toSymbolId))
      .filter(Boolean)
      .map((candidate) => ({
        name: candidate.name,
        categoryKey: candidate.categoryKey,
        label: `${candidate.name} · ${categoryLabels[candidate.categoryKey]}`
      }))
      .sort((left, right) => left.name.localeCompare(right.name));

    const incoming = index.relations
      .filter((relation) => relation.toSymbolId === entry.id)
      .map((relation) => bySymbolId.get(relation.fromSymbolId))
      .filter(Boolean)
      .map((candidate) => ({
        name: candidate.name,
        categoryKey: candidate.categoryKey,
        label: `${candidate.name} · ${categoryLabels[candidate.categoryKey]}`
      }))
      .sort((left, right) => left.name.localeCompare(right.name));

    const relationGroups = {};

    if (outgoing.length) {
      relationGroups["포함하는 항목"] = outgoing;
    }

    if (incoming.length) {
      relationGroups["상위 항목"] = incoming;
    }

    return Object.keys(relationGroups).length ? relationGroups : null;
  }

  function buildDatasetMeta(index, summary) {
    const documentTypes = Array.from(
      index.documents.reduce((accumulator, document) => accumulator.add(document.type), new Set())
    ).sort();

    return [
      `문서 ${summary.totalDocuments}건 · 심볼 ${index.symbols.length}건 · 발생 위치 ${index.occurrences.length}건`,
      documentTypes.length ? `문서 유형: ${documentTypes.join(", ").toUpperCase()}` : "문서 유형 정보 없음"
    ];
  }

  function buildScopeLabel(index, selectedDocumentPath) {
    if (!selectedDocumentPath) {
      return "전체 문서 범위";
    }

    const document = index.documents.find((item) => item.sourcePath === selectedDocumentPath);
    return document ? `문서 범위: ${document.sourcePath}` : `문서 범위: ${selectedDocumentPath}`;
  }

  function buildSummaryCards(indexSummary) {
    return [
      { label: "분석 문서 수", value: indexSummary.totalDocuments },
      { label: "클래스 / 인터페이스", value: indexSummary.totalClasses },
      { label: "메소드", value: indexSummary.totalMethods },
      { label: "테이블 / 컬럼", value: indexSummary.totalTables + indexSummary.totalColumns }
    ];
  }

  global.SpringMinerViewModel = {
    buildDependencyGraphData,
    buildDatasetMeta,
    buildRelationGroups,
    buildRelatedMap,
    buildResultMap,
    buildScopeLabel,
    buildSummaryCards,
    getFilteredNames,
    getSelectedEntry,
    getUnfilteredNames,
    getVisibleOccurrences
  };
})(window);
