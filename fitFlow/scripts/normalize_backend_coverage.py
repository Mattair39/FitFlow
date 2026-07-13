from pathlib import Path

REPORT_PATH = Path("fitFlow/reports/backend/coverage.xml")


def main() -> int:
    if not REPORT_PATH.exists():
        print(f"Coverage XML report not found: {REPORT_PATH}")
        return 1

    normalized = REPORT_PATH.read_text(encoding="utf-8").replace(
        "<source>backend/app/",
        "<source>fitFlow/backend/app/",
    )
    REPORT_PATH.write_text(normalized, encoding="utf-8")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
