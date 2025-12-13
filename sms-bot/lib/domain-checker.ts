import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// WHOIS servers for different TLDs
const WHOIS_SERVERS: Record<string, string> = {
  com: 'whois.verisign-grs.com',
  net: 'whois.verisign-grs.com',
  org: 'whois.pir.org',
  io: 'whois.nic.io',
  co: 'whois.nic.co',
  ai: 'whois.nic.ai',
  app: 'whois.nic.google',
  dev: 'whois.nic.google',
  xyz: 'whois.nic.xyz',
  me: 'whois.nic.me',
  to: 'whois.tonic.to',
  so: 'whois.nic.so',
};

// Patterns that indicate domain is NOT registered
const AVAILABLE_PATTERNS = [
  /no match/i,
  /not found/i,
  /no data found/i,
  /no entries found/i,
  /domain not found/i,
  /status:\s*free/i,
  /status:\s*available/i,
  /no object found/i,
  /nothing found/i,
];

export interface DomainResult {
  domain: string;
  available: boolean;
  error?: string;
}

/**
 * Check if a single domain is available
 */
export async function checkDomain(domain: string): Promise<DomainResult> {
  const parts = domain.toLowerCase().split('.');
  const tld = parts[parts.length - 1];
  const server = WHOIS_SERVERS[tld];

  if (!server) {
    return { domain, available: false, error: `Unsupported TLD: .${tld}` };
  }

  try {
    const { stdout } = await execAsync(`whois -h ${server} ${domain}`, {
      timeout: 10000,
    });

    const isAvailable = AVAILABLE_PATTERNS.some((pattern) =>
      pattern.test(stdout)
    );

    return { domain, available: isAvailable };
  } catch (error: any) {
    // Some whois servers return exit code 1 for "not found"
    if (error.stdout) {
      const isAvailable = AVAILABLE_PATTERNS.some((pattern) =>
        pattern.test(error.stdout)
      );
      return { domain, available: isAvailable };
    }
    return { domain, available: false, error: error.message };
  }
}

/**
 * Check multiple domains (with rate limiting to avoid getting blocked)
 */
export async function checkDomains(
  domains: string[],
  delayMs = 500
): Promise<DomainResult[]> {
  const results: DomainResult[] = [];

  for (const domain of domains) {
    const result = await checkDomain(domain);
    results.push(result);

    // Rate limit to avoid getting blocked
    if (domains.indexOf(domain) < domains.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  return results;
}

/**
 * Generate domain variations for a brand name and check availability
 */
export async function findAvailableDomains(
  brandName: string,
  tlds = ['com', 'io', 'co', 'ai', 'app', 'dev', 'xyz']
): Promise<DomainResult[]> {
  // Clean up brand name - remove spaces, lowercase
  const clean = brandName.toLowerCase().replace(/[^a-z0-9]/g, '');

  // Generate domains to check
  const domains = tlds.map((tld) => `${clean}.${tld}`);

  return checkDomains(domains);
}

/**
 * Quick check for the most common TLDs only
 */
export async function quickCheck(
  brandName: string
): Promise<{ available: string[]; taken: string[] }> {
  const results = await findAvailableDomains(brandName, ['com', 'io', 'co', 'ai']);

  return {
    available: results.filter((r) => r.available).map((r) => r.domain),
    taken: results.filter((r) => !r.available && !r.error).map((r) => r.domain),
  };
}
