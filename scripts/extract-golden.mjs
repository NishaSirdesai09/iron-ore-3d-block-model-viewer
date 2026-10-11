// Runs the model half of prototype/fe.html in Node and writes reference values
// to src/model/__fixtures__/golden.json. The port's tests compare against them.
// Usage: node scripts/extract-golden.mjs
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const html = readFileSync(resolve(root, "prototype/fe.html"), "utf8");

const between = (a, b) => {
  const i = html.indexOf(a);
  const j = html.indexOf(b, i);
  if (i < 0 || j < 0) throw new Error(`markers not found: ${a} .. ${b}`);
  return html.slice(i, j);
};

const modelSrc = between("const NX=44", "// ---------- state ----------");
const logSrc = between("function columnLog", "function setLog");
const planSrc = between("function impactOf", "function renderPlanPanel");

const body = `
${modelSrc}
// float rotations are drawn in the scene code of the prototype, right after the floats
const floatRot = floats.map(() => [rand() * 3, rand() * 3, rand() * 3]);
const S = { cut: 45, scenario: false, targets: [] };
const activeConf = () => (S.scenario ? planConf : baseConf);
${logSrc}
${planSrc}
function summaryAt(cut) {
  let T = 0, G = 0; const st = [0, 0, 0, 0, 0], oc = [0, 0, 0, 0, 0, 0];
  for (const n of solid) { if (type[n] < 2 || est[n] < cut) continue; const t = tonnes(n); T += t; G += t * est[n]; st[stageOf(baseConf[n])] += t; oc[occ[n]] += t; }
  return { tonnes: T, grade: T ? G / T : 0, stages: st, occ: oc };
}
function targetsAt(cut, plannedList) {
  S.cut = cut;
  planned.length = 0; planned.push(...plannedList);
  planConf = planned.length ? computeConf([...holes, ...planned]) : baseConf;
  rankTargets();
  return S.targets.map((t) => ({ i: t.i, j: t.j, score: t.score, bk: t.bk, up: t.imp.up, bi: t.bi }));
}
const sum = (arr) => { let s = 0; for (const n of solid) s += arr[n]; return s; };
const h4 = holes[3];
S.cut = 45;
const log = columnLog(h4.i, h4.j, h4.bk, true).map((r) => ({ from: r.from, to: r.to, t: r.t, g: r.g }));
const bi = bestIntercept(columnLog(h4.i, h4.j, h4.bk, true));
const t45 = targetsAt(45, []);
const t55 = targetsAt(55, []);
const p1 = { id: "P-01", i: t45[0].i, j: t45[0].j, kind: "Core", dc: 17, bk: Math.max(0, ktop[t45[0].i + NX * t45[0].j] - 17), planned: true };
const tPlan = targetsAt(45, [p1]);
let before = 0, after = 0;
for (const n of solid) { if (type[n] < 2 || est[n] < 45) continue; const t = tonnes(n); if (baseConf[n] >= 0.5) before += t; if (planConf[n] >= 0.5) after += t; }
return {
  solidCount: solid.length,
  ktopSum: ktop.reduce((a, b) => a + b, 0),
  typeCounts: [0, 1, 2, 3, 4, 5].map((t) => solid.filter((n) => type[n] === t).length),
  occCounts: [0, 1, 2, 3, 4, 5].map((o) => solid.filter((n) => occ[n] === o).length),
  feSum: sum(fe), estSum: sum(est), baseConfSum: sum(baseConf),
  sampleCells: [solid[0], solid[1000], solid[5000], solid[solid.length - 1]].map((n) => ({ n, type: type[n], fe: fe[n], est: est[n], conf: baseConf[n], occ: occ[n] })),
  holes: holes.map((h) => ({ id: h.id, i: h.i, j: h.j, kind: h.kind, dc: h.dc, bk: h.bk })),
  floats: { count: floats.length, first: floats[0], last: floats[floats.length - 1], firstRot: floatRot[0], lastRot: floatRot[floatRot.length - 1] },
  summary45: summaryAt(45), summary55: summaryAt(55),
  ddh04: { log, bi },
  targets45: t45, targets55: t55,
  plannedOne: { hole: { i: p1.i, j: p1.j, bk: p1.bk }, targets: tPlan, g2Before: before, g2After: after },
};
`;

const golden = new Function(body)();
const out = resolve(root, "src/model/__fixtures__/golden.json");
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify(golden, null, 1) + "\n");
console.log(`wrote ${out}`);
console.log(
  `solid ${golden.solidCount}, ${(golden.summary45.tonnes / 1e6).toFixed(1)} Mt @ ${golden.summary45.grade.toFixed(2)}% Fe, floats ${golden.floats.count}`,
);
console.log("targets45", golden.targets45.map((t) => `${t.i},${t.j}`).join(" "));
