const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
  // Entry point for the application
  entry: './src/index.js',

  // Output configuration
  output: {
    filename: 'bundle.js', // The output JavaScript file
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
        use: ['style-loader', 'css-loader'], // Load CSS and inject it into the DOM
      },
    ],
  },

  // Plugins to use in the build process
  plugins: [
    new HtmlWebpackPlugin({
      template: './public/index.html', // Use 'index.html' as the template
      filename: 'index.html', // Output file name
    }),
  ],
  // Source map configuration for debugging
  devtool: 'source-map',
};
