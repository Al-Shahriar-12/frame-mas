/*
 * Frame MAS solver checks.
 * Runs the solver inside index.html against hand calculations: cantilever,
 * portal frames, a three-hinged frame, a simply supported member, an inclined
 * member, a Pratt truss, combinations, envelopes, equilibrium and stability.
 * Usage (Node.js 18 or newer):  node tests/verify.js
 */
"use strict";
const fs = require("fs"), path = require("path");
const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
const a = html.indexOf("function sectionProps(s) {"), b = html.indexOf("/* ================= Helpers");
if (a < 0 || b < 0) { console.error("Solver not found in index.html"); process.exit(1); }
const { analyzeFrame, combineResults, envelope } = new Function(html.slice(a, b) + "\nreturn { analyzeFrame, combineResults, envelope };")();
const mat = [{ id: 'M1', name: 'Steel', E: 200, nu: 0.3, rho: 7850 }];
const sec = (id, d = 400) => ({ id, name: id, type: 'rect', b: 200, h: d, material: 'M1' });
let fails = 0;
function chk(name, got, exp, tol = 1e-6) { const ok = Math.abs(got - exp) <= tol * Math.max(1, Math.abs(exp)); if (!ok) fails++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}: ${(+got).toPrecision(8)} (expected ${(+exp).toPrecision(8)})`); }
const mid = (r, cid, mi, x) => { const m = r.mem[mi], cr = r.caseRes[cid].mem[mi]; let k = 0, best = 1e9; for (let i = 0; i < m.xs.length; i++) { const dd = Math.abs(m.xs[i] - x); if (dd < best) { best = dd; k = i; } } return { N: cr.N[k], V: cr.V[k], M: cr.M[k], v: cr.v[k], u: cr.u[k] }; };
const EI = 200e6 * (0.2 * 0.4 ** 3 / 12);

// 1. Cantilever column, horizontal tip load P = 10 kN, h = 4 m
let m = { materials: mat, sections: [sec('S')], nodes: [{ id: 1, x: 0, y: 0, support: 'fixed' }, { id: 2, x: 0, y: 4, support: 'free' }],
  members: [{ id: 1, i: 1, j: 2, section: 'S' }], cases: [{ id: 'L', name: 'L' }], loads: [{ case: 'L', on: 'node', node: 2, Fx: 10, Fy: 0, Mz: 0 }] };
let r = analyzeFrame(m);
chk('Cantilever: tip sway PL³/3EI', r.caseRes.L.d[3], 10 * 64 / (3 * EI));
chk('Cantilever: base moment reaction +PL (anticlockwise)', r.caseRes.L.R.get(1)[2], 40);
chk('Cantilever: base shear reaction', r.caseRes.L.R.get(1)[0], -10);

// 2. Portal with very stiff beam: pinned bases → column top moment Ph/2; fixed bases → Ph/4 top and base
const portal = (base) => ({ materials: mat, sections: [sec('C'), { id: 'B', name: 'B', type: 'rect', b: 2000, h: 4000, material: 'M1' }],
  nodes: [{ id: 1, x: 0, y: 0, support: base }, { id: 2, x: 0, y: 4, support: 'free' }, { id: 3, x: 6, y: 4, support: 'free' }, { id: 4, x: 6, y: 0, support: base }],
  members: [{ id: 1, i: 1, j: 2, section: 'C' }, { id: 2, i: 2, j: 3, section: 'B' }, { id: 3, i: 4, j: 3, section: 'C' }],
  cases: [{ id: 'W', name: 'W' }], loads: [{ case: 'W', on: 'node', node: 2, Fx: 20, Fy: 0, Mz: 0 }] });
r = analyzeFrame(portal('pin'));
chk('Pinned portal, rigid beam: base shear P/2', -r.caseRes.W.R.get(1)[0], 10, 1e-3);
chk('Pinned portal, rigid beam: column top moment Ph/2', Math.abs(mid(r, 'W', 0, 4).M), 40, 1e-3);
r = analyzeFrame(portal('fixed'));
chk('Fixed portal, rigid beam: base moment Ph/4 (within 0.2%, columns shorten slightly)', Math.abs(r.caseRes.W.R.get(1)[2]), 20, 2e-3);
chk('Fixed portal, rigid beam: column top moment Ph/4 (within 0.2%)', Math.abs(mid(r, 'W', 0, 4).M), 20, 2e-3);

// 3. Three-hinged portal: pinned bases, hinge at mid-beam, UDL w = 12 on the beam (L = 8, h = 5)
m = { materials: mat, sections: [sec('S')], nodes: [{ id: 1, x: 0, y: 0, support: 'pin' }, { id: 2, x: 0, y: 5 }, { id: 3, x: 4, y: 5 }, { id: 4, x: 8, y: 5 }, { id: 5, x: 8, y: 0, support: 'pin' }],
  members: [{ id: 1, i: 1, j: 2, section: 'S' }, { id: 2, i: 2, j: 3, section: 'S', releaseJ: true }, { id: 3, i: 3, j: 4, section: 'S' }, { id: 4, i: 5, j: 4, section: 'S' }],
  cases: [{ id: 'D', name: 'D' }], loads: [2, 3].map(id => ({ case: 'D', on: 'member', member: id, type: 'dist', dir: 'gravity', full: true, w1: 12, w2: 12 })) };
r = analyzeFrame(m);
chk('Three-hinged: vertical reaction wL/2', r.caseRes.D.R.get(1)[1], 48);
chk('Three-hinged: horizontal thrust wL²/8h', r.caseRes.D.R.get(1)[0], 12 * 64 / 40);
chk('Three-hinged: column top moment wL²/8', Math.abs(mid(r, 'D', 0, 5).M), 96);
chk('Three-hinged: zero moment at the hinge', mid(r, 'D', 1, 4).M, 0);
console.log('   determinacy:', JSON.stringify(r.det));

// 4. Simply supported member, UDL and point load; also inclined copy gives same moments under perpendicular load
m = { materials: mat, sections: [sec('S')], nodes: [{ id: 1, x: 0, y: 0, support: 'pin' }, { id: 2, x: 6, y: 0, support: 'rollerX' }],
  members: [{ id: 1, i: 1, j: 2, section: 'S' }], cases: [{ id: 'D', name: 'D' }],
  loads: [{ case: 'D', on: 'member', member: 1, type: 'dist', dir: 'gravity', full: true, w1: 10, w2: 10 }, { case: 'D', on: 'member', member: 1, type: 'point', dir: 'gravity', P: 30, a: 2 }] };
r = analyzeFrame(m);
const Mexp = x => 30 * x - 10 * x * x / 2 + (x <= 2 ? 30 * 4 / 6 * x - 30 * x : 0) + (x > 2 ? 30 * 2 / 6 * (6 - x) - 0 : 0);
const RA = 30 + 30 * 4 / 6;
chk('SS member: left reaction', r.caseRes.D.R.get(1)[1], RA);
chk('SS member: moment at load point', mid(r, 'D', 0, 2).M, RA * 2 - 10 * 4 / 2);
chk('SS member: midspan deflection (superposition formula)', mid(r, 'D', 0, 3).v, -(5 * 10 * 6 ** 4 / (384 * EI) + 30 * 2 * 3 * (6 * 6 - 2 * 2 - 3 * 3) / (6 * 6 * EI)), 1e-5);
const ang = Math.atan2(3, 4), c = Math.cos(ang), s = Math.sin(ang);
m.nodes[1] = { id: 2, x: 6 * c, y: 6 * s, support: 'rollerX' };
m.nodes[0].support = 'pin';
m.loads = [{ case: 'D', on: 'member', member: 1, type: 'dist', dir: 'lneg', full: true, w1: 10, w2: 10 }];
m.nodes[1].support = 'pin';
r = analyzeFrame(m);
chk('Inclined pinned–pinned member, normal UDL: midspan moment wL²/8', mid(r, 'D', 0, 3).M, 45);

// 5. Pratt truss (3 panels of 3 m, height 3 m), 30 kN at each bottom interior node
const T = { materials: mat, sections: [sec('S')], nodes: [], members: [], cases: [{ id: 'L', name: 'L' }], loads: [] };
[[1, 0, 0, 'pin'], [2, 3, 0], [3, 6, 0], [4, 9, 0, 'rollerX'], [5, 3, 3], [6, 6, 3]].forEach(([id, x, y, sp]) => T.nodes.push({ id, x, y, support: sp || 'free' }));
[[1, 2], [2, 3], [3, 4], [5, 6], [1, 5], [2, 5], [3, 6], [6, 4], [5, 3]].forEach(([i, j], k) => T.members.push({ id: k + 1, i, j, section: 'S', truss: true }));
T.loads.push({ case: 'L', on: 'node', node: 2, Fx: 0, Fy: -30, Mz: 0 }, { case: 'L', on: 'node', node: 3, Fx: 0, Fy: -30, Mz: 0 });
r = analyzeFrame(T);
const Nm = id => r.caseRes.L.mem[id - 1].N[1];
chk('Truss: support reactions', r.caseRes.L.R.get(1)[1], 30);
chk('Truss: end diagonal 1–5 (compression 30√2)', Nm(5), -30 * Math.SQRT2);
chk('Truss: bottom chord 2–3 (tension 30)', Nm(2), 30);
chk('Truss: top chord 5–6 (compression 30)', Nm(4), -30);
chk('Truss: centre diagonal 5–3 (zero)', Nm(9), 0);
chk('Truss: moments are zero', Math.max(...r.caseRes.L.mem.map(q => Math.max(...q.M.map(Math.abs)))), 0);
console.log('   determinacy:', JSON.stringify(r.det));

// 6. Combination and envelope
m = portal('fixed'); m.cases.push({ id: 'D', name: 'D' }); m.loads.push({ case: 'D', on: 'member', member: 2, type: 'dist', dir: 'gravity', full: true, w1: 10, w2: 10 });
r = analyzeFrame(m);
const c1 = combineResults(r, { D: 1.2, W: 1.6 }), base = r.caseRes;
chk('Combination is the factored sum', c1.R.get(1)[1], 1.2 * base.D.R.get(1)[1] + 1.6 * base.W.R.get(1)[1]);
const env = envelope([combineResults(r, { D: 1.4 }), c1, combineResults(r, { D: 0.9, W: 1.6 })]);
chk('Envelope max ≥ every combination', env.R.get(1).max[1], Math.max(1.4 * base.D.R.get(1)[1], c1.R.get(1)[1], 0.9 * base.D.R.get(1)[1] + 1.6 * base.W.R.get(1)[1]));
chk('Equilibrium ΣFx (case W)', r.caseRes.W.eq.Fx, 0, 1e-9); chk('Equilibrium ΣFy (case D)', r.caseRes.D.eq.Fy, 0, 1e-9); chk('Equilibrium ΣM (case D)', r.caseRes.D.eq.M, 0, 1e-9);

// 7. Mechanism detection
m = portal('pin'); m.members.forEach(q => { q.releaseI = true; q.releaseJ = true; });
r = analyzeFrame(m); console.log(r.ok ? 'FAIL  mechanism not detected' : 'PASS  mechanism detected: ' + r.errors[0]); if (r.ok) fails++;
console.log(`\n${fails ? fails + ' FAILED' : 'ALL PASSED'}`);
process.exit(fails ? 1 : 0);
