global.__dirname = new URL('./', import.meta.url).href
  .replace('file://', '')
  .replace('file:', '');
global.require = createRequire(import.meta.url);
global.location = { origin: 'http://example.com' };
import { createRequire } from 'module';
import express from 'express';
import getRawBody from 'raw-body';
import fs from 'fs';
import path from 'path';
import { initPhpWithWp } from './initphp.js';
import patchWordPress from './vfs/wp-patcher.js';
import { PHPServer, PHPBrowser } from '@php-wasm/node';

const { absoluteUrl } = JSON.parse(
  fs.readFileSync(path.join(__dirname, '..', '.wprc.json'))
);
const plugin = process.argv[2] || 'todo-list';
console.log('Serving plugin ', plugin);
async function main() {
  const DOCROOT = '/wordpress';
  const php = await initPhpWithWp(DOCROOT);
  php.mkdirTree('/wordpress/wp-content/plugins/todo-list');
  php.mount(
    { root: __dirname + '/../todo-list' },
    '/wordpress/wp-content/plugins/todo-list'
  );
  // php.setPhpIniEntry('display_errors', '0');

  let phpServer;
  let phpBrowser;

  const app = express();
  app.all('*', async (req, res) => {
    if (!phpBrowser) {
      const siteUrl = absoluteUrl.replace(/\/$/, '');
      patchWordPress(php, siteUrl, DOCROOT);
      phpServer = new PHPServer(php, {
        absoluteUrl: siteUrl,
        documentRoot: DOCROOT,
        isStaticFilePath: (p) =>
          p.includes('/plugins/') || p.includes('wp-uploads'),
      });
      phpBrowser = new PHPBrowser(phpServer);
      await login(phpBrowser);
      res.status(302);
      res.setHeader('location', '/wp-admin/plugins.php');
      res.end();
      return;
    }
    let relativeUrl = req.path;
    const staticFilePath = path.join(
      __dirname,
      '..',
      'node_modules/dummy-package-please-ignore/wp-6.0',
      relativeUrl
    );
    if (
      fs.existsSync(staticFilePath) &&
      !fs.lstatSync(staticFilePath)?.isDirectory()
    ) {
      res.sendFile(staticFilePath);
    } else {
      const vfsStaticFilePath = path.join(DOCROOT, relativeUrl);
      if (php.fileExists(vfsStaticFilePath)) {
        if (php.isDir(vfsStaticFilePath)) {
          relativeUrl = path.join(relativeUrl, 'index.php');
        } else {
          // We're done! Let's just pass this URL
        }
      } else {
        // It's a 404! But that's fine, let's be forgiving
      }
      let requestHeaders = {};
      if (req.rawHeaders && req.rawHeaders.length) {
        for (let i = 0; i < req.rawHeaders.length; i += 2) {
          requestHeaders[req.rawHeaders[i]] = req.rawHeaders[i + 1];
        }
      }
      requestHeaders['host'] = absoluteUrl.host;
      requestHeaders['origin'] = absoluteUrl.origin;

      // console.log({ requestHeaders });
      // console.log([req.method, req.body]);
      let rawBody = await getRawBody(req);
      const resp = await phpBrowser.request({
        relativeUrl: req.url,
        method: req.method,
        headers: requestHeaders,
        body: rawBody.toString(),
      });
      delete resp.headers['x-frame-options'];

      res.statusCode = resp.httpStatusCode;
      Object.keys(resp.headers).forEach((key) => {
        res.setHeader(key, resp.headers[key]);
      });
      res.status(resp.httpStatusCode);
      res.end(resp.body);
    }
  });
  const port = 3000;
  app.listen(port, async () => {
    console.log(`WordPress server is listening on port ${port}`);
  });
}

async function login(phpBrowser, user = 'admin', password = 'password') {
  await phpBrowser.request({
    relativeUrl: '/wp-login.php',
  });

  await phpBrowser.request({
    relativeUrl: '/wp-login.php',
    method: 'POST',
    formData: {
      log: user,
      pwd: password,
      rememberme: 'forever',
    },
  });
}

main();
