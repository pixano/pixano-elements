const { resolve } = require('path');
const TerserPlugin = require("terser-webpack-plugin");
const { CheckerPlugin } = require('awesome-typescript-loader');
// const CopyPlugin = require('copy-webpack-plugin');

module.exports = {
	resolve: {
		extensions: ['.ts', '.js']
	},
	devtool: 'source-map',
	module: {
		rules: [
			{
				test: /\.tsx?$/,
				loader: 'awesome-typescript-loader',
				exclude: /node_modules/,
			}
		]
	},
	plugins: [
		new CheckerPlugin(),
		// new CopyPlugin([
		//				{ from: '../../node_modules/pixi.js/dist/pixi.min.js', to: resolve(__dirname, 'dist')},
		//			]),
	],
	entry: {
		'graphics-2d': './src/index.ts',
		'graphics-2d.min': './src/index.ts'
	},
	optimization: {
		minimize: true,
		minimizer: [new TerserPlugin({include: /\.min\.js$/})],
	},
	output: {
		filename: '[name].js',
		path: resolve(__dirname, 'dist'),
		libraryTarget: 'umd',
		library: 'Graphics2d',
		umdNamedDefine: true
	},
	performance: {
		hints: false,
	},
	externals: [
		// Uncomment if you do not want to include pixi.js in the bundle
		// {"pixi.js": "PIXI"},
	]
};
