# Calidad, pruebas y cobertura

Comandos principales desde `fitFlow/`:

```bash
npm run style
npm run test
npm run coverage
npm run quality
```

Comandos por capa:

```bash
npm run style:backend
npm run style:frontend
npm run test:backend
npm run test:frontend
npm run coverage:backend
npm run coverage:frontend
```

Reportes generados:

- Backend JUnit: `reports/backend/junit.xml`
- Backend cobertura HTML: `reports/backend/coverage-html/index.html`
- Backend cobertura XML/JSON: `reports/backend/coverage.xml`, `reports/backend/coverage.json`
- Backend estilo Ruff JSON: `reports/backend/ruff.json`
- Frontend JUnit: `front-react/doc/reports/frontend/junit.xml`
- Frontend cobertura HTML: `front-react/doc/reports/frontend/coverage/index.html`
- Frontend cobertura JSON/LCOV: `front-react/doc/reports/frontend/coverage/coverage-final.json`, `front-react/doc/reports/frontend/coverage/lcov.info`
- Frontend estilo ESLint JSON: `front-react/doc/reports/frontend/eslint.json`

La cobertura minima configurada es 90% para lineas y sentencias. Los reportes tambien muestran ramas y funciones para seguimiento.
