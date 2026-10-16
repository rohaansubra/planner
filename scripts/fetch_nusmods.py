#!/usr/bin/env python3
"""Download course data from the NUSMods API into data/courses.json.

Keeps every course relevant to a BComp (Computer Science) with a
Second Major in Management, plus the course pools the degree draws on
(GE pillars, interdisciplinary courses, maths, etc.).

Usage:  python3 scripts/fetch_nusmods.py [academic-year]   e.g. 2026-2027
"""
import json
import os
import re
import sys
import urllib.request
from datetime import date

AY = sys.argv[1] if len(sys.argv) > 1 else "2026-2027"
URL = f"https://api.nusmods.com/v2/{AY}/moduleInfo.json"
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "data", "courses.json")

# Whole subjects to keep (any level).
PREFIXES_ALL = {"CS", "IFS", "CP"}
# Business School subjects that count towards Management (undergrad levels 1000-4000).
PREFIXES_BIZ = {"ACC", "BSE", "BSN", "BSP", "DAO", "DBA", "DOS", "DSC", "DSN", "FIN", "MKT", "MNO"}
# Common Curriculum pools.
PREFIXES_CC = {"GEC", "GES", "GESS", "GEN", "GEA", "UTW", "RVX", "ID", "IDX", "IDE", "IDS", "CD", "CDE", "CDM"}
# Individual courses named in the degree requirements.
EXTRA = {
    "IS1108", "IS4010", "ES2660", "UTC2851", "BT1101", "ST1131", "DSA1101",
    "MA1521", "MA1522", "ST2334", "MA1301", "MA1301X",
    "ETP3201L", "ETP3202L", "ETP3203L", "ETP3205", "ETP3206L",
    "PL3239", "EC2204", "RE1703", "EC1101E",
}
SEM = {1: "S1", 2: "S2", 3: "ST1", 4: "ST2"}


def keep(code):
    m = re.match(r"([A-Z]+)(\d)", code)
    if not m:
        return False
    prefix, level = m.groups()
    return (
        code in EXTRA
        or prefix in PREFIXES_ALL
        or prefix in PREFIXES_CC
        or (prefix in PREFIXES_BIZ and level in "1234")
    )


def clean(s):
    return re.sub(r"\s+", " ", s or "").strip()


def main():
    print(f"Downloading {URL} …")
    req = urllib.request.Request(URL, headers={"User-Agent": "timetable-planner"})
    with urllib.request.urlopen(req, timeout=120) as r:
        data = json.load(r)

    courses = []
    for m in data:
        code = m["moduleCode"]
        if not keep(code):
            continue
        try:
            units = float(m.get("moduleCredit") or 0)
        except ValueError:
            units = 0
        courses.append({
            "c": code,
            "t": clean(m.get("title")),
            "u": int(units) if units.is_integer() else units,
            "d": clean(m.get("description")),
            "f": m.get("faculty", ""),
            "dp": m.get("department", ""),
            "s": [SEM[s["semester"]] for s in m.get("semesterData", []) if s.get("semester") in SEM],
            "pr": clean(m.get("prerequisite")),
            "pc": clean(m.get("preclusion")),
            "co": clean(m.get("corequisite")),
            "w": m.get("workload") if isinstance(m.get("workload"), list) else None,
            "g": m.get("gradingBasisDescription", ""),
            "su": bool((m.get("attributes") or {}).get("su")),
        })

    courses.sort(key=lambda c: c["c"])
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump({"ay": AY, "fetched": date.today().isoformat(), "source": "https://api.nusmods.com", "courses": courses},
                  f, ensure_ascii=False, separators=(",", ":"))
    print(f"Saved {len(courses)} courses to {os.path.relpath(OUT)}")


if __name__ == "__main__":
    main()
