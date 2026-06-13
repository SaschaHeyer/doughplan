// bakers-percentage.js — the pure formula math.
// In baker's percentages, total flour is always 100%. Every other
// ingredient is expressed as a percentage of the flour weight, so a
// formula scales linearly to any batch size.

/** Sum of every ingredient percentage (flour + water + starter + salt + ...). */
export function totalPct(ingredients) {
  return ingredients.reduce((sum, i) => sum + (Number(i.pct) || 0), 0);
}

/** Sum of the flour percentages (the 100% basis — usually 100, but can be split across flours). */
export function flourPct(ingredients) {
  return ingredients
    .filter((i) => i.isFlour)
    .reduce((sum, i) => sum + (Number(i.pct) || 0), 0);
}

/**
 * Hydration % = water (and other liquids) as a percentage of flour weight.
 * Counts ingredients whose name looks like a liquid (water/milk) unless the
 * ingredient explicitly sets `isLiquid`.
 */
export function hydration(ingredients) {
  const flour = flourPct(ingredients);
  if (!flour) return 0;
  const liquid = ingredients
    .filter((i) => i.isLiquid ?? /water|milk|juice/i.test(i.name))
    .reduce((sum, i) => sum + (Number(i.pct) || 0), 0);
  return Math.round((liquid / flour) * 100);
}

/**
 * Scale a product to a number of finished units and return grams per ingredient.
 *
 * The dough math: total dough weight = unitWeightG * units. Because the
 * percentages sum to `totalPct` (e.g. 197% for a 75%-hydration loaf), the
 * flour weight is `doughTotal * 100 / totalPct`, and each ingredient is then
 * `flourWeight * pct / 100`. This conserves mass exactly.
 *
 * @param {object} product  { name, unitWeightG, ingredients: [{name, pct, isFlour, allergen}] }
 * @param {number} units    how many loaves/units to make
 * @returns {Array<{name, pct, isFlour, allergen, grams}>}
 */
export function scaleProduct(product, units) {
  const tp = totalPct(product.ingredients);
  const doughTotal = (Number(product.unitWeightG) || 0) * (Number(units) || 0);
  const flourTotal = tp > 0 ? doughTotal * (100 / tp) : 0;
  return product.ingredients.map((i) => ({
    name: i.name,
    isFlour: !!i.isFlour,
    allergen: i.allergen || "",
    pct: Number(i.pct) || 0,
    grams: flourTotal * ((Number(i.pct) || 0) / 100),
  }));
}

/** Allergens declared across a product's ingredients, de-duplicated. */
export function allergensOf(product) {
  const set = new Set();
  product.ingredients.forEach((i) => {
    if (i.allergen) i.allergen.split(/[,/]/).forEach((a) => set.add(a.trim()));
  });
  return [...set].filter(Boolean);
}
