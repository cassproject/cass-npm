// / <reference types="cypress" />
// ***********************************************************
// This example plugins/index.js can be used to load plugins
//
// You can change the location of this file or turn off loading
// the plugins file with the 'pluginsFile' configuration option.
//
// You can read more here:
// https://on.cypress.io/plugins-guide
// ***********************************************************

// This function is called when a project is opened or re-opened (e.g. due to
// the project's config changing)
const webpackPreprocessor = require('@cypress/webpack-preprocessor')
const NodePolyfillPlugin = require("node-polyfill-webpack-plugin")
const webpack = require('webpack');

/**
 * @type {Cypress.PluginConfig}
 */
// eslint-disable-next-line no-unused-vars
module.exports = (on, config) => {
  // `on` is used to hook into various events Cypress emits
  // `config` is the resolved Cypress config

  on('file:preprocessor', webpackPreprocessor({
      webpackOptions: {
      // webpack 5.109 changed experiments.typescript to default to "auto", which
      // turns on resolve.tsconfig. The resolver then reads the nearest
      // tsconfig.json for every bundled module and follows its "extends". Several
      // transitive deps of node-polyfill-webpack-plugin (pbkdf2, side-channel,
      // typed-array-buffer) ship a tsconfig.json extending "@ljharb/tsconfig",
      // which is one of their devDependencies and so is never installed. That
      // makes the extends unresolvable and fails the compilation. This project has
      // no TypeScript, so turn the experiment off.
      experiments: {
        typescript: false,
      },
      plugins: [new NodePolyfillPlugin(),
        new webpack.ProvidePlugin({
          process: 'process/browser',
        }),
      ],
        externals: {
          "http2-wrapper": "http2",
          "node:dns":"commonjs node:dns"
        },
        resolve: {
            fallback: {
              "fs": false,
              "process/browser": require.resolve("process/browser")
            },
        }
      }
    }))
};
