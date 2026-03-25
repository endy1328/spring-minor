import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

import javax.tools.JavaCompiler;
import javax.tools.JavaFileObject;
import javax.tools.StandardJavaFileManager;
import javax.tools.ToolProvider;

import com.sun.source.tree.ClassTree;
import com.sun.source.tree.CompilationUnitTree;
import com.sun.source.tree.MethodTree;
import com.sun.source.tree.VariableTree;
import com.sun.source.util.JavacTask;
import com.sun.source.util.TreePathScanner;
import com.sun.source.util.Trees;

public class JavaAstScanner {
    public static void main(String[] args) throws Exception {
        if (args.length < 2) {
            System.err.println("Usage: java JavaAstScanner <root-path> <java-file>...");
            System.exit(1);
        }

        Path rootPath = Paths.get(args[0]).toAbsolutePath().normalize();
        List<Path> javaFiles = new ArrayList<>();

        for (int i = 1; i < args.length; i += 1) {
            javaFiles.add(Paths.get(args[i]).toAbsolutePath().normalize());
        }

        JavaCompiler compiler = ToolProvider.getSystemJavaCompiler();
        if (compiler == null) {
            throw new IllegalStateException("System Java compiler is not available.");
        }

        try (StandardJavaFileManager fileManager = compiler.getStandardFileManager(null, null, StandardCharsets.UTF_8)) {
            Iterable<? extends JavaFileObject> compilationUnits = fileManager.getJavaFileObjectsFromPaths(javaFiles);
            JavacTask task = (JavacTask) compiler.getTask(
                null,
                fileManager,
                null,
                Arrays.asList("-proc:none", "-XDshouldStopPolicy=GENERATE"),
                null,
                compilationUnits
            );

            Iterable<? extends CompilationUnitTree> parsedUnits = task.parse();
            Trees trees = Trees.instance(task);
            Map<String, List<Entry>> results = new LinkedHashMap<>();
            results.put("classes", new ArrayList<>());
            results.put("methods", new ArrayList<>());
            results.put("variables", new ArrayList<>());

            for (CompilationUnitTree unit : parsedUnits) {
                String sourceFilePath = unit.getSourceFile().toUri().getPath();
                Path absoluteFile = Paths.get(sourceFilePath).toAbsolutePath().normalize();
                String documentName = absoluteFile.getFileName().toString();
                String sourcePath = rootPath.relativize(absoluteFile).toString().replace('\\', '/');
                String content = Files.readString(absoluteFile, StandardCharsets.UTF_8);

                new AstVisitor(trees, unit, content, documentName, sourcePath, results).scan(unit, null);
            }

            System.out.println(toJson(results));
        }
    }

    private static final class AstVisitor extends TreePathScanner<Void, Void> {
        private final Trees trees;
        private final CompilationUnitTree unit;
        private final String content;
        private final String documentName;
        private final String sourcePath;
        private final Map<String, List<Entry>> results;

        private AstVisitor(
            Trees trees,
            CompilationUnitTree unit,
            String content,
            String documentName,
            String sourcePath,
            Map<String, List<Entry>> results
        ) {
            this.trees = trees;
            this.unit = unit;
            this.content = content;
            this.documentName = documentName;
            this.sourcePath = sourcePath;
            this.results = results;
        }

        @Override
        public Void visitClass(ClassTree node, Void unused) {
            addEntry("classes", node.getSimpleName().toString(), (int) trees.getSourcePositions().getStartPosition(unit, node), node.toString());
            return super.visitClass(node, unused);
        }

        @Override
        public Void visitMethod(MethodTree node, Void unused) {
            if (!"<init>".equals(node.getName().toString())) {
                addEntry("methods", node.getName().toString(), (int) trees.getSourcePositions().getStartPosition(unit, node), node.toString());
            }
            return super.visitMethod(node, unused);
        }

        @Override
        public Void visitVariable(VariableTree node, Void unused) {
            addEntry("variables", node.getName().toString(), (int) trees.getSourcePositions().getStartPosition(unit, node), node.toString());
            return super.visitVariable(node, unused);
        }

