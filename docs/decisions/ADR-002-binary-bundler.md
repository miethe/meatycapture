# ADR-002: Binary Bundler for CLI Distribution

**Status:** Accepted
**Date:** 2026-01-22
**Decision Makers:** MeatyCapture maintainers

## Context

MeatyCapture CLI needs standalone binary distribution for users without Node.js/Bun installed. The current build uses esbuild to bundle TypeScript into a Node.js-dependent `dist/cli/index.js`. We need a solution that produces truly standalone executables.

### Requirements

1. **Zero-dependency binaries**: Users should run `./meatycapture` without installing Node.js, Bun, or any runtime
2. **Cross-platform support**: macOS (arm64, x64), Linux (x64, arm64), Windows (x64)
3. **Reasonable binary size**: Acceptable for CLI distribution (sub-200MB)
4. **Build simplicity**: Single tool for bundling and compilation
5. **TypeScript support**: Direct compilation from `.ts` source

### Current Build Setup

- Entry: `src/cli/index.ts`
- Build tool: esbuild
- Output: `dist/cli/index.js` (Node.js-dependent, 278KB)
- Dependencies: commander, yaml, chalk, cli-table3 (marked as external)

## Options Evaluated

### Option 1: Bun Compile

Bun's `bun build --compile` creates standalone executables that embed the Bun runtime.

| Pros | Cons |
|------|------|
| Native TypeScript support | ~60MB binary size (runtime overhead) |
| Cross-compilation from any platform | Requires Bun 1.1.5+ |
| All dependencies automatically bundled | Bun-specific runtime behavior |
| Single command build | Not Node.js compatible at runtime |
| Production-ready (stable since 1.1) | |
| Fast builds (~100ms) | |

**Test Results (2026-01-22):**
- macOS arm64: 60MB, works perfectly
- Linux x64: 105MB, cross-compiled successfully
- Windows x64: 116MB, cross-compiled successfully
- All CLI commands functional in standalone binary

### Option 2: pkg (Vercel)

Compiles Node.js apps into standalone executables.

| Pros | Cons |
|------|------|
| Mature, widely used | Project archived/deprecated |
| Node.js compatible runtime | Requires separate esbuild step |
| Good documentation | Limited ES module support |
| | Larger binaries (~100MB+) |
| | No active development |

### Option 3: nexe

Similar to pkg, compiles Node.js into executables.

| Pros | Cons |
|------|------|
| Node.js compatible | Less maintained than pkg |
| Smaller binaries (sometimes) | Complex configuration |
| | Slower builds |
| | Limited TypeScript support |

### Option 4: Deno Compile

Deno's built-in compilation feature.

| Pros | Cons |
|------|------|
| Small binaries (~60MB) | Requires Deno-specific code |
| Good security model | Different module system |
| | Would require codebase migration |

## Decision

**Accepted: Bun Compile** (Option 1)

### Rationale

1. **Single-tool workflow.** Bun handles TypeScript compilation, bundling, and binary generation in one command. No need for esbuild + secondary compiler chain.

2. **Cross-compilation built-in.** Can build all platform targets from macOS development machine:
   ```bash
   bun build --compile --target=bun-darwin-arm64 src/cli/index.ts
   bun build --compile --target=bun-linux-x64 src/cli/index.ts
   bun build --compile --target=bun-windows-x64 src/cli/index.ts
   ```

3. **Verified functionality.** Testing confirmed all CLI commands work in standalone binary:
   - `--version` works
   - `--help` works
   - `log list` with file system operations works
   - All subcommands accessible

4. **Active development.** Bun is actively maintained with regular releases. pkg and nexe are effectively abandoned.

5. **Build speed.** Sub-second builds enable rapid iteration during development.

6. **Dependency bundling.** Bun automatically bundles commander, yaml, chalk, and cli-table3 - no need for external configuration.

### Rejected Alternatives

- **pkg**: Deprecated project with no active development. ES module support issues.
- **nexe**: Maintenance concerns and complex configuration.
- **Deno**: Would require significant codebase changes for Deno compatibility.
- **esbuild-only**: Cannot produce standalone binaries without a runtime compiler.

## Consequences

### Positive

- Simple build process with single tool
- Cross-compilation from developer machine
- Fast iteration during development
- Modern TypeScript support out of the box
- No dependency on pkg/nexe maintenance

### Negative

- 60MB base binary size (Bun runtime embedded)
- Binary runs Bun runtime, not Node.js (compatibility differences possible)
- Users with Bun installed still get 60MB binary (no shared runtime)

### Neutral

- Binary naming convention: `meatycapture-{os}-{arch}`
  - `meatycapture-darwin-arm64`
  - `meatycapture-darwin-x64`
  - `meatycapture-linux-x64`
  - `meatycapture-linux-arm64`
  - `meatycapture-windows-x64.exe`

## Implementation Notes

### Build Script

Create `build-binary.js` for local and CI binary generation:

```javascript
// Builds standalone binaries for all platforms
await Bun.build({
  entrypoints: ['src/cli/index.ts'],
  compile: true,
  target: 'bun-darwin-arm64', // or parameterized
  outfile: 'dist/bin/meatycapture-darwin-arm64',
  minify: true,
});
```

### CI Integration

GitHub Actions workflow will:
1. Build binaries for all targets
2. Upload as release assets
3. Generate checksums for verification

### npm Package

The npm package continues to use `dist/cli/index.js` (Node.js-dependent) for `npm install -g` users. Standalone binaries are an alternative distribution channel for users without Node.js.

## Performance Benchmarks

| Build Type | Time | Output Size |
|------------|------|-------------|
| esbuild only | 53ms | 278KB (requires Node.js) |
| Bun compile (current platform) | 126ms | 60MB |
| Bun compile (cross: Linux x64) | 886ms | 105MB |
| Bun compile (cross: Windows x64) | 1414ms | 116MB |

## References

- [Bun Single-file Executables](https://bun.com/docs/bundler/executables)
- [Bun v1.1.5 Cross-Compilation](https://bun.sh/blog/bun-v1.1.5)
- [pkg (archived)](https://github.com/vercel/pkg)
