const request = require('request');
const fs = require('fs');
const path = require('path');

// const FAT_REMOTE = 'https://registry.npmjs.org';
const FAT_REMOTE = 'https://replicate.npmjs.com';
const LOCAL_PATH = path.resolve(`${__dirname}/../local-files`)

// 获取包描述json文件，优先从本地读取，没有就从npmjs下载
function getDocument(name) {
  // 转换掉%2f
  let docPath = decodeURIComponent(name)
  return new Promise((resolve, reject) => {
    let filePath = path.resolve(`${LOCAL_PATH}${docPath}.json`);
    if (fs.existsSync(filePath)) {
      fs.readFile(filePath, (err, data) => {
        if (err) {
          reject(err)
        }
        resolve(data);
      })
    } else {
      let url = `${FAT_REMOTE}${name}`
      console.log('proxy request url: ', url);

      let lastSlash = docPath.lastIndexOf('/');
      let dirPath = '';
      if (lastSlash > 0) {
        dirPath = path.resolve(`${LOCAL_PATH}${docPath.substring(0, lastSlash)}`);
      }
      request(url, (error, response, body) => {
        if (error) {
          reject(error);
        }
        if (response && response.statusCode === 200) {
          console.log('write document: ', !!dirPath, filePath);
          if (dirPath) {
            fs.mkdirSync(dirPath, {recursive: true});
          }
          fs.writeFile(filePath, body, (error) => {
            if (error) {
              reject(error)
            }
            resolve(body);
          });
        } else {
          reject(response);
        }
      });
    }
  })
}

// 获取压缩文件
function getTarball(name) {
  return new Promise((resolve, reject) => {
    let filePath = path.resolve(`${LOCAL_PATH}/${name}`);
    if (fs.existsSync(filePath)) {
      console.log('tarball cache exists, return file');
      fs.readFile(filePath, (err, data) => {
        if (err) {
          reject(err)
        }
        resolve(data);
      })
    } else {
      // tarball name 可能为 package-name-1.0.0-beta.1.tgz
      let lastDash = name.replace(/-beta.*$/, '').lastIndexOf('-');
      let metaPath = path.resolve(`${LOCAL_PATH}/${name.substring(0, lastDash)}.json`);
      let version = name.substring(lastDash + 1).split('.tgz')[0];
      console.log('find tarball url from local metaPath', metaPath)
      fs.readFile(metaPath, (err, data) => {
        if (err) {
          reject(err)
        }
        const metaData = JSON.parse(data);
        const tgzUrl = metaData.versions[version].dist.tarball;

        console.log('proxy request tarball url: ', tgzUrl);
        request({
          url: tgzUrl,
          encoding: null,
          headers: {
            'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
            'accept-encoding': 'gzip, deflate, br',
            'accept-language': 'zh-CN,zh;q=0.9',
            'cache-control': 'no-cache',
            'upgrade-insecure-requests': '1',
            'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/81.0.4044.138 Safari/537.36'
          }
        }, (error, response, body) => {
          if (error) {
            reject(error);
          }
          console.log('get tarball resp: ', response && response.statusCode)

          if (response && response.statusCode === 200) {
            fs.writeFile(filePath, body, (error) => {
              if (error) {
                reject(error)
              }
              console.log('write tarball succ ============', filePath);
              resolve(body);
            })
          } else {
            reject(response);
          }
        });

      })
    }
  })
}

// 修改包元数据中的tarball字段，指向本地registry
function modifyMetaData(doc, localBase) {
  const data = JSON.parse(doc);
  const versions = Object.keys(data.versions);
  const name = data.name;
  for (let i = 0; i < versions.length; i++) {
    let version = versions[i];
    data.versions[version].dist.ori_tarball = data.versions[version].dist.tarball;
    data.versions[version].dist.tarball = localBase + '/' + 'tarballs/' + name + '-' + version + '.tgz';
  }
  return data;
}

module.exports = {
  getDocument,
  modifyMetaData,
  getTarball
}
