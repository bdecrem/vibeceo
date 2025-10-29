const fs = require('fs');

// Read the JSON file
const data = JSON.parse(fs.readFileSync('/Users/bartdecrem/Documents/Dropbox/coding2025/vibeceo8/sms-bot/data/arxiv-reports/arxiv_papers_combined_2025-10-23.json', 'utf8'));

// Scoring function for each paper
function scorePaper(paper) {
  let score = 0;

  // Author Notability (20%)
  if (paper.authors && paper.authors.length > 0) {
    const avgNotability = paper.authors.reduce((sum, a) => sum + (a.notability_score || 0), 0) / paper.authors.length;
    score += avgNotability * 0.2;
  }

  // Keywords indicating novelty and impact (30% + 25%)
  const title = paper.title.toLowerCase();
  const abstract = (paper.abstract || '').toLowerCase();
  const combined = title + ' ' + abstract;

  // High-impact keywords
  const highImpactKeywords = [
    'breakthrough', 'state-of-the-art', 'novel', 'first', 'new approach',
    'significant improvement', 'outperforms', 'surpasses', 'beats',
    'benchmark', 'sota', 'efficient', 'scalable', 'practical'
  ];

  // Hot topics (timeliness 10%)
  const hotTopics = [
    'llm', 'large language model', 'gpt', 'transformer', 'diffusion',
    'multimodal', 'reasoning', 'alignment', 'safety', 'interpretability',
    'retrieval', 'rag', 'agent', 'reinforcement learning from human feedback',
    'rlhf', 'vision-language', 'video generation', 'code generation',
    'robotics', 'embodied', 'world model', 'chain-of-thought'
  ];

  // Novel techniques
  const novelTechniques = [
    'attention mechanism', 'self-attention', 'cross-attention',
    'architecture', 'training method', 'optimization', 'pruning',
    'distillation', 'fine-tuning', 'pre-training', 'zero-shot',
    'few-shot', 'in-context learning', 'prompting'
  ];

  let highImpactCount = 0;
  let hotTopicCount = 0;
  let novelTechCount = 0;

  highImpactKeywords.forEach(kw => {
    if (combined.includes(kw)) highImpactCount++;
  });

  hotTopics.forEach(kw => {
    if (combined.includes(kw)) hotTopicCount++;
  });

  novelTechniques.forEach(kw => {
    if (combined.includes(kw)) novelTechCount++;
  });

  // Novelty score (30%)
  score += Math.min(novelTechCount * 10, 30);

  // Impact score (25%)
  score += Math.min(highImpactCount * 8, 25);

  // Timeliness score (10%)
  score += Math.min(hotTopicCount * 5, 10);

  // Research quality indicators (15%)
  // Check for experimental validation, datasets, code availability
  if (combined.includes('experiment') || combined.includes('evaluation')) score += 5;
  if (combined.includes('dataset') || combined.includes('benchmark')) score += 5;
  if (combined.includes('code') || combined.includes('github') || combined.includes('open-source')) score += 5;

  return score;
}

// Score all papers
const scoredPapers = data.papers.map(paper => ({
  ...paper,
  score: scorePaper(paper)
}));

// Sort by score
scoredPapers.sort((a, b) => b.score - a.score);

// Get top 10
const topPapers = scoredPapers.slice(0, 10);

// Output results
console.log(JSON.stringify({
  total_papers: data.total_papers,
  categories: data.categories,
  top_papers: topPapers.map((p, idx) => ({
    rank: idx + 1,
    arxiv_id: p.arxiv_id,
    title: p.title,
    categories: p.categories,
    authors: p.authors?.map(a => a.name).slice(0, 5) || [],
    author_notability: p.authors?.length > 0 ?
      Math.round(p.authors.reduce((sum, a) => sum + (a.notability_score || 0), 0) / p.authors.length) : 0,
    score: Math.round(p.score),
    abstract: p.abstract,
    arxiv_url: `https://arxiv.org/abs/${p.arxiv_id}`,
    pdf_url: `https://arxiv.org/pdf/${p.arxiv_id}.pdf`
  }))
}, null, 2));
