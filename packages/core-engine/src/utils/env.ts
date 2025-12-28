/**
 * Environment helpers. These are intentionally small and focused.
 */
export function getEnv(name: string, fallback?: string): string | undefined {
  const value = process.env[name];
  if (value === undefined) {
    return fallback;
  }
  return value;
}

export function requireEnv(name: string): string {
  const value = getEnv(name);
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}
