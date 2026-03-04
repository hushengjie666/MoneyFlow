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
      eventRepository.clearOneTimeEvents();
      snapshotRepository.upsertSnapshot({
        initialBalanceYuan,
        currentBalanceYuan: initialBalanceYuan,
        timezone,
        updatedAt: now.toISOString()
      });
      return ensureSnapshot();
    },
    recomputeAndPersist
  };
}
