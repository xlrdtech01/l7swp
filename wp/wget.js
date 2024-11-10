import fetch from 'node-fetch';
import fs from 'fs';

const wpcli =
  'https://raw.githubusercontent.com/wp-cli/builds/gh-pages/phar/wp-cli.phar';
const composer = 'https://getcomposer.org/download/2.5.4/composer.phar';

async function wget(url) {
  const response = await fetch(process.argv[2]);
  fs.writeFileSync(
    new URL(url).pathname.split('/').pop(),
    Buffer.from(await response.arrayBuffer())
  );
}

wget();
