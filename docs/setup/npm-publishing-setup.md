---
title: NPM Publishing Setup
created: 2026-01-21
updated: 2026-01-21
status: active
---

# NPM Publishing Setup

This document describes how to configure npm authentication for automated package publishing via GitHub Actions.

## Overview

MeatyCapture publishes to npm as the `meatycapture` package (see [ADR-001](/docs/decisions/ADR-001-cli-npm-scope.md)). The publish workflow requires an npm access token stored as a GitHub repository secret.

## Prerequisites

- npm account with publish access to the `meatycapture` package
- Admin access to the GitHub repository (to add secrets)

## Step 1: Generate npm Access Token

### Option A: Automation Token (Recommended)

Automation tokens bypass 2FA requirements and are designed for CI/CD pipelines.

1. Log in to [npmjs.com](https://www.npmjs.com/)
2. Click your profile avatar (top right) and select **Access Tokens**
3. Click **Generate New Token** and select **Classic Token**
4. Choose token type: **Automation**
5. Enter a descriptive name: `meatycapture-github-actions`
6. Click **Generate Token**
7. **Copy the token immediately** - it will not be shown again

### Option B: Granular Access Token

Granular tokens provide fine-grained permissions but require additional configuration.

1. Log in to [npmjs.com](https://www.npmjs.com/)
2. Click your profile avatar and select **Access Tokens**
3. Click **Generate New Token** and select **Granular Access Token**
4. Configure the token:
   - **Token name**: `meatycapture-github-actions`
   - **Expiration**: 90 days or 1 year (set calendar reminder to rotate)
   - **Packages and scopes**: Select **Only select packages and scopes**
   - **Select packages**: Add `meatycapture`
   - **Permissions**: **Read and write**
5. Click **Generate Token**
6. **Copy the token immediately**

### Token Type Comparison

| Feature | Automation | Granular |
|---------|------------|----------|
| 2FA bypass | Yes | Configurable |
| Package scope | All packages | Specific packages |
| Expiration | Never | Configurable |
| IP allowlist | No | Yes |
| Recommended for | Simple CI/CD | Enterprise/compliance |

For most projects, **Automation tokens** are simpler and sufficient.

## Step 2: Add Token to GitHub Secrets

1. Navigate to your GitHub repository
2. Go to **Settings** > **Secrets and variables** > **Actions**
3. Click **New repository secret**
4. Configure the secret:
   - **Name**: `NPM_TOKEN`
   - **Secret**: Paste the token from Step 1
5. Click **Add secret**

The secret is now available to GitHub Actions workflows as `${{ secrets.NPM_TOKEN }}`.

## Step 3: Verify Workflow Configuration

The npm publish workflow should reference the secret like this:

```yaml
- name: Publish to npm
  run: pnpm publish --access public --no-git-checks
  env:
    NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

Or when using `actions/setup-node`:

```yaml
- name: Setup Node.js
  uses: actions/setup-node@v4
  with:
    node-version: '20'
    registry-url: 'https://registry.npmjs.org'

- name: Publish to npm
  run: pnpm publish --access public --no-git-checks
  env:
    NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

## Security Best Practices

### Token Management

| Practice | Recommendation |
|----------|----------------|
| Scope | Use Automation or package-scoped Granular tokens |
| Rotation | Rotate tokens every 90 days for Granular; annually for Automation |
| Naming | Use descriptive names: `<project>-<purpose>` |
| Monitoring | Review token usage in npm security settings |

### Repository Security

- **Never commit tokens** to the repository
- **Use environment protection rules** for production workflows
- **Limit secret access** to required workflows only
- **Audit secret usage** via GitHub Actions logs (token values are masked)

### Revocation

If a token is compromised:

1. Go to [npmjs.com](https://www.npmjs.com/) > Access Tokens
2. Find the compromised token and click **Delete**
3. Generate a new token following Step 1
4. Update the GitHub secret following Step 2

## Troubleshooting

### Error: 401 Unauthorized

```
npm ERR! 401 Unauthorized - PUT https://registry.npmjs.org/meatycapture
```

**Causes:**
- Token not set or incorrect
- Token expired (Granular tokens)
- Token lacks publish permissions

**Solution:** Verify the `NPM_TOKEN` secret is set correctly and the token has publish access.

### Error: 403 Forbidden

```
npm ERR! 403 Forbidden - You do not have permission to publish
```

**Causes:**
- Token user does not have publish rights to the package
- Package name is taken by another user
- Granular token not scoped to this package

**Solution:** Verify npm account has publish access to `meatycapture` package.

### Error: E2FA Required

```
npm ERR! This operation requires a one-time password
```

**Causes:**
- Using a non-Automation token with 2FA enabled

**Solution:** Use an Automation token, which bypasses 2FA for CI/CD.

## Related Documentation

- [Version Bump Workflow](/docs/setup/version-bump-workflow.md)
- [ADR-001: npm Package Naming](/docs/decisions/ADR-001-cli-npm-scope.md)
- [npm Access Tokens Documentation](https://docs.npmjs.com/creating-and-viewing-access-tokens)

## First Publish Checklist

Use this checklist for the initial v0.1.0-beta.1 release:

### Prerequisites

- [ ] NPM_TOKEN added to GitHub Secrets (see Steps 1-2 above)
- [ ] Package name `meatycapture` available on npm (or owned by publisher)

### Release Steps

- [ ] Changesets reviewed and applied (`pnpm version`)
- [ ] PR merged to main branch
- [ ] Tag created (v0.1.0-beta.1)
- [ ] Publish workflow executed successfully

### Verification

- [ ] Package visible on [npmjs.com/package/meatycapture](https://www.npmjs.com/package/meatycapture)
- [ ] `npm install -g meatycapture` installs successfully
- [ ] `meatycapture --version` outputs correct version
- [ ] `meatycapture --help` displays command help
- [ ] `mc --help` alias works

### Post-Publish

- [ ] Update repository README with npm badge
- [ ] Announce release (if applicable)

## Local Package Verification

Before publishing, verify the package locally:

```bash
# Build CLI
pnpm build:cli

# Test npm pack (dry run)
npm pack --dry-run

# Actual pack to inspect contents
npm pack
tar -tzf meatycapture-*.tgz
rm meatycapture-*.tgz
```

Expected tarball contents:
- `package/dist/cli/index.js` - CLI bundle (~278 KB)
- `package/package.json` - Package configuration
- `package/README.md` - Documentation

## Next Steps

After configuring the npm token:

1. **NPM-002**: Create automated npm publish workflow
2. **NPM-003**: Test publish with dry-run flag
3. **REL-001**: Integrate with GitHub release creation
