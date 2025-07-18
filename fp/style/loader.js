/* global $script */

try {
    const reactMode = window.location.href.match(/:\d+/) ? 'development' : 'production.min';
    const src =
        'currentScript' in document
            ? document.currentScript.src.split('?').shift()
            : document.querySelector('script[src$="loader.js"]').getAttribute('src');
    const rSuffix = /(editor-releases\/[^/]+\/)?loader.js/;

    const fontsStyleLink = document.createElement('link');
    fontsStyleLink.setAttribute('rel', 'stylesheet');
    fontsStyleLink.setAttribute('type', 'text/css');
    fontsStyleLink.setAttribute('href', src.replace(rSuffix, 'assets/fonts.css'));
    document.head.appendChild(fontsStyleLink);

    $script.order(
        [
            '//cdn.jsdelivr.net/npm/babel-polyfill@6.26.0/dist/polyfill.min.js',
            `//cdn.jsdelivr.net/npm/react@17.0.2/umd/react.${reactMode}.js`,
            `//cdn.jsdelivr.net/npm/react-dom@17.0.2/umd/react-dom.${reactMode}.js`,
        ],
        'react',
    );

    $script.order(
        [
            src.replace(rSuffix, 'assets/pixi-legacy.7.2.4.patch-1.min.js'),
            'https://cdn.jsdelivr.net/npm/pixi-filters@5.2.1/dist/browser/pixi-filters.js',
        ],
        'other-deps',
    );

    $script.ready(['react', 'other-deps'], function () {
        $script(src.replace('loader.js', 'build/app.js'), 'editor');
    });
} catch (error) {
    console.error('[fp::embed::fatal] loader.js encountered a critical error', error);
}
