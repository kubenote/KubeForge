# Keyboard Shortcuts

KubeForge supports various keyboard shortcuts to help you work more efficiently with your Kubernetes configurations.

## General

| Shortcut | Action |
|----------|--------|
| `Escape` | Deselect all nodes and edges |
| `Ctrl+S` / `Cmd+S` | Save project |

## History

| Shortcut | Action |
|----------|--------|
| `Ctrl+Z` / `Cmd+Z` | Undo last action |
| `Ctrl+Y` / `Cmd+Y` | Redo last undone action |
| `Ctrl+Shift+Z` / `Cmd+Shift+Z` | Redo last undone action (alternative) |

## Clipboard

| Shortcut | Action |
|----------|--------|
| `Ctrl+C` / `Cmd+C` | Copy selected nodes |
| `Ctrl+V` / `Cmd+V` | Paste copied nodes |
| `Ctrl+X` / `Cmd+X` | Cut selected nodes (copy and delete) |

## Node Operations

| Shortcut | Action |
|----------|--------|
| `Delete` / `Backspace` | Delete selected nodes and their connected edges |
| `Ctrl+D` / `Cmd+D` | Duplicate selected nodes |

## Notes

- All shortcuts are disabled when editing text in input fields
- Shortcuts are disabled in read-only mode (when viewing historical versions)
- Pasted nodes are automatically offset to avoid overlapping with originals
- Duplicated nodes appear with a 50px offset from the original

## Canvas Navigation

- **Pan**: Click and drag on the canvas background
- **Zoom**: Scroll wheel or pinch gesture
- **Select multiple**: Click and drag to create a selection box
- **Add to selection**: Hold `Shift` while clicking nodes
