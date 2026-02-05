'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Node, Edge } from '@xyflow/react';
import { ProjectDataService } from '@/services/project.data.service';
import { projectUrls } from '@/lib/apiUrls';

export type AutoSaveStatus = 'idle' | 'pending' | 'saving' | 'saved' | 'error';

interface UseAutoSaveOptions {
    debounceMs?: number;
    projectId: string;
    enabled?: boolean;
    isReadOnly?: boolean;
    getState?: () => { nodes: Node[]; edges: Edge[] };
    getWarningCounts?: () => { warnings: number; errors: number };
}

interface UseAutoSaveReturn {
    status: AutoSaveStatus;
    lastSaved: Date | null;
    error: string | null;
    triggerSave: () => void;
}

const DEFAULT_DEBOUNCE_MS = 2000;
const SAVED_DISPLAY_MS = 2000;
const POLL_INTERVAL_MS = 1000; // Check for changes every 1s

function simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
    }
    return hash;
}

/**
 * Compute a lightweight hash of the state for comparison
 */
function computeStateHash(nodes: Node[], edges: Edge[]): string {
    const nodePart = nodes.map(n => `${n.id}:${n.position.x},${n.position.y}:${JSON.stringify(n.data)}`).join('|');
    const edgePart = edges.map(e => `${e.id}:${e.source}:${e.target}`).join('|');
    return `${nodes.length}-${edges.length}-${simpleHash(nodePart + edgePart)}`;
}

/**
 * Hook for auto-saving project state with debouncing and status tracking
 * Uses a callback to get fresh state, avoiding stale closure issues
 */
export function useAutoSave(
    options: UseAutoSaveOptions
): UseAutoSaveReturn {
    const { debounceMs = DEFAULT_DEBOUNCE_MS, projectId, enabled = true, isReadOnly = false, getState, getWarningCounts } = options;

    const [status, setStatus] = useState<AutoSaveStatus>('idle');
    const [lastSaved, setLastSaved] = useState<Date | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Refs for state tracking
    const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
    const savedDisplayTimerRef = useRef<NodeJS.Timeout | null>(null);
    const pollTimerRef = useRef<NodeJS.Timeout | null>(null);
    const lastSavedHashRef = useRef<string | null>(null);
    const lastCheckedHashRef = useRef<string | null>(null);
    const lastWarningCountsRef = useRef<{ warnings: number; errors: number } | null>(null);
    const pendingPatchRef = useRef<AbortController | null>(null);
    const getStateRef = useRef(getState);
    const getWarningCountsRef = useRef(getWarningCounts);

    // Keep refs up to date
    getStateRef.current = getState;
    getWarningCountsRef.current = getWarningCounts;

    /**
     * Execute the actual save operation
     */
    const executeSave = useCallback(async () => {
        if (!projectId || isReadOnly || !enabled || !getStateRef.current) {
            return;
        }

        // Get fresh state from callback
        const { nodes: rawNodes, edges } = getStateRef.current();
        const currentHash = computeStateHash(rawNodes, edges);

        // Skip if state hasn't changed since last save
        if (currentHash === lastSavedHashRef.current) {
            setStatus('idle');
            return;
        }

        // Strip runtime properties (measured, selected, dragging) before saving
        const nodes = rawNodes.map(({ measured, selected, dragging, ...rest }) => rest) as Node[];

        setStatus('saving');
        setError(null);

        try {
            await ProjectDataService.updateProject(projectId, {
                nodes,
                edges,
                message: 'Auto-saved',
            });

            lastSavedHashRef.current = currentHash;
            lastCheckedHashRef.current = currentHash;
            setLastSaved(new Date());
            setStatus('saved');

            // Update warning/error counts on the project (deduplicated, only if changed)
            if (getWarningCountsRef.current) {
                try {
                    const counts = getWarningCountsRef.current();
                    const lastCounts = lastWarningCountsRef.current;

                    // Skip if counts haven't changed
                    if (lastCounts &&
                        lastCounts.warnings === counts.warnings &&
                        lastCounts.errors === counts.errors) {
                        // Counts unchanged, skip PATCH
                    } else {
                        // Cancel any pending PATCH request
                        if (pendingPatchRef.current) {
                            pendingPatchRef.current.abort();
                        }

                        const controller = new AbortController();
                        pendingPatchRef.current = controller;

                        fetch(projectUrls.get(projectId), {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                warning_count: counts.warnings,
                                error_count: counts.errors,
                            }),
                            signal: controller.signal,
                        }).then(() => {
                            lastWarningCountsRef.current = counts;
                        }).catch(() => {
                            // Ignore abort errors
                        }).finally(() => {
                            if (pendingPatchRef.current === controller) {
                                pendingPatchRef.current = null;
                            }
                        });
                    }
                } catch {
                    // Non-critical, ignore errors
                }
            }

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
        executeSave();
    }, [executeSave]);

    /**
     * Poll for state changes and trigger debounced save
     */
    useEffect(() => {
        // Skip if disabled, read-only, no project, or no getState callback
        if (!enabled || isReadOnly || !projectId || !getState) {
            return;
        }

        const checkForChanges = () => {
            const state = getStateRef.current?.();
            if (!state || state.nodes.length === 0) {
                return;
            }

            const currentHash = computeStateHash(state.nodes, state.edges);

            // Initialize hash on first check
            if (!lastSavedHashRef.current) {
                lastSavedHashRef.current = currentHash;
                lastCheckedHashRef.current = currentHash;
                return;
            }

            // Skip if state hasn't changed since last check
            if (currentHash === lastCheckedHashRef.current) {
                return;
            }

            lastCheckedHashRef.current = currentHash;

            // Set status to pending if different from last save
            if (currentHash !== lastSavedHashRef.current) {
                setStatus('pending');

                // Clear existing debounce timer
                if (debounceTimerRef.current) {
                    clearTimeout(debounceTimerRef.current);
                }

                // Set new debounce timer
                debounceTimerRef.current = setTimeout(() => {
                    executeSave();
                    debounceTimerRef.current = null;
                }, debounceMs);
            }
        };

        // Start polling
        pollTimerRef.current = setInterval(checkForChanges, POLL_INTERVAL_MS);

        return () => {
            if (pollTimerRef.current) {
                clearInterval(pollTimerRef.current);
            }
            if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current);
            }
        };
    }, [projectId, enabled, isReadOnly, debounceMs, executeSave, getState]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current);
            }
            if (savedDisplayTimerRef.current) {
                clearTimeout(savedDisplayTimerRef.current);
            }
            if (pollTimerRef.current) {
                clearInterval(pollTimerRef.current);
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
