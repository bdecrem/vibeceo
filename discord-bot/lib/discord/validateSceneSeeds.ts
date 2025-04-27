// validateSceneSeeds.ts

import { ceos } from "../../data/ceos.js";

export function validateSceneSeeds(sceneSeeds: any[]) {
	const validCoachIds = ceos.map((c) => c.id);

	return sceneSeeds.map((scene, index) => {
		const invalidCoaches =
			scene.coaches?.filter((c: string) => !validCoachIds.includes(c)) || [];

		if (!scene.coaches || scene.coaches.length === 0) {
			console.warn(`Scene ${index} has no coaches assigned.`);
		}

		if (invalidCoaches.length > 0) {
			console.warn(
				`Scene ${index} has invalid coaches: ${invalidCoaches.join(", ")}`
			);
		}

		return {
			index,
			valid: invalidCoaches.length === 0 && scene.coaches?.length > 0,
			invalidCoaches,
		};
	});
}
