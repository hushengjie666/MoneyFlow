import { computeBalanceTick } from "./balance-service.js";

export function createSnapshotService({ snapshotRepository, eventRepository }) {
  function ensureSnapshot() {
    return (
      snapshotRepository.getSnapshot() ?? {
        initialBalanceYuan: 0,
        currentBalanceYuan: 0,
        timezone: "Asia/Shanghai",
        updatedAt: new Date().toISOString()
      }
    );
  }

  function recomputeAndPersist(now = new Date()) {
    const snapshot = ensureSnapshot();
    const events = eventRepository.listForBalance();
    const tick = computeBalanceTick({
      initialBalanceYuan: snapshot.initialBalanceYuan,
      events,
      now
    });
    return snapshotRepository.upsertSnapshot({
      initialBalanceYuan: snapshot.initialBalanceYuan,
      currentBalanceYuan: tick.displayBalanceYuan,
      timezone: snapshot.timezone,
      updatedAt: now.toISOString()
    });
  }

  return {
    getSnapshot() {
      return ensureSnapshot();
    },
    setInitialBalance(initialBalanceYuan, timezone = "Asia/Shanghai", now = new Date()) {
      const events = eventRepository.listForBalance();
      const contributionTick = computeBalanceTick({
        initialBalanceYuan: 0,
        events,
        now
      });
      const contribution = Number(contributionTick.displayBalanceYuan ?? 0);
      const nowIso = now.toISOString();
      if (Math.abs(contribution) >= 0.0001) {
        eventRepository.create({
          title: "初始化对齐",
          eventKind: "one_time",
          direction: contribution >= 0 ? "outflow" : "inflow",
          amountYuan: Math.abs(contribution),
          effectiveAt: nowIso,
          status: "active",
          createdAt: nowIso,
          updatedAt: nowIso
        });
      }
      snapshotRepository.upsertSnapshot({
        initialBalanceYuan,
        currentBalanceYuan: initialBalanceYuan,
        timezone,
        updatedAt: nowIso
      });
      return ensureSnapshot();
    },
    recomputeAndPersist
  };
}
