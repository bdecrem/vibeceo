// Script to disable test OG routes during build to prevent deployment issues
const fs = require('fs');
const path = require('path');

const testRoutes = [
  'app/api/og-simple-test',
  'app/api/og-simple-working', 
  'app/api/og-debug',
  'app/api/og-test',
  'app/api/og-fixed',
  'app/api/og-debug-supabase',
  'app/api/og-fix',
  'app/api/og-simple',
  'app/api/og-real-page',
  'app/api/og-sapphire-elephant',
  'app/api/og-dynamic-working'
];

console.log('🧹 Disabling test OG routes to prevent build issues...');

testRoutes.forEach(routePath => {
  const fullPath = path.join(process.cwd(), routePath);
  const routeFile = path.join(fullPath, 'route.tsx');
  
  if (fs.existsSync(routeFile)) {
    try {
      let content = fs.readFileSync(routeFile, 'utf8');
      
      // Add environment check at the top of the GET function
      if (!content.includes('process.env.NODE_ENV === \'development\'')) {
        content = content.replace(
          /export async function GET\(/,
          `export async function GET(`
        );
        
        // Add early return for production
        content = content.replace(
          /(export async function GET\([^)]*\)\s*{\s*)/,
          `$1
  // Disable test routes in production
  if (process.env.NODE_ENV !== 'development') {
    return new Response('Test route disabled in production', { status: 404 });
  }
  `
        );
        
        fs.writeFileSync(routeFile, content);
        console.log(`✅ Disabled ${routePath}`);
      } else {
        console.log(`⏭️  Already disabled ${routePath}`);
      }
    } catch (error) {
      console.log(`❌ Error processing ${routePath}:`, error.message);
    }
  } else {
    console.log(`⏭️  Route not found: ${routePath}`);
  }
});

console.log('✅ Test OG routes disabled for production builds');
