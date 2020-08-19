const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');

module.exports = {
    mode: 'development',
    entry: './example/index.js',
    output: {
      path: path.resolve('dist'),
      filename: 'bundle.js',
    },
    module: {
      rules: [{
        test: /\.js$/,
        include: path.resolve(__dirname, 'example'),
        use: ['babel-loader']
      }]  
    },
    devtool: 'inline-source-map',
    devServer: {
      open: true,
      port: 3000,
    },
    plugins: [
      new CleanWebpackPlugin(),
      new CopyPlugin({
        patterns: [
          { from: 'example', to: '' },
        ],
      }),
    ],
    node: {
      fs: 'empty'
    }
};