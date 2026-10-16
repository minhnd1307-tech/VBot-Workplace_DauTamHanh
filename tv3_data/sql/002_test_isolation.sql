-- =============================================================================
-- Kiểm thử cô lập dữ liệu: User A (alice) và User B (bob)
-- Chạy sau 001_schema.sql. Mỗi khối in PASS hoặc dừng với lỗi FAIL.
-- =============================================================================
\set ON_ERROR_STOP on
SET client_min_messages = notice;

-- ---------- Seed dữ liệu (chạy bằng owner, ngoài RLS) ----------
TRUNCATE users, documents, chunks, chat_sessions, chat_messages, memories, workspace_files RESTART IDENTITY CASCADE;

INSERT INTO users (user_id, email, org_unit) VALUES
  ('aaaaaaaa-0000-0000-0000-000000000001', 'alice@corp.vn', 'marketing'),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'bob@corp.vn',   'finance');

-- Vector ngẫu nhiên 768 chiều cố định theo seed
SELECT setseed(0.42);
CREATE TEMP TABLE v AS
SELECT i, (SELECT array_agg(random()::real) FROM generate_series(1, 768) g WHERE i > 0)::vector(768) AS e
FROM generate_series(1, 4) i;

INSERT INTO documents (source, external_id, title, acl_principals, classification) VALUES
  ('gdrive',     'drv-1', 'Kế hoạch marketing Q4 (riêng Alice)', '{user:alice@corp.vn}',  'confidential'),
  ('sharepoint', 'sp-7',  'Bảng lương 2026 (nhóm finance)',      '{group:finance}',       'restricted'),
  ('confluence', 'cf-3',  'Sổ tay nhân viên (toàn công ty)',     '{domain:corp.vn}',      'internal');

INSERT INTO chunks (doc_id, acl_principals, content, embedding)
SELECT d.doc_id, d.acl_principals, 'chunk của ' || d.title, v.e
FROM documents d JOIN v ON v.i = d.doc_id;

INSERT INTO chat_sessions (session_id, user_id, title) VALUES
  ('5e550000-0000-0000-0000-00000000000a', 'aaaaaaaa-0000-0000-0000-000000000001', 'Chat của Alice'),
  ('5e550000-0000-0000-0000-00000000000b', 'bbbbbbbb-0000-0000-0000-000000000002', 'Chat của Bob');
INSERT INTO chat_messages (session_id, user_id, role, content) VALUES
  ('5e550000-0000-0000-0000-00000000000a', 'aaaaaaaa-0000-0000-0000-000000000001', 'user', 'Bí mật của Alice'),
  ('5e550000-0000-0000-0000-00000000000b', 'bbbbbbbb-0000-0000-0000-000000000002', 'user', 'Bí mật của Bob');
INSERT INTO memories (user_id, content, embedding)
SELECT 'aaaaaaaa-0000-0000-0000-000000000001', 'Alice thích báo cáo ngắn', e FROM v WHERE i = 4;
INSERT INTO workspace_files (user_id, gcs_path, bytes, created_by) VALUES
  ('aaaaaaaa-0000-0000-0000-000000000001', 'user-workspaces/aaaaaaaa-0000-0000-0000-000000000001/q4.pptx', 5000000, 'agent');

-- Truy vấn mẫu = đúng embedding của tài liệu riêng của Alice (trường hợp xấu nhất cho Bob)
CREATE TEMP TABLE q AS SELECT e FROM v WHERE i = 1;
GRANT SELECT ON q TO vbot_app;

-- ---------- Từ đây chạy bằng role ứng dụng (không BYPASSRLS) ----------
SET ROLE vbot_app;

-- T1. Chưa đặt danh tính => không thấy gì (fail-closed)
DO $$ BEGIN
  ASSERT (SELECT count(*) FROM chunks) = 0, 'FAIL T1: chua SET danh tinh ma van thay chunk';
  ASSERT (SELECT count(*) FROM chat_messages) = 0, 'FAIL T1: chua SET danh tinh ma van thay chat';
  RAISE NOTICE 'PASS T1: khong co danh tinh => 0 dong (fail-closed)';
END $$;

-- T2. Alice tìm kiếm: thấy tài liệu riêng + toàn công ty, KHÔNG thấy bảng lương finance
BEGIN;
SET LOCAL app.user_id = 'aaaaaaaa-0000-0000-0000-000000000001';
SET LOCAL app.principals = '{user:alice@corp.vn,group:marketing,domain:corp.vn}';
DO $$ DECLARE titles text[]; BEGIN
  SELECT array_agg(d.title ORDER BY s.distance) INTO titles
  FROM search_kb((SELECT e FROM q), 8) s JOIN documents d USING (doc_id);
  ASSERT titles[1] = 'Kế hoạch marketing Q4 (riêng Alice)', 'FAIL T2: ket qua dau khong phai tai lieu cua Alice';
  ASSERT NOT ('Bảng lương 2026 (nhóm finance)' = ANY(titles)), 'FAIL T2: Alice thay bang luong';
  ASSERT (SELECT count(*) FROM chat_messages) = 1, 'FAIL T2: Alice thay chat nguoi khac';
  RAISE NOTICE 'PASS T2: Alice thay % (khong co tai lieu finance, chi 1 tin nhan cua minh)', titles;
