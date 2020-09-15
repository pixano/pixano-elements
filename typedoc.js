module.exports = {
    mode: 'modules',
    out: 'docs',
    exclude: [
        '**/node_modules/**',
        '**/tests/*.ts',
    ],
    lernaExclude: [
        'common',
        'demo-cuboid',
        'demo-rectangle',
        'demo-polygon',
        'demo-segmentation',
        'demo-smart-rectangle',
        'demo-graph',
        'demo-graph-rect'
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
