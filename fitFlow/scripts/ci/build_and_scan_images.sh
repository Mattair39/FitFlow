#!/usr/bin/env bash
set -euo pipefail

IMAGE_TAG="${CIRCLE_SHA1:0:8}"
REPORT_DIR="reports/security/images"

mkdir -p "${REPORT_DIR}"

docker build \
  -f fitFlow/backend/Dockerfile \
  -t "mattair39/fitflow-backend:${IMAGE_TAG}" \
  .

docker build \
  -f fitFlow/front-react/Dockerfile \
  -t "mattair39/fitflow-frontend:${IMAGE_TAG}" \
  .

scan_image() {
  local image="$1"
  local name="$2"

  trivy image \
    --severity HIGH,CRITICAL \
    --ignore-unfixed \
    --skip-version-check \
    --format json \
    --output "${REPORT_DIR}/trivy-${name}.json" \
    "${image}"

  trivy image \
    --severity HIGH,CRITICAL \
    --ignore-unfixed \
    --skip-version-check \
    --format table \
    --output "${REPORT_DIR}/trivy-${name}.txt" \
    "${image}"

  trivy image \
    --severity HIGH,CRITICAL \
    --ignore-unfixed \
    --skip-version-check \
    --exit-code 1 \
    "${image}"
}

scan_image "mattair39/fitflow-backend:${IMAGE_TAG}" "backend-image"
scan_image "mattair39/fitflow-frontend:${IMAGE_TAG}" "frontend-image"
