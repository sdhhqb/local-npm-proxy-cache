const express = require('express');
const utils = require('./utils');
const app = express();

const LOCAL_BASE = 'http://127.0.0.1:3000';

// 没有favicon
app.get('/favicon.ico', (req, res) => {
  res.status(404).end();
});

app.get('/tarballs/*', function (req, res, next) {
  console.log('get /tarballs : ', req.method, req.originalUrl, req.url);
  let tarballPath = req.originalUrl.substring('/tarballs/'.length);
  utils.getTarball(tarballPath).then((tarball) => {
    res.set('content-type', 'application/octet-stream');
    res.set('content-length', tarball.length);
    return res.send(tarball);
  })
});

app.get('*', function (req, res, next) {
    console.log('get /*: ', req.method, req.originalUrl);
    utils.getDocument(req.originalUrl).then((doc) => {
      res.type('application/json');
      // res.send(doc); // 原始数据
      res.json(utils.modifyMetaData(doc, LOCAL_BASE));
    })
  }
);

app.listen(3000, function () {
  console.log('app listening on port 3000!');
});
