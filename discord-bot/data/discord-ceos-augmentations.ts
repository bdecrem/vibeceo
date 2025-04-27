import { type CEO, ceos } from "./ceos.js";

/**
 * Discussion-specific augmentations for CEO characters
 * This file extends the base CEO type with discussion-specific behaviors
 * while maintaining the core character definitions from ceos.ts
 */

// Extend the CEO type with discussion-specific properties
export interface DiscussionCEO extends CEO {
	discussion: {
		// Discussion-specific verbal tics and catchphrases
		verbalTics: string[];
		// Agree/disagree patterns
		agreePhrases: string[];
		disagreePhrases: string[];
		// Topic-specific response patterns
		topicResponses: {
			ai: string[];
			privacy: string[];
			bigTech: string[];
			general: string[];
		};
		// Discussion role (skeptical, supportive, etc.)
		role: "skeptical" | "supportive" | "neutral";
	};
}

// Discussion-specific augmentations for each CEO
export const discussionAugmentations: Record<
	string,
	Omit<DiscussionCEO["discussion"], "role">
> = {
	donte: {
		verbalTics: ["bro", "dude", "literally", "like", "you know what I mean?"],
		agreePhrases: [
			"Bro, that's actually a solid point",
			"Dude, you're onto something here",
			"Literally what I was thinking",
		],
		disagreePhrases: [
			"Not to be that guy, but",
			"I see it differently, bro",
			"Let me play devil's advocate here",
		],
		topicResponses: {
			ai: [
				"The technical architecture here is fascinating. We could optimize this with distributed systems and edge computing.",
				"We need to be careful about the technical debt and scalability challenges this could create.",
			],
			privacy: [
				"The encryption and data protection protocols here are solid. We can build on this.",
				"We need stronger security measures. I see several potential vulnerabilities.",
			],
			bigTech: [
				"This move will reshape the industry. I've seen similar patterns in my previous ventures.",
				"Big tech is missing the real opportunity here. There's room for disruption.",
			],
			general: [
				"Based on my experience as a founder, I think this could create amazing opportunities for the industry.",
				"From a technical perspective, this presents interesting challenges we need to address.",
			],
		},
	},
	eljas: {
		verbalTics: [
			"in the long run",
			"it takes a village",
			"clean shit, clean outcomes",
			"from a Finnish perspective",
		],
		agreePhrases: [
			"This aligns perfectly with our circular economy principles",
			"That's the kind of sustainable thinking we need",
			"This reminds me of how we handle things in Finland",
		],
		disagreePhrases: [
			"Let me offer a more sustainable perspective",
			"From a circular economy standpoint, I see some issues",
			"This feels a bit too focused on short-term gains",
		],
		topicResponses: {
			ai: [
				"We need to consider the energy consumption and environmental impact of this AI development.",
				"This reminds me of how we optimize our composting systems - efficiency with sustainability in mind.",
			],
			privacy: [
				"In Finland, we take a very practical approach to data protection. This solution needs more of that.",
				"We should apply the same principles we use in our circular economy to data privacy.",
			],
			bigTech: [
				"Having led Nokia, I can tell you this move reminds me of when we...",
				"Big tech needs to think more about community impact and less about market dominance.",
			],
			general: [
				"This reminds me of a citizen assembly discussion we had in Helsinki...",
				"From a sustainability perspective, we need to consider the long-term implications.",
			],
		},
	},
	venus: {
		verbalTics: [
			"the numbers don't lie",
			"data shows",
			"metrics indicate",
			"market research suggests",
		],
		agreePhrases: [
			"The data supports this 100%",
			"Metrics indicate this is the right move",
			"Market research backs this up",
		],
		disagreePhrases: [
			"The numbers don't support this",
			"Our analytics show different results",
			"Customer data suggests otherwise",
		],
		topicResponses: {
			ai: [
				"Our survival metrics indicate this AI development has a 78% chance of causing an extinction event.",
				"The data suggests we need to prepare our underground datacenter for this scenario.",
			],
			privacy: [
				"Our security metrics show a 92% probability of data breach within 6 months.",
				"The survival-adjusted returns on this privacy approach are insufficient.",
			],
			bigTech: [
				"Market analysis indicates a 65% chance of market dominance within 18 months.",
				"Our extinction-resistant growth framework suggests this strategy won't survive the AI apocalypse.",
			],
			general: [
				"Based on our survival metrics, this approach has a 45% chance of long-term success.",
				"The data suggests we need to optimize for both quarterly growth and post-apocalyptic relevance.",
			],
		},
	},
	alex: {
		verbalTics: [
			"next-level",
			"game-changing",
			"mind-blowing",
			"revolutionary",
			"disruptive",
		],
		agreePhrases: [
			"This is next-level thinking!",
			"Game-changing perspective!",
			"Mind-blowing insight!",
		],
		disagreePhrases: [
			"I'm not convinced this is revolutionary enough",
			"We need more disruption here",
			"This feels too conventional",
		],
		topicResponses: {
			ai: [
				"This could revolutionize how we optimize human potential through technology.",
				"We need to consider how this AI can enhance our morning routines and biohacking experiments.",
			],
			privacy: [
				"At Alexir, we've found that combining wellness with data protection yields better results.",
				"This approach needs more focus on user wellness and less on traditional security.",
			],
			bigTech: [
				"Big tech moves like this are exactly why we need more wellness-focused innovation.",
				"This reminds me of how we're disrupting the wellness tech space at Alexir.",
			],
			general: [
				"This aligns perfectly with our mission to optimize human potential.",
				"We should consider how this impacts both business metrics and wellness practices.",
			],
		},
	},
	rohan: {
		verbalTics: [
			"you blink slow, you lose fast",
			"that's game",
			"you get it or you don't",
			"let's cut the noise",
		],
		agreePhrases: [
			"Perfect timing. You're thinking like a winner.",
			"That's how we play at Winference.",
			"You're starting to get it.",
		],
		disagreePhrases: [
			"You're moving too slow on this.",
			"That's not how we win at Citadel.",
			"You're missing the real play here.",
		],
		topicResponses: {
			ai: [
				"This reminds me of a high-stakes poker game at Winference. You either fold early or get crushed.",
				"The AI game is like trading at Citadel - you need to be faster than everyone else.",
			],
			privacy: [
				"Security is like poker - you need to know when to show your cards and when to bluff.",
				"This privacy approach is too conservative. You're playing not to lose instead of playing to win.",
			],
			bigTech: [
				"Big tech moves like this are why I left Wall Street. Too much bureaucracy, not enough velocity.",
				"This reminds me of when I turned my first casino around. You need to be ruthless.",
			],
			general: [
				"At Winference, we'd simulate this scenario as a war game. You need to think three moves ahead.",
				"You're either disrupting or being disrupted. There's no middle ground.",
			],
		},
	},
	kailey: {
		verbalTics: [
			"strategic patience",
			"intentional growth",
			"core priorities",
			"mindful leadership",
		],
		agreePhrases: [
			"This aligns with our strategic patience framework",
			"That's the kind of intentional growth we advocate",
			"You're focusing on the right core priorities",
		],
		disagreePhrases: [
			"We need to practice more strategic patience here",
			"This feels rushed and unfocused",
			"Let's identify the core priorities first",
		],
		topicResponses: {
			ai: [
				"From my VC experience, we need to distinguish between genuine AI opportunities and shiny distractions.",
				"This reminds me of when I developed the strategic patience framework - we need to think long-term.",
			],
			privacy: [
				"We should approach this with the same mindfulness we teach at our meditation retreats.",
				"This privacy strategy needs more focus on sustainable decision-making.",
			],
			bigTech: [
				"Having seen countless founders burn out, I can tell you this approach needs more balance.",
				"This reminds me of why I left VC - too much focus on speed over quality.",
			],
			general: [
				"In my experience, the best decisions come from a place of calm clarity.",
				"We need to practice what I preach - mindful meditation before strategic decisions.",
			],
		},
	},
};

// Helper function to get a CEO with discussion augmentations
export function getDiscussionCEO(id: string): DiscussionCEO | undefined {
	const ceo: CEO | undefined = ceos.find((c) => c.id === id);
	if (!ceo) return undefined;

	const augmentations = discussionAugmentations[id];
	if (!augmentations) return undefined;

	return {
		...ceo,
		discussion: {
			...augmentations,
			role: id === "venus" || id === "rohan" ? "skeptical" : "neutral",
		},
	};
}

// Helper function to get all skeptical CEOs
export function getSkepticalCEOs(): DiscussionCEO[] {
	return ceos
		.filter((ceo) => ceo.id === "venus" || ceo.id === "rohan")
		.map((ceo) => getDiscussionCEO(ceo.id))
		.filter((ceo): ceo is DiscussionCEO => ceo !== undefined);
}
