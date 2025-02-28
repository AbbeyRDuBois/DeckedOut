const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
  entry: {
    login: './src/login.js', //Entry point for login page
    signup: './src/signup.js', //Entry point for signup page
    counter: './src/counter.js', //Entry point for counter page
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
        use: ['style-loader', 'css-loader'], // Load CSS and inject it into the DOM
      },
    ],
  },

  // Plugins to use in the build process
  plugins: [
    new HtmlWebpackPlugin({
        template: './public/login.html', // Use 'login.html' as the template
        filename: 'login.html', // Output file name
        chunks: ['login']
      }),
    new HtmlWebpackPlugin({
      template: './public/counter.html', // Use 'counter.html' as the template
      filename: 'counter.html', // Output file name
      chunks: ['counter'],
    }),
    new HtmlWebpackPlugin({
        template: './public/signup.html', // Use 'signup.html' as the template
        filename: 'signup.html', // Output file name
        chunks: ['signup'],
    }),
  ],
  // Source map configuration for debugging
  devtool: 'source-map',
};
