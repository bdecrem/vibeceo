import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { WebhookClient } from "discord.js";
import { getDiscussionCEO } from "../../data/discord-ceos-augmentations.js";

// Get the directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env.local
dotenv.config({ path: path.join(process.cwd(), ".env.local") });

// Coach personalities and their webhook clients
const coaches = {
	donte: {
		name: "Donte",
		webhook: new WebhookClient({ url: process.env.WEBHOOK_URL_DONTE }),
		...getDiscussionCEO("donte"),
	},
	alex: {
		name: "Alex",
		webhook: new WebhookClient({ url: process.env.WEBHOOK_URL_ALEX }),
		...getDiscussionCEO("alex"),
	},
	rohan: {
		name: "Rohan",
		webhook: new WebhookClient({ url: process.env.WEBHOOK_URL_ROHAN }),
		...getDiscussionCEO("rohan"),
	},
	venus: {
		name: "Venus",
		webhook: new WebhookClient({ url: process.env.WEBHOOK_URL_VENUS }),
		...getDiscussionCEO("venus"),
	},
	eljas: {
		name: "Eljas",
		webhook: new WebhookClient({ url: process.env.WEBHOOK_URL_ELJAS }),
		...getDiscussionCEO("eljas"),
	},
	kailey: {
		name: "Kailey",
		webhook: new WebhookClient({ url: process.env.WEBHOOK_URL_KAILEY }),
		...getDiscussionCEO("kailey"),
	},
};

// Track participation in discussions
let discussionState = {
	isActive: false,
	topic: null,
	participationCount: {},
	messageCount: 0,
	startTime: null,
};

// Track last speaker and their point
let lastSpeaker = null;
let lastPoint = null;

// Track who annoys who
let annoyedCoach = null;
let annoyingCoach = null;

// Reset discussion state
function resetDiscussionState() {
	discussionState = {
		isActive: false,
		topic: null,
		participationCount: {},
		messageCount: 0,
		startTime: null,
	};
	annoyedCoach = null;
	annoyingCoach = null;
}

// Generate a coach's response considering the previous message
function generateCoachResponse(coach, topic, previousSpeaker, previousPoint) {
	const coachData = coaches[coach.toLowerCase()];
	if (!coachData || !coachData.discussion) {
		console.error("Coach data or discussion properties not found for:", coach);
		return generateGeneralResponse(coach, topic);
	}

	const { style, traits, discussion } = coachData;
	const { verbalTics, agreePhrases, disagreePhrases, topicResponses } =
		discussion;

	// Increase disagreement rate to 50% for more tension
	const agree = Math.random() > 0.5;

	let response = "";

	// If responding to someone else's point
	if (previousSpeaker && previousSpeaker !== coach) {
		const phrases = agree ? agreePhrases : disagreePhrases;
		const opener = phrases[Math.floor(Math.random() * phrases.length)];

		// Add verbal tics as a separate sentence
		const tic = verbalTics[Math.floor(Math.random() * verbalTics.length)];
		response = `${opener} ${previousSpeaker}. ${tic}. `;

		// Add annoyance if this coach is annoyed by the previous speaker
		if (coach === annoyedCoach && previousSpeaker === annoyingCoach) {
			const annoyedPhrases = [
				"I have to say, I'm getting a bit tired of your constant...",
				"Look, I appreciate your input, but...",
				"I need to be honest here, your approach is...",
				"Can we try to be a bit more practical about this?",
				"I'm not sure I agree with your perspective on this..."
			];
			response += annoyedPhrases[Math.floor(Math.random() * annoyedPhrases.length)] + " ";
		}
	}

	// Add topic-specific insight as a separate sentence
	if (topic.title.toLowerCase().includes("ai")) {
		response +=
			topicResponses.ai[Math.floor(Math.random() * topicResponses.ai.length)];
	} else if (
		topic.title.toLowerCase().includes("privacy") ||
		topic.title.toLowerCase().includes("security")
	) {
		response +=
			topicResponses.privacy[
				Math.floor(Math.random() * topicResponses.privacy.length)
			];
	} else if (
		topic.title.toLowerCase().includes("microsoft") ||
		topic.title.toLowerCase().includes("google")
	) {
		response +=
			topicResponses.bigTech[
				Math.floor(Math.random() * topicResponses.bigTech.length)
			];
	} else {
		response +=
			topicResponses.general[
				Math.floor(Math.random() * topicResponses.general.length)
			];
	}

	// Add coach-specific flair as a separate element
	response += " " + getCoachFlair(coach);

	return response;
}