        private void addEntry(String category, String name, int startPosition, String rawSnippet) {
            if (name == null || name.isBlank() || startPosition < 0) {
                return;
            }

            int lineNumber = (int) unit.getLineMap().getLineNumber(startPosition);
            String snippet = buildSnippet(startPosition, rawSnippet);
            List<Entry> entries = results.get(category);
            Entry target = null;

            for (Entry entry : entries) {
                if (entry.name.equals(name)) {
                    target = entry;
                    break;
                }
            }

            if (target == null) {
                target = new Entry(name);
                entries.add(target);
            }

            Occurrence occurrence = new Occurrence(documentName, sourcePath, "java", lineNumber, snippet);
            if (!target.occurrences.contains(occurrence)) {
                target.occurrences.add(occurrence);
            }
        }

        private String buildSnippet(int startPosition, String rawSnippet) {
            int lineStart = content.lastIndexOf('\n', Math.max(0, startPosition - 1));
            int sliceStart = lineStart == -1 ? 0 : lineStart + 1;
            int lineEnd = content.indexOf('\n', startPosition);
            int sliceEnd = lineEnd == -1 ? content.length() : lineEnd;
            String line = content.substring(sliceStart, sliceEnd).trim();

            if (rawSnippet != null && (line.isEmpty() || line.startsWith("@"))) {
                String normalized = rawSnippet.trim();
                for (String candidate : normalized.split("\\R")) {
                    String trimmed = candidate.trim();
                    if (!trimmed.isEmpty() && !trimmed.startsWith("@")) {
                        line = trimmed;
                        break;
                    }
                }
            }

            if (line.length() <= 180) {
                return line;
            }

            return line.substring(0, 177) + "...";
        }
    }

    private static final class Entry {
        private final String name;
        private final List<Occurrence> occurrences = new ArrayList<>();

        private Entry(String name) {
            this.name = name;
        }
    }

    private static final class Occurrence {
        private final String documentName;
        private final String sourcePath;
        private final String documentType;
        private final int lineNumber;
        private final String snippet;

        private Occurrence(String documentName, String sourcePath, String documentType, int lineNumber, String snippet) {
            this.documentName = documentName;
            this.sourcePath = sourcePath;
            this.documentType = documentType;
            this.lineNumber = lineNumber;
            this.snippet = snippet;
        }

        @Override
        public boolean equals(Object other) {
            if (!(other instanceof Occurrence occurrence)) {
                return false;
            }

            return documentName.equals(occurrence.documentName)
                && sourcePath.equals(occurrence.sourcePath)
                && documentType.equals(occurrence.documentType)
                && lineNumber == occurrence.lineNumber
                && snippet.equals(occurrence.snippet);
        }

        @Override
        public int hashCode() {
            return documentName.hashCode() * 31 + sourcePath.hashCode() * 17 + lineNumber;
        }
    }

    private static String toJson(Map<String, List<Entry>> results) {
        StringBuilder builder = new StringBuilder();
        builder.append("{");
        int categoryIndex = 0;

        for (Map.Entry<String, List<Entry>> category : results.entrySet()) {
            if (categoryIndex > 0) {
                builder.append(",");
            }

            builder.append("\"").append(escape(category.getKey())).append("\":[");
            for (int i = 0; i < category.getValue().size(); i += 1) {
                if (i > 0) {
                    builder.append(",");
                }

                Entry entry = category.getValue().get(i);
                builder.append("{\"name\":\"").append(escape(entry.name)).append("\",\"occurrences\":[");
                for (int j = 0; j < entry.occurrences.size(); j += 1) {
                    if (j > 0) {
                        builder.append(",");
                    }

                    Occurrence occurrence = entry.occurrences.get(j);
                    builder.append("{")
                        .append("\"documentName\":\"").append(escape(occurrence.documentName)).append("\",")
                        .append("\"sourcePath\":\"").append(escape(occurrence.sourcePath)).append("\",")
                        .append("\"documentType\":\"").append(escape(occurrence.documentType)).append("\",")
                        .append("\"lineNumber\":").append(occurrence.lineNumber).append(",")
                        .append("\"snippet\":\"").append(escape(occurrence.snippet)).append("\"")
                        .append("}");
                }
                builder.append("]}");
            }
            builder.append("]");
            categoryIndex += 1;
        }

        builder.append("}");
        return builder.toString();
    }

    private static String escape(String value) {
        StringBuilder builder = new StringBuilder();
        for (char ch : value.toCharArray()) {
            switch (ch) {
                case '\\' -> builder.append("\\\\");
                case '"' -> builder.append("\\\"");
                case '\n' -> builder.append("\\n");
                case '\r' -> builder.append("\\r");
                case '\t' -> builder.append("\\t");
                default -> builder.append(ch);
            }
        }
        return builder.toString();
    }
}
