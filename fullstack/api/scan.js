const TYPES = [
  { name: 'A', code: 1 }, { name: 'AAAA', code: 28 }, { name: 'MX', code: 15 },
  { name: 'NS', code: 2 }, { name: 'TXT', code: 16 }, { name: 'CNAME', code: 5 },
  { name: 'CAA', code: 257 }, { name: 'SOA', code: 6 },
];
const TYPE_NAMES = { 1:'A', 2:'NS', 5:'CNAME', 6:'SOA', 15:'MX', 16:'TXT', 28:'AAAA', 33:'SRV', 43:'DS', 46:'RRSIG', 47:'NSEC', 48:'DNSKEY', 257:'CAA' };
const RESOLVERS = [
  { id: 'google', name: 'Google Public DNS', short: 'Google', url: 'https://dns.google/resolve' },
  { id: 'cloudflare', name: 'Cloudflare DNS', short: 'Cloudflare', url: 'https://cloudflare-dns.com/dns-query' },
];
function normalizeDomain(value) {
  if (typeof value !== 'string' || !value.trim()) return null;
  let parsed;
  try {
    const raw = value.trim();
    parsed = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(raw) ? raw : 'https://' + raw);
  } catch (_) { return null; }
  if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password) return null;
  const domain = parsed.hostname.toLowerCase().replace(/\.$/, '');
  if (domain.length < 3 || domain.length > 253 || !domain.includes('.') || /^\d+(\.\d+){3}$/.test(domain)) return null;
  const labels = domain.split('.');
  if (!labels.every(label => label.length > 0 && label.length <= 63 && /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(label))) return null;
  if (!/^[a-z]{2,63}$/.test(labels.at(-1))) return null;
  return domain;
}
async function queryResolver(resolver, domain, type) {
  const url = new URL(resolver.url);
  url.searchParams.set('name', domain); url.searchParams.set('type', String(type.code));
  url.searchParams.set('do', '1'); url.searchParams.set('cd', '0');
  const started = Date.now();
  const response = await fetch(url, { headers: { accept: 'application/dns-json' }, signal: AbortSignal.timeout(8000), cache: 'no-store' });
  if (!response.ok) throw new Error('Resolver HTTP ' + response.status);
  const data = await response.json();
  if (typeof data.Status !== 'number') throw new Error('Unexpected DNS response');
  const map = rows => (Array.isArray(rows) ? rows : []).map(a => ({ type: TYPE_NAMES[a.type] || String(a.type), ttl: Number(a.TTL) || 0, data: String(a.data ?? '') }));
  return { ok: true, httpStatus: response.status, status: data.Status,
    statusText: ({0:'NOERROR',1:'FORMERR',2:'SERVFAIL',3:'NXDOMAIN',4:'NOTIMP',5:'REFUSED'})[data.Status] || 'DNS status ' + data.Status,
    answers: map(data.Answer), authority: map(data.Authority), ad: !!data.AD, cd: !!data.CD,
    elapsed: Date.now() - started, resolver: resolver.short, queryType: type.code };
}
module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({ error: 'Use POST for DNS scans.' }); }
  const domain = normalizeDomain(req.body?.domain);
  if (!domain) return res.status(400).json({ error: 'Enter a valid website URL or domain name, for example https://example.com.' });
  try {
    const pairs = await Promise.all(RESOLVERS.flatMap(r => TYPES.map(async t => {
      const key = r.id + '|' + t.name;
      try { return [key, await queryResolver(r, domain, t)]; }
      catch (error) { return [key, { ok: false, error: error.name === 'TimeoutError' || error.name === 'AbortError' ? 'Request timed out' : error.message, resolver: r.short, queryType: t.code }]; }
    })));
    const results = Object.fromEntries(pairs);
    const allResolversConfirmNxDomain = RESOLVERS.every(r =>
      ['A', 'AAAA'].every(type => results[r.id + '|' + type]?.ok && results[r.id + '|' + type].status === 3)
    );
    if (allResolversConfirmNxDomain) {
      return res.status(422).json({
        code: 'DOMAIN_NOT_FOUND',
        error: 'Both public DNS resolvers report that this domain does not exist (NXDOMAIN). The website address may be misspelled or unregistered.'
      });
    }
    return res.status(200).json({ domain, scannedAt: new Date().toISOString(), engine: 'DNSGuard server-side DNS-over-HTTPS API', results });
  } catch (_) { return res.status(502).json({ error: 'DNS scan service could not complete the request.' }); }
};
