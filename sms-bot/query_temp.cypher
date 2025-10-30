MATCH (p:Paper)-[:IN_CATEGORY]->(c:Category)
WHERE p.published_date >= date('2025-10-26')
  AND (p.title =~ '(?i).*(robot|embodied|physical|manipulation|navigation|humanoid|locomotion|grasping|hardware).*'
       OR p.abstract =~ '(?i).*(physical AI|embodied AI|robotics|manipulation|real-world deployment|physical interaction|hardware).*')
RETURN p.arxiv_id, p.title, substring(p.abstract, 0, 200) as abstract_preview, p.published_date
ORDER BY p.published_date DESC
LIMIT 5
