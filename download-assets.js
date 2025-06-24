const https = require('https');
const fs = require('fs');
const path = require('path');

const files = [
  {
    url: 'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.rtl.min.css',
    path: 'src/public/css/bootstrap.rtl.min.css'
  },
  {
    url: 'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js',
    path: 'src/public/js/bootstrap.bundle.min.js'
  }
];

// Create directories if they don't exist
['src/public/css', 'src/public/js'].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Download files
files.forEach(file => {
  https.get(file.url, (response) => {
    const fileStream = fs.createWriteStream(file.path);
    response.pipe(fileStream);
    fileStream.on('finish', () => {
      fileStream.close();
    });
  }).on('error', (err) => {
    console.error(`Error downloading ${file.url}:`, err.message);
  });
}); 