# Lab Billing Application — Detailed Development Plan

## 1. Product Goal

Build a lightweight, offline-first Windows desktop billing application for diagnostic laboratories.

### Primary requirements

- Windows desktop application
- Works without internet for normal daily billing
- Designed for low-spec PCs
- Local SQLite database
- Billing module
- Patient module
- Lab Procedure Master
- Revenue and reports
- Invoice printing
- Backup and restore
- Device-bound commercial licensing
- Online license activation/periodic validation
- Windows installer (`.exe`)
- Future-ready architecture for additional laboratory modules

### Recommended stack

| Layer | Technology |
|---|---|
| Desktop | Tauri 2.x |
| Frontend | React + TypeScript |
| UI | Tailwind CSS |
| Local Database | SQLite |
| Native/Desktop Layer | Rust / Tauri |
| License API | Node.js + NestJS/Fastify |
| License Database | PostgreSQL |
| Admin Portal | Next.js |
| Authentication | Secure session/JWT; 2FA later |
| Reports | HTML/CSS print templates |
| Version Control | Git/GitHub |
| Installer | Tauri Windows installer |

---

# 2. Overall Architecture

```text
                    YOUR CLOUD
        ┌──────────────────────────────┐
        │       LICENSE SERVER         │
        │                              │
        │  License API                 │
        │  PostgreSQL                 │
        │  Admin Portal               │
        └──────────────┬───────────────┘
                       │
                HTTPS / Activation
                       │
                       ▼
┌───────────────────────────────────────────────┐
│                CLIENT WINDOWS PC              │
│                                               │
│              LAB BILLING APP                  │
│                                               │
│  ┌─────────────┐       ┌──────────────────┐   │
│  │ React UI    │──────▶│ Tauri / Rust     │  │
│  └─────────────┘       └────────┬─────────┘   │
│                                 │             │
│                                 ▼             │
│                           SQLite DB           │
│                                               │
│ Billing                                       │
│ Procedure Master                              │
│ Revenue                                       │
│ Patients                                      │
│ Reports                                       │
│ Settings                                      │
│                                               │
│       INTERNET NOT REQUIRED FOR BILLING       │
└───────────────────────────────────────────────┘
```

---

# 3. Product Scope

## V1 Modules

1. Login
2. Dashboard
3. Patient
4. Billing
5. Lab Procedure Master
6. Revenue
7. Reports
8. Settings
9. Backup / Restore
10. License

## Future Modules

Do not build these initially, but keep the architecture extensible for:

- Sample collection
- Barcode generation
- Sample tracking
- Lab result entry
- Report generation
- Doctor/referrer master
- Package master
- WhatsApp/SMS reports
- Inventory
- Accounts
- Multi-user access
- Multi-branch support
- Cloud synchronization

---

# 4. Target Hardware

The application should be explicitly designed for low-spec Windows computers.

### Target baseline

```text
OS:             Windows 10 / Windows 11
RAM:            4 GB minimum
CPU:            Dual-core Intel/AMD
Storage:        128 GB or higher
Display:        1366 × 768 or higher
Internet:       Only required for activation/license validation
```

### Performance goals

| Operation | Target |
|---|---:|
| Application startup | < 3–5 sec |
| Open billing screen | < 1 sec |
| Patient search | < 200 ms |
| Procedure search | < 200 ms |
| Save bill | < 500 ms |
| Revenue report | < 2 sec |

Avoid:

- Heavy animations
- Large UI bundles
- Three.js/WebGL
- Always-running background servers
- Docker
- Cloud dependency for normal billing
- Loading entire database into the frontend

---

# 5. User Roles

## Admin

Admin can:

- Create/edit/deactivate procedures
- Change prices
- View revenue
- View reports
- Cancel bills
- Configure laboratory
- Backup/restore
- Manage users
- View license information
- Manage application settings

## Cashier

Cashier can:

- Search patients
- Create bills
- Print invoices
- Reprint invoices
- View permitted billing history

Cashier should not be able to:

- Restore database
- Manage license
- Change critical settings
- Delete/deactivate procedures
- Perform restricted administrative actions

---

# 6. Local Database Design

Use SQLite for the client application.

## users

```text
id
username
password_hash
role
status
created_at
updated_at
last_login_at
```

