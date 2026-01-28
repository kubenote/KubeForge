'use client';

import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import yaml from 'js-yaml';
import { FolderArchive, Upload, FileText } from 'lucide-react';
import { nanoid } from 'nanoid';
import { Node, Edge } from '@xyflow/react';
import { useRouter } from 'next/navigation';
import { validateProjectName, slugify } from '@/lib/slugify';
import { useDemoMode } from '@/contexts/DemoModeContext';
import { removeNullFields } from '@/lib/objectUtils';

interface NodeData {
  kind: string;
  apiVersion: string;
  [key: string]: unknown;
}

function importYamlToNodes(yamlDocs: NodeData[]): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = [];
  const edges: Edge[] = [];
  let yOffset = 50;

  yamlDocs.forEach((yamlData, docIndex) => {
    try {
      const kind = yamlData.kind;
      const mainNodeId = nanoid();
      let xOffset = 200 + (docIndex * 400);

      // Build the main node values with #ref- placeholders for complex objects
      const mainNodeValues: Record<string, unknown> = {};
      const refNodes: { id: string; key: string; values: Record<string, unknown> }[] = [];

      let refYOffset = yOffset + 200;

      for (const key of Object.keys(yamlData)) {
        const value = yamlData[key];

        // For complex objects (not arrays), create an ObjectRefNode and use a reference
        if (value && typeof value === 'object' && !Array.isArray(value)) {
          const refId = nanoid();

          // Store #ref- placeholder in main node
          mainNodeValues[key] = `#ref-${refId}`;

          // Queue the ObjectRefNode creation
          refNodes.push({
            id: refId,
            key: key,
            values: value as Record<string, unknown>
          });
        } else {
          // For primitives and arrays, store directly
          mainNodeValues[key] = value;
        }
      }

      // Create main KindNode with references
      nodes.push({
        id: mainNodeId,
        type: 'KindNode',
        position: { x: xOffset, y: yOffset },
        data: {
          type: kind.toLowerCase(),
          kind: kind,
          values: mainNodeValues
        }
      });

      // Create ObjectRefNodes for complex fields
      for (const refNode of refNodes) {
        nodes.push({
          id: refNode.id,
          type: 'ObjectRefNode',
          position: { x: xOffset - 300, y: refYOffset },
          data: {
            kind: kind,
            objectRef: refNode.key,
            values: refNode.values,
          }
        });

        // Create edge from ObjectRefNode to KindNode
        edges.push({
          id: `${refNode.id}-${mainNodeId}`,
          source: refNode.id,
          sourceHandle: `source-${refNode.id}`,
          target: mainNodeId,
          targetHandle: `target-${refNode.key}`
        });

        refYOffset += 300;
      }

      yOffset += Math.max(600, refYOffset - yOffset + 100);
    } catch (err) {
      console.error('Error importing YAML to flow nodes:', err);
    }
  });

  return { nodes, edges };
}

