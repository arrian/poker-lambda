var path = require('path');
var webpack = require('webpack');
var HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
	debug: true,
	devtool: 'inline-source-map',
	entry: [
		'webpack-dev-server/client?http://localhost:3000',
		'webpack/hot/only-dev-server',
		'react-hot-loader/patch',
		'./src/client/index'
	],
	output: {
		path: path.join(__dirname, 'build'),
		filename: 'bundle.js',
		publicPath: '/'
	},
	plugins: [
		new HtmlWebpackPlugin({
			filename: 'index.html',
			template: './src/client/index.html',
			inject: 'body'
		}),
		new webpack.HotModuleReplacementPlugin()
	],
	module: {
		loaders: [{
			test: /\.js$/,
			exclude: /node_modules/,
			loaders: ['babel'],
			include: path.join(__dirname, '/src/client')
		},{
			test: /\.svg$/,
			loader: 'babel?presets[]=env,presets[]=react!svg-react'
		},{
			test: /\.jpg$/,
			loader: "url?limit=8192&name=[hash].[ext]"
		}]
	}
};
