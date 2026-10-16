#!/usr/bin/env bash
set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
echo "========================================================================"
echo "  VBOT WORKPLACE - SECURITY & COMPLIANCE TEST RUNNER (TV4)"
echo "  Kiểm tra 5 ràng buộc cứng: H2, H3, H4, H5, H7"
echo "========================================================================"

python3 "$DIR/test_security_sandbox.py"
