# Wedding Planner — Netlify Deployment

## Files
- index.html
- style.css
- app.js

## Deploy to Netlify (Free)

### Option 1: Drag & Drop (Easiest)
1. Go to https://netlify.com → Log in
2. Click "Sites" in the sidebar
3. Drag the entire `wedding-planner` folder onto the page
4. Done! You'll get a URL like https://amazing-wedding-xyz.netlify.app

### Option 2: GitHub (Recommended for updates)
1. Push this folder to a GitHub repo
2. Go to Netlify → "Add new site" → "Import from Git"
3. Connect your repo
4. Build command: (leave empty)
5. Publish directory: . (just a dot)
6. Deploy!

## Data Storage
- All data is saved in your browser's localStorage
- Data persists across page refreshes
- Data is tied to the device/browser you use
- For multi-device sync: consider upgrading to use Supabase (ask Claude for help!)

## Customization
- Open `style.css` to tweak colors (CSS variables at the top)
- Open `app.js` to add more task categories, etc.
