// lib/github/getBranches.ts
import { cache } from "react";

let cachedBranches: { branches: string[]; timestamp: number } | null = null;
const TTL = 1000 * 60 * 60; // 1 hour

export async function getKubeSchemaBranches(): Promise<string[]> {
  const now = Date.now();
  if (cachedBranches && now - cachedBranches.timestamp < TTL) {
    return cachedBranches.branches.filter(branch => branch);
  }

  const allBranches: string[] = [];
  let page = 1;

  while (true) {
    const res = await fetch(
      `https://api.github.com/repos/kubenote/kubernetes-schema/branches?per_page=100&page=${page}`,
      {
        headers: {
          Accept: "application/vnd.github+json",
          // Optionally include token to raise rate limit
          // Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
        },
        next: { revalidate: 3600 }, // for Next.js cache semantics (optional)
      }
    );

    if (!res.ok) break;

    const data = await res.json();
    if (!Array.isArray(data)) break;

    allBranches.push(...data.map((b: any) => b.name));
    if (data.length < 100) break;

    page++;
  }

  cachedBranches = {
    branches: allBranches,
    timestamp: now,
  };

  return allBranches;
}
