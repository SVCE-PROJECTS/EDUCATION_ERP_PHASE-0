-- ============================================================
-- Faculty documents
-- ============================================================
-- Lets a faculty member upload supporting documents (ID proof,
-- certificates, etc.) against their own employee_id, and lets their HOD
-- view (not edit) whatever that faculty has uploaded, department-scoped
-- through the faculty table join.
-- ============================================================

CREATE TABLE IF NOT EXISTS faculty_documents (
  document_id   SERIAL PRIMARY KEY,
  employee_id   VARCHAR(20) NOT NULL REFERENCES faculty(employee_id) ON DELETE CASCADE,
  document_name VARCHAR(255) NOT NULL,
  file_path     VARCHAR(500) NOT NULL,
  file_type     VARCHAR(100),
  file_size     INTEGER,
  uploaded_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_faculty_documents_employee_id ON faculty_documents(employee_id);
