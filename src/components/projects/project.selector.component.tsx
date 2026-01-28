'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Plus,
  Upload,
  FolderOpen,
  MoreHorizontal,
  Pencil,
  Trash2,
  ExternalLink,
  Copy,
  Check,
  Link2,
  Eye,
  Clock,
  Layers,
  GitBranch,
  Search,
  X,
  ChevronRight,
} from 'lucide-react';
import Link from 'next/link';
import { YamlProjectImport } from './yaml.import.project.component';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { cn } from '@/lib/utils';

interface Project {
  id: string;
  name: string;
  slug: string;
  kubernetesVersion: string | null;
  createdAt: string;
  updatedAt: string;
  versions: Array<{
    id: string;
    createdAt: string;
    message: string | null;
  }>;
  _count: {
    versions: number;
    hostedYamls: number;
  };
}

interface HostedYaml {
  id: string;
  name: string | null;
  projectId: string | null;
  viewCount: number;
  createdAt: string;
  lastAccessedAt: string | null;
  project: {
    id: string;
    name: string;
    slug: string;
  } | null;
}

type ActiveView = 'projects' | 'hosted';

export function ProjectSelector() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [hostedYamls, setHostedYamls] = useState<HostedYaml[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<ActiveView>('projects');
  const router = useRouter();

  // Rename dialog state
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [projectToRename, setProjectToRename] = useState<Project | null>(null);
  const [newName, setNewName] = useState('');
  const [renameLoading, setRenameLoading] = useState(false);

  // Delete dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Import dialog state
  const [importDialogOpen, setImportDialogOpen] = useState(false);

  useEffect(() => {
    fetchProjects();
    fetchHostedYamls();
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

  const fetchHostedYamls = async () => {
    try {
      const response = await fetch('/api/hosted-yamls');
      if (response.ok) {
        const data = await response.json();
        setHostedYamls(data);
      }
    } catch (error) {
      console.error('Failed to fetch hosted YAMLs:', error);
    }
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
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
    return `${Math.floor(diffDays / 30)}mo ago`;
  };

  const handleRename = async () => {
    if (!projectToRename || !newName.trim()) return;

    setRenameLoading(true);
    try {
      const response = await fetch(`/api/projects/${projectToRename.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim() }),
      });

      if (response.ok) {
        await fetchProjects();
        setRenameDialogOpen(false);
        setProjectToRename(null);
        setNewName('');
      }
    } catch (error) {
      console.error('Failed to rename project:', error);
    } finally {
      setRenameLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!projectToDelete) return;

    setDeleteLoading(true);
    try {
      const response = await fetch(`/api/projects/${projectToDelete.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await fetchProjects();
        setDeleteDialogOpen(false);
        setProjectToDelete(null);
      }
    } catch (error) {
      console.error('Failed to delete project:', error);
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleDeleteHostedYaml = async (id: string) => {
    try {
      const response = await fetch(`/api/hosted-yamls/${id}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        await fetchHostedYamls();
      }
    } catch (error) {
      console.error('Failed to delete hosted YAML:', error);
    }
  };

  const copyToClipboard = useCallback((id: string) => {
    const url = `${window.location.origin}/api/yaml/${id}.yml`;
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }, []);

  const filteredProjects = projects.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.slug.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalViews = hostedYamls.reduce((sum, y) => sum + y.viewCount, 0);
  const totalVersions = projects.reduce((sum, p) => sum + p._count.versions, 0);
  const origin = typeof window !== 'undefined' ? window.location.origin : '';

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left Sidebar */}
      <aside className="w-64 border-r bg-muted/30 flex flex-col">
        {/* Logo */}
        <div className="h-14 border-b flex items-center px-4 gap-2">
          <Layers className="h-5 w-5 text-primary" />
          <span className="font-semibold">KubeForge</span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1">
          <button
            onClick={() => setActiveView('projects')}
            className={cn(
              'w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
              activeView === 'projects'
                ? 'bg-primary text-primary-foreground'
                : 'hover:bg-muted text-muted-foreground hover:text-foreground'
            )}
          >
            <FolderOpen className="h-4 w-4" />
            <span>Projects</span>
            <span className="ml-auto text-xs opacity-70">{projects.length}</span>
          </button>
          <button
            onClick={() => setActiveView('hosted')}
            className={cn(
              'w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
              activeView === 'hosted'
                ? 'bg-primary text-primary-foreground'
                : 'hover:bg-muted text-muted-foreground hover:text-foreground'
            )}
          >
            <Link2 className="h-4 w-4" />
            <span>Hosted URLs</span>
            <span className="ml-auto text-xs opacity-70">{hostedYamls.length}</span>
          </button>
        </nav>

        {/* Stats */}
        <div className="border-t p-4 space-y-3 text-sm">
          <div className="flex justify-between text-muted-foreground">
            <span>Total Versions</span>
            <span className="font-medium text-foreground">{totalVersions}</span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>Total Views</span>
            <span className="font-medium text-foreground">{totalViews}</span>
          </div>
        </div>

        {/* Theme Toggle */}
        <div className="border-t p-3">
          <ThemeToggle />
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col">
        {/* Header */}
        <header className="h-14 border-b flex items-center justify-between px-6">
          <h1 className="text-sm font-medium text-muted-foreground">
            {activeView === 'projects' ? 'Projects' : 'Hosted URLs'}
          </h1>
          <div className="flex items-center gap-2">
            {activeView === 'projects' && (
              <>
                <Button size="sm" variant="outline" onClick={() => setImportDialogOpen(true)}>
                  <Upload className="h-4 w-4 mr-2" />
                  Import
                </Button>
                <Button size="sm" onClick={() => router.push('/new')}>
                  <Plus className="h-4 w-4 mr-2" />
                  New Project
                </Button>
              </>
            )}
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 p-6 overflow-auto">
          {activeView === 'projects' ? (
            <div className="space-y-4">
              {/* Search */}
              <div className="relative max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search projects..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-9 h-9"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* Projects Table */}
              {loading ? (
                <div className="py-12 text-center">
                  <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">Loading...</p>
                </div>
              ) : filteredProjects.length === 0 ? (
                <div className="py-12 text-center">
                  <FolderOpen className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
                  <p className="text-sm text-muted-foreground mb-4">
                    {searchQuery ? 'No projects found' : 'No projects yet'}
                  </p>
                  {!searchQuery && (
                    <Button size="sm" onClick={() => router.push('/new')}>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Project
                    </Button>
                  )}
                </div>
              ) : (
                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="w-[30%]">Name</TableHead>
                        <TableHead>K8s Version</TableHead>
                        <TableHead>Versions</TableHead>
                        <TableHead>URLs</TableHead>
                        <TableHead>Updated</TableHead>
                        <TableHead className="w-[80px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredProjects.map((project) => (
                        <TableRow
                          key={project.id}
                          className="cursor-pointer group"
                          onClick={() => router.push(`/project/${project.slug}`)}
                        >
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center">
                                <FolderOpen className="h-4 w-4 text-primary" />
                              </div>
                              <div>
                                <div className="font-medium group-hover:text-primary transition-colors">
                                  {project.name}
                                </div>
                                <div className="text-xs text-muted-foreground">/{project.slug}</div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            {project.kubernetesVersion ? (
                              <Badge variant="outline" className="font-mono text-xs">
                                {project.kubernetesVersion}
                              </Badge>
                            ) : (
                              <span className="text-sm text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <span className="text-sm">{project._count.versions}</span>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm">
                              {project._count.hostedYamls || '—'}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-muted-foreground">
                              {getRelativeTime(project.updatedAt)}
                            </span>
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    router.push(`/project/${project.slug}`);
                                  }}
                                >
                                  <ExternalLink className="h-4 w-4 mr-2" />
                                  Open
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setProjectToRename(project);
                                    setNewName(project.name);
                                    setRenameDialogOpen(true);
                                  }}
                                >
                                  <Pencil className="h-4 w-4 mr-2" />
                                  Rename
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="text-destructive focus:text-destructive"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setProjectToDelete(project);
                                    setDeleteDialogOpen(true);
                                  }}
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          ) : (
            /* Hosted URLs View */
            <div className="space-y-4">
              {hostedYamls.length === 0 ? (
                <div className="py-12 text-center">
                  <Link2 className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
                  <p className="text-sm text-muted-foreground">
                    No hosted URLs yet. Export a project to generate one.
                  </p>
                </div>
              ) : (
                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="w-[45%]">URL</TableHead>
                        <TableHead>Project</TableHead>
                        <TableHead>Views</TableHead>
                        <TableHead>Last Accessed</TableHead>
                        <TableHead className="w-[120px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {hostedYamls.map((yaml) => (
                        <TableRow key={yaml.id}>
                          <TableCell>
                            <code className="text-xs bg-muted px-2 py-1 rounded font-mono break-all">
                              {origin}/api/yaml/{yaml.id}.yml
                            </code>
                          </TableCell>
                          <TableCell>
                            {yaml.project ? (
                              <Link
                                href={`/project/${yaml.project.slug}`}
                                className="text-sm text-primary hover:underline"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {yaml.project.name}
                              </Link>
                            ) : (
                              <span className="text-sm text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1 text-sm">
                              <Eye className="h-3 w-3 text-muted-foreground" />
                              {yaml.viewCount}
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-muted-foreground">
                              {yaml.lastAccessedAt ? getRelativeTime(yaml.lastAccessedAt) : 'Never'}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => copyToClipboard(yaml.id)}
                                title="Copy URL"
                              >
                                {copiedId === yaml.id ? (
                                  <Check className="h-4 w-4 text-green-500" />
                                ) : (
                                  <Copy className="h-4 w-4" />
                                )}
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => window.open(`/api/yaml/${yaml.id}.yml`, '_blank')}
                                title="Open URL"
                              >
                                <ExternalLink className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                onClick={() => handleDeleteHostedYaml(yaml.id)}
                                title="Delete"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Rename Dialog */}
      <Dialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Project</DialogTitle>
            <DialogDescription>Enter a new name for this project.</DialogDescription>
          </DialogHeader>
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Project name"
            onKeyDown={(e) => e.key === 'Enter' && handleRename()}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleRename} disabled={renameLoading || !newName.trim()}>
              {renameLoading ? 'Renaming...' : 'Rename'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Project</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{projectToDelete?.name}&quot;? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteLoading}>
              {deleteLoading ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import Dialog */}
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Import from YAML</DialogTitle>
            <DialogDescription>
              Import existing Kubernetes manifests to create a new project.
            </DialogDescription>
          </DialogHeader>
          <YamlProjectImport
            onProjectCreated={() => {
              setImportDialogOpen(false);
              fetchProjects();
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
