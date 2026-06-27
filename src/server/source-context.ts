import type { Project, ReviewTarget, SelectedElement } from "@/generated/prisma/client";
import { getPrisma } from "@/lib/db";
import { normalizeUnifiedDiff } from "@/server/patches";

export type SourceCandidate = {
  path: string;
  content: string;
};

export type SourceContext = {
  candidates: SourceCandidate[];
  note: string;
};

type InferredPatch = {
  patch: string;
  title: string;
  issue: string;
  intendedOutcome: string;
};

const sourcePathPattern = /^(?:src\/)?(?:app|components|data|content|lib)\/.+\.(?:tsx|jsx|ts|js|css|json|mdx?)$/;
const maxFilesToFetch = 80;
const maxCandidates = 8;
const maxContentLength = 18_000;
const stopWords = new Set([
  "about",
  "after",
  "again",
  "also",
  "and",
  "are",
  "but",
  "can",
  "change",
  "component",
  "design",
  "for",
  "from",
  "hero",
  "into",
  "make",
  "note",
  "optimize",
  "please",
  "prompt",
  "recent",
  "rewrite",
  "selected",
  "that",
  "the",
  "this",
  "with",
]);

function selectedElementsFromContext(domContext: unknown): Array<{ selector?: string; text?: string; note?: string; role?: string }> {
  if (!domContext || typeof domContext !== "object") return [];
  const selectedElements = (domContext as { selectedElements?: unknown }).selectedElements;
  if (!Array.isArray(selectedElements)) return [];

  return selectedElements
    .filter((element): element is { selector?: string; text?: string; note?: string; role?: string } => Boolean(element) && typeof element === "object")
    .map((element) => ({
      selector: typeof element.selector === "string" ? element.selector : undefined,
      text: typeof element.text === "string" ? element.text : undefined,
      note: typeof element.note === "string" ? element.note : undefined,
      role: typeof element.role === "string" ? element.role : undefined,
    }));
}

function selectedElementsForReplacement(target: ReviewTarget & { element: SelectedElement | null }) {
  const selectedElements = selectedElementsFromContext(target.domContext);
  if (target.element) {
    const matchingContext = selectedElements.find((element) => (
      element.text?.trim() && target.element?.text?.trim()
        ? element.text.trim() === target.element.text.trim()
        : element.role && element.role === target.element?.role
    ));
    const focusedElement = {
      text: target.element.text ?? undefined,
      role: target.element.role ?? undefined,
      note: matchingContext?.note,
    };

    return [
      focusedElement,
      ...selectedElements.filter((element) => (
        element.note?.trim() &&
        (element.text?.trim() !== focusedElement.text?.trim() || element.note.trim() !== focusedElement.note?.trim())
      )),
    ];
  }
  return selectedElements.filter((element) => element.note?.trim());
}

function wordsFrom(value: string | undefined) {
  return (value ?? "")
    .toLowerCase()
    .match(/[a-z0-9][a-z0-9-]{2,}/g)
    ?.filter((word) => !stopWords.has(word))
    .slice(0, 24) ?? [];
}

function sourceTerms(target: ReviewTarget & { element: SelectedElement | null }, prompt?: string) {
  const selectedElements = selectedElementsFromContext(target.domContext);
  const exactPhrases = [
    target.element?.text,
    ...selectedElements.map((element) => element.text),
  ].map((phrase) => phrase?.trim()).filter((phrase): phrase is string => Boolean(phrase && phrase.length >= 3));

  const words = new Set<string>([
    ...wordsFrom(prompt),
    ...wordsFrom(target.element?.text ?? undefined),
    ...wordsFrom(target.element?.role ?? undefined),
    ...selectedElements.flatMap((element) => [
      ...wordsFrom(element.text),
      ...wordsFrom(element.note),
      ...wordsFrom(element.role),
    ]),
  ]);

  return { exactPhrases, words: [...words].slice(0, 40) };
}

