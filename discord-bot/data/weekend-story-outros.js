/**
 * Weekend story outro templates
 * Used to display a message after each scene in weekend stories
 */

// Scene 1 outro template
export const scene1OutroTemplate = "The coaches are all set and looking forward to a fun evening out: they're heading to {activityName}, a {activityDescription}.";

// Mid-story outro templates (scenes 2-23)
export const midStoryOutros = [
  "The coaches have resumed syncing their internal calendars without speaking. Nothing aligns, but no one adjusts.",
  "Someone starts typing, then stops. The group takes that as closure.",
  "The coaches all look at the same object. Not one of them sees the same thing."
];

// Final scene outro (scene 24)
export const finalSceneOutro = "Their weekend adventure has concluded. The coaches reflect silently on what just happened.";

// Function to get the appropriate outro for a scene
export function getOutroForScene(sceneNumber, totalScenes, activityInfo) {
  // First scene gets the template with activity info
  if (sceneNumber === 0) {
    return scene1OutroTemplate
      .replace('{activityName}', activityInfo?.name || 'their destination')
      .replace('{activityDescription}', activityInfo?.description || 'place to spend their weekend');
  }
  
  // Last scene gets the final outro
  if (sceneNumber === totalScenes - 1) {
    return finalSceneOutro;
  }
  
  // All other scenes get a random mid-story outro
  const randomIndex = Math.floor(Math.random() * midStoryOutros.length);
  return midStoryOutros[randomIndex];
} 