import { randomUUID } from "crypto";

let apiKeys: Array<Record<string, any>> = [];

export function getApiKeysForUser(userId?: string) {
  if (!userId) return apiKeys;
  return apiKeys.filter((k) => k.user_id === userId);
}

export function addApiKey(apiKey: Record<string, any>) {
  if (!apiKey.id) apiKey.id = randomUUID();
  apiKeys.push(apiKey);
  return apiKey;
}

export function findApiKeyById(id: string, userId?: string) {
  return apiKeys.find((k) => k.id === id && (!userId || k.user_id === userId)) ?? null;
}

export function updateApiKey(id: string, updates: Record<string, any>, userId?: string) {
  const existing = apiKeys.find((k) => k.id === id && (!userId || k.user_id === userId));
  if (!existing) return null;
  Object.assign(existing, updates);
  return existing;
}

export function deleteApiKey(id: string, userId?: string) {
  const idx = apiKeys.findIndex((k) => k.id === id && (!userId || k.user_id === userId));
  if (idx === -1) return false;
  apiKeys.splice(idx, 1);
  return true;
}

export function resetInMemoryApiKeys() {
  apiKeys = [];
}


