// Script to compile TypeScript files
import { exec } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Execute TypeScript compiler
console.log('Compiling TypeScript files...');
exec('tsc', {cwd: __dirname}, (error, stdout, stderr) => {
  if (error) {
    console.error(`Error compiling TypeScript: ${error.message}`);
    console.error(stderr);
    process.exit(1);
  }
  
  if (stdout) {
    console.log(stdout);
  }
  
  console.log('TypeScript compilation completed successfully.');
}); 