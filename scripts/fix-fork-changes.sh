#!/bin/bash
# Fix fork-specific changes after merging from upstream
#
# This script restores all fork-specific modifications that differ from upstream:
# - .js extensions in imports (Node.js ESM requirement)
# - tsconfig.json NodeNext configuration
# - index.ts import paths
#
# Usage: ./scripts/fix-fork-changes.sh
#
# Run automatically by: ./scripts/merge-upstream.sh

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}Fixing fork-specific changes...${NC}"
echo ""

# 1. Fix tsconfig.json (preserve NodeNext configuration)
echo -e "${BLUE}[1/3] Fixing tsconfig.json...${NC}"
sed -i '' \
  -e 's/"module": "ES2022",/"module": "NodeNext",/g' \
  -e 's/"moduleResolution": "Bundler",/"moduleResolution": "NodeNext",/g' \
  tsconfig.json
echo -e "${GREEN}  ✓ tsconfig.json fixed${NC}"
echo ""

# 2. Fix index.ts (add .js extensions to 3 imports)
echo -e "${BLUE}[2/3] Fixing src/index.ts...${NC}"
sed -i '' \
  -e 's|from "\./models/McpAgentModel";|from "./models/McpAgentModel.js"|g' \
  -e 's|from "\./tools";|from "./tools/index.js"|g' \
  -e 's|from "\./utils";|from "./utils/index.js"|g' \
  src/index.ts
echo -e "${GREEN}  ✓ src/index.ts fixed${NC}"
echo ""

# 3. Add .js extensions to all TypeScript files
# Strategy: First clean up any .js.js patterns, then add .js
echo -e "${BLUE}[3/3] Adding .js extensions to all TypeScript files...${NC}"
find src -name "*.ts" -type f -exec sed -i '' \
  -e 's|\.js\.js"|.js"|g' \
  -e 's|from "\(\./models/[a-zA-Z0-9_/]*\)";|from "\1.js";|g' \
  -e 's|from "\(\./schemas/[a-zA-Z0-9_/]*\)";|from "\1.js";|g' \
  -e 's|from "\(\./tools/[a-zA-Z0-9_/]*\)";|from "\1.js";|g' \
  -e 's|from "\(\./utils/[a-zA-Z0-9_/]*\)";|from "\1.js";|g' \
  {} \;
echo -e "${GREEN}  ✓ All .js extensions added${NC}"
echo ""

echo -e "${GREEN}✓ All fork-specific changes fixed${NC}"
