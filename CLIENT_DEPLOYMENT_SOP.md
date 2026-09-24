# MediLab — Client Deployment & Onboarding Standard Operating Procedure (SOP)

This document is the official production checklist and operational guide for installing, configuring, and licensing **MediLab Diagnostic Billing** on client Windows computers.

---

## 1. System Architecture & Boundaries

```text
                     CLIENT WINDOWS PC
                            │
                            ▼
                  ┌───────────────────┐
                  │   MediLab Tauri   │
                  │   Desktop App     │
                  └─────────┬─────────┘
                            │
               ┌────────────┴────────────┐
               │                         │
               ▼                         ▼
         React Frontend             Tauri / Rust
                                         │
                                         ▼
                                 ┌───────────────┐
                                 │ SQLite        │
                                 │ labbilling.db │
                                 └───────────────┘
                                         │
                                         ▼
                              C:\ProgramData\LabBilling\
                                 database\labbilling.db
                                 (Fallback: %APPDATA%\LabBilling)

─────────────────────────────────────────────────────────────
• Normal Operation (100% Offline):
  Billing, Patient Registration, Test Master, Thermal/A4 Printing,
  Daily Revenue Reports, Local SQLite Backups.

• Internet Connection Required ONLY For:
  1. Initial License Activation (communicating with Firebase License API)
  2. Future Application Version Updates
─────────────────────────────────────────────────────────────
```

---

## 2. Client Computer Prerequisites

| Item | Specification | Note |
|---|---|---|
| **Operating System** | Windows 10 (64-bit) or Windows 11 | Windows 10 Build 1809+ recommended |
| **RAM** | 4 GB minimum (8 GB recommended) | Optimized for low-spec reception desks |
| **Processor** | Dual-core Intel / AMD 2.0 GHz+ | |
| **Free Storage** | 500 MB for app + 5 GB for database & backups | SQLite database is lightweight (<50 MB/yr) |
| **Printers** | Thermal 80mm/58mm (ESC/POS) OR A4/A5 Laser | Connected via USB or local network |
| **Runtime** | **Microsoft Edge WebView2** | Handled automatically by installer or offline package |

---

## 3. Preparation: Client USB Distribution Kit

When visiting a lab for installation or providing a download package, keep a USB flash drive containing:

```text
📁 MediLab_Client_Pack_v1.0/
├── 📄 MediLab_1.0.0_x64-setup.exe             (Compiled standalone NSIS installer)
├── 📄 MicrosoftEdgeWebView2RuntimeInstallerX64.exe (Official offline WebView2 bootstrapper)
└── 📄 README_QUICK_START.txt
```

> [!NOTE]
> Having the standalone `MicrosoftEdgeWebView2RuntimeInstallerX64.exe` ensures you can install WebView2 even if the client's PC is completely air-gapped without internet access.

---

## 4. On-Site Client Installation Checklist

### Step 1: Install Application & Verify Runtime
1. Insert the USB drive or run `MediLab_1.0.0_x64-setup.exe`.
2. The NSIS installer will:
   - Check if WebView2 is installed (prompts to install if missing).
   - Install MediLab into `C:\Program Files\MediLab Billing\`.
   - Create Desktop shortcut and Start Menu entry.
3. Launch **MediLab Billing** from the Desktop icon.

### Step 2: First-Launch Administrator Password Setup
> [!IMPORTANT]
> The application will **NOT** allow access to billing or patient records with default credentials.

1. On the initial login screen, sign in with the initial provisioning operator:
   - **Username**: `admin`
   - **Temporary Password**: `admin`
2. The application immediately displays the **Mandatory First-Run Security Setup**:
   - Enter the lab owner's **New Administrator Password** (min 6 characters).
   - Re-enter to **Confirm Password**.
   - Click **Save Password & Open MediLab**.
3. The password is hashed with SHA-256 and stored locally in the SQLite database.

### Step 3: Configure Lab Information & Header
1. Navigate to **Settings** → **General Settings**:
   - **Lab Name**: e.g., *"City Clinical Laboratory"*
   - **Address, Contact Number, Email**
   - **Lab Header & Footer**: e.g., *"Reports valid only with authorized pathologist signature"*
   - **Tax / GST Number** (if applicable)
   - **Default Discount**: (set default 0%)
2. Click **Save Settings**.

### Step 4: Device-Bound Commercial License Activation
1. Navigate to **Settings** → **Commercial License**:
   - You will see the client's **Hardware Machine Fingerprint (SHA-256)**:
     `SHA256:4a8b9f1c...`
   - Click **Copy**.
2. Connect the client PC to internet briefly (or hotspot), OR open your **Firebase Admin Portal** on your phone/laptop:
   - Generate a new license:
     - **Customer**: *City Clinical Laboratory*
     - **Plan**: `Annual` or `Lifetime`
     - **Expires**: e.g., `24 Sep 2027` (for Annual)
     - **Bound Machine**: Paste the copied SHA-256 fingerprint
3. Paste the generated License Key (e.g. `LAB-2026-ABCD-1234`) into the client's app.
4. Click **Activate Device**:
   - The UI immediately updates to show:
     ```text
     Status:   ACTIVE (Green)
     Plan:     Annual Subscription (or Lifetime License)
     Expires:  24 Sep 2027 (365 days remaining)
     Machine:  Bound to this Workstation
     ```
5. **Disconnect internet** (optional) — the client is now 100% licensed offline.

### Step 5: Configure Local Receipt / A4 Printer
1. Navigate to **Settings** → **Billing & Print**:
   - Choose default print format:
     - **80mm Thermal Receipt** (Fast reception POS printing)
     - **58mm Thermal Receipt** (Compact slip)
     - **A4 Full Page** (Standard laser/inkjet letterhead)
     - **A5 Half Page**
2. Perform a test bill to verify formatting, paper cutting, and alignment.

---

## 5. Client Data Safety & Backup Runbook

### Automatic Daily Backup
- On every application launch, MediLab automatically generates a daily SQLite binary snapshot:
  `C:\ProgramData\LabBilling\backups\auto_backup_YYYY-MM-DD.db`
- Zero operator action needed.

### Operator USB Flash Drive Backup (Teach Receptionist)
Teach the lab manager to take a weekly or monthly off-site backup:
1. Insert their USB flash drive into the PC.
2. Open MediLab → **Settings** → **Database & Recovery**.
3. Under **Quick SQLite Database Backup (.db)**, click **Quick Backup**.
4. A binary `.db` snapshot is immediately saved.
5. In addition, clicking **Export JSON** generates a human-readable file for their accountant.

### Disaster Recovery (Computer Crash / Replacement)
If the lab computer crashes or is replaced:
1. Install MediLab on the new Windows PC.
2. Copy the client's latest `.db` or `.json` backup file to the PC.
3. Open MediLab → **Settings** → **Database & Recovery** → Click **Restore Backup**.
4. Select the backup file — all patients, test catalogs, invoices, and payments are restored in seconds.
5. Re-bind the license via your Firebase Admin Panel using the new PC's hardware fingerprint.

---

## 6. Pre-Flight Verification Checklist

Before leaving the client site, ensure:
- [ ] Admin password successfully set by lab manager.
- [ ] Lab name, address, and phone number print correctly on invoices.
- [ ] License shows `ACTIVE` with correct plan and expiration date.
- [ ] Test patient registered and test bill generated.
- [ ] Test invoice printed on client's physical printer.
- [ ] Test bill successfully cancelled or verified in Revenue ledger.
- [ ] Quick Backup verified.
- [ ] Internet disconnected — verified billing functions normally offline.
