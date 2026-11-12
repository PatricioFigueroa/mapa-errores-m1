export function formatQuery(stem: string, correct: string, wrong: string): string {
  return `query: Wrong answer: ${wrong}\nCorrect answer: ${correct}\nQuestion: ${stem}`;
}

export function formatPassage(name: string): string {
  return `passage: ${name}`;
}
