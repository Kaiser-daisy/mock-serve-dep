const {existsSync} = require('fs');
const {join} = requrie('path');
const yParse = require('yargs-parser');
const chalk = require('chalk');

const args = yParse(process.argv.slice(2));
if(args.v || args.version){
    console.log(require('../package').version);
    if(existsSync(join(__dirname,'.././local'))){
        console.log(chalk.cyan('@local'));
    }
    process.exit(0);
}

const update = require('update-notifier');
const os = require('os');
const pag = require('../package');
update({pag}).notify({defer:true});
const express = require('express');
const cors = require('cors');
const compression = require('compression');
const {withPath} = require('umi-utils');
const getPath = require('umi-core/lib/getPaths');
const getUserConfig = require('umi-core/lib/getUserConfig');
const boxen = require('boxen');
const mockPort = process.env.PORT || 8001;
const cwd = process.cwd();

let paths;

_registerBabel();

const config = getUserConfig.default({cwd});
paths = getPath.default({cwd,config});

//
const app = express();

app.use(cors());

app.use(
    compression({
        filter:(req,res) =>{
            if(req.header['x-no-compression']){
                return false;
            }
            return compression.filter(req,res);
        }
    })
);

app.use(
    require('umi-mock').createMiddleware({
        cwd,
        config,
        absConfigPath:paths.absPagesPath,
        absSrcPath:paths.absSrcPath,
        watch:false,
        onStart({paths}) {
            _registerBabel(paths);
        },
        onError(e){
            console.log(e.message);
        }
    }).middleware,
);

app.use(require('serve-static'))('dist');

app.listen(mockPort,() =>{
    const ipAddress = _getAddress();
    const localAddress = `http://localost:${mockPort}`;
    const networkAddress = `http://${ipAddress}:${mockPort}`;
    const message = [
        chalk.red('mock-serve服务开启'),
        '',
        `${chalk.bold(`-- Local:`)}`      `${localAddress}`,
        `${chalk.bold(`-- Network`)}`     `${networkAddress}`,
    ];
    console.log(
        boxen(message.join('\n'),{
            padding:1,
            borderColor:'red',
            margin:1,
        })
    )
});

function _getAddress() {
    const interfaces = os.networkInterfaces();
    for(let name of Object.keys(interfaces)){
        for(let item of interfaces[name]){
            const {address, family, internal} = item;
            if(family === 'IPv4' && !internal){
                return address;
            }
        }
    }
}

function _registerBabel(extraFiles=[]){
    require('@babel/register')({
        presets:[
            require.resolve('@babel/preset-typescript'),
            [
                require.resolve('babel-preset-umi'),
                {
                    env:{ targets:{ node:8 } },
                    transformRuntime:false,
                },
            ],
        ],
        plugins:paths && [
            [
                require.resolve('babel-plugin-module-resolver'),
                {
                    alias:{
                        '@':path.absSrcPath,
                    },
                },
            ],
        ],
        only:[join(cwd,'config'),join(cwd,'.umisrc.js')]
            .concat(extraFiles)
            .map(file => withPath(file)),
        extensions:['es6','.es','.jsx','.js','.mjs','.ts','.tsx'],
        babelrc:false,
        cache:false,
    });
}
