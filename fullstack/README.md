# DNSGuard 3.0 — Full-Stack Edition

A server-backed DNS inspection and resolver-comparison application with instant guest access. No database, passwords, or account registration are required.

## What is full-stack here?

- Frontend: responsive HTML/CSS/JavaScript dashboard.
- Backend: Vercel Node.js serverless endpoint at `POST /api/scan`.
- DNS engine: server-side DNS-over-HTTPS queries to Google Public DNS and Cloudflare.
- Session: one-click guest session stored in browser session storage.
- History: browser-local storage only; no database or permanent cloud account.

## Features

- A, AAAA, MX, NS, TXT, CNAME, CAA and SOA records
- Google / Cloudflare resolver comparison, latency and DNSSEC AD signal
- SPF, DMARC, CAA and nameserver posture indicators
- PDF, CSV and JSON exports, copyable summary, local scan history
- Guest access with one click

## Deploy on Vercel

Import this folder (`fullstack`) as the project root. Vercel detects the Node.js serverless function in `api/scan.js`. No database or environment variables are required.

## Local development

Use Vercel CLI: `vercel dev` from this folder. Opening the HTML file directly will not provide the `/api/scan` backend route.

## Limitations and security notes

This is a full-stack educational diagnostic tool, not a forensic DNS-spoofing detector or complete DNSSEC chain-of-trust validator. Resolver differences can be caused by CDN/geographic routing, caching and propagation. The guest session is not identity authentication. Scan history is stored only in the current browser. Requests are limited to fixed public DNS-over-HTTPS providers; the API does not fetch user-supplied URLs.