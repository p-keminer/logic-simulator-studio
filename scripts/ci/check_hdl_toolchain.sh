#!/bin/bash
set -euo pipefail

tools=(
  iverilog
  ghdl
  yosys
  verilator
)

for tool in "${tools[@]}"; do
  if ! command -v "$tool" >/dev/null 2>&1; then
    echo "Missing HDL tool: $tool" >&2
    exit 1
  fi
done

echo "==> HDL toolchain versions"
iverilog -V | head -n 1
ghdl --version | head -n 1
yosys -V
verilator --version

echo "==> HDL toolchain present"