function pathScore(path: string) {
  let score = 0;
  if (/\/page\.(tsx|jsx)$/.test(path)) score += 18;
  if (/\/layout\.(tsx|jsx)$/.test(path)) score += 8;
  if (/\/components?\//.test(path)) score += 8;
  if (/\/data\//.test(path)) score += 12;
  if (/\/content\//.test(path)) score += 10;
  if (/\.(css)$/.test(path)) score += 5;
  if (/node_modules|dist|build|\.next/.test(path)) score -= 100;
  return score;
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function capitalizeLikeSource(source: string, replacement: string) {
  if (!source || !replacement) return replacement;
  if (source[0] === source[0]?.toUpperCase()) {
    return replacement[0]?.toUpperCase() + replacement.slice(1);
  }
  return replacement;
}

function inferReplacement(note: string | undefined, currentText: string | undefined) {
  if (!note?.trim() || !currentText?.trim()) return null;
  const cleanNote = note.trim().replace(/\s+/g, " ");
  const patterns = [
    /\b(?:rename|change|replace|update)\b(?:\s+(?:it|this|text|label|link|copy|heading))?\s+(?:to|as)\s+["“]?(.+?)["”]?\.?$/i,
    /\b(?:make|turn)\b(?:\s+(?:it|this|text|label|link|copy|heading))?\s+(?:to|into)\s+["“]?(.+?)["”]?\.?$/i,
  ];

  for (const pattern of patterns) {
    const match = cleanNote.match(pattern);
    const replacement = match?.[1]?.trim();
    if (replacement && replacement.length <= 120) {
      return capitalizeLikeSource(currentText.trim(), replacement);
    }
  }

  return null;
}

function linePatch(path: string, lineIndex: number, oldLine: string, newLine: string) {
  const lineNumber = lineIndex + 1;
  return [
    `--- a/${path}`,
    `+++ b/${path}`,
    `@@ -${lineNumber},1 +${lineNumber},1 @@`,
    `-${oldLine}`,
    `+${newLine}`,
  ].join("\n");
}

function multiLinePatch(changes: Array<{ path: string; lineIndex: number; oldLine: string; newLine: string }>) {
  const sections = new Map<string, Array<{ lineIndex: number; oldLine: string; newLine: string }>>();
  for (const change of changes) {
    const fileChanges = sections.get(change.path) ?? [];
    fileChanges.push(change);
    sections.set(change.path, fileChanges);
  }

  return [...sections.entries()].flatMap(([path, fileChanges]) => [
    `--- a/${path}`,
    `+++ b/${path}`,
    ...fileChanges
      .sort((a, b) => a.lineIndex - b.lineIndex)
      .flatMap((change) => [
        `@@ -${change.lineIndex + 1},1 +${change.lineIndex + 1},1 @@`,
        `-${change.oldLine}`,
        `+${change.newLine}`,
      ]),
  ]).join("\n");
}

export function inferSimpleTextReplacementPatches(
  sourceContext: SourceContext,
  target: ReviewTarget & { element: SelectedElement | null },
): InferredPatch[] {
  const selectedElements = selectedElementsForReplacement(target);
  const changes: Array<{
    path: string;
    lineIndex: number;
    oldLine: string;
    newLine: string;
    currentTexts: string[];
    replacements: string[];
  }> = [];
  const seenChanges = new Set<string>();

  for (const element of selectedElements) {
    const currentText = element.text?.trim();
    const replacement = inferReplacement(element.note, currentText);
    if (!currentText || !replacement || replacement === currentText) continue;

    for (const candidate of sourceContext.candidates) {
      const lines = candidate.content.split("\n");
      const lineIndex = lines.findIndex((line) => line.includes(currentText));
      if (lineIndex === -1) continue;

      const oldLine = lines[lineIndex];
      const changeKey = `${candidate.path}:${lineIndex}:${currentText}:${replacement}`;
      if (seenChanges.has(changeKey)) continue;

      const existingLineChange = changes.find((change) => (
        change.path === candidate.path && change.lineIndex === lineIndex
      ));
      const baseLine = existingLineChange?.newLine ?? oldLine;
      const newLine = baseLine.replace(new RegExp(escapeRegExp(currentText), "g"), replacement);
      if (baseLine === newLine) continue;
      seenChanges.add(changeKey);

      if (existingLineChange) {
        existingLineChange.newLine = newLine;
        existingLineChange.currentTexts.push(currentText);
        existingLineChange.replacements.push(replacement);
      } else {
        changes.push({
          path: candidate.path,
          lineIndex,
          oldLine,
          newLine,
          currentTexts: [currentText],
          replacements: [replacement],
        });
      }
      break;
    }

    if (changes.length >= 3) break;
  }

  if (changes.length === 0) return [];

  const selectedChangeCount = changes.reduce((count, change) => count + change.currentTexts.length, 0);

  if (selectedChangeCount === 1) {
    const change = changes[0]!;
    const currentText = change.currentTexts[0]!;
    const replacement = change.replacements[0]!;
    return [{
      patch: linePatch(change.path, change.lineIndex, change.oldLine, change.newLine),
      title: `Rename “${currentText}” to “${replacement}”`,
      issue: `The selected copy reads “${currentText}”; the prompt asks to rename it to “${replacement}”.`,
      intendedOutcome: `Update the rendered copy to “${replacement}”.`,
    }];
  }

  const changedLabels = changes.flatMap((change) => change.currentTexts).map((text) => `“${text}”`).join(", ");
  return [{
    patch: multiLinePatch(changes),
    title: `Apply ${selectedChangeCount} selected text changes`,
    issue: `The selected component notes requested copy changes for ${changedLabels}.`,
    intendedOutcome: "Update all selected copy changes in one patch so the preview stays in sync.",
  }];
}

export function inferSimpleTextReplacementPatch(
  sourceContext: SourceContext,
  target: ReviewTarget & { element: SelectedElement | null },
) {
  return inferSimpleTextReplacementPatches(sourceContext, target)[0] ?? null;
}

function contentScore(path: string, content: string, exactPhrases: string[], words: string[]) {
  const lowerContent = content.toLowerCase();
  let score = pathScore(path);

  for (const phrase of exactPhrases) {
    if (lowerContent.includes(phrase.toLowerCase())) score += 120;
  }
  for (const word of words) {
    if (lowerContent.includes(word)) score += 12;
  }

  return score;
}

async function fetchJson<T>(url: string): Promise<T | null> {
  const response = await fetch(url, {
    headers: { accept: "application/vnd.github+json", "user-agent": "destoc-source-context" },
    signal: AbortSignal.timeout(8_000),
  });
  if (!response.ok) return null;
  return response.json() as Promise<T>;
}

async function fetchText(url: string): Promise<string | null> {
  const response = await fetch(url, {
    headers: { "user-agent": "destoc-source-context" },
    signal: AbortSignal.timeout(8_000),
  });
  if (!response.ok) return null;
  const text = await response.text();
  return text.slice(0, maxContentLength);
}

export function applyUnifiedDiffToCandidates(candidates: SourceCandidate[], patch: string): boolean {
  const lines = normalizeUnifiedDiff(patch).split("\n");
  let applied = false;
  let currentPath: string | null = null;
  let oldLines: string[] = [];
  let newLines: string[] = [];
  let removedLines: string[] = [];
  let addedLines: string[] = [];

  function flushHunk() {
    if (!currentPath || oldLines.length === 0) {
      oldLines = [];
      newLines = [];
      removedLines = [];
      addedLines = [];
      return;
    }

    const candidate = candidates.find((item) => item.path === currentPath);
    if (!candidate) {
      oldLines = [];
      newLines = [];
      removedLines = [];
      addedLines = [];
      return;
    }

    const oldBlock = oldLines.join("\n");
    const newBlock = newLines.join("\n");
    if (candidate.content.includes(oldBlock)) {
      candidate.content = candidate.content.replace(oldBlock, newBlock);
      applied = true;
    } else if (newBlock.length > 0 && candidate.content.includes(newBlock)) {
      applied = true;
    } else if (removedLines.length === addedLines.length && removedLines.length > 0) {
      for (let index = 0; index < removedLines.length; index += 1) {
        const removedLine = removedLines[index]!;
        const addedLine = addedLines[index]!;
        if (candidate.content.includes(addedLine)) {
          applied = true;
          continue;
        }
        if (!candidate.content.includes(removedLine)) continue;
        candidate.content = candidate.content.replace(removedLine, addedLine);
        applied = true;
      }
    } else if (addedLines.length === 0) {
      for (const removedLine of removedLines) {
        const withTrailingNewline = `${removedLine}\n`;
        if (candidate.content.includes(withTrailingNewline)) {
          candidate.content = candidate.content.replace(withTrailingNewline, "");
          applied = true;
        } else if (candidate.content.includes(removedLine)) {
          candidate.content = candidate.content.replace(removedLine, "");
          applied = true;
        }
      }
    }

    oldLines = [];
    newLines = [];
    removedLines = [];
    addedLines = [];
  }

  for (const line of lines) {
    if (line.startsWith("+++ b/")) {
      flushHunk();
      currentPath = line.slice("+++ b/".length).trim();
      continue;
    }

    if (line.startsWith("@@")) {
      flushHunk();
      continue;
    }

    if (!currentPath || line.startsWith("--- ") || line.startsWith("diff --git ") || line.startsWith("index ")) continue;
    if (line.startsWith("-")) {
      oldLines.push(line.slice(1));
      removedLines.push(line.slice(1));
    } else if (line.startsWith("+")) {
      newLines.push(line.slice(1));
      addedLines.push(line.slice(1));
    }
    else if (line.startsWith(" ")) {
      oldLines.push(line.slice(1));
      newLines.push(line.slice(1));
    }
  }

  flushHunk();
  return applied;
}

async function applyAcceptedPatches(projectId: string, candidates: SourceCandidate[]) {
  const revisions = await getPrisma().revision.findMany({
    where: { projectId, status: "READY" },
    orderBy: { createdAt: "asc" },
    select: { patch: true },
  });

  let appliedCount = 0;
  for (const revision of revisions) {
    if (applyUnifiedDiffToCandidates(candidates, revision.patch)) appliedCount += 1;
  }

  return appliedCount;
}

export async function sourceContextForReview(
  project: Project,
  target: ReviewTarget & { element: SelectedElement | null },
  prompt?: string,
): Promise<SourceContext> {
  const tree = await fetchJson<{
    tree?: Array<{ path?: string; type?: string; size?: number }>;
    truncated?: boolean;
  }>(`https://api.github.com/repos/${project.repositoryOwner}/${project.repositoryName}/git/trees/${encodeURIComponent(project.defaultBranch)}?recursive=1`);

  const files = (tree?.tree ?? [])
    .filter((entry) => entry.type === "blob" && typeof entry.path === "string")
    .filter((entry): entry is { path: string; type: string; size?: number } => sourcePathPattern.test(entry.path!))
    .filter((entry) => (entry.size ?? 0) <= 120_000)
    .sort((a, b) => pathScore(b.path) - pathScore(a.path))
    .slice(0, maxFilesToFetch);

  if (!files.length) {
    return { candidates: [], note: "No eligible source files were found under src/app or src/components." };
  }

  const { exactPhrases, words } = sourceTerms(target, prompt);
  const fetched = await Promise.all(files.map(async (file) => {
    const content = await fetchText(`https://raw.githubusercontent.com/${project.repositoryOwner}/${project.repositoryName}/${encodeURIComponent(project.defaultBranch)}/${file.path}`);
    if (!content) return null;
    return {
      path: file.path,
      content,
      score: contentScore(file.path, content, exactPhrases, words),
    };
  }));

  const candidates = fetched
    .filter((candidate): candidate is SourceCandidate & { score: number } => Boolean(candidate))
    .sort((a, b) => b.score - a.score)
    .slice(0, maxCandidates)
    .map(({ path, content }) => ({ path, content }));
  const appliedAcceptedPatchCount = await applyAcceptedPatches(project.id, candidates);

  return {
    candidates,
    note: candidates.length
      ? `Fetched ${candidates.length} bounded source candidates from GitHub for patch generation.${appliedAcceptedPatchCount ? ` Applied ${appliedAcceptedPatchCount} accepted patch${appliedAcceptedPatchCount === 1 ? "" : "es"} to match the current sandbox state.` : ""}`
      : "Source files were discovered but their contents could not be fetched.",
  };
}
