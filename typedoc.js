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
				'demo',
				'serverless_demo'
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
