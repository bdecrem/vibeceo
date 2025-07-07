-- Add recursive genealogy function for complete family trees
-- This function finds all descendants of an app, n degrees deep
-- Date: 2025-01-06

-- Function to get complete genealogy tree for an app
CREATE OR REPLACE FUNCTION get_app_genealogy(app_id UUID)
RETURNS TABLE (
    child_app_id UUID,
    parent_app_id UUID,
    child_user_slug TEXT,
    parent_user_slug TEXT,
    child_app_slug TEXT,
    parent_app_slug TEXT,
    remix_prompt TEXT,
    generation_level INTEGER,
    created_at TIMESTAMPTZ,
    child_prompt TEXT,
    child_created_at TIMESTAMPTZ,
    path TEXT[]
) AS $$
BEGIN
    RETURN QUERY
    WITH RECURSIVE genealogy_tree AS (
        -- Base case: Direct children (generation 1)
        SELECT 
            rl.child_app_id,
            rl.parent_app_id,
            rl.child_user_slug,
            rl.parent_user_slug,
            child_content.app_slug as child_app_slug,
            parent_content.app_slug as parent_app_slug,
            rl.remix_prompt,
            1 as generation_level, -- Always 1 for direct children
            rl.created_at,
            child_content.original_prompt as child_prompt,
            child_content.created_at as child_created_at,
            ARRAY[parent_content.app_slug, child_content.app_slug] as path
        FROM wtaf_remix_lineage rl
        JOIN wtaf_content child_content ON rl.child_app_id = child_content.id
        JOIN wtaf_content parent_content ON rl.parent_app_id = parent_content.id
        WHERE rl.parent_app_id = app_id
        
        UNION ALL
        
        -- Recursive case: Children of children (generation 2, 3, 4, etc.)
        SELECT 
            rl.child_app_id,
            rl.parent_app_id,
            rl.child_user_slug,
            rl.parent_user_slug,
            child_content.app_slug as child_app_slug,
            parent_content.app_slug as parent_app_slug,
            rl.remix_prompt,
            gt.generation_level + 1 as generation_level, -- Increment from parent's generation
            rl.created_at,
            child_content.original_prompt as child_prompt,
            child_content.created_at as child_created_at,
            gt.path || child_content.app_slug as path
        FROM wtaf_remix_lineage rl
        JOIN wtaf_content child_content ON rl.child_app_id = child_content.id
        JOIN wtaf_content parent_content ON rl.parent_app_id = parent_content.id
        JOIN genealogy_tree gt ON rl.parent_app_id = gt.child_app_id
        WHERE array_length(gt.path, 1) < 10  -- Prevent infinite loops (max 10 generations)
    )
    SELECT 
        gt.child_app_id,
        gt.parent_app_id,
        gt.child_user_slug,
        gt.parent_user_slug,
        gt.child_app_slug,
        gt.parent_app_slug,
        gt.remix_prompt,
        gt.generation_level,
        gt.created_at,
        gt.child_prompt,
        gt.child_created_at,
        gt.path
    FROM genealogy_tree gt
    ORDER BY gt.generation_level ASC, gt.created_at ASC;
END;
$$ LANGUAGE plpgsql;

-- Function to get genealogy tree as JSON (easier for frontend)
CREATE OR REPLACE FUNCTION get_app_genealogy_json(app_id UUID)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    WITH genealogy_data AS (
        SELECT * FROM get_app_genealogy(app_id)
    ),
    structured_tree AS (
        SELECT 
            json_agg(
                json_build_object(
                    'child_app_id', child_app_id,
                    'parent_app_id', parent_app_id,
                    'child_user_slug', child_user_slug,
                    'parent_user_slug', parent_user_slug,
                    'child_app_slug', child_app_slug,
                    'parent_app_slug', parent_app_slug,
                    'remix_prompt', remix_prompt,
                    'generation_level', generation_level,
                    'created_at', created_at,
                    'child_prompt', child_prompt,
                    'child_created_at', child_created_at,
                    'path', path,
                    'depth', array_length(path, 1) - 1
                )
                ORDER BY generation_level ASC, created_at ASC
            ) as genealogy_tree
        FROM genealogy_data
    )
    SELECT genealogy_tree INTO result FROM structured_tree;
    
    RETURN COALESCE(result, '[]'::json);
END;
$$ LANGUAGE plpgsql;

-- Function to get genealogy stats for an app
CREATE OR REPLACE FUNCTION get_app_genealogy_stats(app_id UUID)
RETURNS TABLE (
    total_descendants INTEGER,
    max_generation INTEGER,
    direct_remixes INTEGER,
    most_recent_remix TIMESTAMPTZ,
    deepest_path TEXT[]
) AS $$
BEGIN
    RETURN QUERY
    WITH genealogy_data AS (
        SELECT * FROM get_app_genealogy(app_id)
    )
    SELECT 
        COUNT(*)::INTEGER as total_descendants,
        MAX(generation_level)::INTEGER as max_generation,
        COUNT(CASE WHEN generation_level = 1 THEN 1 END)::INTEGER as direct_remixes,
        MAX(created_at) as most_recent_remix,
        (SELECT path FROM genealogy_data ORDER BY array_length(path, 1) DESC LIMIT 1) as deepest_path
    FROM genealogy_data;
END;
$$ LANGUAGE plpgsql;

-- Add comments for documentation
COMMENT ON FUNCTION get_app_genealogy(UUID) IS 'Recursively finds all descendants of an app, returning complete family tree with generation levels';
COMMENT ON FUNCTION get_app_genealogy_json(UUID) IS 'Returns genealogy tree as structured JSON for frontend consumption';
COMMENT ON FUNCTION get_app_genealogy_stats(UUID) IS 'Returns summary statistics about an apps genealogy tree';

-- Create indexes to optimize genealogy queries
CREATE INDEX IF NOT EXISTS idx_remix_lineage_parent_child ON wtaf_remix_lineage(parent_app_id, child_app_id);
CREATE INDEX IF NOT EXISTS idx_remix_lineage_generation ON wtaf_remix_lineage(parent_app_id, generation_level); 