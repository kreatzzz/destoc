import type { Project, ReviewTarget, SelectedElement } from "@/generated/prisma/client";

type SourceCandidate = {
  path: string;
  content: string;
};

type SourceContext = {
  candidates: SourceCandidate[];
  note: string;
};

const sourcePathPattern = /^src\/(?:app|components)\/.+\.(?:tsx|jsx|ts|js|css)$/;
const maxFilesToFetch = 36;
const maxCandidates = 5;
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
  if (/\.(css)$/.test(path)) score += 5;
  if (/node_modules|dist|build|\.next/.test(path)) score -= 100;
  return score;
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