function generateGeneralResponse(coach, topic) {
	const coachData = coaches[coach.toLowerCase()];
	if (!coachData || !coachData.discussion) {
		return `Based on my experience, I think this is an interesting development.`;
	}
	return coachData.discussion.topicResponses.general[
		Math.floor(
			Math.random() * coachData.discussion.topicResponses.general.length
		)
	];
}

function getCoachFlair(coach) {
	const flairs = {
		donte: [
			"💻 Let's architect this right!",
			"🔧 Time to build!",
			"⚡ Performance is key!",
		],
		alex: [
			"🚀 Sky's the limit!",
			"💡 Innovation is calling!",
			"🎯 Product-market fit, baby!",
		],
		rohan: [
			"⚙️ Systems thinking for the win!",
			"🏗️ Build it to scale!",
			"🔄 Iterate and improve!",
		],
		venus: [
			"📊 Data tells the story!",
			"🎯 Customer-first!",
			"📈 Growth mindset!",
		],
		eljas: [
			"🦄 Think bigger!",
			"🌟 Game-changing potential!",
			"🔥 Let's disrupt this!",
		],
		kailey: [
			"🤝 Team synergy is key!",
			"⚡ Efficiency wins!",
			"🎯 Execute with precision!",
		],
	};

	const coachFlairs = flairs[coach.toLowerCase()];
	return coachFlairs[Math.floor(Math.random() * coachFlairs.length)];
}

// Start a new discussion
export async function startDiscussion(newsStory) {
	if (discussionState.isActive) {
		return false;
	}

	discussionState = {
		isActive: true,
		topic: newsStory,
		participationCount: {},
		messageCount: 0,
		startTime: Date.now(),
	};

	// Reset tracking
	lastSpeaker = null;
	lastPoint = null;

	// Get all coaches
	const coachIds = Object.keys(coaches);
	
	// 1. WE pick the first coach and their issue
	// For now, hardcoding Alex with matcha tea issue as an example
	// TODO: This should be configurable by the admin/system
	const firstCoach = 'alex';
	const firstCoachIssue = "Hey team! 🍵 I just got a bad batch of matcha tea. What do you think about this quality issue?";
	
	// 2. System randomly picks 2 more coaches
	const otherCoaches = coachIds.filter(coach => coach !== firstCoach);
	const shuffled = otherCoaches.sort(() => 0.5 - Math.random());
	const [coach2, coach3] = shuffled.slice(0, 2);
	
	// 3. System randomly decides who annoys who among the 3 coaches
	const allThree = [firstCoach, coach2, coach3];
	const annoyedCoach = allThree[Math.floor(Math.random() * allThree.length)];
	const remainingCoaches = allThree.filter(coach => coach !== annoyedCoach);
	const annoyingCoach = remainingCoaches[Math.floor(Math.random() * remainingCoaches.length)];

	try {
		await coaches[firstCoach].webhook.send({
			content: firstCoachIssue + " " + getCoachFlair(firstCoach),
			username: coaches[firstCoach].name,
		});

		lastSpeaker = firstCoach;
		lastPoint = firstCoachIssue;
		discussionState.participationCount[firstCoach] = 1;
		discussionState.messageCount = 1;

		return true;
	} catch (error) {
		console.error("Error starting discussion:", error);
		resetDiscussionState();
		return false;
	}
}

// Add a message to the discussion
export async function addToDiscussion(coachName) {
	if (!discussionState.isActive || !coaches[coachName.toLowerCase()]) {
		return false;
	}

	const coach = coaches[coachName.toLowerCase()];
	const response = generateCoachResponse(
		coachName,
		discussionState.topic,
		lastSpeaker,
		lastPoint
	);

	try {
		await coach.webhook.send({
			content: response,
			username: coach.name,
		});

		// Update tracking
		lastSpeaker = coachName;
		lastPoint = response;
		discussionState.participationCount[coachName.toLowerCase()] =
			(discussionState.participationCount[coachName.toLowerCase()] || 0) + 1;
		discussionState.messageCount++;

		// Check if we should conclude the discussion
		if (shouldConcludeDiscussion()) {
			await concludeDiscussion();
		}

		return true;
	} catch (error) {
		console.error("Error adding to discussion:", error);
		return false;
	}
}

// Check if we should conclude the discussion
function shouldConcludeDiscussion() {
	// Check if we've reached the maximum messages
	if (discussionState.messageCount >= 25) {
		return true;
	}

	// Check if we've reached the minimum messages and all coaches have participated at least twice
	if (discussionState.messageCount >= 10) {
		const allCoachesParticipatedTwice = Object.values(
			discussionState.participationCount
		).every((count) => count >= 2);
		return allCoachesParticipatedTwice;
	}

	return false;
}

