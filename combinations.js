/*
 * Frame MAS load-combination checks.
 * Reads the combination generator from index.html and compares every factor
 * with combinations worked out by hand from BNBC 2020 (Part 6, Chapter 2,
 * Section 2.7) and ASCE 7-16 (Section 2.3.1), for a frame with dead, live,
 * roof live, wind in two directions and earthquake load cases.
 * Usage (Node.js 18 or newer):  node tests/combinations.js
 */
"use strict";
const fs = require("fs"), path = require("path");
const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
const cut = (a, b) => { const i = html.indexOf(a), j = html.indexOf(b, i); if (i < 0 || j < 0) throw new Error("Not found in index.html: " + a); return html.slice(i, j); };
const code = cut("const CASE_TYPES", "const secDefaults") + cut("/* ================= Design load combinations", "const TEMPLATES");
const model = { cases: [] };
const { generateCombos } = new Function("model", code + "\nreturn { generateCombos };")(model);

model.cases.push({ id: "D", type: "dead" }, { id: "L", type: "live" }, { id: "Lr", type: "roof" }, { id: "W1", type: "wind" }, { id: "W2", type: "wind" }, { id: "E", type: "quake" });
const expected = {
  "BNBC 2020 strength (USD)": ["bnbc", [
    { D: 1.4 }, { D: 1.2, L: 1.6, Lr: 0.5 }, { D: 1.2, Lr: 1.6, L: 1 }, { D: 1.2, Lr: 1.6, W1: 0.8 }, { D: 1.2, Lr: 1.6, W2: 0.8 },
    { D: 1.2, W1: 1.6, L: 1, Lr: 0.5 }, { D: 1.2, W2: 1.6, L: 1, Lr: 0.5 }, { D: 1.2, E: 1, L: 1 },
    { D: 0.9, W1: 1.6 }, { D: 0.9, W2: 1.6 }, { D: 0.9, E: 1 }, { D: 1, L: 1 }]],
  "BNBC 2020 service (ASD)": ["bnbcAsd", [
    { D: 1 }, { D: 1, L: 1 }, { D: 1, Lr: 1 }, { D: 1, L: 0.75, Lr: 0.75 }, { D: 1, W1: 1 }, { D: 1, W2: 1 }, { D: 1, E: 0.7 },
    { D: 1, W1: 0.75, L: 0.75, Lr: 0.75 }, { D: 1, W2: 0.75, L: 0.75, Lr: 0.75 }, { D: 1, E: 0.525, L: 0.75, Lr: 0.75 },
    { D: 0.6, W1: 1 }, { D: 0.6, W2: 1 }, { D: 0.6, E: 0.7 }]],
  "ASCE 7-16 strength (LRFD)": ["asce", [
    { D: 1.4 }, { D: 1.2, L: 1.6, Lr: 0.5 }, { D: 1.2, Lr: 1.6, L: 1 }, { D: 1.2, Lr: 1.6, W1: 0.5 }, { D: 1.2, Lr: 1.6, W2: 0.5 },
    { D: 1.2, W1: 1, L: 1, Lr: 0.5 }, { D: 1.2, W2: 1, L: 1, Lr: 0.5 }, { D: 1.2, E: 1, L: 1 },
    { D: 0.9, W1: 1 }, { D: 0.9, W2: 1 }, { D: 0.9, E: 1 }, { D: 1, L: 1 }]]
};
const key = f => JSON.stringify(Object.entries(f).sort());
let fails = 0;
for (const [label, [set, list]] of Object.entries(expected)) {
  const got = generateCombos(model.cases, set);
  const missing = list.filter(e => !got.some(g => key(g.factors) === key(e)));
  const extra = got.filter(g => !list.some(e => key(g.factors) === key(e)));
  const ok = !missing.length && !extra.length;
  if (!ok) fails++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}: ${got.length} combinations`);
  got.forEach(g => console.log(`        ${g.name}`));
  missing.forEach(m => console.log(`      missing ${JSON.stringify(m)}`));
  extra.forEach(x => console.log(`      unexpected ${x.name}`));
}
console.log(`\n${fails ? fails + " FAILED" : "ALL PASSED"}`);
process.exit(fails ? 1 : 0);
