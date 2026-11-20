-- ============================================================
-- Migration 001 — Tighten Supabase RLS on votes and transactions
-- Run in: Supabase Dashboard → SQL Editor
-- ============================================================

-- ── votes table ──────────────────────────────────────────────
-- Drop any overly-permissive insert policy that lets the public
-- write arbitrary token_amount values.
DROP POLICY IF EXISTS "votes: insert for all"           ON votes;
DROP POLICY IF EXISTS "Enable insert for authenticated" ON votes;
DROP POLICY IF EXISTS "Allow public insert"             ON votes;

-- New policy: allow insert only when token_amount is exactly 1.
-- The oracle always reads token_amount from the DB, not from the
-- client, so this caps voting power without breaking the flow.
CREATE POLICY "votes: insert capped"
    ON votes
    FOR INSERT
    WITH CHECK (
        token_amount = 1               -- exactly 1 token per vote row
        AND vote IS NOT NULL           -- must specify YES or NO
        AND milestone_id IS NOT NULL   -- must reference a milestone
        AND wallet_address IS NOT NULL -- must include voter address
    );

-- Keep existing SELECT / UPDATE policies unchanged.


-- ── transactions table ───────────────────────────────────────
-- Cap anon inserts to small, plausible amounts (matches VITE_MAX_FUND_BCH = 0.01).
DROP POLICY IF EXISTS "transactions: insert for all" ON transactions;
DROP POLICY IF EXISTS "Enable insert for authenticated" ON transactions;

CREATE POLICY "transactions: insert capped"
    ON transactions
    FOR INSERT
    WITH CHECK (
        amount > 0
        AND amount <= 0.01   -- cap matches VITE_MAX_FUND_BCH env var
    );
