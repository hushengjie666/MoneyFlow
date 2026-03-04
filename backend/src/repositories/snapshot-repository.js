function mapSnapshot(row) {
  if (!row) return null;
  return {
    initialBalanceYuan: row.initial_balance_yuan,
    currentBalanceYuan: row.current_balance_yuan,
    timezone: row.timezone,
    updatedAt: row.updated_at
  };
}

export function createSnapshotRepository(db) {
  const getStmt = db.prepare("SELECT * FROM account_snapshot WHERE id = 1");
  const upsertStmt = db.prepare(`
    INSERT INTO account_snapshot (id, initial_balance_yuan, current_balance_yuan, timezone, updated_at)
    VALUES (1, @initial_balance_yuan, @current_balance_yuan, @timezone, @updated_at)
    ON CONFLICT(id) DO UPDATE SET
      initial_balance_yuan = excluded.initial_balance_yuan,
      current_balance_yuan = excluded.current_balance_yuan,
      timezone = excluded.timezone,
      updated_at = excluded.updated_at
  `);
  const patchCurrentStmt = db.prepare(`
    UPDATE account_snapshot
    SET current_balance_yuan = @current_balance_yuan, updated_at = @updated_at
    WHERE id = 1
  `);

  return {
    getSnapshot() {
      return mapSnapshot(getStmt.get());
    },
    upsertSnapshot({ initialBalanceYuan, currentBalanceYuan, timezone, updatedAt }) {
      upsertStmt.run({
        initial_balance_yuan: initialBalanceYuan,
        current_balance_yuan: currentBalanceYuan,
        timezone,
        updated_at: updatedAt
      });
      return this.getSnapshot();
    },
    updateCurrentBalance(currentBalanceYuan, updatedAt) {
      patchCurrentStmt.run({
        current_balance_yuan: currentBalanceYuan,
        updated_at: updatedAt
      });
      return this.getSnapshot();
    }
  };
}
