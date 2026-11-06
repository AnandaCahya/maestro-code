import fs from 'fs/promises'
import path from 'path'
import type { ProjectMetadata } from '../../preload/index.d'

const MAESTRO_DIR = '.maestro'
const TASKS_FILE = 'project.json'

const defaultProjectData: ProjectMetadata = {
  name: 'New Project',
  description: 'Integrated Project Management workspace',
  tasks: [
    {
      id: 'task-1',
      title: 'Setup Environment & Dependencies',
      description: 'Review package.json and ensure all dev tools are operational',
      status: 'done',
      priority: 'high',
      createdAt: Date.now() - 3600000,
      updatedAt: Date.now()
    },
    {
      id: 'task-2',
      title: 'Initialize Language Server Protocol (LSP)',
      description: 'Configure TypeScript/JavaScript LSP connection via JSON-RPC',
      status: 'in_progress',
      priority: 'urgent',
      createdAt: Date.now(),
      updatedAt: Date.now()
    },
    {
      id: 'task-3',
      title: 'Build File Explorer & Tree Navigation',
      description: 'Implement directory tree with file icon badges and context menus',
      status: 'todo',
      priority: 'medium',
      createdAt: Date.now(),
      updatedAt: Date.now()
    }
  ]
}

export async function loadProjectData(rootPath: string): Promise<ProjectMetadata> {
  const dir = path.join(rootPath, MAESTRO_DIR)
  const filePath = path.join(dir, TASKS_FILE)

  try {
    const content = await fs.readFile(filePath, 'utf-8')
    return JSON.parse(content) as ProjectMetadata
  } catch (err) {
    // Jika belum ada, buat direktori .maestro dan file project.json bawaan
    try {
      await fs.mkdir(dir, { recursive: true })
      const initialData: ProjectMetadata = {
        ...defaultProjectData,
        name: path.basename(rootPath)
      }
      await fs.writeFile(filePath, JSON.stringify(initialData, null, 2), 'utf-8')
      return initialData
    } catch {
      return {
        name: path.basename(rootPath),
        tasks: []
      }
    }
  }
}

export async function saveProjectData(rootPath: string, data: ProjectMetadata): Promise<boolean> {
  const dir = path.join(rootPath, MAESTRO_DIR)
  const filePath = path.join(dir, TASKS_FILE)

  await fs.mkdir(dir, { recursive: true })
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8')
  return true
}
