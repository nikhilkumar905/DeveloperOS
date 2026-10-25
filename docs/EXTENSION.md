# Distributing the DeveloperOS browser extension

Users can get the extension in two ways:

| Option | What users do | What you do |
|---|---|---|
| **A. Download from the website** (works today) | Visit https://developeros.page/extension, download the zip, then **Load unpacked** in `chrome://extensions` | Nothing beyond deploying; the zip lives in `frontend/public/downloads/` |
| **B. Chrome Web Store** (one-click install, auto-updates) | Click **Add to Chrome** | Publish once (below), then set `VITE_EXTENSION_STORE_URL` on Vercel |

Once installed, users connect the extension the same way in both cases. They click **Copy Token** in the dashboard's Activity Tracker card and paste the token into the extension popup. The server is preset to `https://api.developeros.page`.

---

## Building and packaging

```bash
cd extensions/chrome
npm install
npm run package        # builds dist/ and creates developeros-extension.zip (no source maps)
```

To update the website download, copy the zip over the published one, then commit and push:

```bash
cp developeros-extension.zip ../../frontend/public/downloads/developeros-extension.zip
```

Bump `"version"` in **both** `manifest.json` and `package.json` before every release. The Chrome Web Store rejects an upload whose version isn't higher than the last one.

---

## Publishing on the Chrome Web Store

### 1. Register as a developer (one time)
1. Go to https://chrome.google.com/webstore/devconsole and sign in with the Google account that will own the listing.
2. Accept the agreement and pay the **one-time US$5** registration fee.
3. Under **Account**, verify your contact email. Publishing is blocked until it's verified.

### 2. Upload
1. **New item → Choose file →** `extensions/chrome/developeros-extension.zip`.

### 3. Store listing tab
| Field | Value |
|---|---|
| Description | What it tracks, which sites it runs on, and that it needs a free DeveloperOS account (https://developeros.page). |
| Category | Developer Tools |
| Language | English |
| Icon | 128×128. `extensions/chrome/src/icons/icon128.png` is already included. |
| Screenshots | At least one, **1280×800** or 640×400. The popup and the Activity Tracker page work well. |
| Small promo tile | 440×280 (optional but recommended) |
| Homepage URL | https://developeros.page |
| Support URL | https://github.com/nikhilkumar905/DeveloperOS/issues |

### 4. Privacy practices tab
**Single purpose:** *"Tracks time spent on coding and documentation websites and syncs it to the user's DeveloperOS dashboard."*

Permission justifications:

| Permission | Justification |
|---|---|
| `storage` | Saves the user's connection token, server URL, per-site settings and unsent activity locally. |
| `alarms` | Sends batched activity to the server every few minutes and keeps the service worker's session timing accurate. |
| `tabs` | Detects which tab is active so time is only counted for the supported coding site the user is looking at. |
| Host permissions (github.com, leetcode.com, …) | Content scripts read the problem or repository name on these supported sites only. |
| `api.developeros.page` | Sends activity to the user's DeveloperOS account. |
| Optional host permissions | Requested only if the user enters a self-hosted server URL in the popup. |

- **Remote code:** *No, I am not using remote code.*
- **Data usage:** tick **Website content** (page titles and addresses on supported sites) and **User activity** (time on those sites). Leave the rest unticked.
- Tick all three certifications: no selling, no unrelated use, no creditworthiness use.
- **Privacy policy URL:** `https://developeros.page/privacy`

### 5. Distribution tab
**Public**, all regions. Then click **Submit for review**. Reviews usually take from a few days to a couple of weeks, and broad host permissions can add time.

### 6. After approval
1. Copy the listing URL, e.g. `https://chromewebstore.google.com/detail/<id>`.
2. Vercel → project → **Settings → Environment Variables** → add `VITE_EXTENSION_STORE_URL` = that URL.
3. **Deployments → ⋯ → Redeploy**. The extension page then shows **Add to Chrome** and hides the manual steps.

To release an update, bump the version, run `npm run package`, then go to **Package → Upload new package** in the developer console and **Submit for review**. Installed copies update automatically.

---

## Microsoft Edge Add-ons (optional, free)

Edge can already install the extension from the Chrome Web Store. To be listed in Edge's own store, register free at https://partner.microsoft.com/dashboard/microsoftedge. Upload the same zip and reuse the same listing text, privacy URL and justifications.
