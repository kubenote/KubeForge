'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, FolderOpen, Calendar } from 'lucide-react';
import Link from 'next/link';
import { YamlProjectImport } from './yaml.import.project.component';
import { DeleteProjectDialog } from './delete-project-dialog';

interface Project {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
  updatedAt: string;
  versions: Array<{
    id: string;
    createdAt: string;
    message: string | null;
  }>;
  _count: {
    versions: number;
  };
}

export function ProjectSelector() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/projects');
      if (response.ok) {
        const data = await response.json();
        setProjects(data);
      }
    } catch (error) {
      console.error('Failed to fetch projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const createNewProject = () => {
    // Navigate to the new project flow editor
    router.push('/new');
  };

  const handleProjectCreated = () => {
    // Refresh the projects list when a new project is created via YAML import
    fetchProjects();
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            KubeForge Projects
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Select a project to continue or create a new one
          </p>
        </div>

        <div className="space-y-6 mb-8">
          {/* Main Create New Project Button */}
          <Button
            onClick={createNewProject}
            className="w-full h-16 text-lg"
            size="lg"
          >
            <Plus className="w-6 h-6 mr-3" />
            Create New Project
          </Button>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-gray-50 dark:bg-gray-900 px-2 text-muted-foreground">
                Or import from YAML
              </span>
            </div>
          </div>

          {/* YAML Import Options */}
          <YamlProjectImport onProjectCreated={handleProjectCreated} />
        </div>

        {loading ? (
          <Card>
            <CardContent className="text-center py-12">
              <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
              <div className="text-gray-500">Loading projects...</div>
            </CardContent>
          </Card>
        ) : projects.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <FolderOpen className="w-16 h-16 mx-auto text-gray-400 mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                No projects yet
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Get started by creating your first project
              </p>
              <Button onClick={createNewProject}>
                <Plus className="w-4 h-4 mr-2" />
                Create New Project
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Recent Projects ({projects.length})
            </h2>
            <ScrollArea className="max-h-96">
              <div className="grid gap-4">
                {projects.map((project) => (
                  <Card key={project.id} className="hover:shadow-md transition-shadow cursor-pointer">
                    <div className="relative">
                      <Link href={`/project/${project.slug}`}>
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-lg pr-10">
                              {project.name}
                            </CardTitle>
                            <div className="flex items-center text-sm text-gray-500">
                              <Calendar className="w-4 h-4 mr-1" />
                              {formatDate(project.updatedAt)}
                            </div>
                          </div>
                          <CardDescription>
                            {project._count.versions} version{project._count.versions !== 1 ? 's' : ''} •
                            Last updated {formatDate(project.updatedAt)}
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="pt-0">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600 dark:text-gray-400">
                              /{project.slug}
                            </span>
                          </div>
                        </CardContent>
                      </Link>
                      <div className="absolute bottom-0 right-4 flex gap-2 z-10">
                        <Link href={`/project/${project.slug}`}>
                          <Button variant="secondary" size="sm">
                            <FolderOpen className="w-4 h-4 mr-2" />
                            Open
                          </Button>
                        </Link>
                        <DeleteProjectDialog
                          projectId={project.id}
                          projectName={project.name}
                          onDeleted={fetchProjects}
                        />
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}
      </div>
    </div>
  );
}