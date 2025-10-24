// Neo4j schema setup for arXiv Research Graph
// Run this in Neo4j Browser or via cypher-shell before loading data.

CREATE CONSTRAINT paper_arxiv_id_unique IF NOT EXISTS
FOR (p:Paper)
REQUIRE p.arxiv_id IS UNIQUE;

CREATE CONSTRAINT author_name_unique IF NOT EXISTS
FOR (a:Author)
REQUIRE a.name IS UNIQUE;

CREATE CONSTRAINT category_name_unique IF NOT EXISTS
FOR (c:Category)
REQUIRE c.name IS UNIQUE;

CREATE CONSTRAINT report_date_unique IF NOT EXISTS
FOR (r:Report)
REQUIRE r.report_date IS UNIQUE;

// Optional supporting indexes for frequent filters/ordering
CREATE INDEX paper_published_date_index IF NOT EXISTS
FOR (p:Paper)
ON (p.published_date);

CREATE INDEX author_last_seen_index IF NOT EXISTS
FOR (a:Author)
ON (a.last_seen);
