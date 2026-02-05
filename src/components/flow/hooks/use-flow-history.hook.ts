import { useState, useRef, useCallback, useEffect } from 'react'
import { Node, Edge } from '@xyflow/react'

interface HistoryState {
    nodes: Node[]
    edges: Edge[]
}

interface UseFlowHistoryOptions {
    maxHistory?: number
    debounceMs?: number
}

interface UseFlowHistoryReturn {
    recordHistory: (nodes: Node[], edges: Edge[]) => void
    undo: () => HistoryState | null
    redo: () => HistoryState | null
    canUndo: boolean
    canRedo: boolean
    clearHistory: () => void
    pushToFuture: (nodes: Node[], edges: Edge[]) => void
    pushToHistory: (nodes: Node[], edges: Edge[]) => void
}

const DEFAULT_MAX_HISTORY = 50
const DEFAULT_DEBOUNCE_MS = 300

/**
 * Hook for managing undo/redo history in the flow editor
 * Maintains an in-memory history stack with debounced recording
 */
export const useFlowHistory = (options: UseFlowHistoryOptions = {}): UseFlowHistoryReturn => {
    const { maxHistory = DEFAULT_MAX_HISTORY, debounceMs = DEFAULT_DEBOUNCE_MS } = options

    // History stack - past states
    const [history, setHistory] = useState<HistoryState[]>([])
    // Future stack - for redo
    const [future, setFuture] = useState<HistoryState[]>([])

    // Debounce timer ref
    const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)
    // Pending state ref for debouncing
    const pendingStateRef = useRef<HistoryState | null>(null)
    // Flag to skip recording during undo/redo
    const isUndoRedoRef = useRef(false)

    /**
     * Deep clone state to avoid reference issues
     */
    const cloneState = useCallback((nodes: Node[], edges: Edge[]): HistoryState => {
        return {
            nodes: JSON.parse(JSON.stringify(nodes)),
            edges: JSON.parse(JSON.stringify(edges))
        }
    }, [])

    /**
     * Commit pending state to history
     */
    const commitPendingState = useCallback(() => {
        if (pendingStateRef.current && !isUndoRedoRef.current) {
            const state = pendingStateRef.current
            pendingStateRef.current = null

            setHistory(prev => {
                const newHistory = [...prev, state]
                // Keep history within max limit
                if (newHistory.length > maxHistory) {
                    return newHistory.slice(-maxHistory)
                }
                return newHistory
            })
            // Clear future on new action
            setFuture([])
        }
    }, [maxHistory])

    /**
     * Record current state to history (debounced)
     */
    const recordHistory = useCallback((nodes: Node[], edges: Edge[]) => {
        // Skip recording during undo/redo operations
        if (isUndoRedoRef.current) {
            return
        }

        // Store pending state
        pendingStateRef.current = cloneState(nodes, edges)

        // Clear existing debounce timer
        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current)
        }

        // Set new debounce timer
        debounceTimerRef.current = setTimeout(() => {
            commitPendingState()
            debounceTimerRef.current = null
        }, debounceMs)
    }, [cloneState, commitPendingState, debounceMs])

    /**
     * Undo to previous state
     */
    const undo = useCallback((): HistoryState | null => {
        if (history.length === 0) {
            return null
        }

        isUndoRedoRef.current = true

        // Get the state to restore
        const previousState = history[history.length - 1]

        // Move current state to future (we need current state from caller)
        setHistory(prev => prev.slice(0, -1))

        // Schedule flag reset
        setTimeout(() => {
            isUndoRedoRef.current = false
        }, 50)

        return previousState
    }, [history])

    /**
     * Redo to next state
     */
    const redo = useCallback((): HistoryState | null => {
        if (future.length === 0) {
            return null
        }

        isUndoRedoRef.current = true

        // Get the state to restore
        const nextState = future[future.length - 1]

        // Remove from future
        setFuture(prev => prev.slice(0, -1))

        // Schedule flag reset
        setTimeout(() => {
            isUndoRedoRef.current = false
        }, 50)

        return nextState
    }, [future])

    /**
     * Push current state to future (called before undo restores)
     */
    const pushToFuture = useCallback((nodes: Node[], edges: Edge[]) => {
        const state = cloneState(nodes, edges)
        setFuture(prev => [...prev, state])
    }, [cloneState])

    /**
     * Push restored state to history (called after redo restores)
     */
    const pushToHistory = useCallback((nodes: Node[], edges: Edge[]) => {
        const state = cloneState(nodes, edges)
        setHistory(prev => {
            const newHistory = [...prev, state]
            if (newHistory.length > maxHistory) {
                return newHistory.slice(-maxHistory)
            }
            return newHistory
        })
    }, [cloneState, maxHistory])

    /**
     * Clear all history
     */
    const clearHistory = useCallback(() => {
        setHistory([])
        setFuture([])
        pendingStateRef.current = null
        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current)
            debounceTimerRef.current = null
        }
    }, [])

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current)
            }
        }
    }, [])

    return {
        recordHistory,
        undo,
        redo,
        canUndo: history.length > 0,
        canRedo: future.length > 0,
        clearHistory,
        pushToFuture,
        pushToHistory
    }
}
