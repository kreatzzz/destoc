import type { Project, ReviewTarget, SelectedElement } from "@/generated/prisma/client";

export type SourceCandidate = {
  path: string;
  content: string;
};

export type SourceContext = {
  candidates: SourceCandidate[];
  note: string;
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

function selectedElementsFromContext(domContext: unknown): Array<{ text?: string; note?: string; role?: string }> {
  if (!domContext || typeof domContext !== "object") return [];
  const selectedElements = (domContext as { selectedElements?: unknown }).selectedElements;
  if (!Array.isArray(selectedElements)) return [];

  return selectedElements
    .filter((element): element is { text?: string; note?: string; role?: string } => Boolean(element) && typeof element === "object")
    .map((element) => ({
      text: typeof element.text === "string" ? element.text : undefined,
      note: typeof element.note === "string" ? element.note : undefined,
      role: typeof element.role === "string" ? element.role : undefined,
    }));
}

function selectedElementsForReplacement(target: ReviewTarget & { element: SelectedElement | null }) {
  const selectedElements = selectedElementsFromContext(target.domContext);
  if (target.element) {
    selectedElements.unshift({
      text: target.element.text ?? undefined,
      role: target.element.role ?? undefined,
    });
  }
  return selectedElements;
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

function linePatch(path: string, oldLine: string, newLine: string) {
  return [
    `--- a/${path}`,
    `+++ b/${path}`,
    "@@",
    `-${oldLine}`,
    `+${newLine}`,
  ].join("\n");
}

export function inferSimpleTextReplacementPatch(
  sourceContext: SourceContext,
  target: ReviewTarget & { element: SelectedElement | null },
) {
  const selectedElements = selectedElementsForReplacement(target);

  for (const element of selectedElements) {
    const currentText = element.text?.trim();
    const replacement = inferReplacement(element.note, currentText);
    if (!currentText || !replacement || replacement === currentText) continue;

    for (const candidate of sourceContext.candidates) {
      const lines = candidate.content.split("\n");
      const lineIndex = lines.findIndex((line) => line.includes(currentText));
      if (lineIndex === -1) continue;

      const oldLine = lines[lineIndex];
      const newLine = oldLine.replace(new RegExp(escapeRegExp(currentText), "g"), replacement);
      if (oldLine === newLine) continue;

      return {
        patch: linePatch(candidate.path, oldLine, newLine),
        title: `Rename “${currentText}” to “${replacement}”`,
        issue: `The selected copy reads “${currentText}”; the prompt asks to rename it to “${replacement}”.`,
        intendedOutcome: `Update the rendered copy to “${replacement}”.`,
      };
    }
  }

  return null;
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

  return {
    candidates,
    note: candidates.length
      ? `Fetched ${candidates.length} bounded source candidates from GitHub for patch generation.`
      : "Source files were discovered but their contents could not be fetched.",
  };
}
