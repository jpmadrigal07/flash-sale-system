import { describe, expect, it } from 'vitest';
import { loadConfig } from '../../src/config.js';

function validEnv(overrides: Record<string, string | undefined> = {}): NodeJS.Dict<string> {
  return {
    PORT: '3000',
    REDIS_URL: 'redis://localhost:6379',
    SALE_START_TIME: '2026-01-01T00:00:00.000Z',
    SALE_END_TIME: '2026-12-31T23:59:59.000Z',
    TOTAL_STOCK: '100',
    CORS_ORIGIN: 'http://localhost:5173',
    RESEED_ON_BOOT: 'true',
    ...overrides,
  };
}

describe('loadConfig', () => {
  it('accepts a valid set of values', () => {
    const config = loadConfig(validEnv());
    expect(config.port).toBe(3000);
    expect(config.redisUrl).toBe('redis://localhost:6379');
    expect(config.saleStartTime.toISOString()).toBe('2026-01-01T00:00:00.000Z');
    expect(config.saleEndTime.toISOString()).toBe('2026-12-31T23:59:59.000Z');
    expect(config.totalStock).toBe(100);
    expect(config.corsOrigin).toBe('http://localhost:5173');
    expect(config.reseedOnBoot).toBe(true);
  });

  it('applies working defaults when values are missing', () => {
    const before = Date.now();
    const config = loadConfig({});
    const after = Date.now();
    expect(config.port).toBe(3000);
    expect(config.redisUrl).toBe('redis://localhost:6379');
    expect(config.totalStock).toBe(100);
    expect(config.corsOrigin).toBe('http://localhost:5173');
    expect(config.reseedOnBoot).toBe(true);
    expect(config.saleStartTime.getTime()).toBeGreaterThanOrEqual(before - 60_000);
    expect(config.saleStartTime.getTime()).toBeLessThanOrEqual(after - 60_000);
    expect(config.saleEndTime.getTime()).toBeGreaterThan(config.saleStartTime.getTime());
  });

  it('rejects end-before-start', () => {
    expect(() =>
      loadConfig(
        validEnv({
          SALE_START_TIME: '2026-06-01T00:00:00.000Z',
          SALE_END_TIME: '2026-01-01T00:00:00.000Z',
        }),
      ),
    ).toThrow(/SALE_END_TIME must be after SALE_START_TIME/);
  });

  it('rejects non-positive stock', () => {
    expect(() => loadConfig(validEnv({ TOTAL_STOCK: '0' }))).toThrow(/positive integer/);
    expect(() => loadConfig(validEnv({ TOTAL_STOCK: '-3' }))).toThrow(/positive integer/);
    expect(() => loadConfig(validEnv({ TOTAL_STOCK: '1.5' }))).toThrow(/positive integer/);
  });

  it('rejects a malformed Redis URL', () => {
    expect(() => loadConfig(validEnv({ REDIS_URL: 'not-a-url' }))).toThrow(/REDIS_URL/);
    expect(() => loadConfig(validEnv({ REDIS_URL: 'http://localhost:6379' }))).toThrow(/REDIS_URL/);
  });

  it('derives a TLS Redis URL from Upstash REST credentials', () => {
    const config = loadConfig(
      validEnv({
        REDIS_URL: undefined,
        UPSTASH_REDIS_REST_URL: 'https://example.upstash.io',
        UPSTASH_REDIS_REST_TOKEN: 'upstash-token',
      }),
    );
    expect(config.redisUrl).toBe('rediss://default:upstash-token@example.upstash.io:6379');
  });

  it('prefers REDIS_URL when both Redis and Upstash vars are set', () => {
    const config = loadConfig(
      validEnv({
        REDIS_URL: 'redis://127.0.0.1:6379',
        UPSTASH_REDIS_REST_URL: 'https://example.upstash.io',
        UPSTASH_REDIS_REST_TOKEN: 'upstash-token',
      }),
    );
    expect(config.redisUrl).toBe('redis://127.0.0.1:6379');
  });

  it('rejects a partial Upstash pair', () => {
    expect(() =>
      loadConfig(
        validEnv({ REDIS_URL: undefined, UPSTASH_REDIS_REST_URL: 'https://example.upstash.io' }),
      ),
    ).toThrow(/UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN/);
  });

  it('rejects an out-of-range port', () => {
    expect(() => loadConfig(validEnv({ PORT: '0' }))).toThrow(/PORT/);
    expect(() => loadConfig(validEnv({ PORT: '70000' }))).toThrow(/PORT/);
  });
});
