import { readFileSync } from 'fs';
import path from 'path';

export default function TestHtmlPage() {
  const filePath = path.join(process.cwd(), 'UPLOADS', 'test.html');
  const htmlContent = readFileSync(filePath, 'utf-8');
  
  return <div dangerouslySetInnerHTML={{ __html: htmlContent }} />;
}