// Conclude the discussion with more organic wrap-ups
async function concludeDiscussion() {
	if (!discussionState.isActive) {
		return false;
	}

	const summarizer =
		Object.keys(coaches)[
			Math.floor(Math.random() * Object.keys(coaches).length)
		];
	const coach = coaches[summarizer];

	// Generate a more natural, personality-driven summary based on the topic and summarizer
	const topic = discussionState.topic;
	let summary = "";

	if (summarizer === "donte") {
		summary =
			"Yo, this was a solid discussion! Everyone brought their A-game with the technical insights and real-world applications. Love how we got deep into the details while keeping it practical.";
	} else if (summarizer === "alex") {
		summary =
			"Mind = blown by this conversation! The energy and innovative thinking here was next-level. We're definitely onto something game-changing!";
	} else if (summarizer === "rohan") {
		summary =
			"Let's break down what we covered - solid technical analysis, clear risk assessment, and actionable next steps. That's how we win in this space.";
	} else if (summarizer === "venus") {
		summary =
			"The data points we discussed are fascinating. Our collective analysis suggests a clear direction forward, backed by solid metrics and market insights.";
	} else if (summarizer === "eljas") {
		summary =
			"From a Finnish perspective, this discussion really showed how we can build something sustainable and impactful. Clean thoughts lead to clean outcomes!";
	} else if (summarizer === "kailey") {
		summary =
			"Taking a mindful moment to appreciate everyone's perspectives here. We've found a beautiful balance between innovation and practical execution.";
	}

	try {
		// Add topic-specific flavor to the summary
		let topicInsight = "";
		if (topic.title.toLowerCase().includes("ai")) {
			topicInsight =
				"\n\nReally interesting how we explored both the technical possibilities and the real-world impacts. This AI space is moving fast, but we're thinking ahead.";
		} else if (
			topic.title.toLowerCase().includes("privacy") ||
			topic.title.toLowerCase().includes("security")
		) {
			topicInsight =
				"\n\nLove how we didn't just focus on the tech, but also thought about the human side of privacy and security. That's what makes the difference.";
		} else if (
			topic.title.toLowerCase().includes("microsoft") ||
			topic.title.toLowerCase().includes("google")
		) {
			topicInsight =
				"\n\nThe way we analyzed this move from multiple angles - tech, market, and user impact - that's exactly what we need to stay ahead in this industry.";
		}

		await coach.webhook.send({
			content: `Hey team! What a great chat about ${
				topic.title
			}. ${summary}${topicInsight} ${getCoachFlair(summarizer)}`,
			username: coach.name,
		});

		resetDiscussionState();
		return true;
	} catch (error) {
		console.error("Error concluding discussion:", error);
		return false;
	}
}

// Continue the discussion by adding more coach messages
async function continueDiscussion() {
	if (!discussionState.isActive) return;

	const coaches = ["donte", "alex", "rohan", "venus", "eljas", "kailey"];
	const skepticalCoaches = ["rohan", "venus"]; // These coaches tend to be more skeptical
	const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

	try {
		// Ensure at least 2 skeptical coaches participate
		const skepticalCount = Object.entries(
			discussionState.participationCount
		).filter(([coach]) => skepticalCoaches.includes(coach)).length;

		if (skepticalCount < 2) {
			// Add messages from skeptical coaches first
			for (const coach of skepticalCoaches) {
				if (!discussionState.participationCount[coach]) {
					await addToDiscussion(coach);
					discussionState.participationCount[coach] = 1;
					discussionState.messageCount++;
					discussionState.lastMessageTime = Date.now();
					await delay(2000 + Math.random() * 3000);
				}
			}
		}

		// Add messages from other coaches
		for (const coach of coaches) {
			if (discussionState.messageCount >= 25) break;

			// Skip if this coach is a skeptical coach and we already have 2 participating
			if (
				skepticalCoaches.includes(coach) &&
				Object.entries(discussionState.participationCount).filter(([c]) =>
					skepticalCoaches.includes(c)
				).length >= 2
			) {
				continue;
			}

			await addToDiscussion(coach);
			discussionState.messageCount++;
			discussionState.lastMessageTime = Date.now();

			// Random delay between messages (2-5 seconds)
			await delay(2000 + Math.random() * 3000);
		}

		// If discussion isn't complete, schedule more messages
		if (discussionState.messageCount < 10) {
			setTimeout(continueDiscussion, 5000);
		}
	} catch (error) {
		console.error("Error continuing discussion:", error);
	}
}

// Export for testing
export const testHelpers = {
	getDiscussionState: () => discussionState,
	resetDiscussionState,
};
