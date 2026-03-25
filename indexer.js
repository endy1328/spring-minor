(function attachIndexer(global) {
  const categoryOrder = [
    "classes",
    "methods",
    "variables",
    "mappers",
    "namespaces",
    "tables",
    "columns"
  ];

  function createEmptyIndex() {
    return {
      documents: [],
      symbols: [],
      occurrences: [],
      relations: [],
      summaryCounts: {
        classes: 0,
        methods: 0,
        variables: 0,
        mappers: 0,
        namespaces: 0,
        tables: 0,
        columns: 0
      }
    };
  }

  async function buildIndex(documents, options = {}) {
    const index = createEmptyIndex();
    const symbolLookup = new Map();
    const symbolById = new Map();
    const occurrenceLookup = new Set();
    const relationLookup = new Set();
    const documentKinds = new Map();
    const onProgress = typeof options.onProgress === "function" ? options.onProgress : null;

    for (let documentOrder = 0; documentOrder < documents.length; documentOrder += 1) {
      const document = documents[documentOrder];
      const documentRecord = {
        id: `doc-${documentOrder + 1}`,
        name: document.name,
        sourcePath: document.sourcePath || document.name,
        type: document.type || getDocumentType(document.name),
        content: document.content || ""
      };

      index.documents.push(documentRecord);
      documentKinds.set(documentRecord.id, createDocumentKindBucket());
      extractTokens(documentRecord, index, symbolLookup, symbolById, occurrenceLookup, documentKinds);
      createDocumentRelations(documentRecord.id, index, relationLookup, documentKinds);

      if (onProgress) {
        onProgress({
          completed: documentOrder + 1,
          total: documents.length,
          document: documentRecord
        });
      }

      if ((documentOrder + 1) % 10 === 0 || documentOrder === documents.length - 1) {
        await yieldToBrowser();
      }
    }

    return index;
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

  function extractTokens(document, index, symbolLookup, symbolById, occurrenceLookup, documentKinds) {
    const { content, name, type, sourcePath, id: documentId } = document;

    if (type === "java" || type === "txt" || type === "mixed") {
      collectDetailed(content, /\bclass\s+([A-Z][A-Za-z0-9_]*)/g, "classes", documentId, name, sourcePath, type, index, symbolLookup, symbolById, occurrenceLookup, documentKinds);
      collectDetailed(content, /\binterface\s+([A-Z][A-Za-z0-9_]*)/g, "classes", documentId, name, sourcePath, type, index, symbolLookup, symbolById, occurrenceLookup, documentKinds);
      collectDetailed(
        content,
        /\b(?:public|protected|private)?\s*(?:static\s+)?(?:final\s+)?[A-Za-z0-9_<>,\[\]\.?]+\s+([a-z][A-Za-z0-9_]*)\s*\([^;{}]*\)\s*\{/g,
        "methods",
        documentId,
        name,
        sourcePath,
        type,
        index,
        symbolLookup,
        symbolById,
        occurrenceLookup,
        documentKinds
      );
      collectDetailed(
        content,
        /\b(?:private|protected|public)?\s*(?:static\s+)?(?:final\s+)?[A-Za-z0-9_<>,\[\]\.?]+\s+([a-z][A-Za-z0-9_]*)\s*(?:=|;)/g,
        "variables",
        documentId,
        name,
        sourcePath,
        type,
        index,
        symbolLookup,
        symbolById,
        occurrenceLookup,
        documentKinds
      );
    }

    if (type === "xml" || type === "mixed") {
      collectDetailed(content, /namespace\s*=\s*"([^"]+)"/g, "namespaces", documentId, name, sourcePath, type, index, symbolLookup, symbolById, occurrenceLookup, documentKinds);
      collectDetailed(content, /<mapper[^>]*namespace\s*=\s*"([^"]+)"/g, "mappers", documentId, name, sourcePath, type, index, symbolLookup, symbolById, occurrenceLookup, documentKinds);
      collectDetailed(content, /<(?:select|insert|update|delete)\s+id\s*=\s*"([^"]+)"/g, "mappers", documentId, name, sourcePath, type, index, symbolLookup, symbolById, occurrenceLookup, documentKinds);
    }

    collectSqlTokens(document, index, symbolLookup, symbolById, occurrenceLookup, documentKinds);
  }

  function collectSqlTokens(document, index, symbolLookup, symbolById, occurrenceLookup, documentKinds) {
    const { content, name, sourcePath, type, id: documentId } = document;
    const segments = type === "xml" ? extractXmlSqlSegments(content) : [{ text: content, baseIndex: 0 }];

    segments.forEach((segment) => {
      collectDetailed(
        segment.text,
        /\b(?:FROM|JOIN|UPDATE|INTO|TABLE)\s+([A-Z][A-Z0-9_]+)/g,
        "tables",
        documentId,
        name,
        sourcePath,
        type,
        index,
        symbolLookup,
        symbolById,
        occurrenceLookup,
        documentKinds,
        normalizeUpper,
        content,
        segment.baseIndex
      );
      collectDetailed(
        segment.text,
        /\bCREATE\s+TABLE\s+([A-Z][A-Z0-9_]+)/g,
        "tables",
        documentId,
        name,
        sourcePath,
        type,
        index,
        symbolLookup,
        symbolById,
        occurrenceLookup,
        documentKinds,
        normalizeUpper,
        content,
        segment.baseIndex
      );
      collectDetailed(
        segment.text,
        /\b([A-Z][A-Z0-9_]{1,})\b(?=\s+(?:BIGINT|VARCHAR|CHAR|TIMESTAMP|DATE|NUMBER|INT|DECIMAL|TEXT))/g,
        "columns",
        documentId,
        name,
        sourcePath,
        type,
        index,
        symbolLookup,
        symbolById,
        occurrenceLookup,
        documentKinds,
        normalizeUpper,
        content,
        segment.baseIndex
      );
      collectDetailed(
        segment.text,
        /\bSELECT\b([\s\S]*?)\bFROM\b/g,
        "columns",
        documentId,
        name,
        sourcePath,
        type,
        index,
        symbolLookup,
        symbolById,
        occurrenceLookup,
        documentKinds,
        extractSelectColumns,
        content,
        segment.baseIndex
      );
    });
  }

  function collectDetailed(
    content,
    regex,
    kind,
    documentId,
    documentName,
    sourcePath,
    documentType,
    index,
    symbolLookup,
    symbolById,
    occurrenceLookup,
    documentKinds,
    transform = identity,
    originalContent = content,
    baseIndex = 0
  ) {
    let match;

    while ((match = regex.exec(content)) !== null) {
      const rawValue = transform(match[1]);
      const values = Array.isArray(rawValue) ? rawValue.filter(Boolean) : [rawValue].filter(Boolean);

      values.forEach((value) => {
        const symbol = getOrCreateSymbol(index, symbolLookup, symbolById, kind, value, documentId);
        addOccurrence(index, symbol, {
          documentId,
          documentName,
          sourcePath,
          documentType,
          content: originalContent,
          matchIndex: baseIndex + match.index,
          matchLength: match[0].length
        }, occurrenceLookup, documentKinds);
      });
    }
  }

  function getOrCreateSymbol(index, symbolLookup, symbolById, kind, name, documentId) {
    const key = `${kind}::${name}`;

    if (symbolLookup.has(key)) {
      return symbolLookup.get(key);
    }

    const symbol = {
      id: `sym-${index.symbols.length + 1}`,
      kind,
      name,
      qualifiedName: name,
      documentId,
      definedAtOccurrenceId: null
    };

    index.symbols.push(symbol);
    symbolLookup.set(key, symbol);
    symbolById.set(symbol.id, symbol);
    index.summaryCounts[kind] += 1;
    return symbol;
  }

  function addOccurrence(index, symbol, context, occurrenceLookup, documentKinds) {
    const occurrence = {
      id: `occ-${index.occurrences.length + 1}`,
      symbolId: symbol.id,
      documentId: context.documentId,
      role: symbol.definedAtOccurrenceId ? "reference" : "definition",
      documentName: context.documentName,
      sourcePath: context.sourcePath,
      documentType: context.documentType,
      lineNumber: getLineNumber(context.content, context.matchIndex),
      snippet: extractSnippet(context.content, context.matchIndex, context.matchLength)
    };

    const occurrenceKey = `${occurrence.symbolId}::${occurrence.documentId}::${occurrence.lineNumber}::${occurrence.snippet}`;

    if (occurrenceLookup.has(occurrenceKey)) {
      return;
    }

    occurrenceLookup.add(occurrenceKey);
    index.occurrences.push(occurrence);
    documentKinds.get(context.documentId)?.[symbol.kind].set(symbol.id, symbol);

    if (!symbol.definedAtOccurrenceId) {
      symbol.definedAtOccurrenceId = occurrence.id;
    }
  }

  function createDocumentRelations(documentId, index, relationLookup, documentKinds) {
    const kindBucket = documentKinds.get(documentId);

    if (!kindBucket) {
      return;
    }

    const classes = Array.from(kindBucket.classes.values());
    const methods = Array.from(kindBucket.methods.values());
    const variables = Array.from(kindBucket.variables.values());
    const namespaces = Array.from(kindBucket.namespaces.values());
    const mappers = Array.from(kindBucket.mappers.values());

    classes.forEach((classSymbol) => {
      methods.forEach((methodSymbol) => addRelation(index, relationLookup, "contains", classSymbol.id, methodSymbol.id));
      variables.forEach((variableSymbol) => addRelation(index, relationLookup, "contains", classSymbol.id, variableSymbol.id));
    });

    namespaces.forEach((namespaceSymbol) => {
      mappers.forEach((mapperSymbol) => addRelation(index, relationLookup, "contains", namespaceSymbol.id, mapperSymbol.id));
    });
  }

  function addRelation(index, relationLookup, type, fromSymbolId, toSymbolId) {
    const key = `${type}::${fromSymbolId}::${toSymbolId}`;

    if (relationLookup.has(key) || fromSymbolId === toSymbolId) {
      return;
    }

    relationLookup.add(key);
    index.relations.push({
      id: `rel-${index.relations.length + 1}`,
      type,
      fromSymbolId,
      toSymbolId
    });
  }

  function buildSummary(index) {
    return {
      totalDocuments: index.documents.length,
      totalClasses: index.summaryCounts.classes,
      totalMethods: index.summaryCounts.methods,
      totalVariables: index.summaryCounts.variables,
      totalMappers: index.summaryCounts.mappers,
      totalNamespaces: index.summaryCounts.namespaces,
      totalTables: index.summaryCounts.tables,
      totalColumns: index.summaryCounts.columns
    };
  }

  function serializeIndex(index) {
    return {
      documents: index.documents.map((document) => ({
        id: document.id,
        name: document.name,
        sourcePath: document.sourcePath,
        type: document.type
      })),
      symbols: index.symbols.map((symbol) => ({ ...symbol })),
      occurrences: index.occurrences.map((occurrence) => ({ ...occurrence })),
      relations: index.relations.map((relation) => ({ ...relation })),
      summaryCounts: { ...index.summaryCounts }
    };
  }

  function hydrateIndexFromSnapshot(snapshot) {
    if (snapshot.index) {
      return normalizeIndex(snapshot.index);
    }

    return hydrateLegacyResults(snapshot);
  }

  function normalizeIndex(index) {
    return {
      documents: (index.documents || []).map((document) => ({
        id: document.id,
        name: document.name,
        sourcePath: document.sourcePath || document.name,
        type: document.type || getDocumentType(document.name),
        content: ""
      })),
      symbols: (index.symbols || []).map((symbol) => ({ ...symbol })),
      occurrences: (index.occurrences || []).map((occurrence) => ({
        ...occurrence,
        sourcePath: occurrence.sourcePath || occurrence.documentName,
        documentType: occurrence.documentType || getDocumentType(occurrence.documentName || "")
      })),
      relations: (index.relations || []).map((relation) => ({ ...relation })),
      summaryCounts: {
        classes: index.summaryCounts?.classes ?? (index.symbols || []).filter((symbol) => symbol.kind === "classes").length,
        methods: index.summaryCounts?.methods ?? (index.symbols || []).filter((symbol) => symbol.kind === "methods").length,
        variables: index.summaryCounts?.variables ?? (index.symbols || []).filter((symbol) => symbol.kind === "variables").length,
        mappers: index.summaryCounts?.mappers ?? (index.symbols || []).filter((symbol) => symbol.kind === "mappers").length,
        namespaces: index.summaryCounts?.namespaces ?? (index.symbols || []).filter((symbol) => symbol.kind === "namespaces").length,
        tables: index.summaryCounts?.tables ?? (index.symbols || []).filter((symbol) => symbol.kind === "tables").length,
        columns: index.summaryCounts?.columns ?? (index.symbols || []).filter((symbol) => symbol.kind === "columns").length
      }
    };
  }

  function hydrateLegacyResults(snapshot) {
    const index = createEmptyIndex();
    const documentMap = new Map();

    (snapshot.documents || []).forEach((document, docIndex) => {
      const doc = {
        id: document.id || `doc-${docIndex + 1}`,
        name: document.name,
        sourcePath: document.sourcePath || document.name,
        type: document.type || getDocumentType(document.name),
        content: ""
      };
      index.documents.push(doc);
      documentMap.set(doc.sourcePath, doc);
    });

    categoryOrder.forEach((categoryKey) => {
      const items = snapshot.results?.[categoryKey] || [];

      items.forEach((item) => {
        const symbol = {
          id: `sym-${index.symbols.length + 1}`,
          kind: categoryKey,
          name: item.name,
          qualifiedName: item.name,
          documentId: null,
          definedAtOccurrenceId: null
        };

        index.symbols.push(symbol);
        index.summaryCounts[categoryKey] += 1;

        (item.occurrences || []).forEach((occurrence) => {
          const sourcePath = occurrence.sourcePath || occurrence.documentName;
          let document = documentMap.get(sourcePath);

          if (!document) {
            document = {
              id: `doc-${index.documents.length + 1}`,
              name: occurrence.documentName,
              sourcePath,
              type: occurrence.documentType || getDocumentType(occurrence.documentName),
              content: ""
            };
            index.documents.push(document);
            documentMap.set(sourcePath, document);
          }

          const nextOccurrence = {
            id: `occ-${index.occurrences.length + 1}`,
            symbolId: symbol.id,
            documentId: document.id,
            role: symbol.definedAtOccurrenceId ? "reference" : "definition",
            documentName: occurrence.documentName,
            sourcePath,
            documentType: occurrence.documentType || getDocumentType(occurrence.documentName),
            lineNumber: occurrence.lineNumber || 0,
            snippet: occurrence.snippet || ""
          };

          index.occurrences.push(nextOccurrence);
          symbol.documentId = symbol.documentId || document.id;
          symbol.definedAtOccurrenceId = symbol.definedAtOccurrenceId || nextOccurrence.id;
        });
      });
    });

    return index;
  }

  function extractSelectColumns(segment) {
    return segment
      .split(",")
      .map((item) => item.replace(/\s+AS\s+\w+/gi, "").trim())
      .map((item) => item.split(".").pop())
      .map((item) => item.replace(/[^\w]/g, ""))
      .filter((item) => /^[A-Z][A-Z0-9_]+$/i.test(item))
      .map((item) => item.toUpperCase());
  }

  function normalizeUpper(value) {
    return value ? value.toUpperCase() : "";
  }

  function identity(value) {
    return value ? value.trim() : "";
  }

  function getLineNumber(content, matchIndex) {
    return content.slice(0, matchIndex).split("\n").length;
  }

  function extractSnippet(content, matchIndex, matchLength) {
    const lineStart = content.lastIndexOf("\n", matchIndex - 1);
    const sliceStart = lineStart === -1 ? 0 : lineStart + 1;
    const tailIndex = matchIndex + matchLength;
    const nextLineBreak = content.indexOf("\n", tailIndex);
    const sliceEnd = nextLineBreak === -1 ? content.length : nextLineBreak;
    const line = content.slice(sliceStart, sliceEnd).trim();

    if (line.length <= 180) {
      return line;
    }

    return `${line.slice(0, 177)}...`;
  }

  function extractXmlSqlSegments(content) {
    const segments = [];
    const regex = /<(select|insert|update|delete)\b[^>]*>([\s\S]*?)<\/\1>/gi;
    let match;

    while ((match = regex.exec(content)) !== null) {
      const body = match[2];
      const baseIndex = match.index + match[0].indexOf(body);
      segments.push({
        text: body,
        baseIndex
      });
    }

    return segments.length ? segments : [{ text: content, baseIndex: 0 }];
  }

  function getDocumentType(fileName) {
    const extension = fileName.split(".").pop()?.toLowerCase();
    return ["java", "xml", "sql", "txt", "mixed"].includes(extension) ? extension : "txt";
  }

  function createDocumentKindBucket() {
    return {
      classes: new Map(),
      methods: new Map(),
      variables: new Map(),
      mappers: new Map(),
      namespaces: new Map(),
      tables: new Map(),
      columns: new Map()
    };
  }

  global.SpringMinerIndexer = {
    buildIndex,
    buildSummary,
    createEmptyIndex,
    getDocumentType,
    hydrateIndexFromSnapshot,
    serializeIndex
  };
})(typeof globalThis !== "undefined" ? globalThis : window);
