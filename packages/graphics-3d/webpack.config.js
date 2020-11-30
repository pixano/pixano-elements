const { resolve } = require('path');
const TerserPlugin = require("terser-webpack-plugin");
const { CheckerPlugin } = require('awesome-typescript-loader');

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
    new CheckerPlugin()
  ],
  entry: {
    'graphics-3d': './src/index.ts',
    'graphics-3d.min': './src/index.ts'
  },
  optimization: {
    minimize: true,
    minimizer: [new TerserPlugin({include: /\.min\.js$/})],
  },
  output: {
    filename: '[name].js',
    path: resolve(__dirname, 'dist'),
    libraryTarget: 'umd',
    library: 'Graphics3d',
    umdNamedDefine: true
  },
  performance: {
    hints: false,
  }
};
