import { defineConfig } from 'vite';
import { resolve } from 'path';

// GTM injection plugin — only injects when VITE_GTM_ID env var is set.
// This keeps analytics out of the open-source codebase; only the
// project owner's CI/CD pipeline sets the env var.
function gtmPlugin() {
  const gtmId = process.env.VITE_GTM_ID;
  return {
    name: 'inject-gtm',
    transformIndexHtml(html) {
      if (gtmId) {
        // Deferred GTM loader (requestIdleCallback + first interaction)
        const headScript = `<!-- Google Tag Manager (deferred) -->
  <script>
  !function(){var f=false;function g(){if(f)return;f=true;
  (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});
  var j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';
  j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;
  d.head.appendChild(j);})(window,document,'script','dataLayer','${gtmId}');}
  if('requestIdleCallback' in window){requestIdleCallback(g)}else{setTimeout(g,3500)}
  ['scroll','click','touchstart'].forEach(function(e){document.addEventListener(e,g,{once:true,passive:true})});
  }();
  </script>`;
        const bodyScript = `<!-- Google Tag Manager (noscript) -->
  <noscript><iframe src="https://www.googletagmanager.com/ns.html?id=${gtmId}" height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>`;
        html = html.replace('<!--GTM_HEAD-->', headScript);
        html = html.replace('<!--GTM_BODY-->', bodyScript);
      } else {
        // No GTM — clean output
        html = html.replace('<!--GTM_HEAD-->', '');
        html = html.replace('<!--GTM_BODY-->', '');
      }
      return html;
    },
  };
}

export default defineConfig({
  root: 'frontend',
  base: './',
  publicDir: 'assets',
  build: {
    outDir: resolve(__dirname, 'dist'),
    emptyOutDir: true,
    rollupOptions: {
      input: resolve(__dirname, 'frontend/index.html'),
    },
  },
  plugins: [gtmPlugin()],
});