## patients

```text
id
patient_code
name
age
gender
mobile
address
created_at
updated_at
```

## procedure_categories

```text
id
name
status
created_at
updated_at
```

## procedures

```text
id
code
name
category_id
sample_type
department
price
status
created_at
updated_at
```

## bills

```text
id
bill_number
patient_id
bill_date
subtotal
discount
tax
round_off
grand_total
payment_status
status
created_by
created_at
updated_at
```

## bill_items

```text
id
bill_id
procedure_id
procedure_code
procedure_name
quantity
rate
discount
amount
```

Store the procedure name and rate in `bill_items`.

This preserves historical invoices when procedure prices are changed later.

Example:

```text
Old CBC price: ₹350

New CBC price: ₹400

Old invoice must continue showing:
CBC = ₹350
```

## payments

```text
id
bill_id
payment_mode
amount
reference_number
paid_at
created_by
```

Payment modes:

```text
CASH
UPI
CARD
BANK_TRANSFER
OTHER
```

## bill_cancellations

```text
id
bill_id
reason
cancelled_by
cancelled_at
```

Do not physically delete bills.

Use bill cancellation with a reason.

## audit_logs

```text
id
user_id
action
entity
entity_id
old_value
new_value
created_at
```

Use audit logging for important actions such as:

- Bill cancellation
- Procedure price changes
- User changes
- Settings changes
- Database restore
- License events

---

# 7. Procedure Master

## Procedure List

Example:

```text
Procedure Master

[ + Add Procedure ]

Search: [ CBC................ ]

----------------------------------------------------
Code    Procedure       Category       Price Status
----------------------------------------------------
CBC001  Complete CBC    Hematology     350   Active
LFT001  LFT             Biochemistry   600   Active
TSH001  TSH             Hormones       300   Active
----------------------------------------------------
```

## Procedure fields

```text
Procedure Code *
Procedure Name *
Category *
Department
Sample Type
Price *
Status
```

## Procedure status

Use:

```text
Active
Inactive
```

Do not permanently delete procedures that are already used in bills.

---

# 8. Patient Module

The patient module should remain simple and fast.

## Patient fields

```text
Patient ID
Patient Name
Age
Gender
Mobile
Address
```

Automatically generate patient IDs:

```text
P000001
P000002
P000003
```

## Patient search

Allow search by:

- Patient ID
- Name
- Mobile

## Billing workflow

```text
Search patient
      ↓
Existing patient?
   ↙       ↘
 YES       NO
 ↓          ↓
Select    Create
```

---

# 9. Billing Module

Billing is the core application module.

Design the screen for fast keyboard-based billing.

```text
┌──────────────────────────────────────────────┐
│ NEW BILL                                    │
├──────────────────────────────────────────────┤
│ Patient Search [________________] [+ New]   │
│                                              │
│ Patient: Raj Kumar                           │
│ Age: 35     Gender: Male     Mobile: XXXXX  │
├──────────────────────────────────────────────┤
│ Procedure Search                            │
│ [ CBC________________ ]                     │
│                                              │
│ Code    Test              Rate    Qty Amount │
│ CBC001  Complete CBC      350     1   350   │
│ LFT001  Liver Function    600     1   600   │
│ TSH001  TSH               300     1   300   │
├──────────────────────────────────────────────┤
│ Subtotal                         ₹1,250      │
│ Discount                           ₹50       │
│ Round Off                           ₹0       │
│ TOTAL                            ₹1,200      │
│                                              │
│ Payment: [ CASH ▼ ]                         │
│                                              │
│ [ Save & Print ]   [ Save ]   [ Cancel ]    │
└──────────────────────────────────────────────┘
```

## Billing workflow

```text
New Bill
   ↓
Search/Create Patient
   ↓
Search Procedure
   ↓
Add Procedure
   ↓
Set Quantity
   ↓
Calculate Amount
   ↓
Apply Discount
   ↓
Calculate Net Amount
   ↓
Select Payment Mode
   ↓
Save Transaction
   ↓
Generate Bill Number
   ↓
Print Invoice
```

---

# 10. Billing Calculation Engine

Do not rely only on React-side calculations.

Create a centralized billing calculation service.

