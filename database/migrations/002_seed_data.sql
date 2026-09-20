-- Seed Data for Default Setup
-- Initial Users:
-- Admin: admin / admin123
-- Cashier: cashier / cashier123

INSERT OR IGNORE INTO users (id, username, password_hash, full_name, role, status) VALUES
('usr_admin_01', 'admin', '$argon2id$v=19$m=19456,t=2,p=1$7vO1vU3Q/K17iK1s8aDkzg$yG6G7K0rR6xWqN8pQeP9iV0sS9oK1fA7dE4gH8jL3wM', 'System Administrator', 'ADMIN', 'ACTIVE'),
('usr_cashier_01', 'cashier', '$argon2id$v=19$m=19456,t=2,p=1$8wP2wV4R/L28jL2t9bEl0h$zH7H8L1sS7yXrO9qRfQ0jW1tT0pL2gB8eF5hI9kM4xN', 'Front Desk Cashier', 'CASHIER', 'ACTIVE');

-- Categories
INSERT OR IGNORE INTO procedure_categories (id, name, status) VALUES
('cat_hematology', 'Hematology', 'ACTIVE'),
('cat_biochemistry', 'Biochemistry', 'ACTIVE'),
('cat_pathology', 'Clinical Pathology', 'ACTIVE'),
('cat_hormones', 'Hormones & Immunoassays', 'ACTIVE'),
('cat_serology', 'Serology & Immunology', 'ACTIVE');

-- Procedures Master
INSERT OR IGNORE INTO procedures (id, code, name, category_id, sample_type, department, price, status) VALUES
('proc_cbc', 'CBC001', 'Complete Blood Count (CBC)', 'cat_hematology', 'EDTA Whole Blood', 'Hematology', 350.00, 'ACTIVE'),
('proc_esr', 'ESR001', 'Erythrocyte Sedimentation Rate (ESR)', 'cat_hematology', 'Sodium Citrate Blood', 'Hematology', 100.00, 'ACTIVE'),
('proc_lft', 'LFT001', 'Liver Function Test (LFT)', 'cat_biochemistry', 'Serum', 'Biochemistry', 650.00, 'ACTIVE'),
('proc_kft', 'KFT001', 'Kidney Function Test (KFT / RFT)', 'cat_biochemistry', 'Serum', 'Biochemistry', 600.00, 'ACTIVE'),
('proc_lipid', 'LIP001', 'Lipid Profile', 'cat_biochemistry', 'Serum Fasting', 'Biochemistry', 550.00, 'ACTIVE'),
('proc_fbs', 'GLU001', 'Fasting Blood Sugar (FBS)', 'cat_biochemistry', 'Fluoride Plasma', 'Biochemistry', 80.00, 'ACTIVE'),
('proc_ppbs', 'GLU002', 'Post Prandial Blood Sugar (PPBS)', 'cat_biochemistry', 'Fluoride Plasma', 'Biochemistry', 80.00, 'ACTIVE'),
('proc_hba1c', 'HBA001', 'Glycated Hemoglobin (HbA1c)', 'cat_biochemistry', 'EDTA Whole Blood', 'Biochemistry', 450.00, 'ACTIVE'),
('proc_tsh', 'TSH001', 'Thyroid Stimulating Hormone (TSH)', 'cat_hormones', 'Serum', 'Hormones', 300.00, 'ACTIVE'),
('proc_tft', 'TFT001', 'Total Thyroid Profile (T3, T4, TSH)', 'cat_hormones', 'Serum', 'Hormones', 600.00, 'ACTIVE'),
('proc_urine', 'URN001', 'Urine Routine & Microscopic', 'cat_pathology', 'Clean Catch Urine', 'Clinical Pathology', 150.00, 'ACTIVE'),
('proc_widal', 'WID001', 'Widal Slide Agglutination', 'cat_serology', 'Serum', 'Serology', 180.00, 'ACTIVE');

-- Application Default Settings
INSERT OR IGNORE INTO app_settings (key, value) VALUES
('lab_name', 'MEDILAB DIAGNOSTIC CENTER'),
('lab_tagline', 'Accuracy in Every Diagnosis'),
('lab_address', '104 Healthcare Boulevard, City Hospital Road, Metro City - 500001'),
('lab_phone', '+91 98765 43210 / 040-23456789'),
('lab_email', 'contact@medilabdiagnostics.com'),
('lab_gstin', '36AAAAA0000A1Z5'),
('lab_timings', 'Mon - Sat: 7:00 AM - 9:00 PM | Sun: 7:00 AM - 1:00 PM'),
('invoice_prefix', 'LAB'),
('invoice_fy', '2026-27'),
('invoice_sequence', '1'),
('invoice_footer', 'Thank you for choosing MediLab. Fasting results are for reference only. Please correlate clinically.'),
('thermal_printer_name', 'Default'),
('a4_printer_name', 'Default'),
('auto_backup_enabled', 'true'),
('backup_interval_days', '1');
