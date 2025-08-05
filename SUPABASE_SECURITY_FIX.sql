-- 🔒 SUPABASE SECURITY FIX
-- Fix Row Level Security policies to restrict data access

-- First, drop the overly permissive existing policy
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON user_purchases;

-- Create secure policies that only allow users to access their own data

-- Policy 1: Users can only read their own purchase data
CREATE POLICY "Users can read own purchase data" ON user_purchases
FOR SELECT USING (
  auth.jwt() ->> 'email' = email
);

-- Policy 2: Users can only insert their own purchase data
CREATE POLICY "Users can insert own purchase data" ON user_purchases
FOR INSERT WITH CHECK (
  auth.jwt() ->> 'email' = email
);

-- Policy 3: Users can only update their own purchase data
CREATE POLICY "Users can update own purchase data" ON user_purchases
FOR UPDATE USING (
  auth.jwt() ->> 'email' = email
) WITH CHECK (
  auth.jwt() ->> 'email' = email
);

-- Policy 4: Users can only delete their own purchase data (if needed)
CREATE POLICY "Users can delete own purchase data" ON user_purchases
FOR DELETE USING (
  auth.jwt() ->> 'email' = email
);

-- Ensure RLS is enabled on the table
ALTER TABLE user_purchases ENABLE ROW LEVEL SECURITY;

-- Grant necessary permissions to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON user_purchases TO authenticated;

-- Optional: Create an index on email for better performance
CREATE INDEX IF NOT EXISTS idx_user_purchases_email ON user_purchases(email);

-- Verify the policies are working
-- You can test with: SELECT * FROM user_purchases; (should only show current user's data)