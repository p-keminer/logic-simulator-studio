#!/bin/bash
set -euo pipefail

echo "==> Quality gates: test"
npm test

echo "==> Quality gates: build"
npm run build

echo "==> Quality gates: lint"
npm run lint

echo "==> Quality gates: all green"
