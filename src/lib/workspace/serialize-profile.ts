/** Strip Firestore Date fields before JSON.stringify for API calls. */
export function serializeForApi<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
