/*global process __dirname */
import fs from 'fs'
import path from 'path'
import html, {makeHtmlAttributes} from '@rollup/plugin-html'
import copy from 'rollup-plugin-copy'
import json from '@rollup/plugin-json'
import commonjs from '@rollup/plugin-commonjs'
import {nodeResolve} from '@rollup/plugin-node-resolve'
import del from 'rollup-plugin-delete'
import externalGlobals from "rollup-plugin-external-globals"
import {babel} from '@rollup/plugin-babel'
import eslint from '@rbnlffl/rollup-plugin-eslint'
import css from 'rollup-plugin-css-porter'
import replace from '@rollup/plugin-replace'
import alias from '@rollup/plugin-alias'
import {terser} from "rollup-plugin-terser"
import serve from 'rollup-plugin-serve'
// import license from 'rollup-plugin-license'
//api/chain

let isProduction = false
let isDevelopment = false
let isLint = false

if(process.argv.findIndex(element => element == '---dev') != -1) isDevelopment = true
if(process.argv.findIndex(element => element == '---prod') != -1) isProduction = true
if(process.argv.findIndex(element => element == '---lint') != -1) isLint = true

const dest = isProduction?'./dist':'./dev'
const destPath = path.resolve(__dirname, dest)
const lib = './src/lib/'
const cssFile = '/assets/bundle.min.css'
const aliases = [    
    {find: '@reduxjs/toolkit', replacement: path.join(__dirname, lib+'redux-toolkit.modern.production.min.js')},
    {find: 'buffer', replacement: path.join(__dirname, lib+'buffer.js')},
    {find: 'ethers', replacement: path.join(__dirname, lib+'ethers.esm.js')},
    {find: 'did-jwt', replacement: path.join(__dirname, lib+'did-jwt.js')},
    {find: 'did-jwt-vc', replacement: path.join(__dirname, lib+'did-jwt-vc.umd.js')},
    {find: 'did-resolver', replacement: path.join(__dirname, lib+'did-resolver.umd.js')},
    {find: 'ether-did', replacement: path.join(__dirname, lib+'ether-did.umd.js')},
    {find: 'ether-did-resolver', replacement: path.join(__dirname, lib+'ether-did-resolver.umd.js')},
    {find: 'web3.storage', replacement: path.join(__dirname, lib+'web3.storage.bundle.esm.min.js')},    
    {find: 'ipfs-core', replacement: path.join(__dirname, lib+'ipfs-core-index.min.js')},    
    {find: 'ipfs-http-client', replacement: path.join(__dirname, lib+'ipfs-http-client-index.min.js')},    
    {find: 'chain.js', replacement: path.join(__dirname, `./src/common/${isProduction?'chainProduction':'chain'}.js`)},
]

const externals = [
    { find: 'jquery', global: '$', fileDest: './externals/jquery.min.js', src: lib+'/jquery.min.js', dest: destPath+'/externals/'},
    // { find: 'bootstrap', global: 'bootstrap', replacement: './externals/bootstrsap.esm.min.js', src: 'js/src/lib/bootstrsap.esm.min.js', dest: destPath+'/externals/'}
]

export default {
    input: 'src/index.js',
    // external: externals.map( x => x.find),
    output: {
        dir: dest,
        format: 'es',
        entryFileNames: '[name]-bundle-[hash].js',
        chunkFileNames: 'externals/[name]-[hash].js', // Used by rollup: dynamic imports create chunks
        // assetFileNames: 'assets/[name]-[hash][extname]', // For plugins
    },
    plugins: [
        del({targets: [destPath]}),
        css({minified: dest + cssFile, raw: false}),
        ...isLint?  
        [eslint({
                fix: true,
                throwOnError: false,
                filterExclude: ['node_modules/**', 'assets/**', 'src/lib/**']
        })]:
        [],
        alias({
            entries: aliases
        }),
        externalGlobals({
            ...externals.reduce((prev_x, x) => {return {...prev_x, [x.find]: x.global}}, {})
        }),  
        json(),
        nodeResolve({
            browser: true,
            preferBuiltins: false,
            mainFields: ['module', 'main']
        }),
        commonjs({
            exclude: ['src/**', 'assets/**']
        }),
        babel({ 
            babelHelpers: 'runtime',
            exclude: ['src/lib/**']
        }),
        replace({
            'preventAssignment': true,
            'process.env.NODE_ENV': JSON.stringify('production'), //Used for redux-tool-kit esm: parameter that needs to be replaced
        }),
        html({
            template: ({ attributes, bundle, files, publicPath, title }) => { 
                const attrs = makeHtmlAttributes(attributes.script)
                let html = fs.readFileSync('./src/index.html', 'utf8')
                html = html.replace('</head>', `<link rel="stylesheet" href=".${cssFile}">\n</head>`)
                html = html.replace('</head>', externals.reduce((prev_x, x) => {return prev_x+`<script src=${x.fileDest}></script>\n`}, '')+'</head>')            
                html = html.replace('</body>', `<script ${attrs} src='${files?.js[0]?.fileName}'}></script>\n</body>`)
                return html
                }
        }),
        ...isProduction?[terser({
                    format: {
                comments: function (node, comment) {
                    const text = comment.value
                    return /@preserve|@license|@cc_on/i.test(text)
                    },
                }
            })]:
            [],
        copy({
            targets: [
                { src: ['assets/**/*', '!**/*.*css', `${isDevelopment?null:'!assets/apiKeys.json'}`], dest: destPath+'/assets' },
                { src: '../chain/build/contracts', dest: destPath+'/assets' },
                ...externals.map(x => {return {src: x.src, dest: x.dest}})
            ],
            }),
        ...isProduction?[serve({
                open: true,
                contentBase: [dest],
                host: '127.0.0.1',
                port: 5500
            })]:
            []
    ],
    watch: {
        exclude: [...isDevelopment?
            ['dev', 'dist', 'node_modules', './*.js', './*.json']
            :[]
        ]
    }
}
