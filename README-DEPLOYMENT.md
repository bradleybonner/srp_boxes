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

### 3. Set up PostgreSQL Database

Railway provides managed PostgreSQL databases:

1. In your Railway project dashboard
2. Click "New" → "Database" → "Add PostgreSQL"
3. Railway will automatically create the database and set the DATABASE_URL

### 4. Configure Environment Variables

In your Railway project dashboard:
1. Go to your project
2. Click on the service
3. Go to "Variables" tab
4. Add the following variables:

```
NODE_ENV=production
JWT_SECRET=your-very-secure-secret-key-here
```

**Important**: 
- Generate a secure JWT_SECRET using: `openssl rand -base64 32`
- Railway automatically sets DATABASE_URL when you add PostgreSQL

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

### Database Connection Issues
- Ensure PostgreSQL service is running in Railway
- Check that DATABASE_URL is properly set in environment variables
- Verify database credentials are correct

### Build Failures
- Check build logs in Railway dashboard
- Ensure all dependencies are in package.json files
- Verify Node version compatibility (requires Node 16+)

### API Connection Issues
- Frontend uses proxy in development but direct API calls in production
- Ensure CORS is properly configured
- Check that all API routes start with `/api/`

### Database Migration
- The app automatically creates tables on first run
- Admin user is seeded automatically (username: admin, password: admin123)
- Check logs for any database initialization errors

## Benefits of PostgreSQL

This app now uses PostgreSQL which provides:
1. Better performance and reliability than SQLite
2. Automatic backups on Railway
3. Easy scaling and connection pooling
4. Full SQL feature support