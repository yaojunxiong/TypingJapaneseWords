const path = require('path');

module.exports = {
    entry: './src/kuromoji-wrapper.js',
    output: {
        filename: 'kuromoji.bundle.js',
        path: path.resolve(__dirname, 'dist'),
        library: 'kuromoji',
        libraryTarget: 'umd'
    },
    resolve: {
        fallback: {
            path: require.resolve('path-browserify') // ✅ 添加这行！
        }
    },
    module: {
        rules: [
            {
                test: /\.js$/,
                exclude: /node_modules/,
                use: {
                    loader: 'babel-loader'
                }
            }
        ]
    },
    mode: 'production'
};