```text
Subtotal
= Σ(quantity × rate)

Discount
= item discount + bill discount

Tax
= applicable tax

Round Off
= configured rounding

Grand Total
= subtotal - discount + tax + round off
```

The native/backend layer must validate important calculations before saving.

---

# 11. Bill Numbering

Use a predictable bill number.

Example:

```text
LAB-2026-000001
LAB-2026-000002
LAB-2026-000003
```

Settings:

```text
Invoice Prefix: LAB
Financial Year: 2026-27
Starting Number: 1
```

Use a transactional sequence to prevent duplicate bill numbers.

---

# 12. Invoice

Support:

- A4 printing
- 80mm thermal printer
- Print preview
- Reprint
- PDF export

Example invoice:

```text
ABC DIAGNOSTIC LABORATORY
Address
Phone
Email

----------------------------------------
Bill No: LAB-2026-000123
Date: 19/09/2026
----------------------------------------

Patient:
Name: Raj Kumar
Age: 35
Gender: Male
Mobile: XXXXXXXX

----------------------------------------
Test                 Qty    Rate Amount
----------------------------------------
Complete Blood Count  1     350   350
Liver Function Test   1     600   600
TSH                   1     300   300
----------------------------------------

Subtotal                    ₹1,250
Discount                       ₹50
TOTAL                      ₹1,200

Payment: UPI

Thank you
```

---

# 13. Revenue Module

## Dashboard metrics

```text
Today's Revenue
Today's Bills
This Month Revenue
Total Bills
Cash Collection
UPI Collection
Card Collection
```

## Revenue filters

```text
From Date
To Date
Payment Mode
Procedure
User
Bill Status
```

## Daily collection

```text
Date          Bills     Revenue
19-Sep-2026   45        ₹28,450
18-Sep-2026   39        ₹22,350
17-Sep-2026   51        ₹31,200
```

## Payment mode

```text
Cash          ₹10,500
UPI           ₹12,750
Card          ₹5,200
---------------------
Total         ₹28,450
```

## Procedure revenue

```text
CBC              ₹12,500
LFT              ₹8,400
TSH              ₹4,500
Others           ₹3,050
```

---

# 14. Dashboard

Keep the dashboard lightweight.

```text
┌────────────────────────────────────────────┐
│ Dashboard                                  │
│                                            │
│ Today's Revenue      Today's Bills        │
│ ₹28,450              45                   │
│                                            │
│ Cash                 UPI                  │
│ ₹10,500              ₹12,750              │
│                                            │
│ [ + New Bill ]       [ Procedures ]       │
│                                            │
│ Recent Bills                              │
│ ------------------------------------------ │
│ LAB-000123  Raj Kumar       ₹1,200        │
│ LAB-000122  Priya           ₹850          │
└────────────────────────────────────────────┘
```

Avoid unnecessary charts and animations on low-spec PCs.

---

# 15. Backup and Restore

This is a critical feature because the application uses a local database.

## Manual backup

```text
Settings
   ↓
Backup & Restore
   ↓
[ Backup Now ]
```

Example:

```text
LabBilling_2026-09-19_2115.db
```

Allow backup to:

- USB
- External HDD
- Another local folder
- Network folder

## Automatic backup

Before application upgrades:

```text
database.db
     ↓
automatic backup
     ↓
database.db.bak
```

Optionally support:

- Daily backup
- Weekly backup
- Configurable retention

## Restore

```text
Backup & Restore

Available Backups

19/09/2026  09:15 PM
18/09/2026  09:30 PM
17/09/2026  09:20 PM

[ Restore ]
```

Require admin authentication before restoring.

---

# 16. Licensing Architecture

The licensing system should be designed from the beginning.

Create a separate license platform:

```text
lab-billing-license-server
```

## Cloud components

```text
License API
PostgreSQL
Admin Portal
```

## License database

### customers

```text
id
name
contact_name
email
phone
status
created_at
updated_at
```

### licenses

```text
id
customer_id
license_key_hash
plan
status
max_devices
expires_at
created_at
updated_at
```

### devices

```text
id
license_id
device_id
fingerprint_hash
device_name
activated_at
last_seen_at
status
```

### activations

```text
id
license_id
device_id
action
ip_address
created_at
```

### license_events

```text
id
license_id
event_type
metadata
created_at
```

