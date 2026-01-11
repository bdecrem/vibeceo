/**
 * Project management - each project gets its own folder with all assets.
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface ProjectMetadata {
  id: string;
  name: string;
  subject: string;
  style: string;
  format: 'image' | 'video';
  createdAt: string;
  updatedAt: string;
}

export interface Project {
  metadata: ProjectMetadata;
  dir: string;
  assetsDir: string;
  paths: {
    metadata: string;
    script: string;
    image1: string;
    image2: string;
    audio: string;
    video: string;
  };
}

function getProjectsDir(): string {
  const dir = path.resolve(__dirname, '../projects');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 30);
}

export function createProject(
  subject: string,
  style: string,
  format: 'image' | 'video',
  name?: string
): Project {
  const timestamp = Date.now();
  const slug = slugify(name || subject);
  const id = `${slug}-${timestamp}`;

  const projectsDir = getProjectsDir();
  const projectDir = path.join(projectsDir, id);
  const assetsDir = path.join(projectDir, 'assets');

  // Create project and assets directories
  fs.mkdirSync(assetsDir, { recursive: true });

  const metadata: ProjectMetadata = {
    id,
    name: name || subject,
    subject,
    style,
    format,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const project: Project = {
    metadata,
    dir: projectDir,
    assetsDir,
    paths: {
      metadata: path.join(assetsDir, 'project.json'),
      script: path.join(assetsDir, 'script.json'),
      image1: path.join(assetsDir, 'scene-1.png'),
      image2: path.join(assetsDir, 'scene-2.png'),
      audio: path.join(assetsDir, 'narration.mp3'),
      video: path.join(projectDir, 'final.mp4'),  // MP4 at root level
    },
  };

  // Save metadata
  fs.writeFileSync(project.paths.metadata, JSON.stringify(metadata, null, 2));

  console.log(`\n📁 Project created: ${id}`);
  console.log(`   Location: ${projectDir}\n`);

  return project;
}

export function loadProject(id: string): Project | null {
  const projectsDir = getProjectsDir();
  const projectDir = path.join(projectsDir, id);
  const assetsDir = path.join(projectDir, 'assets');
  const metadataPath = path.join(assetsDir, 'project.json');

  if (!fs.existsSync(metadataPath)) {
    return null;
  }

  const metadata: ProjectMetadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));

  return {
    metadata,
    dir: projectDir,
    assetsDir,
    paths: {
      metadata: metadataPath,
      script: path.join(assetsDir, 'script.json'),
      image1: path.join(assetsDir, 'scene-1.png'),
      image2: path.join(assetsDir, 'scene-2.png'),
      audio: path.join(assetsDir, 'narration.mp3'),
      video: path.join(projectDir, 'final.mp4'),  // MP4 at root level
    },
  };
}

export function updateProjectMetadata(project: Project, updates: Partial<ProjectMetadata>): void {
  project.metadata = {
    ...project.metadata,
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  fs.writeFileSync(project.paths.metadata, JSON.stringify(project.metadata, null, 2));
}

export function listProjects(): ProjectMetadata[] {
  const projectsDir = getProjectsDir();

  if (!fs.existsSync(projectsDir)) {
    return [];
  }

  const dirs = fs.readdirSync(projectsDir);
  const projects: ProjectMetadata[] = [];

  for (const dir of dirs) {
    const metadataPath = path.join(projectsDir, dir, 'assets', 'project.json');
    if (fs.existsSync(metadataPath)) {
      try {
        const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
        projects.push(metadata);
      } catch {
        // Skip invalid projects
      }
    }
  }

  // Sort by createdAt descending
  return projects.sort((a, b) =>
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}
