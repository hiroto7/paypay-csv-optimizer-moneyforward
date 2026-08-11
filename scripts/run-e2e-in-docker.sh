#!/usr/bin/env bash
set -euo pipefail

PLAYWRIGHT_VERSION="$(
  node -p 'require("./package.json").devDependencies["@playwright/test"]'
)"

PLAYWRIGHT_IMAGE="mcr.microsoft.com/playwright:v${PLAYWRIGHT_VERSION}-noble"

exec docker run \
  --rm \
  --init \
  --ipc=host \
  --platform linux/amd64 \
  --env CI \
  --volume "$PWD:/work" \
  --volume pp2mf-npm-cache:/root/.npm \
  --tmpfs /work/node_modules:exec \
  --workdir /work \
  "$PLAYWRIGHT_IMAGE" \
  ./scripts/run-playwright-in-container.sh \
  "$@"
