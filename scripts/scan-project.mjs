import { promises as fs } from "node:fs";
import path from "node:path";
import os from "node:os";
import { spawnSync } from "node:child_process";

const supportedExtensions = new Set([".java", ".xml", ".sql", ".txt"]);

const categories = {
  classes: new Map(),
  methods: new Map(),
  variables: new Map(),
  mappers: new Map(),
  namespaces: new Map(),
  tables: new Map(),
  columns: new Map()
};

const targetRoot = process.argv[2];

if (!targetRoot) {
  console.error("Usage: node scripts/scan-project.mjs <project-path>");
  process.exit(1);
}

const absoluteRoot = path.resolve(targetRoot);
const files = await walk(absoluteRoot);
const documents = [];
const javaDocuments = [];

for (const filePath of files) {
  const extension = path.extname(filePath).toLowerCase();

  if (!supportedExtensions.has(extension)) {
    continue;
  }

  const content = await fs.readFile(filePath, "utf8");
  const relativePath = path.relative(absoluteRoot, filePath) || path.basename(filePath);
  const document = {
    name: path.basename(filePath),
    sourcePath: relativePath,
    type: extension.replace(".", ""),
    content
  };

  documents.push(document);

  if (document.type === "java") {
    javaDocuments.push(document);
  } else {
    extractTokens(document);
  }
}

if (javaDocuments.length) {
  applyJavaAstResults(javaDocuments);
}

const output = {
  root: absoluteRoot,
  analyzedAt: new Date().toISOString(),
  summary: {
    totalDocuments: documents.length,
    totalClasses: categories.classes.size,
    totalMethods: categories.methods.size,
    totalVariables: categories.variables.size,
    totalMappers: categories.mappers.size,
    totalNamespaces: categories.namespaces.size,
    totalTables: categories.tables.size,
    totalColumns: categories.columns.size
  },
  documents: documents.map((document) => ({
    name: document.name,
    sourcePath: document.sourcePath,
    type: document.type
  })),
  results: Object.fromEntries(
    Object.entries(categories).map(([key, value]) => [
      key,
      Array.from(value.values()).sort((a, b) => a.name.localeCompare(b.name))
    ])
  )
};

process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);

function extractTokens(document) {
  const { content, name, sourcePath, type } = document;

  if (type === "txt") {
    collectDetailed(content, /\bclass\s+([A-Z][A-Za-z0-9_]*)/g, categories.classes, name, sourcePath, type);
    collectDetailed(content, /\binterface\s+([A-Z][A-Za-z0-9_]*)/g, categories.classes, name, sourcePath, type);
    collectDetailed(
      content,
      /\b(?:public|protected|private)?\s*(?:static\s+)?(?:final\s+)?[A-Za-z0-9_<>,\[\]\.?]+\s+([a-z][A-Za-z0-9_]*)\s*\([^;{}]*\)\s*\{/g,
      categories.methods,
      name,
      sourcePath,
      type
    );
    collectDetailed(
      content,
      /\b(?:private|protected|public)?\s*(?:static\s+)?(?:final\s+)?[A-Za-z0-9_<>,\[\]\.?]+\s+([a-z][A-Za-z0-9_]*)\s*(?:=|;)/g,
      categories.variables,
      name,
      sourcePath,
      type
    );
  }

  if (type === "xml") {
    collectDetailed(content, /namespace\s*=\s*"([^"]+)"/g, categories.namespaces, name, sourcePath, type);
    collectDetailed(content, /<mapper[^>]*namespace\s*=\s*"([^"]+)"/g, categories.mappers, name, sourcePath, type);
    collectDetailed(content, /<(?:select|insert|update|delete)\s+id\s*=\s*"([^"]+)"/g, categories.mappers, name, sourcePath, type);
  }

  collectSqlTokens(document);
}