END $$;
COMMIT;

-- T3. Bob dùng ĐÚNG vector của tài liệu Alice: vẫn không lấy được tài liệu, chat, memory, file của Alice
BEGIN;
SET LOCAL app.user_id = 'bbbbbbbb-0000-0000-0000-000000000002';
SET LOCAL app.principals = '{user:bob@corp.vn,group:finance,domain:corp.vn}';
DO $$ DECLARE titles text[]; BEGIN
  SELECT array_agg(d.title ORDER BY s.distance) INTO titles
  FROM search_kb((SELECT e FROM q), 8) s JOIN documents d USING (doc_id);
  ASSERT NOT ('Kế hoạch marketing Q4 (riêng Alice)' = ANY(titles)), 'FAIL T3: Bob thay tai lieu rieng cua Alice';
  ASSERT (SELECT count(*) FROM chat_messages WHERE content LIKE '%Alice%') = 0, 'FAIL T3: Bob doc chat cua Alice';
  ASSERT (SELECT count(*) FROM search_memory((SELECT e FROM q), 5)) = 0, 'FAIL T3: Bob doc memory cua Alice';
  ASSERT (SELECT count(*) FROM workspace_files) = 0, 'FAIL T3: Bob thay file workspace cua Alice';
  RAISE NOTICE 'PASS T3: Bob chi thay % ; 0 chat/memory/file cua Alice', titles;
END $$;
COMMIT;

-- T4. Bob cố ghi tin nhắn mang user_id của Alice => bị WITH CHECK chặn
BEGIN;
SET LOCAL app.user_id = 'bbbbbbbb-0000-0000-0000-000000000002';
SET LOCAL app.principals = '{user:bob@corp.vn,group:finance}';
DO $$ BEGIN
  BEGIN
    INSERT INTO chat_messages (session_id, user_id, role, content)
    VALUES ('5e550000-0000-0000-0000-00000000000a', 'aaaaaaaa-0000-0000-0000-000000000001', 'user', 'ghi trộm');
    RAISE EXCEPTION 'FAIL T4: Bob ghi duoc vao chat cua Alice';
  EXCEPTION WHEN insufficient_privilege THEN
    RAISE NOTICE 'PASS T4: ghi vao du lieu cua Alice bi chan (%)', SQLERRM;
  END;
END $$;
COMMIT;

-- T5. Bob cố đăng ký file trỏ sang prefix GCS của Alice => vi phạm ràng buộc prefix
BEGIN;
SET LOCAL app.user_id = 'bbbbbbbb-0000-0000-0000-000000000002';
DO $$ BEGIN
  BEGIN
    INSERT INTO workspace_files (user_id, gcs_path, bytes, created_by) VALUES
      ('bbbbbbbb-0000-0000-0000-000000000002', 'user-workspaces/aaaaaaaa-0000-0000-0000-000000000001/q4.pptx', 1, 'agent');
    RAISE EXCEPTION 'FAIL T5: Bob tro duoc sang prefix cua Alice';
  EXCEPTION WHEN check_violation THEN
    RAISE NOTICE 'PASS T5: path ngoai prefix cua minh bi chan (%)', SQLERRM;
  END;
END $$;
COMMIT;

-- T6. Quota 10 GB/user
BEGIN;
SET LOCAL app.user_id = 'aaaaaaaa-0000-0000-0000-000000000001';
DO $$ BEGIN
  BEGIN
    INSERT INTO workspace_files (user_id, gcs_path, bytes, created_by) VALUES
      ('aaaaaaaa-0000-0000-0000-000000000001', 'user-workspaces/aaaaaaaa-0000-0000-0000-000000000001/big.zip', 10737418240, 'upload');
    RAISE EXCEPTION 'FAIL T6: vuot quota ma van ghi duoc';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM LIKE 'quota_exceeded%' THEN RAISE NOTICE 'PASS T6: vuot 10 GB bi chan'; ELSE RAISE; END IF;
  END;
END $$;
COMMIT;

-- T7. Thu hồi quyền ở hệ thống gốc: connector cập nhật ACL => chunk biến mất khỏi kết quả của Bob ngay
RESET ROLE;
UPDATE documents SET acl_principals = '{group:hr}' WHERE external_id = 'sp-7';
SET ROLE vbot_app;
BEGIN;
SET LOCAL app.user_id = 'bbbbbbbb-0000-0000-0000-000000000002';
SET LOCAL app.principals = '{user:bob@corp.vn,group:finance,domain:corp.vn}';
DO $$ BEGIN
  ASSERT (SELECT count(*) FROM chunks c JOIN documents d USING (doc_id) WHERE d.external_id = 'sp-7') = 0,
    'FAIL T7: thu hoi quyen nhung Bob van thay';
  RAISE NOTICE 'PASS T7: thu hoi quyen goc => Bob khong con thay tai lieu';
END $$;
COMMIT;

RESET ROLE;
\echo '==> TAT CA 7 KIEM THU CO LAP DU LIEU: PASS'
