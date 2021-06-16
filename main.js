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

const isDir = path => new Promise(resolve =>
    fs.stat(path, (err, stats) =>
        resolve(!err && stats.isDirectory()))
);

const getFile = path => new Promise(resolve =>
    fs.access(path, err => {
        if (err) {
            resolve('');
        }
        fs.readFile(path, 'binary', (err, data) =>
            resolve(data.toString())
        )
    })
);

const getDir = (path, fullUrl = "") => new Promise(resolve =>
    fs.readdir(path, (err, files) => {
        let html = '</pre>';
        for (let file in files) {
            html += `<a href="${ fullUrl }/${ files[file] }">${ files[file] }</a><br>`;
        }
        html += '<pre>';
        resolve(html);
    })
);

const getContent = async fullUrl => new Promise(resolve => {
    const path = `${ home }${ fullUrl }`;
    isDir(path).then(isDir => {
        if (!isDir) {
            Promise.all([
                fileType(path),
                getFile(path)
            ]).then(values => {
                let type = values.shift();
                let content = values.shift();
                resolve({
                    type: type ? type.mime : type,
                    content: content
                });
            });
        } else {
            getDir(path, fullUrl).then(content => resolve({
                type: 'DIR',
                content: content
            }));
        }
    });
});

const getUp = url =>
    '--------------------------------\n' +
    `<h4><a href="${ url }">..</a></h4>`;

const getStatus = async () =>
    '--------------------------------\n' +
    `Running at http://${ hostname }:${ port }/\n\n` +
    '---------- Server log ----------\n' +
    await readLastLines(process.env.pm_out_log_path, 1) + '\n' +
    '------------ Errors ------------\n' +
    await readLastLines(process.env.pm_err_log_path, 20) + '\n';

const server = http.createServer((req, res) => {
    // Emitted each time there is a request
    let fullUrl = req.url.replace(/\/$/, '');
    const sendContent = async result => {
        if (fullUrl === style) {
            result.type = 'text/css';
        }
        res.statusCode = 200;
        switch (result.type) {
            case undefined:
            case 'text/html':
                result.content = highlight(result.content).value;
            case 'DIR':
                let onRoot = !fullUrl;
                res.setHeader('Content-Type', 'text/html');
                res.end(
                    header +
                    '-------- Hello world! =) -------\n' +
                    `<h3>It is ${ fullUrl ? fullUrl : "/" }</h3>` +
                    (!onRoot ? getUp(dirname(fullUrl)) : "") +
                    result.content +
                    (onRoot ? await getStatus() : "") +
                    '----------- The End! -----------\n' +
                    footer
                );
                break;
            case 'text/css':
            default:
                res.setHeader('Content-Type', result.type);
                res.end(result.content, 'binary');
        }
    };

    getContent(fullUrl).then(sendContent);
});

server.listen(
    port,
    hostname,
    () => console.log(`Server starts at http://${ hostname }:${ port }/`)
);