function basicSanitizeYamlTemplates(yaml: string): string {
  return yaml
    .split('\n')
    .map((line) => {
      if (line.includes('{{')) {
        const cleaned = line.replace(/["']+/g, '');
        const idx = cleaned.indexOf('{{');
        return cleaned.slice(0, idx) + '"' + cleaned.slice(idx) + '"';
      }
      return line;
    })
    .join('\n');
}

interface YamlProjectImportProps {
  onProjectCreated?: () => void;
}

export function YamlProjectImport({ onProjectCreated }: YamlProjectImportProps) {
  const { isDemoMode } = useDemoMode();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [parsedYaml, setParsedYaml] = useState<any[]>([]);
  const [projectName, setProjectName] = useState('');
  const [saveMessage, setSaveMessage] = useState('');
  const [nameError, setNameError] = useState('');
  const [loading, setLoading] = useState(false);
  const [importType, setImportType] = useState<'file' | 'folder'>('file');
  const router = useRouter();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const docs: any[] = [];
    let filesLoaded = 0;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        try {
          yaml.loadAll(basicSanitizeYamlTemplates(reader.result as string), (doc) => {
            if (doc) {
              const cleaned = removeNullFields(doc);
              docs.push(cleaned);
            }
          });
        } catch (err) {
          console.warn(`Invalid YAML in ${file.name}:`, err);
        } finally {
          filesLoaded++;
          if (filesLoaded === files.length) {
            setParsedYaml(docs);
            setConfirmDialogOpen(true);
          }
        }
      };

      reader.readAsText(file);
    });
  };

  const handleCreateProject = async () => {
    if (!projectName.trim()) {
      setNameError('Project name is required');
      return;
    }
    
    setLoading(true);
    try {
      setNameError('');
      
      const validatedName = validateProjectName(projectName);
      const slug = slugify(validatedName);
      
      if (!slug) {
        setNameError('Project name must contain at least one alphanumeric character');
        setLoading(false);
        return;
      }

      // Convert YAML to nodes and edges
      const { nodes, edges } = importYamlToNodes(parsedYaml);

      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: validatedName,
          nodes,
          edges,
          message: saveMessage || 'Project created from YAML import',
        }),
      });

      if (response.ok) {
        const savedProject = await response.json();
        setConfirmDialogOpen(false);
        setDialogOpen(false);
        setProjectName('');
        setSaveMessage('');
        setParsedYaml([]);
        
        // Clear file inputs
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        if (folderInputRef.current) {
          folderInputRef.current.value = '';
        }
        
        if (onProjectCreated) {
          onProjectCreated();
        }
        
        // Navigate to the project URL
        router.push(`/project/${savedProject.slug}`);
      } else {
        const error = await response.json();
        setNameError(error.error || 'Failed to create project');
      }
    } catch (error: any) {
      console.error('Failed to create project:', error);
      setNameError(error.message || 'Failed to create project');
    } finally {
      setLoading(false);
    }
  };

  const handleUploadFiles = () => {
    setImportType('file');
    fileInputRef.current?.click();
  };

  const handleUploadFolder = () => {
    setImportType('folder');
    folderInputRef.current?.click();
  };

  const handleCancel = () => {
    setConfirmDialogOpen(false);
    setProjectName('');
    setSaveMessage('');
    setParsedYaml([]);
    setNameError('');
    
    // Clear file inputs
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    if (folderInputRef.current) {
      folderInputRef.current.value = '';
    }
  };

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <Button
          variant="outline"
          onClick={handleUploadFiles}
          disabled={isDemoMode}
          className="h-16 flex flex-col items-center space-y-2"
          title={isDemoMode ? "Upload is disabled in demo mode" : undefined}
        >
          <FileText className="w-6 h-6" />
          <span>Upload YAML Files</span>
        </Button>
        
        <Button
          variant="outline"
          onClick={handleUploadFolder}
          disabled={isDemoMode}
          className="h-16 flex flex-col items-center space-y-2"
          title={isDemoMode ? "Upload is disabled in demo mode" : undefined}
        >
          <FolderArchive className="w-6 h-6" />
          <span>Upload Folder with YAMLs</span>
        </Button>
      </div>

      {/* Input for files */}
      <input
        type="file"
        accept=".yml,.yaml"
        ref={fileInputRef}
        className="hidden"
        onChange={handleFileChange}
        multiple
      />

      {/* Input for folders */}
      <input
        type="file"
        accept=".yml,.yaml"
        ref={folderInputRef}
        className="hidden"
        onChange={handleFileChange}
        webkitdirectory=""
        directory=""
        multiple
      />

      {/* Confirmation Dialog */}
      <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Create Project from YAML Import</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Project Name</label>
              <Input
                placeholder="Enter project name"
                value={projectName}
                onChange={(e) => {
                  setProjectName(e.target.value);
                  if (nameError) setNameError('');
                }}
                className={nameError ? 'border-red-500' : ''}
              />
              {nameError && (
                <p className="text-sm text-red-500 mt-1">{nameError}</p>
              )}
            </div>
            
            <div>
              <label className="text-sm font-medium">Save Message (Optional)</label>
              <Input
                placeholder="Project created from YAML import"
                value={saveMessage}
                onChange={(e) => setSaveMessage(e.target.value)}
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">
                Parsed YAML ({parsedYaml.length} document{parsedYaml.length !== 1 ? 's' : ''})
              </label>
              <Card>
                <CardContent className="p-4">
                  <pre className="text-xs max-h-[300px] overflow-auto bg-muted p-2 rounded">
                    {JSON.stringify(parsedYaml, null, 2)}
                  </pre>
                </CardContent>
              </Card>
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-4">
            <Button 
              variant="outline" 
              onClick={handleCancel}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateProject}
              disabled={loading || !projectName.trim()}
            >
              {loading ? 'Creating...' : 'Create Project'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}