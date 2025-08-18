# Build Process Documentation

## Overview

This monorepo uses a shared package architecture where the `@openenglishttutor/shared` package contains common types, utilities, and constants used by other packages (primarily the API).

## Critical Build Order

**IMPORTANT**: The shared package MUST be built before any other packages that depend on it.

### Build Dependencies

```
packages/shared → packages/api
```

## Available Scripts

### Root Level Scripts

- `npm run build` - Builds shared package first, then all other packages
- `npm run build:shared` - Builds only the shared package
- `npm run build:api` - Builds shared package first, then API package
- `npm run dev` - Builds shared package first, then starts development mode
- `npm run dev:api` - Builds shared package first, then starts API in dev mode
- `npm run dev:shared` - Starts shared package in watch mode

### Development Workflow

1. **First Time Setup**:
   ```bash
   npm install
   npm run build:shared  # This happens automatically in postinstall
   ```

2. **Development**:
   ```bash
   npm run dev:api  # For API development
   # OR
   npm run dev:shared  # For shared package development (in separate terminal)
   ```

3. **Production Build**:
   ```bash
   npm run build  # Builds everything in correct order
   ```

## Troubleshooting

### Error: Cannot find module '@openenglishttutor/shared/dist/index.js'

This error occurs when the shared package hasn't been built. Solutions:

1. **Quick Fix**:
   ```bash
   npm run build:shared
   ```

2. **Full Rebuild**:
   ```bash
   npm run clean
   npm run build
   ```

3. **Development Setup**:
   ```bash
   npm run dev:shared  # In one terminal
   npm run dev:api     # In another terminal
   ```

### Build Configuration

The build process is managed by:

- **Turbo.json**: Defines build pipeline and dependencies
- **Root package.json**: Contains scripts that ensure proper build order
- **Individual package.json**: Contains package-specific build scripts

### Key Changes Made

1. **Root package.json**: Added `build:shared` dependency to all relevant scripts
2. **Turbo.json**: Updated pipeline to ensure proper dependency resolution
3. **Postinstall**: Automatically builds shared package after npm install
4. **Development scripts**: All dev scripts now build shared package first

## Best Practices

1. Always run `npm run build:shared` after making changes to the shared package
2. Use `npm run dev:shared` in watch mode when actively developing shared utilities
3. The shared package build is fast, so it's safe to run before other operations
4. If you encounter import errors, always check if shared package is built first

## Package Structure

```
packages/
├── shared/           # Common types, utilities, constants
│   ├── src/
│   ├── dist/        # Built output (auto-generated)
│   └── package.json
└── api/             # Backend API server
    ├── src/
    ├── dist/        # Built output (auto-generated)
    └── package.json