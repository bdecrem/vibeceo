const fs = require('fs');

// Read the papers data
const data = JSON.parse(fs.readFileSync('/Users/bartdecrem/Documents/Dropbox/coding2025/vibeceo8/sms-bot/data/arxiv-reports/arxiv_papers_combined_2025-10-29.json', 'utf8'));

console.log(`Total papers: ${data.total_papers}`);
console.log(`Categories: ${data.categories.join(', ')}`);

// Graph context insights
const trendingAreas = {
  'math.NA': 2.9,
  'cs.NA': 2.9,
  'cs.IT': 2.44,
  'math.IT': 2.44,
  'quant-ph': 2.0
};

const risingStars = [
  { name: 'Michael W. Mahoney', acceleration: 8.0, institution: 'International Computer Science Institute' },
  { name: 'Junchi Yan', acceleration: 8.0, institution: 'Shanghai Jiao Tong University' },
  { name: 'James Zou', acceleration: 8.0, institution: null }
];

// Scoring function with weighted criteria
function scorePaper(paper) {
  const text = (paper.title + ' ' + paper.abstract).toLowerCase();
  const reasons = [];

  // Novelty (30%)
  const noveltyKeywords = ['novel', 'new', 'first', 'breakthrough', 'unprecedented', 'innovative', 'original', 'pioneering'];
  const noveltyCount = noveltyKeywords.filter(kw => text.includes(kw)).length;
  const novelty = Math.min((noveltyCount / noveltyKeywords.length) * 30, 30);

  // Impact potential (25%)
  const impactKeywords = ['practical', 'efficient', 'scalable', 'sota', 'state-of-the-art', 'outperform',
                         'superior', 'improve', 'advance', 'significantly', 'benchmark', 'real-world'];
  const impactCount = impactKeywords.filter(kw => text.includes(kw)).length;
  const impact = Math.min((impactCount / impactKeywords.length) * 25, 25);

  // Author notability (20%)
  const authorNotability = paper.author_notability_score || 0;
  const author = Math.min((authorNotability / 10) * 20, 20);

  // Research quality (15%)
  const qualityKeywords = ['rigorous', 'comprehensive', 'benchmark', 'experimental', 'evaluation',
                          'extensive', 'thorough', 'systematic', 'ablation', 'validation'];
  const qualityCount = qualityKeywords.filter(kw => text.includes(kw)).length;
  const quality = Math.min((qualityCount / qualityKeywords.length) * 15, 15);

  // Timeliness (10%)
  const timelinessKeywords = ['llm', 'large language model', 'diffusion', 'multimodal', 'transformer',
                             'gpt', 'attention', 'deep learning', 'neural network', 'generative',
                             'foundation model', 'reasoning', 'agent'];
  const timelinessCount = timelinessKeywords.filter(kw => text.includes(kw)).length;
  const timeliness = Math.min((timelinessCount / timelinessKeywords.length) * 10, 10);

  // Bonus for trending categories
  let categoryBonus = 0;
  let trendingCat = null;
  for (const cat of paper.categories) {
    if (trendingAreas[cat]) {
      categoryBonus = 5 * trendingAreas[cat];
      trendingCat = cat;
      break;
    }
  }

  // Check for rising stars
  const authorNames = paper.authors.map(a => a.name);
  const hasRisingStar = risingStars.some(star =>
    authorNames.some(name => name.toLowerCase().includes(star.name.toLowerCase()) ||
                            star.name.toLowerCase().includes(name.toLowerCase()))
  );

  const totalScore = novelty + impact + author + quality + timeliness + categoryBonus;

  // Generate reasons
  if (novelty > 5) reasons.push('Strong novelty indicators');
  if (impact > 4) reasons.push('High impact potential');
  if (author > 5) reasons.push('Notable authors');
  if (quality > 3) reasons.push('Rigorous methodology');
  if (timeliness > 2) reasons.push('Trending AI/ML topics');
  if (categoryBonus > 0) reasons.push(`Fast-growing category (${trendingCat})`);
  if (hasRisingStar) reasons.push('Rising star author');

  const breakdown = {
    novelty: Math.round(novelty * 10) / 10,
    impact: Math.round(impact * 10) / 10,
    author_notability: Math.round(author * 10) / 10,
    quality: Math.round(quality * 10) / 10,
    timeliness: Math.round(timeliness * 10) / 10,
    category_bonus: Math.round(categoryBonus * 10) / 10
  };

  return {
    score: Math.round(totalScore * 100) / 100,
    reasons: reasons.length > 0 ? reasons.join('; ') : 'Balanced performance',
    breakdown
  };
}

// Score all papers
const scoredPapers = data.papers.map(paper => {
  const { score, reasons, breakdown } = scorePaper(paper);
  return { ...paper, score, reasons, score_breakdown: breakdown };
});

// Sort by score
scoredPapers.sort((a, b) => b.score - a.score);

// Top papers
const topPapers = scoredPapers.slice(0, 15);

