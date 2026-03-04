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
      const updated = eventRepository.patch(id, patchPayload, now.toISOString());
      if (!updated) return null;
      snapshotService.recomputeAndPersist(now);
      return updated;
    }
  };
}
