
-- Remove the conflicting constraint if it exists
DO $$ 
BEGIN
    -- Drop the constraint if it exists
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints 
               WHERE constraint_name = 'users_username_key' 
               AND table_name = 'users') THEN
        ALTER TABLE users DROP CONSTRAINT users_username_key;
        RAISE NOTICE 'Dropped constraint users_username_key';
    END IF;
    
    -- Drop the index if it exists
    IF EXISTS (SELECT 1 FROM pg_indexes 
               WHERE indexname = 'users_username_key') THEN
        DROP INDEX users_username_key;
        RAISE NOTICE 'Dropped index users_username_key';
    END IF;
    
    -- Drop username column if it exists and is not needed
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'users' AND column_name = 'username') THEN
        ALTER TABLE users DROP COLUMN username;
        RAISE NOTICE 'Dropped column username';
    END IF;
END $$;
