-- Check if tables are in the supabase_realtime publication
-- Run this in Supabase SQL Editor

-- List all tables in supabase_realtime publication
SELECT
    schemaname,
    tablename
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime';

-- If todos and projects are NOT listed, run:
-- ALTER PUBLICATION supabase_realtime ADD TABLE todos;
-- ALTER PUBLICATION supabase_realtime ADD TABLE projects;
