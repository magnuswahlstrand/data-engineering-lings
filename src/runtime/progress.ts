export const PROGRESS_KEY = "de-lings:progress:v1";
export interface Progress {
  version: 1;
  drafts: Record<string, string>;
  completed: string[];
  attempted: string[];
  currentId?: string;
}
export function readProgress(ids: string[]): Progress {
  const empty: Progress = {
    version: 1,
    drafts: {},
    completed: [],
    attempted: [],
  };
  try {
    const saved = JSON.parse(localStorage.getItem(PROGRESS_KEY) ?? "null");
    if (!saved || saved.version !== 1) return empty;
    const drafts = Object.fromEntries(
      ids
        .filter(
          (id) =>
            saved.drafts &&
            Object.hasOwn(saved.drafts, id) &&
            typeof saved.drafts[id] === "string",
        )
        .map((id) => [id, saved.drafts[id]]),
    );
    const validIds = (items: unknown) =>
      Array.isArray(items) ? ids.filter((id) => items.includes(id)) : [];
    return {
      version: 1,
      drafts,
      completed: validIds(saved.completed),
      attempted: validIds(saved.attempted),
      currentId: ids.includes(saved.currentId) ? saved.currentId : undefined,
    };
  } catch {
    return empty;
  }
}
export function saveProgress(progress: Progress): boolean {
  try {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
    return true;
  } catch {
    return false;
  }
}
