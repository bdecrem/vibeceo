import axios from "axios";

export async function fetchArticles(topic: string) {
  const apiKey = process.env.NEWS_API_KEY;

  if (!apiKey) {
    throw new Error("Missing NEWS_API_KEY in environment");
  }

  const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(
    topic
  )}&sortBy=publishedAt&language=en&pageSize=5&apiKey=${apiKey}`;

  const response = await axios.get(url);

  if (!response.data.articles || response.data.articles.length === 0) {
    return null;
  }

  return response.data.articles.map((article: any) => ({
    title: article.title,
    description: article.description,
    url: article.url,
    publishedAt: article.publishedAt,
    source: article.source?.name,
  }));
}
