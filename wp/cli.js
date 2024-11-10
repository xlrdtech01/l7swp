global.__dirname = new URL('./', import.meta.url).href
  .replace('file://', '')
  .replace('file:', '');
global.require = createRequire(import.meta.url);
global.location = { origin: 'http://example.com' };
import { createRequire } from 'module';
import { loadPHPRuntime, PHP } from '@php-wasm/node';
import { initWp } from './initphp.js';

async function main() {
  const loader = await import(__dirname + '/vfs/newphp8.js');
  let php;
  let phpModule;
  try {
    const runtimeId = await loadPHPRuntime(loader, {}, [
      {
        default: (_phpModule) => {
          phpModule = _phpModule;
        },
      },
    ]);
    php = new PHP(runtimeId);
  } catch (e) {
    console.log('?!');
    console.error(e);
  }
  php.mount({ root: '/home' }, '/home');
  phpModule.FS.chdir(process.cwd());
  const args = process.argv.slice(2);

  php.cli(['php', '-c', __dirname + '/php.ini', ...args]);
}

main();
