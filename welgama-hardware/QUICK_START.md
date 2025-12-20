# 🚀 Quick Start - Neon Database Setup

## 1️⃣ Create Neon Database
- Go to https://neon.tech
- Sign up and create a new project
- Copy your connection string

## 2️⃣ Configure Environment
Create `.env` file in project root:
```env
DATABASE_URL="postgresql://user:pass@host.neon.tech/dbname?sslmode=require"
NEXTAUTH_SECRET="run command below to generate"
NEXTAUTH_URL="http://localhost:3000"
```

Generate secret (PowerShell):
```powershell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Minimum 0 -Maximum 256 }))
```

## 3️⃣ Setup Database (One Command)
```bash
pnpm db:setup
```

## 4️⃣ Run Application
```bash
pnpm dev
```

## 5️⃣ Login
- URL: http://localhost:3000/login
- Username: `admin`
- Password: `admin123`

---

**See NEON_SETUP.md for detailed instructions**
