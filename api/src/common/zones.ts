/**
 * Zonas por categoría: un rack puede asignarse a una categoría de producto y así no se
 * mezclan productos de distinto tipo. Es la regla única; la web tiene una copia en
 * web/src/domain/zones.ts (mismo patrón que locCode).
 */
export interface ZoneRack {
  name: string;
  categoryId: number | null;
}

export type ZoneCheck = { ok: true } | { ok: false; reason: string };

const label = (id: number | null, names: Map<number, string>) =>
  id == null ? 'sin categoría' : `“${names.get(id) ?? 'otra categoría'}”`;

/**
 * ¿Puede ir un producto de la categoría `productCategoryId` en `rack`?
 * `others` son las categorías de los demás pallets que ya están en ese rack.
 * - Rack con categoría: solo productos de esa categoría.
 * - Rack sin categoría: vacío, o con productos de la misma categoría (tampoco se mezcla).
 */
export function canPlace(
  productCategoryId: number | null,
  rack: ZoneRack,
  others: (number | null)[],
  names: Map<number, string>,
): ZoneCheck {
  if (rack.categoryId != null) {
    if (productCategoryId === rack.categoryId) return { ok: true };
    return {
      ok: false,
      reason: `El rack ${rack.name} es de ${label(rack.categoryId, names)} y este producto es ${label(productCategoryId, names)}. No se mezclan categorías.`,
    };
  }
  const clash = others.find((c) => c !== productCategoryId);
  if (clash === undefined) return { ok: true };
  return {
    ok: false,
    reason: `El rack ${rack.name} ya tiene productos ${label(clash, names)} y este producto es ${label(productCategoryId, names)}. No se mezclan categorías.`,
  };
}
