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
  --volume /work/node_modules \
  --workdir /work \
  "$PLAYWRIGHT_IMAGE" \
  ./scripts/run-playwright-in-container.sh \
  "$@"
