# Power Scraper Pro - Website Infrastructure & Deployment Guide

Complete reference for the website hosting, DNS, deployment, and architecture.
**Last updated:** January 24, 2026

---

## Table of Contents

1. [Current Architecture Overview](#current-architecture-overview)
2. [Domain & DNS Configuration (GoDaddy)](#domain--dns-configuration-godaddy)
3. [Hosting: Cloudflare Pages](#hosting-cloudflare-pages)
4. [GitHub Repository](#github-repository)
5. [How to Deploy (Manual via Wrangler)](#how-to-deploy-manual-via-wrangler)
6. [How to Set Up Automatic Deploys (GitHub → Cloudflare)](#how-to-set-up-automatic-deploys-github--cloudflare)
7. [How to Revert to GitHub Pages](#how-to-revert-to-github-pages)
8. [File Architecture](#file-architecture)
9. [Security Headers](#security-headers)
10. [Service Worker Strategy](#service-worker-strategy)
11. [Troubleshooting](#troubleshooting)

---

## Current Architecture Overview

```
User visits powerscraperpro.com
        │
        ▼
GoDaddy DNS (ns71/ns72.domaincontrol.com)
        │
        ├─── www.powerscraperpro.com (CNAME → powerscraperpro.pages.dev)
        │           │
        │           ▼
        │    Cloudflare Pages (serves the website)
        │    IPs: 172.66.47.87, 172.66.44.169
        │
        └─── powerscraperpro.com (bare/apex domain)
                    │
                    ▼
             GoDaddy Forwarding (301 redirect)
             IPs: 3.33.251.168, 15.197.225.128
                    │
                    ▼
             Redirects to → https://www.powerscraperpro.com
                    │
                    ▼
             Cloudflare Pages (same destination)
```

**Why forwarding instead of direct DNS?**
GoDaddy does not support CNAME records on the apex/root domain (`powerscraperpro.com`). Only `www` subdomains can have CNAME records. The workaround is GoDaddy's built-in forwarding feature, which does a 301 redirect from the bare domain to `www`.

---

## Domain & DNS Configuration (GoDaddy)

**Registrar:** GoDaddy
**Nameservers:** `ns71.domaincontrol.com`, `ns72.domaincontrol.com`

### Current DNS Records

| Type | Name | Value | Purpose |
|------|------|-------|---------|
| CNAME | www | powerscraperpro.pages.dev | Points www to Cloudflare Pages |
| CNAME | docs | (if configured) | Documentation subdomain |
| CNAME | e-mail | (if configured) | Email service |
| CNAME | _domainconnect | (GoDaddy internal) | Domain connect protocol |
| NS | @ | ns71.domaincontrol.com | Primary nameserver |
| NS | @ | ns72.domaincontrol.com | Secondary nameserver |
| MX | @ | (mailgun records) | Email routing |
| TXT | @ | SPF record | Email authentication |
| TXT | @ | DKIM record | Email signing |
| TXT | @ | DMARC record | Email policy |

### GoDaddy Forwarding Configuration

- **Source:** `powerscraperpro.com` (bare domain)
- **Destination:** `https://www.powerscraperpro.com`
- **Type:** Permanent (301)
- **Protocol:** HTTPS

The forwarding resolves to GoDaddy/AWS Global Accelerator IPs:
- `3.33.251.168`
- `15.197.225.128`

### How to Verify DNS is Working

```bash
# Check www points to Cloudflare Pages
dig www.powerscraperpro.com +short
# Expected: powerscraperpro.pages.dev. → 172.66.x.x

# Check bare domain forwarding
dig powerscraperpro.com +short
# Expected: 3.33.251.168, 15.197.225.128 (GoDaddy forwarding)

# Verify 301 redirect works
curl -sI http://powerscraperpro.com | grep -i location
# Expected: Location: https://www.powerscraperpro.com/

# Verify Cloudflare is serving
curl -sI https://www.powerscraperpro.com | grep server
# Expected: server: cloudflare
```

---

## Hosting: Cloudflare Pages

**Project name:** `powerscraperpro`
**Default domain:** `powerscraperpro.pages.dev`
**Custom domain:** `www.powerscraperpro.com`
**Deployment method:** GitHub Actions (automatic on push to `main`)
**Fallback method:** `npx wrangler pages deploy .` (manual, if needed)
**Account ID:** `187947f254be68306f576194a379b643`

### Cloudflare Dashboard Access

- Log in to Cloudflare dashboard
- Go to: Workers & Pages → powerscraperpro
- Custom domains are configured there (www.powerscraperpro.com)

### Important Cloudflare Pages Details

- No build step needed (static site, no framework)
- Files are uploaded directly from the local directory
- `_headers` file is processed by Cloudflare for custom headers
- Service worker (`sw.js`) is served as a static file, not a Cloudflare Worker
- Deployments are immutable and versioned (can rollback in dashboard)
- HTTP/2 and HTTP/3 enabled automatically
- Free SSL/TLS certificate auto-provisioned for custom domain

---

## GitHub Repository

**URL:** `https://github.com/jchezik/powerscraperpro.com.git`
**Branch:** `main`
**Remote name:** `origin`

### Commit History

```
183b813 [Architecture] Complete CSS/JS/SW overhaul - best practices rewrite
23f8d6b Fix responsive CSS: correct breakpoint order + fluid typography
146e1cf Improve responsive breakpoints for all device sizes
fa384ba Performance, SEO, and accessibility optimizations
ed26199 Initial commit: Power Scraper Pro website
```

### Git Commands Reference

```bash
# Check status
cd "/Users/john/Desktop/Power Scraper Pro WebSite"
git status

# Push changes
git add -A
git commit -m "Description of changes"
git push origin main

# Pull latest
git pull origin main

# View remote
git remote -v
```

---

## How to Deploy (Automatic — GitHub Actions)

**Deploys are now fully automatic.** Every push to the `main` branch triggers a GitHub Actions workflow that deploys to Cloudflare Pages.

### How It Works

```
You edit files locally
        │
        ▼
git add -A && git commit -m "message" && git push
        │
        ▼
GitHub receives the push on `main` branch
        │
        ▼
GitHub Actions runs `.github/workflows/deploy.yml`
        │
        ▼
Wrangler deploys to Cloudflare Pages (powerscraperpro)
        │
        ▼
Site is live at www.powerscraperpro.com (within ~30 seconds)
```

### Deploy Steps (Just Push!)

```bash
cd "/Users/john/Desktop/Power Scraper Pro WebSite"
git add -A
git commit -m "Description of changes"
git push origin main
# Done! GitHub Actions handles the rest automatically.
```

### Check Deploy Status

- Go to: https://github.com/jchezik/powerscraperpro.com/actions
- You'll see each push listed with a green checkmark (success) or red X (failure)
- Click any run to see deployment details and logs

### GitHub Actions Workflow File

Located at: `.github/workflows/deploy.yml`

```yaml
name: Deploy to Cloudflare Pages

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    name: Deploy
    steps:
      - uses: actions/checkout@v4

      - name: Deploy to Cloudflare Pages
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
```

### GitHub Repository Secrets

These are stored encrypted in GitHub (Settings → Secrets → Actions):

| Secret Name | Value | Purpose |
|-------------|-------|---------|
| `CLOUDFLARE_API_TOKEN` | (encrypted OAuth token) | Authenticates Wrangler to deploy |
| `CLOUDFLARE_ACCOUNT_ID` | `187947f254be68306f576194a379b643` | Identifies which Cloudflare account |

### Manual Deploy (Fallback Only)

If GitHub Actions is down or you need to deploy without committing:

```bash
cd "/Users/john/Desktop/Power Scraper Pro WebSite"
npx wrangler pages deploy . --project-name=powerscraperpro
```

### Important Notes

- The `_headers` file is automatically processed on deploy
- The service worker cache version (`psp-v2` in `sw.js`) should be incremented on major changes
- Deployment uploads only changed files (fast incremental deploys)
- Previous deployments can be rolled back in the Cloudflare dashboard
- GitHub Actions logs: https://github.com/jchezik/powerscraperpro.com/actions

---

## Automatic Deploys (Already Configured)

Automatic deploys via GitHub Actions are **already set up and working**.

Every `git push origin main` automatically deploys to Cloudflare Pages.

### If the Token Expires

The Cloudflare API token may expire. If deploys start failing:

1. On your Mac, run: `npx wrangler login` (this refreshes the token)
2. Get the new token: `cat ~/Library/Preferences/.wrangler/config/default.toml`
3. Copy the `oauth_token` value
4. Update the GitHub secret:
   ```bash
   cd "/Users/john/Desktop/Power Scraper Pro WebSite"
   gh secret set CLOUDFLARE_API_TOKEN --body "YOUR_NEW_TOKEN_HERE"
   ```
5. Push any commit to trigger a new deploy

### If You Need to Recreate the Secrets from Scratch

```bash
cd "/Users/john/Desktop/Power Scraper Pro WebSite"

# Set the Cloudflare Account ID
gh secret set CLOUDFLARE_ACCOUNT_ID --body "187947f254be68306f576194a379b643"

# Set the API token (get from Wrangler config after running `npx wrangler login`)
gh secret set CLOUDFLARE_API_TOKEN --body "PASTE_OAUTH_TOKEN_HERE"
```

---

## How to Revert to GitHub Pages

If you ever want to stop using Cloudflare Pages and go back to GitHub Pages:

### Step 1: Enable GitHub Pages

1. Go to `https://github.com/jchezik/powerscraperpro.com/settings/pages`
2. Under **Source**, select **Deploy from a branch**
3. Branch: `main`, folder: `/ (root)`
4. Save

The site will be live at: `https://jchezik.github.io/powerscraperpro.com/`

### Step 2: Update GoDaddy DNS

Delete the current CNAME for `www` and replace with GitHub Pages:

| Type | Name | Value |
|------|------|-------|
| CNAME | www | jchezik.github.io |

For the **apex domain** (if your registrar supports ALIAS/ANAME, or use A records):

| Type | Name | Value |
|------|------|-------|
| A | @ | 185.199.108.153 |
| A | @ | 185.199.109.153 |
| A | @ | 185.199.110.153 |
| A | @ | 185.199.111.153 |

IPv6 (optional but recommended):

| Type | Name | Value |
|------|------|-------|
| AAAA | @ | 2606:50c0:8000::153 |
| AAAA | @ | 2606:50c0:8001::153 |
| AAAA | @ | 2606:50c0:8002::153 |
| AAAA | @ | 2606:50c0:8003::153 |

### Step 3: Configure Custom Domain in GitHub

1. Go to repo Settings → Pages
2. Under **Custom domain**, enter: `www.powerscraperpro.com`
3. Check **Enforce HTTPS**
4. Wait for DNS verification and certificate provisioning

### Step 4: Remove GoDaddy Forwarding

If using A records for the apex domain, you can remove the forwarding rule since the A records will serve directly from GitHub.

### Step 5: Remove Cloudflare Pages Custom Domain

1. Cloudflare Dashboard → Workers & Pages → powerscraperpro → Custom domains
2. Remove `www.powerscraperpro.com`

### GitHub Pages Limitations vs Cloudflare Pages

| Feature | Cloudflare Pages | GitHub Pages |
|---------|-----------------|--------------|
| Custom headers (_headers file) | Yes | No |
| HTTP/2 Push / Early Hints | Yes | No |
| Custom security headers (CSP, HSTS) | Yes (via _headers) | No |
| Edge caching (global CDN) | 300+ PoPs | GitHub CDN |
| Build minutes | 500/month free | Unlimited |
| Bandwidth | Unlimited | 100GB/month |
| Custom 404 page | 404.html | 404.html |
| Automatic HTTPS | Yes | Yes |
| Redirects (_redirects file) | Yes | No |

---

## File Architecture

```
/Users/john/Desktop/Power Scraper Pro WebSite/
├── index.html              # Homepage (hero, features, stats, CTA)
├── features.html           # Full features page (200+ features detailed)
├── screenshots.html        # Gallery with lightbox
├── download.html           # Buy page (€39.95, Paddle payment)
├── 404.html                # Custom 404 error page
├── sw.js                   # Service worker (cache strategies)
├── _headers                # Cloudflare custom headers (security, caching)
├── INFRASTRUCTURE.md       # This file
├── .github/
│   └── workflows/
│       └── deploy.yml      # GitHub Actions: auto-deploy to Cloudflare on push
├── css/
│   └── styles.css          # Complete design system (1300+ lines)
├── js/
│   └── main.js             # Interactions (scroll, lightbox, particles, counters)
└── assets/
    ├── icons/
    │   └── app-icon.png    # App icon (favicon, nav, OG image)
    └── screenshots/
        ├── dashboard-library.png
        ├── movies-dashboard.png
        ├── tv-dashboard.png
        ├── collections.png
        ├── upcoming.png
        ├── settings-artwork.png
        ├── settings-cloud-sync.png
        └── rename-rescrape.png
```

### CSS Architecture

- **Design tokens** via CSS custom properties (colors, spacing, typography, shadows, transitions)
- **Fluid typography** using `clamp()` — no duplicate declarations
- **Safe grids** using `minmax(min(350px, 100%), 1fr)` — prevents overflow on small screens
- **Performance:** `content-visibility: auto` on sections, `will-change: transform` on animated elements
- **Accessibility:** `prefers-reduced-motion`, `focus-visible`, `sr-only` classes
- **Modern CSS:** `dvh` units, `text-wrap: balance/pretty`, logical properties, `scrollbar-gutter: stable`
- **Responsive breakpoints:** 1024px → 768px → 640px → 480px → 360px
- **Print styles** included

### JavaScript Architecture

- IIFE pattern, strict mode, no dependencies
- `prefers-reduced-motion` respected throughout (skips animations, particles, counters)
- Passive scroll listener for nav
- IntersectionObserver for scroll reveals and counter animations
- Lightbox with focus trap and keyboard support (Escape, Enter, Space)
- Mobile nav with body scroll lock and Escape key
- `DocumentFragment` for batch DOM insertion (particles)
- `aria-current="page"` for active navigation link

### Service Worker Strategy

- **HTML pages:** Network-first (always fetch fresh, cache as offline fallback)
- **Static assets (CSS, JS, images):** Stale-while-revalidate (serve from cache immediately, update in background)
- **Cache name:** `psp-v2` (increment on breaking changes to force re-cache)
- **Precached assets:** Only critical path (HTML pages, CSS, JS, icon) — not screenshots

---

## Security Headers

All headers are configured in the `_headers` file and applied by Cloudflare:

| Header | Value | Purpose |
|--------|-------|---------|
| Content-Security-Policy | `default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'` | Restricts resource loading |
| Strict-Transport-Security | `max-age=31536000; includeSubDomains; preload` | Forces HTTPS for 1 year |
| X-Content-Type-Options | `nosniff` | Prevents MIME sniffing |
| X-Frame-Options | `DENY` | Prevents iframe embedding |
| X-XSS-Protection | `1; mode=block` | Legacy XSS filter |
| Referrer-Policy | `strict-origin-when-cross-origin` | Controls referrer info |
| Permissions-Policy | `camera=(), microphone=(), geolocation=(), interest-cohort=()` | Disables device APIs, opts out of FLoC |
| Cross-Origin-Opener-Policy | `same-origin` | Isolates browsing context |
| Cross-Origin-Resource-Policy | `same-origin` | Prevents cross-origin reads |

### Cache-Control Strategy

| Path | Cache-Control | Reason |
|------|---------------|--------|
| `/css/*` | `public, max-age=31536000, immutable` | Versioned via SW |
| `/js/*` | `public, max-age=31536000, immutable` | Versioned via SW |
| `/assets/*` | `public, max-age=31536000, immutable` | Static images |
| `/*.html`, `/` | `public, max-age=3600, must-revalidate` | Fresh content hourly |
| `/sw.js` | `no-cache, no-store, must-revalidate` | Always fresh SW |

---

## Service Worker Strategy

The service worker (`sw.js`) provides offline capability and performance:

```
Cache name: psp-v2

Precached (on install):
  /, /index.html, /features.html, /screenshots.html,
  /download.html, /404.html, /css/styles.css,
  /js/main.js, /assets/icons/app-icon.png

HTML requests → Network-first (fresh content, cache fallback)
Static assets → Stale-while-revalidate (instant from cache, update in background)
Navigation failures → Serve /404.html from cache
```

### When to Increment Cache Version

Change `psp-v2` to `psp-v3` (etc.) when:
- Major CSS restructuring that could leave stale styles
- JavaScript API changes
- New pages added to precache list

The old cache is automatically deleted on activation.

---

## Troubleshooting

### Site shows white/blank page

1. Clear browser cache (Cmd+Shift+R)
2. Check service worker: DevTools → Application → Service Workers → Unregister
3. Verify deployment: `curl -sI https://www.powerscraperpro.com | grep -i etag`

### DNS not resolving

```bash
# Check propagation
dig www.powerscraperpro.com +short
# Should return: powerscraperpro.pages.dev → 172.66.x.x

# If it returns old IPs, DNS is still propagating (up to 48 hours)
# Check from different DNS:
dig @8.8.8.8 www.powerscraperpro.com +short
```

### Bare domain not redirecting

1. Log into GoDaddy → Domain → Manage → Forwarding
2. Verify:
   - Forward to: `https://www.powerscraperpro.com`
   - Type: Permanent (301)
3. Make sure there are NO A records for `@` (they conflict with forwarding)

### Deployment fails

```bash
# Re-authenticate Wrangler
npx wrangler login

# Check project exists
npx wrangler pages project list

# Deploy with verbose output
npx wrangler pages deploy . --project-name=powerscraperpro 2>&1
```

### Service worker serving stale content

1. Increment cache version in `sw.js` (e.g., `psp-v2` → `psp-v3`)
2. Redeploy
3. Users will get new SW on next visit (skipWaiting + clients.claim)

### Custom domain SSL issues on Cloudflare

1. Cloudflare Dashboard → Workers & Pages → powerscraperpro → Custom domains
2. Check SSL certificate status (should be "Active")
3. If stuck, remove and re-add the custom domain

---

## Quick Reference: All IP Addresses

### Current (Cloudflare Pages)

| Purpose | IPs |
|---------|-----|
| www.powerscraperpro.com (Cloudflare) | `172.66.47.87`, `172.66.44.169` |
| powerscraperpro.com forwarding (GoDaddy/AWS) | `3.33.251.168`, `15.197.225.128` |

### GitHub Pages (if reverting)

| Type | IPs |
|------|-----|
| A records (IPv4) | `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153` |
| AAAA records (IPv6) | `2606:50c0:8000::153`, `2606:50c0:8001::153`, `2606:50c0:8002::153`, `2606:50c0:8003::153` |
| CNAME for www | `jchezik.github.io` |

### Deprecated GitHub Pages IPs (do NOT use)

| IPs | Status |
|-----|--------|
| `192.30.252.153`, `192.30.252.154` | Deprecated/removed |

---

## Quick Reference: Key Commands

```bash
# Deploy to Cloudflare Pages
cd "/Users/john/Desktop/Power Scraper Pro WebSite"
npx wrangler pages deploy . --project-name=powerscraperpro

# Push to GitHub
git add -A && git commit -m "message" && git push origin main

# Verify site is live
curl -sI https://www.powerscraperpro.com | head -5

# Check DNS
dig www.powerscraperpro.com +short
dig powerscraperpro.com +short

# Check which server is responding
curl -sI https://www.powerscraperpro.com | grep server

# List Cloudflare Pages deployments
npx wrangler pages deployment list --project-name=powerscraperpro
```

---

## Account Information

| Service | Account |
|---------|---------|
| GitHub | jchezik |
| GitHub Repo | jchezik/powerscraperpro.com |
| GoDaddy | (manage at dcc.godaddy.com) |
| Cloudflare | (manage at dash.cloudflare.com) |
| Cloudflare Project | powerscraperpro |
