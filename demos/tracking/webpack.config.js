const path = require('path');

module.exports = {
  mode: 'development',
  entry: path.resolve(__dirname, 'my-demo.js'),
  output: {
    path: path.resolve(__dirname),
    filename: 'my-demo-bundle.js'
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js']
  },
  devtool: 'eval-source-map',
  module: {
    rules: [
      {
        test: /\.(js|mjs|jsx|ts|tsx)$/,
        use: ["source-map-loader"],
        enforce: "pre"
      }
    ]
  }
};
