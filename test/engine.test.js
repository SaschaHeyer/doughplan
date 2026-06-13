import { test } from "node:test";
import assert from "node:assert/strict";
import { buildPlan, scaleProduct, hydration } from "../src/index.js";

const country = {
  name: "Country Sourdough",
  unitWeightG: 900,
  ingredients: [
    { name: "Bread flour", pct: 100, isFlour: true, allergen: "Wheat" },
    { name: "Water", pct: 75 },
    { name: "Sourdough starter", pct: 20, allergen: "Wheat" },
    { name: "Sea salt", pct: 2 },
  ],
  schedule: [
    { label: "Feed levain", offsetMin: 600 },
    { label: "Bake", offsetMin: 45, bake: true },
    { label: "Out of the oven", offsetMin: 0, bake: true },
  ],
};

test("scaleProduct conserves mass (grams sum to dough weight)", () => {
  const units = 12;
  const scaled = scaleProduct(country, units);
  const sum = scaled.reduce((s, i) => s + i.grams, 0);
  assert.ok(Math.abs(sum - country.unitWeightG * units) < 1e-6, "mass must be conserved");
});

test("scaleProduct uses flour as the 100% basis", () => {
  const scaled = scaleProduct(country, 12);
  const flour = scaled.find((i) => i.name === "Bread flour").grams;
  const water = scaled.find((i) => i.name === "Water").grams;
  // water is 75% of flour
  assert.ok(Math.abs(water / flour - 0.75) < 1e-9);
});

test("hydration is water as a percentage of flour", () => {
  assert.equal(hydration(country.ingredients), 75);
});

test("buildPlan aggregates units across orders for the same date", () => {
  const orders = [
    { date: "2026-06-20", items: [{ product: "Country Sourdough", qty: 18 }] },
    { date: "2026-06-20", items: [{ product: "Country Sourdough", qty: 6 }] },
    { date: "2026-06-27", items: [{ product: "Country Sourdough", qty: 99 }] },
  ];
  const plan = buildPlan({ products: [country], orders, date: "2026-06-20" });
  assert.equal(plan.totals.units, 24); // 18 + 6, the 99 is a different day
  assert.equal(plan.totals.doughG, 24 * 900);
});

test("schedule is anchored backward from out-of-oven and sorted", () => {
  const orders = [{ date: "2026-06-20", items: [{ product: "Country Sourdough", qty: 10 }] }];
  const plan = buildPlan({ products: [country], orders, date: "2026-06-20", bakeTime: "08:00" });
  const out = plan.schedule[plan.schedule.length - 1];
  assert.equal(out.label, "Out of the oven");
  assert.equal(out.at.getHours(), 8);
  // first step (feed levain, 600 min before) is 10h earlier -> 22:00 the day before
  assert.equal(plan.schedule[0].label, "Feed levain");
  // sorted ascending in time
  for (let i = 1; i < plan.schedule.length; i++) {
    assert.ok(plan.schedule[i].at >= plan.schedule[i - 1].at);
  }
});

test("unknown product in an order throws", () => {
  const orders = [{ date: "2026-06-20", items: [{ product: "Ghost Loaf", qty: 1 }] }];
  assert.throws(() => buildPlan({ products: [country], orders, date: "2026-06-20" }));
});
