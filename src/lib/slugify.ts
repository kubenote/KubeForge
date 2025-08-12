export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    // Replace spaces and special characters with dashes
    .replace(/[^a-z0-9\s-]/g, '')
    // Replace multiple spaces with single space
    .replace(/\s+/g, ' ')
    // Replace spaces with dashes
    .replace(/\s/g, '-')
    // Remove multiple consecutive dashes
    .replace(/-+/g, '-')
    // Remove leading/trailing dashes
    .replace(/^-|-$/g, '');
}

export function validateProjectName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) {
    throw new Error('Project name cannot be empty');
  }
  if (trimmed.length > 100) {
    throw new Error('Project name cannot exceed 100 characters');
  }
  return trimmed;
}