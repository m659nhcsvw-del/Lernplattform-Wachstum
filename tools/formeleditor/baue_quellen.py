"""Erzeugt py/quellen.js: Python-Quellen und Worker-Code als Text, damit der Rechenkern
auch beim Doppelklick (file://) startet. Nach jeder Änderung an py/*.py oder pyworker.js neu ausführen:
    python3 baue_quellen.py"""
import json, pathlib
h = pathlib.Path(__file__).parent
dateien = ["init.py", "sprache.py", "satz.py", "vorlagen.py", "rechnen.py", "webapi.py"]
q = {d: (h / "py" / d).read_text(encoding="utf-8") for d in dateien}
w = (h / "pyworker.js").read_text(encoding="utf-8")
(h / "py" / "quellen.js").write_text("window.FE_QUELLEN=" + json.dumps(q, ensure_ascii=False) + ";\nwindow.FE_WORKER=" + json.dumps(w, ensure_ascii=False) + ";\n", encoding="utf-8")
print("py/quellen.js geschrieben")
