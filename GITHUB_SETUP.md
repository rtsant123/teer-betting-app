# 🚀 GitHub Repository Setup Guide

## Step 1: Create GitHub Repository

1. Go to [GitHub](https://github.com) and sign in
2. Click "New Repository" or go to https://github.com/new
3. Fill in repository details:
   - **Repository name:** `teer-betting-app`
   - **Description:** `Complete Teer Betting Platform with FastAPI backend, React frontend, and PostgreSQL database`
   - **Visibility:** Choose Public or Private
   - **Don't** initialize with README, .gitignore, or license (we already have these)
4. Click "Create Repository"

## Step 2: Push Your Local Repository

Your local repository is already initialized. Run these commands:

```bash
# Add your GitHub repository as origin
git remote add origin https://github.com/YOUR_USERNAME/teer-betting-app.git

# Push to GitHub
git branch -M main
git push -u origin main
```

Replace `YOUR_USERNAME` with your actual GitHub username.

## Step 3: Configure Repository Settings

### A. Branch Protection (Recommended)

1. Go to your repository on GitHub
2. Click **Settings** → **Branches**
3. Click **Add rule** for `main` branch
4. Configure:
   - ✅ Require pull request reviews before merging
   - ✅ Require status checks to pass before merging
   - ✅ Require branches to be up to date before merging
   - ✅ Include administrators

### B. Repository Secrets (For Deployment)

1. Go to **Settings** → **Secrets and variables** → **Actions**
2. Add these secrets:

| Secret Name | Description | Example |
|-------------|-------------|---------|
| `PRODUCTION_HOST` | Your production server IP/domain | `203.0.113.1` or `myapp.com` |
| `PRODUCTION_USER` | SSH username for deployment | `ubuntu` or `deploy` |
| `PRODUCTION_SSH_KEY` | SSH private key for server access | Your private key content |
| `SLACK_WEBHOOK` | (Optional) Slack webhook for notifications | `https://hooks.slack.com/...` |

### C. Environment Setup

1. Go to **Settings** → **Environments**
2. Create these environments:
   - `development`
   - `staging` (optional)
   - `production`

For each environment, you can set environment-specific secrets and protection rules.

## Step 4: Enable GitHub Actions

GitHub Actions are automatically enabled with your workflows. The CI/CD pipeline will:

- ✅ Run tests on every push/PR
- ✅ Build Docker images
- ✅ Run security scans
- ✅ Deploy to production on main branch pushes

## Step 5: Create Development Workflow

### A. Create Development Branch

```bash
# Create and switch to development branch
git checkout -b develop
git push -u origin develop
```

### B. Set Up Branch Protection for Develop

Similar to main branch, but less restrictive for development.

## Step 6: Configure GitHub Pages (Optional)

For project documentation:

1. Go to **Settings** → **Pages**
2. Source: Deploy from a branch
3. Branch: `main` / `docs` (if you have docs folder)

## Step 7: Set Up Issue Templates

Create `.github/ISSUE_TEMPLATE/` directory with templates:

```bash
mkdir -p .github/ISSUE_TEMPLATE
```

Add templates for:
- Bug reports
- Feature requests
- Documentation improvements

## Step 8: Add Repository README

Your repository already has a comprehensive README. Update it with:

- Your actual domain/deployment URL
- Live demo links
- Contribution guidelines
- License information

## Step 9: Enable Dependabot (Security Updates)

1. Go to **Settings** → **Security & analysis**
2. Enable:
   - ✅ Dependabot alerts
   - ✅ Dependabot security updates
   - ✅ Dependabot version updates

## Step 10: Configure Code Scanning

1. Go to **Security** → **Code scanning**
2. Set up CodeQL analysis
3. Configure for Python and JavaScript

## GitHub Commands Quick Reference

```bash
# Clone your repository
git clone https://github.com/YOUR_USERNAME/teer-betting-app.git

# Create new feature branch
git checkout -b feature/new-feature
git push -u origin feature/new-feature

# Make changes and commit
git add .
git commit -m "Add new feature"
git push origin feature/new-feature

# Create pull request on GitHub
# After PR is merged, update main
git checkout main
git pull origin main

# Deploy to production (if auto-deploy is set up)
git push origin main

# Tag a release
git tag -a v1.0.0 -m "Version 1.0.0"
git push origin v1.0.0
```

## Repository Structure Overview

```
teer-betting-app/
├── .github/
│   └── workflows/          # GitHub Actions CI/CD
├── backend/                # FastAPI backend
├── frontend/               # React frontend
├── docker-compose*.yml     # Docker configurations
├── Makefile               # Development commands
├── manage.ps1             # Windows management script
├── quick-start.ps1        # Windows quick start
└── docs/                  # Documentation
```

## Best Practices

### Commit Messages
Use conventional commit format:
```
feat: add user authentication
fix: resolve database connection issue
docs: update deployment guide
test: add integration tests
```

### Pull Request Template
Create `.github/pull_request_template.md`:

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Documentation update
- [ ] Performance improvement

## Testing
- [ ] Tests pass locally
- [ ] Manual testing completed

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
```

### Release Process

1. **Development:** Work on `develop` branch
2. **Testing:** Create PR to `main` for testing
3. **Release:** Merge to `main` triggers production deployment
4. **Tagging:** Tag releases for version tracking

```bash
git checkout main
git pull origin main
git tag -a v1.0.0 -m "Release version 1.0.0"
git push origin v1.0.0
```

## Troubleshooting GitHub Setup

### Common Issues

**SSH Key Issues:**
```bash
# Generate new SSH key
ssh-keygen -t ed25519 -C "your-email@example.com"

# Add to SSH agent
eval "$(ssh-agent -s)"
ssh-add ~/.ssh/id_ed25519

# Add public key to GitHub
cat ~/.ssh/id_ed25519.pub
```

**Large File Issues:**
Use Git LFS for large files:
```bash
git lfs install
git lfs track "*.db"
git lfs track "uploads/*"
```

**Permission Denied:**
Check repository access and SSH keys in GitHub settings.

## Next Steps

1. ✅ Repository created and configured
2. ✅ CI/CD pipeline active
3. ✅ Security features enabled
4. ⏳ Set up production server (see DEPLOYMENT_GUIDE.md)
5. ⏳ Configure domain and SSL
6. ⏳ Deploy to production

Your repository is now ready for collaborative development and automated deployment! 🎉
