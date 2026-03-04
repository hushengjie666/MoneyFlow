function normalizeTitle(value) {
  return String(value ?? "").trim();
}

export function isSystemGeneratedEvent(event) {
  const title = normalizeTitle(event?.title);
  if (!title) return false;
  if (title === "初始化对齐") return true;
  return title.endsWith("（历史结转）");
}

export function filterRecentEvents(events, showSystemGenerated = false) {
  const source = Array.isArray(events) ? events : [];
  if (showSystemGenerated) return [...source];
  return source.filter((event) => !isSystemGeneratedEvent(event));
}
