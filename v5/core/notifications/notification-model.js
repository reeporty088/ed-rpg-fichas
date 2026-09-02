/** A serializable V5 notification record. Notification overlays belong to Home. */
export function createNotification({ id, userId, type, title, message, campaignId = null, relatedResource = null, createdAt = Date.now(), read = false }) {
  return { id, userId, type, title, message, campaignId, relatedResource, createdAt, read };
}
