# THE LAST 404 — Production Setup

## 1. Create Supabase project
Create a project at Supabase.

## 2. Create database
Open SQL Editor and run `supabase_schema.sql`.

## 3. Configure website
Copy `config.example.js` to `config.js` and enter:
- Supabase project URL
- Supabase public anon key

Do NOT use a `service_role` key in the browser.

## 4. Add config to index.html
Before `script.js`, add:
<script src="config.js"></script>
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>

## 5. Production verification
The current mission buttons are UI placeholders. Before WL opens publicly, verify X/Discord/Telegram actions server-side or with official OAuth/API flows.

## 6. GitHub Pages
Upload all files to the repository. Enable GitHub Pages from Settings → Pages → Deploy from branch.

For Vercel/Netlify, upload the same static files.

## 7. Security
- Never expose Supabase service_role.
- Add rate limiting / CAPTCHA or Turnstile to public registration.
- Validate wallet addresses server-side.
- Normalize X usernames.
- Prevent duplicate wallet registrations with the unique database constraint.
- Keep admin approval outside the public client.
