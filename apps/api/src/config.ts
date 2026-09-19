import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

export interface AppConfig {
  port: number;
  redisUrl: string;
  saleStartTime: Date;
  saleEndTime: Date;
  totalStock: number;
  corsOrigin: string;
  reseedOnBoot: boolean;
}

export function loadEnvFiles(cwd = process.cwd()): void {
  let dir = cwd;
  for (let i = 0; i < 4; i += 1) {
    applyEnvFile(join(dir, '.env'));
    const parent = dirname(dir);
    if (parent === dir) {
      break;
    }
    dir = parent;
  }
}

function unquote(value: string): string {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }
  return value;
}

function applyEnvFile(filePath: string): void {
  if (!existsSync(filePath)) {
    return;
  }
  const text = readFileSync(filePath, 'utf8');
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }
    const eq = trimmed.indexOf('=');
    if (eq === -1) {
      continue;
    }
    const key = trimmed.slice(0, eq).trim();
    const value = unquote(trimmed.slice(eq + 1).trim());
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

export function resolveRedisUrl(env: NodeJS.Dict<string> = process.env): string {
  const explicit = env.REDIS_URL?.trim();
  if (explicit) {
    return parseRedisUrl(explicit);
  }

  const restUrl = env.UPSTASH_REDIS_REST_URL?.trim();
  const token = env.UPSTASH_REDIS_REST_TOKEN?.trim();
  if (restUrl || token) {
    if (!restUrl || !token) {
      throw new Error('UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN must both be set');
    }
    return redisUrlFromUpstashRest(restUrl, token);
  }

  return 'redis://localhost:6379';
}

function redisUrlFromUpstashRest(restUrl: string, token: string): string {
  let parsed: URL;
  try {
    parsed = new URL(restUrl);
  } catch {
    throw new Error(`UPSTASH_REDIS_REST_URL is not a valid URL, got "${restUrl}"`);
  }
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    throw new Error('UPSTASH_REDIS_REST_URL must be an http(s) URL');
  }
  if (!parsed.hostname) {
    throw new Error('UPSTASH_REDIS_REST_URL is missing a hostname');
  }
  return `rediss://default:${encodeURIComponent(token)}@${parsed.hostname}:6379`;
}

export function loadConfig(env: NodeJS.Dict<string> = process.env): AppConfig {
  const now = Date.now();
  const port = parsePort(env.PORT, 3000);
  const redisUrl = resolveRedisUrl(env);
  const saleStartTime = parseDate(env.SALE_START_TIME, new Date(now - 60_000), 'SALE_START_TIME');
  const saleEndTime = parseDate(env.SALE_END_TIME, new Date(now + 3_600_000), 'SALE_END_TIME');
  const totalStock = parsePositiveInt(env.TOTAL_STOCK, 100, 'TOTAL_STOCK');
  const corsOrigin = env.CORS_ORIGIN?.trim() || 'http://localhost:5173';
  const reseedOnBoot = parseBoolean(env.RESEED_ON_BOOT, true, 'RESEED_ON_BOOT');

  if (saleEndTime.getTime() <= saleStartTime.getTime()) {
    throw new Error('SALE_END_TIME must be after SALE_START_TIME');
  }

  return {
    port,
    redisUrl,
    saleStartTime,
    saleEndTime,
    totalStock,
    corsOrigin,
    reseedOnBoot,
  };
}

function parsePort(value: string | undefined, fallback: number): number {
  if (value === undefined || value === '') {
    return fallback;
  }
  const port = Number(value);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`PORT must be an integer between 1 and 65535, got "${value}"`);
  }
  return port;
}

function parseRedisUrl(url: string): string {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'redis:' && parsed.protocol !== 'rediss:') {
      throw new Error('unsupported protocol');
    }
  } catch {
    throw new Error(`REDIS_URL is not a valid redis URL, got "${url}"`);
  }
  return url;
}

function parseDate(value: string | undefined, fallback: Date, name: string): Date {
  if (value === undefined || value === '') {
    return fallback;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`${name} is not a valid ISO timestamp, got "${value}"`);
  }
  return date;
}

function parsePositiveInt(value: string | undefined, fallback: number, name: string): number {
  if (value === undefined || value === '') {
    return fallback;
  }
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${name} must be a positive integer, got "${value}"`);
  }
  return parsed;
}

function parseBoolean(value: string | undefined, fallback: boolean, name: string): boolean {
  if (value === undefined || value === '') {
    return fallback;
  }
  const normalized = value.trim().toLowerCase();
  if (['true', '1', 'yes'].includes(normalized)) {
    return true;
  }
  if (['false', '0', 'no'].includes(normalized)) {
    return false;
  }
  throw new Error(`${name} must be a boolean, got "${value}"`);
}
