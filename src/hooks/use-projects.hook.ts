import useSWR from 'swr';
import { fetcher } from '@/lib/swr';
import { projectUrls } from '@/lib/apiUrls';

export function useProjects() {
  const { data, error, isLoading, mutate } = useSWR<any[]>(
    projectUrls.list(),
    fetcher,
    { dedupingInterval: 5000 }
  );

  return {
    data: data ?? null,
    loading: isLoading,
    error: error ? String(error) : null,
    refetch: (_force?: boolean) => mutate(),
  };
}
