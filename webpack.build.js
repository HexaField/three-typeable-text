const path = require('path');

module.exports = {
    mode: 'production',
    entry: './src/index.js',
    output: {
      path: path.resolve('build'),
      filename: 'bundle.js',
    },
    module: {
      rules: [{
        test: /\.js$/,
        include: path.resolve(__dirname, 'example'),
        use: ['babel-loader']
      }]  
    },
};