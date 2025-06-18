const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = {
  entry: {
    index: './src/index.ts', //Entry point for each page
    room: './src/room.ts',
  },

  // Output configuration
  output: {
    filename: '[name].bundle.js', // The output JavaScript file
    path: path.resolve(__dirname, 'dist'), // The output folder
    clean: true, // Clean the 'dist' folder before every build
  },

  // Module rules for processing different file types
  module: {
    rules: [
      {
        test: /\.js$/, // For JavaScript files
        exclude: /node_modules/, // Exclude node_modules
        use: 'babel-loader', // Use Babel to transpile JavaScript
      },
      {
        test: /\.css$/, // For CSS files
        use: [MiniCssExtractPlugin.loader, 'css-loader'], // Load CSS and inject it into the DOM
      },
    ],
  },

  // Plugins to use in the build process
  plugins: [
    new HtmlWebpackPlugin({
        template: './public/index.html', // Use 'index.html' as the template
        filename: 'index.html', // Output file name
        chunks: ['index']
      }),
    new HtmlWebpackPlugin({
      template: './public/room.html',
      filename: 'room.html',
      chunks: ['room'],
    }),
    new MiniCssExtractPlugin({
      filename: 'styles.css',  // Name of the output CSS file
    }),
  ],
  // Source map configuration for debugging
  devtool: 'source-map',
};
