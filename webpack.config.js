const path = require('path');
const glob = require('glob');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const CopyPlugin = require("copy-webpack-plugin");

//Auto-detect all entries based on src/*.ts
const entry = {};
glob.sync('./src/**/!(*.d).ts').forEach(file => {
  const name = path.relative('./src/', file).replace(/\\/g, '/').replace(/\.ts$/,'');
  entry[name] = path.resolve(file);
});

const allowedHtmlFiles = ["index.html", "room.html"];

// Generate HtmlWebpackPlugin for each HTML file above
const htmlPlugins = require('fs').readdirSync('./public')
  .filter((file) => file.endsWith('.html') && allowedHtmlFiles.includes(file))
  .map((file) => {
    const name = path.parse(file).name;
    return new HtmlWebpackPlugin({
      template: `./public/${file}`,
      filename: `${file}`,
      chunks: [name], //inject its matching JS chunk
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
      {
        test: /\.(png|jpe?g|gif|svg)$/i, //Packaging the png files (and any other art files)
        type: 'asset/resource',
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
    new CopyPlugin({
      patterns: [
        {
          from: "public",
          to: ".",
          filter: (filepath) => {
            const file = path.basename(filepath);
            return file.endsWith(".html") && !allowedHtmlFiles.includes(file);
          }
        }
      ]
    })
  ],
  resolve: {
    extensions: ['.ts', '.js'], // So you can import .ts without extensions
  },
  performance:{
    hints: false,
  },
  devtool: 'source-map', //enables .ts line debugging in browser
};
