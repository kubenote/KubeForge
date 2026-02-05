import useSWR from 'swr';
import { fetcher } from '@/lib/swr';
import { projectUrls } from '@/lib/apiUrls';

interface ProjectData {
  id: string;
  name: string;
  slug: string;
  nodes: any[];
  edges: any[];
  createdAt: string;
  updatedAt: string;
  currentVersionId?: string;
}

export function useProject(projectId: string | null | undefined) {
  const { data, error, isLoading, mutate } = useSWR<ProjectData>(
    projectId ? projectUrls.get(projectId) : null,
    fetcher
  );

  return {
    data: data ?? null,
    isLoading,
    error: error ? String(error) : null,
    mutate,
  };
}
