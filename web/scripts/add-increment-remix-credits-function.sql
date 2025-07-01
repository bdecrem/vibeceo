-- Create function to increment remix credits for a user
CREATE OR REPLACE FUNCTION increment_remix_credits(user_slug text)
RETURNS INTEGER AS $$
DECLARE
    current_credits INTEGER;
BEGIN
    -- Get current remix credits, default to 0 if NULL
    SELECT COALESCE(total_remix_credits, 0) INTO current_credits
    FROM sms_subscribers
    WHERE slug = user_slug;
    
    -- Increment by 1
    current_credits := current_credits + 1;
    
    -- Update the user's remix credits
    UPDATE sms_subscribers
    SET total_remix_credits = current_credits
    WHERE slug = user_slug;
    
    -- Return the new value
    RETURN current_credits;
END;
$$ LANGUAGE plpgsql; 