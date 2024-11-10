global.require = createRequire(import.meta.url);
global.location = { origin: 'http://example.com' };
import { createRequire } from 'module';
import { loadPHPRuntime, PHP } from '@php-wasm/node';
import fs from 'fs';

const now__dirname = new URL('./', import.meta.url).href
  .replace('file://', '')
  .replace('file:', '');
export async function initPhpWithWp(DOCROOT) {
  const loader = await import(now__dirname + '/vfs/newphp8.js');
  let php;
  try {
    const runtimeId = await loadPHPRuntime(loader, {}, []);
    console.log('worker');
    php = new PHP(runtimeId);
  } catch (e) {
    console.log('?!');
    console.error(e);
  }

  // const DOCROOT = path.join(now__dirname, 'wp', 'wordpress');
  console.log({ DOCROOT });
  php.mount({ root: '/home' }, '/home');
  initWp(php);
  return php;
}

export function initWp(php) {
  const wordpressZip = fs.readFileSync(now__dirname + '/vfs/wp.zip');
  php.writeFile('/wordpress.zip', wordpressZip);
  php.mkdirTree('/wordpress');
  const importResult = php.run({
    code: `<?php
      $zip = new ZipArchive;
      $res = $zip->open('/wordpress.zip');
      $zip->extractTo( '/' );
      $zip->close();
      `,
  });
  if (importResult.exitCode !== 0) {
    console.log(importResult.errors);
  }
}
