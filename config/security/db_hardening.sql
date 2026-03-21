-- Run as a privileged DBA account in production only.
-- This file creates a least-privilege app role and extra integrity constraints.

-- 1) Least privilege app role (replace password before execution)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'sgb_app') THEN
    CREATE ROLE sgb_app LOGIN PASSWORD 'CHANGE_ME_STRONG_PASSWORD';
  END IF;
END $$;

REVOKE ALL ON SCHEMA public FROM PUBLIC;
GRANT USAGE ON SCHEMA public TO sgb_app;

GRANT CONNECT ON DATABASE sgb_mvp TO sgb_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE users, books, loans, reservations, fines, refresh_tokens TO sgb_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO sgb_app;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO sgb_app;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
GRANT USAGE, SELECT ON SEQUENCES TO sgb_app;

-- 2) Additional integrity constraints
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'books_available_not_greater_than_total'
  ) THEN
    ALTER TABLE books
      ADD CONSTRAINT books_available_not_greater_than_total
      CHECK (available_copies <= total_copies);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'loans_return_after_loan_date'
  ) THEN
    ALTER TABLE loans
      ADD CONSTRAINT loans_return_after_loan_date
      CHECK (return_date IS NULL OR return_date >= loan_date);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'loans_due_after_loan_date'
  ) THEN
    ALTER TABLE loans
      ADD CONSTRAINT loans_due_after_loan_date
      CHECK (due_date >= loan_date);
  END IF;
END $$;

-- Prevent duplicate active loan for the same user/book pair.
CREATE UNIQUE INDEX IF NOT EXISTS ux_loans_user_book_active
  ON loans(user_id, book_id)
  WHERE status = 'ACTIVE';

-- Prevent duplicate queued reservation for same user/book.
CREATE UNIQUE INDEX IF NOT EXISTS ux_reservations_user_book_queued
  ON reservations(user_id, book_id)
  WHERE status IN ('QUEUED', 'AVAILABLE');

-- 3) Recommended production DB settings (execute by DBA if allowed)
-- ALTER SYSTEM SET ssl = 'on';
-- ALTER SYSTEM SET ssl_min_protocol_version = 'TLSv1.2';
-- SELECT pg_reload_conf();
