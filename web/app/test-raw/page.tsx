import { readFileSync } from 'fs';
import path from 'path';

export default function TestRawPage() {
  const filePath = path.join(process.cwd(), 'UPLOADS', 'test.html');
  const htmlContent = readFileSync(filePath, 'utf-8');
  
  // Return the HTML in an iframe using srcDoc
  return (
    <div style={{ width: '100%', height: '100vh', margin: 0, padding: 0 }}>
      <iframe
        srcDoc={htmlContent}
        style={{
          width: '100%',
          height: '100%',
          border: 'none',
        }}
        sandbox="allow-scripts allow-same-origin"
      />
    </div>
  );
}