from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REPORT = ROOT / "reports" / "backend" / "ruff.json"
TARGETS = ["backend/app", "tests/backend"]


def main() -> int:
    REPORT.parent.mkdir(parents=True, exist_ok=True)

    result = subprocess.run(
        [
            sys.executable,
            "-m",
            "ruff",
            "check",
            *TARGETS,
            "--output-format=json",
        ],
        cwd=ROOT,
        check=False,
        text=True,
        capture_output=True,
        encoding="utf-8",
        errors="replace",
    )

    report_content = result.stdout.strip() or "[]"

    try:
        json.loads(report_content)
        REPORT.write_text(report_content + "\n", encoding="utf-8")
    except json.JSONDecodeError:
        REPORT.write_text("[]\n", encoding="utf-8")

    if result.stderr:
        sys.stderr.write(result.stderr)

    print(f"Backend style report written to {REPORT.relative_to(ROOT)}")

    display_result = subprocess.run(
        [
            sys.executable,
            "-m",
            "ruff",
            "check",
            *TARGETS,
        ],
        cwd=ROOT,
        check=False,
    )

    return display_result.returncode


if __name__ == "__main__":
    raise SystemExit(main())
