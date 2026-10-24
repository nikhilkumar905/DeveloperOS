# Deploying DeveloperOS to Vercel + Render

The **frontend** runs on **Vercel**, the **API** and **chat service** run on **Render** (as Docker services),
and data lives in **MongoDB Atlas**.

```
Browser ──► https://<app>.vercel.app ──┬─ static React app (Vercel)
                                        ├─ /api/*  ──proxy──► https://developeros-api.onrender.com/api/*
                                        └─ /chat/* ──proxy──► https://developeros-chat.onrender.com/*
```

**Why the proxy:** `vercel.app` and `onrender.com` are different sites, and browsers don't send the
secure login cookie (`SameSite=Strict`) across sites. If the browser only ever talks to your Vercel
domain, the cookie works and users stay signed in. `frontend/vercel.json` sets up the proxy.

---

## 0. Before you start

1. **Code on GitHub.** Merge the `release/v2.0` branch into `main` (on GitHub, open a pull request and click **Merge**).
2. **Accounts:** [Render](https://render.com), [Vercel](https://vercel.com), [MongoDB Atlas](https://cloud.mongodb.com). Sign in to Render and Vercel with GitHub.
3. **Atlas network access.** Render's free services have changing outbound IPs, so in Atlas → **Network Access → Add IP Address** add `0.0.0.0/0`. Your database password is what protects it, so use a strong one.
4. **Keys at hand.** Have these ready; never commit them:
   - Atlas connection string
   - Groq API key
   - Google OAuth client ID and secret
   - GitHub OAuth client ID and secret
   - Gmail address and App Password
5. **Pick your Vercel project name now**, e.g. `developeros`, which gives `https://developeros.vercel.app`. Several Render settings need this URL. If the name is taken, Vercel tells you when you create the project; use the URL it gives you instead.

Below, `<APP>` means your Vercel URL without a trailing slash, e.g. `https://developeros.vercel.app`.

---

## 1. Deploy the API and chat service on Render

1. Render dashboard → **New + → Blueprint** → connect your GitHub account and choose the **DeveloperOS** repository, branch `main`.
2. Render reads `render.yaml` and shows two services: **developeros-api** and **developeros-chat**. It asks for each value marked `sync: false`:

   | Variable | Value |
   |---|---|
   | `MONGO_URI` (both services) | your Atlas connection string |
   | `FRONTEND_URL` (both services) | `<APP>` |
   | `GROQ_API_KEY` (both services) | your Groq key |
   | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | from Google Cloud (step 4) |
   | `GOOGLE_REDIRECT_URI` | `<APP>/api/auth/google/callback` |
   | `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` | from your GitHub OAuth app (step 5) |
   | `GITHUB_CALLBACK_URL` | `<APP>/api/github/callback` |
   | `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM` | your Gmail address, App Password, and e.g. `PersonalOS <you@gmail.com>` |

   `JWT_SECRET` is generated automatically and shared by both services, and `APP_ENV=production` is already set.
3. Click **Apply**. The first build takes about 5 minutes for the API and 10–15 minutes for the chat service, because its image includes PyTorch.
4. When both show **Live**, open each service and note its URL. Check:
   - `https://developeros-api.onrender.com/api/health` → `{"status":"OK", …}`
   - `https://developeros-chat.onrender.com/api/health` → `{"status":"OK","service":"chat"}`

   If Render added a suffix because a name was taken (e.g. `developeros-api-x1y2.onrender.com`), use those URLs in step 2.

---

## 2. Point the Vercel proxy at your Render URLs

Open `frontend/vercel.json`. If your Render URLs differ from `developeros-api.onrender.com` and
`developeros-chat.onrender.com`, update the two `destination` values, then commit and push to `main`.

---

## 3. Deploy the frontend on Vercel

1. Vercel dashboard → **Add New… → Project** → import the **DeveloperOS** repository.
2. **Root Directory:** click *Edit* and choose **`frontend`**. The framework is detected as **Vite**, and build settings come from `vercel.json`.
3. **Environment Variables:**

   | Name | Value |
   |---|---|
   | `VITE_API_URL` | `<APP>` |
   | `VITE_CHAT_API_URL` | `<APP>/chat` |

   Never put secrets in `VITE_*` variables; they are compiled into public JavaScript.
4. Click **Deploy**. When it finishes, open `<APP>` and you should see the landing page.
5. Project → **Settings → General → Node.js Version**: choose **22.x**, then redeploy if it was different.

If Vercel gave a different URL from the one you used in step 1, update `FRONTEND_URL`, `GOOGLE_REDIRECT_URI` and `GITHUB_CALLBACK_URL` on Render (each service → **Environment**). Saving restarts the service. Also update `VITE_*` on Vercel and redeploy.

---

## 4. Allow your new domain in Google sign-in

Google Cloud Console → your OAuth client (**Credentials** / **Clients**):

- **Authorized JavaScript origins:** add `<APP>`
- **Authorized redirect URIs:** add `<APP>/api/auth/google/callback`

On the **OAuth consent screen / Audience**, either add each person who should be able to sign in as a test user, or click **Publish app** to allow any Google account.

---

## 5. Update the GitHub OAuth app

GitHub → Settings → Developer settings → OAuth Apps → your app (or create a separate one for production):

- **Homepage URL:** `<APP>`
- **Authorization callback URL:** `<APP>/api/github/callback`

A GitHub OAuth app has only one callback URL. To keep local development working too, create a separate app for production and use its ID and secret on Render.

---

## 6. Test the deployment

1. Open `<APP>` and **create an account**. The 6-digit code should arrive by email; check Spam the first time.
2. **Reload the page.** You should still be logged in, which shows the cookie and proxy are working.
3. Log out and **Continue with Google**.
4. Connect **GitHub**, **LeetCode** and **GeeksforGeeks**.
5. Ask the **AI assistant** a question. The first answer can take a little longer while your profile is indexed.

---

## 7. Point the Chrome extension at production

1. Build and load the extension (`cd extensions/chrome && npm install && npm run build`, then *Load unpacked* → `dist`).
2. In the popup, set **Server URL** to `<APP>`, and allow access when Chrome asks.
3. Paste a token from the dashboard's **Activity Tracker → Copy Token**.

---

## 8. Add the live link to the README

In `README.md`, replace *"Coming soon. Replace this line with the deployed URL."* in the **Links** table and the
**Live demo** badge link with `<APP>`. Then commit and push.

---

## Things to know about the free tiers

- **Render free services sleep after ~15 minutes without traffic.** The next request wakes them, which takes up to about a minute, and a request during that time may fail or time out through the Vercel proxy, so retry. Paid Render plans don't sleep.
- **Chat service memory.** It uses about 400 MB at rest on a 512 MB free instance. If Render's logs show *out of memory* or restarts, move **developeros-chat** to a plan with more RAM.
- **Vector index storage.** On the free plan the chat service's disk is temporary. The index is rebuilt automatically from MongoDB on the next question after a restart, so nothing is lost; it's just a slower first answer.
- **Rate-limit counters** are kept in memory and reset when a service restarts.
- **Groq free tier.** The assistant is limited to 10 questions a minute and 200 a day per user, which protects the shared quota. Change this with `CHAT_PER_MINUTE` / `CHAT_PER_DAY` on the chat service.

## Optional: your own domain

Instead of the proxy, you can use e.g. `app.example.com` on Vercel and `api.example.com` + `chat.example.com` on Render. These are the same site, so the cookie works directly:

1. Set `VITE_API_URL=https://api.example.com` and `VITE_CHAT_API_URL=https://chat.example.com`.
2. Remove the two proxy rewrites from `vercel.json`.
3. Set `FRONTEND_URL=https://app.example.com` on both services.
4. Update the Google and GitHub URLs.

## Troubleshooting

| Problem | Fix |
|---|---|
| Logged out on every reload | The browser isn't sending the cookie. Make sure `VITE_API_URL` is your **Vercel** URL (not the Render URL) and the `vercel.json` rewrites point to your Render services. |
| `403 Origin not allowed` / `Missing CSRF header` | `FRONTEND_URL` on Render must exactly equal `<APP>`, with `https://` and no trailing slash. |
| Google: `redirect_uri_mismatch` | `GOOGLE_REDIRECT_URI` on Render must exactly match the URI registered in Google Cloud. |
| Sign-up says email isn't configured (503) | Set `SMTP_USER`, `SMTP_PASSWORD` and `SMTP_FROM` on **developeros-api**; production requires them. |
| Chatbot can't reach the chat service | Check `VITE_CHAT_API_URL=<APP>/chat` and the `/chat/:path*` rewrite, and that the chat service is Live. |
| Render build of the chat service fails or times out | Retry the deploy. The image is large (PyTorch); builds can take 15 minutes. |
| MongoDB connection errors | Atlas Network Access must include `0.0.0.0/0`; check the username, password and URL-encoding in `MONGO_URI`. |
