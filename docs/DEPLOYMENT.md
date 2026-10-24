# Deploying DeveloperOS on developeros.page

| Address | Hosted on | Serves |
|---|---|---|
| `https://developeros.page` (+ `www.developeros.page`) | **Vercel** | the website (React app) |
| `https://api.developeros.page` | **Render** (Docker) | the main API |
| `https://chat.developeros.page` | **Render** (Docker) | the AI chat service |
| MongoDB Atlas | Atlas | the database |

All three addresses are subdomains of `developeros.page`, so browsers treat them as one site. That lets the
secure login cookie (`httpOnly`, `SameSite=Strict`, stored on `api.developeros.page`) work, and users stay
signed in across reloads. This layout has been tested end to end.

The repository is already configured for these addresses:

- `render.yaml` creates both Render services and pre-fills the public URLs.
- `frontend/vercel.json` holds the build settings and page routing.

You only enter secrets, DNS records and the OAuth settings.

> `.page` domains only work over **HTTPS**; browsers refuse plain `http://`. Vercel and Render issue the
> certificates automatically once your DNS records are in place, so expect the site to be unreachable until then.

---

## Step 0. Prepare (10 minutes)

1. **Code on `main`.** On GitHub, open a pull request from `release/v2.0` into `main` and merge it.
2. **Atlas network access.** Atlas → **Network Access → Add IP Address → `0.0.0.0/0`**. Render's outbound IPs aren't fixed; a strong database password protects the database.
3. **Have these ready** (never commit them):
   - Atlas connection string
   - Groq API key
   - Google OAuth client ID and secret
   - GitHub OAuth client ID and secret
   - Gmail address and App Password
4. **Know where your domain's DNS is managed:** the registrar where you bought `developeros.page` (Namecheap, GoDaddy, Porkbun, Cloudflare, Squarespace, …). You'll add four records there.

---

## Step 1. Deploy the API and chat service on Render (20–30 minutes)

1. Go to https://dashboard.render.com → **New + → Blueprint**.
2. Connect GitHub if asked, then pick the **DeveloperOS** repository (branch `main`).
3. Render reads `render.yaml` and shows **developeros-api** and **developeros-chat**. Fill in the prompted values:

   | Service | Variable | Value |
   |---|---|---|
   | both | `MONGO_URI` | your Atlas connection string |
   | both | `GROQ_API_KEY` | your Groq key |
   | api | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | from Google Cloud (Step 5) |
   | api | `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` | from your GitHub OAuth app (Step 6) |
   | api | `SMTP_USER` | your Gmail address |
   | api | `SMTP_PASSWORD` | your 16-character Gmail App Password |
   | api | `SMTP_FROM` | `PersonalOS <your-address@gmail.com>` |

   Already set for you: `APP_ENV=production`, `FRONTEND_URL=https://developeros.page`, the Google and GitHub callback URLs, `SMTP_HOST`/`SMTP_PORT`, and a random `JWT_SECRET` shared by both services.
4. Click **Apply**. The first build takes about 5 minutes for the API and about 10 minutes for the chat service.
5. When both are **Live**, check the temporary addresses Render gave them:
   - `https://developeros-api.onrender.com/api/health` → `{"status":"OK", …}`
   - `https://developeros-chat.onrender.com/api/health` → `{"status":"OK","service":"chat"}`

   If a name was taken, Render adds a suffix; use whatever address it shows.

### Add the custom domains on Render
6. Open **developeros-api** → **Settings → Custom Domains → Add Custom Domain** → enter `api.developeros.page`. Render shows the DNS record to create (a **CNAME** pointing to `developeros-api.onrender.com` or similar). Keep this tab open.
7. Do the same on **developeros-chat** with `chat.developeros.page`.

---

## Step 2. Deploy the website on Vercel (10 minutes)

1. Go to https://vercel.com/new and import the **DeveloperOS** repository.
2. **Root Directory:** click **Edit** and select **`frontend`**. The framework is detected as **Vite**, and build settings come from `vercel.json`.
3. **Environment Variables:**

   | Name | Value |
   |---|---|
   | `VITE_API_URL` | `https://api.developeros.page` |
   | `VITE_CHAT_API_URL` | `https://chat.developeros.page` |

   These are compiled into public JavaScript, so never put secrets in `VITE_*` variables.
4. Click **Deploy**.
5. Project → **Settings → General → Node.js Version → 22.x**. If it was different, redeploy (Deployments → ⋯ → Redeploy).

### Add your domain on Vercel
6. Project → **Settings → Domains** → add `developeros.page`. When asked, also add `www.developeros.page` and choose to **redirect `www` to `developeros.page`**.
7. Vercel shows the DNS records it needs, usually an **A** record for `developeros.page` and a **CNAME** for `www`. Keep this tab open too.

---

## Step 3. Create the DNS records (5 minutes, then wait)

At your domain registrar's DNS settings, add the records that Vercel and Render showed you. Copy the exact
values from their dashboards; the ones below are typical:

| Type | Name / Host | Value / Target | For |
|---|---|---|---|
| A | `@` | `76.76.21.21` (use the IP Vercel shows) | developeros.page → Vercel |
| CNAME | `www` | `cname.vercel-dns.com` (as Vercel shows) | www → Vercel |
| CNAME | `api` | `developeros-api.onrender.com` (as Render shows) | API |
| CNAME | `chat` | `developeros-chat.onrender.com` (as Render shows) | Chat service |

