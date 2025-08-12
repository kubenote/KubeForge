'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';
import { useRouter } from 'next/navigation';

interface ProjectContextType {
  currentProjectId: string;
  currentProjectName: string;
  currentProjectSlug: string;
  setCurrentProject: (id: string, name: string, slug?: string) => void;
  clearCurrentProject: () => void;
  navigateToProject: (slug: string) => void;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export function ProjectProvider({ children }: { children: ReactNode }) {
  const [currentProjectId, setCurrentProjectId] = useState<string>('');
  const [currentProjectName, setCurrentProjectName] = useState<string>('');
  const [currentProjectSlug, setCurrentProjectSlug] = useState<string>('');
  const router = useRouter();

  const setCurrentProject = (id: string, name: string, slug?: string) => {
    setCurrentProjectId(id);
    setCurrentProjectName(name);
    setCurrentProjectSlug(slug || '');
  };

  const clearCurrentProject = () => {
    setCurrentProjectId('');
    setCurrentProjectName('');
    setCurrentProjectSlug('');
    router.push('/');
  };

  const navigateToProject = (slug: string) => {
    router.push(`/project/${slug}`);
  };

  return (
    <ProjectContext.Provider
      value={{
        currentProjectId,
        currentProjectName,
        currentProjectSlug,
        setCurrentProject,
        clearCurrentProject,
        navigateToProject,
      }}
    >
      {children}
    </ProjectContext.Provider>
  );
}

export function useProject() {
  const context = useContext(ProjectContext);
  if (context === undefined) {
    throw new Error('useProject must be used within a ProjectProvider');
  }
  return context;
}