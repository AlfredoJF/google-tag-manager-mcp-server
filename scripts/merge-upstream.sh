#!/bin/bash
# Merge upstream changes from stape-io/google-tag-manager-mcp-server
#
# This script automates the process of merging upstream updates while preserving
# our fork-specific changes (.js extensions for Node.js ESM compatibility)
#
# Usage: ./scripts/merge-upstream.sh
#
# Prerequisites (run once before first use):
#   chmod +x scripts/*.sh

set -e

# Check if scripts are executable
if [ ! -x "./scripts/fix-fork-changes.sh" ]; then
  echo "Error: Scripts are not executable."
  echo ""
  echo "Run this first to make scripts executable:"
  echo "  chmod +x scripts/*.sh"
  exit 1
fi

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}===========================================${NC}"
echo -e "${BLUE}  Merge Upstream from Stape GTM MCP${NC}"
echo -e "${BLUE}===========================================${NC}"
echo ""

# Check if we're on a branch other than main
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" = "main" ]; then
  echo -e "${YELLOW}Warning: You are on main branch.${NC}"
  echo -e "${YELLOW}Consider creating a feature branch first:${NC}"
  echo "  git checkout -b merge-upstream-$(date +%Y%m%d)"
  echo ""
  read -p "Continue anyway? (y/N) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Aborted."
    exit 1
  fi
fi

# Step 1: Fetch upstream
echo -e "${BLUE}[1/4] Fetching upstream...${NC}"
if ! git remote | grep -q "^upstream"; then
  echo -e "${RED}Error: 'upstream' remote not found${NC}"
  echo "Add it with: git remote add upstream https://github.com/stape-io/google-tag-manager-mcp-server.git"
  exit 1
fi

git fetch upstream
echo -e "${GREEN}✓ Upstream fetched${NC}"
echo ""

# Step 2: Merge upstream/main
echo -e "${BLUE}[2/4] Merging upstream/main...${NC}"
git merge upstream/main -m "Merge upstream/main

Preserving fork-specific changes:
- .js extensions in imports (Node.js ESM requirement)
- src/stdio.ts (STDIO entry point for ADK)
- src/utils/adcAuth.ts (ADC authentication)
- tsconfig.json NodeNext configuration
- Console logging fix (MCP protocol)

After merge, running fix scripts for fork-specific changes."
echo -e "${GREEN}✓ Merge complete${NC}"
echo ""

# Step 3: Fix all fork-specific changes
echo -e "${BLUE}[3/4] Fixing fork-specific changes...${NC}"
./scripts/fix-fork-changes.sh
echo ""

# Step 4: Build
echo -e "${BLUE}[4/4] Building project...${NC}"
npm run build
echo -e "${GREEN}✓ Build successful${NC}"
echo ""

# Summary
echo -e "${GREEN}===========================================${NC}"
echo -e "${GREEN}  Merge Complete!${NC}"
echo -e "${GREEN}===========================================${NC}"
echo ""
echo "Please test the changes:"
echo ""
echo -e "  ${BLUE}1. Test STDIO mode:${NC}"
echo "     node dist/stdio.js"
echo ""
echo -e "  ${BLUE}2. Test Workers deployment (optional):${NC}"
echo "     npm run deploy"
echo ""
echo -e "  ${BLUE}3. Review conflicts that need manual resolution:${NC}"
echo "     git status"
echo ""
echo "If there were merge conflicts, resolve them and then:"
echo "  git add <resolved-files>"
echo "  git commit"
echo ""
echo -e "${YELLOW}Note: src/stdio.ts should never have conflicts${NC}"
echo -e "${YELLOW}      (it doesn't exist in upstream)${NC}"
