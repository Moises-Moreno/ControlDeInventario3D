import { describe, expect, it } from 'vitest';
import { canPlace } from './zones.js';

const names = new Map([
  [1, 'Detergente en polvo'],
  [2, 'Detergente líquido'],
]);

describe('canPlace (zonas por categoría)', () => {
  it('un rack con categoría solo acepta esa categoría', () => {
    const rack = { name: 'A', categoryId: 1 };
    expect(canPlace(1, rack, [], names).ok).toBe(true);
    const otra = canPlace(2, rack, [], names);
    expect(otra.ok).toBe(false);
    if (!otra.ok) expect(otra.reason).toContain('Detergente en polvo');
  });

  it('un producto sin categoría no entra en un rack con categoría', () => {
    expect(canPlace(null, { name: 'A', categoryId: 1 }, [], names).ok).toBe(false);
  });

  it('un rack sin categoría y vacío acepta cualquier producto', () => {
    const rack = { name: 'D', categoryId: null };
    expect(canPlace(1, rack, [], names).ok).toBe(true);
    expect(canPlace(null, rack, [], names).ok).toBe(true);
  });

  it('un rack sin categoría no mezcla: acepta solo lo de la misma categoría que ya tiene', () => {
    const rack = { name: 'D', categoryId: null };
    expect(canPlace(1, rack, [1, 1], names).ok).toBe(true);
    expect(canPlace(2, rack, [1], names).ok).toBe(false);
    expect(canPlace(null, rack, [1], names).ok).toBe(false);
    expect(canPlace(1, rack, [null], names).ok).toBe(false);
  });
});
