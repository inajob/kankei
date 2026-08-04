-- ============================================================
-- ConceptNet Supabase Schema
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor)
-- ============================================================

-- ノードテーブル
CREATE TABLE IF NOT EXISTS nodes (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- エッジテーブル
CREATE TABLE IF NOT EXISTS edges (
  id TEXT PRIMARY KEY,
  node1 TEXT NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
  node2 TEXT NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  UNIQUE(node1, node2)
);

-- プロフィールテーブル（ユーザー表示名用）
-- nodes_deleteポリシーがprofilesを参照するため、先に作成
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE,
  display_name TEXT,
  avatar_url TEXT,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_select" ON profiles FOR SELECT USING (true);
CREATE POLICY "profiles_insert" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update" ON profiles FOR UPDATE USING (auth.uid() = id);

-- 新規ユーザー登録時にプロフィールを自動作成するトリガー
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- インデックス
CREATE INDEX IF NOT EXISTS idx_edges_node1 ON edges(node1);
CREATE INDEX IF NOT EXISTS idx_edges_node2 ON edges(node2);
CREATE INDEX IF NOT EXISTS idx_edges_created_at ON edges(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_nodes_name ON nodes(name);
CREATE INDEX IF NOT EXISTS idx_nodes_created_by ON nodes(created_by);
CREATE INDEX IF NOT EXISTS idx_edges_created_by ON edges(created_by);

-- ============================================================
-- GRANT（認証済みユーザーに権限付与）
-- ============================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON nodes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON edges TO authenticated;
GRANT SELECT, INSERT, UPDATE ON profiles TO authenticated;
GRANT SELECT ON nodes TO anon;
GRANT SELECT ON edges TO anon;
GRANT SELECT ON profiles TO anon;

-- ============================================================
-- Row Level Security (RLS)
-- 認証済みユーザーは全操作可能（全共有モデル）
-- ============================================================

ALTER TABLE nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE edges ENABLE ROW LEVEL SECURITY;

-- nodes: 全ユーザー読み書き可、削除は作成者またはadminのみ
CREATE POLICY "nodes_select" ON nodes FOR SELECT USING (true);
CREATE POLICY "nodes_insert" ON nodes FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "nodes_update" ON nodes FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "nodes_delete" ON nodes FOR DELETE USING (
  created_by = auth.uid()
  OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- edges: 全ユーザー読み書き可
CREATE POLICY "edges_select" ON edges FOR SELECT USING (true);
CREATE POLICY "edges_insert" ON edges FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "edges_update" ON edges FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "edges_delete" ON edges FOR DELETE USING (auth.role() = 'authenticated');

-- ============================================================
-- Realtime (ダッシュボードで手動有効化が必要な場合あり)
-- Dashboard → Database → Replication → supabase_realtime パブリケーションに追加
-- ============================================================

-- 孤立ノード取得関数
CREATE OR REPLACE FUNCTION get_isolated_node_ids()
RETURNS SETOF text AS $$
  SELECT n.id FROM nodes n
  WHERE NOT EXISTS (
    SELECT 1 FROM edges e WHERE e.node1 = n.id OR e.node2 = n.id
  );
$$ LANGUAGE sql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_isolated_node_ids() TO authenticated;
GRANT EXECUTE ON FUNCTION get_isolated_node_ids() TO anon;

-- 最近接続されたノード取得関数（overview の並び順用）
-- 直近 max_count 件のエッジだけを読み、その両端ノードに最終接続時刻を付与して返す。
-- edges(created_at DESC) のインデックスにより O(max_count) で済む（E 非依存・負荷一定）。
CREATE OR REPLACE FUNCTION get_recent_connections(max_count integer DEFAULT 200)
RETURNS TABLE(node_id text, last_connected_at timestamptz) AS $$
  WITH recent AS (
    SELECT node1, node2, created_at FROM edges ORDER BY created_at DESC LIMIT max_count
  )
  SELECT nid, MAX(ts) AS last_connected_at FROM (
    SELECT node1 AS nid, created_at AS ts FROM recent
    UNION ALL
    SELECT node2 AS nid, created_at AS ts FROM recent
  ) t
  GROUP BY nid
  ORDER BY last_connected_at DESC;
$$ LANGUAGE sql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_recent_connections(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION get_recent_connections(integer) TO anon;