---

# 17. Device-Bound Activation

The product should not be freely copyable between computers.

## Activation flow

```text
User opens application
        ↓
License screen
        ↓
Enter license key
        ↓
Generate device fingerprint
        ↓
HTTPS → License API
        ↓
Validate license
        ↓
Check device limit
        ↓
Bind license to device
        ↓
Return signed license
        ↓
Store encrypted local license
        ↓
Application activated
```

If a user copies the application to another PC:

```text
Registered Device
       ≠
New Device
       ↓
Activation denied
```

---

# 18. Device Fingerprinting

Do not rely on one hardware value.

Generate a stable fingerprint from multiple permitted machine characteristics.

Conceptually:

```text
Hardware characteristics
       ↓
Normalize
       ↓
Hash
       ↓
Device Fingerprint
```

Use a cryptographic hash such as SHA-256.

Do not unnecessarily collect or expose raw hardware identifiers.

---

# 19. Signed License

Do not place a private license secret inside the desktop application.

Use asymmetric cryptography.

```text
YOUR SERVER

License Data
     ↓
Private Signing Key
     ↓
Digital Signature
```

The desktop application contains only:

```text
Public Verification Key
```

The application verifies:

```text
License
+
Signature
+
Public Key
=
Valid / Invalid
```

An asymmetric signing algorithm such as Ed25519 is suitable.

---

# 20. Offline License Operation

The application should not contact your server for every bill.

Recommended model:

```text
Activation
    ↓
Online validation
    ↓
Signed license token
    ↓
Offline operation
```

Then perform periodic license validation.

For example:

```text
Every 30 / 60 / 90 days
```

The exact period can be a commercial policy.

Normal billing remains available without internet during the permitted offline period.

---

# 21. License Admin Portal

Your private web admin portal should contain:

```text
Dashboard
Customers
Licenses
Devices
Activations
License Events
```

Example:

```text
ABC Diagnostics

License:
LAB-2026-ABCD

Plan:
Annual

Devices:
1 / 1

Expires:
19 Sep 2027

Status:
ACTIVE

[ Reset Device ]
[ Suspend ]
[ Extend ]
```

You should be able to:

- Create license
- Activate license
- Suspend license
- Revoke license
- Reset device
- Transfer license
- Extend expiry
- Change device limits
- View activation history
- View last validation
- View license events

---

# 22. License Types

Potential commercial plans:

## Monthly

```text
Monthly subscription
1 device
```

## Annual

```text
Annual subscription
1 device
```

## Lifetime

```text
Lifetime license
1 device
```

Additional devices can be sold separately.

The exact pricing should be defined later.

---

# 23. Windows Installation

Distribute a normal Windows installer:

```text
LabBilling-Setup-1.0.0.exe
```

Do not distribute only a ZIP or portable executable.

## Installation locations

Application:

```text
C:\Program Files\LabBilling\
```

Local data:

```text
C:\ProgramData\LabBilling\
    ├── database\
    │     └── labbilling.db
    ├── backups\
    ├── exports\
    └── logs\
```

Keep application files and customer data separate.

This allows application upgrades without overwriting billing data.

---

# 24. First Launch

After installation:

```text
LAB BILLING

License Activation

License Key
[ LAB-XXXX-XXXX-XXXX ]

[ Activate ]
```

After successful activation:

```text
ACTIVATED ✓
Device: Registered
License: Annual
Expiry: 19/09/2027
```

Then show the application login.

---

# 25. PC Replacement

A legitimate customer may replace their computer.

Support:

```text
Old PC
   ↓
Admin Portal
   ↓
Reset Device
   ↓
Old activation released
   ↓
New PC
   ↓
Enter license
   ↓
New device activated
```

This prevents legitimate users from getting permanently locked out.

---

# 26. Application Updates

Use semantic versions:

```text
1.0.0
1.0.1
1.1.0
2.0.0
```

Update flow:

```text
Application starts
      ↓
Check update metadata
      ↓
New version?
   ↙       ↘
 NO        YES
 ↓          ↓
Continue   Show update
```

Before an update:

```text
Automatic database backup
        ↓
Install update
        ↓
Run migrations
        ↓
Start application
```

The database must never be overwritten by an application update.

---

# 27. Database Migrations

