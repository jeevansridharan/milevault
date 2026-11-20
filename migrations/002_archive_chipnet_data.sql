-- ============================================================
-- Migration 002 — Archive legacy Chipnet (bchtest:) data
--
-- Run in: Supabase Dashboard → SQL Editor
-- Purpose: Remove testnet rows so they don't appear in the
--          mainnet UI and don't interfere with oracle startup.
--
-- Strategy:
--   1. Find all contracts with bchtest: addresses
--   2. Collect their project_ids
--   3. Delete votes, transactions, milestones, contracts, projects
--      for those project_ids (cascade order to respect FK constraints)
--
-- ⚠ This is IRREVERSIBLE. All testnet data will be permanently deleted.
--   Back up your Supabase data first if you need any chipnet records.
-- ============================================================

-- Step 1: Identify chipnet project IDs (read-only check — run this first to preview)
-- SELECT project_id, contract_address FROM contracts WHERE contract_address LIKE 'bchtest:%';

-- ─────────────────────────────────────────────────────────────────────────────
-- Step 2: Delete in FK-safe order (children before parents)
-- ─────────────────────────────────────────────────────────────────────────────

-- 2a. Delete votes for chipnet milestones
DELETE FROM votes
WHERE milestone_id IN (
    SELECT m.id
    FROM milestones m
    WHERE m.project_id IN (
        SELECT c.project_id
        FROM contracts c
        WHERE c.contract_address LIKE 'bchtest:%'
    )
);

-- 2b. Delete transactions for chipnet projects
DELETE FROM transactions
WHERE project_id IN (
    SELECT c.project_id
    FROM contracts c
    WHERE c.contract_address LIKE 'bchtest:%'
);

-- 2c. Delete milestones for chipnet projects
DELETE FROM milestones
WHERE project_id IN (
    SELECT c.project_id
    FROM contracts c
    WHERE c.contract_address LIKE 'bchtest:%'
);

-- 2d. Delete contract rows
DELETE FROM contracts
WHERE contract_address LIKE 'bchtest:%';

-- 2e. Delete projects that now have no contract row
--     (catches chipnet projects whose contracts were just deleted above,
--      plus any orphaned projects with no contract at all)
DELETE FROM projects
WHERE id NOT IN (
    SELECT DISTINCT project_id FROM contracts
);

-- ─────────────────────────────────────────────────────────────────────────────
-- Step 3: Verify — should return 0 rows after migration
-- ─────────────────────────────────────────────────────────────────────────────
-- SELECT COUNT(*) AS remaining_chipnet_contracts
-- FROM contracts
-- WHERE contract_address LIKE 'bchtest:%';
