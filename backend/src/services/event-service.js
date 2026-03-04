import { computeEventContribution } from "./balance-service.js";

function normalizeWeekdays(value) {
  const source = Array.isArray(value) ? value : [1, 2, 3, 4, 5, 6, 7];
  return source
    .map((day) => Number(day))
    .filter((day) => Number.isInteger(day) && day >= 1 && day <= 7)
    .sort((a, b) => a - b);
}

function sameWeekdays(a, b) {
  const left = normalizeWeekdays(a);
  const right = normalizeWeekdays(b);
  if (left.length !== right.length) return false;
  return left.every((item, index) => item === right[index]);
}

function hasRecurringFinancialChange(previous, patchPayload) {
  if (previous.eventKind !== "recurring") return false;
  const scalarFields = [
    "amountYuan",
    "direction",
    "recurrenceUnit",
    "recurrenceInterval",
    "dailyStartTime",
    "dailyEndTime"
  ];
  for (const field of scalarFields) {
    if (Object.hasOwn(patchPayload, field) && patchPayload[field] !== previous[field]) {
      return true;
    }
  }
  if (Object.hasOwn(patchPayload, "activeWeekdays")) {
    return !sameWeekdays(previous.activeWeekdays, patchPayload.activeWeekdays);
  }
  return false;
}

export function createEventService({ eventRepository, snapshotService }) {
  return {
    listEvents(status) {
      return eventRepository.list(status);
    },
    listRecentEvents(limit = 20) {
      return eventRepository.list().slice(0, limit);
    },
    createEvent(payload, now = new Date()) {
      const event = eventRepository.create({
        ...payload,
        status: "active",
        createdAt: now.toISOString(),
        updatedAt: now.toISOString()
      });
      snapshotService.recomputeAndPersist(now);
      return event;
    },
    updateEvent(id, patchPayload, now = new Date()) {
      const previous = eventRepository.getById(id);
      if (!previous) return null;

      const nowIso = now.toISOString();
      let nextPatch = { ...patchPayload };

      if (previous.eventKind === "recurring" && previous.status === "active") {
        const recurringChanged = hasRecurringFinancialChange(previous, nextPatch);
        const nextStatus = nextPatch.status ?? previous.status;
        const turningInactive = nextStatus !== "active";

        if (recurringChanged || turningInactive) {
          const accrued = computeEventContribution(previous, now);
          if (Math.abs(accrued) >= 0.0001) {
            eventRepository.create({
              title: `${String(previous.title ?? "周期事件").trim() || "周期事件"}（历史结转）`,
              eventKind: "one_time",
              direction: accrued >= 0 ? "inflow" : "outflow",
              amountYuan: Math.abs(accrued),
              effectiveAt: nowIso,
              status: "active",
              createdAt: nowIso,
              updatedAt: nowIso
            });
          }
        }

        if (
          recurringChanged &&
          (!Object.hasOwn(nextPatch, "effectiveAt") || String(nextPatch.effectiveAt) === String(previous.effectiveAt))
        ) {
          nextPatch.effectiveAt = nowIso;
        }
      }

      const updated = eventRepository.patch(id, nextPatch, nowIso);
      if (!updated) return null;
      snapshotService.recomputeAndPersist(now);
      return updated;
    },
    removeEvent(id, now = new Date()) {
      const removed = eventRepository.hardDelete(id);
      if (!removed) return false;
      snapshotService.recomputeAndPersist(now);
      return true;
    }
  };
}
