const fs = require('fs');
const path = require('path');

// File paths
const inputFile = './arxiv_papers_combined_2025-10-28.json';
const outputFile = './top_papers_analysis.json';

console.log('Loading JSON file...');
const jsonData = JSON.parse(fs.readFileSync(inputFile, 'utf8'));

const papers = jsonData.papers || [];
console.log(`Loaded ${papers.length} papers`);

// Track data
const authorPapers = {};
const categoryCounts = {};
const papersWithScores = [];

console.log('Processing papers...');
papers.forEach((paper) => {
  const score = paper.author_notability_score || 0;
  const arxivId = paper.arxiv_id || '';

  papersWithScores.push({
    rank: 0,
    arxiv_id: arxivId,
    title: paper.title || '',
    abstract: paper.abstract || '',
    authors: paper.authors || [],
    categories: paper.categories || [],
    author_notability_score: score,
    arxiv_url: `https://arxiv.org/abs/${arxivId}`,
    pdf_url: `https://arxiv.org/pdf/${arxivId}.pdf`
  });

  // Track authors
  (paper.authors || []).forEach((author) => {
    const authorName = author.name || '';
    if (authorName) {
      if (!authorPapers[authorName]) {
        authorPapers[authorName] = { count: 0, paper_ids: [] };
      }
      authorPapers[authorName].count += 1;
      if (!authorPapers[authorName].paper_ids.includes(arxivId)) {
        authorPapers[authorName].paper_ids.push(arxivId);
      }
    }
  });

  // Track categories
  (paper.categories || []).forEach((cat) => {
    if (!categoryCounts[cat]) {
      categoryCounts[cat] = 0;
    }
    categoryCounts[cat] += 1;
  });
});

// Sort by author_notability_score
console.log('Sorting papers by author notability score...');
papersWithScores.sort((a, b) => b.author_notability_score - a.author_notability_score);

// Get top 30
const top30Papers = papersWithScores.slice(0, 30);
top30Papers.forEach((paper, idx) => {
  paper.rank = idx + 1;
});

// Get productive authors (>1 paper)
console.log('Identifying productive authors...');
const productiveAuthors = [];
Object.entries(authorPapers).forEach(([authorName, info]) => {
  if (info.count > 1) {
    productiveAuthors.push({
      name: authorName,
      paper_count: info.count,
      paper_ids: info.paper_ids
    });
  }
});

productiveAuthors.sort((a, b) => b.paper_count - a.paper_count);

// Get top categories
console.log('Sorting categories...');
const topCategories = Object.entries(categoryCounts)
  .sort((a, b) => b[1] - a[1])
  .map(([category, count]) => ({ category, count }));

// Build output
const outputData = {
  total_papers: papers.length,
  productive_authors: productiveAuthors,
  top_categories: topCategories,
  top_30_papers: top30Papers
};

// Write output
console.log(`Writing results to ${outputFile}...`);
fs.writeFileSync(outputFile, JSON.stringify(outputData, null, 2));

console.log('\nAnalysis complete!');
console.log(`Total papers: ${papers.length}`);
console.log(`Productive authors (with >1 paper): ${productiveAuthors.length}`);
console.log(`Total unique categories: ${topCategories.length}`);
console.log('\nTop 5 most productive authors:');
productiveAuthors.slice(0, 5).forEach((author) => {
  console.log(`  ${author.name}: ${author.paper_count} papers`);
});
console.log('\nTop 5 categories:');
topCategories.slice(0, 5).forEach((cat) => {
  console.log(`  ${cat.category}: ${cat.count} papers`);
});
console.log('\nTop 5 papers by author notability score:');
top30Papers.slice(0, 5).forEach((paper) => {
  const titleShort = paper.title.substring(0, 60);
  console.log(`  [${paper.rank}] ${titleShort}... (score: ${paper.author_notability_score})`);
});
