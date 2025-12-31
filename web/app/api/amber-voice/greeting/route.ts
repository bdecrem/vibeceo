/**
 * Dynamic greeting endpoint - returns time-appropriate greeting
 */

export const dynamic = 'force-dynamic';

export async function GET() {
  const hour = new Date().getHours();
  const timeOfDay = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';

  return Response.json({
    greeting: `Hi, good ${timeOfDay}.`,
    timeOfDay,
  });
}
