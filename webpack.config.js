const path = require("path");
const fs = require("fs");
const CopyWebpackPlugin = require('copy-webpack-plugin');
const HtmlWebpackPlugin = require("html-webpack-plugin");
const StringReplacePlugin = require('string-replace-webpack-plugin');
const BabylonJSPlugin = require('./BabylonJSPlugin');
const appDirectory = fs.realpathSync(process.cwd());

module.exports = {
  mode: "development",
  entry: path.resolve(appDirectory, "src/App.ts"), //path to the main .ts file
  output: {
    filename: "bundle.js",
    clean: true,
  },
  resolve: {
    extensions: [".tsx", ".ts", ".js"],
  },
  devServer: {
    host: "0.0.0.0",
    port: 8080, //port that we're using for local host (localhost:8080)
    static: path.resolve(appDirectory, "dist"), //tells webpack to serve from the public folder
    hot: true,
    devMiddleware: {
      publicPath: "/",
    }
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: [
          {loader: "ts-loader"},
        ],
        exclude: /node_modules/,
      },
    ],
  },
  plugins: [
    new BabylonJSPlugin(),
    new HtmlWebpackPlugin({
      inject: true,
      template: path.resolve(appDirectory, "public/index.html"),
    }),
  ],
};