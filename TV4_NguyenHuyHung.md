# Báo cáo kết quả cá nhân: Thành viên 4 (Security, Sandbox, Governance & Reliability)

| | |
|---|---|
| **Họ tên** | Nguyen Huy Hung |
| **MSSV** | _(điền MSSV cá nhân, có thể đổi tên file thành `<MSSV>_NguyenHuyHung.md`)_ |
| **Nhóm** | G03 |
| **Dự án** | VBot Workplace: kiến trúc production trên GCP cho 2.000 DAU |
| **Vai trò** | TV4: Security, Sandbox, Governance & Reliability Specialist (SecOps / Compliance) |
| **Component báo giá phụ trách** | `sandbox`, `authn`, `authz`, `secrets_kms`, `governance`, `backup_dr`, `monitoring` |
| **Ngày lấy giá** | 2026-10-16, region `asia-southeast1` (Singapore), USD, giá niêm yết, chưa VAT |

---

## 1. Tóm tắt kết quả hoàn thành (DoD)

| Hạng mục (DoD) | Trạng thái | Chi tiết chứng minh |
|---|:---:|---|
| **Mã nguồn Terraform module `security_sandbox`** | ✅ | [terraform/modules/security_sandbox/](terraform/modules/security_sandbox/): GKE Node Pool `gvisor`, KMS Key Ring & CryptoKey CMEK, Secret Manager, Cloud DLP inspect template, NetworkPolicy. |
| **Chứng minh bảo mật sandbox & Prompt Injection** | ✅ | [tv4_security/test_security_sandbox.py](tv4_security/test_security_sandbox.py) chạy đạt **9/9 test PASS (100%)**: chặn syscall can thiệp kernel, chặn 100% egress/metadata, mask PII, chặn prompt injection, bắt buộc HITL, RPO/RTO đạt chuẩn. |
| **Báo giá 7 component hợp lệ trên file Excel** | ✅ | 7 dòng thành phần trong [G03_baogia.xlsx](G03_baogia.xlsx) đạt chuẩn kiểm tra `vbot-capstone.html` (**ĐẠT - 0 lỗi, 0 cảnh báo**). |
| **Hoàn thành Slide 8, 9, 10 & Kịch bản Pitching** | ✅ | Sơ đồ PNG/SVG độ phân giải cao tại `slides/slide08_*.png`, `slide09_*.png`, `slide10_*.png`; tài liệu [slides/TV4_slide_8_9_10.md](slides/TV4_slide_8_9_10.md); kịch bản thuyết trình 1m30s tại [KICH_BAN_PITCHING_TV4.md](KICH_BAN_PITCHING_TV4.md). |

**Tổng chi phí phần TV4:** **2.445,86 USD/tháng** (~**1,22 USD/DAU/tháng**).

| Component | USD/tháng | Ý nghĩa chính |
|---|---:|---|
| `authn` | 2.000,00 | Cloud Identity Premium cho 2.000 user (SSO OIDC/SAML + MFA bắt buộc) |
| `sandbox` | 228,80 | GKE Sandbox c2-standard-4 (gVisor runsc) chạy giờ hành chính + 1 staging |
| `governance` | 100,00 | Cloud Sensitive Data Protection (DLP API) quét và ẩn PII (100 GB/tháng) |
| `backup_dr` | 59,00 | Cloud SQL Automated Backup 300 GB + Cross-region DR replica Jakarta |
| `monitoring` | 40,00 | Cloud Logging lưu Audit Log 12 tháng (H5) + Cloud Monitoring dashboards |
| `secrets_kms` | 18,06 | Cloud KMS CMEK mã hóa dữ liệu + Secret Manager lưu OAuth tokens |
| `authz` | 0,00 | Policy Engine RBAC/ABAC tích hợp trong ứng dụng, nằm trong compute |
| **TỔNG** | **2.445,86** | **Chiếm 21,7% tổng chi phí toàn hệ thống** |

---

## 2. Danh mục file bàn giao

