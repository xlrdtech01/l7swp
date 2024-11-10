export default function patchWordPress(php, scopedSiteUrl, DOCROOT) {
  new WordPressPatcher(php, scopedSiteUrl, DOCROOT).patch();
}

class WordPressPatcher {
  php;
  scopedSiteUrl;
  DOCROOT;

  constructor(php, scopedSiteUrl, DOCROOT) {
    this.php = php;
    this.scopedSiteUrl = scopedSiteUrl;
    this.DOCROOT = DOCROOT;
  }

  patch() {
    this.php.writeFile(this.DOCROOT + '/phpinfo.php', '<?php phpinfo(); ');
    this.adjustPathsAndUrls();
    this.disableSiteHealth();
    this.disableWpNewBlogNotification();
  }
  adjustPathsAndUrls() {
    this.patchFile(`${this.DOCROOT}/wp-config.php`, (contents) => {
      contents = contents.replace("'WP_DEBUG', true", '"WP_DEBUG",false');
      contents = contents.replace(
        "'SCRIPT_DEBUG',false",
        '"SCRIPT_DEBUG", true'
      );
      return `<?php
      define('SCRIPT_DEBUG', true);
      ini_set('display_errors', 0);
      ?>${contents}
      define('WP_HOME', '${JSON.stringify(this.DOCROOT)}');
         `;
    });

    // Force the site URL to be $scopedSiteUrl:
    // Interestingly, it doesn't work when put in a mu-plugin.
    this.patchFile(
      `${this.DOCROOT}/wp-includes/plugin.php`,
      (contents) =>
        contents +
        `
				function _wasm_wp_force_site_url() {
					return ${JSON.stringify(this.scopedSiteUrl)};
				}
				add_filter( "option_home", '_wasm_wp_force_site_url', 10000 );
				add_filter( "option_siteurl", '_wasm_wp_force_site_url', 10000 );
			`
    );
  }
  disableSiteHealth() {
    this.patchFile(
      `${this.DOCROOT}/wp-includes/default-filters.php`,
      (contents) =>
        contents.replace(
          /add_filter[^;]+wp_maybe_grant_site_health_caps[^;]+;/i,
          ''
        )
    );
  }
  disableWpNewBlogNotification() {
    this.patchFile(
      `${this.DOCROOT}/wp-config.php`,
      // The original version of this function crashes WASM WordPress, let's define an empty one instead.
      (contents) => `${contents} function wp_new_blog_notification(...$args){} `
    );
  }
  patchFile(path, callback) {
    this.php.writeFile(path, callback(this.php.readFileAsText(path)));
  }
}
