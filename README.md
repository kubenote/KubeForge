<h1>
  <img src="./public/icon.png" alt="KubeForge Icon" style="height: 1.5em; vertical-align: middle; margin-right: 0.5em;">
  <a href="https://kubefor.ge">KubeForge</a>
</h1>

To get started just run:
```
docker run -p 3000:3000 get.kubefor.ge/latest
```
or
```
docker run -p 3000:3000 ghcr.io/kubenote/kubeforge:latest
```

**KubeForge** is a visual-first toolkit that simplifies the process of building, validating, and managing Kubernetes deployment configurations. Whether you're new to Kubernetes or maintaining large-scale systems, KubeForge streamlines the creation of valid deployment YAMLs using an intuitive interface backed by live schema references.

![KubeForge Screenshot](./public/git/screenshot.png)

## ✨ Features

- 📦 Drag-and-drop interface for Kubernetes objects
- 📘 Smart schema awareness powered by Kubernetes JSON schemas
- 🧩 Modular component editor with support for templates and reusable specs
- 🔁 Real-time visual updates and dependency linking between resources
- ⚙️ Export ready-to-apply YAML files

## 🚀 Goals

- Reduce the learning curve for Kubernetes configuration
- Eliminate syntax and schema errors during development
- Help DevOps teams and developers prototype deployment setups visually
- Support real-time collaboration and configuration sharing in the future

## ⚙️ How It Works

KubeForge keeps Kubernetes definitions up to date by fetching the official Kubernetes OpenAPI spec (`swagger.json`) directly from the Kubernetes GitHub repository. Schemas are ingested into the database on demand via `npm run db:ingest-schemas -- <version>`, supporting all versions from v1.19.0 onward.

This ensures the editor always uses the most current, version-specific spec definitions, with proper field validation and metadata. Use `--discover` to list all available versions or `--latest` to automatically fetch the newest stable release.

Additionally, KubeForge enables **direct YAML hosting**, so you can reference built configurations from a stable URL when deploying nodes via automation or GitOps pipelines.


## 📂 Screenshot

The UI provides a live visual representation of object relationships and fields:

> ![KubeForge UI](./public/git/screenshot.png)
> ![KubeForge UI](./public/git/screenshot-1.png)
> ![KubeForge UI](./public/git/screenshot-2.png)
> ![KubeForge UI](./public/git/screenshot-3.png)
> ![KubeForge UI](./public/git/screenshot-4.png)
> ![KubeForge UI](./public/git/screenshot-6.png)

## 📦 Using as a Library

KubeForge can be installed as a dependency for building SaaS products on top of it:

```bash
npm install github:kubenote/kubeforge#v0.2.0
```

This provides:
- **Repository interfaces** for custom database implementations (e.g., tenant-scoped queries)
- **Storage provider interface** for custom file storage (e.g., S3)
- **Composable React providers** for embedding KubeForge UI
- **TypeScript types** for all data models

See [SaaS Integration Guide](docs/claude-generated/saas-integration.md) for details.

## 🛠️ Coming Soon

- Real-time validation against cluster versions
- Helm chart generation
- GitOps-style export templates

---

Feel free to contribute, file issues, or request features!
