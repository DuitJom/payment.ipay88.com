const path = require('node:path');
const root = path.resolve(__dirname, '..');
module.exports = {content: ['index.html','features.html','components/*.html','script.js'].map(file => path.join(root,file)),theme:{extend:{}},plugins:[]};
