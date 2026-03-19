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

print_first_line() {
  local output
  output="$("$@" 2>&1)"
  printf '%s\n' "$output" | sed -n '1p'
}

echo "==> HDL toolchain versions"
print_first_line iverilog -V
print_first_line ghdl --version
yosys -V
verilator --version

echo "==> HDL toolchain present"
