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
function validDomain(value) {
  if (typeof value !== 'string') return false;
  const d = value.trim().toLowerCase().replace(/\.$/, '');
  if (d.length < 3 || d.length > 253 || !d.includes('.') || /^\d+(\.\d+){3}$/.test(d)) return false;
  return d.split('.').every(label => label.length > 0 && label.length <= 63 && /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(label)) && /^[a-z]{2,63}$/.test(d.split('.').at(-1));
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
  const domain = typeof req.body?.domain === 'string' ? req.body.domain.trim().toLowerCase().replace(/\.$/, '') : '';
  if (!validDomain(domain)) return res.status(400).json({ error: 'Enter a valid public domain name.' });
  try {
    const pairs = await Promise.all(RESOLVERS.flatMap(r => TYPES.map(async t => {
      const key = r.id + '|' + t.name;
      try { return [key, await queryResolver(r, domain, t)]; }
      catch (error) { return [key, { ok: false, error: error.name === 'TimeoutError' || error.name === 'AbortError' ? 'Request timed out' : error.message, resolver: r.short, queryType: t.code }]; }
    })));
    return res.status(200).json({ domain, scannedAt: new Date().toISOString(), engine: 'DNSGuard server-side DNS-over-HTTPS API', results: Object.fromEntries(pairs) });
  } catch (_) { return res.status(502).json({ error: 'DNS scan service could not complete the request.' }); }
};