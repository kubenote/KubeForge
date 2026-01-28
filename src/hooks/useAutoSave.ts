'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Node, Edge } from '@xyflow/react';
import { ProjectDataService } from '@/services/project.data.service';

export type AutoSaveStatus = 'idle' | 'pending' | 'saving' | 'saved' | 'error';

interface UseAutoSaveOptions {
    debounceMs?: number;
    projectId: string;
    enabled?: boolean;
    isReadOnly?: boolean;
}

interface UseAutoSaveReturn {
    status: AutoSaveStatus;
    lastSaved: Date | null;
    error: string | null;
    triggerSave: () => void;
}

const DEFAULT_DEBOUNCE_MS = 2000;
const SAVED_DISPLAY_MS = 2000;

/**
 * Compute a simple hash of the state for comparison
 */
function computeStateHash(nodes: Node[], edges: Edge[]): string {
    return JSON.stringify({ nodes, edges });
}

/**
 * Hook for auto-saving project state with debouncing and status tracking
 */
export function useAutoSave(
    nodes: Node[],
    edges: Edge[],
    options: UseAutoSaveOptions
): UseAutoSaveReturn {
    const { debounceMs = DEFAULT_DEBOUNCE_MS, projectId, enabled = true, isReadOnly = false } = options;

    const [status, setStatus] = useState<AutoSaveStatus>('idle');
    const [lastSaved, setLastSaved] = useState<Date | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Refs for state tracking
    const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
    const savedDisplayTimerRef = useRef<NodeJS.Timeout | null>(null);
    const lastSavedHashRef = useRef<string | null>(null);
    const pendingNodesRef = useRef<Node[]>(nodes);
    const pendingEdgesRef = useRef<Edge[]>(edges);

    /**
     * Execute the actual save operation
     */
    const executeSave = useCallback(async (nodesToSave: Node[], edgesToSave: Edge[]) => {
        if (!projectId || isReadOnly || !enabled) {
            return;
        }

        const currentHash = computeStateHash(nodesToSave, edgesToSave);

        // Skip if state hasn't changed since last save
        if (currentHash === lastSavedHashRef.current) {
            setStatus('idle');
            return;
        }

        setStatus('saving');
        setError(null);

        try {
            await ProjectDataService.updateProject(projectId, {
                nodes: nodesToSave,
                edges: edgesToSave,
                message: 'Auto-saved',
            });

            lastSavedHashRef.current = currentHash;
            setLastSaved(new Date());
            setStatus('saved');

            // Clear any existing saved display timer
            if (savedDisplayTimerRef.current) {
                clearTimeout(savedDisplayTimerRef.current);
            }

            // Show "Saved" status briefly, then return to idle
            savedDisplayTimerRef.current = setTimeout(() => {
                setStatus('idle');
                savedDisplayTimerRef.current = null;
            }, SAVED_DISPLAY_MS);
        } catch (err) {
            console.error('Auto-save failed:', err);
            setError(err instanceof Error ? err.message : 'Auto-save failed');
            setStatus('error');
        }
    }, [projectId, isReadOnly, enabled]);

    /**
     * Manually trigger a save
     */
    const triggerSave = useCallback(() => {
        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
            debounceTimerRef.current = null;
        }
        executeSave(pendingNodesRef.current, pendingEdgesRef.current);
    }, [executeSave]);

    /**
     * Handle state changes with debouncing
     */
    useEffect(() => {
        // Skip if disabled, read-only, or no project
        if (!enabled || isReadOnly || !projectId) {
            return;
        }

        // Update pending refs
        pendingNodesRef.current = nodes;
        pendingEdgesRef.current = edges;

        // Skip if no nodes (likely initial load)
        if (nodes.length === 0) {
            return;
        }

        const currentHash = computeStateHash(nodes, edges);

        // Skip if state hasn't changed
        if (currentHash === lastSavedHashRef.current) {
            return;
        }

        // Set status to pending
        setStatus('pending');

        // Clear existing debounce timer
        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
        }

        // Set new debounce timer
        debounceTimerRef.current = setTimeout(() => {
            executeSave(nodes, edges);
            debounceTimerRef.current = null;
        }, debounceMs);

        return () => {
            if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current);
            }
        };
    }, [nodes, edges, projectId, enabled, isReadOnly, debounceMs, executeSave]);

    // Initialize last saved hash on mount
    useEffect(() => {
        if (nodes.length > 0 && !lastSavedHashRef.current) {
            lastSavedHashRef.current = computeStateHash(nodes, edges);
        }
    }, [nodes, edges]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current);
            }
            if (savedDisplayTimerRef.current) {
                clearTimeout(savedDisplayTimerRef.current);
            }
        };
    }, []);

    return {
        status,
        lastSaved,
        error,
        triggerSave,
    };
}
