#!/usr/bin/env bash
set -euo pipefail

if [ "${CIRCLE_BRANCH}" != "master" ]; then
  echo "GitOps solo se ejecuta en master."
  exit 0
fi

SHORT_SHA="${CIRCLE_SHA1:0:8}"
PROD_TAG="prod-${SHORT_SHA}"

BACKEND_MANIFEST="fitFlow/k8s/backend-deployment.yaml"
FRONTEND_MANIFEST="fitFlow/k8s/frontend-deployment.yaml"

sed -i -E \
  "s#image: .*/fitflow-backend:[^[:space:]]+#image: ${DOCKERHUB_USERNAME}/fitflow-backend:${PROD_TAG}#" \
  "${BACKEND_MANIFEST}"

sed -i -E \
  "s#image: .*/fitflow-frontend:[^[:space:]]+#image: ${DOCKERHUB_USERNAME}/fitflow-frontend:${PROD_TAG}#" \
  "${FRONTEND_MANIFEST}"

echo "Imagenes configuradas:"
grep "image:" "${BACKEND_MANIFEST}"
grep "image:" "${FRONTEND_MANIFEST}"

git config user.name "CircleCI GitOps"
git config user.email "circleci-gitops@users.noreply.github.com"

git add "${BACKEND_MANIFEST}" "${FRONTEND_MANIFEST}"

if git diff --cached --quiet; then
  echo "Los manifiestos ya contienen ${PROD_TAG}."
  exit 0
fi

git commit -m "gitops: deploy ${PROD_TAG} [skip ci]"

git remote set-url origin \
  "https://${GITHUB_USERNAME}:${GITHUB_TOKEN}@github.com/Mattair39/FitFlow.git"

git push origin HEAD:master

echo "Manifiestos GitOps actualizados en master."
