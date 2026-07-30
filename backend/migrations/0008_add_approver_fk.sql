-- Add foreign key constraint on approvals.approver_id → users(id).
-- 
-- The runtime insert fix (commit 5954aa2) now provides valid user UUIDs,
-- but historical rows may contain orphaned approver_id values (e.g. from
-- the Uuid::nil() era). Clean those up before adding the constraint.

-- Step 1: Remove any orphaned approval records before adding FK constraint
DELETE FROM approvals
WHERE approver_id IS NOT NULL
  AND approver_id NOT IN (SELECT id FROM users);

-- Step 2: Add the foreign key constraint (safe now that orphaned rows are removed)
ALTER TABLE approvals
    DROP CONSTRAINT IF EXISTS approvals_approver_id_fkey;

ALTER TABLE approvals
    ADD CONSTRAINT approvals_approver_id_fkey
    FOREIGN KEY (approver_id)
    REFERENCES users(id);

-- Run with: sqlx migrate run
