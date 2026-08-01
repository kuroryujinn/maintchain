# MaintChain User Onboarding Guide

> **Goal:** Get 50+ real users with wallet interactions on MaintChain.
> **Live App:** [https://maintchain.vercel.app](https://maintchain.vercel.app)

---

## Quick Start (5 minutes)

### 1. Install Freighter Wallet

Freighter is a browser extension wallet for the Stellar network.

**Chrome / Edge / Brave:**
1. Visit [freighter.app](https://www.freighter.app/)
2. Click **"Install Freighter"**
3. Add the extension to your browser
4. Click the Freighter icon in your browser toolbar

**Create an account:**
1. Open Freighter → **"Create a new wallet"**
2. Save your recovery phrase — this is the only way to restore your wallet
3. Set a password
4. You now have a Stellar wallet! 🎉

### 2. Fund Your Testnet Account

MaintChain runs on Stellar Testnet (not real money). Use the Friendbot to get free test tokens:

1. Copy your Stellar public address from Freighter (starts with `G...`)
2. Open [Stellar Lab Friendbot](https://lab.stellar.org/)
3. Paste your address and click **"Get test network lumens"**
4. You'll receive 10,000 test XLM — enough for thousands of contract calls

### 3. Connect to MaintChain

1. Open [MaintChain live app](https://maintchain.vercel.app)
2. Click **"Connect Wallet"** in the top navigation bar
3. Approve the Freighter connection popup
4. Your wallet address and XLM balance appear 👋

> **⚠️ Important:** Ensure Freighter is set to **TESTNET** network.
> Click the Freighter icon → Settings → Network → **Testnet**

### 4. Register Your Account (New! 🆕)

Now you can register directly in the app! No need for command-line tools:

1. Go to **[Register](/register)** in the navigation
2. Your connected wallet is detected automatically
3. **Approve the signature challenge** in Freighter — this creates your session cookie and is required before any account action
4. Fill in your **name**, select your **role** — exactly one of **Technician, Supervisor, Auditor, Equipment Owner** (these are the four roles the backend accepts; "Regulator" is not a registration role)
5. Add your **organization** (optional)
6. Click **Register on MaintChain**
7. ✅ You're now a registered network participant!

> **Already registered?** If your wallet already has a profile, the page shows an **Already Registered** panel (with links to Dashboard and Get Verified) instead of the form. Registering the same wallet twice is rejected with a clean message — it is not a server error.

### 5. Get Verified (Prove Your Identity On-Chain)

Get Verified writes your identity (role, organization, and a SHA-256 hash of your profile) to the on-chain `IdentityRegistry` contract — a portable identity that travels with your Stellar wallet:

1. Go to **[Get Verified](/get-verified)** and click **Start Verification**
2. Connect Freighter (Testnet) and approve the signature challenge
3. The app checks backend readiness, then looks up your wallet:
   - **Not registered yet** → a "Create Your Identity Profile" form appears
   - **Already registered** → it jumps straight to Review & Execute
4. If the form appeared, fill in name / role / organization, then **Create Profile & Continue**
5. On the Review screen, click **Sign Verification Transaction**
6. Approve the transaction in Freighter (pays a small amount of testnet XLM for gas)
7. Wait for confirmation → **success screen** with your transaction hash and a **View on Stellar Expert** link (`https://stellar.expert/explorer/testnet/tx/<hash>`)

**Under the hood:** the page hashes your profile and organization, calls `IdentityRegistry.verify_identity` via the simulate → sign → submit → poll pipeline, then mirrors the result to the backend.

### 6. Explore the Platform

Once registered, try these paths based on your role:

| Role | Start Here | What You'll Do |
|------|-----------|----------------|
| **Technician** | `/upload` | Upload maintenance evidence, submit hashes on-chain |
| **Supervisor** | `/approve` | Accept or reject maintenance records |
| **Auditor** | `/audit` | Review audit trails, issue compliance certificates |
| **General** | `/dashboard` | View compliance metrics and reports |
| **Discovery** | `/workers`, `/machines`, `/certificates` | Browse network data |
| **Community** | [`/users`](/users) | See all registered users on the network |

---

## Step-by-Step Walkthrough (For Sharing with New Users)

### 👨‍🔧 Technician Flow

*Try this if you want to simulate being a field technician.*

1. **Connect wallet** (see Quick Start above)
2. **Register at** [`/register`](/register) — web form, no terminal needed
3. **Get Verified** at [`/get-verified`](/get-verified) — prove your identity on-chain (see Quick Start step 5)
4. Go to **Upload Evidence** (`/upload`)
5. Enter a maintenance record UUID (e.g., `11111111-1111-1111-1111-111111111101` — you'll need a matching record in the backend)
6. Drag and drop any file (photo, screenshot, PDF)
7. Click **Submit Evidence**
8. ✅ You've submitted evidence to the blockchain!
4. Enter a maintenance record UUID (e.g., `11111111-1111-1111-1111-111111111101` — you'll need a matching record in the backend)
5. Drag and drop any file (photo, screenshot, PDF)
6. Click **Submit Evidence**
7. ✅ You've submitted evidence to the blockchain!

### 👔 Supervisor Flow

*Try this if you want to simulate being a maintenance supervisor.*

1. **Connect wallet** (and register at `/register`; optionally Get Verified at `/get-verified`)
2. Go to **Approval Center** (`/approve`)
3. You'll see pending maintenance records (fetched from backend API)
4. Click **Approve** or **Reject** on a record
5. Add a note explaining your decision
6. ✅ Your decision is recorded on-chain!

### 🧾 Auditor Flow

*Try this if you want to simulate being a compliance auditor.*

1. **Connect wallet** (and register at `/register`; optionally Get Verified at `/get-verified`)
2. Go to **Audit Timeline** (`/audit`)
3. Review the full approval history
4. Click **Issue Compliance Certificate**
5. Fill in your auditor details
6. ✅ A verifiable certificate is created!

### 👀 Explorer Flow

*Try this if you just want to look around.*

1. Browse **Live Network** (`/live-network`) — real-time activity
2. Visit **Worker Profiles** (`/workers/elena-fischer`)
3. Check **Machine Passports** (`/machines/MCH-1104`)
4. View **Certificates** (`/certificates/CERT-DE-4471`)
5. See the **Leaderboard** (`/leaderboard`)
6. Explore **Industries** (`/industries`)
7. Track **Registered Users** (`/users`) — see who's on the network!

---

## 📋 User Onboarding Form

As part of the Level 5 onboarding requirement, please fill out this Google Form:

> **[📝 MaintChain User Onboarding Form](https://forms.gle/YOUR_FORM_LINK)**
>
> Fields: Wallet Address, Email, Name, Role, Rating (1-5)

Your responses will be exported to an Excel sheet for analysis and stored in `docs/user-feedback-responses.xlsx`.

---

## 📊 Rate Your Experience

After exploring, please rate MaintChain at:

> **[⭐ Submit Feedback](/feedback)**
>
> Rate 1-5 stars, select a category, and share your thoughts!

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| "Freighter not found" | Install the Freighter browser extension and refresh |
| "Network mismatch" | Set Freighter to Testnet (Settings → Network → Testnet) |
| "Account not found" | Fund your account via [Stellar Lab Friendbot](https://lab.stellar.org/) |
| Connection popup doesn't appear | Check your browser's popup blocker |
| Balance shows 0 XLM | Use Friendbot to get free test tokens |
| "Simulation failed" | The Soroban RPC may be slow — try again in a few seconds |
| "Signature Rejected" | You declined the transaction in Freighter — re-approve on retry |
| "User Lookup Failed" | Non-404 error from the profile lookup (backend/network issue) — try again |
| "Confirmation Timeout" | Transaction submitted but not confirmed within ~15s of polling — check Stellar Expert via the shown hash |
| "Already Registered" | Your wallet already has a profile — use the Dashboard or Get Verified |
| "Contract Not Configured" | The IdentityRegistry contract ID is missing from the deployment env — contact the operator |

---

## Proof of Wallet Interaction

To verify your wallet interaction for Level 5 tracking:

1. Register at [`/register`](/register) — your wallet address is stored in the system
2. Get Verified at [`/get-verified`](/get-verified) — your on-chain identity is recorded in the `IdentityRegistry` contract
3. Take a screenshot showing your connected wallet in the MaintChain app
3. Submit feedback at [`/feedback`](/feedback) with a rating
4. Your wallet connection and feedback events are captured in the system

---

## Feedback

While using MaintChain, you can provide feedback in two ways:

1. **Floating button** — Click the 💬 button (bottom-right corner) for quick feedback
2. **[Feedback page](/feedback)** — Full form with star ratings and category selection

Your feedback directly shapes the platform. Thank you! 🙏

---

## Next Steps After Onboarding

1. Complete at least one on-chain action (evidence upload, approval, or certification)
2. Submit feedback via the [Feedback page](/feedback)
3. Share MaintChain with colleagues
4. Follow development on [GitHub](https://github.com/kuroryujinn/maintchain)
5. Check the [Users page](/users) to see the network growing!

---

*MaintChain — Verifiable reputation for industrial maintenance*
*Built on Stellar Soroban* ⚡
