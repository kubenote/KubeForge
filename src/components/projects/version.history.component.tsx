'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { History, RotateCcw, ExternalLink } from 'lucide-react';
import { Node, Edge } from '@xyflow/react';
import { getVersionUrlId } from '@/lib/versionUtils';
import { ProjectDataService } from '@/services/project.data.service';
import { DeleteVersionDialog } from './delete-version-dialog';
import { VersionDiffDialog } from '@/components/dialog/dialog.version-diff.component';

interface ProjectVersion {
  id: string;
  slug?: string | null;
  createdAt: string;
  message: string | null;
  nodes: string;
  edges: string;
}

interface VersionHistoryProps {
  projectId: string;
  projectName: string;
  onLoadVersion: (nodes: Node[], edges: Edge[], versionId?: string | null, versionData?: { id: string; slug?: string | null }) => void;
  externalOpen?: boolean;
  onExternalOpenChange?: (open: boolean) => void;
  currentVersionId?: string;
}

export function VersionHistory({ projectId, projectName, onLoadVersion, externalOpen, onExternalOpenChange, currentVersionId }: VersionHistoryProps) {
  const [versions, setVersions] = useState<ProjectVersion[]>([]);
  const [loading, setLoading] = useState(false);
  const [internalDialogOpen, setInternalDialogOpen] = useState(false);
  const [totalVersions, setTotalVersions] = useState(0);
  
  // Use external control if provided, otherwise use internal state
  const dialogOpen = externalOpen !== undefined ? externalOpen : internalDialogOpen;
  const setDialogOpen = onExternalOpenChange || setInternalDialogOpen;

  useEffect(() => {
    if (dialogOpen && projectId) {
      fetchVersions();
    }
  }, [dialogOpen, projectId]);

  const fetchVersions = async () => {
    setLoading(true);
    try {
      const data = await ProjectDataService.getProjectVersions(projectId, 20);
      setVersions(data.versions.map(v => ({
        ...v,
        nodes: JSON.stringify(v.nodes),
        edges: JSON.stringify(v.edges)
      })));
      setTotalVersions(data.totalVersions);
    } catch (error) {
      console.error('Failed to fetch versions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLoadVersion = async (version: ProjectVersion) => {
    setLoading(true);
    try {
      const versionData = await ProjectDataService.loadProjectVersion(projectId, version.id);
      onLoadVersion(versionData.nodes, versionData.edges, version.id, { id: version.id, slug: version.slug });
      setDialogOpen(false);
    } catch (error) {
      console.error('Failed to load version:', error);
      alert('Failed to load version');
    } finally {
      setLoading(false);
    }
  };

  const loadLatestVersion = async () => {
    setLoading(true);
    try {
      const project = await ProjectDataService.loadProject(projectId);
      onLoadVersion(project.nodes || [], project.edges || [], null); // Explicitly pass null to clear version
      setDialogOpen(false);
    } catch (error) {
      console.error('Failed to load latest version:', error);
      alert('Failed to load latest version');
    } finally {
      setLoading(false);
    }
  };

  const handleVersionDeleted = async (newLatestVersion?: { id: string; slug?: string | null; createdAt: string } | null) => {
    // Refresh the versions list
    await fetchVersions();
    
    // If there's a new latest version and we were viewing the deleted version, 
    // the navigation will be handled by the DeleteVersionDialog component
    // We just need to refresh the versions list here
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString(),
      time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
  };

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <History className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Version History - {projectName}</DialogTitle>
          <p className="text-sm text-muted-foreground">
            {totalVersions} version{totalVersions !== 1 ? 's' : ''} total
          </p>
        </DialogHeader>
        
        <div className="mb-4 flex gap-2">
          <Button
            onClick={loadLatestVersion}
            disabled={loading}
            className="flex-1"
            variant="default"
          >
            Load Latest Version
          </Button>
          <VersionDiffDialog
            projectId={projectId}
            projectName={projectName}
            versions={versions.map((v) => ({
              id: v.id,
              slug: v.slug,
              createdAt: v.createdAt,
              message: v.message,
            }))}
          />
        </div>

        <ScrollArea className="max-h-[60vh]">
          <div className="space-y-3">
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">
                Loading versions...
              </div>
            ) : versions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No versions found
              </div>
            ) : (
              versions.map((version, index) => {
                const { date, time } = formatDate(version.createdAt);
                return (
                  <Card key={version.id} className="hover:bg-muted/50">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <CardTitle className="text-sm">
                            Version {versions.length - index}
                          </CardTitle>
                          {index === 0 && (
                            <Badge variant="secondary" className="text-xs">
                              Latest
                            </Badge>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {date} • {time}
                        </div>
                      </div>
                      {version.message && (
                        <CardDescription className="text-sm">
                          {version.message}
                        </CardDescription>
                      )}
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleLoadVersion(version)}
                          disabled={loading}
                          className="flex-1"
                        >
                          <RotateCcw className="w-4 h-4 mr-1" />
                          {loading ? 'Loading...' : 'Load Version'}
                        </Button>
                        <DeleteVersionDialog
                          projectId={projectId}
                          versionId={version.id}
                          versionName={`Version ${versions.length - index} (${formatDate(version.createdAt).date})`}
                          currentVersionId={currentVersionId}
                          onDeleted={handleVersionDeleted}
                        />
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}