export function createTravelEntryId(): string {
  const timestamp = Date.now().toString(36);
  const randomSuffix = Math.random().toString(36).slice(2, 8);

  return `entry-${timestamp}-${randomSuffix}`;
}
