# 01 — Project Setup

## Overview

This guide bootstraps a production-grade Angular 20 application from zero using Node 20, standalone components, SCSS, Angular Material, strict TypeScript, and modern tooling (ESLint, Prettier, Husky).

---

## Prerequisites

| Tool | Version | Purpose |
|------|---------|---------|
| Node.js | 20.x LTS | Runtime |
| npm | 10.x | Package manager |
| Angular CLI | 20.x | Scaffolding |
| Git | Latest | Version control |

---

## Step 1 — Install Node 20 (via nvm)

```bash
# Install nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash

# Reload shell
source ~/.bashrc

# Install Node 20 LTS
nvm install 20
nvm use 20
nvm alias default 20

# Verify
node -v   # v20.x.x
npm -v    # 10.x.x
```

---

## Step 2 — Install Angular CLI 20

```bash
npm install -g @angular/cli@20

# Verify
ng version
```

---

## Step 3 — Create the Workspace

```bash
ng new my-enterprise-app \
  --routing \
  --style=scss \
  --strict \
  --standalone \
  --skip-tests=false

cd my-enterprise-app
```

### What each flag does

| Flag | Reason |
|------|--------|
| `--routing` | Generates `app.routes.ts` for standalone routing |
| `--style=scss` | SCSS for scoped, scalable styles |
| `--strict` | Enables strict TypeScript — catches bugs at compile time |
| `--standalone` | No NgModule boilerplate — Angular 20 standard |

---

## Step 4 — Install Angular Material

```bash
ng add @angular/material
```

During setup, choose:
- **Theme**: Custom (you will override)
- **Typography**: Yes
- **Animations**: Include animations

This adds `@angular/material`, `@angular/cdk`, and wires `BrowserAnimationsModule`.

---

## Step 5 — Install Development Tooling

```bash
# ESLint + Angular ESLint
ng add @angular-eslint/schematics

# Prettier
npm install --save-dev prettier eslint-config-prettier eslint-plugin-prettier

# Husky + lint-staged
npm install --save-dev husky lint-staged

# Initialize Husky
npx husky init
```

---

## Step 6 — Configure ESLint

Create `.eslintrc.json` at the project root:

```json
{
  "root": true,
  "ignorePatterns": ["projects/**/*"],
  "overrides": [
    {
      "files": ["*.ts"],
      "extends": [
        "eslint:recommended",
        "plugin:@typescript-eslint/recommended",
        "plugin:@angular-eslint/recommended",
        "plugin:@angular-eslint/template/process-inline-templates",
        "plugin:prettier/recommended"
      ],
      "rules": {
        "@angular-eslint/directive-selector": ["error", { "type": "attribute", "prefix": "app", "style": "camelCase" }],
        "@angular-eslint/component-selector": ["error", { "type": "element", "prefix": "app", "style": "kebab-case" }],
        "@typescript-eslint/no-explicit-any": "error",
        "@typescript-eslint/explicit-function-return-type": "warn",
        "no-console": ["warn", { "allow": ["warn", "error"] }]
      }
    },
    {
      "files": ["*.html"],
      "extends": [
        "plugin:@angular-eslint/template/recommended",
        "plugin:@angular-eslint/template/accessibility"
      ]
    }
  ]
}
```

---

## Step 7 — Configure Prettier

Create `.prettierrc`:

```json
{
  "singleQuote": true,
  "trailingComma": "all",
  "printWidth": 100,
  "tabWidth": 2,
  "semi": true,
  "bracketSpacing": true,
  "arrowParens": "avoid"
}
```

Create `.prettierignore`:

```
dist/
node_modules/
.angular/
coverage/
```

---

## Step 8 — Configure Husky + lint-staged

In `package.json`, add:

```json
{
  "lint-staged": {
    "*.ts": ["eslint --fix", "prettier --write"],
    "*.html": ["prettier --write"],
    "*.scss": ["prettier --write"]
  }
}
```

Edit `.husky/pre-commit`:

```bash
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

npx lint-staged
```

---

## Step 9 — Configure tsconfig.json (Strict Mode)

Ensure `tsconfig.json` has:

```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "exactOptionalPropertyTypes": true,
    "forceConsistentCasingInFileNames": true,
    "target": "ES2022",
    "useDefineForClassFields": false,
    "experimentalDecorators": true,
    "moduleResolution": "bundler",
    "paths": {
      "@core/*": ["src/app/core/*"],
      "@shared/*": ["src/app/shared/*"],
      "@features/*": ["src/app/features/*"],
      "@env/*": ["src/environments/*"]
    }
  }
}
```

The `paths` aliases eliminate relative import chains like `../../../../services/auth.service`.

---

## Step 10 — Configure angular.json

Key settings in `angular.json`:

```json
{
  "build": {
    "options": {
      "outputHashing": "all",
      "optimization": true,
      "sourceMap": false,
      "namedChunks": false,
      "aot": true,
      "budgets": [
        { "type": "initial", "maximumWarning": "500kb", "maximumError": "1mb" },
        { "type": "anyComponentStyle", "maximumWarning": "4kb" }
      ]
    }
  }
}
```

---

## Step 11 — Verify Setup

```bash
# Run dev server
ng serve

# Run lint
ng lint

# Run tests
ng test

# Build production
ng build --configuration production
```

---

## Anti-Patterns to Avoid

| Anti-pattern | Correct approach |
|---|---|
| Skipping `--strict` | Always enable strict mode |
| Using NgModule-based setup | Use standalone components exclusively |
| Global styles in `component.scss` | Use `styles.scss` for globals only |
| Committing without lint | Husky pre-commit enforces it |
| Installing Angular Material manually | Always use `ng add` for proper wiring |

---

## Scalability Notes

- The `paths` aliases in `tsconfig.json` scale to 100+ features without import chaos.
- Husky + lint-staged keeps the codebase consistent as the team grows.
- Strict mode catches regressions before they hit CI.
