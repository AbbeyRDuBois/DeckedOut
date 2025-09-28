const path = require('path');
const glob = require('glob');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

//Auto-detect all entries based on src/*.ts
const entry = {};
glob.sync('./src/**/!(*.d).ts').forEach(file => {
  const name = path.relative('./src/', file).replace(/\\/g, '/').replace(/\.ts$/,'');
  entry[name] = path.resolve(file);
});

// Generate HtmlWebpackPlugin for each HTML file in /public
const htmlPlugins = require('fs').readdirSync('./public')
  .filter((file) => file.endsWith('.html'))
  .map((file) => {
    const name = path.parse(file).name;

    //If html has a ts that has same name use that (ex: index), oherwise use room.ts
    const knownEntryPoints = Object.keys(entry);
    const chunk = knownEntryPoints.includes(name) ? name : 'room';

    return new HtmlWebpackPlugin({
      template: `./public/${file}`,
      filename: `${file}`,
      chunks: [chunk], // Only inject its matching JS chunk
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
        exclude: [/node_modules/, /\.d\.ts$/]
      },
      {
        test: /\.css$/i,
        use: [MiniCssExtractPlugin.loader, 'css-loader'],
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
      new MiniCssExtractPlugin({
      filename: '[name].css', // generates CSS files like main.css
    }),
  ],
  resolve: {
    extensions: ['.ts', '.js'], // So you can import .ts without extensions
  },
  performance:{
    hints: false,
  },
  devtool: 'source-map', //enables .ts line debugging in browser
};
