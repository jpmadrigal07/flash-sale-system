import { describe, expect, it } from 'vitest';
import { deriveSaleStatus } from '../../src/lib/sale-window.js';

describe('deriveSaleStatus', () => {
  const start = Date.parse('2026-06-01T12:00:00.000Z');
  const end = Date.parse('2026-06-01T13:00:00.000Z');

  it('is upcoming before the start time', () => {
    expect(deriveSaleStatus(start - 1, start, end)).toBe('upcoming');
  });

  it('is active at the start time and until the end', () => {
    expect(deriveSaleStatus(start, start, end)).toBe('active');
    expect(deriveSaleStatus(end - 1, start, end)).toBe('active');
  });

  it('is ended at and after the end time', () => {
    expect(deriveSaleStatus(end, start, end)).toBe('ended');
    expect(deriveSaleStatus(end + 1, start, end)).toBe('ended');
  });
});
