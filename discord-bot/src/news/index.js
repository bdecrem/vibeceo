import axios from "axios";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// Get the directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env.local
dotenv.config({ path: path.join(process.cwd(), ".env.local") });

const NEWS_API_KEY = process.env.NEWS_API_KEY;
const NEWS_API_URL = "https://newsapi.org/v2/top-headlines";

// Store last fetched stories to avoid duplicates
let lastFetchedStories = new Set();

async function fetchNewsStories() {
	try {
		const response = await axios.get(NEWS_API_URL, {
			params: {
				apiKey: NEWS_API_KEY,
				category: "technology",
				language: "en",
				pageSize: 12,
			},
		});

		if (response.data.status === "ok") {
			return response.data.articles;
		}
		throw new Error("Failed to fetch news");
	} catch (error) {
		console.error("Error fetching news:", error);
		return [];
	}
}

function selectDiscussionTopic(articles) {
	// Filter out stories we've already discussed
	const newStories = articles.filter(
		(article) => !lastFetchedStories.has(article.url)
	);

	if (newStories.length === 0) {
		return null;
	}

	// Simple scoring system for story selection
	const scoredStories = newStories.map((article) => {
		let score = 0;

		// Prefer stories about AI, startups, funding, and major tech companies
		const keywords = [
			"AI",
			"artificial intelligence",
			"startup",
			"funding",
			"raised",
			"Microsoft",
			"Google",
			"Apple",
			"Amazon",
			"Meta",
			"OpenAI",
			"Anthropic",
		];

		const title = article.title.toLowerCase();
		const description = article.description?.toLowerCase() || "";

		keywords.forEach((keyword) => {
			if (
				title.includes(keyword.toLowerCase()) ||
				description.includes(keyword.toLowerCase())
			) {
				score += 2;
			}
		});

		// Prefer more recent stories
		const hoursOld =
			(new Date() - new Date(article.publishedAt)) / (1000 * 60 * 60);
		score += Math.max(0, 24 - hoursOld) / 24; // Normalize to 0-1 range

		return { ...article, score };
	});

	// Sort by score and select the highest
	scoredStories.sort((a, b) => b.score - a.score);
	const selectedStory = scoredStories[0];

	// Add to our set of discussed stories
	lastFetchedStories.add(selectedStory.url);

	// Keep the set from growing too large
	if (lastFetchedStories.size > 100) {
		lastFetchedStories = new Set([...lastFetchedStories].slice(-50));
	}

	return selectedStory;
}

export async function getNewsDiscussionTopic() {
	const articles = await fetchNewsStories();
	return selectDiscussionTopic(articles);
}
