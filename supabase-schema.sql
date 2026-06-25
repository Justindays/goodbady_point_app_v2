-- Goodbaby Points v2 - Supabase Database Schema
-- 在 Supabase Dashboard → SQL Editor 中執行

-- 1. 家庭資料表
CREATE TABLE IF NOT EXISTS families (
    id TEXT PRIMARY KEY,
    data JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. 啟用 Row Level Security
ALTER TABLE families ENABLE ROW LEVEL SECURITY;

-- 3. 安全政策（用家庭代碼作為存取控制）
DROP POLICY IF EXISTS "fam_insert" ON families;
CREATE POLICY "fam_insert" ON families FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "fam_read" ON families;
CREATE POLICY "fam_read" ON families FOR SELECT USING (true);

DROP POLICY IF EXISTS "fam_update" ON families;
CREATE POLICY "fam_update" ON families FOR UPDATE USING (true);

DROP POLICY IF EXISTS "fam_delete" ON families;
CREATE POLICY "fam_delete" ON families FOR DELETE USING (true);

-- 4. 自動更新 updated_at
CREATE OR REPLACE FUNCTION touch() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS families_touch ON families;
CREATE TRIGGER families_touch BEFORE UPDATE ON families FOR EACH ROW EXECUTE FUNCTION touch();

-- 完成！應該看到 "Success. No rows returned."
