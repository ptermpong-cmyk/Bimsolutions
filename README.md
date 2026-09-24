# BiMSolutions — Web + Revit Plug-in Auth System

ระบบสมัครสมาชิก + ล็อกอิน สำหรับใช้ทั้งบนเว็บ (GitHub Pages) และใน Revit Plug-in

## Architecture

```
┌─────────────────────┐          ┌──────────────────────┐
│   GitHub Pages      │          │      Supabase        │
│  (Web Landing)      │──────────▶   • Auth (JWT)       │
│  bimsolutions-th.com    │  HTTPS   │   • profiles table   │
└─────────────────────┘          │   • trial_requests   │
                                 │   • subscriptions    │
┌─────────────────────┐          │                      │
│  Revit Plug-in      │──────────▶                      │
│  (C# .NET Add-in)   │  HTTPS   └──────────────────────┘
└─────────────────────┘
```

ผู้ใช้สมัครที่เว็บ → ล็อกอินใน Revit ด้วยอีเมล/รหัสผ่านเดียวกัน → Plug-in ตรวจสอบสิทธิ์กับ Supabase → ปลดล็อกฟีเจอร์ตามแพ็คเกจ

---

## 1. ตั้งค่า Supabase (Backend)

### 1.1 สร้างโปรเจกต์
1. เข้า https://supabase.com → Sign up (ใช้ GitHub ล็อกอินได้)
2. New Project → ตั้งชื่อ `bimsolutions` → เลือก Region: **Southeast Asia (Singapore)**
3. บันทึก Database Password ไว้

### 1.2 สร้างตาราง (Run SQL Editor)
คัดลอกไฟล์ `supabase_schema.sql` ทั้งหมด ไปวางใน SQL Editor → Run

### 1.3 คัดลอก Credentials
Settings → API → คัดลอก:
- **Project URL** (ขึ้นต้น `https://xxx.supabase.co`)
- **anon public key** (ยาว ๆ)

### 1.4 เปิดใช้ Google + Microsoft OAuth (สำหรับ Gmail/Hotmail Login)

**Google:**
1. เข้า https://console.cloud.google.com → New Project → ตั้งชื่อ `bimsolutions`
2. APIs & Services → OAuth consent screen → External → กรอกข้อมูล
3. Credentials → Create OAuth Client ID → Web application
   - Authorized redirect URI: `https://YOUR-PROJECT.supabase.co/auth/v1/callback`
4. คัดลอก **Client ID** และ **Client Secret**
5. กลับมาที่ Supabase → Authentication → Providers → Google → Enable → วาง Client ID/Secret → Save

**Microsoft (Hotmail/Outlook):**
1. เข้า https://portal.azure.com → Azure Active Directory → App registrations → New registration
2. ตั้งชื่อ `BiMSolutions` → Supported account types: **Personal Microsoft accounts + Work/School**
3. Redirect URI: Web → `https://YOUR-PROJECT.supabase.co/auth/v1/callback`
4. Register → คัดลอก **Application (client) ID**
5. Certificates & secrets → New client secret → คัดลอกค่า `Value`
6. กลับมาที่ Supabase → Authentication → Providers → **Azure** (คือ Microsoft) → Enable → วาง Client ID/Secret → Save

**สำคัญ:** กฎ "ต้องสมัครก่อน" ถูกบังคับที่ระดับเว็บ (JavaScript check profiles) — ผู้ใช้ OAuth ที่ไม่เคยสมัคร จะถูก sign out ทันทีพร้อม toast แจ้งเตือน

---

## 2. Deploy เว็บบน GitHub Pages

### 2.1 สร้าง Repository
```bash
git init
git add .
git commit -m "Initial BiMSolutions landing page"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/bimsolutions.git
git push -u origin main
```

### 2.2 เปิดใช้ GitHub Pages
Repository → Settings → Pages → Source: `main` branch, folder: `/ (root)` → Save

เว็บจะขึ้นที่ `https://YOUR_USERNAME.github.io/bimsolutions/` ภายใน 1-2 นาที

### 2.3 กรอก Supabase credentials
เปิดไฟล์ `bimsolutions_revit_extension.html` แก้ตรงนี้:
```javascript
window.BIMS_CONFIG = {
  SUPABASE_URL: 'https://xxx.supabase.co',          // ← ใส่ของคุณ
  SUPABASE_ANON_KEY: 'eyJhbGci...ยาว...'            // ← ใส่ของคุณ
};
```
Push ขึ้น GitHub อีกครั้ง → เว็บพร้อมใช้งานจริง

### 2.4 (Optional) Custom Domain
ถ้ามี domain เช่น `bimsolutions-th.com` → Settings → Pages → Custom domain

---

## 3. เชื่อม Revit Plug-in (C# .NET)

### 3.1 ติดตั้ง NuGet
```
Install-Package Supabase
```

### 3.2 ใส่ Config ใน Plug-in
ดูไฟล์ `RevitPluginAuth.cs` — เอาโค้ดไปใส่ในโปรเจกต์ Revit Add-in ของคุณ กรอก `SupabaseUrl` และ `SupabaseAnonKey` ให้ตรงกับเว็บ

### 3.3 ใช้ในหน้า Login
เมื่อผู้ใช้กรอก Email + Password กด Login → เรียก:
```csharp
var result = await BimsAuth.SignInAsync(email, password);
if (result.Success) {
    // Token stored — call BimsAuth.CanUseExtension() เพื่อเช็กสิทธิ์
}
```

---

## 4. Database Schema Overview

| Table | Purpose |
|---|---|
| `auth.users` | Supabase ทำให้อัตโนมัติ — เก็บ email + password hash |
| `profiles` | ชื่อ, บริษัท, ตำแหน่ง (linked to auth.users) |
| `trial_requests` | คำขอทดลองใช้ + สถานะ |
| `subscriptions` | แผนที่ใช้ (trial / paid / expired) |

---

## 5. Security Notes

✅ Supabase จัดการ password hashing (bcrypt) และ JWT tokens ให้อัตโนมัติ  
✅ Row Level Security (RLS) เปิดใน schema — user เห็นได้แค่ข้อมูลตัวเอง  
⚠️ **อย่า** ใส่ `service_role` key ในเว็บหรือ plug-in — ใช้แค่ `anon key` เท่านั้น  
⚠️ Anon key เปิดเผยได้ แต่ RLS จะป้องกันการเข้าถึงที่ไม่ควร

---

## 6. Costs (ณ 2026)

**Supabase Free Tier** ครอบคลุมได้:
- 50,000 monthly active users
- 500 MB database
- 5 GB bandwidth/เดือน
- Auth + Storage + Realtime

**GitHub Pages Free**: ไม่จำกัด traffic สำหรับ public repo

รวมทั้งระบบ = **฿0/เดือน** จนกว่าจะโตเกินขีดจำกัด (Supabase Pro = $25/เดือน)

---

## ติดต่อ

BiMSolutions · p.termpong@gmail.com · 095-960-5664
