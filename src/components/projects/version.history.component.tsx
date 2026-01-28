'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
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
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { History, RotateCcw, Search, SlidersHorizontal, Save } from 'lucide-react';
import { Node, Edge } from '@xyflow/react';
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

type ColumnKey = 'version' | 'date' | 'time' | 'message' | 'actions';

interface ColumnConfig {
  key: ColumnKey;
  label: string;
  defaultVisible: boolean;
}

const COLUMNS: ColumnConfig[] = [
  { key: 'version', label: 'Version', defaultVisible: true },
  { key: 'date', label: 'Date', defaultVisible: true },
  { key: 'time', label: 'Time', defaultVisible: true },
  { key: 'message', label: 'Message', defaultVisible: true },
  { key: 'actions', label: 'Actions', defaultVisible: true },
];

export function VersionHistory({ projectId, projectName, onLoadVersion, externalOpen, onExternalOpenChange, currentVersionId }: VersionHistoryProps) {
  const [versions, setVersions] = useState<ProjectVersion[]>([]);
  const [loading, setLoading] = useState(false);
  const [internalDialogOpen, setInternalDialogOpen] = useState(false);
  const [totalVersions, setTotalVersions] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAutoSave, setShowAutoSave] = useState(true);
  const [visibleColumns, setVisibleColumns] = useState<Set<ColumnKey>>(
    new Set(COLUMNS.filter(c => c.defaultVisible).map(c => c.key))
  );

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
      const data = await ProjectDataService.getProjectVersions(projectId, 50);
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
      onLoadVersion(project.nodes || [], project.edges || [], null);
      setDialogOpen(false);
    } catch (error) {
      console.error('Failed to load latest version:', error);
      alert('Failed to load latest version');
    } finally {
      setLoading(false);
    }
  };

  const handleVersionDeleted = async () => {
    await fetchVersions();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString(),
      time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
  };

  const isAutoSave = (message: string | null): boolean => {
    return message?.toLowerCase().includes('auto-save') ||
           message?.toLowerCase().includes('autosave') ||
           false;
  };

  const filteredVersions = useMemo(() => {
    return versions.filter((version) => {
      // Filter by auto-save
      if (!showAutoSave && isAutoSave(version.message)) {
        return false;
      }

      // Filter by search query
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const { date, time } = formatDate(version.createdAt);
        const searchableText = [
          version.message || '',
          date,
          time,
          version.slug || '',
        ].join(' ').toLowerCase();

        if (!searchableText.includes(query)) {
          return false;
        }
      }

      return true;
    });
  }, [versions, showAutoSave, searchQuery]);

  const toggleColumn = (columnKey: ColumnKey) => {
    setVisibleColumns(prev => {
      const newSet = new Set(prev);
      if (newSet.has(columnKey)) {
        newSet.delete(columnKey);
      } else {
        newSet.add(columnKey);
      }
      return newSet;
    });
  };

  const autoSaveCount = useMemo(() => {
    return versions.filter(v => isAutoSave(v.message)).length;
  }, [versions]);

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <History className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle>Version History - {projectName}</DialogTitle>
          <p className="text-sm text-muted-foreground">
            {totalVersions} version{totalVersions !== 1 ? 's' : ''} total
            {autoSaveCount > 0 && ` (${autoSaveCount} auto-saves)`}
          </p>
        </DialogHeader>

        {/* Controls Row */}
        <div className="flex items-center gap-3 pb-2">
          <Button
            onClick={loadLatestVersion}
            disabled={loading}
            variant="default"
            size="sm"
          >
            Load Latest
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

          {/* Search */}
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search versions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-9"
            />
          </div>

          {/* Auto-save filter */}
          <div className="flex items-center gap-2">
            <Checkbox
              id="show-autosave"
              checked={showAutoSave}
              onCheckedChange={(checked) => setShowAutoSave(checked === true)}
            />
            <label
              htmlFor="show-autosave"
              className="text-sm cursor-pointer select-none"
            >
              Show auto-saves
            </label>
          </div>

          {/* Column visibility dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="ml-auto">
                <SlidersHorizontal className="h-4 w-4 mr-1" />
                Columns
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {COLUMNS.map((column) => (
                <DropdownMenuCheckboxItem
                  key={column.key}
                  checked={visibleColumns.has(column.key)}
                  onCheckedChange={() => toggleColumn(column.key)}
                >
                  {column.label}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Table */}
        <ScrollArea className="max-h-[55vh] border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                {visibleColumns.has('version') && (
                  <TableHead className="w-[120px]">Version</TableHead>
                )}
                {visibleColumns.has('date') && (
                  <TableHead className="w-[100px]">Date</TableHead>
                )}
                {visibleColumns.has('time') && (
                  <TableHead className="w-[80px]">Time</TableHead>
                )}
                {visibleColumns.has('message') && (
                  <TableHead>Message</TableHead>
                )}
                {visibleColumns.has('actions') && (
                  <TableHead className="w-[180px] text-right">Actions</TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={visibleColumns.size} className="text-center py-8 text-muted-foreground">
                    Loading versions...
                  </TableCell>
                </TableRow>
              ) : filteredVersions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={visibleColumns.size} className="text-center py-8 text-muted-foreground">
                    {versions.length === 0 ? 'No versions found' : 'No versions match your filters'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredVersions.map((version, index) => {
                  const { date, time } = formatDate(version.createdAt);
                  const versionNumber = versions.length - versions.indexOf(version);
                  const isLatest = versions.indexOf(version) === 0;
                  const isAuto = isAutoSave(version.message);

                  return (
                    <TableRow
                      key={version.id}
                      className={isAuto ? 'bg-muted/30' : ''}
                    >
                      {visibleColumns.has('version') && (
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">v{versionNumber}</span>
                            {isLatest && (
                              <Badge variant="secondary" className="text-xs">
                                Latest
                              </Badge>
                            )}
                            {isAuto && (
                              <span title="Auto-save">
                                <Save className="h-3 w-3 text-muted-foreground" />
                              </span>
                            )}
                          </div>
                        </TableCell>
                      )}
                      {visibleColumns.has('date') && (
                        <TableCell className="text-muted-foreground">
                          {date}
                        </TableCell>
                      )}
                      {visibleColumns.has('time') && (
                        <TableCell className="text-muted-foreground">
                          {time}
                        </TableCell>
                      )}
                      {visibleColumns.has('message') && (
                        <TableCell>
                          <span className="text-sm truncate max-w-[300px] block">
                            {version.message || '-'}
                          </span>
                        </TableCell>
                      )}
                      {visibleColumns.has('actions') && (
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleLoadVersion(version)}
                              disabled={loading}
                              title="Load this version"
                            >
                              <RotateCcw className="w-4 h-4" />
                            </Button>
                            <DeleteVersionDialog
                              projectId={projectId}
                              versionId={version.id}
                              versionName={`Version ${versionNumber} (${date})`}
                              currentVersionId={currentVersionId}
                              onDeleted={handleVersionDeleted}
                            />
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </ScrollArea>

        {/* Footer with count */}
        <div className="text-xs text-muted-foreground pt-2">
          Showing {filteredVersions.length} of {versions.length} versions
        </div>
      </DialogContent>
    </Dialog>
  );
}