function applyJavaAstResults(javaDocuments) {
  const cacheDir = path.join(os.tmpdir(), "spring-miner-java-ast");
  const sourceFile = path.join(path.dirname(new URL(import.meta.url).pathname), "JavaAstScanner.java");
  const compile = spawnSync("javac", ["-d", cacheDir, sourceFile], { encoding: "utf8" });

  if (compile.status !== 0) {
    throw new Error(`Java AST compiler failed: ${compile.stderr || compile.stdout}`);
  }

  const javaFilePaths = javaDocuments.map((document) => path.join(absoluteRoot, document.sourcePath));
  const run = spawnSync(
    "java",
    ["-cp", cacheDir, "JavaAstScanner", absoluteRoot, ...javaFilePaths],
    { encoding: "utf8", maxBuffer: 1024 * 1024 * 10 }
  );

  if (run.status !== 0) {
    throw new Error(`Java AST scanner failed: ${run.stderr || run.stdout}`);
  }

  const parsed = JSON.parse(run.stdout);

  ["classes", "methods", "variables"].forEach((categoryKey) => {
    (parsed[categoryKey] || []).forEach((entry) => {
      entry.occurrences.forEach((occurrence) => {
        addOccurrence(
          categories[categoryKey],
          entry.name,
          occurrence.documentName,
          occurrence.sourcePath,
          occurrence.documentType,
          occurrence.snippet,
          0,
          occurrence.snippet.length,
          occurrence.lineNumber,
          occurrence.snippet
        );
      });
    });
  });
}

function collectSqlTokens(document) {
  const { content, name, sourcePath, type } = document;
  const segments =
    type === "xml"
      ? extractXmlSqlSegments(content)
      : [{ text: content, baseIndex: 0 }];

  segments.forEach((segment) => {
    collectDetailed(
      segment.text,
      /\b(?:FROM|JOIN|UPDATE|INTO|TABLE)\s+([A-Z][A-Z0-9_]+)/g,
      categories.tables,
      name,
      sourcePath,
      type,
      normalizeUpper,
      content,
      segment.baseIndex
    );
    collectDetailed(
      segment.text,
      /\bCREATE\s+TABLE\s+([A-Z][A-Z0-9_]+)/g,
      categories.tables,
      name,
      sourcePath,
      type,
      normalizeUpper,
      content,
      segment.baseIndex
    );
    collectDetailed(
      segment.text,
      /\b([A-Z][A-Z0-9_]{1,})\b(?=\s+(?:BIGINT|VARCHAR|CHAR|TIMESTAMP|DATE|NUMBER|INT|DECIMAL|TEXT))/g,
      categories.columns,
      name,
      sourcePath,
      type,
      normalizeUpper,
      content,
      segment.baseIndex
    );
    collectDetailed(
      segment.text,
      /\bSELECT\b([\s\S]*?)\bFROM\b/g,
      categories.columns,
      name,
      sourcePath,
      type,
      extractSelectColumns,
      content,
      segment.baseIndex
    );
  });
}

function collectDetailed(
  content,
  regex,
  targetMap,
  documentName,
  sourcePath,
  documentType,
  transform = identity,
  originalContent = content,
  baseIndex = 0
) {
  let match;

  while ((match = regex.exec(content)) !== null) {
    const rawValue = transform(match[1]);
    const values = Array.isArray(rawValue) ? rawValue.filter(Boolean) : [rawValue].filter(Boolean);

    values.forEach((value) => {
      addOccurrence(targetMap, value, documentName, sourcePath, documentType, originalContent, baseIndex + match.index, match[0].length);
    });
  }
}

function addOccurrence(targetMap, name, documentName, sourcePath, documentType, content, matchIndex, matchLength, forcedLineNumber = null, forcedSnippet = null) {
  if (!targetMap.has(name)) {
    targetMap.set(name, {
      name,
      occurrences: []
    });
  }

  const occurrence = {
    documentName,
    sourcePath,
    documentType,
    lineNumber: forcedLineNumber ?? getLineNumber(content, matchIndex),
    snippet: forcedSnippet ?? extractSnippet(content, matchIndex, matchLength)
  };

  const entry = targetMap.get(name);
  const exists = entry.occurrences.some(
    (item) =>
      item.documentName === occurrence.documentName &&
      item.sourcePath === occurrence.sourcePath &&
      item.documentType === occurrence.documentType &&
      item.lineNumber === occurrence.lineNumber &&
      item.snippet === occurrence.snippet
  );

  if (!exists) {
    entry.occurrences.push(occurrence);
  }
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

async function walk(currentPath) {
  const entries = await fs.readdir(currentPath, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(currentPath, entry.name);

    if (entry.isDirectory()) {
      files.push(...(await walk(fullPath)));
      continue;
    }

    files.push(fullPath);
  }

  return files;
}
