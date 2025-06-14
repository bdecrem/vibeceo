-- Add index_file column to sms_subscribers table
-- This column will store the filename of the user's index page (e.g., "my-app.html")
-- When users visit wtaf.me/their-slug/, they'll be redirected to their index page

ALTER TABLE sms_subscribers 
ADD COLUMN index_file TEXT;

-- Add a comment to document the column
COMMENT ON COLUMN sms_subscribers.index_file IS 'Filename of the users index page for wtaf.me/slug/ redirect (e.g., "my-app.html")';
