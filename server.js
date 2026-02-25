const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = process.env.PORT || 3001;
const DATA_FILE = path.join(__dirname, 'data.json');
const PROJECT_ROOT = path.resolve(__dirname);

const mimeTypes = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.mp4': 'video/mp4',
  '.svg': 'image/svg+xml',
};

const server = http.createServer((req, res) => {
  console.log(`${req.method} ${req.url}`);

  if (req.method === 'GET') {
    // Strip query string for file path resolution
    const urlPath = req.url.split('?')[0];
    let filePath = '.' + urlPath;
    if (filePath === './') {
      filePath = './index.html';
    }

    // Directory traversal protection
    const resolvedPath = path.resolve(filePath);
    if (!resolvedPath.startsWith(PROJECT_ROOT)) {
      res.writeHead(403, { 'Content-Type': 'text/plain' });
      res.end('Forbidden');
      return;
    }

    const extname = String(path.extname(filePath)).toLowerCase();
    const contentType = mimeTypes[extname] || 'application/octet-stream';

    fs.readFile(resolvedPath, (error, content) => {
      if (error) {
        if (error.code === 'ENOENT') {
          fs.readFile('./404.html', (error, content) => {
            res.writeHead(404, { 'Content-Type': 'text/html' });
            res.end(content, 'utf-8');
          });
        } else {
          res.writeHead(500);
          res.end('Sorry, check with the site admin for error: ' + error.code + ' ..\n');
        }
      } else {
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(content, 'utf-8');
      }
    });
  } else if (req.method === 'POST' && req.url === '/api/save') {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        const json = JSON.parse(body);

        // --- Password Verification ---
        fs.readFile(DATA_FILE, 'utf8', (err, data) => {
          if (err) {
            console.error(err);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, message: 'Server file read error' }));
            return;
          }

          let currentServerData;
          try {
            currentServerData = JSON.parse(data);
          } catch (e) {
            // If the file is incredibly broken, we might allow overwrite, but safer to fail
            currentServerData = {};
          }

          const serverHash = currentServerData.admin && currentServerData.admin.passwordHash ? currentServerData.admin.passwordHash : '';
          const clientHash = json.admin && json.admin.passwordHash ? json.admin.passwordHash : '';

          if (!serverHash || serverHash !== clientHash) {
            res.writeHead(403, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, message: 'Invalid Admin Password.' }));
            return;
          }

          // Simple validation or sanitation could go here
          fs.writeFile(DATA_FILE, JSON.stringify(json, null, 2), 'utf8', (err) => {
            if (err) {
              console.error(err);
              res.writeHead(500, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ success: false, message: 'Failed to write file' }));
            } else {
              console.log('Data saved successfully');
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ success: true, message: 'Data saved successfully' }));
            }
          });
        });
      } catch (e) {
        console.error(e);
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, message: 'Invalid JSON payload' }));
      }
    });
  } else {
    res.writeHead(405);
    res.end('Method Not Allowed');
  }
});

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}/`);
  console.log(`To edit content, visit http://localhost:${PORT}/admin.html`);
});
