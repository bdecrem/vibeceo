import { access } from 'node:fs/promises';
import { constants } from 'node:fs';
import path from 'node:path';

/**
 * Find Python executable, checking venv first, then falling back to system python3
 * 
 * Priority:
 * 1. PYTHON_BIN environment variable
 * 2. ../.venv/bin/python3 (project venv)
 * 3. python3 (system Python)
 */
export async function findPythonBin(): Promise<string> {
  if (process.env.PYTHON_BIN) {
    return process.env.PYTHON_BIN;
  }

  const venvPython = path.join(process.cwd(), '..', '.venv', 'bin', 'python3');
  
  try {
    await access(venvPython, constants.F_OK);
    return venvPython;
  } catch {
    // Fallback to system python3
    return 'python3';
  }
}

