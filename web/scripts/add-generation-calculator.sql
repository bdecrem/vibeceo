-- Function to calculate the generation level of a single app
-- Uses same recursive logic as get_app_genealogy but for one app
-- Date: 2025-01-06

CREATE OR REPLACE FUNCTION get_app_generation_level(app_id UUID)
RETURNS INTEGER AS $$
DECLARE
    generation_level INTEGER := 0;
    current_app_id UUID := app_id;
    parent_app_id UUID;
BEGIN
    -- Walk up the lineage tree to count generations
    LOOP
        -- Check if current app is a remix (has a parent)
        SELECT rl.parent_app_id INTO parent_app_id
        FROM wtaf_remix_lineage rl
        WHERE rl.child_app_id = current_app_id;
        
        -- If no parent found, we've reached the original app
        IF parent_app_id IS NULL THEN
            EXIT;
        END IF;
        
        -- Move up one generation
        generation_level := generation_level + 1;
        current_app_id := parent_app_id;
        
        -- Safety check to prevent infinite loops
        IF generation_level > 10 THEN
            RAISE WARNING 'Generation level exceeded 10, stopping recursion for app %', app_id;
            EXIT;
        END IF;
    END LOOP;
    
    RETURN generation_level;
END;
$$ LANGUAGE plpgsql;

-- Add comment for documentation
COMMENT ON FUNCTION get_app_generation_level(UUID) IS 'Calculate the generation level of a single app by walking up the lineage tree. Returns 0 for originals, 1 for first remixes, etc.'; 