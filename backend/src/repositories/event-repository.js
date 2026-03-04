function mapEvent(row) {
  const activeWeekdays = String(row.active_weekdays ?? "1,2,3,4,5,6,7")
    .split(",")
    .map((item) => Number(item.trim()))
    .filter((num) => Number.isInteger(num) && num >= 1 && num <= 7);
  return {
    id: row.id,
    title: row.title,
    eventKind: row.event_kind,
    direction: row.direction,
    amountYuan: row.amount_yuan,
    effectiveAt: row.effective_at,
    recurrenceUnit: row.recurrence_unit,
    recurrenceInterval: row.recurrence_interval,
    dailyStartTime: row.daily_start_time,
    dailyEndTime: row.daily_end_time,
    activeWeekdays: activeWeekdays.length ? activeWeekdays : [1, 2, 3, 4, 5, 6, 7],
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export function createEventRepository(db) {
  const createStmt = db.prepare(`
    INSERT INTO cashflow_event (
      title, event_kind, direction, amount_yuan, effective_at, recurrence_unit, recurrence_interval, daily_start_time, daily_end_time, active_weekdays, status, created_at, updated_at
    ) VALUES (
      @title, @event_kind, @direction, @amount_yuan, @effective_at, @recurrence_unit, @recurrence_interval, @daily_start_time, @daily_end_time, @active_weekdays, @status, @created_at, @updated_at
    )
  `);

  const getByIdStmt = db.prepare("SELECT * FROM cashflow_event WHERE id = ?");
  const listStmt = db.prepare(`
    SELECT * FROM cashflow_event
    WHERE (@status IS NULL OR status = @status)
    ORDER BY datetime(created_at) DESC, id DESC
  `);
  const listForBalanceStmt = db.prepare(`
    SELECT * FROM cashflow_event
    WHERE status != 'deleted'
    ORDER BY datetime(effective_at) ASC, id ASC
  `);
  const patchStmt = db.prepare(`
    UPDATE cashflow_event
    SET title = COALESCE(NULLIF(@title, ''), title),
        direction = COALESCE(@direction, direction),
        amount_yuan = COALESCE(@amount_yuan, amount_yuan),
        effective_at = COALESCE(@effective_at, effective_at),
        recurrence_unit = COALESCE(@recurrence_unit, recurrence_unit),
        recurrence_interval = COALESCE(@recurrence_interval, recurrence_interval),
        daily_start_time = COALESCE(@daily_start_time, daily_start_time),
        daily_end_time = COALESCE(@daily_end_time, daily_end_time),
        active_weekdays = COALESCE(@active_weekdays, active_weekdays),
        status = COALESCE(@status, status),
        updated_at = @updated_at
    WHERE id = @id
  `);
  const hardDeleteStmt = db.prepare("DELETE FROM cashflow_event WHERE id = ?");
  const clearOneTimeStmt = db.prepare("DELETE FROM cashflow_event WHERE event_kind = 'one_time'");
  const clearAllStmt = db.prepare("DELETE FROM cashflow_event");

  return {
    create(data) {
      const result = createStmt.run({
        title: data.title?.trim() ? data.title.trim() : "未命名事件",
        event_kind: data.eventKind,
        direction: data.direction,
        amount_yuan: data.amountYuan,
        effective_at: data.effectiveAt,
        recurrence_unit: data.recurrenceUnit ?? null,
        recurrence_interval: data.recurrenceInterval ?? null,
        daily_start_time: data.dailyStartTime ?? "00:01",
        daily_end_time: data.dailyEndTime ?? "24:00",
        active_weekdays: (data.activeWeekdays ?? [1, 2, 3, 4, 5, 6, 7]).join(","),
        status: data.status ?? "active",
        created_at: data.createdAt,
        updated_at: data.updatedAt
      });
      return this.getById(result.lastInsertRowid);
    },
    getById(id) {
      const row = getByIdStmt.get(id);
      return row ? mapEvent(row) : null;
    },
    list(status) {
      return listStmt.all({ status: status ?? null }).map(mapEvent);
    },
    listForBalance() {
      return listForBalanceStmt.all().map(mapEvent);
    },
    patch(id, payload, updatedAt) {
      patchStmt.run({
        id,
        title: payload.title?.trim() ?? null,
        direction: payload.direction ?? null,
        amount_yuan: payload.amountYuan ?? null,
        effective_at: payload.effectiveAt ?? null,
        recurrence_unit: payload.recurrenceUnit ?? null,
        recurrence_interval: payload.recurrenceInterval ?? null,
        daily_start_time: payload.dailyStartTime ?? null,
        daily_end_time: payload.dailyEndTime ?? null,
        active_weekdays: payload.activeWeekdays ? payload.activeWeekdays.join(",") : null,
        status: payload.status ?? null,
        updated_at: updatedAt
      });
      return this.getById(id);
    },
    hardDelete(id) {
      const result = hardDeleteStmt.run(id);
      return result.changes > 0;
    },
    clearOneTimeEvents() {
      clearOneTimeStmt.run();
    },
    clearAllEvents() {
      clearAllStmt.run();
    }
  };
}
