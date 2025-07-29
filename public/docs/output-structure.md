# Output Folder Structure

In Kubernetes, the folder structure of your YAML files is **not important to the cluster**. Kubernetes only reads and processes the contents of the YAML files you apply — the folder layout is for **your organization and clarity only**.

## How We Package Files

For simplicity we deliver a zip folder with the YAML configuration files in a _flat structure_.

## How Kubernetes Reads Files

Whether you use:

- A **single large YAML file** with multiple resource definitions
- **Multiple YAML files** in a single folder
- A **nested folder hierarchy** with YAML files spread across tiers

Kubernetes treats them **the same way** once applied.

### Examples

```bash
# Apply a single YAML file
kubectl apply -f deployment.yaml

# Apply all YAML files in a flat folder
kubectl apply -f ./k8s/

# Apply recursively from a nested structure
kubectl apply -f ./environments/dev/
```

In all cases, Kubernetes parses and applies the resources as individual objects.

## Recommended Folder Patterns (Optional)

Folder structure can help you stay organized. Here are common patterns:

### Flat Structure
```
k8s/
├── deployment.yaml
├── service.yaml
├── configmap.yaml
```

### Component-Based
```
k8s/
├── backend/
│   ├── deployment.yaml
│   ├── service.yaml
├── frontend/
│   ├── deployment.yaml
│   ├── service.yaml
```

### Environment-Based
```
k8s/
├── dev/
│   ├── backend.yaml
│   ├── frontend.yaml
├── prod/
│   ├── backend.yaml
│   ├── frontend.yaml
```

## Summary

> **Kubernetes flattens everything at apply time.** Use whatever folder structure makes your repo easier to manage, it won’t affect how resources are interpreted by the cluster.
