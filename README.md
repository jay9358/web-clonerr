# 🌐 Website Cloner

A pixel-perfect website cloning service that uses Puppeteer to capture websites exactly as Chrome renders them, with all CSS, JavaScript, fonts, and images intact.

## ✨ Features

- **Pixel-perfect cloning** using Puppeteer with full JavaScript execution
- **Automatic path fixing** for relative URLs and assets
- **Asset proxying** to handle CORS issues
- **Beautiful React frontend** with modern UI
- **Responsive design** that works on all devices
- **Rate limiting** and security features
- **Real-time loading states** and error handling

## 🚀 Quick Start

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd base_testing
   ```

2. **Install backend dependencies**
   ```bash
   cd backend
   npm install
   ```

3. **Install frontend dependencies**
   ```bash
   cd ../frontend
   npm install
   ```

### Running the Application

#### Option 1: Development Mode (Recommended)

1. **Start the backend server**
   ```bash
   cd backend
   npm run dev
   ```
   The backend will run on `http://localhost:5000`

2. **Start the frontend** (in a new terminal)
   ```bash
   cd frontend
   npm start
   ```
   The frontend will run on `http://localhost:3000`

#### Option 2: Production Mode

1. **Build the frontend**
   ```bash
   cd frontend
   npm run build
   ```

2. **Start the backend** (serves both API and frontend)
   ```bash
   cd backend
   npm start
   ```
   The application will be available at `http://localhost:5000`

## 🎯 How It Works

### Backend (Express + Puppeteer)

1. **URL Validation**: Validates the input URL format and protocol
2. **Puppeteer Capture**: Uses Puppeteer to navigate to the URL with `networkidle0` wait condition
3. **JavaScript Execution**: Waits for all JavaScript to execute and dynamic content to load
4. **Path Fixing**: Automatically fixes relative URLs using Cheerio
5. **Asset Proxying**: Sets up proxy endpoints for external assets to handle CORS
6. **HTML Processing**: Returns the final rendered HTML with corrected paths

### Frontend (React)

1. **URL Input**: Clean, modern interface for entering target URLs
2. **Loading States**: Real-time feedback during the cloning process
3. **Error Handling**: User-friendly error messages for various failure scenarios
4. **Iframe Display**: Safely displays the cloned website in a sandboxed iframe
5. **Responsive Design**: Works perfectly on desktop, tablet, and mobile

## 🔧 API Endpoints

### `POST /api/crawl`
Clones a website and returns the rendered HTML.

**Request:**
```json
{
  "url": "https://example.com"
}
```

**Response:**
```json
{
  "success": true,
  "html": "<!DOCTYPE html>...",
  "url": "https://example.com",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### `GET /api/proxy?url=<encoded-url>`
Proxies external assets to handle CORS issues.

### `GET /api/health`
Health check endpoint.

## 🛡️ Security Features

- **Rate limiting**: 100 requests per 15 minutes per IP
- **URL validation**: Only HTTP/HTTPS URLs allowed
- **Helmet.js**: Security headers and protection
- **CORS handling**: Proper cross-origin resource sharing
- **Iframe sandboxing**: Safe execution of cloned content

## 🎨 UI Features

- **Modern gradient background** with glassmorphism effects
- **Smooth animations** and hover effects
- **Loading spinners** with progress indicators
- **Error states** with clear messaging
- **Responsive design** for all screen sizes
- **Accessibility** features and keyboard navigation

## 🔍 Technical Details

### Puppeteer Configuration
- Headless Chrome with optimized flags
- Desktop viewport (1920x1080)
- Realistic user agent
- Network idle waiting
- 30-second timeout

### Path Resolution
- Automatic `<base>` tag injection
- Relative URL conversion to absolute
- Asset proxying for external resources
- Protocol-relative URL handling

### Performance Optimizations
- Browser instance reuse
- Asset caching headers
- Compressed responses
- Efficient DOM manipulation

## 🐛 Troubleshooting

### Common Issues

1. **"Failed to clone website"**
   - Check if the URL is accessible
   - Verify the website doesn't block bots
   - Try a different URL

2. **"Network error"**
   - Ensure the backend is running
   - Check firewall settings
   - Verify port 5000 is available

3. **Missing assets in cloned site**
   - Some sites use complex authentication
   - CDN restrictions may apply
   - Try simpler websites first

### Development Tips

- Use `npm run dev` in backend for auto-restart
- Check browser console for detailed errors
- Monitor backend logs for Puppeteer issues
- Test with simple sites like `https://example.com` first

## 📝 Example Usage

1. Open the application in your browser
2. Enter a URL (e.g., `https://example.com`)
3. Click "🚀 Clone"
4. Wait for the process to complete
5. View the pixel-perfect clone in the iframe below

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the ISC License.

## 🙏 Acknowledgments

- Puppeteer for headless Chrome automation
- Express.js for the backend framework
- React for the frontend framework
- Cheerio for HTML manipulation
