# Railway Deployment Guide

## Prerequisites
- Railway account (sign up at railway.app)
- Railway CLI installed (optional but recommended)

## Deployment Steps

### 1. Prepare your repository
Make sure all files are committed to your git repository.

### 2. Deploy to Railway

#### Option A: Deploy via Railway Dashboard
1. Go to [Railway Dashboard](https://railway.app/dashboard)
2. Click "New Project"
3. Select "Deploy from GitHub repo"
4. Connect your GitHub account and select your repository
5. Railway will automatically detect the configuration

#### Option B: Deploy via Railway CLI
```bash
# Install Railway CLI if not already installed
npm install -g @railway/cli

# Login to Railway
railway login

# Initialize new project
railway init

# Deploy
railway up
```

### 3. Configure Environment Variables

In your Railway project dashboard:
1. Go to your project
2. Click on the service
3. Go to "Variables" tab
4. Add the following variables:

```
NODE_ENV=production
JWT_SECRET=your-very-secure-secret-key-here
```

**Important**: Generate a secure JWT_SECRET using:
```bash
openssl rand -base64 32
```

### 4. Set up Database Persistence

Since this app uses SQLite, you need to configure a persistent volume:

1. In Railway dashboard, go to your service
2. Click "Settings" → "Volumes"
3. Click "Mount Volume"
4. Set mount path to: `/app/backend`
5. This ensures your SQLite database persists between deployments

### 5. Custom Domain (Optional)

1. Go to Settings → Domains
2. Either use the provided Railway domain or add your custom domain
3. Update DNS records if using custom domain

## Post-Deployment

### Access your app
- Your app will be available at the Railway-provided URL
- Default admin credentials: `admin` / `admin123` (change immediately!)

### Important First Steps
1. Login as admin
2. Change the admin password immediately
3. Create library user accounts as needed

### Monitoring
- Check logs in Railway dashboard → Logs
- Monitor deployments in Railway dashboard → Deployments

## Troubleshooting

### Database Issues
If data doesn't persist:
- Ensure volume is mounted at `/app/backend`
- Check that `srp_tracker.db` is in `.gitignore`

### Build Failures
- Check build logs in Railway dashboard
- Ensure all dependencies are in package.json files
- Verify Node version compatibility (requires Node 16+)

### API Connection Issues
- Frontend uses proxy in development but direct API calls in production
- Ensure CORS is properly configured
- Check that all API routes start with `/api/`

## Future Improvements

Consider migrating to PostgreSQL for better production support:
1. Railway provides PostgreSQL databases
2. Better performance and reliability
3. Easier backups and scaling