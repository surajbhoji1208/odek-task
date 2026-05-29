# 14 — Deployment & CI/CD

## Production Build

```bash
ng build --configuration production
```

Output: `dist/my-app/browser/` — static files ready to serve.

---

## Docker Setup

### Dockerfile (Multi-stage)

```dockerfile
# Stage 1: Build
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci --legacy-peer-deps
COPY . .
RUN npm run build -- --configuration production

# Stage 2: Serve with Nginx
FROM nginx:1.25-alpine AS serve
COPY --from=build /app/dist/my-app/browser /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

---

## Nginx Configuration

```nginx
# nginx.conf
server {
  listen 80;
  root /usr/share/nginx/html;
  index index.html;

  # Security headers
  add_header X-Frame-Options "DENY";
  add_header X-Content-Type-Options "nosniff";
  add_header Referrer-Policy "strict-origin-when-cross-origin";
  add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

  # Gzip
  gzip on;
  gzip_types text/plain text/css application/json application/javascript text/xml application/xml;
  gzip_min_length 1024;

  # Cache static assets (hashed filenames — safe to cache forever)
  location ~* \.(js|css|png|jpg|webp|woff2|ico)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
  }

  # Angular routing — serve index.html for all routes
  location / {
    try_files $uri $uri/ /index.html;
  }

  # Proxy API requests (optional — if backend is separate)
  location /api {
    proxy_pass http://backend-service:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_cache_bypass $http_upgrade;
  }
}
```

---

## Docker Compose

```yaml
# docker-compose.yml
version: '3.8'
services:
  frontend:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "80:80"
    environment:
      - NODE_ENV=production
    restart: unless-stopped

  backend:
    image: my-backend:latest
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - JWT_SECRET=${JWT_SECRET}
    restart: unless-stopped
```

---

## GitHub Actions CI/CD

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  lint-and-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node 20
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Lint
        run: npm run lint

      - name: Unit Tests
        run: npm run test -- --watch=false --browsers=ChromeHeadless --code-coverage

      - name: Build
        run: npm run build -- --configuration production

      - name: Upload coverage
        uses: codecov/codecov-action@v4
        with:
          token: ${{ secrets.CODECOV_TOKEN }}

  security-audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npm audit --audit-level=high

  deploy-staging:
    needs: [lint-and-test]
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/develop'
    steps:
      - uses: actions/checkout@v4

      - name: Build Docker image
        run: docker build -t my-app:staging .

      - name: Push to registry
        run: |
          echo "${{ secrets.DOCKER_PASSWORD }}" | docker login -u "${{ secrets.DOCKER_USERNAME }}" --password-stdin
          docker push my-app:staging

      - name: Deploy to staging
        run: |
          # SSH deploy or kubectl apply
          echo "Deploying to staging..."

  deploy-production:
    needs: [lint-and-test]
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    environment: production
    steps:
      - uses: actions/checkout@v4
      - name: Build and push production image
        run: |
          docker build -t my-app:${{ github.sha }} -t my-app:latest .
          docker push my-app:latest
```

---

## Environment-Specific Builds

```bash
# Development
ng build --configuration development

# Staging
ng build --configuration staging

# Production
ng build --configuration production
```

In `angular.json`:

```json
"configurations": {
  "production": {
    "fileReplacements": [
      { "replace": "src/environments/environment.ts", "with": "src/environments/environment.production.ts" }
    ],
    "optimization": true,
    "outputHashing": "all"
  },
  "staging": {
    "fileReplacements": [
      { "replace": "src/environments/environment.ts", "with": "src/environments/environment.staging.ts" }
    ],
    "optimization": true,
    "outputHashing": "all"
  }
}
```

---

## Package.json Scripts

```json
{
  "scripts": {
    "start": "ng serve",
    "start:staging": "ng serve --configuration staging",
    "build": "ng build",
    "build:staging": "ng build --configuration staging",
    "build:prod": "ng build --configuration production",
    "test": "ng test",
    "test:ci": "ng test --watch=false --browsers=ChromeHeadless",
    "lint": "ng lint",
    "lint:fix": "ng lint --fix",
    "e2e": "cypress run",
    "e2e:open": "cypress open",
    "analyze": "npm run build:prod -- --stats-json && npx webpack-bundle-analyzer dist/stats.json"
  }
}
```

---

## Health Check

```typescript
// After deployment, verify the app is working:
curl -f https://myapp.com/health || exit 1
```

Add a health endpoint that returns `200 OK` when the server is ready.

---

## Rollback Strategy

```bash
# Tag releases
git tag v1.2.0
git push origin v1.2.0

# Rollback Docker image
docker pull my-app:v1.1.0
docker stop my-app-container
docker run -d --name my-app-container my-app:v1.1.0
```

Always keep the previous 2 Docker image versions available.
