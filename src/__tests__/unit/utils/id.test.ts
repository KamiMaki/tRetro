import { generateId, generateRoomId } from '@/lib/utils/id';

describe('generateId', () => {
  it('returns a string', () => {
    const id = generateId();
    expect(typeof id).toBe('string');
  });

  it('defaults to 12 characters', () => {
    const id = generateId();
    expect(id).toHaveLength(12);
  });

  it('returns the correct length when a custom size is provided', () => {
    expect(generateId(8)).toHaveLength(8);
    expect(generateId(16)).toHaveLength(16);
    expect(generateId(24)).toHaveLength(24);
  });

  it('returns unique values on each call', () => {
    const ids = new Set(Array.from({ length: 100 }, () => generateId()));
    expect(ids.size).toBe(100);
  });

  it('contains only URL-safe characters', () => {
    // nanoid uses A-Za-z0-9_- by default
    const id = generateId(50);
    expect(id).toMatch(/^[A-Za-z0-9_-]+$/);
  });
});

describe('generateRoomId', () => {
  it('returns a string', () => {
    const id = generateRoomId();
    expect(typeof id).toBe('string');
  });

  it('returns exactly 8 characters', () => {
    const id = generateRoomId();
    expect(id).toHaveLength(8);
  });

  it('returns unique values on each call', () => {
    const ids = new Set(Array.from({ length: 100 }, () => generateRoomId()));
    expect(ids.size).toBe(100);
  });

  it('contains only URL-safe characters', () => {
    const id = generateRoomId();
    expect(id).toMatch(/^[A-Za-z0-9_-]+$/);
  });
});