| Đường dẫn file | Nội dung kỹ thuật |
|---|---|
| [terraform/modules/security_sandbox/main.tf](terraform/modules/security_sandbox/main.tf) | Khai báo GKE Sandbox node pool gVisor, KMS KeyRing + CryptoKey CMEK, Secret Manager OAuth vault, Cloud DLP Inspect Template |
| [terraform/modules/security_sandbox/variables.tf](terraform/modules/security_sandbox/variables.tf) | Biến sizing: cấu hình `min_node_count = 0` (hạ về 0 ngoài giờ), max node, loại máy c2-standard-4 |
| [terraform/modules/security_sandbox/outputs.tf](terraform/modules/security_sandbox/outputs.tf) | Output: `sandbox_node_pool_id`, `kms_key_id`, `secret_vault_id`, `dlp_template_id` |
| [terraform/modules/security_sandbox/sandbox-network-policy.yaml](terraform/modules/security_sandbox/sandbox-network-policy.yaml) | NetworkPolicy: Chặn toàn bộ Egress Internet `0.0.0.0/0`, Chặn Metadata `169.254.169.254/32` |
| [tv4_security/test_security_sandbox.py](tv4_security/test_security_sandbox.py) | Suite kiểm thử tự động 9 bài test chứng minh các ràng buộc H2, H3, H4, H5, H7 (100% PASS) |
| [tv4_security/run_security_tests.sh](tv4_security/run_security_tests.sh) | Script bash thực thi kiểm thử bảo mật |
| [slides/gen_tv4_diagrams.js](slides/gen_tv4_diagrams.js) | Mã nguồn sinh tự động 3 sơ đồ Slide 8, 9, 10 tỷ lệ 16:9 bằng SVG & Resvg PNG |
| [slides/slide08_sandbox_gvisor.png](slides/slide08_sandbox_gvisor.png) / `.svg` | Sơ đồ Slide 8: Kiến trúc cô lập gVisor, Sentry Syscall filter, NetworkPolicy no egress |
| [slides/slide09_governance_dlp.png](slides/slide09_governance_dlp.png) / `.svg` | Sơ đồ Slide 9: Luồng DLP Masking PII, Chống Prompt Injection 3 lớp, Human-in-the-loop |
| [slides/slide10_ha_backup_dr.png](slides/slide10_ha_backup_dr.png) / `.svg` | Sơ đồ Slide 10: Multi-AZ HA 3 zone, PITR WAL log 7 ngày, DR cross-region Jakarta |
| [slides/TV4_slide_8_9_10.md](slides/TV4_slide_8_9_10.md) | Nội dung chi tiết, luận điểm kỹ thuật và số liệu trình chiếu Slide 8, 9, 10 |
| [KICH_BAN_PITCHING_TV4.md](KICH_BAN_PITCHING_TV4.md) | Kịch bản thuyết trình bảo vệ 1 phút 30 giây (04:30 – 06:00) kèm 5 câu hỏi đáp dự phòng |

---

## 3. Kiến trúc Bảo mật & Độ tin cậy (Chi tiết theo 5 ràng buộc cứng)

### 3.1 Ràng buộc H3: Cô lập Sandbox chạy Code bằng gVisor
* **Vấn đề bài toán:** Agent AI sinh mã Python tự động để phân tích dữ liệu, vẽ biểu đồ. Nếu chạy mã này trên container thông thường, mã độc có thể khai thác lỗ hổng kernel để vượt ngục (container breakout) hoặc gọi mạng ra ngoài để đánh cắp dữ liệu.
* **Giải pháp triển khai:**
  1. **Node Pool gVisor riêng:** Sử dụng `sandbox_config { sandbox_type = "gvisor" }` trên GKE. Gán taint `sandbox.gke.io/runtime=gvisor:NoSchedule`.
  2. **Cơ chế hoạt động:** Nhân ảo **Sentry** (viết bằng Go) nằm giữa ứng dụng và Linux kernel của máy chủ host. Sentry đánh chặn và xử lý toàn bộ syscalls trong không gian người dùng (user space). Chặn đứng các lệnh nguy hiểm: `ptrace`, `setns`, `chroot` breakout, `init_module`, raw sockets.
  3. **NetworkPolicy chặn Egress:** Tuyệt đối không cho phép kết nối ra Internet (`0.0.0.0/0`). Chặn địa chỉ Cloud Metadata `169.254.169.254/32` để ngăn mã độc đọc token Service Account.
  4. **Pod vòng đời ngắn (Ephemeral):** Timeout tối đa 60s, đĩa tạm `emptyDir { medium: "Memory" }` tự hủy sạch sẽ ngay khi chạy xong.

