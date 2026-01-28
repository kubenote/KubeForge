'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, FolderOpen, Calendar, Clock, GitBranch, Layers, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { YamlProjectImport } from './yaml.import.project.component';
import { DeleteProjectDialog } from './delete-project-dialog';
import { ThemeToggle } from '@/components/ui/theme-toggle';

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

  const getRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return formatDate(dateString);
  };

  const createNewProject = () => {
    router.push('/new');
  };

  const handleProjectCreated = () => {
    fetchProjects();
  };

  const recentProjects = projects.slice(0, 3);
  const allProjects = projects;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="h-6 w-6 text-primary" />
            <span className="font-bold text-xl">KubeForge</span>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Hero Section */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold tracking-tight mb-3">
            Welcome to KubeForge
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl">
            Build, visualize, and manage your Kubernetes configurations with an intuitive visual editor.
          </p>
        </div>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-2 gap-6 mb-12">
          {/* Create New Project Card */}
          <Card className="border-2 border-dashed border-primary/20 hover:border-primary/40 transition-colors group cursor-pointer" onClick={createNewProject}>
            <CardContent className="p-8 flex flex-col items-center justify-center text-center min-h-[200px]">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                <Plus className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Create New Project</h3>
              <p className="text-muted-foreground text-sm mb-4">
                Start fresh with a blank canvas for your Kubernetes resources
              </p>
              <Button className="group-hover:translate-x-1 transition-transform">
                Get Started
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </CardContent>
          </Card>

          {/* Import from YAML Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Import from YAML</CardTitle>
              <CardDescription>
                Import existing Kubernetes manifests to visualize and edit
              </CardDescription>
            </CardHeader>
            <CardContent>
              <YamlProjectImport onProjectCreated={handleProjectCreated} />
            </CardContent>
          </Card>
        </div>

        {/* Projects Section */}
        {loading ? (
          <Card>
            <CardContent className="py-16">
              <div className="flex flex-col items-center justify-center">
                <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mb-4"></div>
                <p className="text-muted-foreground">Loading projects...</p>
              </div>
            </CardContent>
          </Card>
        ) : projects.length === 0 ? (
          <Card>
            <CardContent className="py-16">
              <div className="flex flex-col items-center justify-center text-center">
                <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-6">
                  <FolderOpen className="w-10 h-10 text-muted-foreground" />
                </div>
                <h3 className="text-xl font-semibold mb-2">No projects yet</h3>
                <p className="text-muted-foreground mb-6 max-w-md">
                  Create your first project to start building Kubernetes configurations visually
                </p>
                <Button onClick={createNewProject} size="lg">
                  <Plus className="w-5 h-5 mr-2" />
                  Create Your First Project
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-8">
            {/* Recent Projects */}
            {recentProjects.length > 0 && (
              <section>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-semibold">Recent Projects</h2>
                  {projects.length > 3 && (
                    <Button variant="ghost" size="sm" asChild>
                      <a href="#all-projects">
                        View all ({projects.length})
                        <ArrowRight className="w-4 h-4 ml-1" />
                      </a>
                    </Button>
                  )}
                </div>
                <div className="grid md:grid-cols-3 gap-4">
                  {recentProjects.map((project) => (
                    <Link key={project.id} href={`/project/${project.slug}`}>
                      <Card className="h-full hover:shadow-lg hover:border-primary/20 transition-all cursor-pointer group">
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between gap-2">
                            <CardTitle className="text-base truncate group-hover:text-primary transition-colors">
                              {project.name}
                            </CardTitle>
                            <Badge variant="secondary" className="shrink-0">
                              <GitBranch className="w-3 h-3 mr-1" />
                              {project._count.versions}
                            </Badge>
                          </div>
                          <CardDescription className="text-xs">
                            /{project.slug}
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="pt-0">
                          <div className="flex items-center text-xs text-muted-foreground">
                            <Clock className="w-3 h-3 mr-1" />
                            {getRelativeTime(project.updatedAt)}
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* All Projects */}
            <section id="all-projects">
              <h2 className="text-2xl font-semibold mb-4">All Projects</h2>
              <Card>
                <div className="divide-y">
                  {allProjects.map((project) => (
                    <div
                      key={project.id}
                      className="p-4 flex items-center justify-between hover:bg-muted/50 transition-colors"
                    >
                      <Link href={`/project/${project.slug}`} className="flex-1 min-w-0">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                            <FolderOpen className="w-5 h-5 text-primary" />
                          </div>
                          <div className="min-w-0">
                            <h3 className="font-medium truncate hover:text-primary transition-colors">
                              {project.name}
                            </h3>
                            <div className="flex items-center gap-3 text-sm text-muted-foreground">
                              <span className="truncate">/{project.slug}</span>
                              <span className="flex items-center shrink-0">
                                <GitBranch className="w-3 h-3 mr-1" />
                                {project._count.versions} version{project._count.versions !== 1 ? 's' : ''}
                              </span>
                            </div>
                          </div>
                        </div>
                      </Link>
                      <div className="flex items-center gap-3 ml-4">
                        <div className="text-sm text-muted-foreground hidden sm:flex items-center">
                          <Calendar className="w-4 h-4 mr-1" />
                          {formatDate(project.updatedAt)}
                        </div>
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="sm" asChild>
                            <Link href={`/project/${project.slug}`}>
                              Open
                            </Link>
                          </Button>
                          <DeleteProjectDialog
                            projectId={project.id}
                            projectName={project.name}
                            onDeleted={fetchProjects}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </section>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t mt-16">
        <div className="container mx-auto px-4 py-6 text-center text-sm text-muted-foreground">
          KubeForge - Visual Kubernetes Configuration Builder
        </div>
      </footer>
    </div>
  );
}
