#!/bin/bash
# Regenerate test package tarballs

set -e

cd "$(dirname "$0")"

echo "Packing dependent_package..."
cd dependent_package && pnpm pack --pack-destination .. && cd ..

echo "Packing multi_pkg..."
cd multi_pkg && pnpm pack --pack-destination .. && cd ..

echo "Done! Generated tarballs:"
ls -lh *.tgz