### 3.2 Ràng buộc H4: AI Governance & Chống Prompt Injection
* **3 lớp phòng vệ:**
  * *Lớp 1 (Guardrail Classifier):* Bộ lọc ngữ nghĩa và regex phát hiện kịp thời các mẫu tấn công jailbreak ("Ignore previous instructions", "DAN", delimiter escape).
  * *Lớp 2 (Prompt Isolation):* Đóng gói input người dùng trong thẻ `<user_input>`. System prompt quy định rõ ràng giới hạn quyền hạn.
  * *Lớp 3 (Output Guardrail):* Quét phản hồi của LLM trước khi stream về client nhằm ngăn chặn việc lộ system prompt hoặc secret token.
* **Human-in-the-Loop Policy Gate:**
  * Tác vụ chỉ đọc (tra cứu RAG, xem lịch, đọc issue Jira): Cho phép tự động.
  * Tác vụ có hiệu ứng ghi ra ngoài (gửi email Outlook, tạo ticket Jira, xóa tài liệu Workspace): Bắt buộc sinh popup yêu cầu người dùng bấm xác nhận mới được gọi API.

### 3.3 Ràng buộc H5: Data Governance, Cloud DLP & Audit Log 12 Tháng
* **Cloud Sensitive Data Protection (DLP API):**
  * Tự động quét và mask PII trước khi gửi dữ liệu sang LLM và trước khi ghi log.
  * Hỗ trợ các InfoType: `EMAIL_ADDRESS`, `PHONE_NUMBER` (đầu số Việt Nam 03, 05, 07, 08, 09), `VIETNAM_CCCD` (12 số), `CREDIT_CARD_NUMBER`.
* **Audit Logging 12 tháng:**
  * Toàn bộ sự kiện xác thực, truy cập dữ liệu, câu lệnh prompt, kết quả DLP được chuyển về Cloud Logging Bucket.
  * Cấu hình lưu trữ **365 ngày** kèm cơ chế khóa bất biến (Immutable Lock / WORM) chống sửa đổi.

### 3.4 Ràng buộc H2: Định danh SSO, MFA & Quản lý Khóa KMS
* **SSO & MFA:** Tích hợp Cloud Identity Premium / Microsoft Entra ID qua OIDC/SAML 2.0, bắt buộc 100% nhân viên xác thực đa yếu tố (MFA).
* **Secret Manager & CMEK:**
  * Lưu trữ refresh token OAuth của 2.000 user an toàn trong Secret Manager.
  * Toàn bộ dữ liệu Workspace trên GCS và Secret Manager được mã hóa bằng Cloud KMS CryptoKey với chu kỳ tự động xoay khóa (rotation) định kỳ 90 ngày.

### 3.5 Ràng buộc H7: Tính sẵn sàng cao (HA Multi-AZ) & Kế hoạch Phục hồi thảm họa
* **Multi-AZ High Availability:**
  * Hạ tầng trải 3 zone của Singapore (`asia-southeast1-a/b/c`).
  * Load Balancer health check loại bỏ pod lỗi sau 10–30s.
  * Cloud SQL HA tự động chuyển đổi sang standby instance tại zone khác trong vòng 60s, **RPO = 0** do cơ chế regional synchronous disk replication.
* **Backup & DR (Cam kết RTO $\le$ 4h, RPO $\le$ 1h):**
  * **RPO thực tế $\le$ 5 phút:** Cloud SQL PITR lưu giữ WAL log liên tục 7 ngày, cho phép khôi phục về bất kỳ giây nào.
  * **RTO thực tế = 45 phút:** Bản sao lưu cross-region sang Jakarta (`asia-southeast2`). Khi thảm họa toàn vùng xảy ra, tự động triển khai lại toàn bộ cụm qua mã Terraform trong 25 phút + restore database 20 phút.

---

## 4. Báo giá chi tiết 7 Component

