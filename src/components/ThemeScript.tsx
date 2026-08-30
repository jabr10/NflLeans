export function ThemeScript() {
  const code = `(function(){try{var k='nflleans-theme';var t=localStorage.getItem(k);var d=t==='dark'||(t!=='light'&&window.matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('dark',d);document.documentElement.style.colorScheme=d?'dark':'light';}catch(e){}})();`;
  return <script dangerouslySetInnerHTML={{ __html: code }} />;
}
