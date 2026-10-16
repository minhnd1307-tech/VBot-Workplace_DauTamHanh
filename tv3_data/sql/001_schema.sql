-- =============================================================================
SET client_min_messages = warning;
-- VBot Workplace - Schema tầng dữ liệu (TV3)
-- Cloud SQL PostgreSQL 16 + pgvector. Cô lập dữ liệu bằng Row-Level Security (RLS).
--
-- Nguyên tắc:
--  * App KHÔNG đăng nhập bằng owner của bảng. Role vbot_app không có BYPASSRLS.
--  * Mỗi request, gateway mở transaction và đặt danh tính đã xác thực (từ SSO/JWT):
--      SET LOCAL app.user_id    = '<uuid user>';
--      SET LOCAL app.principals = '{user:<email>,group:<g1>,group:<g2>,domain:<d>}';
--    principals lấy từ IdP (nhóm) và được connector đồng bộ, không do LLM sinh ra.
--  * Mọi truy vấn (kể cả tìm kiếm vector) đều đi qua policy => lọc quyền nằm TRONG
--    câu truy vấn ANN, không phải lọc sau ở tầng ứng dụng.
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS vector;

-- Role ứng dụng: không phải owner, không BYPASSRLS
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'vbot_app') THEN
    CREATE ROLE vbot_app NOLOGIN NOBYPASSRLS;
  END IF;
END $$;

-- Danh tính hiện tại (NULL nếu chưa SET => policy trả về 0 dòng, fail-closed)
CREATE OR REPLACE FUNCTION app_user_id() RETURNS uuid
LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('app.user_id', true), '')::uuid $$;

CREATE OR REPLACE FUNCTION app_principals() RETURNS text[]
LANGUAGE sql STABLE AS $$ SELECT coalesce(nullif(current_setting('app.principals', true), '')::text[], '{}') $$;

-- -----------------------------------------------------------------------------
-- 1. Người dùng
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  user_id     uuid PRIMARY KEY,
  email       text UNIQUE NOT NULL,
  org_unit    text NOT NULL,                 -- đơn vị, dùng cho quota/chi phí theo đơn vị (H8)
  quota_bytes bigint NOT NULL DEFAULT 10737418240,  -- 10 GB/user
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- 2. Knowledge base dùng chung, lọc theo ACL gốc của tài liệu (vector_db)
-- -----------------------------------------------------------------------------
-- acl_principals: danh sách principal được đọc tài liệu ở hệ thống gốc
-- (Drive permission, SharePoint group, Confluence space, Jira project...).
-- Connector cập nhật cột này mỗi lần đồng bộ quyền (delta sync 15 phút hoặc webhook).
CREATE TABLE IF NOT EXISTS documents (
  doc_id          bigserial PRIMARY KEY,
  source          text NOT NULL CHECK (source IN ('gdrive','gmail','sharepoint','onedrive','outlook','teams','notion','jira','confluence','upload')),
  external_id     text NOT NULL,
  title           text,
  url             text,
  acl_principals  text[] NOT NULL,
  classification  text NOT NULL DEFAULT 'internal' CHECK (classification IN ('public','internal','confidential','restricted')),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  deleted         boolean NOT NULL DEFAULT false,
  UNIQUE (source, external_id)
);
CREATE INDEX IF NOT EXISTS documents_acl_gin ON documents USING gin (acl_principals);

CREATE TABLE IF NOT EXISTS chunks (
  chunk_id        bigserial PRIMARY KEY,
  doc_id          bigint NOT NULL REFERENCES documents(doc_id) ON DELETE CASCADE,
  -- Bản sao ACL của tài liệu cha, để policy lọc ngay trên bảng chunk khi quét HNSW
  acl_principals  text[] NOT NULL,
  content         text NOT NULL,
  embedding       vector(768) NOT NULL       -- text-embedding-004
);
CREATE INDEX IF NOT EXISTS chunks_acl_gin ON chunks USING gin (acl_principals);
CREATE INDEX IF NOT EXISTS chunks_embedding_hnsw ON chunks USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 64);

-- Khi ACL tài liệu đổi (thu hồi quyền), chunk đổi theo ngay trong cùng transaction
CREATE OR REPLACE FUNCTION sync_chunk_acl() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  UPDATE chunks SET acl_principals = NEW.acl_principals WHERE doc_id = NEW.doc_id;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS documents_acl_sync ON documents;
CREATE TRIGGER documents_acl_sync AFTER UPDATE OF acl_principals ON documents
  FOR EACH ROW EXECUTE FUNCTION sync_chunk_acl();

