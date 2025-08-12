'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertTriangle, Trash2 } from 'lucide-react';
import { ProjectDataService } from '@/services/project.data.service';
import { useDemoMode } from '@/contexts/DemoModeContext';
import { useRouter } from 'next/navigation';

interface DeleteVersionDialogProps {
  projectId: string;
  versionId: string;
  versionName: string; // "Version created on [date]" or similar
  currentVersionId?: string;
  onDeleted?: (newLatestVersion?: { id: string; slug?: string | null; createdAt: string } | null) => void;
  trigger?: React.ReactNode;
}

export function DeleteVersionDialog({ 
  projectId, 
  versionId, 
  versionName, 
  currentVersionId, 
  onDeleted, 
  trigger 
}: DeleteVersionDialogProps) {
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { isDemoMode } = useDemoMode();
  const router = useRouter();

  const handleDelete = async () => {
    // Block delete in demo mode
    if (isDemoMode) {
      setError('Delete operations are disabled in demo mode');
      return;
    }

    try {
      setDeleting(true);
      setError(null);
      
      const result = await ProjectDataService.deleteVersion(projectId, versionId);
      
      setOpen(false);
      
      // If we're deleting the currently open version, navigate to the project root (latest version)
      if (currentVersionId === versionId) {
        if (result.newLatestVersion) {
          // Navigate to the project root which will show the latest version
          // We need the project slug, not ID, so let's just reload the page
          // The parent component will handle the navigation properly
          window.location.reload();
        } else {
          // No versions left, go to home
          router.push('/');
        }
      }
      
      if (onDeleted) {
        onDeleted(result.newLatestVersion);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete version';
      setError(errorMessage);
    } finally {
      setDeleting(false);
    }
  };

  const defaultTrigger = (
    <Button
      variant="ghost"
      size="sm"
      disabled={isDemoMode}
      className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
      title={isDemoMode ? "Delete is disabled in demo mode" : `Delete ${versionName}`}
    >
      <Trash2 className="h-4 w-4" />
    </Button>
  );

  return (
    <Dialog open={open} onOpenChange={(newOpen) => {
      setOpen(newOpen);
      if (!newOpen) {
        setError(null);
      }
    }}>
      <DialogTrigger asChild>
        {trigger || defaultTrigger}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            <span>Delete Version</span>
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete <strong>{versionName}</strong>? This action cannot be undone.
          </p>
          <p className="text-xs text-muted-foreground">
            All data associated with this version will be permanently deleted.
          </p>
          
          {currentVersionId === versionId && (
            <div className="p-3 rounded-md bg-orange-50 border border-orange-200">
              <p className="text-sm text-orange-700">
                <strong>Note:</strong> You are currently viewing this version. After deletion, you'll be redirected to the latest remaining version.
              </p>
            </div>
          )}
          
          {error && (
            <div className="p-3 rounded-md bg-red-50 border border-red-200">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}
          
          <div className="flex space-x-2 justify-end">
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? 'Deleting...' : 'Delete Version'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}