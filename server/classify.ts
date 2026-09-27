/**
 * Turning a raw request into report-friendly fields: the kind of page, where the reader came from,
 * the device, and what sort of network they're on. All heuristics, kept in one place so a wrong
 * call is fixed once.
 */

export function pageKind(path: string): { kind: string; article: string | null } {
  const seg = path.split('/').filter(Boolean);
  if (!seg.length) return { kind: 'home', article: null };
  if (seg[0] === 'wire') return { kind: 'wire', article: seg[1] ?? null };
  if (['analytics', 'videos', 'about', 'privacy'].includes(seg[0])) return { kind: seg[0], article: null };
  return { kind: 'other', article: null };
}

// Referrer host → source. Order matters: AI assistants before google.* (gemini.google.com).
const SOURCES: Array<[RegExp, string]> = [
  [/(^|\.)(youtube\.com|youtu\.be)$/, 'youtube'],
  [/(^|\.)(t\.co|x\.com|twitter\.com)$/, 'x'],
  [/(^|\.)substack\.com$/, 'substack'],
  [/(^|\.)(chatgpt\.com|openai\.com|perplexity\.ai|claude\.ai|gemini\.google\.com|copilot\.microsoft\.com)$/, 'ai-assistant'],
  [/(^|\.)google\.[a-z.]+$/, 'google'],
  [/(^|\.)bing\.com$/, 'bing'],
  [/(^|\.)duckduckgo\.com$/, 'duckduckgo'],
  [/(^|\.)(linkedin\.com|lnkd\.in)$/, 'linkedin'],
  [/(^|\.)reddit\.com$/, 'reddit'],
  [/^news\.ycombinator\.com$/, 'hacker-news'],
  [/(^|\.)(facebook\.com|fb\.com|instagram\.com|threads\.net)$/, 'meta'],
];
const UTM_ALIASES: Record<string, string> = {
  yt: 'youtube', youtube: 'youtube', x: 'x', twitter: 'x', substack: 'substack', newsletter: 'substack',
  linkedin: 'linkedin', reddit: 'reddit', google: 'google', hn: 'hacker-news',
};
const OWN = /(^|\.)boardroomwire\.com$|\.boardroom-wire\.pages\.dev$|^localhost$|^127\.0\.0\.1$/;

export function source(refHost: string, pageHost: string, utmSource: string | null): string {
  if (utmSource) {
    const u = utmSource.toLowerCase();
    return UTM_ALIASES[u] ?? (SOURCES.find(([re]) => re.test(u))?.[1] ?? u.replace(/[^a-z0-9._-]/g, '').slice(0, 40));
  }
  if (!refHost) return 'direct';
  if (refHost === pageHost.replace(/^www\./, '') || OWN.test(refHost)) return 'internal';
  return SOURCES.find(([re]) => re.test(refHost))?.[1] ?? 'other';
}

export function parseUA(ua: string) {
  const device = /iPad|Tablet|Android(?!.*Mobile)/i.test(ua) ? 'tablet' : /Mobi|iPhone|Android/i.test(ua) ? 'mobile' : 'desktop';
  const browser = /Edg(e|A|iOS)?\//.test(ua) ? 'Edge' : /OPR\/|Opera/.test(ua) ? 'Opera' : /SamsungBrowser/.test(ua) ? 'Samsung Internet'
    : /Firefox\/|FxiOS/.test(ua) ? 'Firefox' : /CriOS|Chrome\//.test(ua) ? 'Chrome' : /Safari\//.test(ua) ? 'Safari' : 'Other';
  const os = /Windows NT/.test(ua) ? 'Windows' : /iPhone|iPad|iPod/.test(ua) ? 'iOS' : /Mac OS X/.test(ua) ? 'macOS'
    : /Android/.test(ua) ? 'Android' : /CrOS/.test(ua) ? 'ChromeOS' : /Linux/.test(ua) ? 'Linux' : 'Other';
  return { device, browser, os };
}

const BOT = /bot\b|bot\/|crawl|spider|slurp|headless|lighthouse|pagespeed|preview|facebookexternalhit|embedly|pinterest|vkshare|w3c_validator|curl\/|wget|python|axios|node-fetch|undici|go-http|java\/|okhttp|scrapy|phantomjs|puppeteer|playwright|selenium|httpclient|feedfetcher|monitor/i;
export const isBot = (ua: string) => !ua || BOT.test(ua);

// Network owner → type. "hosting" is data centres and VPNs (mostly scripts, some privacy-minded
// readers); "isp" is home and mobile internet; everything else is treated as an organisation.
const HOSTING = /amazon|aws|google cloud|google-cloud|microsoft azure|digitalocean|ovh|hetzner|linode|akamai|vultr|choopa|oracle|alibaba|tencent|cloudflare|fastly|leaseweb|m247|datacamp|contabo|scaleway|ionos|hostinger|godaddy|rackspace|equinix|zenlayer|psychz|quadranet|colocrossing|hivelocity|g-core|gcore|stark industries|aeza|datapacket|cdn77|clouvider|nforce|worldstream|serverius|interserver|kamatera|upcloud|netcup|vpn|proxy|private internet access|nordvpn|expressvpn|mullvad|proton|packethub|tzulo|performive|hosting|datacenter|data center|server/i;
const ISP = /comcast|charter|spectrum|verizon|at&t|att-internet|t-mobile|tmobile|sprint|cox commun|frontier|centurylink|lumen|optimum|altice|cablevision|mediacom|windstream|suddenlink|astound|google fiber|starlink|space exploration|viasat|hughes|rogers|bell canada|telus|shaw|videotron|cogeco|british telecom|\bbt\b|virgin media|sky uk|talktalk|vodafone|orange|telekom|telefonica|movistar|\bo2\b|telia|telenor|swisscom|kpn|ziggo|free sas|bouygues|\bsfr\b|iliad|fastweb|wind tre|\bjio\b|reliance|airtel|bharti|bsnl|telstra|optus|\btpg\b|singtel|starhub|pldt|globe telecom|telkom|kddi|\bntt\b|softbank|sk broadband|kt corp|chinanet|china mobile|china unicom|chunghwa|hinet|pccw|claro|telmex|totalplay|megacable|\bmtn\b|safaricom|etisalat|turkcell|rostelecom|kyivstar|liberty global|telecom|broadband|cable|mobile|wireless|cellular|internet service|\bisp\b|communications|networks? inc/i;
export function netType(org: string | null): string | null {
  if (!org) return null;
  if (HOSTING.test(org)) return 'hosting';
  if (ISP.test(org)) return 'isp';
  return 'org';
}
