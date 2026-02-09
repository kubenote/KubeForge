const GITHUB_API = 'https://api.github.com';
const K8S_REPO = 'kubernetes/kubernetes';

/**
 * Discover available Kubernetes release versions from GitHub tags.
 * Returns sorted version strings (e.g. ["v1.35.0", "v1.34.1", ...]).
 * Only includes stable releases (vX.Y.Z, no alpha/beta/rc).
 */
export async function discoverVersions(
  minMinor = 19
): Promise<string[]> {
  const versions: string[] = [];
  let page = 1;
  const perPage = 100;

  // GitHub returns tags in pages; walk until we've gone past our minimum
  while (true) {
    const url = `${GITHUB_API}/repos/${K8S_REPO}/tags?per_page=${perPage}&page=${page}`;
    const res = await fetch(url, {
      headers: {
        Accept: 'application/vnd.github.v3+json',
        // Use GITHUB_TOKEN if available to avoid rate limits
        ...(process.env.GITHUB_TOKEN
          ? { Authorization: `token ${process.env.GITHUB_TOKEN}` }
          : {}),
      },
    });

    if (!res.ok) {
      throw new Error(
        `GitHub API error: HTTP ${res.status} ${res.statusText}`
      );
    }

    const tags = (await res.json()) as Array<{ name: string }>;
    if (tags.length === 0) break;

    for (const tag of tags) {
      const m = tag.name.match(/^v(\d+)\.(\d+)\.(\d+)$/);
      if (m) {
        const minor = parseInt(m[2], 10);
        if (minor >= minMinor) {
          versions.push(tag.name);
        }
      }
    }

    // Check if we've gone past our minimum (tags are sorted newest-first)
    const lastTag = tags[tags.length - 1].name;
    const lastMatch = lastTag.match(/^v(\d+)\.(\d+)/);
    if (lastMatch && parseInt(lastMatch[2], 10) < minMinor) break;

    page++;
  }

  // Sort descending by semver
  return versions.sort((a, b) => {
    const pa = a.replace('v', '').split('.').map(Number);
    const pb = b.replace('v', '').split('.').map(Number);
    for (let i = 0; i < 3; i++) {
      if (pa[i] !== pb[i]) return pb[i] - pa[i];
    }
    return 0;
  });
}

/**
 * Get the latest stable Kubernetes version from GitHub tags.
 */
export async function getLatestVersion(): Promise<string> {
  const url = `${GITHUB_API}/repos/${K8S_REPO}/tags?per_page=50`;
  const res = await fetch(url, {
    headers: {
      Accept: 'application/vnd.github.v3+json',
      ...(process.env.GITHUB_TOKEN
        ? { Authorization: `token ${process.env.GITHUB_TOKEN}` }
        : {}),
    },
  });

  if (!res.ok) {
    throw new Error(
      `GitHub API error: HTTP ${res.status} ${res.statusText}`
    );
  }

  const tags = (await res.json()) as Array<{ name: string }>;
  for (const tag of tags) {
    if (/^v\d+\.\d+\.\d+$/.test(tag.name)) {
      return tag.name;
    }
  }

  throw new Error('No stable Kubernetes version found');
}
