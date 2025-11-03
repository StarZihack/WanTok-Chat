# Deployment Checklist - Quick Reference

## Before You Start

- [ ] Have GitHub account ready
- [ ] Have Render.com account ready
- [ ] Have Vercel.com account ready
- [ ] Have GoDaddy domain purchased
- [ ] Have Supabase project created with all tables
- [ ] Have Google OAuth credentials ready

---

## Part 1: Deploy Backend to Render ⚙️

- [ ] Create GitHub repository
- [ ] Push code to GitHub
- [ ] Sign up on Render.com
- [ ] Create new Web Service on Render
- [ ] Connect GitHub repository
- [ ] Set Build Command: `npm install`
- [ ] Set Start Command: `node server.js`
- [ ] Add all environment variables:
  - [ ] NODE_ENV=production
  - [ ] PORT=3000
  - [ ] SUPABASE_URL
  - [ ] SUPABASE_KEY
  - [ ] SESSION_SECRET (generate random 32-char string)
  - [ ] GOOGLE_CLIENT_ID
  - [ ] GOOGLE_CLIENT_SECRET
  - [ ] GOOGLE_CALLBACK_URL
  - [ ] ALLOWED_ORIGINS
  - [ ] FRONTEND_URL
- [ ] Click Deploy
- [ ] Copy Render backend URL (e.g., https://wantok-backend.onrender.com)

---

## Part 2: Update Frontend Config 🔧

- [ ] Open `public/assets/js/config.js`
- [ ] Replace `your-render-backend.onrender.com` with your actual Render URL (2 places)
- [ ] Commit and push changes to GitHub

---

## Part 3: Deploy Frontend to Vercel 🚀

- [ ] Sign up on Vercel.com
- [ ] Click "Add New Project"
- [ ] Import your GitHub repository
- [ ] Set Output Directory to: `public`
- [ ] Click Deploy
- [ ] Copy Vercel URL (e.g., https://wantok-abc123.vercel.app)

---

## Part 4: Connect GoDaddy Domain 🌐

### In Vercel:
- [ ] Go to Project Settings → Domains
- [ ] Add your domain (e.g., yourdomain.com)
- [ ] Copy the DNS records Vercel shows you

### In GoDaddy:
- [ ] Log in to GoDaddy
- [ ] Go to Domains → Your Domain → DNS Management
- [ ] Add A record:
  - Type: A
  - Name: @
  - Value: 76.76.21.21 (or what Vercel shows)
  - TTL: 600
- [ ] Add CNAME record:
  - Type: CNAME
  - Name: www
  - Value: cname.vercel-dns.com
  - TTL: 600
- [ ] Save DNS changes
- [ ] Wait 10-60 minutes for DNS propagation
- [ ] Verify domain in Vercel

---

## Part 5: Update Production URLs 🔄

### Update Render Environment Variables:
- [ ] Go back to Render dashboard
- [ ] Update ALLOWED_ORIGINS with your domain:
  ```
  https://yourdomain.com,https://wantok-abc123.vercel.app
  ```
- [ ] Update FRONTEND_URL:
  ```
  https://yourdomain.com
  ```
- [ ] Update GOOGLE_CALLBACK_URL:
  ```
  https://yourdomain.com/auth/google/callback
  ```
- [ ] Save changes (Render will auto-redeploy)

### Update Google OAuth Console:
- [ ] Go to console.cloud.google.com
- [ ] APIs & Services → Credentials
- [ ] Edit OAuth 2.0 Client
- [ ] Add Authorized JavaScript origins:
  - https://yourdomain.com
  - https://wantok-backend.onrender.com
- [ ] Add Authorized redirect URIs:
  - https://yourdomain.com/auth/google/callback
  - https://wantok-backend.onrender.com/auth/google/callback
- [ ] Save

---

## Part 6: Test Everything ✅

- [ ] Visit https://yourdomain.com
- [ ] Homepage loads correctly
- [ ] Register/Login works
- [ ] Check browser console - no errors
- [ ] Socket connects to backend
- [ ] Start video chat - WebRTC works
- [ ] Online users count updates
- [ ] Token system works
- [ ] Filters work (if you have tokens)
- [ ] Admin panel accessible at /admin-login
- [ ] Mobile responsive design works

---

## Troubleshooting 🔧

**If socket doesn't connect:**
1. Check config.js has correct Render URL
2. Check browser console for errors
3. Check Render logs for backend errors
4. Verify CORS settings in Render env variables

**If login doesn't work:**
1. Check Google OAuth redirect URLs match exactly
2. Check SESSION_SECRET is set in Render
3. Clear browser cookies and try again

**If site doesn't load:**
1. Check DNS propagation: https://dnschecker.org
2. Check Vercel deployment logs
3. Verify domain is added correctly in Vercel

**If backend is slow:**
1. Render free tier sleeps after 15 min inactivity
2. First request takes ~30 sec to wake up
3. Upgrade to paid plan for always-on service

---

## Post-Deployment 📈

- [ ] Set up monitoring
- [ ] Add analytics (Google Analytics)
- [ ] Configure TURN server for better WebRTC
- [ ] Set up automated Supabase backups
- [ ] Test from multiple devices
- [ ] Test from different locations/networks
- [ ] Add sitemap and SEO optimization
- [ ] Set up error tracking (Sentry, etc.)

---

## Environment Variables Reference

```bash
# Render Backend (.env)
NODE_ENV=production
PORT=3000
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your_anon_key_here
SESSION_SECRET=generate_32_random_chars
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=https://yourdomain.com/auth/google/callback
ALLOWED_ORIGINS=https://yourdomain.com,https://your-vercel.vercel.app
FRONTEND_URL=https://yourdomain.com
```

---

## Need Help?

Read the full DEPLOYMENT_GUIDE.md for detailed explanations!
