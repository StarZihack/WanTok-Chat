# WanTok Deployment Guide - Vercel (Frontend) + Render (Backend)

## Architecture
- **Frontend (Vercel)**: All HTML, CSS, JS files from `/public` folder
- **Backend (Render)**: Node.js server with Socket.IO (server.js)
- **Database**: Supabase (already cloud-hosted)
- **Domain**: GoDaddy domain pointing to Vercel

---

## Part 1: Deploy Backend to Render

### Step 1: Create GitHub Repository

```bash
# In your WanTok directory
git init
git add .
git commit -m "Initial commit - production ready"

# Create a new repository on github.com, then:
git remote add origin https://github.com/yourusername/wantok.git
git branch -M main
git push -u origin main
```

### Step 2: Deploy to Render

1. Go to [render.com](https://render.com)
2. Sign up with GitHub
3. Click **"New +"** → **"Web Service"**
4. Connect your GitHub repository
5. Configure the service:
   - **Name**: `wantok-backend` (or any name)
   - **Region**: Choose closest to your users
   - **Branch**: `main`
   - **Root Directory**: Leave empty
   - **Runtime**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
   - **Instance Type**: Free (or paid for better performance)

### Step 3: Add Environment Variables on Render

In the "Environment" section, add these variables:

```
NODE_ENV=production
PORT=3000
SUPABASE_URL=<your-supabase-url>
SUPABASE_KEY=<your-supabase-anon-key>
SESSION_SECRET=<generate-a-random-32-char-string>
GOOGLE_CLIENT_ID=<your-google-oauth-client-id>
GOOGLE_CLIENT_SECRET=<your-google-oauth-client-secret>
GOOGLE_CALLBACK_URL=https://your-vercel-domain.com/auth/google/callback
ALLOWED_ORIGINS=https://yourdomain.com,https://your-vercel-app.vercel.app
FRONTEND_URL=https://yourdomain.com
```

**Important**: Generate a secure SESSION_SECRET:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Step 4: Get Your Render Backend URL

After deployment completes, Render will give you a URL like:
```
https://wantok-backend.onrender.com
```

**Copy this URL - you'll need it for the next steps!**

---

## Part 2: Update Frontend Configuration

### Step 1: Update config.js with Render URL

Open `public/assets/js/config.js` and update:

```javascript
const CONFIG = {
  BACKEND_URL: window.location.hostname === 'localhost'
    ? 'http://localhost:3000'
    : 'https://wantok-backend.onrender.com', // YOUR RENDER URL HERE

  SOCKET_URL: window.location.hostname === 'localhost'
    ? 'http://localhost:3000'
    : 'https://wantok-backend.onrender.com' // YOUR RENDER URL HERE
};
```

### Step 2: Update HTML files to load config.js

You need to add config.js **before** socket-shared.js in these files:

1. **public/pages/main.html**
2. **public/pages/profile.html**
3. **public/pages/purchase.html**
4. **public/pages/online-users.html**

Add this line in the `<head>` section or before socket-shared.js is loaded:

```html
<script src="/assets/js/config.js"></script>
```

Example:
```html
<!-- Socket.IO and config -->
<script src="https://cdn.socket.io/4.5.4/socket.io.min.js"></script>
<script src="/assets/js/config.js"></script>
<script src="/assets/js/socket-shared.js"></script>
```

### Step 3: Commit and push changes

```bash
git add .
git commit -m "Update config for production deployment"
git push
```

---

## Part 3: Deploy Frontend to Vercel

### Step 1: Install Vercel CLI (Optional)

```bash
npm install -g vercel
```

### Step 2: Deploy to Vercel

**Option A: Via Vercel Dashboard (Recommended)**

1. Go to [vercel.com](https://vercel.com)
2. Sign up with GitHub
3. Click **"Add New..."** → **"Project"**
4. Import your GitHub repository
5. Configure:
   - **Framework Preset**: Other
   - **Root Directory**: `./` (leave as is)
   - **Build Command**: Leave empty (static site)
   - **Output Directory**: `public`
6. Click **"Deploy"**

**Option B: Via CLI**

```bash
cd C:\WanTok
vercel
# Follow prompts, select "public" as the directory to deploy
```

### Step 3: Get Your Vercel URL

Vercel will give you a URL like:
```
https://wantok-abc123.vercel.app
```

---

## Part 4: Connect GoDaddy Domain to Vercel

### Step 1: Add Domain in Vercel

1. In Vercel dashboard, go to your project
2. Go to **Settings** → **Domains**
3. Click **"Add Domain"**
4. Enter your GoDaddy domain: `yourdomain.com`
5. Vercel will show you DNS records to add

### Step 2: Update DNS in GoDaddy

1. Log in to [godaddy.com](https://godaddy.com)
2. Go to **My Products** → **Domains** → Click your domain
3. Go to **DNS Management**

4. Add these records (Vercel will show you exact values):

**For root domain (yourdomain.com):**
```
Type: A
Name: @
Value: 76.76.21.21
TTL: 600 seconds
```

**For www subdomain:**
```
Type: CNAME
Name: www
Value: cname.vercel-dns.com
TTL: 600 seconds
```

5. Click **Save**

### Step 3: Verify Domain in Vercel

- Go back to Vercel dashboard
- Click **"Verify"** or **"Refresh"** on the domain
- It may take 24-48 hours for DNS to propagate (usually much faster)
- Once verified, your site will be live at `https://yourdomain.com`

---

## Part 5: Update Backend CORS and Callback URLs

### Step 1: Update Render Environment Variables

Go back to Render dashboard and update:

```
ALLOWED_ORIGINS=https://yourdomain.com,https://wantok-abc123.vercel.app
FRONTEND_URL=https://yourdomain.com
GOOGLE_CALLBACK_URL=https://yourdomain.com/auth/google/callback
```

Click **"Save Changes"** - Render will auto-redeploy.

### Step 2: Update Google OAuth Console

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Go to **APIs & Services** → **Credentials**
3. Edit your OAuth 2.0 Client ID
4. Update **Authorized JavaScript origins**:
   ```
   https://yourdomain.com
   https://wantok-backend.onrender.com
   ```
5. Update **Authorized redirect URIs**:
   ```
   https://yourdomain.com/auth/google/callback
   https://wantok-backend.onrender.com/auth/google/callback
   ```
6. Click **Save**

---

## Part 6: Test Your Deployment

### Checklist:

1. ✅ Visit `https://yourdomain.com` - should load homepage
2. ✅ Register/Login - authentication should work
3. ✅ Check browser console - socket should connect to Render backend
4. ✅ Start a video chat - WebRTC should work (requires HTTPS ✓)
5. ✅ Check online users count - Socket.IO working
6. ✅ Test admin panel at `https://yourdomain.com/admin-login`
7. ✅ Test token system and filters

### Common Issues:

**Socket not connecting:**
- Check config.js has correct Render URL
- Check CORS settings in Render env variables
- Check browser console for errors

**Login not working:**
- Check Google OAuth redirect URLs
- Check SESSION_SECRET is set in Render
- Check cookies are allowed (cross-site cookies need sameSite: 'none')

**"Mixed Content" errors:**
- Make sure ALL URLs in your code use HTTPS, not HTTP
- Check config.js uses `https://` for Render URL

---

## Part 7: Monitor and Maintain

### Render:
- Free tier sleeps after 15 minutes of inactivity
- First request after sleep takes ~30 seconds to wake up
- Upgrade to paid plan ($7/month) for always-on service

### Vercel:
- Free tier: Generous limits for most use cases
- Automatic deployments on git push
- Great for static files and APIs

### Supabase:
- Free tier: 500MB database, 2GB bandwidth
- Monitor usage in Supabase dashboard

---

## Cost Summary

**Free Tier:**
- Vercel: Free (generous limits)
- Render: Free (sleeps after inactivity)
- Supabase: Free (500MB database)
- **Total: $0/month** (with limitations)

**Paid Tier (Recommended for production):**
- Vercel: Free (or $20/month Pro)
- Render: $7/month (always-on, better performance)
- Supabase: Free (or $25/month Pro)
- **Total: ~$7-52/month**

---

## Next Steps After Deployment

1. Add TURN server for better WebRTC reliability
2. Set up monitoring (Render has built-in logs)
3. Add analytics (Google Analytics, etc.)
4. Set up automated backups for Supabase
5. Add CDN for faster asset delivery (Vercel does this automatically)

---

## Support

If you encounter issues:
1. Check Render logs for backend errors
2. Check Vercel deployment logs for frontend issues
3. Check browser console for client-side errors
4. Verify all environment variables are set correctly

---

**Ready to deploy? Start with Part 1!** 🚀
