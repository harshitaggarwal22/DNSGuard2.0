# DNSGuard 2.1

A browser-based DNS inspection and resolver-comparison tool. It queries Google Public DNS and Cloudflare DNS over HTTPS and presents DNS records, resolver differences, response times, and selected domain-security indicators.

## Features

- Live DNS lookups for A, AAAA, MX, NS, TXT, CNAME, CAA, and SOA records
- Google Public DNS and Cloudflare resolver comparison
- Response-time and DNSSEC AD-flag indicators
- SPF, DMARC, CAA, and authoritative nameserver posture checks
- Scan history stored locally in the browser
- PDF, CSV, and JSON exports, plus copyable scan summaries
- Responsive interface with a restrained off-white, charcoal, and green visual theme
- No backend or database required

## Run locally

Open `index.html` in a modern browser. An internet connection is required for live DNS-over-HTTPS requests.

## Deploy

Deploy the repository root as a static site on Vercel or Netlify. No build command is required; the entry point is `index.html`.

## Important limitations

DNSGuard is an educational diagnostic aid, not a forensic DNS-spoofing detector or a full DNSSEC chain-of-trust validator. Different resolver answers can be legitimate due to CDN/geographic routing, caching, or DNS propagation. SPF/DMARC indicators depend on the records queried and should not be treated as a complete email-security audit. A consistency score is not a probability that a domain is safe.

## Privacy

Scan history is stored in the browser's local storage. DNS queries are sent to the public DNS-over-HTTPS resolvers named in the interface.
