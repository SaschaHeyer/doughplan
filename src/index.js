// doughplan — the open-source bake-day planning engine.
// https://doughplan.com
//
// One call turns a day's orders into the three things a baker actually needs
// for bake day: a time-reversed schedule, scaled per-product formulas, and one
// aggregated shopping list. Zero dependencies; pure functions.

import { scaleProduct, totalPct, flourPct, hydration, allergensOf } from "./bakers-percentage.js";
import { buildSchedule } from "./schedule.js";

export { scaleProduct, totalPct, flourPct, hydration, allergensOf, buildSchedule };

/**
 * @typedef {Object} Ingredient
 * @property {string} name
 * @property {number} pct        baker's percentage (flour totals 100)
 * @property {boolean} [isFlour]
 * @property {boolean} [isLiquid] override the water/milk name heuristic
 * @property {string} [allergen] comma/slash-separated, e.g. "Wheat"
 *
 * @typedef {Object} Step
 * @property {string} label
 * @property {number} offsetMin  minutes BEFORE out-of-oven this step happens
 * @property {boolean} [bake]
 *
 * @typedef {Object} Product
 * @property {string} name
 * @property {number} unitWeightG  raw dough weight per finished unit
 * @property {Ingredient[]} ingredients
 * @property {Step[]} [schedule]
 *
 * @typedef {Object} Order
 * @property {string} date         "YYYY-MM-DD"
 * @property {{product: string, qty: number}[]} items
 */

/**
 * Build the full bake plan for one production day.
 *
 * @param {Object} input
 * @param {Product[]} input.products  your formulas (the "menu")
 * @param {Order[]}  input.orders     customer orders (any dates; filtered by `date`)
 * @param {string}   input.date       which day to plan, "YYYY-MM-DD"
 * @param {string}   [input.bakeTime] target out-of-oven time "HH:MM" (default "07:00")
 * @returns {{
 *   date: string,
 *   outOfOven: Date,
 *   productLines: Array,
 *   formulas: Array,
 *   shopping: Array<{name, grams, isFlour}>,
 *   schedule: Array,
 *   totals: {units: number, doughG: number, flourG: number}
 * }}
 */
export function buildPlan({ products, orders, date, bakeTime = "07:00" }) {
  const byName = new Map(products.map((p) => [p.name, p]));

  // Aggregate units per product across every order on this date.
  const unitMap = {};
  for (const o of orders) {
    if (o.date !== date) continue;
    for (const it of o.items || []) {
      unitMap[it.product] = (unitMap[it.product] || 0) + (Number(it.qty) || 0);
    }
  }

  const productLines = Object.keys(unitMap)
    .map((name) => {
      const product = byName.get(name);
      if (!product) throw new Error(`Order references unknown product: "${name}"`);
      const units = unitMap[name];
      const scaled = scaleProduct(product, units);
      return {
        product,
        units,
        scaled,
        doughG: (Number(product.unitWeightG) || 0) * units,
        flourG: scaled.filter((s) => s.isFlour).reduce((s, i) => s + i.grams, 0),
      };
    })
    .filter(Boolean);

  // Per-product formula view (hydration + scaled grams).
  const formulas = productLines.map((pl) => ({
    product: pl.product.name,
    units: pl.units,
    hydration: hydration(pl.product.ingredients),
    allergens: allergensOf(pl.product),
    ingredients: pl.scaled,
  }));

  // Aggregated shopping list: sum each ingredient by name across all products.
  const shop = {};
  for (const pl of productLines) {
    for (const s of pl.scaled) {
      if (!shop[s.name]) shop[s.name] = { name: s.name, grams: 0, isFlour: s.isFlour };
      shop[s.name].grams += s.grams;
    }
  }
  const shopping = Object.values(shop).sort(
    (a, b) => b.isFlour - a.isFlour || b.grams - a.grams
  );

  // Time-reversed, merged schedule.
  const [hh, mm] = String(bakeTime).split(":").map(Number);
  const [y, mo, d] = String(date).split("-").map(Number);
  const outOfOven = new Date(y, mo - 1, d, hh || 0, mm || 0, 0, 0);
  const schedule = buildSchedule(productLines, outOfOven);

  return {
    date,
    outOfOven,
    productLines,
    formulas,
    shopping,
    schedule,
    totals: {
      units: productLines.reduce((s, pl) => s + pl.units, 0),
      doughG: productLines.reduce((s, pl) => s + pl.doughG, 0),
      flourG: productLines.reduce((s, pl) => s + pl.flourG, 0),
    },
  };
}

export default { buildPlan, scaleProduct, totalPct, flourPct, hydration, allergensOf, buildSchedule };
