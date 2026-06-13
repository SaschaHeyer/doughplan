// schedule.js — the time-reversed bake schedule.
// You don't plan a bake day forward from "when I wake up"; you plan it
// *backward* from "when the bread has to be out of the oven". Each product
// step is defined as an offset (minutes before out-of-oven), so the same
// formula produces a real wall-clock schedule for any target time.

/**
 * Build a single, merged, time-ordered schedule across every product baking
 * on the same day, anchored to a target "out of the oven" time.
 *
 * Steps from different products that land in the same 5-minute bucket with the
 * same label are merged into one line (so "Feed levain" for three breads is one
 * task, not three), preserving the per-product breakdown.
 *
 * @param {Array} productLines  [{ product, units }]
 * @param {Date}  outOfOven     wall-clock time the last loaf leaves the oven
 * @returns {Array<{at: Date, label: string, bake: boolean, items: [{product, units}]}>}
 */
export function buildSchedule(productLines, outOfOven) {
  const steps = [];
  for (const pl of productLines) {
    for (const st of pl.product.schedule || []) {
      const at = new Date(outOfOven.getTime() - (Number(st.offsetMin) || 0) * 60000);
      steps.push({
        at,
        ts: at.getTime(),
        label: st.label,
        bake: !!st.bake,
        product: pl.product.name,
        units: pl.units,
      });
    }
  }

  // Merge by 5-minute bucket + label so simultaneous tasks become one line.
  const groups = {};
  for (const s of steps) {
    const bucket = Math.round(s.ts / 300000) * 300000;
    const key = bucket + "|" + s.label;
    if (!groups[key]) {
      groups[key] = { ts: bucket, at: new Date(bucket), label: s.label, bake: s.bake, items: [] };
    }
    groups[key].items.push({ product: s.product, units: s.units });
  }

  return Object.values(groups).sort((a, b) => a.ts - b.ts);
}
