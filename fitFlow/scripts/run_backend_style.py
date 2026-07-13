from __future__ import annotations

import subprocess
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
REPORT = ROOT / "reports" / "backend" / "ruff.json"


def main() -> int:
    REPORT.parent.mkdir(parents=True, exist_ok=True)
    result = subprocess.run(
        [
            sys.executable,
            "-m",
            "ruff",
            "check",
            "backend/app",
            "tests/backend",
            "--exit-zero",
            "--output-format=json",
        ],
        cwd=ROOT,
        check=False,
        text=True,
        capture_output=True,
    )
    REPORT.write_text(result.stdout or "[]\n", encoding="utf-8")
    if result.stderr:
        sys.stderr.write(result.stderr)
    print(f"Backend style report written to {REPORT.relative_to(ROOT)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
