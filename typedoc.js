module.exports = {
    mode: 'modules',
    out: 'docs',
    exclude: [
        '**/node_modules/**',
        '**/lib/**',
        '**/dist/**',
        '**/tests/*.ts',
    ],
    lernaExclude: [
        'demo-cuboid',
        'demo-rectangle',
        'demo-polygon',
        'demo-polygon-http',
        'demo-segmentation',
        'demo-segmentation-interactive',
        'demo-smart-rectangle',
        'demo-graph',
        'demo-tracking'
    ],
    name: '@pixano',
    excludePrivate: true,
    excludeExternals: true,
    excludeNotExported: true,
    ignoreCompilerErrors: true,
    includeVersion: true,
    hideGenerator: true,
    tsconfig: 'tsconfig.common.json',
};
