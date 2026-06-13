# 🥖 doughplan

**The open-source bake-day planning engine for sourdough & micro bakeries.**

Turn a day's orders into the three things you actually need at 4 a.m.: a
**time-reversed bake schedule**, **scaled baker's-percentage formulas**, and one
**aggregated shopping list**. Zero dependencies, pure functions, MIT licensed.

This is the production-math core behind [**DoughPlan**](https://doughplan.com) — the
back-of-house planning app for home & micro bakeries (20–150 loaves/week). The
engine is open source so you can read it, trust it, and build on it. If you'd
rather not write JSON, the full visual planner (labels, packing lists,
multi-bake-day, cloud sync) lives at **[doughplan.com](https://doughplan.com)**.

📖 **Docs & live API reference:** **[saschaheyer.github.io/doughplan](https://saschaheyer.github.io/doughplan/)**

---

## Why this exists

You don't plan a bake day *forward* from when you wake up — you plan it
**backward** from when the bread has to be out of the oven for market. Three
breads, two ovens, twenty-six loaves, one fridge: the math of *when to feed the
levain* and *how much flour to buy* is fiddly and easy to get wrong on paper.
`doughplan` does it deterministically.

- **Baker's percentages done right** — flour is always 100%; every formula
  scales linearly and conserves mass exactly.
- **Time-reversed scheduling** — every step is an offset *before* out-of-oven,
  so the same formula produces a real wall-clock plan for any target time.
- **Cross-product aggregation** — bake three products on one day and get a
  single merged schedule and one combined shopping list.

## Install

```bash
# Install straight from GitHub (zero dependencies, Node 18+):
npm install github:SaschaHeyer/doughplan

# …or clone and run the CLI directly:
git clone https://github.com/SaschaHeyer/doughplan
cd doughplan && node bin/cli.js --help
```

Requires Node 18+. No dependencies.

## CLI

```bash
doughplan plan examples/bakery.json --date 2026-06-20 --time 08:00
```

```
🥖  DoughPlan — bake day 2026-06-20
    32 units · 28.00 kg dough · 13.98 kg flour · out of oven 08:00

⏱  SCHEDULE (planned backward from out-of-oven)
────────────────────────────────────────────────────────
   Fri 03:00 PM     Feed levain            Country Sourdough ×24, Seeded Spelt ×8
   Fri 09:00 PM     Autolyse               Country Sourdough ×24, Seeded Spelt ×8
   Fri 10:00 PM     Add levain + salt      ...
   Sat 04:00 AM     Into the fridge        ...
   Sat 07:00 AM     Preheat Dutch oven     ...
🔥 Sat 08:00 AM     Out of the oven        Country Sourdough ×24, Seeded Spelt ×8

⚖️  FORMULAS
Country Sourdough ×24  (75% hydration · Wheat)
     Bread flour      90%   9.87 kg
     Water            75%   8.22 kg
     ...

🛒  SHOPPING LIST (aggregated across all products)
     Bread flour      10.77 kg
     Water            10.58 kg
     ...
```

Pipe it from anywhere:

```bash
cat bakery.json | doughplan plan --date 2026-06-20
```

## Library

```js
import { buildPlan, scaleProduct, hydration } from "doughplan";

const products = [{
  name: "Country Sourdough",
  unitWeightG: 900,                         // raw dough weight per loaf
  ingredients: [
    { name: "Bread flour", pct: 100, isFlour: true, allergen: "Wheat" },
    { name: "Water",       pct: 75 },
    { name: "Starter",     pct: 20, allergen: "Wheat" },
    { name: "Sea salt",    pct: 2 },
  ],
  schedule: [                               // offsetMin = minutes BEFORE out-of-oven
    { label: "Feed levain", offsetMin: 600 },
    { label: "Mix",         offsetMin: 540 },
    { label: "Shape",       offsetMin: 240 },
    { label: "Bake",        offsetMin: 45, bake: true },
    { label: "Out of oven", offsetMin: 0,  bake: true },
  ],
}];

const orders = [
  { date: "2026-06-20", items: [{ product: "Country Sourdough", qty: 24 }] },
];

const plan = buildPlan({ products, orders, date: "2026-06-20", bakeTime: "08:00" });

plan.totals;     // { units: 24, doughG: 21600, flourG: 10964.5 }
plan.schedule;   // [{ at: Date, label, bake, items: [{product, units}] }, ...]
plan.formulas;   // [{ product, units, hydration, allergens, ingredients: [{name, pct, grams}] }]
plan.shopping;   // [{ name, grams, isFlour }, ...] aggregated across products
```

### API

| Function | Returns |
| --- | --- |
| `buildPlan({ products, orders, date, bakeTime })` | full plan: `schedule`, `formulas`, `shopping`, `totals` |
| `scaleProduct(product, units)` | ingredient grams for N units (mass-conserving) |
| `buildSchedule(productLines, outOfOven)` | merged, time-ordered schedule |
| `hydration(ingredients)` | water as a % of flour |
| `totalPct(ingredients)` / `flourPct(ingredients)` | percentage sums |
| `allergensOf(product)` | de-duplicated allergen list |

Data shapes are documented as JSDoc in [`src/index.js`](src/index.js).

## How the math works

For a product at `unitWeightG` × `units`, total dough weight is known. Because
the baker's percentages sum to `totalPct` (e.g. 197% for a 75%-hydration loaf),
flour weight is `doughTotal × 100 / totalPct`, and each ingredient is
`flourWeight × pct / 100`. Mass is conserved to the gram. The schedule anchors
every step to `outOfOven − offsetMin`, then merges steps from different products
that fall in the same 5-minute window. See [`src/bakers-percentage.js`](src/bakers-percentage.js)
and [`src/schedule.js`](src/schedule.js).

## Tests

```bash
npm test     # node --test, zero deps
```

## Roadmap

- [ ] Levain build sub-schedule (feed ratios → ready time by temperature)
- [ ] Cottage-food label generator (allergens, net weight, producer info)
- [ ] CSV/ICS export of the schedule
- [ ] Per-order packing lists

PRs welcome. If you run a bakery and the model doesn't fit how you work,
[open an issue](https://github.com/SaschaHeyer/doughplan/issues) — that feedback
shapes the hosted product too.

## The hosted app

`doughplan` is the engine. **[DoughPlan](https://doughplan.com)** is the full
product built on top of it — a visual planner with order entry, printable
cottage-food labels, packing lists, multi-bake-day planning, and cloud sync,
priced for micro bakeries (not the $200–350/mo enterprise tools). Free tools
you can use right now, no signup:

- [Baker's percentage calculator](https://doughplan.com/tools/bakers-percentage-calculator)
- [Sourdough starter / levain calculator](https://doughplan.com/tools/sourdough-starter-calculator)
- [Dough temperature (DDT) calculator](https://doughplan.com/tools/dough-temperature-calculator)

## License

MIT © [DoughPlan](https://doughplan.com)