Use versioned migrations.

Example:

```text
001_initial_schema
002_add_patients
003_add_payment_reference
004_add_audit_logs
005_add_invoice_settings
```

On application startup:

```text
Current DB version = 4
Required version = 5

Run migration 005

Start application
```

This is critical once the product is deployed to multiple labs.

---

# 28. Project Structure

Recommended monorepo:

```text
lab-billing/
│
├── apps/
│   ├── desktop/
│   │   ├── src/
│   │   └── src-tauri/
│   │
│   ├── license-api/
│   │
│   └── admin/
│
├── packages/
│   ├── shared-types/
│   ├── validation/
│   └── billing-engine/
│
├── database/
│   └── migrations/
│
├── docs/
│
└── README.md
```

---

# 29. Development Phases

## Phase 1 — Foundation

Build:

- Tauri
- React
- TypeScript
- Tailwind
- SQLite
- Application shell
- Routing
- Configuration
- Logging

### Deliverable

Application launches and connects to SQLite.

---

## Phase 2 — Authentication

Build:

- Admin user
- Cashier user
- Password hashing
- Login
- Logout
- Session management
- Role permissions

### Deliverable

Secure local login.

---

## Phase 3 — Procedure Master

Build:

- Procedure categories
- Procedure CRUD
- Search
- Filtering
- Active/inactive
- Validation

### Deliverable

Complete procedure management.

---

## Phase 4 — Patient Module

Build:

- Create patient
- Search patient
- Edit patient
- Patient ID
- Mobile search
- Patient history

### Deliverable

Reusable patient records.

---

## Phase 5 — Billing

Build:

- New bill
- Patient selection
- Procedure selection
- Billing cart
- Quantity
- Discount
- Calculation
- Payment
- Bill numbering
- Transaction save

### Deliverable

Complete billing workflow.

---

## Phase 6 — Invoice

Build:

- A4 invoice
- Thermal invoice
- Print preview
- Print
- Reprint
- PDF export

### Deliverable

Production-ready invoice.

---

## Phase 7 — Revenue

Build:

- Daily revenue
- Date range
- Payment mode
- Procedure revenue
- Cancelled bills
- Discounts
- Export

### Deliverable

Management reporting.

---

## Phase 8 — Backup

Build:

- Manual backup
- Automatic backup
- Restore
- Backup history
- Database integrity check

### Deliverable

Reliable local data protection.

---

## Phase 9 — Licensing

Build:

- License API
- License database
- Customer management
- License creation
- Device fingerprint
- Activation
- Signed license
- Offline validation
- Device reset

### Deliverable

Commercial licensing.

---

## Phase 10 — Admin Portal

Build:

```text
Dashboard
Customers
Licenses
Devices
Activations
Events
```

### Deliverable

Remote license management platform.

---

# 30. Testing Strategy

## Functional testing

Test:

- Create bill
- Multiple procedures
- Quantity
- Discounts
- Payment modes
- Reprint
- Cancel bill
- Revenue
- Patient search
- Procedure changes

## Database testing

Test:

- Database creation
- Database migrations
- Backup
- Restore
- Database integrity
- Large datasets

Test with:

```text
1,000 bills
10,000 bills
100,000 bills
```

## Offline testing

Disconnect internet and verify:

```text
✓ Login
✓ Patient creation
✓ Billing
✓ Printing
✓ Revenue
✓ Reports
✓ Backup
✓ Restore
```

## Licensing testing

Test:

```text
PC A → activation succeeds
PC B → activation follows device limit
Expired license → blocked
Suspended license → blocked after validation
Device replacement → reset + activation
Invalid license → blocked
Modified license → rejected
```

---

# 31. Security Requirements

Implement:

- Password hashing
- Role-based permissions
- Input validation
- Parameterized SQL
- SQLite transactions
- Audit logs
- Signed licenses
- Secure local license storage
- HTTPS for license API
- Server-side license validation
- No private signing keys in client
- Code signing for Windows installer
- Database backup before updates
- Database backup before restore
- Secure error logging without sensitive data

Do not attempt to make the application impossible to crack. The objective is strong commercial protection while keeping legitimate customers' experience simple.

---

# 32. Windows Code Signing

For commercial distribution, use a legitimate Windows code-signing certificate.

