# VBot Workplace - Terraform Infrastructure as Code (IaC)

Thư mục này chứa toàn bộ mã nguồn **Terraform** triển khai kiến trúc Production cho **VBot Workplace** trên **Google Cloud Platform (GCP)** phục vụ 2.000 DAU.

---

## 1. Cấu trúc Mô-đun (Module Structure) & Phân công

```
terraform/
├── main.tf                    # Root module kết nối 5 module chính (Thành viên 1)
├── variables.tf               # Khai báo biến toàn cục
├── outputs.tf                 # Xuất các thông số hạ tầng quan trọng
├── terraform.tfvars.example   # File mẫu cấu hình biến môi trường
│
└── modules/
    ├── network/               # [Thành viên 1 - Platform Lead]
    │   ├── main.tf            # VPC, Private Subnet, Cloud NAT, Cloud Armor WAF
    │   ├── variables.tf
    │   └── outputs.tf
    │
    ├── gke/                   # [Thành viên 1 - Platform Lead]
    │   ├── main.tf            # GKE Private Cluster, Multi-AZ, Application Node Pool
    │   ├── variables.tf
    │   └── outputs.tf
    │
    ├── ai_gateway/            # [Thành viên 2 - AI Specialist]
    │   ├── main.tf            # Enable Vertex AI APIs, Artifact Registry, Monitoring Alert
    │   ├── variables.tf
    │   └── outputs.tf
    │
    ├── data/                  # [Thành viên 3 - Data Specialist]
    │   ├── main.tf            # Cloud SQL HA (PostgreSQL 16 + pgvector, RLS), GCS Workspace, Redis HA, Cloud Tasks
    │   ├── variables.tf
    │   └── outputs.tf
    │
    └── security_sandbox/      # [Thành viên 4 - SecOps & Compliance]
        ├── main.tf            # GKE Sandbox Node Pool (gVisor), Cloud KMS, Secret Manager, Cloud DLP
        ├── sandbox-network-policy.yaml # NetworkPolicy chặn triệt để Egress & Metadata endpoint
        ├── variables.tf
        └── outputs.tf
```

---

## 2. Bằng chứng kỹ thuật giải quyết 8 Ràng buộc cứng (H1–H8)

| Ràng buộc | Yêu cầu đề bài | Bằng chứng mã nguồn trong Terraform |
| :--- | :--- | :--- |
| **H1 (Cloud)** | 1 Cloud chính, region cụ thể | Khai báo toàn bộ trên Google Cloud Region `asia-southeast1` (Singapore). |
| **H2 (Auth/Tokens)** | Quản lý token an toàn, KMS | `google_secret_manager_secret.oauth_token_vault` kết hợp `google_kms_crypto_key.vbot_key` tự động xoay vòng khóa 90 ngày. |
| **H3 (Sandbox)** | Sandbox cô lập microVM/container | `modules/security_sandbox/main.tf` cấu hình `sandbox_config { sandbox_type = "gvisor" }` trên Node Pool riêng; kèm file `sandbox-network-policy.yaml` cấm Egress ra internet. |
| **H3 (Workspace)**| Không gian riêng 10GB/user | `google_storage_bucket.workspace_bucket` bật mã hóa KMS, Uniform Bucket-Level Access, Lifecycle rules. |
| **H4 (AI Gov)** | Chống Prompt Injection, DLP | `google_data_loss_prevention_inspect_template` tự động nhận diện và che giấu PII (Email, Phone, CCCD, Thẻ tín dụng). |
| **H5 (Data Gov)** | Audit log 12 tháng, mã hóa | `google_logging_project_bucket_config.audit_log_bucket` cấu hình lưu trữ đúng 365 ngày (`retention_days = 365`). |
| **H6 (Latency)** | Agent chạy ngầm $\le 10$ phút | `google_cloud_tasks_queue.agent_task_queue` cấu hình `max_retry_duration = "600s"` (10 phút). |
| **H7 (HA / DR)** | Uptime 99.5%, Multi-AZ, RPO $\le 1$h | Cloud SQL cấu hình `availability_type = "REGIONAL"` (Multi-AZ failover tự động), PITR backup tự động; Redis cấu hình `tier = "STANDARD_HA"`; GKE trải dài 3 AZ. |
| **H8 (Budget)** | Cảnh báo chi phí & hạn ngạch | `google_monitoring_alert_policy.llm_budget_alert` tự động cảnh báo khi lượng request/token vượt ngưỡng ngân sách. |

---

## 3. Cách chạy và kiểm thử (Usage)

1. **Chuẩn bị cấu hình:**
   ```bash
   cd terraform
   cp terraform.tfvars.example terraform.tfvars
   # Điền project_id và db_password vào file terraform.tfvars (file này đã được .gitignore)
   # hoặc: export TF_VAR_db_password='...'
   ```

2. **Khởi tạo và kiểm tra cú pháp:**
   ```bash
   terraform init
   terraform validate
   ```

3. **Xem kế hoạch triển khai (Dry-run):**
   ```bash
   terraform plan
   ```
