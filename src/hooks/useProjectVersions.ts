import useSWR from 'swr';
import { fetcher } from '@/lib/swr';
import { safeJsonParse } from '@/lib/safeJson';
import { projectUrls } from '@/lib/apiUrls';

interface ProjectVersion {
  id: string;
  slug?: string | null;
  projectId: string;
  nodes: any[];
  edges: any[];
  message: string | null;
  createdAt: string;
}

interface ProjectVersionsResponse {
  versions: ProjectVersion[];
  totalVersions: number;
}

interface RawVersionResponse {
  versions: Array<{
    id: string;
    slug?: string | null;
    projectId: string;
    nodes: any[] | string;
    edges: any[] | string;
    message: string | null;
    createdAt: string;
  }>;
  totalVersions: number;
}

export function useProjectVersions(projectId: string | null | undefined, limit = 20) {
  const { data, error, isLoading, mutate } = useSWR<RawVersionResponse>(
    projectId ? projectUrls.versions(projectId) + `?limit=${limit}` : null,
    fetcher
  );

  const parsed: ProjectVersionsResponse | null = data
    ? {
        versions: data.versions.map((v) => ({
          id: v.id,
          slug: v.slug,
          projectId: v.projectId,
          nodes: Array.isArray(v.nodes) ? v.nodes : safeJsonParse<any[]>(v.nodes as string, []),
          edges: Array.isArray(v.edges) ? v.edges : safeJsonParse<any[]>(v.edges as string, []),
          message: v.message,
          createdAt: v.createdAt,
        })),
        totalVersions: data.totalVersions,
      }
    : null;

  return {
    data: parsed,
    isLoading,
    error: error ? String(error) : null,
    mutate,
  };
}
