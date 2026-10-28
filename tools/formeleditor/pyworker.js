// Rechenkern im Browser (iPad, iPhone, Mac ohne Installation): Python über Pyodide in einem Web-Worker.
// Stufe 1: Python + Formelsatz (sofort nutzbar) · Stufe 2: SymPy · Stufe 3: NumPy und SciPy (nur bei Bedarf: spart Speicher und Ladezeit)
"use strict";
const params = new URL(self.location.href).searchParams;
const PYODIDE = params.get("pyodide") || "https://cdn.jsdelivr.net/pyodide/v0.26.4/full/";
const QUELLEN = params.get("quellen") || "py/";
// „__init__.py“ heißt im Repository „init.py“: GitHub Pages veröffentlicht keine Dateien, deren Name mit „_“ beginnt.
const DATEIEN = ["init.py", "sprache.py", "satz.py", "vorlagen.py", "rechnen.py", "webapi.py"];
const ZIELNAME = { "init.py": "__init__.py" };

let py = null, ruf = null;
const meldung = (stufe, text) => self.postMessage({ status: { stufe, text } });

async function kern() {
  meldung(0, "Python wird geladen …");
  importScripts(PYODIDE + "pyodide.js");
  py = await loadPyodide({ indexURL: PYODIDE });
  py.FS.mkdirTree("/home/pyodide/formeleditor");
  for (const d of DATEIEN) {
    const r = await fetch(QUELLEN + d, { cache: "no-cache" });
    if (!r.ok) throw new Error("Quelldatei fehlt: " + d);
    py.FS.writeFile("/home/pyodide/formeleditor/" + (ZIELNAME[d] || d), await r.text());
  }
  py.runPython("import sys\nif '/home/pyodide' not in sys.path: sys.path.insert(0, '/home/pyodide')\nfrom formeleditor.webapi import ruf_json");
  ruf = py.globals.get("ruf_json");
  meldung(1, "Formelsatz bereit · SymPy wird geladen …");
}
const stufe1 = kern();
const stufe2 = stufe1.then(async () => { meldung(1, "Formelsatz bereit · SymPy wird geladen (einige Sekunden) …"); await py.loadPackage(["sympy"]); meldung(2, "SymPy bereit"); });
stufe2.catch(e => meldung(-1, "Rechenkern konnte nicht geladen werden: " + (e && e.message || e)));
let stufe3p = null;      // NumPy/SciPy werden erst geladen, wenn eine Rechnung sie braucht
const stufe3 = () => (stufe3p = stufe3p || stufe2.then(async () => { meldung(2, "SymPy bereit · NumPy und SciPy werden geladen …"); await py.loadPackage(["numpy", "scipy"]); meldung(3, "bereit"); }));

const RECHNEN = new Set(["/api/berechne", "/api/info"]);

async function bearbeite(pfad, daten) {
  await stufe1;
  if (RECHNEN.has(pfad)) await stufe2;
  let antwort = JSON.parse(ruf(pfad, JSON.stringify(daten || {})));
  if (pfad === "/api/berechne" && antwort && typeof antwort.fehler === "string" && /ModuleNotFoundError|No module named|numpy|scipy/i.test(antwort.fehler)) {
    await stufe3();                                   // NumPy/SciPy jetzt laden → danach erneut
    antwort = JSON.parse(ruf(pfad, JSON.stringify(daten || {})));
  }
  return antwort;
}

self.onmessage = async ev => {
  const { id, pfad, daten } = ev.data;
  try { self.postMessage({ id, antwort: await bearbeite(pfad, daten) }); }
  catch (e) { self.postMessage({ id, antwort: { fehler: "Rechenkern: " + (e && e.message || e) } }); }
};
