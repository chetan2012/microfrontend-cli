const ModuleFederationPlugin = require('webpack/lib/container/ModuleFederationPlugin');
const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
  entry: './src/index.js',
  output: {
    publicPath: 'auto',
  },
  resolve: {
    extensions: ['.js', '.jsx', '.ts', '.tsx', '.json'],
  },
  module: {
    rules: [
      {
        test: /\.jsx?$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
        },
      },
    ],
  },
  plugins: [
    new ModuleFederationPlugin({
      name: 'hostApp', // Name for the host app
      remotes: {
        remoteApp: 'remoteApp@http://localhost:3001/remoteEntry.js', // Remote app URL
      },
      shared: {
        react: { singleton: true, eager: true }, // Share React between host and remote apps
        'react-dom': { singleton: true, eager: true },
      },
    }),
    new HtmlWebpackPlugin({
      template: './public/index.html', // Path to your HTML template
    }),
  ],
  devServer: {
    static: {
      directory: path.join(__dirname, 'public'), // serve static files from the "public" folder
    },
    port: 3000,
  },
};
