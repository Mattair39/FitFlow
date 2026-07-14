#!/usr/bin/env bash
set -euo pipefail

SHORT_SHA="${CIRCLE_SHA1:0:8}"
BACKEND_IMAGE="${DOCKERHUB_USERNAME}/fitflow-backend"
FRONTEND_IMAGE="${DOCKERHUB_USERNAME}/fitflow-frontend"

case "${CIRCLE_BRANCH}" in
  develop)
    IMMUTABLE_TAG="dev-${SHORT_SHA}"
    MOVING_TAG="develop"
    ;;
  master)
    IMMUTABLE_TAG="prod-${SHORT_SHA}"
    MOVING_TAG="latest"
    ;;
  *)
    echo "La rama ${CIRCLE_BRANCH} no publica imagenes."
    exit 0
    ;;
esac

echo "${DOCKERHUB_TOKEN}" |
  docker login \
    --username "${DOCKERHUB_USERNAME}" \
    --password-stdin

docker tag "${BACKEND_IMAGE}:${SHORT_SHA}" "${BACKEND_IMAGE}:${IMMUTABLE_TAG}"
docker tag "${BACKEND_IMAGE}:${SHORT_SHA}" "${BACKEND_IMAGE}:${MOVING_TAG}"

docker tag "${FRONTEND_IMAGE}:${SHORT_SHA}" "${FRONTEND_IMAGE}:${IMMUTABLE_TAG}"
docker tag "${FRONTEND_IMAGE}:${SHORT_SHA}" "${FRONTEND_IMAGE}:${MOVING_TAG}"

docker push "${BACKEND_IMAGE}:${IMMUTABLE_TAG}"
docker push "${BACKEND_IMAGE}:${MOVING_TAG}"

docker push "${FRONTEND_IMAGE}:${IMMUTABLE_TAG}"
docker push "${FRONTEND_IMAGE}:${MOVING_TAG}"

docker logout

echo "Imagenes publicadas:"
echo "${BACKEND_IMAGE}:${IMMUTABLE_TAG}"
echo "${FRONTEND_IMAGE}:${IMMUTABLE_TAG}"
