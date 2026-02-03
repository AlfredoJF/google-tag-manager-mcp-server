# Fork Notes

This fork adds **STDIO transport with ADC authentication** to Stape's GTM MCP server.

## Differences from Upstream

| File | Change |
|------|--------|
| `src/stdio.ts` | **NEW** - STDIO entry point for local/ADK deployment |
| `src/utils/adcAuth.ts` | **NEW** - ADC authentication with `CUSTOM_ADC_PATH` support |
| `tsconfig.json` | Uses `NodeNext` instead of `Bundler` |
| `src/index.ts` | 3 imports have `.js` extensions |
| All `src/**/*.ts` | Local imports have `.js` extensions (Node.js ESM requirement) |

## Syncing with Upstream

```bash
./scripts/merge-upstream.sh
```

This script:
1. Fetches upstream
2. Merges `upstream/main`
3. Restores fork-specific changes (via `fix-fork-changes.sh`)
4. Builds the project

## Files to Preserve During Merge

These files don't exist in upstream and should never have conflicts:

- `src/stdio.ts` - Your STDIO entry point
- `src/utils/adcAuth.ts` - Your ADC authentication
- `scripts/` - Your merge automation scripts

## Manual Merge Resolution

If upstream updates files that conflict:

1. Take upstream's version
2. Run `./scripts/merge-upstream.sh`
3. The `fix-fork-changes.sh` script will restore fork-specific changes

## Testing After Merge

```bash
npm run build          # Should succeed
node dist/stdio.js    # Should start without errors
```
