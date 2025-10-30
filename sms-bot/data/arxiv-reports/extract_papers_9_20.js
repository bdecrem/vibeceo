const fs = require('fs');

// Read the input JSON file
const data = JSON.parse(fs.readFileSync('arxiv_papers_combined_2025-10-28.json', 'utf8'));

// Get papers and sort by author_notability_score descending
let papers = data.papers;

// Sort by author_notability_score descending
papers.sort((a, b) => b.author_notability_score - a.author_notability_score);

// Extract papers 9-20 (indices 8-19)
const papers_9_20 = papers.slice(8, 20);

// Map to required fields
const output = papers_9_20.map(paper => ({
  arxiv_id: paper.arxiv_id,
  title: paper.title,
  abstract: paper.abstract,
  authors: paper.authors,
  categories: paper.categories,
  author_notability_score: paper.author_notability_score,
  arxiv_url: `https://arxiv.org/abs/${paper.arxiv_id}`,
  pdf_url: `https://arxiv.org/pdf/${paper.arxiv_id}.pdf`
}));

// Write to file
fs.writeFileSync('papers_9_20.json', JSON.stringify(output, null, 2));

console.log(`Extracted ${output.length} papers (ranks 9-20)`);
console.log('\nRanked papers 9-20:');
output.forEach((paper, index) => {
  console.log(`${index + 9}. ${paper.title.substring(0, 60)}... (score: ${paper.author_notability_score})`);
});
