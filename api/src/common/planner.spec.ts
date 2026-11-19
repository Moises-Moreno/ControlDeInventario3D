import { describe, expect, it } from 'vitest';
import { planReception, type PresentationLike } from './planner.js';

// Lavandina: envase de 5 L, 4 envases por caja, pallet completo de 5 × 2 × 4 = 40 cajas.
const lavandina: PresentationLike = { contentPerUnit: 5, unitsPerBox: 4, front: 5, depth: 2, levels: 4 };

describe('planReception', () => {
  it('5000 L de lavandina de 5 L → 250 cajas → 6 pallets completos y 1 mermado de 10 cajas', () => {
    const plan = planReception(5000, lavandina);
    expect(plan.units).toBe(1000);
    expect(plan.boxes).toBe(250);
    expect(plan.leftoverUnits).toBe(0);
    expect(plan.boxesPerPallet).toBe(40);
    expect(plan.fullPallets).toBe(6);
    expect(plan.partialPallets).toBe(1);
    expect(plan.pallets).toHaveLength(7);
    expect(plan.pallets.slice(0, 6).every((p) => p.kind === 'completo' && p.boxes === 40 && p.rows === 4 && p.loose === 0)).toBe(true);
    expect(plan.pallets[6]).toMatchObject({ kind: 'mermado', boxes: 10, rows: 1, loose: 0 });
  });

  it('una cantidad exacta de pallets no deja mermado', () => {
    const plan = planReception(800, lavandina); // 160 envases = 40 cajas
    expect(plan.fullPallets).toBe(1);
    expect(plan.partialPallets).toBe(0);
  });

  it('el mermado separa filas completas de cajas sueltas', () => {
    const plan = planReception(5 * 4 * 13, lavandina); // 13 cajas, base de 10 → 1 fila + 3 sueltas
    expect(plan.pallets).toHaveLength(1);
    expect(plan.pallets[0]).toMatchObject({ kind: 'mermado', boxes: 13, rows: 1, loose: 3 });
  });

  it('informa los envases que sobran y no completan una caja', () => {
    const plan = planReception(105, lavandina); // 21 envases = 5 cajas + 1 envase
    expect(plan.boxes).toBe(5);
    expect(plan.leftoverUnits).toBe(1);
  });

  it('una cantidad que no completa ni una caja no genera pallets', () => {
    expect(planReception(10, lavandina).pallets).toHaveLength(0);
  });
});