console.log('\n=== TOP 10 PAPERS ===\n');
topPapers.slice(0, 10).forEach((paper, idx) => {
  console.log(`${idx + 1}. [Score: ${paper.score.toFixed(2)}] ${paper.title}`);
  console.log(`   Authors: ${paper.authors.map(a => a.name).slice(0, 3).join(', ')}${paper.authors.length > 3 ? ', et al.' : ''}`);
  console.log(`   Categories: ${paper.categories.join(', ')}`);
  const b = paper.score_breakdown;
  console.log(`   Breakdown: Novelty=${b.novelty} Impact=${b.impact} Author=${b.author_notability} Quality=${b.quality} Timeliness=${b.timeliness} Bonus=${b.category_bonus}`);
  console.log(`   Reasons: ${paper.reasons}`);
  console.log(`   URL: ${paper.arxiv_url}`);
  console.log('');
});

// Collect notable authors
const authorStats = {};
data.papers.forEach(paper => {
  paper.authors.forEach(author => {
    if (!authorStats[author.name]) {
      authorStats[author.name] = {
        name: author.name,
        affiliation: author.affiliation,
        paper_count_today: 0,
        papers: [],
        total_notability: author.notability_score || 0
      };
    }
    authorStats[author.name].paper_count_today++;
    authorStats[author.name].papers.push(paper.arxiv_id);
  });
});

// Find notable authors (multiple papers or rising stars)
const notableAuthors = Object.values(authorStats)
  .filter(author => author.paper_count_today > 1 || author.total_notability > 20)
  .sort((a, b) => b.paper_count_today - a.paper_count_today);

console.log('\n=== NOTABLE AUTHORS (Multiple Papers Today) ===\n');
if (notableAuthors.length > 0) {
  notableAuthors.slice(0, 10).forEach(author => {
    console.log(`${author.name}: ${author.paper_count_today} papers`);
    if (author.affiliation) console.log(`  Affiliation: ${author.affiliation}`);
  });
} else {
  console.log('No authors with multiple papers today.');
}

// Check for rising stars in today's papers
console.log('\n=== RISING STARS IN TODAY\'S PAPERS ===\n');
risingStars.forEach(star => {
  const foundPapers = data.papers.filter(paper =>
    paper.authors.some(author =>
      author.name.includes(star.name) || star.name.includes(author.name)
    )
  );
  if (foundPapers.length > 0) {
    console.log(`${star.name} (${star.institution || 'Unknown institution'}):`);
    console.log(`  ${foundPapers.length} paper(s) today`);
    foundPapers.forEach(p => console.log(`  - ${p.title}`));
  }
});

// Output structured data for report generation
const outputData = {
  total_papers: data.total_papers,
  analysis_date: '2025-10-29',
  scoring_criteria: {
    novelty: '30%',
    impact: '25%',
    author_notability: '20%',
    quality: '15%',
    timeliness: '10%',
    category_bonus: 'up to 14.5 points for trending categories'
  },
  top_papers: topPapers.slice(0, 10).map((p, idx) => ({
    rank: idx + 1,
    title: p.title,
    authors: p.authors.map(a => a.name),
    abstract: p.abstract,
    categories: p.categories,
    arxiv_id: p.arxiv_id,
    published: p.published,
    pdf_url: p.pdf_url,
    arxiv_url: p.arxiv_url,
    score: p.score,
    score_breakdown: p.score_breakdown,
    author_notability_score: p.author_notability_score || 0,
    reasoning: p.reasons
  })),
  notable_authors: notableAuthors.slice(0, 5).map(a => ({
    name: a.name,
    paper_count: a.paper_count_today,
    average_notability: Math.round(a.total_notability / a.paper_count_today * 100) / 100 || 0,
    affiliation: a.affiliation,
    sample_papers: a.papers.slice(0, 3)
  })),
  rising_stars_papers: risingStars.map(star => {
    const papers = data.papers.filter(paper =>
      paper.authors.some(author =>
        author.name.toLowerCase().includes(star.name.toLowerCase()) ||
        star.name.toLowerCase().includes(author.name.toLowerCase())
      )
    );
    return papers.length > 0 ? {
      rising_star: star.name,
      institution: star.institution,
      papers: papers.map(p => ({
        title: p.title,
        authors: p.authors.map(a => a.name),
        abstract: p.abstract.length > 400 ? p.abstract.substring(0, 400) + '...' : p.abstract,
        arxiv_id: p.arxiv_id,
        arxiv_url: p.arxiv_url,
        score: scoredPapers.find(sp => sp.arxiv_id === p.arxiv_id)?.score || 0,
        categories: p.categories
      }))
    } : null;
  }).filter(Boolean)
};

fs.writeFileSync(
  '/Users/bartdecrem/Documents/Dropbox/coding2025/vibeceo8/sms-bot/data/arxiv-reports/analysis_output_2025-10-29.json',
  JSON.stringify(outputData, null, 2)
);

console.log('\n' + '='.repeat(80));
console.log('Analysis complete. Output saved to analysis_output_2025-10-29.json');
console.log('='.repeat(80));
