const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

// Auto-detect all entries based on src/*.ts
const entry = {};
require('fs').readdirSync('./src').forEach((file) => {
  if (file.endsWith('.ts')) {
    const name = path.parse(file).name;
    entry[name] = `./src/${file}`;
  }
});

// Generate HtmlWebpackPlugin for each HTML file in /public
const htmlPlugins = require('fs').readdirSync('./public')
  .filter((file) => file.endsWith('.html'))
  .map((file) => {
    const name = path.parse(file).name;
    return new HtmlWebpackPlugin({
      template: `./public/${file}`,
      filename: `${file}`,
      chunks: [name], // Only inject its matching JS chunk
    });
  });

module.exports = {
  entry,
  mode: 'development',
  module: {
    rules: [
      {
        test: /\.ts$/, //Loading ts files
        use: 'ts-loader',
        exclude: /node_modules/,
      },
      {
        test: /\.css$/, // For CSS files
        use: [MiniCssExtractPlugin.loader, 'css-loader'], // Load CSS and inject it into the DOM
      },
    ],
  },
  // Output configuration
  output: {
    filename: '[name].bundle.js', // The output JavaScript file
    path: path.resolve(__dirname, 'dist'), // The output folder
    clean: true, // Clean the 'dist' folder before every build
  },
  // Plugins to use in the build process
  plugins: [
    ...htmlPlugins,
  ],
  resolve: {
    extensions: ['.ts', '.js'], // So you can import .ts without extensions
  },
  performance:{
    hints: false,
  },
  devtool: 'source-map', //enables .ts line debugging in browser
};