The installer should display your company/product publisher identity instead of an alarming unknown-publisher warning.

Sign:

- Installer
- Main executable
- Relevant binaries

---

# 33. UI/UX Principles

The product is for reception/cashier users.

Prioritize:

**Speed > visual effects**

Use:

- Compact tables
- Fast search
- Keyboard navigation
- Clear totals
- Minimal animations
- Large readable amounts
- Consistent dialogs
- Clear validation messages

Useful shortcuts:

```text
F2        → New Bill
F4        → Patient Search
F6        → Procedure Search
Ctrl + S  → Save
Ctrl + P  → Print
Esc       → Close dialog
```

---

# 34. Product Deployment Workflow

The commercial workflow should be:

```text
Customer purchases product
        ↓
Create customer in admin portal
        ↓
Generate license
        ↓
Send installer + license key
        ↓
Customer installs application
        ↓
Customer activates
        ↓
Device becomes bound
        ↓
Application is ready
```

Renewal:

```text
License nearing expiry
        ↓
Customer renews
        ↓
Extend license in admin portal
        ↓
Application validates
        ↓
Application continues
```

---

# 35. V1 Release Checklist

## Application

- [ ] Login
- [ ] Dashboard
- [ ] Patient
- [ ] Procedure Master
- [ ] Billing
- [ ] Invoice
- [ ] Revenue
- [ ] Reports
- [ ] Settings
- [ ] Backup
- [ ] Restore

## Security

- [ ] Password hashing
- [ ] Role permissions
- [ ] Audit logs
- [ ] License verification
- [ ] Device binding
- [ ] Signed license
- [ ] Secure local storage

## Windows

- [ ] Installer
- [ ] Uninstaller
- [ ] Desktop shortcut
- [ ] Start Menu shortcut
- [ ] Code signing
- [ ] Printer testing
- [ ] Windows 10 testing
- [ ] Windows 11 testing
- [ ] 4 GB RAM testing

## Reliability

- [ ] Database migration
- [ ] Backup before update
- [ ] Crash recovery
- [ ] Transaction rollback
- [ ] Database integrity check
- [ ] Offline operation

---

# 36. Recommended Development Order

Do not start with the licensing server.

Build the core product first:

```text
Tauri + React
      ↓
SQLite
      ↓
Authentication
      ↓
Procedure Master
      ↓
Patient
      ↓
Billing
      ↓
Invoice
      ↓
Revenue
      ↓
Backup / Restore
      ↓
Testing
      ↓
Windows Installer
      ↓
License Server
      ↓
Admin Portal
      ↓
Production Release
```

---

# 37. Final V1 Architecture

```text
                    ┌─────────────────────┐
                    │   YOUR ADMIN PANEL  │
                    │                     │
                    │ Customers           │
                    │ Licenses            │
                    │ Devices             │
                    │ Activations         │
                    │ Renewals            │
                    └──────────┬──────────┘
                               │
                         HTTPS / API
                               │
                               ▼
                    ┌─────────────────────┐
                    │   LICENSE SERVER    │
                    │                     │
                    │ Node.js             │
                    │ PostgreSQL          │
                    └──────────┬──────────┘
                               │
                     Activation / Validation
                               │
                               ▼
┌─────────────────────────────────────────────────┐
│              CUSTOMER WINDOWS PC                │
│                                                 │
│             LAB BILLING APPLICATION             │
│                                                 │
│  Tauri + React + TypeScript                    │
│                                                 │
│  Dashboard                                     │
│  Patients                                      │
│  Billing                                       │
│  Procedures                                    │
│  Revenue                                       │
│  Reports                                       │
│  Settings                                      │
│  Backup / Restore                              │
│                                                 │
│                  SQLite                         │
│                                                 │
│       ← Normal operation is offline →          │
└─────────────────────────────────────────────────┘
```

---

# 38. Product Direction

The V1 should be a small, fast, reliable commercial product:

```text
OFFLINE
+
LIGHTWEIGHT
+
FAST
+
LOCAL DATABASE
+
DEVICE-BOUND LICENSE
+
BACKUP/RESTORE
+
PROFESSIONAL BILLING
```

The architecture should then allow future expansion into a complete diagnostic laboratory system without rebuilding the billing core.
