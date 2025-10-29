const fs = require('fs');

// Read the JSON file
console.log('Loading papers...');
const data = JSON.parse(fs.readFileSync('/Users/bartdecrem/Documents/Dropbox/coding2025/vibeceo8/sms-bot/data/arxiv-reports/arxiv_papers_combined_2025-10-23.json', 'utf8'));

console.log(`Total papers: ${data.total_papers}`);
console.log(`Categories: ${data.categories.join(', ')}`);

// Calculate category statistics
const categoryStats = {};
data.categories.forEach(cat => categoryStats[cat] = 0);

data.papers.forEach(paper => {
  if (paper.categories) {
    paper.categories.forEach(cat => {
      if (categoryStats[cat] !== undefined) categoryStats[cat]++;
    });
  }
});

console.log('\nCategory statistics:');
Object.entries(categoryStats).forEach(([cat, count]) => {
  console.log(`${cat}: ${count}`);
});

// Score each paper based on curation criteria
function scorePaper(paper) {
  let score = 0;
  const reasons = [];

  const abstractLower = (paper.abstract || '').toLowerCase();
  const titleLower = (paper.title || '').toLowerCase();
  const combined = abstractLower + ' ' + titleLower;

  // 1. Novelty (30%) - Novel techniques, breakthrough approaches
  const noveltyKeywords = [
    'novel', 'new', 'first', 'breakthrough', 'revolutionary', 'unprecedented',
    'pioneering', 'introduce', 'propose', 'innovative', 'original', 'unique', 'advance'
  ];
  let noveltyCount = 0;
  noveltyKeywords.forEach(kw => {
    if (combined.includes(kw)) noveltyCount++;
  });
  const noveltyScore = Math.min(noveltyCount * 2.5, 30);
  score += noveltyScore;
  if (noveltyCount >= 3) reasons.push('Novel approach');

  // 2. Impact Potential (25%) - Practical applications, SOTA, efficiency
  const impactKeywords = [
    'state-of-the-art', 'sota', 'outperform', 'surpass', 'beat', 'significant improvement',
    'efficient', 'scalable', 'practical', 'real-world', 'benchmark', 'performance',
    'faster', 'better', 'superior', 'achieve', 'breakthrough'
  ];
  let impactCount = 0;
  impactKeywords.forEach(kw => {
    if (combined.includes(kw)) impactCount++;
  });
  const impactScore = Math.min(impactCount * 2.5, 25);
  score += impactScore;
  if (combined.includes('state-of-the-art') || combined.includes('sota') || combined.includes('outperform')) {
    reasons.push('SOTA performance');
  }

  // 3. Author Notability (20%)
  let avgNotability = 0;
  if (paper.authors && paper.authors.length > 0) {
    const notabilities = paper.authors.map(a => a.notability_score || 0);
    avgNotability = notabilities.reduce((a, b) => a + b, 0) / notabilities.length;
    score += (avgNotability / 100) * 2; // Scale: 100 notability = 2 points
  }

  // 4. Research Quality (15%) - Code, experiments, benchmarks
  let qualityScore = 0;
  if (combined.includes('experiment') || combined.includes('evaluation') || combined.includes('empirical')) {
    qualityScore += 5;
    reasons.push('Thorough experiments');
  }
  if (combined.includes('dataset') || combined.includes('benchmark')) {
    qualityScore += 5;
  }
  if (combined.includes('code') || combined.includes('github') || combined.includes('open-source') ||
      combined.includes('repository') || combined.includes('available at')) {
    qualityScore += 5;
    reasons.push('Code available');
  }
  score += Math.min(qualityScore, 15);

  // 5. Timeliness (10%) - Hot topics
  const hotTopics = [
    'llm', 'large language model', 'gpt', 'transformer', 'diffusion',
    'multimodal', 'reasoning', 'alignment', 'safety', 'interpretability',
    'retrieval', 'rag', 'agent', 'rlhf', 'vision-language', 'vlm',
    'video generation', 'code generation', 'robotics', 'embodied',
    'world model', 'chain-of-thought', 'in-context learning', 'prompt',
    'foundation model', 'omni', 'test-time', 'agentic'
  ];
  let hotTopicCount = 0;
  const matchedTopics = [];
  hotTopics.forEach(kw => {
    if (combined.includes(kw)) {
      hotTopicCount++;
      if (matchedTopics.length < 2) matchedTopics.push(kw);
    }
  });
  score += Math.min(hotTopicCount * 1.5, 10);
  if (matchedTopics.length > 0) {
    reasons.push(`Hot: ${matchedTopics.join(', ')}`);
  }

  return { score, avgNotability, reasons };
}