-- -----------------------------------------------------------------------------
-- 3. Dữ liệu riêng tư từng người: chat, bộ nhớ dài hạn, file workspace
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS chat_sessions (
  session_id  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES users(user_id),
  title       text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Lịch sử chat giữ 12 tháng trên Cloud SQL, sau đó job tháng xuất sang GCS Coldline
CREATE TABLE IF NOT EXISTS chat_messages (
  message_id  bigserial PRIMARY KEY,
  session_id  uuid NOT NULL REFERENCES chat_sessions(session_id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES users(user_id),
  role        text NOT NULL CHECK (role IN ('user','assistant','tool')),
  content     text NOT NULL,
  task_level  smallint CHECK (task_level BETWEEN 1 AND 5),
  tokens_in   int,
  tokens_out  int,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS chat_messages_user_time ON chat_messages (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS memories (
  memory_id   bigserial PRIMARY KEY,
  user_id     uuid NOT NULL REFERENCES users(user_id),
  content     text NOT NULL,
  embedding   vector(768) NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS memories_user ON memories (user_id);

-- Metadata file trong GCS: object thật nằm ở gs://<bucket>/user-workspaces/<user_id>/<path>
CREATE TABLE IF NOT EXISTS workspace_files (
  file_id     bigserial PRIMARY KEY,
  user_id     uuid NOT NULL REFERENCES users(user_id),
  gcs_path    text NOT NULL,
  bytes       bigint NOT NULL CHECK (bytes >= 0),
  created_by  text NOT NULL CHECK (created_by IN ('upload','agent','export','image_gen')),
  created_at  timestamptz NOT NULL DEFAULT now(),
  -- Không thể ghi metadata trỏ sang workspace người khác
  CONSTRAINT gcs_path_in_own_prefix CHECK (gcs_path LIKE 'user-workspaces/' || user_id::text || '/%')
);

-- Quota 10 GB: chặn ngay ở DB, workspace-svc chỉ cấp Signed URL upload khi INSERT thành công
CREATE OR REPLACE FUNCTION enforce_quota() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE used bigint; q bigint;
BEGIN
  SELECT coalesce(sum(bytes), 0) INTO used FROM workspace_files WHERE user_id = NEW.user_id;
  SELECT quota_bytes INTO q FROM users WHERE user_id = NEW.user_id;
  IF used + NEW.bytes > q THEN
    RAISE EXCEPTION 'quota_exceeded: user % dung % + % > % bytes', NEW.user_id, used, NEW.bytes, q;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS workspace_files_quota ON workspace_files;
CREATE TRIGGER workspace_files_quota BEFORE INSERT ON workspace_files
  FOR EACH ROW EXECUTE FUNCTION enforce_quota();

-- -----------------------------------------------------------------------------
-- 4. ROW-LEVEL SECURITY
-- -----------------------------------------------------------------------------
ALTER TABLE documents       ENABLE ROW LEVEL SECURITY;
ALTER TABLE chunks          ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_sessions   ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages   ENABLE ROW LEVEL SECURITY;
ALTER TABLE memories        ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE users           ENABLE ROW LEVEL SECURITY;

-- Tài liệu và chunk: chỉ thấy khi giao giữa ACL gốc và principal của mình khác rỗng
DROP POLICY IF EXISTS documents_acl ON documents;
CREATE POLICY documents_acl ON documents FOR SELECT TO vbot_app
  USING (NOT deleted AND acl_principals && app_principals());

DROP POLICY IF EXISTS chunks_acl ON chunks;
CREATE POLICY chunks_acl ON chunks FOR SELECT TO vbot_app
  USING (acl_principals && app_principals());

-- Dữ liệu riêng: chỉ chủ sở hữu đọc/ghi
DROP POLICY IF EXISTS own_sessions ON chat_sessions;
CREATE POLICY own_sessions ON chat_sessions FOR ALL TO vbot_app
  USING (user_id = app_user_id()) WITH CHECK (user_id = app_user_id());

DROP POLICY IF EXISTS own_messages ON chat_messages;
CREATE POLICY own_messages ON chat_messages FOR ALL TO vbot_app
  USING (user_id = app_user_id()) WITH CHECK (user_id = app_user_id());

DROP POLICY IF EXISTS own_memories ON memories;
CREATE POLICY own_memories ON memories FOR ALL TO vbot_app
  USING (user_id = app_user_id()) WITH CHECK (user_id = app_user_id());

DROP POLICY IF EXISTS own_files ON workspace_files;
CREATE POLICY own_files ON workspace_files FOR ALL TO vbot_app
  USING (user_id = app_user_id()) WITH CHECK (user_id = app_user_id());

DROP POLICY IF EXISTS own_user ON users;
CREATE POLICY own_user ON users FOR SELECT TO vbot_app
  USING (user_id = app_user_id());

GRANT SELECT ON documents, chunks, users TO vbot_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON chat_sessions, chat_messages, memories, workspace_files TO vbot_app;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO vbot_app;

-- -----------------------------------------------------------------------------
-- 5. Hàm tìm kiếm RAG: SECURITY INVOKER => chạy dưới RLS của người gọi
-- -----------------------------------------------------------------------------
-- hnsw.iterative_scan (pgvector >= 0.8): HNSW quét tiếp khi policy loại bớt dòng,
-- nên user có ít quyền vẫn nhận đủ k kết quả hợp lệ.
CREATE OR REPLACE FUNCTION search_kb(q vector(768), k int DEFAULT 8)
RETURNS TABLE (chunk_id bigint, doc_id bigint, content text, distance float8)
LANGUAGE sql STABLE SECURITY INVOKER
SET hnsw.iterative_scan = 'relaxed_order' AS $$
  SELECT c.chunk_id, c.doc_id, c.content, c.embedding <=> q AS distance
  FROM chunks c
  ORDER BY c.embedding <=> q
  LIMIT k
$$;

CREATE OR REPLACE FUNCTION search_memory(q vector(768), k int DEFAULT 5)
RETURNS TABLE (memory_id bigint, content text, distance float8)
LANGUAGE sql STABLE SECURITY INVOKER AS $$
  SELECT m.memory_id, m.content, m.embedding <=> q FROM memories m
  ORDER BY m.embedding <=> q LIMIT k
$$;

GRANT EXECUTE ON FUNCTION search_kb(vector, int), search_memory(vector, int), app_user_id(), app_principals() TO vbot_app;