- Delete any existing **A/AAAA/CNAME** records for `@`, `www`, `api` or `chat` that point elsewhere, such as the registrar's parking page.
- If you use **Cloudflare**, set these records to **DNS only** (grey cloud) so Vercel and Render can issue certificates.
- Records usually take effect within minutes but can take a few hours. In the Vercel and Render dashboards, wait until each domain shows **Verified / Certificate issued**.

---

## Step 4. Check the deployment addresses

- https://api.developeros.page/api/health → `{"status":"OK", …}`
- https://chat.developeros.page/api/health → `{"status":"OK","service":"chat"}`
- https://developeros.page → the landing page
- https://www.developeros.page → redirects to https://developeros.page

---

## Step 5. Google sign-in settings

Google Cloud Console → **APIs & Services** (Google Auth Platform) for your project:

1. **Clients / Credentials** → your OAuth client:
   - **Authorized JavaScript origins:** add `https://developeros.page`
   - **Authorized redirect URIs:** add `https://api.developeros.page/api/auth/google/callback`
2. **Branding / OAuth consent screen:**
   - Under **Authorized domains**, add `developeros.page`.
   - Set the **Application home page** to `https://developeros.page`.
3. **Audience:**
   - While the app is in **Testing**, only the Google accounts listed under **Test users** can sign in. Add yours and your testers'.
   - To let anyone sign in, click **Publish app**. Google asks for a privacy-policy link on your domain before publishing, so add that page first.

You can keep the existing `localhost` entries so local development keeps working.

---

## Step 6. GitHub OAuth app

A GitHub OAuth app has one callback URL, so create a separate one for production: GitHub → **Settings → Developer settings → OAuth Apps → New OAuth App**.

- **Homepage URL:** `https://developeros.page`
- **Authorization callback URL:** `https://api.developeros.page/api/github/callback`

Put its client ID and secret into **developeros-api → Environment** on Render. Saving restarts the service.

---

## Step 7. Test everything

1. Open https://developeros.page → **Get Started** → create an account. The 6-digit code should arrive by email; check Spam the first time.
2. **Reload the page.** You should still be logged in, which confirms the cross-subdomain cookie works.
3. Log out → **Continue with Google**.
4. On the Overview page connect **GitHub**, **LeetCode** and **GeeksforGeeks**.
5. Open the **AI assistant** and ask a question. The first answer takes a little longer while your profile is indexed.

---

## Step 8. Chrome extension

1. `cd extensions/chrome && npm install && npm run build`, then Chrome → `chrome://extensions` → **Developer mode** → **Load unpacked** → `extensions/chrome/dist`.
2. In the popup, set **Server URL** to `https://api.developeros.page`, and allow access when Chrome asks.
3. Paste the token from the dashboard: **Activity Tracker → Copy Token**.

---

## Good to know

- **Render free services sleep** after ~15 minutes without traffic. The first request afterwards can take up to a minute, so just retry. Paid Render plans stay awake.
- **Chat service memory.** It uses ~110 MB at rest and peaks around 270 MB while indexing a profile, well within Render's 512 MB free instance.
- **The vector index is rebuilt automatically.** On the free plan the chat service's disk is temporary, but after a restart the index is rebuilt from MongoDB on the next question.
- **Updates deploy automatically.** Pushing to `main` redeploys Vercel and both Render services.
- **Email from your own domain** (e.g. `no-reply@developeros.page`) needs an email provider that supports custom domains (Brevo, SendGrid, Zoho, Google Workspace…). Put its SMTP settings into the `SMTP_*` variables on Render.

## Troubleshooting

| Problem | Fix |
|---|---|
| Site shows a certificate or "not secure" error | DNS records aren't in place or verified yet. Check that Vercel/Render show the domain as verified, and wait. |
| Logged out on every reload | `VITE_API_URL` must be `https://api.developeros.page`, and the site must be opened on `developeros.page` (not a `*.vercel.app` preview address). |
| `403 Origin not allowed` / `Missing CSRF header` | `FRONTEND_URL` on Render must be exactly `https://developeros.page`, with no trailing slash. |
| Google: `redirect_uri_mismatch` | The redirect URI in Google Cloud must be exactly `https://api.developeros.page/api/auth/google/callback`. |
| Google: *Access blocked* | Add your account as a test user, or publish the app. |
| Sign-up says email isn't configured (503) | Set `SMTP_USER`, `SMTP_PASSWORD` and `SMTP_FROM` on **developeros-api**; production requires them. |
| Browser console: *blocked by CORS policy* on `chat.developeros.page` | Usually the chat service crashed, restarted or was waking up, and Render answered with its own error page, which has no CORS header. Check **developeros-chat → Logs**, then retry. If the logs show *out of memory*, make sure you've deployed the latest version (ONNX embeddings). |
| Chatbot can't reach the chat service | Check https://chat.developeros.page/api/health and that `VITE_CHAT_API_URL` is `https://chat.developeros.page`. |
| MongoDB errors in Render logs | Atlas Network Access must include `0.0.0.0/0`; check the user, password and URL-encoding in `MONGO_URI`. |