// Score all papers
console.log('\nScoring papers...');
const scoredPapers = data.papers.map(paper => {
  const { score, avgNotability, reasons } = scorePaper(paper);
  return {
    ...paper,
    score,
    avg_notability: avgNotability,
    reasons
  };
});

// Sort by score and get top papers
scoredPapers.sort((a, b) => b.score - a.score);
const topPapers = scoredPapers.slice(0, 30); // Get top 30 for review

console.log('\n' + '='.repeat(80));
console.log('TOP 30 PAPERS BY SCORE');
console.log('='.repeat(80));

topPapers.forEach((paper, idx) => {
  console.log(`\n${idx + 1}. [Score: ${paper.score.toFixed(1)}] ${paper.title.substring(0, 70)}`);
  console.log(`   ID: ${paper.arxiv_id}`);
  console.log(`   Categories: ${(paper.categories || []).join(', ')}`);
  console.log(`   Avg Notability: ${paper.avg_notability.toFixed(1)}`);
  console.log(`   Reasons: ${paper.reasons.join(', ')}`);
  const authors = paper.authors || [];
  const authorNames = authors.slice(0, 3).map(a => a.name || 'Unknown');
  if (authors.length > 3) authorNames.push(`et al. (${authors.length} total)`);
  console.log(`   Authors: ${authorNames.join(', ')}`);
  console.log(`   Abstract: ${(paper.abstract || '').substring(0, 200)}...`);
});

// Notable authors analysis
console.log('\n' + '='.repeat(80));
console.log('NOTABLE AUTHORS ANALYSIS');
console.log('='.repeat(80));

const authorPapers = {};
const authorNotability = {};

data.papers.forEach(paper => {
  if (paper.authors) {
    paper.authors.forEach(author => {
      const name = author.name;
      if (name) {
        if (!authorPapers[name]) {
          authorPapers[name] = [];
          authorNotability[name] = [];
        }
        authorPapers[name].push(paper.arxiv_id);
        authorNotability[name].push(author.notability_score || 0);
      }
    });
  }
});

const notableAuthors = [];
Object.keys(authorPapers).forEach(name => {
  const papers = authorPapers[name];
  const notabilities = authorNotability[name];
  const avgNotability = notabilities.reduce((a, b) => a + b, 0) / notabilities.length;
  const maxNotability = Math.max(...notabilities);

  if (papers.length >= 2 || maxNotability >= 150) {
    notableAuthors.push({
      name,
      paper_count: papers.length,
      papers: papers,
      avg_notability: avgNotability
    });
  }
});

notableAuthors.sort((a, b) => {
  if (b.paper_count !== a.paper_count) return b.paper_count - a.paper_count;
  return b.avg_notability - a.avg_notability;
});

notableAuthors.slice(0, 15).forEach((author, i) => {
  console.log(`${i + 1}. ${author.name}`);
  console.log(`   Papers today: ${author.paper_count}, Avg notability: ${author.avg_notability.toFixed(1)}`);
  console.log(`   Papers: ${author.papers.slice(0, 3).join(', ')}`);
});

// Save intermediate results
const output = {
  total_papers: data.total_papers,
  category_stats: categoryStats,
  top_30_papers: topPapers.map((p, i) => ({
    rank: i + 1,
    arxiv_id: p.arxiv_id,
    title: p.title,
    authors: p.authors ? p.authors.map(a => a.name) : [],
    categories: p.categories || [],
    abstract: p.abstract || '',
    score: Math.round(p.score * 10) / 10,
    avg_notability: Math.round(p.avg_notability * 10) / 10,
    reasons: p.reasons,
    arxiv_url: `https://arxiv.org/abs/${p.arxiv_id}`,
    pdf_url: `https://arxiv.org/pdf/${p.arxiv_id}.pdf`
  })),
  notable_authors: notableAuthors.slice(0, 15).map(a => ({
    name: a.name,
    paper_count_today: a.paper_count,
    papers: a.papers,
    avg_notability: Math.round(a.avg_notability * 10) / 10
  }))
};

fs.writeFileSync('/Users/bartdecrem/Documents/Dropbox/coding2025/vibeceo8/sms-bot/data/arxiv-reports/intermediate_analysis.json', JSON.stringify(output, null, 2));

console.log('\n' + '='.repeat(80));
console.log('Intermediate results saved to intermediate_analysis.json');
console.log('='.repeat(80));
