global.__dirname = new URL('./', import.meta.url).href
  .replace('file://', '')
  .replace('file:', '');
import fs from 'fs';
import express from 'express';

async function main() {
  const app = express();
  app.all('*', async (req, res) => {
    if (req.query.length > 100) {
      res.status(302);
      res.setHeader('location', '/');
      res.end();
    } else if (req.query.origin) {
      const absoluteUrl = new URL(req.query.origin);
      fs.writeFileSync(
        __dirname + '/.wprc.json',
        JSON.stringify({ absoluteUrl })
      );
      res.status(302);
      res.setHeader('location', '/');
      res.end();
      console.log(`Got it! It's ${absoluteUrl}. Starting the dev workflow now`);
      process.exit(0);
    } else {
      res.setHeader('content-type', 'text/html');
      res.send(
        `<!DOCTYPE html><html><head><script>window.location.href = '/?origin=' + encodeURIComponent(window.location.origin);<\/script></head></html>`
      );
      res.end();
    }
  });
  const port = 3000;
  app.listen(port, async () => {
    console.log(`Capturing the current container URL...`);
  });
}

main();
