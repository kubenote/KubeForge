// lib/docs.ts
import fs from 'fs'
import path from 'path'

export function getTopics(): string[] {
  const docsPath = path.join(process.cwd(), 'public/docs')
  const files = fs.readdirSync(docsPath)
  return files.filter(file => file.endsWith('.md'))
}