Toàn bộ đơn giá lấy theo giá niêm yết chính thức của Google Cloud ngày 2026-10-16, region `asia-southeast1` (Singapore), không áp dụng free tier hay trial credits:

| Component | Hạng mục | Công thức tính chi phí | USD/tháng | Bằng chứng |
|---|---|---|---:|---|
| `authn` | Cloud Identity Premium SSO + MFA | 2.000 user $\times$ 1,00 USD/user-tháng | 2.000,00 | E07 |
| `sandbox` | GKE Sandbox Node Pool (c2-standard-4) | 2 node $\times$ 2 AZ $\times$ 220h $\times$ 0,208 USD = 183,04 USD + 1 node staging Spot (220h $\times$ 0,208) = 45,76 USD | 228,80 | E04 |
| `governance`| Cloud DLP API (PII Inspection) | Quét kiểm tra và ẩn thông tin PII: 100 GB prompt/tháng $\times$ 1,00 USD/GB | 100,00 | E13 |
| `backup_dr` | Cloud SQL Automated Backup & DR | Daily backup 300 GB $\times$ 0,08 USD = 24,00 USD + Cross-region replica sang Jakarta = 35,00 USD | 59,00 | E08 |
| `monitoring`| Cloud Logging Audit 12 tháng | 50 GB audit log lưu 1 năm $\times$ 0,50 USD = 25,00 USD + Custom Metrics & Dashboards = 15,00 USD | 40,00 | E12 |
| `secrets_kms`| Cloud KMS CMEK & Secret Manager | 1 CryptoKey $\times$ 0,06 USD + 100.000 operations = 3,06 USD + 2.500 secrets $\times$ 0,006 = 15,00 USD | 18,06 | E11 |
| `authz` | Policy Engine RBAC / ACL | Tích hợp trong microservice trên pod GKE, nằm trong dòng compute | 0,00 | E04 |

---

## 5. Kết quả chạy kiểm thử xác thực (Test Runner)

Chạy lệnh: `bash tv4_security/run_security_tests.sh`

```text
========================================================================
  VBOT WORKPLACE - SECURITY & COMPLIANCE TEST RUNNER (TV4)
  Kiểm tra 5 ràng buộc cứng: H2, H3, H4, H5, H7
========================================================================
✅ [PASS] Test 01: gVisor Syscall Barrier (Chặn Syscall can thiệp host)
✅ [PASS] Test 02: NetworkPolicy Sandbox Isolation (Chặn Egress & GCP Metadata)
✅ [PASS] Test 03: Sandbox Pod Ephemeral Cleanup (Hủy Pod & Xóa dữ liệu tạm)
✅ [PASS] Test 04: Cloud DLP PII Masking (Ẩn Email, SĐT VN, CCCD 12 số, Thẻ tín dụng)
✅ [PASS] Test 05: Prompt Injection & Jailbreak Defense (Chặn DAN, System override, Delimiter bypass)
✅ [PASS] Test 06: Human-in-the-Loop Policy Gate (Bắt buộc xác nhận trước hành động ghi/gửi)
✅ [PASS] Test 07: SSO/MFA & Secret Manager CMEK Vault (Mã hóa Token OAuth)
✅ [PASS] Test 08: HA Multi-AZ & Disaster Recovery (RPO ≤ 1h, RTO ≤ 4h)
✅ [PASS] Test 09: Audit Logging 12 Months Immutability (Lưu vết kiểm toán 1 năm - H5)

Tổng số test: 9 | Đạt (PASS): 9 | Lỗi (FAIL): 0 | Tỷ lệ thành công: 100.0%
>>> KẾT LUẬN: TOÀN BỘ CƠ CHẾ BẢO MẬT & ĐỘ TIN CẬY ĐẠT CHUẨN (H2, H3, H4, H5, H7) <<<
```

---

## 6. Hướng dẫn chạy lại các bài kiểm thử

```bash
# 1. Chạy suite kiểm thử bảo mật & độ tin cậy của TV4
bash tv4_security/run_security_tests.sh

# 2. Sinh lại sơ đồ Slide 8, 9, 10
cd slides && node gen_tv4_diagrams.js

# 3. Kiểm tra tính hợp lệ của file báo giá
cd ../baogia && node check_baogia.js ../G03_baogia.xlsx
```

