const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = {
  entry: {
    login: './src/Login/login.js', //Entry point for login page
    signup: './src/Login/signup.js',
    counter: './src/game-selection.js',
    forgot: './src/Login/forgot-password.js'
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
        template: './public/Login/login.html', // Use 'login.html' as the template
        filename: 'login.html', // Output file name
        chunks: ['login']
      }),
    new HtmlWebpackPlugin({
      template: './public/game-selection.html', // Use 'counter.html' as the template
      filename: 'counter.html', // Output file name
      chunks: ['counter'],
    }),
    new HtmlWebpackPlugin({
        template: './public/Login/signup.html', // Use 'signup.html' as the template
        filename: 'signup.html', // Output file name
        chunks: ['signup'],
    }),
    new HtmlWebpackPlugin({
      template: './public/Login/forgot-password.html',
      filename: 'forgot-password.html',
      chunks: ['forgot'],
  }),
    new MiniCssExtractPlugin({
      filename: 'styles.css',  // Name of the output CSS file
    }),
    new CopyWebpackPlugin({
      patterns: [
        { from: 'public/fonts', to: 'fonts' },  // Copy fonts from public to dist/fonts
      ],
    }),
  ],
  // Source map configuration for debugging
  devtool: 'source-map',
};
