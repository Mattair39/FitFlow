import fs from 'node:fs';
import path from 'node:path';

const reportPath = path.join(
  'fitFlow',
  'front-react',
  'doc',
  'reports',
  'frontend',
  'coverage',
  'lcov.info',
);
const frontendPrefix = 'fitFlow/front-react/doc/';

if (!fs.existsSync(reportPath)) {
  console.error(`LCOV report not found: ${reportPath}`);
  process.exit(1);
}

const normalized = fs.readFileSync(reportPath, 'utf8')
  .split(/\r?\n/)
  .map((line) => {
    if (!line.startsWith('SF:')) {
      return line;
    }

    const sourcePath = line.slice(3).replaceAll('\\', '/');
    if (sourcePath.startsWith(frontendPrefix) || path.isAbsolute(sourcePath)) {
      return `SF:${sourcePath}`;
    }

    return `SF:${frontendPrefix}${sourcePath}`;
  })
  .join('\n');

fs.writeFileSync(reportPath, normalized, 'utf8');
