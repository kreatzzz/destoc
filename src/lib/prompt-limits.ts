export const REVIEW_PROMPT_WORD_LIMIT = 100;

export function countWords(value: string) {
  return value.trim().match(/\S+/g)?.length ?? 0;
}

export function limitWords(value: string, limit = REVIEW_PROMPT_WORD_LIMIT) {
  const matches = [...value.matchAll(/\S+/g)];
  if (matches.length <= limit) return value;

  const finalWord = matches[limit - 1];
  if (finalWord?.index === undefined) return "";
  return value.slice(0, finalWord.index + finalWord[0].length);
}
