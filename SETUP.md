# 🚀 Quick Setup Guide

## The Error You're Seeing

The error `"Unexpected token '<', "<!DOCTYPE "... is not valid JSON"` means the backend server isn't running. The frontend is trying to call the API but getting HTML instead of JSON.

## ✅ Solution: Start the Backend Server

### Option 1: Use the Batch File (Windows)
```bash
# Double-click this file or run in terminal:
start.bat
```

### Option 2: Manual Setup
```bash
# 1. Install dependencies
npm run install-all

# 2. Start backend server (in one terminal)
cd backend
npm start

# 3. Start frontend (in another terminal)
cd frontend
npm start
```

### Option 3: Development Mode (Recommended)
```bash
# Install dependencies first
npm run install-all

# Then start both servers
npm run dev
```

## 🔧 Important: Proxy Configuration

The frontend now has a proxy configuration that automatically forwards API calls to the backend. This means:
- Frontend runs on `http://localhost:3000`
- Backend runs on `http://localhost:5000`
- API calls from frontend automatically go to backend
- **You must restart the frontend after adding the proxy configuration**

## 🔍 How to Verify It's Working

1. **Backend Status**: Look for the status indicator in the UI:
   - ✅ Backend connected (green)
   - ❌ Backend disconnected (red)

2. **Test the API**: Visit `http://localhost:5000/api/health` in your browser
   - Should return: `{"status":"OK","timestamp":"..."}`

3. **Try Cloning**: Enter a simple URL like `https://example.com`

## 🐛 Troubleshooting

### Backend Won't Start
```bash
# Check if port 5000 is in use
netstat -ano | findstr :5000

# Kill process if needed (replace PID)
taskkill /PID <PID> /F
```

### Dependencies Issues
```bash
# Clear npm cache
npm cache clean --force

# Delete node_modules and reinstall
rm -rf backend/node_modules frontend/node_modules
npm run install-all
```

### Puppeteer Issues
```bash
# Install Puppeteer dependencies
cd backend
npx puppeteer browsers install chrome
```

## 📱 What You Should See

1. **Frontend**: Beautiful gradient interface at `http://localhost:3000`
2. **Backend Status**: Green "✅ Backend connected" indicator
3. **URL Input**: Clean input field with clone button
4. **Cloned Website**: Pixel-perfect iframe display below

## 🎯 Test URLs

Try these simple websites first:
- `https://example.com`
- `https://httpbin.org/html`
- `https://jsonplaceholder.typicode.com`

## 💡 Pro Tips

- Always start the backend first
- Use `npm run dev` for development (auto-restart)
- Check the browser console for detailed errors
- The backend runs on port 5000, frontend on port 3000
