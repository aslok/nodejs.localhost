const hostname = 'localhost';
const port = 8023;

const home = process.env.pm_cwd;

const http = require('http');
const fs = require('fs');
const dirname = require('path').dirname;
const fileType = require('file-type').fromFile;
const readLastLines = require('read-last-lines').read;
const highlight = require('highlight.js').highlightAuto;

const style = '/node_modules/highlight.js/styles/stackoverflow-light.css';
const header =
    '<!DOCTYPE html><html><head>' +
    `<link rel="stylesheet" href="${ style }">` +
    '</head><body><img style="float:right;" src="/best.gif"><pre>';
const footer = '</pre></body></html>';

const isReadable = path => new Promise((resolve, reject) =>
    fs.access(path, fs.constants.R_OK, err =>
        !err ? resolve(path) : reject()
    )
);

const isDir = path => new Promise(resolve =>
    fs.stat(path, (err, stats) =>
        resolve(!err && stats.isDirectory())
    )
);

const fileContent = (path, type) => new Promise(resolve =>
    type === undefined ?
        fs.readFile(path, 'binary', (err, data) =>
            resolve({type: type, content: data.toString()})
        ) : resolve({type: type, content: fs.createReadStream(path)})
);

const dirContent = (path, fullUrl = '') => new Promise(resolve =>
    fs.readdir(path, (err, files) => {
        let html = '</pre>';
        for (let file in files) {
            html += `<a href="${ fullUrl }/${ files[file] }">${ files[file] }</a><br>`;
        }
        html += '<pre>';
        resolve({type: 'DIR', content: html});
    })
);

const getContent = fullUrl => new Promise(resolve => {
    const path = home + fullUrl;
    isReadable(path).then(isDir).then(isDirectory => {
        if (isDirectory) {
            dirContent(path, fullUrl).then(resolve);
            return;
        }
        if (path === home + style) {
            fileContent(path, 'text/css').then(resolve);
            return;
        }
        fileType(path).then(type => fileContent(path, type ? type.mime : type)).then(resolve);
    }).catch(() => resolve({
        type: undefined,
        content: ''
    }));
});

const getUp = url =>
    '--------------------------------\n' +
    `<h4><a href="${ url }">..</a></h4>`;

const getStatus = () => new Promise(resolve => {
    const status =
        '--------------------------------\n' +
        `Running at http://${ hostname }:${ port }/\n\n`;
    Promise.all([
        readLastLines(process.env.pm_out_log_path, 1),
        readLastLines(process.env.pm_err_log_path, 20)
    ]).then(([out, errors]) => {
        resolve(status +
            '---------- Server log ----------\n' +
            out + '\n' +
            '------------ Errors ------------\n' +
            errors + '\n'
        );
    }).catch(() => resolve(status));
});

const server = http.createServer((req, res) => {
    // Emitted each time there is a request
    let fullUrl = req.url.replace(/\/$/, '');
    const sendContent = ([data, status]) => {
        res.statusCode = 200;
        switch (data.type) {
            case undefined:
                data.content = highlight(data.content).value;
            case 'DIR':
                res.setHeader('Content-Type', 'text/html');
                res.end(
                    header +
                    '-------- Hello world! =) -------\n' +
                    `<h3>It is ${ fullUrl ? fullUrl : '/' }</h3>` +
                    (fullUrl ? getUp(dirname(fullUrl)) : '') +
                    data.content +
                    (status ? status : '') +
                    '----------- The End! -----------\n' +
                    footer
                );
                break;
            default:
                res.setHeader('Content-Type', data.type);
                data.content.pipe(res);
        }
    };

    Promise.all([
        getContent(fullUrl),
        !fullUrl ? getStatus() : ''
    ]).then(sendContent);
});

server.listen(
    port,
    hostname,
    () => console.log(`Server starts at http://${ hostname }:${ port }/`)
);
