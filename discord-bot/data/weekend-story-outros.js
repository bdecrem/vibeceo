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

/**
 * Returns the appropriate outro for a given scene number
 */
export function getOutroForScene(sceneIndex, totalScenes, activityInfo) {
  // Convert to 1-based scene number
  const sceneNumber = sceneIndex + 1;
  
  // Scene 1: Activity intro
  if (sceneNumber === 1) {
    const activityName = activityInfo?.name || 'their destination';
    const activityDescription = activityInfo?.description || 'place to spend their weekend';
    
    return scene1OutroTemplate
      .replace('{activityName}', activityName)
      .replace('{activityDescription}', activityDescription);
  }
  
  // Scene 24: Final outro
  if (sceneNumber === 24) {
    return finalSceneOutro;
  }
  
  // Scenes 2-23: Random mid-story outro
  const randomIndex = Math.floor(Math.random() * midStoryOutros.length);
  return midStoryOutros[randomIndex];
} 