/*!

JSZip v3.10.1 - A JavaScript class for generating and reading zip files
<http://stuartk.com/jszip>

(c) 2009-2016 Stuart Knightley <stuart [at] stuartk.com>
Dual licenced under the MIT license or GPLv3. See https://raw.github.com/Stuk/jszip/main/LICENSE.markdown.

JSZip uses the library pako released under the MIT license :
https://github.com/nodeca/pako/blob/main/LICENSE
*/

!function(e){if("object"==typeof exports&&"undefined"!=typeof module)module.exports=e();else if("function"==typeof define&&define.amd)define([],e);else{("undefined"!=typeof window?window:"undefined"!=typeof global?global:"undefined"!=typeof self?self:this).JSZip=e()}}(function(){return function s(a,o,h){function u(r,e){if(!o[r]){if(!a[r]){var t="function"==typeof require&&require;if(!e&&t)return t(r,!0);if(l)return l(r,!0);var n=new Error("Cannot find module '"+r+"'");throw n.code="MODULE_NOT_FOUND",n}var i=o[r]={exports:{}};a[r][0].call(i.exports,function(e){var t=a[r][1][e];return u(t||e)},i,i.exports,s,a,o,h)}return o[r].exports}for(var l="function"==typeof require&&require,e=0;e<h.length;e++)u(h[e]);return u}({1:[function(e,t,r){"use strict";var d=e("./utils"),c=e("./support"),p="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";r.encode=function(e){for(var t,r,n,i,s,a,o,h=[],u=0,l=e.length,f=l,c="string"!==d.getTypeOf(e);u<e.length;)f=l-u,n=c?(t=e[u++],r=u<l?e[u++]:0,u<l?e[u++]:0):(t=e.charCodeAt(u++),r=u<l?e.charCodeAt(u++):0,u<l?e.charCodeAt(u++):0),i=t>>2,s=(3&t)<<4|r>>4,a=1<f?(15&r)<<2|n>>6:64,o=2<f?63&n:64,h.push(p.charAt(i)+p.charAt(s)+p.charAt(a)+p.charAt(o));return h.join("")},r.decode=function(e){var t,r,n,i,s,a,o=0,h=0,u="data:";if(e.substr(0,u.length)===u)throw new Error("Invalid base64 input, it looks like a data url.");var l,f=3*(e=e.replace(/[^A-Za-z0-9+/=]/g,"")).length/4;if(e.charAt(e.length-1)===p.charAt(64)&&f--,e.charAt(e.length-2)===p.charAt(64)&&f--,f%1!=0)throw new Error("Invalid base64 input, bad content length.");for(l=c.uint8array?new Uint8Array(0|f):new Array(0|f);o<e.length;)t=p.indexOf(e.charAt(o++))<<2|(i=p.indexOf(e.charAt(o++)))>>4,r=(15&i)<<4|(s=p.indexOf(e.charAt(o++)))>>2,n=(3&s)<<6|(a=p.indexOf(e.charAt(o++))),l[h++]=t,64!==s&&(l[h++]=r),64!==a&&(l[h++]=n);return l}},{"./support":30,"./utils":32}],2:[function(e,t,r){"use strict";var n=e("./external"),i=e("./stream/DataWorker"),s=e("./stream/Crc32Probe"),a=e("./stream/DataLengthProbe");function o(e,t,r,n,i){this.compressedSize=e,this.uncompressedSize=t,this.crc32=r,this.compression=n,this.compressedContent=i}o.prototype={getContentWorker:function(){var e=new i(n.Promise.resolve(this.compressedContent)).pipe(this.compression.uncompressWorker()).pipe(new a("data_length")),t=this;return e.on("end",function(){if(this.streamInfo.data_length!==t.uncompressedSize)throw new Error("Bug : uncompressed data size mismatch")}),e},getCompressedWorker:function(){return new i(n.Promise.resolve(this.compressedContent)).withStreamInfo("compressedSize",this.compressedSize).withStreamInfo("uncompressedSize",this.uncompressedSize).withStreamInfo("crc32",this.crc32).withStreamInfo("compression",this.compression)}},o.createWorkerFrom=function(e,t,r){return e.pipe(new s).pipe(new a("uncompressedSize")).pipe(t.compressWorker(r)).pipe(new a("compressedSize")).withStreamInfo("compression",t)},t.exports=o},{"./external":6,"./stream/Crc32Probe":25,"./stream/DataLengthProbe":26,"./stream/DataWorker":27}],3:[function(e,t,r){"use strict";var n=e("./stream/GenericWorker");r.STORE={magic:"\0\0",compressWorker:function(){return new n("STORE compression")},uncompressWorker:function(){return new n("STORE decompression")}},r.DEFLATE=e("./flate")},{"./flate":7,"./stream/GenericWorker":28}],4:[function(e,t,r){"use strict";var n=e("./utils");var o=function(){for(var e,t=[],r=0;r<256;r++){e=r;for(var n=0;n<8;n++)e=1&e?3988292384^e>>>1:e>>>1;t[r]=e}return t}();t.exports=function(e,t){return void 0!==e&&e.length?"string"!==n.getTypeOf(e)?function(e,t,r,n){var i=o,s=n+r;e^=-1;for(var a=n;a<s;a++)e=e>>>8^i[255&(e^t[a])];return-1^e}(0|t,e,e.length,0):function(e,t,r,n){var i=o,s=n+r;e^=-1;for(var a=n;a<s;a++)e=e>>>8^i[255&(e^t.charCodeAt(a))];return-1^e}(0|t,e,e.length,0):0}},{"./utils":32}],5:[function(e,t,r){"use strict";r.base64=!1,r.binary=!1,r.dir=!1,r.createFolders=!0,r.date=null,r.compression=null,r.compressionOptions=null,r.comment=null,r.unixPermissions=null,r.dosPermissions=null},{}],6:[function(e,t,r){"use strict";var n=null;n="undefined"!=typeof Promise?Promise:e("lie"),t.exports={Promise:n}},{lie:37}],7:[function(e,t,r){"use strict";var n="undefined"!=typeof Uint8Array&&"undefined"!=typeof Uint16Array&&"undefined"!=typeof Uint32Array,i=e("pako"),s=e("./utils"),a=e("./stream/GenericWorker"),o=n?"uint8array":"array";function h(e,t){a.call(this,"FlateWorker/"+e),this._pako=null,this._pakoAction=e,this._pakoOptions=t,this.meta={}}r.magic="\b\0",s.inherits(h,a),h.prototype.processChunk=function(e){this.meta=e.meta,null===this._pako&&this._createPako(),this._pako.push(s.transformTo(o,e.data),!1)},h.prototype.flush=function(){a.prototype.flush.call(this),null===this._pako&&this._createPako(),this._pako.push([],!0)},h.prototype.cleanUp=function(){a.prototype.cleanUp.call(this),this._pako=null},h.prototype._createPako=function(){this._pako=new i[this._pakoAction]({raw:!0,level:this._pakoOptions.level||-1});var t=this;this._pako.onData=function(e){t.push({data:e,meta:t.meta})}},r.compressWorker=function(e){return new h("Deflate",e)},r.uncompressWorker=function(){return new h("Inflate",{})}},{"./stream/GenericWorker":28,"./utils":32,pako:38}],8:[function(e,t,r){"use strict";function A(e,t){var r,n="";for(r=0;r<t;r++)n+=String.fromCharCode(255&e),e>>>=8;return n}function n(e,t,r,n,i,s){var a,o,h=e.file,u=e.compression,l=s!==O.utf8encode,f=I.transformTo("string",s(h.name)),c=I.transformTo("string",O.utf8encode(h.name)),d=h.comment,p=I.transformTo("string",s(d)),m=I.transformTo("string",O.utf8encode(d)),_=c.length!==h.name.length,g=m.length!==d.length,b="",v="",y="",w=h.dir,k=h.date,x={crc32:0,compressedSize:0,uncompressedSize:0};t&&!r||(x.crc32=e.crc32,x.compressedSize=e.compressedSize,x.uncompressedSize=e.uncompressedSize);var S=0;t&&(S|=8),l||!_&&!g||(S|=2048);var z=0,C=0;w&&(z|=16),"UNIX"===i?(C=798,z|=function(e,t){var r=e;return e||(r=t?16893:33204),(65535&r)<<16}(h.unixPermissions,w)):(C=20,z|=function(e){return 63&(e||0)}(h.dosPermissions)),a=k.getUTCHours(),a<<=6,a|=k.getUTCMinutes(),a<<=5,a|=k.getUTCSeconds()/2,o=k.getUTCFullYear()-1980,o<<=4,o|=k.getUTCMonth()+1,o<<=5,o|=k.getUTCDate(),_&&(v=A(1,1)+A(B(f),4)+c,b+="up"+A(v.length,2)+v),g&&(y=A(1,1)+A(B(p),4)+m,b+="uc"+A(y.length,2)+y);var E="";return E+="\n\0",E+=A(S,2),E+=u.magic,E+=A(a,2),E+=A(o,2),E+=A(x.crc32,4),E+=A(x.compressedSize,4),E+=A(x.uncompressedSize,4),E+=A(f.length,2),E+=A(b.length,2),{fileRecord:R.LOCAL_FILE_HEADER+E+f+b,dirRecord:R.CENTRAL_FILE_HEADER+A(C,2)+E+A(p.length,2)+"\0\0\0\0"+A(z,4)+A(n,4)+f+b+p}}var I=e("../utils"),i=e("../stream/GenericWorker"),O=e("../utf8"),B=e("../crc32"),R=e("../signature");function s(e,t,r,n){i.call(this,"ZipFileWorker"),this.bytesWritten=0,this.zipComment=t,this.zipPlatform=r,this.encodeFileName=n,this.streamFiles=e,this.accumulate=!1,this.contentBuffer=[],this.dirRecords=[],this.currentSourceOffset=0,this.entriesCount=0,this.currentFile=null,this._sources=[]}I.inherits(s,i),s.prototype.push=function(e){var t=e.meta.percent||0,r=this.entriesCount,n=this._sources.length;this.accumulate?this.contentBuffer.push(e):(this.bytesWritten+=e.data.length,i.prototype.push.call(this,{data:e.data,meta:{currentFile:this.currentFile,percent:r?(t+100*(r-n-1))/r:100}}))},s.prototype.openedSource=function(e){this.currentSourceOffset=this.bytesWritten,this.currentFile=e.file.name;var t=this.streamFiles&&!e.file.dir;if(t){var r=n(e,t,!1,this.currentSourceOffset,this.zipPlatform,this.encodeFileName);this.push({data:r.fileRecord,meta:{percent:0}})}else this.accumulate=!0},s.prototype.closedSource=function(e){this.accumulate=!1;var t=this.streamFiles&&!e.file.dir,r=n(e,t,!0,this.currentSourceOffset,this.zipPlatform,this.encodeFileName);if(this.dirRecords.push(r.dirRecord),t)this.push({data:function(e){return R.DATA_DESCRIPTOR+A(e.crc32,4)+A(e.compressedSize,4)+A(e.uncompressedSize,4)}(e),meta:{percent:100}});else for(this.push({data:r.fileRecord,meta:{percent:0}});this.contentBuffer.length;)this.push(this.contentBuffer.shift());this.currentFile=null},s.prototype.flush=function(){for(var e=this.bytesWritten,t=0;t<this.dirRecords.length;t++)this.push({data:this.dirRecords[t],meta:{percent:100}});var r=this.bytesWritten-e,n=function(e,t,r,n,i){var s=I.transformTo("string",i(n));return R.CENTRAL_DIRECTORY_END+"\0\0\0\0"+A(e,2)+A(e,2)+A(t,4)+A(r,4)+A(s.length,2)+s}(this.dirRecords.length,r,e,this.zipComment,this.encodeFileName);this.push({data:n,meta:{percent:100}})},s.prototype.prepareNextSource=function(){this.previous=this._sources.shift(),this.openedSource(this.previous.streamInfo),this.isPaused?this.previous.pause():this.previous.resume()},s.prototype.registerPrevious=function(e){this._sources.push(e);var t=this;return e.on("data",function(e){t.processChunk(e)}),e.on("end",function(){t.closedSource(t.previous.streamInfo),t._sources.length?t.prepareNextSource():t.end()}),e.on("error",function(e){t.error(e)}),this},s.prototype.resume=function(){return!!i.prototype.resume.call(this)&&(!this.previous&&this._sources.length?(this.prepareNextSource(),!0):this.previous||this._sources.length||this.generatedError?void 0:(this.end(),!0))},s.prototype.error=function(e){var t=this._sources;if(!i.prototype.error.call(this,e))return!1;for(var r=0;r<t.length;r++)try{t[r].error(e)}catch(e){}return!0},s.prototype.lock=function(){i.prototype.lock.call(this);for(var e=this._sources,t=0;t<e.length;t++)e[t].lock()},t.exports=s},{"../crc32":4,"../signature":23,"../stream/GenericWorker":28,"../utf8":31,"../utils":32}],9:[function(e,t,r){"use strict";var u=e("../compressions"),n=e("./ZipFileWorker");r.generateWorker=function(e,a,t){var o=new n(a.streamFiles,t,a.platform,a.encodeFileName),h=0;try{e.forEach(function(e,t){h++;var r=function(e,t){var r=e||t,n=u[r];if(!n)throw new Error(r+" is not a valid compression method !");return n}(t.options.compression,a.compression),n=t.options.compressionOptions||a.compressionOptions||{},i=t.dir,s=t.date;t._compressWorker(r,n).withStreamInfo("file",{name:e,dir:i,date:s,comment:t.comment||"",unixPermissions:t.unixPermissions,dosPermissions:t.dosPermissions}).pipe(o)}),o.entriesCount=h}catch(e){o.error(e)}return o}},{"../compressions":3,"./ZipFileWorker":8}],10:[function(e,t,r){"use strict";function n(){if(!(this instanceof n))return new n;if(arguments.length)throw new Error("The constructor with parameters has been removed in JSZip 3.0, please check the upgrade guide.");this.files=Object.create(null),this.comment=null,this.root="",this.clone=function(){var e=new n;for(var t in this)"function"!=typeof this[t]&&(e[t]=this[t]);return e}}(n.prototype=e("./object")).loadAsync=e("./load"),n.support=e("./support"),n.defaults=e("./defaults"),n.version="3.10.1",n.loadAsync=function(e,t){return(new n).loadAsync(e,t)},n.external=e("./external"),t.exports=n},{"./defaults":5,"./external":6,"./load":11,"./object":15,"./support":30}],11:[function(e,t,r){"use strict";var u=e("./utils"),i=e("./external"),n=e("./utf8"),s=e("./zipEntries"),a=e("./stream/Crc32Probe"),l=e("./nodejsUtils");function f(n){return new i.Promise(function(e,t){var r=n.decompressed.getContentWorker().pipe(new a);r.on("error",function(e){t(e)}).on("end",function(){r.streamInfo.crc32!==n.decompressed.crc32?t(new Error("Corrupted zip : CRC32 mismatch")):e()}).resume()})}t.exports=function(e,o){var h=this;return o=u.extend(o||{},{base64:!1,checkCRC32:!1,optimizedBinaryString:!1,createFolders:!1,decodeFileName:n.utf8decode}),l.isNode&&l.isStream(e)?i.Promise.reject(new Error("JSZip can't accept a stream when loading a zip file.")):u.prepareContent("the loaded zip file",e,!0,o.optimizedBinaryString,o.base64).then(function(e){var t=new s(o);return t.load(e),t}).then(function(e){var t=[i.Promise.resolve(e)],r=e.files;if(o.checkCRC32)for(var n=0;n<r.length;n++)t.push(f(r[n]));return i.Promise.all(t)}).then(function(e){for(var t=e.shift(),r=t.files,n=0;n<r.length;n++){var i=r[n],s=i.fileNameStr,a=u.resolve(i.fileNameStr);h.file(a,i.decompressed,{binary:!0,optimizedBinaryString:!0,date:i.date,dir:i.dir,comment:i.fileCommentStr.length?i.fileCommentStr:null,unixPermissions:i.unixPermissions,dosPermissions:i.dosPermissions,createFolders:o.createFolders}),i.dir||(h.file(a).unsafeOriginalName=s)}return t.zipComment.length&&(h.comment=t.zipComment),h})}},{"./external":6,"./nodejsUtils":14,"./stream/Crc32Probe":25,"./utf8":31,"./utils":32,"./zipEntries":33}],12:[function(e,t,r){"use strict";var n=e("../utils"),i=e("../stream/GenericWorker");function s(e,t){i.call(this,"Nodejs stream input adapter for "+e),this._upstreamEnded=!1,this._bindStream(t)}n.inherits(s,i),s.prototype._bindStream=function(e){var t=this;(this._stream=e).pause(),e.on("data",function(e){t.push({data:e,meta:{percent:0}})}).on("error",function(e){t.isPaused?this.generatedError=e:t.error(e)}).on("end",function(){t.isPaused?t._upstreamEnded=!0:t.end()})},s.prototype.pause=function(){return!!i.prototype.pause.call(this)&&(this._stream.pause(),!0)},s.prototype.resume=function(){return!!i.prototype.resume.call(this)&&(this._upstreamEnded?this.end():this._stream.resume(),!0)},t.exports=s},{"../stream/GenericWorker":28,"../utils":32}],13:[function(e,t,r){"use strict";var i=e("readable-stream").Readable;function n(e,t,r){i.call(this,t),this._helper=e;var n=this;e.on("data",function(e,t){n.push(e)||n._helper.pause(),r&&r(t)}).on("error",function(e){n.emit("error",e)}).on("end",function(){n.push(null)})}e("../utils").inherits(n,i),n.prototype._read=function(){this._helper.resume()},t.exports=n},{"../utils":32,"readable-stream":16}],14:[function(e,t,r){"use strict";t.exports={isNode:"undefined"!=typeof Buffer,newBufferFrom:function(e,t){if(Buffer.from&&Buffer.from!==Uint8Array.from)return Buffer.from(e,t);if("number"==typeof e)throw new Error('The "data" argument must not be a number');return new Buffer(e,t)},allocBuffer:function(e){if(Buffer.alloc)return Buffer.alloc(e);var t=new Buffer(e);return t.fill(0),t},isBuffer:function(e){return Buffer.isBuffer(e)},isStream:function(e){return e&&"function"==typeof e.on&&"function"==typeof e.pause&&"function"==typeof e.resume}}},{}],15:[function(e,t,r){"use strict";function s(e,t,r){var n,i=u.getTypeOf(t),s=u.extend(r||{},f);s.date=s.date||new Date,null!==s.compression&&(s.compression=s.compression.toUpperCase()),"string"==typeof s.unixPermissions&&(s.unixPermissions=parseInt(s.unixPermissions,8)),s.unixPermissions&&16384&s.unixPermissions&&(s.dir=!0),s.dosPermissions&&16&s.dosPermissions&&(s.dir=!0),s.dir&&(e=g(e)),s.createFolders&&(n=_(e))&&b.call(this,n,!0);var a="string"===i&&!1===s.binary&&!1===s.base64;r&&void 0!==r.binary||(s.binary=!a),(t instanceof c&&0===t.uncompressedSize||s.dir||!t||0===t.length)&&(s.base64=!1,s.binary=!0,t="",s.compression="STORE",i="string");var o=null;o=t instanceof c||t instanceof l?t:p.isNode&&p.isStream(t)?new m(e,t):u.prepareContent(e,t,s.binary,s.optimizedBinaryString,s.base64);var h=new d(e,o,s);this.files[e]=h}var i=e("./utf8"),u=e("./utils"),l=e("./stream/GenericWorker"),a=e("./stream/StreamHelper"),f=e("./defaults"),c=e("./compressedObject"),d=e("./zipObject"),o=e("./generate"),p=e("./nodejsUtils"),m=e("./nodejs/NodejsStreamInputAdapter"),_=function(e){"/"===e.slice(-1)&&(e=e.substring(0,e.length-1));var t=e.lastIndexOf("/");return 0<t?e.substring(0,t):""},g=function(e){return"/"!==e.slice(-1)&&(e+="/"),e},b=function(e,t){return t=void 0!==t?t:f.createFolders,e=g(e),this.files[e]||s.call(this,e,null,{dir:!0,createFolders:t}),this.files[e]};function h(e){return"[object RegExp]"===Object.prototype.toString.call(e)}var n={load:function(){throw new Error("This method has been removed in JSZip 3.0, please check the upgrade guide.")},forEach:function(e){var t,r,n;for(t in this.files)n=this.files[t],(r=t.slice(this.root.length,t.length))&&t.slice(0,this.root.length)===this.root&&e(r,n)},filter:function(r){var n=[];return this.forEach(function(e,t){r(e,t)&&n.push(t)}),n},file:function(e,t,r){if(1!==arguments.length)return e=this.root+e,s.call(this,e,t,r),this;if(h(e)){var n=e;return this.filter(function(e,t){return!t.dir&&n.test(e)})}var i=this.files[this.root+e];return i&&!i.dir?i:null},folder:function(r){if(!r)return this;if(h(r))return this.filter(function(e,t){return t.dir&&r.test(e)});var e=this.root+r,t=b.call(this,e),n=this.clone();return n.root=t.name,n},remove:function(r){r=this.root+r;var e=this.files[r];if(e||("/"!==r.slice(-1)&&(r+="/"),e=this.files[r]),e&&!e.dir)delete this.files[r];else for(var t=this.filter(function(e,t){return t.name.slice(0,r.length)===r}),n=0;n<t.length;n++)delete this.files[t[n].name];return this},generate:function(){throw new Error("This method has been removed in JSZip 3.0, please check the upgrade guide.")},generateInternalStream:function(e){var t,r={};try{if((r=u.extend(e||{},{streamFiles:!1,compression:"STORE",compressionOptions:null,type:"",platform:"DOS",comment:null,mimeType:"application/zip",encodeFileName:i.utf8encode})).type=r.type.toLowerCase(),r.compression=r.compression.toUpperCase(),"binarystring"===r.type&&(r.type="string"),!r.type)throw new Error("No output type specified.");u.checkSupport(r.type),"darwin"!==r.platform&&"freebsd"!==r.platform&&"linux"!==r.platform&&"sunos"!==r.platform||(r.platform="UNIX"),"win32"===r.platform&&(r.platform="DOS");var n=r.comment||this.comment||"";t=o.generateWorker(this,r,n)}catch(e){(t=new l("error")).error(e)}return new a(t,r.type||"string",r.mimeType)},generateAsync:function(e,t){return this.generateInternalStream(e).accumulate(t)},generateNodeStream:function(e,t){return(e=e||{}).type||(e.type="nodebuffer"),this.generateInternalStream(e).toNodejsStream(t)}};t.exports=n},{"./compressedObject":2,"./defaults":5,"./generate":9,"./nodejs/NodejsStreamInputAdapter":12,"./nodejsUtils":14,"./stream/GenericWorker":28,"./stream/StreamHelper":29,"./utf8":31,"./utils":32,"./zipObject":35}],16:[function(e,t,r){"use strict";t.exports=e("stream")},{stream:void 0}],17:[function(e,t,r){"use strict";var n=e("./DataReader");function i(e){n.call(this,e);for(var t=0;t<this.data.length;t++)e[t]=255&e[t]}e("../utils").inherits(i,n),i.prototype.byteAt=function(e){return this.data[this.zero+e]},i.prototype.lastIndexOfSignature=function(e){for(var t=e.charCodeAt(0),r=e.charCodeAt(1),n=e.charCodeAt(2),i=e.charCodeAt(3),s=this.length-4;0<=s;--s)if(this.data[s]===t&&this.data[s+1]===r&&this.data[s+2]===n&&this.data[s+3]===i)return s-this.zero;return-1},i.prototype.readAndCheckSignature=function(e){var t=e.charCodeAt(0),r=e.charCodeAt(1),n=e.charCodeAt(2),i=e.charCodeAt(3),s=this.readData(4);return t===s[0]&&r===s[1]&&n===s[2]&&i===s[3]},i.prototype.readData=function(e){if(this.checkOffset(e),0===e)return[];var t=this.data.slice(this.zero+this.index,this.zero+this.index+e);return this.index+=e,t},t.exports=i},{"../utils":32,"./DataReader":18}],18:[function(e,t,r){"use strict";var n=e("../utils");function i(e){this.data=e,this.length=e.length,this.index=0,this.zero=0}i.prototype={checkOffset:function(e){this.checkIndex(this.index+e)},checkIndex:function(e){if(this.length<this.zero+e||e<0)throw new Error("End of data reached (data length = "+this.length+", asked index = "+e+"). Corrupted zip ?")},setIndex:function(e){this.checkIndex(e),this.index=e},skip:function(e){this.setIndex(this.index+e)},byteAt:function(){},readInt:function(e){var t,r=0;for(this.checkOffset(e),t=this.index+e-1;t>=this.index;t--)r=(r<<8)+this.byteAt(t);return this.index+=e,r},readString:function(e){return n.transformTo("string",this.readData(e))},readData:function(){},lastIndexOfSignature:function(){},readAndCheckSignature:function(){},readDate:function(){var e=this.readInt(4);return new Date(Date.UTC(1980+(e>>25&127),(e>>21&15)-1,e>>16&31,e>>11&31,e>>5&63,(31&e)<<1))}},t.exports=i},{"../utils":32}],19:[function(e,t,r){"use strict";var n=e("./Uint8ArrayReader");function i(e){n.call(this,e)}e("../utils").inherits(i,n),i.prototype.readData=function(e){this.checkOffset(e);var t=this.data.slice(this.zero+this.index,this.zero+this.index+e);return this.index+=e,t},t.exports=i},{"../utils":32,"./Uint8ArrayReader":21}],20:[function(e,t,r){"use strict";var n=e("./DataReader");function i(e){n.call(this,e)}e("../utils").inherits(i,n),i.prototype.byteAt=function(e){return this.data.charCodeAt(this.zero+e)},i.prototype.lastIndexOfSignature=function(e){return this.data.lastIndexOf(e)-this.zero},i.prototype.readAndCheckSignature=function(e){return e===this.readData(4)},i.prototype.readData=function(e){this.checkOffset(e);var t=this.data.slice(this.zero+this.index,this.zero+this.index+e);return this.index+=e,t},t.exports=i},{"../utils":32,"./DataReader":18}],21:[function(e,t,r){"use strict";var n=e("./ArrayReader");function i(e){n.call(this,e)}e("../utils").inherits(i,n),i.prototype.readData=function(e){if(this.checkOffset(e),0===e)return new Uint8Array(0);var t=this.data.subarray(this.zero+this.index,this.zero+this.index+e);return this.index+=e,t},t.exports=i},{"../utils":32,"./ArrayReader":17}],22:[function(e,t,r){"use strict";var n=e("../utils"),i=e("../support"),s=e("./ArrayReader"),a=e("./StringReader"),o=e("./NodeBufferReader"),h=e("./Uint8ArrayReader");t.exports=function(e){var t=n.getTypeOf(e);return n.checkSupport(t),"string"!==t||i.uint8array?"nodebuffer"===t?new o(e):i.uint8array?new h(n.transformTo("uint8array",e)):new s(n.transformTo("array",e)):new a(e)}},{"../support":30,"../utils":32,"./ArrayReader":17,"./NodeBufferReader":19,"./StringReader":20,"./Uint8ArrayReader":21}],23:[function(e,t,r){"use strict";r.LOCAL_FILE_HEADER="PK",r.CENTRAL_FILE_HEADER="PK",r.CENTRAL_DIRECTORY_END="PK",r.ZIP64_CENTRAL_DIRECTORY_LOCATOR="PK",r.ZIP64_CENTRAL_DIRECTORY_END="PK",r.DATA_DESCRIPTOR="PK\b"},{}],24:[function(e,t,r){"use strict";var n=e("./GenericWorker"),i=e("../utils");function s(e){n.call(this,"ConvertWorker to "+e),this.destType=e}i.inherits(s,n),s.prototype.processChunk=function(e){this.push({data:i.transformTo(this.destType,e.data),meta:e.meta})},t.exports=s},{"../utils":32,"./GenericWorker":28}],25:[function(e,t,r){"use strict";var n=e("./GenericWorker"),i=e("../crc32");function s(){n.call(this,"Crc32Probe"),this.withStreamInfo("crc32",0)}e("../utils").inherits(s,n),s.prototype.processChunk=function(e){this.streamInfo.crc32=i(e.data,this.streamInfo.crc32||0),this.push(e)},t.exports=s},{"../crc32":4,"../utils":32,"./GenericWorker":28}],26:[function(e,t,r){"use strict";var n=e("../utils"),i=e("./GenericWorker");function s(e){i.call(this,"DataLengthProbe for "+e),this.propName=e,this.withStreamInfo(e,0)}n.inherits(s,i),s.prototype.processChunk=function(e){if(e){var t=this.streamInfo[this.propName]||0;this.streamInfo[this.propName]=t+e.data.length}i.prototype.processChunk.call(this,e)},t.exports=s},{"../utils":32,"./GenericWorker":28}],27:[function(e,t,r){"use strict";var n=e("../utils"),i=e("./GenericWorker");function s(e){i.call(this,"DataWorker");var t=this;this.dataIsReady=!1,this.index=0,this.max=0,this.data=null,this.type="",this._tickScheduled=!1,e.then(function(e){t.dataIsReady=!0,t.data=e,t.max=e&&e.length||0,t.type=n.getTypeOf(e),t.isPaused||t._tickAndRepeat()},function(e){t.error(e)})}n.inherits(s,i),s.prototype.cleanUp=function(){i.prototype.cleanUp.call(this),this.data=null},s.prototype.resume=function(){return!!i.prototype.resume.call(this)&&(!this._tickScheduled&&this.dataIsReady&&(this._tickScheduled=!0,n.delay(this._tickAndRepeat,[],this)),!0)},s.prototype._tickAndRepeat=function(){this._tickScheduled=!1,this.isPaused||this.isFinished||(this._tick(),this.isFinished||(n.delay(this._tickAndRepeat,[],this),this._tickScheduled=!0))},s.prototype._tick=function(){if(this.isPaused||this.isFinished)return!1;var e=null,t=Math.min(this.max,this.index+16384);if(this.index>=this.max)return this.end();switch(this.type){case"string":e=this.data.substring(this.index,t);break;case"uint8array":e=this.data.subarray(this.index,t);break;case"array":case"nodebuffer":e=this.data.slice(this.index,t)}return this.index=t,this.push({data:e,meta:{percent:this.max?this.index/this.max*100:0}})},t.exports=s},{"../utils":32,"./GenericWorker":28}],28:[function(e,t,r){"use strict";function n(e){this.name=e||"default",this.streamInfo={},this.generatedError=null,this.extraStreamInfo={},this.isPaused=!0,this.isFinished=!1,this.isLocked=!1,this._listeners={data:[],end:[],error:[]},this.previous=null}n.prototype={push:function(e){this.emit("data",e)},end:function(){if(this.isFinished)return!1;this.flush();try{this.emit("end"),this.cleanUp(),this.isFinished=!0}catch(e){this.emit("error",e)}return!0},error:function(e){return!this.isFinished&&(this.isPaused?this.generatedError=e:(this.isFinished=!0,this.emit("error",e),this.previous&&this.previous.error(e),this.cleanUp()),!0)},on:function(e,t){return this._listeners[e].push(t),this},cleanUp:function(){this.streamInfo=this.generatedError=this.extraStreamInfo=null,this._listeners=[]},emit:function(e,t){if(this._listeners[e])for(var r=0;r<this._listeners[e].length;r++)this._listeners[e][r].call(this,t)},pipe:function(e){return e.registerPrevious(this)},registerPrevious:function(e){if(this.isLocked)throw new Error("The stream '"+this+"' has already been used.");this.streamInfo=e.streamInfo,this.mergeStreamInfo(),this.previous=e;var t=this;return e.on("data",function(e){t.processChunk(e)}),e.on("end",function(){t.end()}),e.on("error",function(e){t.error(e)}),this},pause:function(){return!this.isPaused&&!this.isFinished&&(this.isPaused=!0,this.previous&&this.previous.pause(),!0)},resume:function(){if(!this.isPaused||this.isFinished)return!1;var e=this.isPaused=!1;return this.generatedError&&(this.error(this.generatedError),e=!0),this.previous&&this.previous.resume(),!e},flush:function(){},processChunk:function(e){this.push(e)},withStreamInfo:function(e,t){return this.extraStreamInfo[e]=t,this.mergeStreamInfo(),this},mergeStreamInfo:function(){for(var e in this.extraStreamInfo)Object.prototype.hasOwnProperty.call(this.extraStreamInfo,e)&&(this.streamInfo[e]=this.extraStreamInfo[e])},lock:function(){if(this.isLocked)throw new Error("The stream '"+this+"' has already been used.");this.isLocked=!0,this.previous&&this.previous.lock()},toString:function(){var e="Worker "+this.name;return this.previous?this.previous+" -> "+e:e}},t.exports=n},{}],29:[function(e,t,r){"use strict";var h=e("../utils"),i=e("./ConvertWorker"),s=e("./GenericWorker"),u=e("../base64"),n=e("../support"),a=e("../external"),o=null;if(n.nodestream)try{o=e("../nodejs/NodejsStreamOutputAdapter")}catch(e){}function l(e,o){return new a.Promise(function(t,r){var n=[],i=e._internalType,s=e._outputType,a=e._mimeType;e.on("data",function(e,t){n.push(e),o&&o(t)}).on("error",function(e){n=[],r(e)}).on("end",function(){try{var e=function(e,t,r){switch(e){case"blob":return h.newBlob(h.transformTo("arraybuffer",t),r);case"base64":return u.encode(t);default:return h.transformTo(e,t)}}(s,function(e,t){var r,n=0,i=null,s=0;for(r=0;r<t.length;r++)s+=t[r].length;switch(e){case"string":return t.join("");case"array":return Array.prototype.concat.apply([],t);case"uint8array":for(i=new Uint8Array(s),r=0;r<t.length;r++)i.set(t[r],n),n+=t[r].length;return i;case"nodebuffer":return Buffer.concat(t);default:throw new Error("concat : unsupported type '"+e+"'")}}(i,n),a);t(e)}catch(e){r(e)}n=[]}).resume()})}function f(e,t,r){var n=t;switch(t){case"blob":case"arraybuffer":n="uint8array";break;case"base64":n="string"}try{this._internalType=n,this._outputType=t,this._mimeType=r,h.checkSupport(n),this._worker=e.pipe(new i(n)),e.lock()}catch(e){this._worker=new s("error"),this._worker.error(e)}}f.prototype={accumulate:function(e){return l(this,e)},on:function(e,t){var r=this;return"data"===e?this._worker.on(e,function(e){t.call(r,e.data,e.meta)}):this._worker.on(e,function(){h.delay(t,arguments,r)}),this},resume:function(){return h.delay(this._worker.resume,[],this._worker),this},pause:function(){return this._worker.pause(),this},toNodejsStream:function(e){if(h.checkSupport("nodestream"),"nodebuffer"!==this._outputType)throw new Error(this._outputType+" is not supported by this method");return new o(this,{objectMode:"nodebuffer"!==this._outputType},e)}},t.exports=f},{"../base64":1,"../external":6,"../nodejs/NodejsStreamOutputAdapter":13,"../support":30,"../utils":32,"./ConvertWorker":24,"./GenericWorker":28}],30:[function(e,t,r){"use strict";if(r.base64=!0,r.array=!0,r.string=!0,r.arraybuffer="undefined"!=typeof ArrayBuffer&&"undefined"!=typeof Uint8Array,r.nodebuffer="undefined"!=typeof Buffer,r.uint8array="undefined"!=typeof Uint8Array,"undefined"==typeof ArrayBuffer)r.blob=!1;else{var n=new ArrayBuffer(0);try{r.blob=0===new Blob([n],{type:"application/zip"}).size}catch(e){try{var i=new(self.BlobBuilder||self.WebKitBlobBuilder||self.MozBlobBuilder||self.MSBlobBuilder);i.append(n),r.blob=0===i.getBlob("application/zip").size}catch(e){r.blob=!1}}}try{r.nodestream=!!e("readable-stream").Readable}catch(e){r.nodestream=!1}},{"readable-stream":16}],31:[function(e,t,s){"use strict";for(var o=e("./utils"),h=e("./support"),r=e("./nodejsUtils"),n=e("./stream/GenericWorker"),u=new Array(256),i=0;i<256;i++)u[i]=252<=i?6:248<=i?5:240<=i?4:224<=i?3:192<=i?2:1;u[254]=u[254]=1;function a(){n.call(this,"utf-8 decode"),this.leftOver=null}function l(){n.call(this,"utf-8 encode")}s.utf8encode=function(e){return h.nodebuffer?r.newBufferFrom(e,"utf-8"):function(e){var t,r,n,i,s,a=e.length,o=0;for(i=0;i<a;i++)55296==(64512&(r=e.charCodeAt(i)))&&i+1<a&&56320==(64512&(n=e.charCodeAt(i+1)))&&(r=65536+(r-55296<<10)+(n-56320),i++),o+=r<128?1:r<2048?2:r<65536?3:4;for(t=h.uint8array?new Uint8Array(o):new Array(o),i=s=0;s<o;i++)55296==(64512&(r=e.charCodeAt(i)))&&i+1<a&&56320==(64512&(n=e.charCodeAt(i+1)))&&(r=65536+(r-55296<<10)+(n-56320),i++),r<128?t[s++]=r:(r<2048?t[s++]=192|r>>>6:(r<65536?t[s++]=224|r>>>12:(t[s++]=240|r>>>18,t[s++]=128|r>>>12&63),t[s++]=128|r>>>6&63),t[s++]=128|63&r);return t}(e)},s.utf8decode=function(e){return h.nodebuffer?o.transformTo("nodebuffer",e).toString("utf-8"):function(e){var t,r,n,i,s=e.length,a=new Array(2*s);for(t=r=0;t<s;)if((n=e[t++])<128)a[r++]=n;else if(4<(i=u[n]))a[r++]=65533,t+=i-1;else{for(n&=2===i?31:3===i?15:7;1<i&&t<s;)n=n<<6|63&e[t++],i--;1<i?a[r++]=65533:n<65536?a[r++]=n:(n-=65536,a[r++]=55296|n>>10&1023,a[r++]=56320|1023&n)}return a.length!==r&&(a.subarray?a=a.subarray(0,r):a.length=r),o.applyFromCharCode(a)}(e=o.transformTo(h.uint8array?"uint8array":"array",e))},o.inherits(a,n),a.prototype.processChunk=function(e){var t=o.transformTo(h.uint8array?"uint8array":"array",e.data);if(this.leftOver&&this.leftOver.length){if(h.uint8array){var r=t;(t=new Uint8Array(r.length+this.leftOver.length)).set(this.leftOver,0),t.set(r,this.leftOver.length)}else t=this.leftOver.concat(t);this.leftOver=null}var n=function(e,t){var r;for((t=t||e.length)>e.length&&(t=e.length),r=t-1;0<=r&&128==(192&e[r]);)r--;return r<0?t:0===r?t:r+u[e[r]]>t?r:t}(t),i=t;n!==t.length&&(h.uint8array?(i=t.subarray(0,n),this.leftOver=t.subarray(n,t.length)):(i=t.slice(0,n),this.leftOver=t.slice(n,t.length))),this.push({data:s.utf8decode(i),meta:e.meta})},a.prototype.flush=function(){this.leftOver&&this.leftOver.length&&(this.push({data:s.utf8decode(this.leftOver),meta:{}}),this.leftOver=null)},s.Utf8DecodeWorker=a,o.inherits(l,n),l.prototype.processChunk=function(e){this.push({data:s.utf8encode(e.data),meta:e.meta})},s.Utf8EncodeWorker=l},{"./nodejsUtils":14,"./stream/GenericWorker":28,"./support":30,"./utils":32}],32:[function(e,t,a){"use strict";var o=e("./support"),h=e("./base64"),r=e("./nodejsUtils"),u=e("./external");function n(e){return e}function l(e,t){for(var r=0;r<e.length;++r)t[r]=255&e.charCodeAt(r);return t}e("setimmediate"),a.newBlob=function(t,r){a.checkSupport("blob");try{return new Blob([t],{type:r})}catch(e){try{var n=new(self.BlobBuilder||self.WebKitBlobBuilder||self.MozBlobBuilder||self.MSBlobBuilder);return n.append(t),n.getBlob(r)}catch(e){throw new Error("Bug : can't construct the Blob.")}}};var i={stringifyByChunk:function(e,t,r){var n=[],i=0,s=e.length;if(s<=r)return String.fromCharCode.apply(null,e);for(;i<s;)"array"===t||"nodebuffer"===t?n.push(String.fromCharCode.apply(null,e.slice(i,Math.min(i+r,s)))):n.push(String.fromCharCode.apply(null,e.subarray(i,Math.min(i+r,s)))),i+=r;return n.join("")},stringifyByChar:function(e){for(var t="",r=0;r<e.length;r++)t+=String.fromCharCode(e[r]);return t},applyCanBeUsed:{uint8array:function(){try{return o.uint8array&&1===String.fromCharCode.apply(null,new Uint8Array(1)).length}catch(e){return!1}}(),nodebuffer:function(){try{return o.nodebuffer&&1===String.fromCharCode.apply(null,r.allocBuffer(1)).length}catch(e){return!1}}()}};function s(e){var t=65536,r=a.getTypeOf(e),n=!0;if("uint8array"===r?n=i.applyCanBeUsed.uint8array:"nodebuffer"===r&&(n=i.applyCanBeUsed.nodebuffer),n)for(;1<t;)try{return i.stringifyByChunk(e,r,t)}catch(e){t=Math.floor(t/2)}return i.stringifyByChar(e)}function f(e,t){for(var r=0;r<e.length;r++)t[r]=e[r];return t}a.applyFromCharCode=s;var c={};c.string={string:n,array:function(e){return l(e,new Array(e.length))},arraybuffer:function(e){return c.string.uint8array(e).buffer},uint8array:function(e){return l(e,new Uint8Array(e.length))},nodebuffer:function(e){return l(e,r.allocBuffer(e.length))}},c.array={string:s,array:n,arraybuffer:function(e){return new Uint8Array(e).buffer},uint8array:function(e){return new Uint8Array(e)},nodebuffer:function(e){return r.newBufferFrom(e)}},c.arraybuffer={string:function(e){return s(new Uint8Array(e))},array:function(e){return f(new Uint8Array(e),new Array(e.byteLength))},arraybuffer:n,uint8array:function(e){return new Uint8Array(e)},nodebuffer:function(e){return r.newBufferFrom(new Uint8Array(e))}},c.uint8array={string:s,array:function(e){return f(e,new Array(e.length))},arraybuffer:function(e){return e.buffer},uint8array:n,nodebuffer:function(e){return r.newBufferFrom(e)}},c.nodebuffer={string:s,array:function(e){return f(e,new Array(e.length))},arraybuffer:function(e){return c.nodebuffer.uint8array(e).buffer},uint8array:function(e){return f(e,new Uint8Array(e.length))},nodebuffer:n},a.transformTo=function(e,t){if(t=t||"",!e)return t;a.checkSupport(e);var r=a.getTypeOf(t);return c[r][e](t)},a.resolve=function(e){for(var t=e.split("/"),r=[],n=0;n<t.length;n++){var i=t[n];"."===i||""===i&&0!==n&&n!==t.length-1||(".."===i?r.pop():r.push(i))}return r.join("/")},a.getTypeOf=function(e){return"string"==typeof e?"string":"[object Array]"===Object.prototype.toString.call(e)?"array":o.nodebuffer&&r.isBuffer(e)?"nodebuffer":o.uint8array&&e instanceof Uint8Array?"uint8array":o.arraybuffer&&e instanceof ArrayBuffer?"arraybuffer":void 0},a.checkSupport=function(e){if(!o[e.toLowerCase()])throw new Error(e+" is not supported by this platform")},a.MAX_VALUE_16BITS=65535,a.MAX_VALUE_32BITS=-1,a.pretty=function(e){var t,r,n="";for(r=0;r<(e||"").length;r++)n+="\\x"+((t=e.charCodeAt(r))<16?"0":"")+t.toString(16).toUpperCase();return n},a.delay=function(e,t,r){setImmediate(function(){e.apply(r||null,t||[])})},a.inherits=function(e,t){function r(){}r.prototype=t.prototype,e.prototype=new r},a.extend=function(){var e,t,r={};for(e=0;e<arguments.length;e++)for(t in arguments[e])Object.prototype.hasOwnProperty.call(arguments[e],t)&&void 0===r[t]&&(r[t]=arguments[e][t]);return r},a.prepareContent=function(r,e,n,i,s){return u.Promise.resolve(e).then(function(n){return o.blob&&(n instanceof Blob||-1!==["[object File]","[object Blob]"].indexOf(Object.prototype.toString.call(n)))&&"undefined"!=typeof FileReader?new u.Promise(function(t,r){var e=new FileReader;e.onload=function(e){t(e.target.result)},e.onerror=function(e){r(e.target.error)},e.readAsArrayBuffer(n)}):n}).then(function(e){var t=a.getTypeOf(e);return t?("arraybuffer"===t?e=a.transformTo("uint8array",e):"string"===t&&(s?e=h.decode(e):n&&!0!==i&&(e=function(e){return l(e,o.uint8array?new Uint8Array(e.length):new Array(e.length))}(e))),e):u.Promise.reject(new Error("Can't read the data of '"+r+"'. Is it in a supported JavaScript type (String, Blob, ArrayBuffer, etc) ?"))})}},{"./base64":1,"./external":6,"./nodejsUtils":14,"./support":30,setimmediate:54}],33:[function(e,t,r){"use strict";var n=e("./reader/readerFor"),i=e("./utils"),s=e("./signature"),a=e("./zipEntry"),o=e("./support");function h(e){this.files=[],this.loadOptions=e}h.prototype={checkSignature:function(e){if(!this.reader.readAndCheckSignature(e)){this.reader.index-=4;var t=this.reader.readString(4);throw new Error("Corrupted zip or bug: unexpected signature ("+i.pretty(t)+", expected "+i.pretty(e)+")")}},isSignature:function(e,t){var r=this.reader.index;this.reader.setIndex(e);var n=this.reader.readString(4)===t;return this.reader.setIndex(r),n},readBlockEndOfCentral:function(){this.diskNumber=this.reader.readInt(2),this.diskWithCentralDirStart=this.reader.readInt(2),this.centralDirRecordsOnThisDisk=this.reader.readInt(2),this.centralDirRecords=this.reader.readInt(2),this.centralDirSize=this.reader.readInt(4),this.centralDirOffset=this.reader.readInt(4),this.zipCommentLength=this.reader.readInt(2);var e=this.reader.readData(this.zipCommentLength),t=o.uint8array?"uint8array":"array",r=i.transformTo(t,e);this.zipComment=this.loadOptions.decodeFileName(r)},readBlockZip64EndOfCentral:function(){this.zip64EndOfCentralSize=this.reader.readInt(8),this.reader.skip(4),this.diskNumber=this.reader.readInt(4),this.diskWithCentralDirStart=this.reader.readInt(4),this.centralDirRecordsOnThisDisk=this.reader.readInt(8),this.centralDirRecords=this.reader.readInt(8),this.centralDirSize=this.reader.readInt(8),this.centralDirOffset=this.reader.readInt(8),this.zip64ExtensibleData={};for(var e,t,r,n=this.zip64EndOfCentralSize-44;0<n;)e=this.reader.readInt(2),t=this.reader.readInt(4),r=this.reader.readData(t),this.zip64ExtensibleData[e]={id:e,length:t,value:r}},readBlockZip64EndOfCentralLocator:function(){if(this.diskWithZip64CentralDirStart=this.reader.readInt(4),this.relativeOffsetEndOfZip64CentralDir=this.reader.readInt(8),this.disksCount=this.reader.readInt(4),1<this.disksCount)throw new Error("Multi-volumes zip are not supported")},readLocalFiles:function(){var e,t;for(e=0;e<this.files.length;e++)t=this.files[e],this.reader.setIndex(t.localHeaderOffset),this.checkSignature(s.LOCAL_FILE_HEADER),t.readLocalPart(this.reader),t.handleUTF8(),t.processAttributes()},readCentralDir:function(){var e;for(this.reader.setIndex(this.centralDirOffset);this.reader.readAndCheckSignature(s.CENTRAL_FILE_HEADER);)(e=new a({zip64:this.zip64},this.loadOptions)).readCentralPart(this.reader),this.files.push(e);if(this.centralDirRecords!==this.files.length&&0!==this.centralDirRecords&&0===this.files.length)throw new Error("Corrupted zip or bug: expected "+this.centralDirRecords+" records in central dir, got "+this.files.length)},readEndOfCentral:function(){var e=this.reader.lastIndexOfSignature(s.CENTRAL_DIRECTORY_END);if(e<0)throw!this.isSignature(0,s.LOCAL_FILE_HEADER)?new Error("Can't find end of central directory : is this a zip file ? If it is, see https://stuk.github.io/jszip/documentation/howto/read_zip.html"):new Error("Corrupted zip: can't find end of central directory");this.reader.setIndex(e);var t=e;if(this.checkSignature(s.CENTRAL_DIRECTORY_END),this.readBlockEndOfCentral(),this.diskNumber===i.MAX_VALUE_16BITS||this.diskWithCentralDirStart===i.MAX_VALUE_16BITS||this.centralDirRecordsOnThisDisk===i.MAX_VALUE_16BITS||this.centralDirRecords===i.MAX_VALUE_16BITS||this.centralDirSize===i.MAX_VALUE_32BITS||this.centralDirOffset===i.MAX_VALUE_32BITS){if(this.zip64=!0,(e=this.reader.lastIndexOfSignature(s.ZIP64_CENTRAL_DIRECTORY_LOCATOR))<0)throw new Error("Corrupted zip: can't find the ZIP64 end of central directory locator");if(this.reader.setIndex(e),this.checkSignature(s.ZIP64_CENTRAL_DIRECTORY_LOCATOR),this.readBlockZip64EndOfCentralLocator(),!this.isSignature(this.relativeOffsetEndOfZip64CentralDir,s.ZIP64_CENTRAL_DIRECTORY_END)&&(this.relativeOffsetEndOfZip64CentralDir=this.reader.lastIndexOfSignature(s.ZIP64_CENTRAL_DIRECTORY_END),this.relativeOffsetEndOfZip64CentralDir<0))throw new Error("Corrupted zip: can't find the ZIP64 end of central directory");this.reader.setIndex(this.relativeOffsetEndOfZip64CentralDir),this.checkSignature(s.ZIP64_CENTRAL_DIRECTORY_END),this.readBlockZip64EndOfCentral()}var r=this.centralDirOffset+this.centralDirSize;this.zip64&&(r+=20,r+=12+this.zip64EndOfCentralSize);var n=t-r;if(0<n)this.isSignature(t,s.CENTRAL_FILE_HEADER)||(this.reader.zero=n);else if(n<0)throw new Error("Corrupted zip: missing "+Math.abs(n)+" bytes.")},prepareReader:function(e){this.reader=n(e)},load:function(e){this.prepareReader(e),this.readEndOfCentral(),this.readCentralDir(),this.readLocalFiles()}},t.exports=h},{"./reader/readerFor":22,"./signature":23,"./support":30,"./utils":32,"./zipEntry":34}],34:[function(e,t,r){"use strict";var n=e("./reader/readerFor"),s=e("./utils"),i=e("./compressedObject"),a=e("./crc32"),o=e("./utf8"),h=e("./compressions"),u=e("./support");function l(e,t){this.options=e,this.loadOptions=t}l.prototype={isEncrypted:function(){return 1==(1&this.bitFlag)},useUTF8:function(){return 2048==(2048&this.bitFlag)},readLocalPart:function(e){var t,r;if(e.skip(22),this.fileNameLength=e.readInt(2),r=e.readInt(2),this.fileName=e.readData(this.fileNameLength),e.skip(r),-1===this.compressedSize||-1===this.uncompressedSize)throw new Error("Bug or corrupted zip : didn't get enough information from the central directory (compressedSize === -1 || uncompressedSize === -1)");if(null===(t=function(e){for(var t in h)if(Object.prototype.hasOwnProperty.call(h,t)&&h[t].magic===e)return h[t];return null}(this.compressionMethod)))throw new Error("Corrupted zip : compression "+s.pretty(this.compressionMethod)+" unknown (inner file : "+s.transformTo("string",this.fileName)+")");this.decompressed=new i(this.compressedSize,this.uncompressedSize,this.crc32,t,e.readData(this.compressedSize))},readCentralPart:function(e){this.versionMadeBy=e.readInt(2),e.skip(2),this.bitFlag=e.readInt(2),this.compressionMethod=e.readString(2),this.date=e.readDate(),this.crc32=e.readInt(4),this.compressedSize=e.readInt(4),this.uncompressedSize=e.readInt(4);var t=e.readInt(2);if(this.extraFieldsLength=e.readInt(2),this.fileCommentLength=e.readInt(2),this.diskNumberStart=e.readInt(2),this.internalFileAttributes=e.readInt(2),this.externalFileAttributes=e.readInt(4),this.localHeaderOffset=e.readInt(4),this.isEncrypted())throw new Error("Encrypted zip are not supported");e.skip(t),this.readExtraFields(e),this.parseZIP64ExtraField(e),this.fileComment=e.readData(this.fileCommentLength)},processAttributes:function(){this.unixPermissions=null,this.dosPermissions=null;var e=this.versionMadeBy>>8;this.dir=!!(16&this.externalFileAttributes),0==e&&(this.dosPermissions=63&this.externalFileAttributes),3==e&&(this.unixPermissions=this.externalFileAttributes>>16&65535),this.dir||"/"!==this.fileNameStr.slice(-1)||(this.dir=!0)},parseZIP64ExtraField:function(){if(this.extraFields[1]){var e=n(this.extraFields[1].value);this.uncompressedSize===s.MAX_VALUE_32BITS&&(this.uncompressedSize=e.readInt(8)),this.compressedSize===s.MAX_VALUE_32BITS&&(this.compressedSize=e.readInt(8)),this.localHeaderOffset===s.MAX_VALUE_32BITS&&(this.localHeaderOffset=e.readInt(8)),this.diskNumberStart===s.MAX_VALUE_32BITS&&(this.diskNumberStart=e.readInt(4))}},readExtraFields:function(e){var t,r,n,i=e.index+this.extraFieldsLength;for(this.extraFields||(this.extraFields={});e.index+4<i;)t=e.readInt(2),r=e.readInt(2),n=e.readData(r),this.extraFields[t]={id:t,length:r,value:n};e.setIndex(i)},handleUTF8:function(){var e=u.uint8array?"uint8array":"array";if(this.useUTF8())this.fileNameStr=o.utf8decode(this.fileName),this.fileCommentStr=o.utf8decode(this.fileComment);else{var t=this.findExtraFieldUnicodePath();if(null!==t)this.fileNameStr=t;else{var r=s.transformTo(e,this.fileName);this.fileNameStr=this.loadOptions.decodeFileName(r)}var n=this.findExtraFieldUnicodeComment();if(null!==n)this.fileCommentStr=n;else{var i=s.transformTo(e,this.fileComment);this.fileCommentStr=this.loadOptions.decodeFileName(i)}}},findExtraFieldUnicodePath:function(){var e=this.extraFields[28789];if(e){var t=n(e.value);return 1!==t.readInt(1)?null:a(this.fileName)!==t.readInt(4)?null:o.utf8decode(t.readData(e.length-5))}return null},findExtraFieldUnicodeComment:function(){var e=this.extraFields[25461];if(e){var t=n(e.value);return 1!==t.readInt(1)?null:a(this.fileComment)!==t.readInt(4)?null:o.utf8decode(t.readData(e.length-5))}return null}},t.exports=l},{"./compressedObject":2,"./compressions":3,"./crc32":4,"./reader/readerFor":22,"./support":30,"./utf8":31,"./utils":32}],35:[function(e,t,r){"use strict";function n(e,t,r){this.name=e,this.dir=r.dir,this.date=r.date,this.comment=r.comment,this.unixPermissions=r.unixPermissions,this.dosPermissions=r.dosPermissions,this._data=t,this._dataBinary=r.binary,this.options={compression:r.compression,compressionOptions:r.compressionOptions}}var s=e("./stream/StreamHelper"),i=e("./stream/DataWorker"),a=e("./utf8"),o=e("./compressedObject"),h=e("./stream/GenericWorker");n.prototype={internalStream:function(e){var t=null,r="string";try{if(!e)throw new Error("No output type specified.");var n="string"===(r=e.toLowerCase())||"text"===r;"binarystring"!==r&&"text"!==r||(r="string"),t=this._decompressWorker();var i=!this._dataBinary;i&&!n&&(t=t.pipe(new a.Utf8EncodeWorker)),!i&&n&&(t=t.pipe(new a.Utf8DecodeWorker))}catch(e){(t=new h("error")).error(e)}return new s(t,r,"")},async:function(e,t){return this.internalStream(e).accumulate(t)},nodeStream:function(e,t){return this.internalStream(e||"nodebuffer").toNodejsStream(t)},_compressWorker:function(e,t){if(this._data instanceof o&&this._data.compression.magic===e.magic)return this._data.getCompressedWorker();var r=this._decompressWorker();return this._dataBinary||(r=r.pipe(new a.Utf8EncodeWorker)),o.createWorkerFrom(r,e,t)},_decompressWorker:function(){return this._data instanceof o?this._data.getContentWorker():this._data instanceof h?this._data:new i(this._data)}};for(var u=["asText","asBinary","asNodeBuffer","asUint8Array","asArrayBuffer"],l=function(){throw new Error("This method has been removed in JSZip 3.0, please check the upgrade guide.")},f=0;f<u.length;f++)n.prototype[u[f]]=l;t.exports=n},{"./compressedObject":2,"./stream/DataWorker":27,"./stream/GenericWorker":28,"./stream/StreamHelper":29,"./utf8":31}],36:[function(e,l,t){(function(t){"use strict";var r,n,e=t.MutationObserver||t.WebKitMutationObserver;if(e){var i=0,s=new e(u),a=t.document.createTextNode("");s.observe(a,{characterData:!0}),r=function(){a.data=i=++i%2}}else if(t.setImmediate||void 0===t.MessageChannel)r="document"in t&&"onreadystatechange"in t.document.createElement("script")?function(){var e=t.document.createElement("script");e.onreadystatechange=function(){u(),e.onreadystatechange=null,e.parentNode.removeChild(e),e=null},t.document.documentElement.appendChild(e)}:function(){setTimeout(u,0)};else{var o=new t.MessageChannel;o.port1.onmessage=u,r=function(){o.port2.postMessage(0)}}var h=[];function u(){var e,t;n=!0;for(var r=h.length;r;){for(t=h,h=[],e=-1;++e<r;)t[e]();r=h.length}n=!1}l.exports=function(e){1!==h.push(e)||n||r()}}).call(this,"undefined"!=typeof global?global:"undefined"!=typeof self?self:"undefined"!=typeof window?window:{})},{}],37:[function(e,t,r){"use strict";var i=e("immediate");function u(){}var l={},s=["REJECTED"],a=["FULFILLED"],n=["PENDING"];function o(e){if("function"!=typeof e)throw new TypeError("resolver must be a function");this.state=n,this.queue=[],this.outcome=void 0,e!==u&&d(this,e)}function h(e,t,r){this.promise=e,"function"==typeof t&&(this.onFulfilled=t,this.callFulfilled=this.otherCallFulfilled),"function"==typeof r&&(this.onRejected=r,this.callRejected=this.otherCallRejected)}function f(t,r,n){i(function(){var e;try{e=r(n)}catch(e){return l.reject(t,e)}e===t?l.reject(t,new TypeError("Cannot resolve promise with itself")):l.resolve(t,e)})}function c(e){var t=e&&e.then;if(e&&("object"==typeof e||"function"==typeof e)&&"function"==typeof t)return function(){t.apply(e,arguments)}}function d(t,e){var r=!1;function n(e){r||(r=!0,l.reject(t,e))}function i(e){r||(r=!0,l.resolve(t,e))}var s=p(function(){e(i,n)});"error"===s.status&&n(s.value)}function p(e,t){var r={};try{r.value=e(t),r.status="success"}catch(e){r.status="error",r.value=e}return r}(t.exports=o).prototype.finally=function(t){if("function"!=typeof t)return this;var r=this.constructor;return this.then(function(e){return r.resolve(t()).then(function(){return e})},function(e){return r.resolve(t()).then(function(){throw e})})},o.prototype.catch=function(e){return this.then(null,e)},o.prototype.then=function(e,t){if("function"!=typeof e&&this.state===a||"function"!=typeof t&&this.state===s)return this;var r=new this.constructor(u);this.state!==n?f(r,this.state===a?e:t,this.outcome):this.queue.push(new h(r,e,t));return r},h.prototype.callFulfilled=function(e){l.resolve(this.promise,e)},h.prototype.otherCallFulfilled=function(e){f(this.promise,this.onFulfilled,e)},h.prototype.callRejected=function(e){l.reject(this.promise,e)},h.prototype.otherCallRejected=function(e){f(this.promise,this.onRejected,e)},l.resolve=function(e,t){var r=p(c,t);if("error"===r.status)return l.reject(e,r.value);var n=r.value;if(n)d(e,n);else{e.state=a,e.outcome=t;for(var i=-1,s=e.queue.length;++i<s;)e.queue[i].callFulfilled(t)}return e},l.reject=function(e,t){e.state=s,e.outcome=t;for(var r=-1,n=e.queue.length;++r<n;)e.queue[r].callRejected(t);return e},o.resolve=function(e){if(e instanceof this)return e;return l.resolve(new this(u),e)},o.reject=function(e){var t=new this(u);return l.reject(t,e)},o.all=function(e){var r=this;if("[object Array]"!==Object.prototype.toString.call(e))return this.reject(new TypeError("must be an array"));var n=e.length,i=!1;if(!n)return this.resolve([]);var s=new Array(n),a=0,t=-1,o=new this(u);for(;++t<n;)h(e[t],t);return o;function h(e,t){r.resolve(e).then(function(e){s[t]=e,++a!==n||i||(i=!0,l.resolve(o,s))},function(e){i||(i=!0,l.reject(o,e))})}},o.race=function(e){var t=this;if("[object Array]"!==Object.prototype.toString.call(e))return this.reject(new TypeError("must be an array"));var r=e.length,n=!1;if(!r)return this.resolve([]);var i=-1,s=new this(u);for(;++i<r;)a=e[i],t.resolve(a).then(function(e){n||(n=!0,l.resolve(s,e))},function(e){n||(n=!0,l.reject(s,e))});var a;return s}},{immediate:36}],38:[function(e,t,r){"use strict";var n={};(0,e("./lib/utils/common").assign)(n,e("./lib/deflate"),e("./lib/inflate"),e("./lib/zlib/constants")),t.exports=n},{"./lib/deflate":39,"./lib/inflate":40,"./lib/utils/common":41,"./lib/zlib/constants":44}],39:[function(e,t,r){"use strict";var a=e("./zlib/deflate"),o=e("./utils/common"),h=e("./utils/strings"),i=e("./zlib/messages"),s=e("./zlib/zstream"),u=Object.prototype.toString,l=0,f=-1,c=0,d=8;function p(e){if(!(this instanceof p))return new p(e);this.options=o.assign({level:f,method:d,chunkSize:16384,windowBits:15,memLevel:8,strategy:c,to:""},e||{});var t=this.options;t.raw&&0<t.windowBits?t.windowBits=-t.windowBits:t.gzip&&0<t.windowBits&&t.windowBits<16&&(t.windowBits+=16),this.err=0,this.msg="",this.ended=!1,this.chunks=[],this.strm=new s,this.strm.avail_out=0;var r=a.deflateInit2(this.strm,t.level,t.method,t.windowBits,t.memLevel,t.strategy);if(r!==l)throw new Error(i[r]);if(t.header&&a.deflateSetHeader(this.strm,t.header),t.dictionary){var n;if(n="string"==typeof t.dictionary?h.string2buf(t.dictionary):"[object ArrayBuffer]"===u.call(t.dictionary)?new Uint8Array(t.dictionary):t.dictionary,(r=a.deflateSetDictionary(this.strm,n))!==l)throw new Error(i[r]);this._dict_set=!0}}function n(e,t){var r=new p(t);if(r.push(e,!0),r.err)throw r.msg||i[r.err];return r.result}p.prototype.push=function(e,t){var r,n,i=this.strm,s=this.options.chunkSize;if(this.ended)return!1;n=t===~~t?t:!0===t?4:0,"string"==typeof e?i.input=h.string2buf(e):"[object ArrayBuffer]"===u.call(e)?i.input=new Uint8Array(e):i.input=e,i.next_in=0,i.avail_in=i.input.length;do{if(0===i.avail_out&&(i.output=new o.Buf8(s),i.next_out=0,i.avail_out=s),1!==(r=a.deflate(i,n))&&r!==l)return this.onEnd(r),!(this.ended=!0);0!==i.avail_out&&(0!==i.avail_in||4!==n&&2!==n)||("string"===this.options.to?this.onData(h.buf2binstring(o.shrinkBuf(i.output,i.next_out))):this.onData(o.shrinkBuf(i.output,i.next_out)))}while((0<i.avail_in||0===i.avail_out)&&1!==r);return 4===n?(r=a.deflateEnd(this.strm),this.onEnd(r),this.ended=!0,r===l):2!==n||(this.onEnd(l),!(i.avail_out=0))},p.prototype.onData=function(e){this.chunks.push(e)},p.prototype.onEnd=function(e){e===l&&("string"===this.options.to?this.result=this.chunks.join(""):this.result=o.flattenChunks(this.chunks)),this.chunks=[],this.err=e,this.msg=this.strm.msg},r.Deflate=p,r.deflate=n,r.deflateRaw=function(e,t){return(t=t||{}).raw=!0,n(e,t)},r.gzip=function(e,t){return(t=t||{}).gzip=!0,n(e,t)}},{"./utils/common":41,"./utils/strings":42,"./zlib/deflate":46,"./zlib/messages":51,"./zlib/zstream":53}],40:[function(e,t,r){"use strict";var c=e("./zlib/inflate"),d=e("./utils/common"),p=e("./utils/strings"),m=e("./zlib/constants"),n=e("./zlib/messages"),i=e("./zlib/zstream"),s=e("./zlib/gzheader"),_=Object.prototype.toString;function a(e){if(!(this instanceof a))return new a(e);this.options=d.assign({chunkSize:16384,windowBits:0,to:""},e||{});var t=this.options;t.raw&&0<=t.windowBits&&t.windowBits<16&&(t.windowBits=-t.windowBits,0===t.windowBits&&(t.windowBits=-15)),!(0<=t.windowBits&&t.windowBits<16)||e&&e.windowBits||(t.windowBits+=32),15<t.windowBits&&t.windowBits<48&&0==(15&t.windowBits)&&(t.windowBits|=15),this.err=0,this.msg="",this.ended=!1,this.chunks=[],this.strm=new i,this.strm.avail_out=0;var r=c.inflateInit2(this.strm,t.windowBits);if(r!==m.Z_OK)throw new Error(n[r]);this.header=new s,c.inflateGetHeader(this.strm,this.header)}function o(e,t){var r=new a(t);if(r.push(e,!0),r.err)throw r.msg||n[r.err];return r.result}a.prototype.push=function(e,t){var r,n,i,s,a,o,h=this.strm,u=this.options.chunkSize,l=this.options.dictionary,f=!1;if(this.ended)return!1;n=t===~~t?t:!0===t?m.Z_FINISH:m.Z_NO_FLUSH,"string"==typeof e?h.input=p.binstring2buf(e):"[object ArrayBuffer]"===_.call(e)?h.input=new Uint8Array(e):h.input=e,h.next_in=0,h.avail_in=h.input.length;do{if(0===h.avail_out&&(h.output=new d.Buf8(u),h.next_out=0,h.avail_out=u),(r=c.inflate(h,m.Z_NO_FLUSH))===m.Z_NEED_DICT&&l&&(o="string"==typeof l?p.string2buf(l):"[object ArrayBuffer]"===_.call(l)?new Uint8Array(l):l,r=c.inflateSetDictionary(this.strm,o)),r===m.Z_BUF_ERROR&&!0===f&&(r=m.Z_OK,f=!1),r!==m.Z_STREAM_END&&r!==m.Z_OK)return this.onEnd(r),!(this.ended=!0);h.next_out&&(0!==h.avail_out&&r!==m.Z_STREAM_END&&(0!==h.avail_in||n!==m.Z_FINISH&&n!==m.Z_SYNC_FLUSH)||("string"===this.options.to?(i=p.utf8border(h.output,h.next_out),s=h.next_out-i,a=p.buf2string(h.output,i),h.next_out=s,h.avail_out=u-s,s&&d.arraySet(h.output,h.output,i,s,0),this.onData(a)):this.onData(d.shrinkBuf(h.output,h.next_out)))),0===h.avail_in&&0===h.avail_out&&(f=!0)}while((0<h.avail_in||0===h.avail_out)&&r!==m.Z_STREAM_END);return r===m.Z_STREAM_END&&(n=m.Z_FINISH),n===m.Z_FINISH?(r=c.inflateEnd(this.strm),this.onEnd(r),this.ended=!0,r===m.Z_OK):n!==m.Z_SYNC_FLUSH||(this.onEnd(m.Z_OK),!(h.avail_out=0))},a.prototype.onData=function(e){this.chunks.push(e)},a.prototype.onEnd=function(e){e===m.Z_OK&&("string"===this.options.to?this.result=this.chunks.join(""):this.result=d.flattenChunks(this.chunks)),this.chunks=[],this.err=e,this.msg=this.strm.msg},r.Inflate=a,r.inflate=o,r.inflateRaw=function(e,t){return(t=t||{}).raw=!0,o(e,t)},r.ungzip=o},{"./utils/common":41,"./utils/strings":42,"./zlib/constants":44,"./zlib/gzheader":47,"./zlib/inflate":49,"./zlib/messages":51,"./zlib/zstream":53}],41:[function(e,t,r){"use strict";var n="undefined"!=typeof Uint8Array&&"undefined"!=typeof Uint16Array&&"undefined"!=typeof Int32Array;r.assign=function(e){for(var t=Array.prototype.slice.call(arguments,1);t.length;){var r=t.shift();if(r){if("object"!=typeof r)throw new TypeError(r+"must be non-object");for(var n in r)r.hasOwnProperty(n)&&(e[n]=r[n])}}return e},r.shrinkBuf=function(e,t){return e.length===t?e:e.subarray?e.subarray(0,t):(e.length=t,e)};var i={arraySet:function(e,t,r,n,i){if(t.subarray&&e.subarray)e.set(t.subarray(r,r+n),i);else for(var s=0;s<n;s++)e[i+s]=t[r+s]},flattenChunks:function(e){var t,r,n,i,s,a;for(t=n=0,r=e.length;t<r;t++)n+=e[t].length;for(a=new Uint8Array(n),t=i=0,r=e.length;t<r;t++)s=e[t],a.set(s,i),i+=s.length;return a}},s={arraySet:function(e,t,r,n,i){for(var s=0;s<n;s++)e[i+s]=t[r+s]},flattenChunks:function(e){return[].concat.apply([],e)}};r.setTyped=function(e){e?(r.Buf8=Uint8Array,r.Buf16=Uint16Array,r.Buf32=Int32Array,r.assign(r,i)):(r.Buf8=Array,r.Buf16=Array,r.Buf32=Array,r.assign(r,s))},r.setTyped(n)},{}],42:[function(e,t,r){"use strict";var h=e("./common"),i=!0,s=!0;try{String.fromCharCode.apply(null,[0])}catch(e){i=!1}try{String.fromCharCode.apply(null,new Uint8Array(1))}catch(e){s=!1}for(var u=new h.Buf8(256),n=0;n<256;n++)u[n]=252<=n?6:248<=n?5:240<=n?4:224<=n?3:192<=n?2:1;function l(e,t){if(t<65537&&(e.subarray&&s||!e.subarray&&i))return String.fromCharCode.apply(null,h.shrinkBuf(e,t));for(var r="",n=0;n<t;n++)r+=String.fromCharCode(e[n]);return r}u[254]=u[254]=1,r.string2buf=function(e){var t,r,n,i,s,a=e.length,o=0;for(i=0;i<a;i++)55296==(64512&(r=e.charCodeAt(i)))&&i+1<a&&56320==(64512&(n=e.charCodeAt(i+1)))&&(r=65536+(r-55296<<10)+(n-56320),i++),o+=r<128?1:r<2048?2:r<65536?3:4;for(t=new h.Buf8(o),i=s=0;s<o;i++)55296==(64512&(r=e.charCodeAt(i)))&&i+1<a&&56320==(64512&(n=e.charCodeAt(i+1)))&&(r=65536+(r-55296<<10)+(n-56320),i++),r<128?t[s++]=r:(r<2048?t[s++]=192|r>>>6:(r<65536?t[s++]=224|r>>>12:(t[s++]=240|r>>>18,t[s++]=128|r>>>12&63),t[s++]=128|r>>>6&63),t[s++]=128|63&r);return t},r.buf2binstring=function(e){return l(e,e.length)},r.binstring2buf=function(e){for(var t=new h.Buf8(e.length),r=0,n=t.length;r<n;r++)t[r]=e.charCodeAt(r);return t},r.buf2string=function(e,t){var r,n,i,s,a=t||e.length,o=new Array(2*a);for(r=n=0;r<a;)if((i=e[r++])<128)o[n++]=i;else if(4<(s=u[i]))o[n++]=65533,r+=s-1;else{for(i&=2===s?31:3===s?15:7;1<s&&r<a;)i=i<<6|63&e[r++],s--;1<s?o[n++]=65533:i<65536?o[n++]=i:(i-=65536,o[n++]=55296|i>>10&1023,o[n++]=56320|1023&i)}return l(o,n)},r.utf8border=function(e,t){var r;for((t=t||e.length)>e.length&&(t=e.length),r=t-1;0<=r&&128==(192&e[r]);)r--;return r<0?t:0===r?t:r+u[e[r]]>t?r:t}},{"./common":41}],43:[function(e,t,r){"use strict";t.exports=function(e,t,r,n){for(var i=65535&e|0,s=e>>>16&65535|0,a=0;0!==r;){for(r-=a=2e3<r?2e3:r;s=s+(i=i+t[n++]|0)|0,--a;);i%=65521,s%=65521}return i|s<<16|0}},{}],44:[function(e,t,r){"use strict";t.exports={Z_NO_FLUSH:0,Z_PARTIAL_FLUSH:1,Z_SYNC_FLUSH:2,Z_FULL_FLUSH:3,Z_FINISH:4,Z_BLOCK:5,Z_TREES:6,Z_OK:0,Z_STREAM_END:1,Z_NEED_DICT:2,Z_ERRNO:-1,Z_STREAM_ERROR:-2,Z_DATA_ERROR:-3,Z_BUF_ERROR:-5,Z_NO_COMPRESSION:0,Z_BEST_SPEED:1,Z_BEST_COMPRESSION:9,Z_DEFAULT_COMPRESSION:-1,Z_FILTERED:1,Z_HUFFMAN_ONLY:2,Z_RLE:3,Z_FIXED:4,Z_DEFAULT_STRATEGY:0,Z_BINARY:0,Z_TEXT:1,Z_UNKNOWN:2,Z_DEFLATED:8}},{}],45:[function(e,t,r){"use strict";var o=function(){for(var e,t=[],r=0;r<256;r++){e=r;for(var n=0;n<8;n++)e=1&e?3988292384^e>>>1:e>>>1;t[r]=e}return t}();t.exports=function(e,t,r,n){var i=o,s=n+r;e^=-1;for(var a=n;a<s;a++)e=e>>>8^i[255&(e^t[a])];return-1^e}},{}],46:[function(e,t,r){"use strict";var h,c=e("../utils/common"),u=e("./trees"),d=e("./adler32"),p=e("./crc32"),n=e("./messages"),l=0,f=4,m=0,_=-2,g=-1,b=4,i=2,v=8,y=9,s=286,a=30,o=19,w=2*s+1,k=15,x=3,S=258,z=S+x+1,C=42,E=113,A=1,I=2,O=3,B=4;function R(e,t){return e.msg=n[t],t}function T(e){return(e<<1)-(4<e?9:0)}function D(e){for(var t=e.length;0<=--t;)e[t]=0}function F(e){var t=e.state,r=t.pending;r>e.avail_out&&(r=e.avail_out),0!==r&&(c.arraySet(e.output,t.pending_buf,t.pending_out,r,e.next_out),e.next_out+=r,t.pending_out+=r,e.total_out+=r,e.avail_out-=r,t.pending-=r,0===t.pending&&(t.pending_out=0))}function N(e,t){u._tr_flush_block(e,0<=e.block_start?e.block_start:-1,e.strstart-e.block_start,t),e.block_start=e.strstart,F(e.strm)}function U(e,t){e.pending_buf[e.pending++]=t}function P(e,t){e.pending_buf[e.pending++]=t>>>8&255,e.pending_buf[e.pending++]=255&t}function L(e,t){var r,n,i=e.max_chain_length,s=e.strstart,a=e.prev_length,o=e.nice_match,h=e.strstart>e.w_size-z?e.strstart-(e.w_size-z):0,u=e.window,l=e.w_mask,f=e.prev,c=e.strstart+S,d=u[s+a-1],p=u[s+a];e.prev_length>=e.good_match&&(i>>=2),o>e.lookahead&&(o=e.lookahead);do{if(u[(r=t)+a]===p&&u[r+a-1]===d&&u[r]===u[s]&&u[++r]===u[s+1]){s+=2,r++;do{}while(u[++s]===u[++r]&&u[++s]===u[++r]&&u[++s]===u[++r]&&u[++s]===u[++r]&&u[++s]===u[++r]&&u[++s]===u[++r]&&u[++s]===u[++r]&&u[++s]===u[++r]&&s<c);if(n=S-(c-s),s=c-S,a<n){if(e.match_start=t,o<=(a=n))break;d=u[s+a-1],p=u[s+a]}}}while((t=f[t&l])>h&&0!=--i);return a<=e.lookahead?a:e.lookahead}function j(e){var t,r,n,i,s,a,o,h,u,l,f=e.w_size;do{if(i=e.window_size-e.lookahead-e.strstart,e.strstart>=f+(f-z)){for(c.arraySet(e.window,e.window,f,f,0),e.match_start-=f,e.strstart-=f,e.block_start-=f,t=r=e.hash_size;n=e.head[--t],e.head[t]=f<=n?n-f:0,--r;);for(t=r=f;n=e.prev[--t],e.prev[t]=f<=n?n-f:0,--r;);i+=f}if(0===e.strm.avail_in)break;if(a=e.strm,o=e.window,h=e.strstart+e.lookahead,u=i,l=void 0,l=a.avail_in,u<l&&(l=u),r=0===l?0:(a.avail_in-=l,c.arraySet(o,a.input,a.next_in,l,h),1===a.state.wrap?a.adler=d(a.adler,o,l,h):2===a.state.wrap&&(a.adler=p(a.adler,o,l,h)),a.next_in+=l,a.total_in+=l,l),e.lookahead+=r,e.lookahead+e.insert>=x)for(s=e.strstart-e.insert,e.ins_h=e.window[s],e.ins_h=(e.ins_h<<e.hash_shift^e.window[s+1])&e.hash_mask;e.insert&&(e.ins_h=(e.ins_h<<e.hash_shift^e.window[s+x-1])&e.hash_mask,e.prev[s&e.w_mask]=e.head[e.ins_h],e.head[e.ins_h]=s,s++,e.insert--,!(e.lookahead+e.insert<x)););}while(e.lookahead<z&&0!==e.strm.avail_in)}function Z(e,t){for(var r,n;;){if(e.lookahead<z){if(j(e),e.lookahead<z&&t===l)return A;if(0===e.lookahead)break}if(r=0,e.lookahead>=x&&(e.ins_h=(e.ins_h<<e.hash_shift^e.window[e.strstart+x-1])&e.hash_mask,r=e.prev[e.strstart&e.w_mask]=e.head[e.ins_h],e.head[e.ins_h]=e.strstart),0!==r&&e.strstart-r<=e.w_size-z&&(e.match_length=L(e,r)),e.match_length>=x)if(n=u._tr_tally(e,e.strstart-e.match_start,e.match_length-x),e.lookahead-=e.match_length,e.match_length<=e.max_lazy_match&&e.lookahead>=x){for(e.match_length--;e.strstart++,e.ins_h=(e.ins_h<<e.hash_shift^e.window[e.strstart+x-1])&e.hash_mask,r=e.prev[e.strstart&e.w_mask]=e.head[e.ins_h],e.head[e.ins_h]=e.strstart,0!=--e.match_length;);e.strstart++}else e.strstart+=e.match_length,e.match_length=0,e.ins_h=e.window[e.strstart],e.ins_h=(e.ins_h<<e.hash_shift^e.window[e.strstart+1])&e.hash_mask;else n=u._tr_tally(e,0,e.window[e.strstart]),e.lookahead--,e.strstart++;if(n&&(N(e,!1),0===e.strm.avail_out))return A}return e.insert=e.strstart<x-1?e.strstart:x-1,t===f?(N(e,!0),0===e.strm.avail_out?O:B):e.last_lit&&(N(e,!1),0===e.strm.avail_out)?A:I}function W(e,t){for(var r,n,i;;){if(e.lookahead<z){if(j(e),e.lookahead<z&&t===l)return A;if(0===e.lookahead)break}if(r=0,e.lookahead>=x&&(e.ins_h=(e.ins_h<<e.hash_shift^e.window[e.strstart+x-1])&e.hash_mask,r=e.prev[e.strstart&e.w_mask]=e.head[e.ins_h],e.head[e.ins_h]=e.strstart),e.prev_length=e.match_length,e.prev_match=e.match_start,e.match_length=x-1,0!==r&&e.prev_length<e.max_lazy_match&&e.strstart-r<=e.w_size-z&&(e.match_length=L(e,r),e.match_length<=5&&(1===e.strategy||e.match_length===x&&4096<e.strstart-e.match_start)&&(e.match_length=x-1)),e.prev_length>=x&&e.match_length<=e.prev_length){for(i=e.strstart+e.lookahead-x,n=u._tr_tally(e,e.strstart-1-e.prev_match,e.prev_length-x),e.lookahead-=e.prev_length-1,e.prev_length-=2;++e.strstart<=i&&(e.ins_h=(e.ins_h<<e.hash_shift^e.window[e.strstart+x-1])&e.hash_mask,r=e.prev[e.strstart&e.w_mask]=e.head[e.ins_h],e.head[e.ins_h]=e.strstart),0!=--e.prev_length;);if(e.match_available=0,e.match_length=x-1,e.strstart++,n&&(N(e,!1),0===e.strm.avail_out))return A}else if(e.match_available){if((n=u._tr_tally(e,0,e.window[e.strstart-1]))&&N(e,!1),e.strstart++,e.lookahead--,0===e.strm.avail_out)return A}else e.match_available=1,e.strstart++,e.lookahead--}return e.match_available&&(n=u._tr_tally(e,0,e.window[e.strstart-1]),e.match_available=0),e.insert=e.strstart<x-1?e.strstart:x-1,t===f?(N(e,!0),0===e.strm.avail_out?O:B):e.last_lit&&(N(e,!1),0===e.strm.avail_out)?A:I}function M(e,t,r,n,i){this.good_length=e,this.max_lazy=t,this.nice_length=r,this.max_chain=n,this.func=i}function H(){this.strm=null,this.status=0,this.pending_buf=null,this.pending_buf_size=0,this.pending_out=0,this.pending=0,this.wrap=0,this.gzhead=null,this.gzindex=0,this.method=v,this.last_flush=-1,this.w_size=0,this.w_bits=0,this.w_mask=0,this.window=null,this.window_size=0,this.prev=null,this.head=null,this.ins_h=0,this.hash_size=0,this.hash_bits=0,this.hash_mask=0,this.hash_shift=0,this.block_start=0,this.match_length=0,this.prev_match=0,this.match_available=0,this.strstart=0,this.match_start=0,this.lookahead=0,this.prev_length=0,this.max_chain_length=0,this.max_lazy_match=0,this.level=0,this.strategy=0,this.good_match=0,this.nice_match=0,this.dyn_ltree=new c.Buf16(2*w),this.dyn_dtree=new c.Buf16(2*(2*a+1)),this.bl_tree=new c.Buf16(2*(2*o+1)),D(this.dyn_ltree),D(this.dyn_dtree),D(this.bl_tree),this.l_desc=null,this.d_desc=null,this.bl_desc=null,this.bl_count=new c.Buf16(k+1),this.heap=new c.Buf16(2*s+1),D(this.heap),this.heap_len=0,this.heap_max=0,this.depth=new c.Buf16(2*s+1),D(this.depth),this.l_buf=0,this.lit_bufsize=0,this.last_lit=0,this.d_buf=0,this.opt_len=0,this.static_len=0,this.matches=0,this.insert=0,this.bi_buf=0,this.bi_valid=0}function G(e){var t;return e&&e.state?(e.total_in=e.total_out=0,e.data_type=i,(t=e.state).pending=0,t.pending_out=0,t.wrap<0&&(t.wrap=-t.wrap),t.status=t.wrap?C:E,e.adler=2===t.wrap?0:1,t.last_flush=l,u._tr_init(t),m):R(e,_)}function K(e){var t=G(e);return t===m&&function(e){e.window_size=2*e.w_size,D(e.head),e.max_lazy_match=h[e.level].max_lazy,e.good_match=h[e.level].good_length,e.nice_match=h[e.level].nice_length,e.max_chain_length=h[e.level].max_chain,e.strstart=0,e.block_start=0,e.lookahead=0,e.insert=0,e.match_length=e.prev_length=x-1,e.match_available=0,e.ins_h=0}(e.state),t}function Y(e,t,r,n,i,s){if(!e)return _;var a=1;if(t===g&&(t=6),n<0?(a=0,n=-n):15<n&&(a=2,n-=16),i<1||y<i||r!==v||n<8||15<n||t<0||9<t||s<0||b<s)return R(e,_);8===n&&(n=9);var o=new H;return(e.state=o).strm=e,o.wrap=a,o.gzhead=null,o.w_bits=n,o.w_size=1<<o.w_bits,o.w_mask=o.w_size-1,o.hash_bits=i+7,o.hash_size=1<<o.hash_bits,o.hash_mask=o.hash_size-1,o.hash_shift=~~((o.hash_bits+x-1)/x),o.window=new c.Buf8(2*o.w_size),o.head=new c.Buf16(o.hash_size),o.prev=new c.Buf16(o.w_size),o.lit_bufsize=1<<i+6,o.pending_buf_size=4*o.lit_bufsize,o.pending_buf=new c.Buf8(o.pending_buf_size),o.d_buf=1*o.lit_bufsize,o.l_buf=3*o.lit_bufsize,o.level=t,o.strategy=s,o.method=r,K(e)}h=[new M(0,0,0,0,function(e,t){var r=65535;for(r>e.pending_buf_size-5&&(r=e.pending_buf_size-5);;){if(e.lookahead<=1){if(j(e),0===e.lookahead&&t===l)return A;if(0===e.lookahead)break}e.strstart+=e.lookahead,e.lookahead=0;var n=e.block_start+r;if((0===e.strstart||e.strstart>=n)&&(e.lookahead=e.strstart-n,e.strstart=n,N(e,!1),0===e.strm.avail_out))return A;if(e.strstart-e.block_start>=e.w_size-z&&(N(e,!1),0===e.strm.avail_out))return A}return e.insert=0,t===f?(N(e,!0),0===e.strm.avail_out?O:B):(e.strstart>e.block_start&&(N(e,!1),e.strm.avail_out),A)}),new M(4,4,8,4,Z),new M(4,5,16,8,Z),new M(4,6,32,32,Z),new M(4,4,16,16,W),new M(8,16,32,32,W),new M(8,16,128,128,W),new M(8,32,128,256,W),new M(32,128,258,1024,W),new M(32,258,258,4096,W)],r.deflateInit=function(e,t){return Y(e,t,v,15,8,0)},r.deflateInit2=Y,r.deflateReset=K,r.deflateResetKeep=G,r.deflateSetHeader=function(e,t){return e&&e.state?2!==e.state.wrap?_:(e.state.gzhead=t,m):_},r.deflate=function(e,t){var r,n,i,s;if(!e||!e.state||5<t||t<0)return e?R(e,_):_;if(n=e.state,!e.output||!e.input&&0!==e.avail_in||666===n.status&&t!==f)return R(e,0===e.avail_out?-5:_);if(n.strm=e,r=n.last_flush,n.last_flush=t,n.status===C)if(2===n.wrap)e.adler=0,U(n,31),U(n,139),U(n,8),n.gzhead?(U(n,(n.gzhead.text?1:0)+(n.gzhead.hcrc?2:0)+(n.gzhead.extra?4:0)+(n.gzhead.name?8:0)+(n.gzhead.comment?16:0)),U(n,255&n.gzhead.time),U(n,n.gzhead.time>>8&255),U(n,n.gzhead.time>>16&255),U(n,n.gzhead.time>>24&255),U(n,9===n.level?2:2<=n.strategy||n.level<2?4:0),U(n,255&n.gzhead.os),n.gzhead.extra&&n.gzhead.extra.length&&(U(n,255&n.gzhead.extra.length),U(n,n.gzhead.extra.length>>8&255)),n.gzhead.hcrc&&(e.adler=p(e.adler,n.pending_buf,n.pending,0)),n.gzindex=0,n.status=69):(U(n,0),U(n,0),U(n,0),U(n,0),U(n,0),U(n,9===n.level?2:2<=n.strategy||n.level<2?4:0),U(n,3),n.status=E);else{var a=v+(n.w_bits-8<<4)<<8;a|=(2<=n.strategy||n.level<2?0:n.level<6?1:6===n.level?2:3)<<6,0!==n.strstart&&(a|=32),a+=31-a%31,n.status=E,P(n,a),0!==n.strstart&&(P(n,e.adler>>>16),P(n,65535&e.adler)),e.adler=1}if(69===n.status)if(n.gzhead.extra){for(i=n.pending;n.gzindex<(65535&n.gzhead.extra.length)&&(n.pending!==n.pending_buf_size||(n.gzhead.hcrc&&n.pending>i&&(e.adler=p(e.adler,n.pending_buf,n.pending-i,i)),F(e),i=n.pending,n.pending!==n.pending_buf_size));)U(n,255&n.gzhead.extra[n.gzindex]),n.gzindex++;n.gzhead.hcrc&&n.pending>i&&(e.adler=p(e.adler,n.pending_buf,n.pending-i,i)),n.gzindex===n.gzhead.extra.length&&(n.gzindex=0,n.status=73)}else n.status=73;if(73===n.status)if(n.gzhead.name){i=n.pending;do{if(n.pending===n.pending_buf_size&&(n.gzhead.hcrc&&n.pending>i&&(e.adler=p(e.adler,n.pending_buf,n.pending-i,i)),F(e),i=n.pending,n.pending===n.pending_buf_size)){s=1;break}s=n.gzindex<n.gzhead.name.length?255&n.gzhead.name.charCodeAt(n.gzindex++):0,U(n,s)}while(0!==s);n.gzhead.hcrc&&n.pending>i&&(e.adler=p(e.adler,n.pending_buf,n.pending-i,i)),0===s&&(n.gzindex=0,n.status=91)}else n.status=91;if(91===n.status)if(n.gzhead.comment){i=n.pending;do{if(n.pending===n.pending_buf_size&&(n.gzhead.hcrc&&n.pending>i&&(e.adler=p(e.adler,n.pending_buf,n.pending-i,i)),F(e),i=n.pending,n.pending===n.pending_buf_size)){s=1;break}s=n.gzindex<n.gzhead.comment.length?255&n.gzhead.comment.charCodeAt(n.gzindex++):0,U(n,s)}while(0!==s);n.gzhead.hcrc&&n.pending>i&&(e.adler=p(e.adler,n.pending_buf,n.pending-i,i)),0===s&&(n.status=103)}else n.status=103;if(103===n.status&&(n.gzhead.hcrc?(n.pending+2>n.pending_buf_size&&F(e),n.pending+2<=n.pending_buf_size&&(U(n,255&e.adler),U(n,e.adler>>8&255),e.adler=0,n.status=E)):n.status=E),0!==n.pending){if(F(e),0===e.avail_out)return n.last_flush=-1,m}else if(0===e.avail_in&&T(t)<=T(r)&&t!==f)return R(e,-5);if(666===n.status&&0!==e.avail_in)return R(e,-5);if(0!==e.avail_in||0!==n.lookahead||t!==l&&666!==n.status){var o=2===n.strategy?function(e,t){for(var r;;){if(0===e.lookahead&&(j(e),0===e.lookahead)){if(t===l)return A;break}if(e.match_length=0,r=u._tr_tally(e,0,e.window[e.strstart]),e.lookahead--,e.strstart++,r&&(N(e,!1),0===e.strm.avail_out))return A}return e.insert=0,t===f?(N(e,!0),0===e.strm.avail_out?O:B):e.last_lit&&(N(e,!1),0===e.strm.avail_out)?A:I}(n,t):3===n.strategy?function(e,t){for(var r,n,i,s,a=e.window;;){if(e.lookahead<=S){if(j(e),e.lookahead<=S&&t===l)return A;if(0===e.lookahead)break}if(e.match_length=0,e.lookahead>=x&&0<e.strstart&&(n=a[i=e.strstart-1])===a[++i]&&n===a[++i]&&n===a[++i]){s=e.strstart+S;do{}while(n===a[++i]&&n===a[++i]&&n===a[++i]&&n===a[++i]&&n===a[++i]&&n===a[++i]&&n===a[++i]&&n===a[++i]&&i<s);e.match_length=S-(s-i),e.match_length>e.lookahead&&(e.match_length=e.lookahead)}if(e.match_length>=x?(r=u._tr_tally(e,1,e.match_length-x),e.lookahead-=e.match_length,e.strstart+=e.match_length,e.match_length=0):(r=u._tr_tally(e,0,e.window[e.strstart]),e.lookahead--,e.strstart++),r&&(N(e,!1),0===e.strm.avail_out))return A}return e.insert=0,t===f?(N(e,!0),0===e.strm.avail_out?O:B):e.last_lit&&(N(e,!1),0===e.strm.avail_out)?A:I}(n,t):h[n.level].func(n,t);if(o!==O&&o!==B||(n.status=666),o===A||o===O)return 0===e.avail_out&&(n.last_flush=-1),m;if(o===I&&(1===t?u._tr_align(n):5!==t&&(u._tr_stored_block(n,0,0,!1),3===t&&(D(n.head),0===n.lookahead&&(n.strstart=0,n.block_start=0,n.insert=0))),F(e),0===e.avail_out))return n.last_flush=-1,m}return t!==f?m:n.wrap<=0?1:(2===n.wrap?(U(n,255&e.adler),U(n,e.adler>>8&255),U(n,e.adler>>16&255),U(n,e.adler>>24&255),U(n,255&e.total_in),U(n,e.total_in>>8&255),U(n,e.total_in>>16&255),U(n,e.total_in>>24&255)):(P(n,e.adler>>>16),P(n,65535&e.adler)),F(e),0<n.wrap&&(n.wrap=-n.wrap),0!==n.pending?m:1)},r.deflateEnd=function(e){var t;return e&&e.state?(t=e.state.status)!==C&&69!==t&&73!==t&&91!==t&&103!==t&&t!==E&&666!==t?R(e,_):(e.state=null,t===E?R(e,-3):m):_},r.deflateSetDictionary=function(e,t){var r,n,i,s,a,o,h,u,l=t.length;if(!e||!e.state)return _;if(2===(s=(r=e.state).wrap)||1===s&&r.status!==C||r.lookahead)return _;for(1===s&&(e.adler=d(e.adler,t,l,0)),r.wrap=0,l>=r.w_size&&(0===s&&(D(r.head),r.strstart=0,r.block_start=0,r.insert=0),u=new c.Buf8(r.w_size),c.arraySet(u,t,l-r.w_size,r.w_size,0),t=u,l=r.w_size),a=e.avail_in,o=e.next_in,h=e.input,e.avail_in=l,e.next_in=0,e.input=t,j(r);r.lookahead>=x;){for(n=r.strstart,i=r.lookahead-(x-1);r.ins_h=(r.ins_h<<r.hash_shift^r.window[n+x-1])&r.hash_mask,r.prev[n&r.w_mask]=r.head[r.ins_h],r.head[r.ins_h]=n,n++,--i;);r.strstart=n,r.lookahead=x-1,j(r)}return r.strstart+=r.lookahead,r.block_start=r.strstart,r.insert=r.lookahead,r.lookahead=0,r.match_length=r.prev_length=x-1,r.match_available=0,e.next_in=o,e.input=h,e.avail_in=a,r.wrap=s,m},r.deflateInfo="pako deflate (from Nodeca project)"},{"../utils/common":41,"./adler32":43,"./crc32":45,"./messages":51,"./trees":52}],47:[function(e,t,r){"use strict";t.exports=function(){this.text=0,this.time=0,this.xflags=0,this.os=0,this.extra=null,this.extra_len=0,this.name="",this.comment="",this.hcrc=0,this.done=!1}},{}],48:[function(e,t,r){"use strict";t.exports=function(e,t){var r,n,i,s,a,o,h,u,l,f,c,d,p,m,_,g,b,v,y,w,k,x,S,z,C;r=e.state,n=e.next_in,z=e.input,i=n+(e.avail_in-5),s=e.next_out,C=e.output,a=s-(t-e.avail_out),o=s+(e.avail_out-257),h=r.dmax,u=r.wsize,l=r.whave,f=r.wnext,c=r.window,d=r.hold,p=r.bits,m=r.lencode,_=r.distcode,g=(1<<r.lenbits)-1,b=(1<<r.distbits)-1;e:do{p<15&&(d+=z[n++]<<p,p+=8,d+=z[n++]<<p,p+=8),v=m[d&g];t:for(;;){if(d>>>=y=v>>>24,p-=y,0===(y=v>>>16&255))C[s++]=65535&v;else{if(!(16&y)){if(0==(64&y)){v=m[(65535&v)+(d&(1<<y)-1)];continue t}if(32&y){r.mode=12;break e}e.msg="invalid literal/length code",r.mode=30;break e}w=65535&v,(y&=15)&&(p<y&&(d+=z[n++]<<p,p+=8),w+=d&(1<<y)-1,d>>>=y,p-=y),p<15&&(d+=z[n++]<<p,p+=8,d+=z[n++]<<p,p+=8),v=_[d&b];r:for(;;){if(d>>>=y=v>>>24,p-=y,!(16&(y=v>>>16&255))){if(0==(64&y)){v=_[(65535&v)+(d&(1<<y)-1)];continue r}e.msg="invalid distance code",r.mode=30;break e}if(k=65535&v,p<(y&=15)&&(d+=z[n++]<<p,(p+=8)<y&&(d+=z[n++]<<p,p+=8)),h<(k+=d&(1<<y)-1)){e.msg="invalid distance too far back",r.mode=30;break e}if(d>>>=y,p-=y,(y=s-a)<k){if(l<(y=k-y)&&r.sane){e.msg="invalid distance too far back",r.mode=30;break e}if(S=c,(x=0)===f){if(x+=u-y,y<w){for(w-=y;C[s++]=c[x++],--y;);x=s-k,S=C}}else if(f<y){if(x+=u+f-y,(y-=f)<w){for(w-=y;C[s++]=c[x++],--y;);if(x=0,f<w){for(w-=y=f;C[s++]=c[x++],--y;);x=s-k,S=C}}}else if(x+=f-y,y<w){for(w-=y;C[s++]=c[x++],--y;);x=s-k,S=C}for(;2<w;)C[s++]=S[x++],C[s++]=S[x++],C[s++]=S[x++],w-=3;w&&(C[s++]=S[x++],1<w&&(C[s++]=S[x++]))}else{for(x=s-k;C[s++]=C[x++],C[s++]=C[x++],C[s++]=C[x++],2<(w-=3););w&&(C[s++]=C[x++],1<w&&(C[s++]=C[x++]))}break}}break}}while(n<i&&s<o);n-=w=p>>3,d&=(1<<(p-=w<<3))-1,e.next_in=n,e.next_out=s,e.avail_in=n<i?i-n+5:5-(n-i),e.avail_out=s<o?o-s+257:257-(s-o),r.hold=d,r.bits=p}},{}],49:[function(e,t,r){"use strict";var I=e("../utils/common"),O=e("./adler32"),B=e("./crc32"),R=e("./inffast"),T=e("./inftrees"),D=1,F=2,N=0,U=-2,P=1,n=852,i=592;function L(e){return(e>>>24&255)+(e>>>8&65280)+((65280&e)<<8)+((255&e)<<24)}function s(){this.mode=0,this.last=!1,this.wrap=0,this.havedict=!1,this.flags=0,this.dmax=0,this.check=0,this.total=0,this.head=null,this.wbits=0,this.wsize=0,this.whave=0,this.wnext=0,this.window=null,this.hold=0,this.bits=0,this.length=0,this.offset=0,this.extra=0,this.lencode=null,this.distcode=null,this.lenbits=0,this.distbits=0,this.ncode=0,this.nlen=0,this.ndist=0,this.have=0,this.next=null,this.lens=new I.Buf16(320),this.work=new I.Buf16(288),this.lendyn=null,this.distdyn=null,this.sane=0,this.back=0,this.was=0}function a(e){var t;return e&&e.state?(t=e.state,e.total_in=e.total_out=t.total=0,e.msg="",t.wrap&&(e.adler=1&t.wrap),t.mode=P,t.last=0,t.havedict=0,t.dmax=32768,t.head=null,t.hold=0,t.bits=0,t.lencode=t.lendyn=new I.Buf32(n),t.distcode=t.distdyn=new I.Buf32(i),t.sane=1,t.back=-1,N):U}function o(e){var t;return e&&e.state?((t=e.state).wsize=0,t.whave=0,t.wnext=0,a(e)):U}function h(e,t){var r,n;return e&&e.state?(n=e.state,t<0?(r=0,t=-t):(r=1+(t>>4),t<48&&(t&=15)),t&&(t<8||15<t)?U:(null!==n.window&&n.wbits!==t&&(n.window=null),n.wrap=r,n.wbits=t,o(e))):U}function u(e,t){var r,n;return e?(n=new s,(e.state=n).window=null,(r=h(e,t))!==N&&(e.state=null),r):U}var l,f,c=!0;function j(e){if(c){var t;for(l=new I.Buf32(512),f=new I.Buf32(32),t=0;t<144;)e.lens[t++]=8;for(;t<256;)e.lens[t++]=9;for(;t<280;)e.lens[t++]=7;for(;t<288;)e.lens[t++]=8;for(T(D,e.lens,0,288,l,0,e.work,{bits:9}),t=0;t<32;)e.lens[t++]=5;T(F,e.lens,0,32,f,0,e.work,{bits:5}),c=!1}e.lencode=l,e.lenbits=9,e.distcode=f,e.distbits=5}function Z(e,t,r,n){var i,s=e.state;return null===s.window&&(s.wsize=1<<s.wbits,s.wnext=0,s.whave=0,s.window=new I.Buf8(s.wsize)),n>=s.wsize?(I.arraySet(s.window,t,r-s.wsize,s.wsize,0),s.wnext=0,s.whave=s.wsize):(n<(i=s.wsize-s.wnext)&&(i=n),I.arraySet(s.window,t,r-n,i,s.wnext),(n-=i)?(I.arraySet(s.window,t,r-n,n,0),s.wnext=n,s.whave=s.wsize):(s.wnext+=i,s.wnext===s.wsize&&(s.wnext=0),s.whave<s.wsize&&(s.whave+=i))),0}r.inflateReset=o,r.inflateReset2=h,r.inflateResetKeep=a,r.inflateInit=function(e){return u(e,15)},r.inflateInit2=u,r.inflate=function(e,t){var r,n,i,s,a,o,h,u,l,f,c,d,p,m,_,g,b,v,y,w,k,x,S,z,C=0,E=new I.Buf8(4),A=[16,17,18,0,8,7,9,6,10,5,11,4,12,3,13,2,14,1,15];if(!e||!e.state||!e.output||!e.input&&0!==e.avail_in)return U;12===(r=e.state).mode&&(r.mode=13),a=e.next_out,i=e.output,h=e.avail_out,s=e.next_in,n=e.input,o=e.avail_in,u=r.hold,l=r.bits,f=o,c=h,x=N;e:for(;;)switch(r.mode){case P:if(0===r.wrap){r.mode=13;break}for(;l<16;){if(0===o)break e;o--,u+=n[s++]<<l,l+=8}if(2&r.wrap&&35615===u){E[r.check=0]=255&u,E[1]=u>>>8&255,r.check=B(r.check,E,2,0),l=u=0,r.mode=2;break}if(r.flags=0,r.head&&(r.head.done=!1),!(1&r.wrap)||(((255&u)<<8)+(u>>8))%31){e.msg="incorrect header check",r.mode=30;break}if(8!=(15&u)){e.msg="unknown compression method",r.mode=30;break}if(l-=4,k=8+(15&(u>>>=4)),0===r.wbits)r.wbits=k;else if(k>r.wbits){e.msg="invalid window size",r.mode=30;break}r.dmax=1<<k,e.adler=r.check=1,r.mode=512&u?10:12,l=u=0;break;case 2:for(;l<16;){if(0===o)break e;o--,u+=n[s++]<<l,l+=8}if(r.flags=u,8!=(255&r.flags)){e.msg="unknown compression method",r.mode=30;break}if(57344&r.flags){e.msg="unknown header flags set",r.mode=30;break}r.head&&(r.head.text=u>>8&1),512&r.flags&&(E[0]=255&u,E[1]=u>>>8&255,r.check=B(r.check,E,2,0)),l=u=0,r.mode=3;case 3:for(;l<32;){if(0===o)break e;o--,u+=n[s++]<<l,l+=8}r.head&&(r.head.time=u),512&r.flags&&(E[0]=255&u,E[1]=u>>>8&255,E[2]=u>>>16&255,E[3]=u>>>24&255,r.check=B(r.check,E,4,0)),l=u=0,r.mode=4;case 4:for(;l<16;){if(0===o)break e;o--,u+=n[s++]<<l,l+=8}r.head&&(r.head.xflags=255&u,r.head.os=u>>8),512&r.flags&&(E[0]=255&u,E[1]=u>>>8&255,r.check=B(r.check,E,2,0)),l=u=0,r.mode=5;case 5:if(1024&r.flags){for(;l<16;){if(0===o)break e;o--,u+=n[s++]<<l,l+=8}r.length=u,r.head&&(r.head.extra_len=u),512&r.flags&&(E[0]=255&u,E[1]=u>>>8&255,r.check=B(r.check,E,2,0)),l=u=0}else r.head&&(r.head.extra=null);r.mode=6;case 6:if(1024&r.flags&&(o<(d=r.length)&&(d=o),d&&(r.head&&(k=r.head.extra_len-r.length,r.head.extra||(r.head.extra=new Array(r.head.extra_len)),I.arraySet(r.head.extra,n,s,d,k)),512&r.flags&&(r.check=B(r.check,n,d,s)),o-=d,s+=d,r.length-=d),r.length))break e;r.length=0,r.mode=7;case 7:if(2048&r.flags){if(0===o)break e;for(d=0;k=n[s+d++],r.head&&k&&r.length<65536&&(r.head.name+=String.fromCharCode(k)),k&&d<o;);if(512&r.flags&&(r.check=B(r.check,n,d,s)),o-=d,s+=d,k)break e}else r.head&&(r.head.name=null);r.length=0,r.mode=8;case 8:if(4096&r.flags){if(0===o)break e;for(d=0;k=n[s+d++],r.head&&k&&r.length<65536&&(r.head.comment+=String.fromCharCode(k)),k&&d<o;);if(512&r.flags&&(r.check=B(r.check,n,d,s)),o-=d,s+=d,k)break e}else r.head&&(r.head.comment=null);r.mode=9;case 9:if(512&r.flags){for(;l<16;){if(0===o)break e;o--,u+=n[s++]<<l,l+=8}if(u!==(65535&r.check)){e.msg="header crc mismatch",r.mode=30;break}l=u=0}r.head&&(r.head.hcrc=r.flags>>9&1,r.head.done=!0),e.adler=r.check=0,r.mode=12;break;case 10:for(;l<32;){if(0===o)break e;o--,u+=n[s++]<<l,l+=8}e.adler=r.check=L(u),l=u=0,r.mode=11;case 11:if(0===r.havedict)return e.next_out=a,e.avail_out=h,e.next_in=s,e.avail_in=o,r.hold=u,r.bits=l,2;e.adler=r.check=1,r.mode=12;case 12:if(5===t||6===t)break e;case 13:if(r.last){u>>>=7&l,l-=7&l,r.mode=27;break}for(;l<3;){if(0===o)break e;o--,u+=n[s++]<<l,l+=8}switch(r.last=1&u,l-=1,3&(u>>>=1)){case 0:r.mode=14;break;case 1:if(j(r),r.mode=20,6!==t)break;u>>>=2,l-=2;break e;case 2:r.mode=17;break;case 3:e.msg="invalid block type",r.mode=30}u>>>=2,l-=2;break;case 14:for(u>>>=7&l,l-=7&l;l<32;){if(0===o)break e;o--,u+=n[s++]<<l,l+=8}if((65535&u)!=(u>>>16^65535)){e.msg="invalid stored block lengths",r.mode=30;break}if(r.length=65535&u,l=u=0,r.mode=15,6===t)break e;case 15:r.mode=16;case 16:if(d=r.length){if(o<d&&(d=o),h<d&&(d=h),0===d)break e;I.arraySet(i,n,s,d,a),o-=d,s+=d,h-=d,a+=d,r.length-=d;break}r.mode=12;break;case 17:for(;l<14;){if(0===o)break e;o--,u+=n[s++]<<l,l+=8}if(r.nlen=257+(31&u),u>>>=5,l-=5,r.ndist=1+(31&u),u>>>=5,l-=5,r.ncode=4+(15&u),u>>>=4,l-=4,286<r.nlen||30<r.ndist){e.msg="too many length or distance symbols",r.mode=30;break}r.have=0,r.mode=18;case 18:for(;r.have<r.ncode;){for(;l<3;){if(0===o)break e;o--,u+=n[s++]<<l,l+=8}r.lens[A[r.have++]]=7&u,u>>>=3,l-=3}for(;r.have<19;)r.lens[A[r.have++]]=0;if(r.lencode=r.lendyn,r.lenbits=7,S={bits:r.lenbits},x=T(0,r.lens,0,19,r.lencode,0,r.work,S),r.lenbits=S.bits,x){e.msg="invalid code lengths set",r.mode=30;break}r.have=0,r.mode=19;case 19:for(;r.have<r.nlen+r.ndist;){for(;g=(C=r.lencode[u&(1<<r.lenbits)-1])>>>16&255,b=65535&C,!((_=C>>>24)<=l);){if(0===o)break e;o--,u+=n[s++]<<l,l+=8}if(b<16)u>>>=_,l-=_,r.lens[r.have++]=b;else{if(16===b){for(z=_+2;l<z;){if(0===o)break e;o--,u+=n[s++]<<l,l+=8}if(u>>>=_,l-=_,0===r.have){e.msg="invalid bit length repeat",r.mode=30;break}k=r.lens[r.have-1],d=3+(3&u),u>>>=2,l-=2}else if(17===b){for(z=_+3;l<z;){if(0===o)break e;o--,u+=n[s++]<<l,l+=8}l-=_,k=0,d=3+(7&(u>>>=_)),u>>>=3,l-=3}else{for(z=_+7;l<z;){if(0===o)break e;o--,u+=n[s++]<<l,l+=8}l-=_,k=0,d=11+(127&(u>>>=_)),u>>>=7,l-=7}if(r.have+d>r.nlen+r.ndist){e.msg="invalid bit length repeat",r.mode=30;break}for(;d--;)r.lens[r.have++]=k}}if(30===r.mode)break;if(0===r.lens[256]){e.msg="invalid code -- missing end-of-block",r.mode=30;break}if(r.lenbits=9,S={bits:r.lenbits},x=T(D,r.lens,0,r.nlen,r.lencode,0,r.work,S),r.lenbits=S.bits,x){e.msg="invalid literal/lengths set",r.mode=30;break}if(r.distbits=6,r.distcode=r.distdyn,S={bits:r.distbits},x=T(F,r.lens,r.nlen,r.ndist,r.distcode,0,r.work,S),r.distbits=S.bits,x){e.msg="invalid distances set",r.mode=30;break}if(r.mode=20,6===t)break e;case 20:r.mode=21;case 21:if(6<=o&&258<=h){e.next_out=a,e.avail_out=h,e.next_in=s,e.avail_in=o,r.hold=u,r.bits=l,R(e,c),a=e.next_out,i=e.output,h=e.avail_out,s=e.next_in,n=e.input,o=e.avail_in,u=r.hold,l=r.bits,12===r.mode&&(r.back=-1);break}for(r.back=0;g=(C=r.lencode[u&(1<<r.lenbits)-1])>>>16&255,b=65535&C,!((_=C>>>24)<=l);){if(0===o)break e;o--,u+=n[s++]<<l,l+=8}if(g&&0==(240&g)){for(v=_,y=g,w=b;g=(C=r.lencode[w+((u&(1<<v+y)-1)>>v)])>>>16&255,b=65535&C,!(v+(_=C>>>24)<=l);){if(0===o)break e;o--,u+=n[s++]<<l,l+=8}u>>>=v,l-=v,r.back+=v}if(u>>>=_,l-=_,r.back+=_,r.length=b,0===g){r.mode=26;break}if(32&g){r.back=-1,r.mode=12;break}if(64&g){e.msg="invalid literal/length code",r.mode=30;break}r.extra=15&g,r.mode=22;case 22:if(r.extra){for(z=r.extra;l<z;){if(0===o)break e;o--,u+=n[s++]<<l,l+=8}r.length+=u&(1<<r.extra)-1,u>>>=r.extra,l-=r.extra,r.back+=r.extra}r.was=r.length,r.mode=23;case 23:for(;g=(C=r.distcode[u&(1<<r.distbits)-1])>>>16&255,b=65535&C,!((_=C>>>24)<=l);){if(0===o)break e;o--,u+=n[s++]<<l,l+=8}if(0==(240&g)){for(v=_,y=g,w=b;g=(C=r.distcode[w+((u&(1<<v+y)-1)>>v)])>>>16&255,b=65535&C,!(v+(_=C>>>24)<=l);){if(0===o)break e;o--,u+=n[s++]<<l,l+=8}u>>>=v,l-=v,r.back+=v}if(u>>>=_,l-=_,r.back+=_,64&g){e.msg="invalid distance code",r.mode=30;break}r.offset=b,r.extra=15&g,r.mode=24;case 24:if(r.extra){for(z=r.extra;l<z;){if(0===o)break e;o--,u+=n[s++]<<l,l+=8}r.offset+=u&(1<<r.extra)-1,u>>>=r.extra,l-=r.extra,r.back+=r.extra}if(r.offset>r.dmax){e.msg="invalid distance too far back",r.mode=30;break}r.mode=25;case 25:if(0===h)break e;if(d=c-h,r.offset>d){if((d=r.offset-d)>r.whave&&r.sane){e.msg="invalid distance too far back",r.mode=30;break}p=d>r.wnext?(d-=r.wnext,r.wsize-d):r.wnext-d,d>r.length&&(d=r.length),m=r.window}else m=i,p=a-r.offset,d=r.length;for(h<d&&(d=h),h-=d,r.length-=d;i[a++]=m[p++],--d;);0===r.length&&(r.mode=21);break;case 26:if(0===h)break e;i[a++]=r.length,h--,r.mode=21;break;case 27:if(r.wrap){for(;l<32;){if(0===o)break e;o--,u|=n[s++]<<l,l+=8}if(c-=h,e.total_out+=c,r.total+=c,c&&(e.adler=r.check=r.flags?B(r.check,i,c,a-c):O(r.check,i,c,a-c)),c=h,(r.flags?u:L(u))!==r.check){e.msg="incorrect data check",r.mode=30;break}l=u=0}r.mode=28;case 28:if(r.wrap&&r.flags){for(;l<32;){if(0===o)break e;o--,u+=n[s++]<<l,l+=8}if(u!==(4294967295&r.total)){e.msg="incorrect length check",r.mode=30;break}l=u=0}r.mode=29;case 29:x=1;break e;case 30:x=-3;break e;case 31:return-4;case 32:default:return U}return e.next_out=a,e.avail_out=h,e.next_in=s,e.avail_in=o,r.hold=u,r.bits=l,(r.wsize||c!==e.avail_out&&r.mode<30&&(r.mode<27||4!==t))&&Z(e,e.output,e.next_out,c-e.avail_out)?(r.mode=31,-4):(f-=e.avail_in,c-=e.avail_out,e.total_in+=f,e.total_out+=c,r.total+=c,r.wrap&&c&&(e.adler=r.check=r.flags?B(r.check,i,c,e.next_out-c):O(r.check,i,c,e.next_out-c)),e.data_type=r.bits+(r.last?64:0)+(12===r.mode?128:0)+(20===r.mode||15===r.mode?256:0),(0==f&&0===c||4===t)&&x===N&&(x=-5),x)},r.inflateEnd=function(e){if(!e||!e.state)return U;var t=e.state;return t.window&&(t.window=null),e.state=null,N},r.inflateGetHeader=function(e,t){var r;return e&&e.state?0==(2&(r=e.state).wrap)?U:((r.head=t).done=!1,N):U},r.inflateSetDictionary=function(e,t){var r,n=t.length;return e&&e.state?0!==(r=e.state).wrap&&11!==r.mode?U:11===r.mode&&O(1,t,n,0)!==r.check?-3:Z(e,t,n,n)?(r.mode=31,-4):(r.havedict=1,N):U},r.inflateInfo="pako inflate (from Nodeca project)"},{"../utils/common":41,"./adler32":43,"./crc32":45,"./inffast":48,"./inftrees":50}],50:[function(e,t,r){"use strict";var D=e("../utils/common"),F=[3,4,5,6,7,8,9,10,11,13,15,17,19,23,27,31,35,43,51,59,67,83,99,115,131,163,195,227,258,0,0],N=[16,16,16,16,16,16,16,16,17,17,17,17,18,18,18,18,19,19,19,19,20,20,20,20,21,21,21,21,16,72,78],U=[1,2,3,4,5,7,9,13,17,25,33,49,65,97,129,193,257,385,513,769,1025,1537,2049,3073,4097,6145,8193,12289,16385,24577,0,0],P=[16,16,16,16,17,17,18,18,19,19,20,20,21,21,22,22,23,23,24,24,25,25,26,26,27,27,28,28,29,29,64,64];t.exports=function(e,t,r,n,i,s,a,o){var h,u,l,f,c,d,p,m,_,g=o.bits,b=0,v=0,y=0,w=0,k=0,x=0,S=0,z=0,C=0,E=0,A=null,I=0,O=new D.Buf16(16),B=new D.Buf16(16),R=null,T=0;for(b=0;b<=15;b++)O[b]=0;for(v=0;v<n;v++)O[t[r+v]]++;for(k=g,w=15;1<=w&&0===O[w];w--);if(w<k&&(k=w),0===w)return i[s++]=20971520,i[s++]=20971520,o.bits=1,0;for(y=1;y<w&&0===O[y];y++);for(k<y&&(k=y),b=z=1;b<=15;b++)if(z<<=1,(z-=O[b])<0)return-1;if(0<z&&(0===e||1!==w))return-1;for(B[1]=0,b=1;b<15;b++)B[b+1]=B[b]+O[b];for(v=0;v<n;v++)0!==t[r+v]&&(a[B[t[r+v]]++]=v);if(d=0===e?(A=R=a,19):1===e?(A=F,I-=257,R=N,T-=257,256):(A=U,R=P,-1),b=y,c=s,S=v=E=0,l=-1,f=(C=1<<(x=k))-1,1===e&&852<C||2===e&&592<C)return 1;for(;;){for(p=b-S,_=a[v]<d?(m=0,a[v]):a[v]>d?(m=R[T+a[v]],A[I+a[v]]):(m=96,0),h=1<<b-S,y=u=1<<x;i[c+(E>>S)+(u-=h)]=p<<24|m<<16|_|0,0!==u;);for(h=1<<b-1;E&h;)h>>=1;if(0!==h?(E&=h-1,E+=h):E=0,v++,0==--O[b]){if(b===w)break;b=t[r+a[v]]}if(k<b&&(E&f)!==l){for(0===S&&(S=k),c+=y,z=1<<(x=b-S);x+S<w&&!((z-=O[x+S])<=0);)x++,z<<=1;if(C+=1<<x,1===e&&852<C||2===e&&592<C)return 1;i[l=E&f]=k<<24|x<<16|c-s|0}}return 0!==E&&(i[c+E]=b-S<<24|64<<16|0),o.bits=k,0}},{"../utils/common":41}],51:[function(e,t,r){"use strict";t.exports={2:"need dictionary",1:"stream end",0:"","-1":"file error","-2":"stream error","-3":"data error","-4":"insufficient memory","-5":"buffer error","-6":"incompatible version"}},{}],52:[function(e,t,r){"use strict";var i=e("../utils/common"),o=0,h=1;function n(e){for(var t=e.length;0<=--t;)e[t]=0}var s=0,a=29,u=256,l=u+1+a,f=30,c=19,_=2*l+1,g=15,d=16,p=7,m=256,b=16,v=17,y=18,w=[0,0,0,0,0,0,0,0,1,1,1,1,2,2,2,2,3,3,3,3,4,4,4,4,5,5,5,5,0],k=[0,0,0,0,1,1,2,2,3,3,4,4,5,5,6,6,7,7,8,8,9,9,10,10,11,11,12,12,13,13],x=[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,3,7],S=[16,17,18,0,8,7,9,6,10,5,11,4,12,3,13,2,14,1,15],z=new Array(2*(l+2));n(z);var C=new Array(2*f);n(C);var E=new Array(512);n(E);var A=new Array(256);n(A);var I=new Array(a);n(I);var O,B,R,T=new Array(f);function D(e,t,r,n,i){this.static_tree=e,this.extra_bits=t,this.extra_base=r,this.elems=n,this.max_length=i,this.has_stree=e&&e.length}function F(e,t){this.dyn_tree=e,this.max_code=0,this.stat_desc=t}function N(e){return e<256?E[e]:E[256+(e>>>7)]}function U(e,t){e.pending_buf[e.pending++]=255&t,e.pending_buf[e.pending++]=t>>>8&255}function P(e,t,r){e.bi_valid>d-r?(e.bi_buf|=t<<e.bi_valid&65535,U(e,e.bi_buf),e.bi_buf=t>>d-e.bi_valid,e.bi_valid+=r-d):(e.bi_buf|=t<<e.bi_valid&65535,e.bi_valid+=r)}function L(e,t,r){P(e,r[2*t],r[2*t+1])}function j(e,t){for(var r=0;r|=1&e,e>>>=1,r<<=1,0<--t;);return r>>>1}function Z(e,t,r){var n,i,s=new Array(g+1),a=0;for(n=1;n<=g;n++)s[n]=a=a+r[n-1]<<1;for(i=0;i<=t;i++){var o=e[2*i+1];0!==o&&(e[2*i]=j(s[o]++,o))}}function W(e){var t;for(t=0;t<l;t++)e.dyn_ltree[2*t]=0;for(t=0;t<f;t++)e.dyn_dtree[2*t]=0;for(t=0;t<c;t++)e.bl_tree[2*t]=0;e.dyn_ltree[2*m]=1,e.opt_len=e.static_len=0,e.last_lit=e.matches=0}function M(e){8<e.bi_valid?U(e,e.bi_buf):0<e.bi_valid&&(e.pending_buf[e.pending++]=e.bi_buf),e.bi_buf=0,e.bi_valid=0}function H(e,t,r,n){var i=2*t,s=2*r;return e[i]<e[s]||e[i]===e[s]&&n[t]<=n[r]}function G(e,t,r){for(var n=e.heap[r],i=r<<1;i<=e.heap_len&&(i<e.heap_len&&H(t,e.heap[i+1],e.heap[i],e.depth)&&i++,!H(t,n,e.heap[i],e.depth));)e.heap[r]=e.heap[i],r=i,i<<=1;e.heap[r]=n}function K(e,t,r){var n,i,s,a,o=0;if(0!==e.last_lit)for(;n=e.pending_buf[e.d_buf+2*o]<<8|e.pending_buf[e.d_buf+2*o+1],i=e.pending_buf[e.l_buf+o],o++,0===n?L(e,i,t):(L(e,(s=A[i])+u+1,t),0!==(a=w[s])&&P(e,i-=I[s],a),L(e,s=N(--n),r),0!==(a=k[s])&&P(e,n-=T[s],a)),o<e.last_lit;);L(e,m,t)}function Y(e,t){var r,n,i,s=t.dyn_tree,a=t.stat_desc.static_tree,o=t.stat_desc.has_stree,h=t.stat_desc.elems,u=-1;for(e.heap_len=0,e.heap_max=_,r=0;r<h;r++)0!==s[2*r]?(e.heap[++e.heap_len]=u=r,e.depth[r]=0):s[2*r+1]=0;for(;e.heap_len<2;)s[2*(i=e.heap[++e.heap_len]=u<2?++u:0)]=1,e.depth[i]=0,e.opt_len--,o&&(e.static_len-=a[2*i+1]);for(t.max_code=u,r=e.heap_len>>1;1<=r;r--)G(e,s,r);for(i=h;r=e.heap[1],e.heap[1]=e.heap[e.heap_len--],G(e,s,1),n=e.heap[1],e.heap[--e.heap_max]=r,e.heap[--e.heap_max]=n,s[2*i]=s[2*r]+s[2*n],e.depth[i]=(e.depth[r]>=e.depth[n]?e.depth[r]:e.depth[n])+1,s[2*r+1]=s[2*n+1]=i,e.heap[1]=i++,G(e,s,1),2<=e.heap_len;);e.heap[--e.heap_max]=e.heap[1],function(e,t){var r,n,i,s,a,o,h=t.dyn_tree,u=t.max_code,l=t.stat_desc.static_tree,f=t.stat_desc.has_stree,c=t.stat_desc.extra_bits,d=t.stat_desc.extra_base,p=t.stat_desc.max_length,m=0;for(s=0;s<=g;s++)e.bl_count[s]=0;for(h[2*e.heap[e.heap_max]+1]=0,r=e.heap_max+1;r<_;r++)p<(s=h[2*h[2*(n=e.heap[r])+1]+1]+1)&&(s=p,m++),h[2*n+1]=s,u<n||(e.bl_count[s]++,a=0,d<=n&&(a=c[n-d]),o=h[2*n],e.opt_len+=o*(s+a),f&&(e.static_len+=o*(l[2*n+1]+a)));if(0!==m){do{for(s=p-1;0===e.bl_count[s];)s--;e.bl_count[s]--,e.bl_count[s+1]+=2,e.bl_count[p]--,m-=2}while(0<m);for(s=p;0!==s;s--)for(n=e.bl_count[s];0!==n;)u<(i=e.heap[--r])||(h[2*i+1]!==s&&(e.opt_len+=(s-h[2*i+1])*h[2*i],h[2*i+1]=s),n--)}}(e,t),Z(s,u,e.bl_count)}function X(e,t,r){var n,i,s=-1,a=t[1],o=0,h=7,u=4;for(0===a&&(h=138,u=3),t[2*(r+1)+1]=65535,n=0;n<=r;n++)i=a,a=t[2*(n+1)+1],++o<h&&i===a||(o<u?e.bl_tree[2*i]+=o:0!==i?(i!==s&&e.bl_tree[2*i]++,e.bl_tree[2*b]++):o<=10?e.bl_tree[2*v]++:e.bl_tree[2*y]++,s=i,u=(o=0)===a?(h=138,3):i===a?(h=6,3):(h=7,4))}function V(e,t,r){var n,i,s=-1,a=t[1],o=0,h=7,u=4;for(0===a&&(h=138,u=3),n=0;n<=r;n++)if(i=a,a=t[2*(n+1)+1],!(++o<h&&i===a)){if(o<u)for(;L(e,i,e.bl_tree),0!=--o;);else 0!==i?(i!==s&&(L(e,i,e.bl_tree),o--),L(e,b,e.bl_tree),P(e,o-3,2)):o<=10?(L(e,v,e.bl_tree),P(e,o-3,3)):(L(e,y,e.bl_tree),P(e,o-11,7));s=i,u=(o=0)===a?(h=138,3):i===a?(h=6,3):(h=7,4)}}n(T);var q=!1;function J(e,t,r,n){P(e,(s<<1)+(n?1:0),3),function(e,t,r,n){M(e),n&&(U(e,r),U(e,~r)),i.arraySet(e.pending_buf,e.window,t,r,e.pending),e.pending+=r}(e,t,r,!0)}r._tr_init=function(e){q||(function(){var e,t,r,n,i,s=new Array(g+1);for(n=r=0;n<a-1;n++)for(I[n]=r,e=0;e<1<<w[n];e++)A[r++]=n;for(A[r-1]=n,n=i=0;n<16;n++)for(T[n]=i,e=0;e<1<<k[n];e++)E[i++]=n;for(i>>=7;n<f;n++)for(T[n]=i<<7,e=0;e<1<<k[n]-7;e++)E[256+i++]=n;for(t=0;t<=g;t++)s[t]=0;for(e=0;e<=143;)z[2*e+1]=8,e++,s[8]++;for(;e<=255;)z[2*e+1]=9,e++,s[9]++;for(;e<=279;)z[2*e+1]=7,e++,s[7]++;for(;e<=287;)z[2*e+1]=8,e++,s[8]++;for(Z(z,l+1,s),e=0;e<f;e++)C[2*e+1]=5,C[2*e]=j(e,5);O=new D(z,w,u+1,l,g),B=new D(C,k,0,f,g),R=new D(new Array(0),x,0,c,p)}(),q=!0),e.l_desc=new F(e.dyn_ltree,O),e.d_desc=new F(e.dyn_dtree,B),e.bl_desc=new F(e.bl_tree,R),e.bi_buf=0,e.bi_valid=0,W(e)},r._tr_stored_block=J,r._tr_flush_block=function(e,t,r,n){var i,s,a=0;0<e.level?(2===e.strm.data_type&&(e.strm.data_type=function(e){var t,r=4093624447;for(t=0;t<=31;t++,r>>>=1)if(1&r&&0!==e.dyn_ltree[2*t])return o;if(0!==e.dyn_ltree[18]||0!==e.dyn_ltree[20]||0!==e.dyn_ltree[26])return h;for(t=32;t<u;t++)if(0!==e.dyn_ltree[2*t])return h;return o}(e)),Y(e,e.l_desc),Y(e,e.d_desc),a=function(e){var t;for(X(e,e.dyn_ltree,e.l_desc.max_code),X(e,e.dyn_dtree,e.d_desc.max_code),Y(e,e.bl_desc),t=c-1;3<=t&&0===e.bl_tree[2*S[t]+1];t--);return e.opt_len+=3*(t+1)+5+5+4,t}(e),i=e.opt_len+3+7>>>3,(s=e.static_len+3+7>>>3)<=i&&(i=s)):i=s=r+5,r+4<=i&&-1!==t?J(e,t,r,n):4===e.strategy||s===i?(P(e,2+(n?1:0),3),K(e,z,C)):(P(e,4+(n?1:0),3),function(e,t,r,n){var i;for(P(e,t-257,5),P(e,r-1,5),P(e,n-4,4),i=0;i<n;i++)P(e,e.bl_tree[2*S[i]+1],3);V(e,e.dyn_ltree,t-1),V(e,e.dyn_dtree,r-1)}(e,e.l_desc.max_code+1,e.d_desc.max_code+1,a+1),K(e,e.dyn_ltree,e.dyn_dtree)),W(e),n&&M(e)},r._tr_tally=function(e,t,r){return e.pending_buf[e.d_buf+2*e.last_lit]=t>>>8&255,e.pending_buf[e.d_buf+2*e.last_lit+1]=255&t,e.pending_buf[e.l_buf+e.last_lit]=255&r,e.last_lit++,0===t?e.dyn_ltree[2*r]++:(e.matches++,t--,e.dyn_ltree[2*(A[r]+u+1)]++,e.dyn_dtree[2*N(t)]++),e.last_lit===e.lit_bufsize-1},r._tr_align=function(e){P(e,2,3),L(e,m,z),function(e){16===e.bi_valid?(U(e,e.bi_buf),e.bi_buf=0,e.bi_valid=0):8<=e.bi_valid&&(e.pending_buf[e.pending++]=255&e.bi_buf,e.bi_buf>>=8,e.bi_valid-=8)}(e)}},{"../utils/common":41}],53:[function(e,t,r){"use strict";t.exports=function(){this.input=null,this.next_in=0,this.avail_in=0,this.total_in=0,this.output=null,this.next_out=0,this.avail_out=0,this.total_out=0,this.msg="",this.state=null,this.data_type=2,this.adler=0}},{}],54:[function(e,t,r){(function(e){!function(r,n){"use strict";if(!r.setImmediate){var i,s,t,a,o=1,h={},u=!1,l=r.document,e=Object.getPrototypeOf&&Object.getPrototypeOf(r);e=e&&e.setTimeout?e:r,i="[object process]"==={}.toString.call(r.process)?function(e){process.nextTick(function(){c(e)})}:function(){if(r.postMessage&&!r.importScripts){var e=!0,t=r.onmessage;return r.onmessage=function(){e=!1},r.postMessage("","*"),r.onmessage=t,e}}()?(a="setImmediate$"+Math.random()+"$",r.addEventListener?r.addEventListener("message",d,!1):r.attachEvent("onmessage",d),function(e){r.postMessage(a+e,"*")}):r.MessageChannel?((t=new MessageChannel).port1.onmessage=function(e){c(e.data)},function(e){t.port2.postMessage(e)}):l&&"onreadystatechange"in l.createElement("script")?(s=l.documentElement,function(e){var t=l.createElement("script");t.onreadystatechange=function(){c(e),t.onreadystatechange=null,s.removeChild(t),t=null},s.appendChild(t)}):function(e){setTimeout(c,0,e)},e.setImmediate=function(e){"function"!=typeof e&&(e=new Function(""+e));for(var t=new Array(arguments.length-1),r=0;r<t.length;r++)t[r]=arguments[r+1];var n={callback:e,args:t};return h[o]=n,i(o),o++},e.clearImmediate=f}function f(e){delete h[e]}function c(e){if(u)setTimeout(c,0,e);else{var t=h[e];if(t){u=!0;try{!function(e){var t=e.callback,r=e.args;switch(r.length){case 0:t();break;case 1:t(r[0]);break;case 2:t(r[0],r[1]);break;case 3:t(r[0],r[1],r[2]);break;default:t.apply(n,r)}}(t)}finally{f(e),u=!1}}}}function d(e){e.source===r&&"string"==typeof e.data&&0===e.data.indexOf(a)&&c(+e.data.slice(a.length))}}("undefined"==typeof self?void 0===e?this:e:self)}).call(this,"undefined"!=typeof global?global:"undefined"!=typeof self?self:"undefined"!=typeof window?window:{})},{}]},{},[10])(10)});
;
const AnalysisConfig = Object.freeze({
  ASSET_VERSION: '0.5.2',
  MAX_FILE_BYTES: 150 * 1024 * 1024,
  FILE_LIMIT_LABEL: '150 MiB',
  MAX_LINES: 10_000_000,
  MAX_ARCHIVE_ENTRIES: 1_000,
  PAGE_SIZE: 100,
  QUERY_DEBOUNCE_MS: 180,
  ROW_PREVIEW_CHARS: 450,
  CONTEXT_BEFORE: 12,
  CONTEXT_AFTER: 32,
  CONTEXT_LINE_CHARS: 16_000,
  MAX_PACKAGE_BYTES: 20 * 1024 * 1024,
  PACKAGE_LIMIT_LABEL: '20 MiB',
  MAX_PACKAGES: 10_000,
  MAX_PACKAGE_FILES: 100_000,
  PACKAGE_PAGE_SIZE: 50,
  MAX_SETTINGS_BYTES: 2 * 1024 * 1024,
  SETTINGS_LIMIT_LABEL: '2 MiB per file',
  MAX_SETTINGS_RECORDS: 20_000,
  MAX_SETTINGS_LINES: 25_000,
  MAX_SETTING_LINE_CHARS: 100_000,
  SETTINGS_PAGE_SIZE: 50,
  MAX_GETPROP_BYTES: 2 * 1024 * 1024,
  GETPROP_LIMIT_LABEL: '2 MiB',
  MAX_GETPROP_RECORDS: 20_000,
  MAX_GETPROP_LINES: 25_000,
  MAX_GETPROP_RECORD_CHARS: 100_000,
  GETPROP_PAGE_SIZE: 50,
});

// Metadata checks must run before reading bytes, on both sides of the worker.
function validateCapture(file, tool = 'logcat') {
  if (!file || typeof file.name !== 'string' || !Number.isSafeInteger(file.size) || file.size < 0) {
    return 'Choose a valid file from your device.';
  }
  if (file.size === 0) return 'This file is empty. Choose a capture with data.';
  const packages = tool === 'packages';
  const settings = tool === 'settings';
  const properties = tool === 'getprop';
  const limit = properties ? AnalysisConfig.MAX_GETPROP_BYTES : settings ? AnalysisConfig.MAX_SETTINGS_BYTES : packages ? AnalysisConfig.MAX_PACKAGE_BYTES : AnalysisConfig.MAX_FILE_BYTES;
  const label = properties ? AnalysisConfig.GETPROP_LIMIT_LABEL : settings ? AnalysisConfig.SETTINGS_LIMIT_LABEL : packages ? AnalysisConfig.PACKAGE_LIMIT_LABEL : AnalysisConfig.FILE_LIMIT_LABEL;
  if (file.size > limit) {
    return `This file exceeds the ${label} limit. Choose a smaller capture.`;
  }
  if (packages) return /\.json$/i.test(file.name) ? null : 'Choose a packages.json inventory file.';
  if (properties) return /\.txt$/i.test(file.name) ? null : 'Choose a getprop text export (.txt).';
  if (settings) return /\.txt$/i.test(file.name) ? null : 'Choose a settings_global.txt, settings_secure.txt, or settings_system.txt export.';
  if (!/\.(txt|log|zip)$/i.test(file.name)) return 'Choose a .txt, .log, or .zip file.';
  return null;
}

;
// Curated public-source evidence, not a reputation or APK-signature database.
// Exact-ID evidence and namespace hints are separate; hints never assign country.
const PackageOrigins = (() => {
  'use strict';
  const VERSION = '2026-09-22.2';
  const CHECKED_AT = '2026-09-22';
  const SCOPE = 'China-linked means a listed publisher based in mainland China, or a documented parent group with substantial operations there. Publisher location and group links are shown separately.';
  const LIMITATION = 'Exact-ID catalogue matches record publisher evidence. Namespace hints suggest a publisher or platform but leave country unverified. Neither authenticates the installed APK or assesses app safety. Unclassified does not mean non-Chinese; a publisher listed elsewhere does not exclude other China connections.';
  const play = id => ({ title: 'Google Play publisher listing', url: `https://play.google.com/store/apps/details?id=${id}&hl=en` });
  const oneplus = (id, appName) => [id, {
    status: 'china-linked', basis: 'china-publisher', app_name: appName,
    publisher: 'OnePlus Ltd. / 深圳市万普拉斯科技有限公司', publisher_country: 'CN', group: null,
    reason: 'The exact package listing identifies this publisher with a registered address in Shenzhen, China.',
    sources: [play(id)],
  }];
  const review = (id, appName, publisher, reason) => [id, {
    status: 'needs-review', basis: 'unresolved', app_name: appName,
    publisher, publisher_country: 'SG', group: null, reason, sources: [play(id)],
  }];
  const listedPublisher = (id, appName, publisher, country) => [id, {
    status: 'publisher-recorded', basis: 'listed-publisher', app_name: appName,
    publisher, publisher_country: country, group: null,
    reason: 'The current listing for this exact package ID identifies this publisher and country. Parent-company connections and the installed APK signer have not been established by this rule.',
    sources: [play(id)],
  }];
  const entries = [
    listedPublisher('com.sec.android.app.sbrowser', 'Samsung Browser', 'Samsung Electronics Co., Ltd.', 'KR'),
    listedPublisher('com.samsung.android.app.notes', 'Samsung Notes', 'Samsung Electronics Co., Ltd.', 'KR'),
    listedPublisher('com.google.android.gm', 'Gmail', 'Google LLC', 'US'),
    listedPublisher('com.android.chrome', 'Google Chrome', 'Google LLC', 'US'),
    listedPublisher('com.microsoft.office.outlook', 'Microsoft Outlook', 'Microsoft Corporation', 'US'),
    listedPublisher('com.facebook.katana', 'Facebook', 'Meta Platforms, Inc.', 'US'),
    oneplus('com.oneplus.note', 'OnePlus Notes'),
    oneplus('com.oneplus.backuprestore', 'Clone Phone - OnePlus app'),
    oneplus('net.oneplus.forums', 'OnePlus Community'),
    ['com.wondershare.transmore', {
      status: 'china-linked', basis: 'china-publisher', app_name: 'Tracover: Chat Track & Recover',
      publisher: 'Shenzhen Wondershare Software Co., Ltd.', publisher_country: 'CN', group: null,
      reason: 'The current listing for this exact ID names a developer with a Shenzhen, China address. The current store title may differ from the version in the inventory.',
      sources: [play('com.wondershare.transmore')],
    }],
    ['com.einnovation.temu', {
      status: 'china-linked', basis: 'china-operating-group', app_name: 'Temu',
      publisher: 'Whaleco Inc.', publisher_country: 'US', group: 'PDD Holdings',
      reason: 'PDD lists Whaleco Inc. as a subsidiary and Temu as its platform. Its 2025 annual report describes substantial China operations and assets. This is a group-operation link: Whaleco is US-incorporated, and PDD is Cayman-incorporated with principal offices in Ireland.',
      sources: [play('com.einnovation.temu'), { title: 'PDD 2025 annual report, cover, pp. 1–5, 164 and Exhibit 8.1', url: 'https://investor.pddholdings.com/static-files/92dafbdc-3125-4f2c-a28f-3d61203efbaf' }],
    }],
    review('com.oplus.melody', 'Wireless Earphones', 'HEYTAP PTE. LTD.', 'The listing describes an OPPO/OnePlus earphone utility but names a Singapore publisher. A controlling-company connection has not been established in this catalogue.'),
    review('com.oppo.quicksearchbox', 'Global Search', 'HEYTAP PTE. LTD.', 'The listed publisher is in Singapore. The package namespace alone does not establish its current controlling company or a China link.'),
    review('com.lenovo.anyshare.gps', 'SHAREit', 'SMART MEDIA4U TECHNOLOGY PTE. LTD.', 'The current listing names a Singapore publisher. The historical-looking package namespace is insufficient to establish current ownership.'),
    review('com.camerasideas.instashot', 'InShot', 'SHANTANU PTE. LIMITED', 'The current listing names a Singapore publisher. A China-based controlling company has not been established in this catalogue.'),
    review('com.oakever.tiletrip', 'Tile Explorer - Triple Match', 'OAKEVER GAMES PTE. LTD.', 'The current listing names a Singapore publisher. A China-based controlling company has not been established in this catalogue.'),
    ['com.oneplus.soundrecorder', {
      status: 'needs-review', basis: 'unresolved', app_name: null,
      publisher: null, publisher_country: null, group: null,
      reason: 'The namespace suggests OnePlus, whose policy identifies a Shenzhen company, but this exact package-to-publisher mapping was not verified. It is excluded from documented matches.',
      sources: [{ title: 'OnePlus privacy policy (brand evidence only)', url: 'https://www.oneplus.com/gr/legal/privacy-policy' }],
    }],
  ];
  const catalogue = new Map(entries);
  if (catalogue.size !== entries.length) throw new Error('Duplicate package ID in origin catalogue.');
  for (const [id, entry] of catalogue) {
    if (!entry.sources.length || entry.sources.some(source => !/^https:\/\//.test(source.url))) throw new Error(`Missing HTTPS evidence for ${id}.`);
  }

  // The source demonstrates the namespace on an official app; it does NOT
  // verify every ID sharing it. These rules create hints, never country labels.
  const namespaceHints = [
    { prefix: 'com.samsung.', name: 'Samsung', source: play('com.samsung.android.app.notes') },
    { prefix: 'com.sec.', name: 'Samsung', source: play('com.sec.android.app.sbrowser') },
    { prefix: 'com.google.', name: 'Google', source: play('com.google.android.gm') },
    { prefix: 'com.microsoft.', name: 'Microsoft', source: play('com.microsoft.office.outlook') },
    { prefix: 'com.facebook.', name: 'Meta / Facebook', source: play('com.facebook.katana') },
  ];
  const platformSource = { title: 'AOSP system-package documentation (platform context only)', url: 'https://source.android.com/docs/core/permissions/preinstalled-packages' };

  function lookup(name, pkg = {}) {
    const entry = catalogue.get(name);
    if (entry) return { ...entry, match_method: 'exact-package-id', publisher_hint: null, matched_namespace: null, matched_package: name, checked_at: CHECKED_AT, catalogue_version: VERSION, sources: entry.sources.map(source => ({ ...source })) };
    const hint = typeof name === 'string' ? namespaceHints.find(rule => name.startsWith(rule.prefix) && name.length > rule.prefix.length) : null;
    const platform = pkg.system === true && pkg.third_party !== true && typeof name === 'string' && (name === 'android' || name.startsWith('com.android.') || name.startsWith('android.'));
    if (hint || platform) {
      const prefix = hint?.prefix || (name === 'android' ? 'android' : name.startsWith('com.android.') ? 'com.android.' : 'android.');
      const source = hint ? { ...hint.source, title: 'Official example of this namespace (not this package)' } : platformSource;
      return {
        status: 'publisher-hint', basis: hint ? 'publisher-namespace' : 'platform-namespace',
        app_name: null, publisher: null, publisher_country: null, group: null,
        publisher_hint: hint?.name || 'Android platform / device vendor',
        matched_package: null, matched_namespace: prefix, match_method: 'namespace-hint',
        reason: hint
          ? `The ${prefix} namespace suggests ${hint.name}. This is an inference from the name, not verified publisher ownership. It does not establish the package country or rule out a China connection.`
          : 'The collector reports a system package using an Android platform namespace. Device manufacturers can modify and sign platform packages; their publisher and country remain unestablished.',
        checked_at: CHECKED_AT, catalogue_version: VERSION, sources: [{ ...source }],
      };
    }
    return {
      status: 'unclassified', basis: 'not-in-catalogue', app_name: null,
      publisher: null, publisher_country: null, group: null, matched_package: null,
      match_method: 'none', publisher_hint: null, matched_namespace: null,
      reason: 'No reviewed exact-ID rule is available. Country and ownership remain unestablished.',
      checked_at: null, catalogue_version: VERSION, sources: [],
    };
  }

  function metadata() {
    return { version: VERSION, checked_at: CHECKED_AT, scope: SCOPE, limitation: LIMITATION, match_method: 'exact-package-id-with-separate-namespace-hints', rule_count: catalogue.size, namespace_hint_rules: namespaceHints.length, platform_hints_require_system_flag: true };
  }
  return Object.freeze({ lookup, metadata });
})();

;
// Analyses inventory evidence only. It does not read APKs or perform reputation lookups.
importScripts('package-analysis.js?v=0.5.2');

;
// Read-only inspection of `adb shell settings list <namespace>` exports.
const SettingsAnalysis = (() => {
  'use strict';
  const VERSION = 1;
  const namespaces = ['global', 'secure', 'system'];
  const catalogue = new Map();
  const api = (namespace, anchor) => `https://developer.android.com/reference/android/provider/Settings.${namespace[0].toUpperCase() + namespace.slice(1)}#${anchor}`;
  const wifiSource = 'https://android.googlesource.com/platform/packages/apps/Settings/+/master/src/com/android/settings/development/WirelessDebuggingEnabler.java';
  const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);

  function add(namespace, key, label, category, type, extra = {}) {
    catalogue.set(`${namespace}:${key}`, { label, category, type, source: api(namespace, key.toUpperCase()), ...extra });
  }
  for (const [key, label, category] of [
    ['adb_enabled', 'USB debugging', 'Development'],
    ['development_settings_enabled', 'Developer options', 'Development'],
    ['wait_for_debugger', 'Wait for debugger', 'Development'],
    ['always_finish_activities', 'Finish activities immediately', 'Development'],
    ['airplane_mode_on', 'Airplane mode', 'Connectivity'],
    ['bluetooth_on', 'Bluetooth setting', 'Connectivity'],
    ['wifi_on', 'Wi-Fi setting', 'Connectivity'],
    ['data_roaming', 'Data roaming setting', 'Connectivity'],
    ['auto_time', 'Automatic clock setting', 'Time'],
    ['auto_time_zone', 'Automatic time-zone setting', 'Time'],
    ['device_provisioned', 'Device provisioning flag', 'Device'],
  ]) add('global', key, label, category, 'boolean');
  add('global', 'adb_wifi_enabled', 'Wireless debugging', 'Development', 'boolean', { source: wifiSource });
  add('global', 'debug_app', 'Debug target', 'Development', 'text');
  add('global', 'http_proxy', 'HTTP proxy setting', 'Connectivity', 'text');
  add('global', 'boot_count', 'Recorded boot count', 'Device', 'integer');
  add('global', 'stay_on_while_plugged_in', 'Keep awake while charging', 'Power', 'charging-mask');
  for (const key of ['window_animation_scale', 'transition_animation_scale', 'animator_duration_scale']) {
    add('global', key, key.replace(/_/g, ' '), 'Display', 'scale');
  }
  for (const [key, label, category] of [
    ['accessibility_enabled', 'Accessibility setting', 'Accessibility'],
    ['touch_exploration_enabled', 'Touch exploration', 'Accessibility'],
    ['accessibility_display_inversion_enabled', 'Colour inversion', 'Accessibility'],
  ]) add('secure', key, label, category, 'boolean');
  add('secure', 'android_id', 'Android identifier', 'Device', 'text', { note: 'Identifier scope varies by Android version, user, and signing identity.' });
  add('secure', 'default_input_method', 'Default input method', 'Input', 'text');
  add('secure', 'enabled_input_methods', 'Enabled input method records', 'Input', 'text');
  add('secure', 'enabled_accessibility_services', 'Accessibility service records', 'Accessibility', 'text', { note: 'A stored list does not prove a service is currently running.' });
  add('secure', 'location_mode', 'Legacy location mode', 'Location', 'legacy-location', { legacy: true, note: 'Deprecated since API 28; this export alone does not establish current location behaviour.' });
  add('secure', 'install_non_market_apps', 'Legacy external-install flag', 'Privacy & access', 'boolean', { legacy: true, note: 'Deprecated since API 26. Current install permission is per app and is not established here.' });
  add('secure', 'mock_location', 'Legacy mock-location flag', 'Location', 'boolean', { source: api('secure', 'ALLOW_MOCK_LOCATION'), legacy: true, note: 'Unused since API 23; this does not identify a current mock-location app.' });
  for (const [key, label, category] of [
    ['accelerometer_rotation', 'Automatic rotation', 'Display'],
    ['sound_effects_enabled', 'Touch sounds', 'Sound'],
  ]) add('system', key, label, category, 'boolean');
  add('system', 'dtmf_tone', 'Dial-pad tones', 'Sound', 'boolean', { source: api('system', 'DTMF_TONE_WHEN_DIALING') });
  add('system', 'haptic_feedback_enabled', 'Haptic feedback', 'Sound', 'boolean', { legacy: true, note: 'Deprecated since API 33; the vibration service applies user preferences.' });
  add('system', 'vibrate_when_ringing', 'Vibrate when ringing', 'Sound', 'boolean', { legacy: true, note: 'Deprecated since API 33; the vibration service applies user preferences for incoming calls.' });
  add('system', 'screen_brightness_mode', 'Brightness mode', 'Display', 'brightness-mode');
  add('system', 'screen_brightness', 'Stored brightness level', 'Display', 'integer', { note: 'A stored value, not a live brightness measurement. Device scaling can differ.' });
  add('system', 'screen_off_timeout', 'Inactivity timeout', 'Display', 'milliseconds', { note: 'Device policy and other features can affect the actual sleep or lock time.' });
  add('system', 'font_scale', 'Font-size preference', 'Display', 'positive-scale', { note: 'This preference does not measure the rendered text size.' });
  add('system', 'user_rotation', 'Stored rotation lock', 'Display', 'rotation', { note: 'Interpret with the automatic-rotation setting; this is not measured orientation.' });

  function namespaceForFile(name) {
    if (typeof name !== 'string') return null;
    return /^(?:settings[_-])?(global|secure|system)(?:[ _-]?\(\d+\))?\.txt$/i.exec(name)?.[1].toLowerCase() || null;
  }
  function validateFiles(files) {
    if (!Array.isArray(files) || files.length < 1 || files.length > 3) return 'Choose one to three settings exports, one per namespace.';
    const seen = new Set();
    for (const file of files) {
      const error = validateCapture(file, 'settings');
      if (error) return error;
      const namespace = namespaceForFile(file.name);
      if (!namespace) return 'Name the files settings_global.txt, settings_secure.txt, or settings_system.txt so their namespaces can be identified.';
      if (seen.has(namespace)) return `Choose only one ${namespace} export in this selection.`;
      seen.add(namespace);
    }
    return null;
  }

  function categoryHint(key) {
    // Browsing hints only: matching a name does not give a value a meaning.
    if (/adb|debug|development/.test(key)) return 'Development';
    if (/accessibility|touch_exploration/.test(key)) return 'Accessibility';
    if (/location|gps|gnss/.test(key)) return 'Location';
    if (/wifi|bluetooth|mobile_data|roaming|network|airplane|tether|proxy/.test(key)) return 'Connectivity';
    if (/battery|charging|low_power|sleep|doze|power|screensaver/.test(key)) return 'Power';
    if (/screen|display|brightness|animation|font|rotation|theme|refresh_rate/.test(key)) return 'Display';
    if (/volume|sound|ringtone|audio|vibrat|haptic|dtmf/.test(key)) return 'Sound';
    if (/keyboard|input_method|spell_checker|pointer|(?:^|_)ime(?:_|$)/.test(key)) return 'Input';
    if (/notification|lock|biometric|face|trust|backup|install|verifier/.test(key)) return 'Privacy & access';
    if (/time|clock|zone/.test(key)) return 'Time';
    return 'Other';
  }

  function interpret(definition, rawValue) {
    const value = rawValue.trim();
    if (!rawValue) return { text: 'Empty recorded value', valid: true };
    if (!value) return { text: 'Whitespace-only text recorded', valid: true };
    if (value === 'null') return { text: 'Literal "null" recorded; meaning not assumed', valid: true };
    if (!definition) return { text: 'Raw value; no documented interpretation in this catalogue', valid: true };
    const result = text => ({ text, valid: true });
    const unknown = () => ({ text: 'Value outside the supported interpretation; raw value retained', valid: false });
    if (definition.type === 'text') return result('Text value recorded');
    if (definition.type === 'boolean') return value === '0' || value === '1' ? result(`${definition.legacy ? 'Legacy flag' : 'Flag'} ${value === '1' ? 'on' : 'off'} (recorded)`) : unknown();
    if (definition.type === 'legacy-location') return /^(0|1|2|3)$/.test(value) ? result(`Legacy code ${value}; current location state not established`) : unknown();
    if (definition.type === 'brightness-mode') return value === '0' ? result('Manual mode recorded') : value === '1' ? result('Automatic mode recorded') : unknown();
    if (definition.type === 'rotation') return /^[0-3]$/.test(value) ? result(`${Number(value) * 90}° lock preference recorded`) : unknown();
    if (!/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(value)) return unknown();
    const numeric = Number(value);
    if (!Number.isFinite(numeric) || numeric > Number.MAX_SAFE_INTEGER) return unknown();
    if (['integer', 'milliseconds', 'charging-mask'].includes(definition.type) && !Number.isSafeInteger(numeric)) return unknown();
    if (definition.type === 'integer') return result(`${numeric} (recorded)`);
    if (definition.type === 'milliseconds') return result(`${numeric} ms · ${numeric / 1000} seconds`);
    if (definition.type === 'positive-scale' && numeric <= 0) return unknown();
    if (definition.type === 'scale' || definition.type === 'positive-scale') return result(`${numeric}× preference${numeric === 0 ? ' · animations disabled' : ''}`);
    if (definition.type === 'charging-mask') {
      if (numeric > 15) return unknown();
      return result(numeric === 0 ? 'Keep-awake charging flag off' : `Keep awake for: ${[[1, 'AC'], [2, 'USB'], [4, 'wireless'], [8, 'dock']].filter(([bit]) => numeric & bit).map(([, name]) => name).join(', ')}`);
    }
    return unknown();
  }

  function reviewFor(namespace, key, rawValue, interpretation) {
    const value = rawValue.trim();
    if (!interpretation.valid) return 'The catalogue cannot interpret this recorded value; check the device version or vendor definition.';
    if (namespace !== 'global') return null;
    if (['adb_enabled', 'adb_wifi_enabled'].includes(key) && value === '1') return 'Debugging is enabled in the recorded settings. Review if unexpected; connected clients and authorizations are not recorded.';
    if (key === 'development_settings_enabled' && value === '1') return 'Developer options are enabled in the snapshot; this can be intentional.';
    if (key === 'wait_for_debugger' && value === '1') return 'The debugger-wait flag can affect application startup.';
    if (key === 'always_finish_activities' && value === '1') return 'Immediate activity cleanup can affect application lifecycle behaviour.';
    if (key === 'debug_app' && value && value !== 'null') return 'A debug target is recorded. Check whether it is intended.';
    if (key === 'http_proxy' && value && !['null', ':0'].includes(value)) return 'A proxy value is recorded; this file does not establish whether it is active.';
    return null;
  }

  function analyse(inputs, progress = () => {}) {
    if (!Array.isArray(inputs) || inputs.length < 1 || inputs.length > 3) throw new Error('Provide one to three settings exports.');
    const records = [], files = [], issues = [], seen = new Set();
    let physicalLines = 0;
    for (const input of inputs) {
      if (!isObject(input) || !namespaces.includes(input.namespace) || typeof input.text !== 'string' || typeof input.source_file !== 'string') throw new Error('Each settings export needs a namespace, filename, and text.');
      if (seen.has(input.namespace)) throw new Error(`More than one ${input.namespace} export was supplied.`);
      seen.add(input.namespace);
      if (new TextEncoder().encode(input.text).byteLength > AnalysisConfig.MAX_SETTINGS_BYTES) throw new Error(`This settings export exceeds ${AnalysisConfig.SETTINGS_LIMIT_LABEL}.`);
      if (input.text.includes('\0')) throw new Error('Export settings as UTF-8 text; a NUL byte was found.');
      const lines = input.text.replace(/^\uFEFF/, '').split(/\r\n|\n|\r/);
      if (lines.at(-1) === '') lines.pop();
      physicalLines += lines.length;
      if (physicalLines > AnalysisConfig.MAX_SETTINGS_LINES) throw new Error('Too many settings lines. Split or reduce the exports.');
      let count = 0, invalid = 0;
      progress(`Reading ${input.namespace} settings…`, true);
      for (let index = 0; index < lines.length; index++) {
        const line = lines[index];
        if (line.length > AnalysisConfig.MAX_SETTING_LINE_CHARS) throw new Error(`Line ${index + 1} in ${input.source_file} is too long.`);
        if (!line.trim()) continue;
        const equal = line.indexOf('=');
        const key = equal < 0 ? '' : line.slice(0, equal).trim();
        if (!key || !/^[A-Za-z0-9_.:/-]+$/.test(key)) {
          invalid++;
          if (issues.length < 100) issues.push({ namespace: input.namespace, source_file: input.source_file, line: index + 1, message: 'Expected a setting name followed by = and its value.' });
          continue;
        }
        if (records.length >= AnalysisConfig.MAX_SETTINGS_RECORDS) throw new Error('Too many settings records. Reduce the exports.');
        // Only the first '=' separates the key. JSON, lists, URLs, and '=' in
        // values stay intact; an empty string and literal "null" are distinct.
        const value = line.slice(equal + 1);
        const definition = catalogue.get(`${input.namespace}:${key}`);
        const interpretation = interpret(definition, value);
        records.push({
          id: `${input.namespace}:${index + 1}`, namespace: input.namespace, key, value,
          source_file: input.source_file, line: index + 1,
          category: definition?.category || categoryHint(key), category_basis: definition ? 'catalogue' : 'name-hint',
          label: definition?.label || key, known: Boolean(definition), legacy: Boolean(definition?.legacy),
          interpretation: interpretation.text, note: definition?.note || null,
          source: definition?.source || null,
          review: reviewFor(input.namespace, key, value, interpretation),
          value_state: value === '' ? 'empty' : value.trim() === 'null' ? 'literal-null' : 'recorded',
          duplicate: false,
        });
        count++;
      }
      if (!count) throw new Error(`No key=value settings were found in ${input.source_file}.`);
      files.push({ namespace: input.namespace, source_file: input.source_file, records: count, physical_lines: lines.length, malformed_lines: invalid });
    }
    const frequencies = new Map();
    for (const row of records) {
      const identity = `${row.namespace}:${row.key}`;
      frequencies.set(identity, (frequencies.get(identity) || 0) + 1);
    }
    for (const row of records) row.duplicate = frequencies.get(`${row.namespace}:${row.key}`) > 1;
    return {
      tool: 'settings', version: VERSION, source_file: files.map(file => file.source_file).join(' + '), analyzed_at: new Date().toISOString(),
      files, records, issues,
      counts: {
        records: records.length, files: files.length, distinct_settings: frequencies.size,
        global: records.filter(row => row.namespace === 'global').length,
        secure: records.filter(row => row.namespace === 'secure').length,
        system: records.filter(row => row.namespace === 'system').length,
        explained: records.filter(row => row.known).length,
        raw_only: records.filter(row => !row.known).length,
        review: records.filter(row => row.review || row.duplicate).length,
        legacy: records.filter(row => row.legacy).length,
        duplicate_records: records.filter(row => row.duplicate).length,
        malformed_lines: files.reduce((sum, file) => sum + file.malformed_lines, 0),
        empty: records.filter(row => row.value_state === 'empty').length,
        literal_null: records.filter(row => row.value_state === 'literal-null').length,
      },
      notes: [
        'These are stored settings from the exports, not measurements of current device behaviour. No device settings are changed.',
        'Absent keys remain absent. Empty strings and the literal text null are preserved, not treated as disabled.',
        'The namespace and source line identify each record. Duplicate keys are retained; no winning value is chosen.',
        'Android version, device policies, user/profile, and vendor changes can affect meaning. Legacy settings do not establish current app permissions.',
        'Unexplained keys remain searchable as raw values. Their categories are name-based browsing hints, not verified interpretations.',
        'Files are combined for browsing. Their filenames do not prove that they came from the same device, user, or capture time.',
        'Downloads and optional history include the recorded values, including identifiers. No inventory or settings data is sent to a server.',
      ],
    };
  }

  function matches(row, filters = {}) {
    if (filters.namespace && row.namespace !== filters.namespace) return false;
    if (filters.category && row.category !== filters.category) return false;
    if (filters.status === 'review' && !(row.review || row.duplicate)) return false;
    if (filters.status === 'explained' && !row.known) return false;
    if (filters.status === 'raw' && row.known) return false;
    if (filters.status === 'legacy' && !row.legacy) return false;
    if (filters.status === 'duplicates' && !row.duplicate) return false;
    if (['empty', 'literal-null'].includes(filters.status) && row.value_state !== filters.status) return false;
    const query = String(filters.query || '').trim().toLowerCase();
    return !query || `${row.namespace} ${row.key} ${row.value} ${row.label} ${row.interpretation} ${row.note || ''}`.toLowerCase().includes(query);
  }
  function page(records, filters = {}, requested = 0) {
    const filtered = records.filter(row => matches(row, filters));
    const pages = Math.max(1, Math.ceil(filtered.length / AnalysisConfig.SETTINGS_PAGE_SIZE));
    const current = Math.min(pages - 1, Math.max(0, Math.floor(Number(requested)) || 0));
    return { total: filtered.length, page: current, pages, records: filtered.slice(current * AnalysisConfig.SETTINGS_PAGE_SIZE, (current + 1) * AnalysisConfig.SETTINGS_PAGE_SIZE) };
  }
  function filteredReport(summary, filters = {}) {
    const selection = Object.fromEntries(['query', 'namespace', 'category', 'status'].map(key => [key, typeof filters[key] === 'string' ? filters[key] : '']));
    const records = summary.records.filter(row => matches(row, selection));
    return { tool: 'settings-filtered', version: VERSION, analyzed_at: summary.analyzed_at, exported_at: new Date().toISOString(), files: summary.files, filters: selection, total_records: summary.records.length, matching_records: records.length, records, notes: summary.notes };
  }
  function isSummary(value) {
    return isObject(value) && value.tool === 'settings' && value.version === VERSION && typeof value.source_file === 'string' && isObject(value.counts)
      && Array.isArray(value.files) && value.files.length <= 3 && value.files.every(file => isObject(file) && namespaces.includes(file.namespace) && typeof file.source_file === 'string')
      && Array.isArray(value.records) && value.records.length <= AnalysisConfig.MAX_SETTINGS_RECORDS && value.records.every(row => isObject(row) && namespaces.includes(row.namespace) && ['id', 'key', 'value', 'source_file', 'label', 'category', 'interpretation'].every(key => typeof row[key] === 'string') && Number.isSafeInteger(row.line) && row.line > 0)
      && Array.isArray(value.notes) && value.notes.every(note => typeof note === 'string') && Array.isArray(value.issues) && value.issues.every(isObject);
  }
  return { namespaceForFile, validateFiles, analyse, matches, page, filteredReport, isSummary };
})();

;
// Pure, read-only analysis of the bracketed output of `adb shell getprop`.
const GetpropAnalysis = (() => {
  'use strict';
  const VERSION = 1;
  const sources = Object.freeze({
    build: 'https://android.googlesource.com/platform/frameworks/base/+/main/core/java/android/os/Build.java',
    init: 'https://android.googlesource.com/platform/system/core/+/main/init/README.md',
    boot: 'https://android.googlesource.com/platform/external/avb/+/master/README.md',
    lock: 'https://source.android.com/docs/core/architecture/bootloader/locking_unlocking',
    adb: 'https://android.googlesource.com/platform/packages/modules/adb/+/refs/heads/main/daemon/main.cpp',
    encryption: 'https://source.android.com/docs/security/features/encryption/file-based',
    usb: 'https://android.googlesource.com/platform/system/core/+/6078805/rootdir/init.usb.rc',
  });
  const catalogue = new Map();
  const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
  function add(key, label, category, type, source, extra = {}) {
    catalogue.set(key, { label, category, type, source, ...extra });
  }
  for (const [key, label, category] of [
    ['ro.product.manufacturer', 'Manufacturer', 'Device'], ['ro.product.brand', 'Brand', 'Device'],
    ['ro.product.model', 'Model', 'Device'], ['ro.product.device', 'Device codename', 'Device'],
    ['ro.product.name', 'Product name', 'Device'], ['ro.hardware', 'Hardware name', 'Device'],
    ['ro.product.cpu.abilist', 'Supported CPU ABIs', 'Device'],
    ['ro.build.id', 'Build ID', 'Build'], ['ro.build.display.id', 'Display build ID', 'Build'],
    ['ro.build.fingerprint', 'Build fingerprint', 'Build'],
    ['ro.build.version.release', 'Android release', 'Build'],
    ['ro.build.version.incremental', 'Incremental build version', 'Build'],
    ['ro.build.version.codename', 'Platform codename', 'Build'],
  ]) add(key, label, category, 'text', sources.build);
  add('ro.build.version.sdk', 'Android API level', 'Build', 'integer', sources.build);
  add('ro.build.version.security_patch', 'Reported security patch level', 'Build', 'date', sources.build, { note: 'A reported patch date does not verify installed fixes or establish the capture date.' });
  add('ro.build.type', 'Build type', 'Build', 'build-type', sources.build);
  add('ro.build.tags', 'Build tags', 'Build', 'tags', sources.build, { note: 'Build tags are text claims and do not authenticate the signing key.' });
  add('ro.boot.verifiedbootstate', 'Verified Boot state', 'Boot', 'verified-boot', sources.boot, { note: 'Reported boot state only; this text export is not hardware attestation.' });
  add('ro.boot.flash.locked', 'Bootloader flash lock', 'Boot', 'lock', sources.lock);
  add('ro.debuggable', 'Debuggable build flag', 'Debugging', 'boolean', sources.adb, { note: 'This is a build flag, separate from the Developer options switch. It does not prove root access.' });
  add('ro.secure', 'ADB privilege-drop flag', 'Debugging', 'boolean', sources.adb, { note: 'In AOSP, this contributes to the ADB privilege policy. It is not an overall device security status.' });
  add('ro.adb.secure', 'ADB authentication flag', 'Debugging', 'boolean', sources.adb, { note: 'Build mode, boot state, and implementation affect enforcement. Clients and authorizations are not listed here.' });
  for (const key of ['service.adb.tcp.port', 'persist.adb.tcp.port']) add(key, 'Configured ADB TCP port', 'Debugging', 'port', sources.adb, { note: 'A configuration value does not establish a listening port. Modern wireless debugging can use other properties.' });
  for (const [key, label] of [['sys.usb.config', 'Requested USB functions'], ['sys.usb.state', 'Reported USB functions'], ['persist.sys.usb.config', 'Persistent USB function preference']]) {
    add(key, label, 'USB', 'usb', sources.usb, { note: 'AOSP reference configuration; vendor behaviour can differ. This value does not prove a connected or authorized ADB client.' });
  }
  add('ro.crypto.state', 'Reported encryption state', 'Encryption', 'encryption-state', sources.encryption, { note: 'This property does not verify protection of individual files or the current user-unlock state.' });
  add('ro.crypto.type', 'Reported encryption type', 'Encryption', 'encryption-type', sources.encryption);

  function definitionFor(key) {
    if (catalogue.has(key)) return catalogue.get(key);
    if (key.startsWith('init.svc.') && key.length > 9) return { label: `Service: ${key.slice(9)}`, category: 'Services', type: 'service', source: sources.init, note: 'One recorded service state. A stopped service can be normal; a restarting state alone does not prove a crash loop.' };
    return null;
  }
  function categoryHint(key) {
    if (/^init\./.test(key)) return 'Services';
    if (/adb|debuggable|^debug\./.test(key)) return 'Debugging';
    if (/usb/.test(key)) return 'USB';
    if (/crypto|encrypt/.test(key)) return 'Encryption';
    if (/^ro\.boot\.|boot\.reason|boot_completed/.test(key)) return 'Boot';
    if (/build|security_patch/.test(key)) return 'Build';
    if (/^ro\.product\.|hardware|board|soc\./.test(key)) return 'Device';
    if (/wifi|bluetooth|radio|telephony|^gsm\.|^ril\.|^net\./.test(key)) return 'Connectivity';
    if (/audio|media|camera|display|graphics|surfaceflinger/.test(key)) return 'Media & display';
    if (/^dalvik\.|heap|dex|thermal|performance/.test(key)) return 'Runtime';
    return 'Other';
  }
  function interpret(definition, raw) {
    const value = raw.trim();
    const ok = text => ({ text, valid: true });
    const unsupported = () => ({ text: 'Value outside the supported interpretation; raw value retained', valid: false });
    if (raw === '') return ok('Empty recorded value');
    if (!value) return ok('Whitespace-only value recorded');
    if (value === 'null') return ok('Literal null recorded; meaning not assumed');
    if (!definition) return ok('Raw value; no documented explanation in this catalogue');
    switch (definition.type) {
      case 'text': return ok(`${definition.label} recorded`);
      case 'boolean': return ['0', '1'].includes(value) ? ok(`Flag ${value === '1' ? 'on' : 'off'} (recorded)`) : unsupported();
      case 'integer': return /^\d+$/.test(value) && Number.isSafeInteger(Number(value)) ? ok(`API level ${Number(value)} recorded`) : unsupported();
      case 'date': {
        const date = /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T00:00:00Z`) : null;
        return date && Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value ? ok('Calendar date recorded as the patch level') : unsupported();
      }
      case 'build-type': return ['user', 'userdebug', 'eng'].includes(value) ? ok({ user: 'Production build type recorded', userdebug: 'Debug-capable user build recorded', eng: 'Engineering build recorded' }[value]) : unsupported();
      case 'tags': return ok('Build-tag text recorded; signing authenticity unverified');
      case 'verified-boot': return ['green', 'yellow', 'orange'].includes(value) ? ok({ green: 'Locked boot state with a non-user-set verification key reported', yellow: 'Locked boot state with a user-set verification key reported', orange: 'Unlocked boot state reported' }[value]) : unsupported();
      case 'lock': return value === '1' ? ok('Locked flag recorded') : value === '0' ? ok('Unlocked flag recorded') : unsupported();
      case 'encryption-state': return value === 'encrypted' ? ok('Encryption reported by the property') : value === 'unencrypted' ? ok('Unencrypted state reported by the property') : unsupported();
      case 'encryption-type': return value === 'file' ? ok('File-based encryption reported') : unsupported();
      case 'service': return ['running', 'stopped', 'stopping', 'restarting'].includes(value) ? ok(`Service ${value} at capture time`) : unsupported();
      case 'usb': return /^[A-Za-z0-9_.-]+(?:,[A-Za-z0-9_.-]+)*$/.test(value) ? ok('USB function list recorded') : unsupported();
      case 'port': {
        if (!/^-?\d+$/.test(value)) return unsupported();
        const port = Number(value);
        if (port === 0 || port === -1) return ok('No positive TCP port specified by this property');
        return Number.isSafeInteger(port) && port > 0 && port <= 65535 ? ok(`TCP port ${port} configured; reachability unverified`) : unsupported();
      }
      default: return unsupported();
    }
  }
  function reviewFor(key, value, definition, interpretation) {
    if (!interpretation.valid) return 'The catalogue cannot interpret this value. Check the device or vendor definition.';
    value = value.trim();
    if (!value || value === 'null') return null;
    if (key === 'ro.boot.verifiedbootstate' && ['orange', 'yellow'].includes(value)) return 'A custom-key or unlocked boot configuration is reported. Check whether this is intended.';
    if (key === 'ro.boot.flash.locked' && value === '0') return 'An unlocked bootloader flag is recorded. Check whether this is intended.';
    if (key === 'ro.debuggable' && value === '1') return 'Debug build capability is recorded. This can be intentional on development devices.';
    if (['ro.secure', 'ro.adb.secure'].includes(key) && value === '0') return 'A less restrictive ADB flag is recorded. Its effect depends on the build and implementation.';
    if (key === 'ro.build.type' && ['eng', 'userdebug'].includes(value)) return 'A development build type is recorded. Confirm that it matches the expected firmware.';
    if (key === 'ro.build.tags' && value.split(',').some(tag => ['test-keys', 'dev-keys'].includes(tag.trim()))) return 'Development signing tags are recorded. Tags alone do not establish rooting or signing authenticity.';
    if (definition?.type === 'port' && Number(value) > 0) return 'A positive ADB TCP port is configured. Verify whether network debugging is intended.';
    if (definition?.type === 'usb' && value.split(',').includes('adb')) return 'The USB function list includes ADB. Check whether debugging is intended.';
    if (definition?.type === 'service' && value === 'restarting') return 'This service was restarting in the snapshot. Repeated captures or logs are needed to establish a crash loop.';
    if (key === 'ro.crypto.state' && value === 'unencrypted') return 'The property reports an unencrypted state. Verify the actual device configuration.';
    return null;
  }

  function analyse(text, sourceFile = 'getprop.txt', progress = () => {}) {
    if (typeof text !== 'string' || typeof sourceFile !== 'string') throw new Error('Provide a getprop text export and filename.');
    if (new TextEncoder().encode(text).byteLength > AnalysisConfig.MAX_GETPROP_BYTES) throw new Error(`This property export exceeds ${AnalysisConfig.GETPROP_LIMIT_LABEL}.`);
    if (text.includes('\0')) throw new Error('Export getprop as UTF-8 text; a NUL byte was found.');
    const chunks = text.replace(/^\uFEFF/, '').split(/(\r\n|\n|\r)/), lines = [];
    for (let i = 0; i < chunks.length; i += 2) {
      if (i === chunks.length - 1 && chunks[i] === '') break;
      lines.push({ text: chunks[i], eol: chunks[i + 1] || '' });
    }
    if (lines.length > AnalysisConfig.MAX_GETPROP_LINES) throw new Error('Too many property source lines. Reduce the export.');
    const records = [], issues = [], frequencies = new Map();
    let malformed = 0;
    const opener = /^\[([A-Za-z0-9_.@:-]+)\]:[ \t]*\[/;
    const closing = /\][ \t]*$/;
    function issue(start, end, message) {
      malformed += end - start + 1;
      if (issues.length < 100) issues.push({ line: start + 1, end_line: end + 1, message });
    }
    for (let index = 0; index < lines.length; index++) {
      const line = lines[index].text;
      if (line.length > AnalysisConfig.MAX_GETPROP_RECORD_CHARS) throw new Error(`Property source line ${index + 1} is too long.`);
      if (!line.trim()) continue;
      const match = opener.exec(line);
      if (!match) { issue(index, index, 'Expected [property.name]: [value].'); continue; }
      const start = index, key = match[1];
      let raw = line;
      let end = closing.exec(line);
      while (!end && index + 1 < lines.length && !opener.test(lines[index + 1].text)) {
        raw += lines[index].eol + lines[index + 1].text;
        index++;
        if (raw.length > AnalysisConfig.MAX_GETPROP_RECORD_CHARS) throw new Error(`Property starting at line ${start + 1} is too long.`);
        end = closing.exec(lines[index].text);
      }
      if (!end) { issue(start, index, 'Unterminated property value; the next property, if present, is kept separate.'); continue; }
      if (records.length >= AnalysisConfig.MAX_GETPROP_RECORDS) throw new Error('Too many property records. Reduce the export.');
      const value = raw.slice(match[0].length, raw.length - end[0].length);
      const definition = definitionFor(key), interpretation = interpret(definition, value);
      records.push({ id: String(start + 1), key, value, raw, source_file: sourceFile, line: start + 1, end_line: index + 1,
        prefix: key.split('.')[0], category: definition?.category || categoryHint(key), category_basis: definition ? 'catalogue' : 'name-hint',
        label: definition?.label || key, known: Boolean(definition), interpretation: interpretation.text,
        note: definition?.note || null, source: definition?.source || null,
        review: reviewFor(key, value, definition, interpretation), duplicate: false,
        service_state: definition?.type === 'service' && ['running', 'stopped', 'stopping', 'restarting'].includes(value.trim()) ? value.trim() : null,
        value_state: value === '' ? 'empty' : value.trim() === 'null' ? 'literal-null' : 'recorded',
      });
      frequencies.set(key, (frequencies.get(key) || 0) + 1);
      if (records.length % 500 === 0) progress(`Read ${records.length.toLocaleString('en-US')} properties…`);
    }
    if (!records.length) throw new Error('No [property.name]: [value] records found. Open the output of adb shell getprop.');
    for (const row of records) row.duplicate = frequencies.get(row.key) > 1;
    return { tool: 'getprop', version: VERSION, source_file: sourceFile, analyzed_at: new Date().toISOString(), records, issues,
      counts: { records: records.length, distinct_keys: frequencies.size, physical_lines: lines.length,
        explained: records.filter(row => row.known).length, raw_only: records.filter(row => !row.known).length,
        review: records.filter(row => row.review || row.duplicate).length, duplicate_records: records.filter(row => row.duplicate).length,
        empty: records.filter(row => row.value_state === 'empty').length, literal_null: records.filter(row => row.value_state === 'literal-null').length,
        multiline: records.filter(row => row.end_line > row.line).length, malformed_lines: malformed,
        services: records.filter(row => row.key.startsWith('init.svc.') && row.key.length > 9).length,
        service_running: records.filter(row => row.service_state === 'running').length,
        service_stopped: records.filter(row => row.service_state === 'stopped').length,
        service_restarting: records.filter(row => row.service_state === 'restarting').length,
      },
      notes: [
        'Properties are recorded configuration and state. The analysis time is not the capture time, and this export does not authenticate the device.',
        'Explained means a key has a documented interpretation. Raw values are keys outside this dictionary; their categories are name hints.',
        'Review notes identify limited configuration or data checks. Zero notes does not establish device safety or absence of root or malware.',
        'A stopped init service can be normal. A single snapshot does not show how often a service restarts.',
        'Missing properties remain missing. Empty strings and literal null are preserved. Duplicate keys keep every record without choosing a winner.',
        'Multiline values retain their line endings and source ranges. Unescaped getprop text can be ambiguous if a value itself contains record-shaped lines.',
        'Values, downloads, and optional history can include identifiers. Analysis runs in this browser; no properties are uploaded or changed on the device.',
      ],
    };
  }
  function matches(row, filters = {}) {
    if (filters.prefix && row.prefix !== filters.prefix) return false;
    if (filters.category && row.category !== filters.category) return false;
    const status = filters.status;
    if (status === 'review' && !(row.review || row.duplicate)) return false;
    if (status === 'explained' && !row.known) return false;
    if (status === 'raw' && row.known) return false;
    if (status === 'duplicates' && !row.duplicate) return false;
    if (status === 'multiline' && row.line === row.end_line) return false;
    if (['empty', 'literal-null'].includes(status) && row.value_state !== status) return false;
    if (status?.startsWith('service-') && row.service_state !== status.slice(8)) return false;
    const query = String(filters.query || '').trim().toLowerCase();
    return !query || `${row.key} ${row.value} ${row.label} ${row.interpretation} ${row.note || ''} ${row.review || ''}`.toLowerCase().includes(query);
  }
  function page(records, filters = {}, requested = 0) {
    const filtered = records.filter(row => matches(row, filters));
    const pages = Math.max(1, Math.ceil(filtered.length / AnalysisConfig.GETPROP_PAGE_SIZE));
    const current = Math.min(pages - 1, Math.max(0, Math.floor(Number(requested)) || 0));
    return { total: filtered.length, page: current, pages, records: filtered.slice(current * AnalysisConfig.GETPROP_PAGE_SIZE, (current + 1) * AnalysisConfig.GETPROP_PAGE_SIZE) };
  }
  function filteredReport(summary, filters = {}) {
    const selection = Object.fromEntries(['query', 'prefix', 'category', 'status'].map(key => [key, typeof filters[key] === 'string' ? filters[key] : '']));
    const records = summary.records.filter(row => matches(row, selection));
    return { tool: 'getprop-filtered', version: VERSION, source_file: summary.source_file, analyzed_at: summary.analyzed_at, exported_at: new Date().toISOString(), filters: selection, total_records: summary.records.length, matching_records: records.length, records, notes: summary.notes };
  }
  function isSummary(value) {
    return object(value) && value.tool === 'getprop' && value.version === VERSION && typeof value.source_file === 'string' && typeof value.analyzed_at === 'string'
      && object(value.counts) && Object.values(value.counts).every(n => Number.isSafeInteger(n) && n >= 0)
      && Array.isArray(value.records) && value.records.length > 0 && value.records.length <= AnalysisConfig.MAX_GETPROP_RECORDS
      && value.records.every(row => object(row) && ['id', 'key', 'value', 'raw', 'source_file', 'prefix', 'category', 'label', 'interpretation'].every(key => typeof row[key] === 'string')
        && Number.isSafeInteger(row.line) && row.line > 0 && Number.isSafeInteger(row.end_line) && row.end_line >= row.line)
      && value.counts.records === value.records.length && Array.isArray(value.notes) && value.notes.every(note => typeof note === 'string')
      && Array.isArray(value.issues) && value.issues.length <= 100 && value.issues.every(issue => object(issue) && Number.isSafeInteger(issue.line) && Number.isSafeInteger(issue.end_line) && typeof issue.message === 'string');
  }
  return { analyse, matches, page, filteredReport, isSummary };
})();

;
const Logcat = (() => {
  const stamp = String.raw`((?:\d{4}-)?\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:\s*[+-]\d{4})?|\d{9,}\.\d+)`;
  const thread = new RegExp(`^${stamp}\\s+(?:(\\S+)\\s+)?(\\d+)\\s+(\\d+)\\s+([VDIWEFA])\\s+(.+?):\\s?(.*)$`);
  const timed = new RegExp(`^${stamp}\\s+([VDIWEFA])\\/([^(:]+)\\(\\s*(\\d+)\\):\\s?(.*)$`);
  const brief = /^([VDIWEFA])\/([^(:]+)\(\s*(\d+)\):\s?(.*)$/;
  const long = new RegExp(`^\\[\\s*${stamp}\\s+(\\d+):\\s*(\\d+)\\s+([VDIWEFA])\\/(.+?)\\s*\\]$`);
  const ranks = { '?': 0, V: 1, D: 2, I: 3, W: 4, E: 5, F: 6, A: 6 };
  const labels = { native: 'Native crash', java: 'Java crash', anr: 'ANR', memory: 'Memory pressure', exception: 'Exception', denial: 'SELinux denial', network: 'Network failure', jank: 'Skipped frames' };
  const actions = {
    native: 'Review the signal and process, then inspect the tombstone or abort message at the same time.',
    java: 'Start with the deepest “Caused by” exception and the first application stack frame.',
    anr: 'Inspect the main-thread trace and the ANR reason. Check for blocked I/O, locks, or long-running work.',
    memory: 'Check the affected process and memory pressure near this entry. A process kill is not automatically an app crash.',
    exception: 'Review the exception and nearby entries. Logged or handled exceptions are not automatically crashes.',
    denial: 'Check the denied operation and SELinux source/target contexts. A policy denial alone is not evidence of compromise.',
    network: 'Correlate with connectivity, DNS, TLS, or timeout events for the same process.',
    jank: 'Check main-thread work near this entry and reproduce with a performance trace.'
  };

  function parseLine(input) {
    const line = input.replace(/\x1b\[[0-9;]*m/g, '');
    let m = thread.exec(line);
    if (m) return { timestamp: m[1], uid: m[2] || '', pid: m[3], tid: m[4], level: m[5], tag: m[6].trim(), message: m[7], format: 'threadtime' };
    m = timed.exec(line);
    if (m) return { timestamp: m[1], pid: m[4], tid: '', level: m[2], tag: m[3].trim(), message: m[5], format: 'time' };
    m = brief.exec(line);
    if (m) return { timestamp: '', pid: m[3], tid: '', level: m[1], tag: m[2].trim(), message: m[4], format: 'brief' };
    m = long.exec(line);
    if (m) return { timestamp: m[1], pid: m[2], tid: m[3], level: m[4], tag: m[5].trim(), message: '', format: 'long' };
    return null;
  }

  function parse(text, progress = () => {}) {
    const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/);
    if (lines[lines.length - 1] === '') lines.pop();
    const records = [], levels = { V: 0, D: 0, I: 0, W: 0, E: 0, F: 0, A: 0 }, buffers = new Map(), tags = new Map(), formats = new Set();
    let buffer = 'unspecified', previous = null, parsed = 0, continuationLines = 0, unparsed = 0, banners = 0, blank = 0;
    for (let i = 0; i < lines.length; i++) {
      const raw = lines[i];
      if (i % 30000 === 0) progress(`Reading log entries · ${Math.round(i / Math.max(lines.length, 1) * 100)}%`);
      const marker = /^-+\s+(?:beginning of|switch to)\s+([\w-]+)/.exec(raw);
      if (marker) { buffer = marker[1]; previous = null; banners++; continue; }
      if (!raw.trim()) { blank++; if (previous?.format === 'long') previous = null; continue; }
      const record = parseLine(raw);
      if (record) {
        Object.assign(record, { id: records.length, line: i + 1, endLine: i + 1, buffer, signals: [] });
        records.push(record); previous = record; parsed++;
        levels[record.level]++;
        buffers.set(buffer, (buffers.get(buffer) || 0) + 1);
        tags.set(record.tag, (tags.get(record.tag) || 0) + 1);
        formats.add(record.format);
      } else if (previous && (previous.format === 'long' || /^\s*(?:at\s+|Caused by:|Suppressed:|\.\.\. \d+ more|[\w.$]+(?:Exception|Error)(?::|$))/.test(raw))) {
        // Continuations remain attached to their entry; the source text is retained separately.
        if (previous.message.length < 64000) previous.message += (previous.message ? '\n' : '') + raw;
        previous.endLine = i + 1; continuationLines++;
      } else {
        records.push({ id: records.length, line: i + 1, endLine: i + 1, buffer, timestamp: '', pid: '', tid: '', level: '?', tag: '(unparsed)', message: raw, signals: [], format: 'unparsed' });
        previous = null; unparsed++;
      }
    }
    return { lines, records, parsed, continuationLines, unparsed, banners, blank, levels, buffers, tags, formats };
  }

  function normalized(message) {
    return message.replace(/0x[\da-f]+/gi, '<address>').replace(/\b(pid|tid)[=: ]+\d+/gi, '$1=<id>').replace(/\baudit\([\d.:]+\)/g, 'audit(<id>)').replace(/\s+/g, ' ').trim().slice(0, 700);
  }

  function javaDetail(records, index) {
    const first = records[index], collected = [first.message];
    let process = '', reason = '', endLine = first.endLine;
    const timestampNumber = value => {
      if (/^\d{9,}\.\d+$/.test(value)) return Number(value) * 1000;
      const m = /^(?:(\d{4})-)?(\d{2})-(\d{2})\s+(\d{2}):(\d{2}):(\d{2})(?:\.(\d+))?/.exec(value || '');
      return m ? Date.UTC(Number(m[1] || 2000), +m[2] - 1, +m[3], +m[4], +m[5], +m[6], Number((m[7] || '').padEnd(3, '0').slice(0, 3))) : NaN;
    };
    const startTime = timestampNumber(first.timestamp);
    for (let j = index + 1; j < Math.min(index + 180, records.length); j++) {
      const r = records[j];
      if (r.pid !== first.pid || !/^(AndroidRuntime|System\.err)$/.test(r.tag)) continue;
      const delta = timestampNumber(r.timestamp) - startTime;
      if (delta > 10000) break;
      if (delta < 0) continue;
      if (/FATAL EXCEPTION/.test(r.message)) break;
      collected.push(r.message); endLine = r.endLine;
      const p = /\bProcess:\s*([^,\s]+)/.exec(r.message);
      if (p) process = p[1];
      const e = /(?:Caused by:\s*)?([\w.$]+(?:Exception|Error)(?::[^\n]*)?)/.exec(r.message);
      if (e && (!reason || /Caused by:/.test(r.message))) reason = e[1];
      if (collected.length >= 60) break;
    }
    const joined = collected.join('\n');
    process ||= /\bProcess:\s*([^,\s]+)/.exec(joined)?.[1] || `PID ${first.pid || 'unknown'}`;
    reason = [...joined.matchAll(/Caused by:\s*([^\n]+)/g)].pop()?.[1] || reason
      || /([\w.$]+(?:Exception|Error):[^\n]*)/.exec(joined)?.[1] || first.message;
    return { process, summary: reason.slice(0, 600), detail: joined.slice(0, 16000), endLine };
  }

  function signals(data) {
    const groups = new Map(), repeated = new Map(), counts = Object.fromEntries(Object.keys(labels).map(k => [k, 0]));
    const javaCrashes = [], anrs = [], nativeCrashes = [], seenCrashes = new Map();
    for (let i = 0; i < data.records.length; i++) {
      const r = data.records[i];
      if (r.level === '?') continue;
      const msg = r.message;
      let kind = '', title = '', process = r.tag, detail = msg, candidate = null;
      if (/\bFATAL EXCEPTION\s*:/.test(msg)) {
        kind = 'java'; const crash = javaDetail(data.records, i);
        process = crash.process; title = crash.summary; detail = crash.detail;
        candidate = { ...crash, line: r.line, pid: r.pid, timestamp: r.timestamp };
      } else if (/\bFatal signal\s+\d+\s*\(SIG[A-Z0-9]+\)/.test(msg)) {
        kind = 'native'; title = msg;
        process = /\bpid\s+\d+\s*\(([^)]+)\)/.exec(msg)?.[1] || /\btid\s+\d+\s*\(([^)]+)\)/.exec(msg)?.[1] || `PID ${r.pid}`;
        candidate = { pid: /\bpid\s+(\d+)/.exec(msg)?.[1] || r.pid, signal: /\((SIG[A-Z0-9]+)\)/.exec(msg)?.[1] || '', cmdline: process, timestamp: r.timestamp, line: r.line, detail: msg };
      } else if (/\bANR in\s+/.test(msg) || r.tag === 'am_anr') {
        kind = 'anr'; process = /\bANR in\s+([^\s(]+)/.exec(msg)?.[1] || /^\[\s*\d+\s*,\s*\d+\s*,\s*([^,\]]+)/.exec(msg)?.[1]?.trim() || r.tag;
        const event = /^\[\s*(\d+)\s*,\s*(\d+)\s*,/.exec(msg);
        // The log writer is usually system_server, not the unresponsive process.
        let affectedPid = event?.[2] || /\bPID:\s*(\d+)/.exec(msg)?.[1] || null;
        if (!affectedPid && /\bANR in\s+/.test(msg)) {
          for (let j = i + 1; j < Math.min(i + 20, data.records.length); j++) {
            const next = data.records[j];
            if (next.pid !== r.pid || next.tag !== r.tag) continue;
            if (/\bANR in\s+/.test(next.message)) break;
            affectedPid = /^PID:\s*(\d+)/.exec(next.message)?.[1] || null;
            if (affectedPid) break;
          }
        }
        title = msg; candidate = { process, pid: affectedPid, user_id: event ? Number(event[1]) : null, source: event ? 'am_anr' : 'ANR in', line: r.line, detail: msg, timestamp: r.timestamp };
      } else if (/\bOutOfMemoryError\b|\bOut of memory\b|\bLow on memory\b|\blowmemorykiller\b.*\bkill(?:ing|ed)\b|\bKill(?:ing)?\s+['"]?[^\n]+\bto free\b/i.test(msg)) {
        kind = 'memory'; title = msg;
      } else if (/\bavc:\s*denied\b/i.test(msg)) {
        kind = 'denial'; title = msg;
      } else if (/\bSkipped\s+\d+\s+frames!/.test(msg)) {
        kind = 'jank'; title = msg;
      } else if (/\b(?:UnknownHostException|SocketTimeoutException|SSLHandshakeException|ConnectException)\b|\b(?:ECONNREFUSED|ETIMEDOUT|ENETUNREACH|EHOSTUNREACH)\b/.test(msg)) {
        kind = 'network'; title = msg;
      } else if (/\b(?:Caused by:\s*|[\w.$]+(?:Exception|Error):)/.test(msg) && ranks[r.level] >= 4) {
        kind = 'exception'; title = msg;
      }
      if (kind) {
        const crashKey = ['java', 'native', 'anr'].includes(kind) && r.timestamp ? `${kind}|${r.timestamp}|${r.pid}|${msg}` : '';
        r.signals.push(kind);
        if (!crashKey || !seenCrashes.has(crashKey)) {
          if (crashKey) seenCrashes.set(crashKey, r.line);
          if (kind === 'java') javaCrashes.push(candidate);
          if (kind === 'native') nativeCrashes.push(candidate);
          if (kind === 'anr') anrs.push(candidate);
          counts[kind]++;
          const key = `${kind}|${process}|${normalized(title)}`;
          let group = groups.get(key);
          if (!group) {
            group = { id: groups.size, kind, label: labels[kind], process, title: title.slice(0, 900), detail: detail.slice(0, 16000), count: 0, line: r.line, lastLine: r.line, timestamp: r.timestamp, lastTimestamp: r.timestamp, samples: [], action: actions[kind] };
            groups.set(key, group);
          }
          group.count++; group.lastLine = r.line; group.lastTimestamp = r.timestamp;
          if (group.samples.length < 20) group.samples.push(r.line);
        }
      }
      if (ranks[r.level] >= 4) {
        const key = `${r.level}|${r.tag}|${normalized(msg)}`;
        let group = repeated.get(key);
        if (!group) { group = { level: r.level, tag: r.tag, message: msg.slice(0, 900), count: 0, line: r.line }; repeated.set(key, group); }
        group.count++;
      }
    }
    const priority = { native: 0, java: 0, anr: 1, memory: 2, exception: 3, network: 4, denial: 5, jank: 6 };
    const findings = [...groups.values()].sort((a, b) => priority[a.kind] - priority[b.kind] || b.count - a.count || a.line - b.line);
    return { counts, findings, repeated: [...repeated.values()].sort((a, b) => b.count - a.count), javaCrashes, nativeCrashes, anrs };
  }

  function summary(data, source, findings) {
    let firstTimestamp = '', lastTimestamp = '', hasYearlessTimestamp = false;
    for (const record of data.records) {
      if (!record.timestamp) continue;
      firstTimestamp ||= record.timestamp;
      lastTimestamp = record.timestamp;
      hasYearlessTimestamp ||= /^\d{2}-\d{2}/.test(record.timestamp);
    }
    const notes = [];
    if (hasYearlessTimestamp) notes.push('Some timestamps have no year or time zone. They are shown as recorded; no year is inferred.');
    if (data.buffers.size > 1) notes.push('Multiple buffers are present. File order may differ from chronological order; older crash-buffer entries can precede recent activity.');
    if (data.unparsed) notes.push(`${data.unparsed.toLocaleString('en-US')} lines were not recognised as logcat. They remain available under “Unparsed” in the explorer.`);
    notes.push('Counts describe this file only. Fatal-priority records and handled exceptions do not each represent a separate crash.');
    return {
      tool: 'logcat', version: 2, source_file: source, analyzed_at: new Date().toISOString(),
      physical_lines: data.lines.length, parsed_records: data.parsed, unparsed_lines: data.unparsed, continuation_lines: data.continuationLines,
      buffer_markers: data.banners, blank_lines: data.blank, formats: [...data.formats], levels: data.levels,
      buffers: [...data.buffers].sort((a, b) => b[1] - a[1]), tags: [...data.tags].sort((a, b) => b[1] - a[1]),
      first_recorded_timestamp: firstTimestamp, last_recorded_timestamp: lastTimestamp,
      counts: findings.counts, finding_groups: findings.findings.length, findings: findings.findings.slice(0, 200),
      repeated_groups: findings.repeated.length, repeated: findings.repeated.slice(0, 100), notes,
      limits: { exported_finding_groups: 200, exported_repeated_groups: 100, examples_per_group: 20 }
    };
  }

  function matches(r, filters = {}) {
    if (filters.level === '?' && r.level !== '?') return false;
    if (filters.level && filters.level !== '?' && ranks[r.level] < ranks[filters.level]) return false;
    if (filters.buffer && r.buffer !== filters.buffer) return false;
    if (filters.pid && r.pid !== filters.pid.trim()) return false;
    if (filters.tag && !r.tag.toLowerCase().includes(filters.tag.toLowerCase())) return false;
    if (filters.signal && !r.signals.includes(filters.signal)) return false;
    if (filters.query) {
      const haystack = `${r.timestamp} ${r.tag} ${r.pid} ${r.tid} ${r.message}`.toLowerCase();
      if (!haystack.includes(filters.query.toLowerCase())) return false;
    }
    return true;
  }

  return { parseLine, parse, signals, summary, matches, ranks, labels, javaDetail };
})();

;
const LogQuery = (() => {
  /** Scan all records for an exact count, retaining at most two pages. */
  function selectPage(records, filters = {}, requestedPage = 0) {
    const { PAGE_SIZE, ROW_PREVIEW_CHARS } = AnalysisConfig;
    const value = Number(requestedPage);
    const requested = Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
    const offset = requested * PAGE_SIZE;
    const requestedRows = [];
    let total = 0;
    let lastPage = [];

    for (const record of records) {
      if (!Logcat.matches(record, filters)) continue;
      if (total % PAGE_SIZE === 0) lastPage = [];
      lastPage.push(record);
      if (total >= offset && total < offset + PAGE_SIZE) requestedRows.push(record);
      total++;
    }

    const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    const page = Math.min(requested, pages - 1);
    // A filter may leave fewer pages than the previous query had.
    const selected = page === requested ? requestedRows : lastPage;
    return {
      total, page, pages,
      records: selected.map(record => ({
        ...record,
        message: record.message.slice(0, ROW_PREVIEW_CHARS),
        shortened: record.message.length > ROW_PREVIEW_CHARS,
      })),
    };
  }

  return { selectPage };
})();

;
const Bugreport = (() => {
  'use strict';
  const DURATION_FOOTER_RE = /^[\d.]+s was the duration of/i;

  const LOGCAT_LINE_RE = /^\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}\.\d{3}/;
  const PROCESS_LINE_RE = /Process:\s*([\w.:]+)/;


  const FAULT_ADDR_RE = /fault addr\s+(0x[0-9a-fA-F]+)/;
  const ABORT_MSG_RE = /Abort message:\s*'([^']*)'/;
  // Captures path plus the rest of the line raw, rather than trying to bound
  // the symbol's own parentheses: C++ symbols routinely contain their own
  // "()" (e.g. "std::terminate()+80"), which breaks a naive [^)]* capture.
  const BACKTRACE_FRAME_RE = /^\s*#(\d+)\s+pc\s+([0-9a-fA-F]+)\s+(\S+)(.*)$/gm;
  // Best-effort: dumpsys usagestats event dumps vary by Android version, but
  // most print a quoted timestamp plus a type=/package= pair on the line.
  const USAGESTATS_EVENT_RE = /time="(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2})"[^\n]*?type=(\S+)(?:[^\n]*?package=(\S+))?/g;

  // Processes where a native crash is more consequential than an ordinary
  // app crash: privileged core services, media/codec parsers (classic
  // exploitation targets), and messaging apps (common delivery vector).
  const SENSITIVE_PROCESS_PATTERNS = [
    { re: /^system_server$/i, label: "system_server (privileged core process)" },
    { re: /bluetooth/i, label: "Bluetooth stack" },
    { re: /(media|codec|omx|extractor|heic|heif)/i, label: "media/codec parsing process" },
    { re: /nfc/i, label: "NFC stack" },
    { re: /(telephony|rild|radio)/i, label: "telephony/radio stack" },
    { re: /(whatsapp|telegram|securesms|messenger|wechat|\bmms\b|\bsms\b|hangouts|viber)/i, label: "messaging app" },
  ];

  const WAKELOCK_RE = /^\s*(Kernel )?Wake\s*lock\s+(.+?):\s+((?:\d+(?:ms|d|h|m|s)\s*)+)\s*\((\d+) times?\)/gmi;
  const WAKELOCK_UID_TAG_RE = /^(u\d+_?a\d+|\d+)\s+(.*)$/;
  const DURATION_PART_RE = /(\d+)(ms|d|h|m|s)/g;

  const LOW_MEM_RE = /(Low on memory|lowmemorykiller.*\bkill(?:ing|ed)\b|Out of memory).*/gi;
  const BENIGN_MEM_RE = /enough memory|disable killing/i;

  const OOM_KILL_RE = /Kill(?:ing)? '([\w.:]+)'.*?to free.*/gi;
  const FRAME_DROP_RE = /Skipped (\d+) frames!\s*The application may be doing too much work/g;
  const TOTAL_BATTERY_RE = /^\s*Time on battery:\s*((?:\d+(?:ms|d|h|m|s)\s*)+)(?:\(|realtime|$)/mi;

  // Stalkerware / surveillance-app correlation

  const PKG_HEADER_RE = /^\s*Package \[([\w.]+)\]/;
  const REQ_PERMS_HEADER_RE = /requested permissions:/i;
  const RUNTIME_PERMS_HEADER_RE = /runtime permissions:/i;
  const CODEPATH_RE = /codePath=(\S+)/;
  const PKG_FLAGS_RE = /(?:pkgFlags|flags)=\[([^\]]*)\]/;
  const PERM_LINE_RE = /^\s*([\w.]+\.permission\.[A-Z0-9_]+)\s*(?::\s*granted=(true|false))?/;
  const COMPONENT_INFO_RE = /ComponentInfo\{([\w.]+)\/[\w.$]+\}/g;
  const ENABLED_A11Y_SETTING_RE = /^[ \t]*enabled_accessibility_services[ \t]*[:=][ \t]*([^\n]*)$/gmi;
  const WHITELIST_PKG_LINE_RE = /^\s*(?:\d+:)?([a-zA-Z][\w]*(?:\.[\w]+){2,})\s*$/;

  // commercial "stalkerware" 
  const KNOWN_STALKERWARE_PATTERNS = [
    { re: /mspy/i, label: "mSpy-family" },
    { re: /flexispy/i, label: "FlexiSpy-family" },
    { re: /(thetruthspy|truthspy)/i, label: "TheTruthSpy-family" },
    { re: /(cocospy|spyic|spyzie)/i, label: "Cocospy/Spyic/Spyzie shared codebase" },
    { re: /xnspy/i, label: "XNSPY-family" },
    { re: /hoverwatch/i, label: "Hoverwatch-family" },
    { re: /highster/i, label: "Highster Mobile-family" },
    { re: /spybubble/i, label: "SpyBubble-family" },
    { re: /familyorbit/i, label: "Family Orbit-family" },
    { re: /\bcerberus\b/i, label: "Cerberus anti-theft/monitoring-family" },
    { re: /\beyezy\b/i, label: "Eyezy-family" },
    { re: /\bwebwatcher\b/i, label: "WebWatcher-family" },
    { re: /mobistealth/i, label: "mobistealth-family" },
    { re: /\bspyera\b/i, label: "Spyera-family" },
    { re: /kidsguard/i, label: "KidsGuard-family" },
    { re: /\bminspy\b/i, label: "Minspy-family" },
    { re: /letmespy/i, label: "LetMeSpy-family" },
  ];

  const SPECIAL_ACCESS_PERMISSIONS = [
    "android.permission.SYSTEM_ALERT_WINDOW",
    "android.permission.PACKAGE_USAGE_STATS",
    "android.permission.WRITE_SECURE_SETTINGS",
    "android.permission.BIND_ACCESSIBILITY_SERVICE",
    "android.permission.BIND_NOTIFICATION_LISTENER_SERVICE",
    "android.permission.BIND_DEVICE_ADMIN",
    "android.permission.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS",
  ];

  // monitoring tool.
  const DANGEROUS_PERMISSION_GROUPS = {
    audio_visual: ["android.permission.CAMERA", "android.permission.RECORD_AUDIO"],
    location: ["android.permission.ACCESS_FINE_LOCATION", "android.permission.ACCESS_BACKGROUND_LOCATION", "android.permission.ACCESS_COARSE_LOCATION"],
    messages_calls: ["android.permission.READ_SMS", "android.permission.RECEIVE_SMS", "android.permission.READ_CALL_LOG", "android.permission.PROCESS_OUTGOING_CALLS", "android.permission.ANSWER_PHONE_CALLS"],
    contacts: ["android.permission.READ_CONTACTS"],
  };

  // ---------------------------------------------------------------------
  // Section splitting
  // ---------------------------------------------------------------------
function splitSections(text) {
  const matches = [...text.matchAll(/^-{6}\s+(.+?)\s+-{6}(?:[^\n]*)/gm)]
    .filter(m => !DURATION_FOOTER_RE.test(m[1]));
  const sections = Object.create(null);
  if (!matches.length) { sections.FULL_TEXT = text; return sections; }
  for (let i = 0; i < matches.length; i++) {
    const m = matches[i], name = m[1].trim();
    sections[name] = (sections[name] || '') + text.slice(m.index + m[0].length, matches[i + 1]?.index ?? text.length);
  }
  return sections;
}


  function getSectionsByFragment(sections, fragments) {
    const out = [];
    for (const name of Object.keys(sections)) {
      const lname = name.toLowerCase();
      if (fragments.some((f) => lname.includes(f.toLowerCase()))) {
        out.push([name, sections[name]]);
      }
    }
    return out;
  }

  // ---------------------------------------------------------------------
  // Raw-text Java crash and ANR evidence with original source positions
  // ---------------------------------------------------------------------
  function findJavaCrashes(lines, candidates) {
    const results = [];
    for (const candidate of candidates) {
      const i = candidate.line - 1;
      if (/\bFATAL EXCEPTION\s*:/.test(lines[i])) {
        const block = [lines[i]];
        let j = i + 1;
        // Stay in the original source: filtering and joining lines can join
        // unrelated blocks and destroys source locations.
        while (j < Math.min(lines.length, i + 60)) {
          const ln = lines[j];
          if (/\bFATAL EXCEPTION\s*:/.test(ln) || Logcat.parseLine(ln)) break;
          if (/^\s*(?:Process:|Caused by:|Suppressed:|at\s+|\.\.\. \d+ more|[\w.$]+(?:Exception|Error)(?::|$))/.test(ln)) {
            block.push(ln);
            j++;
          } else {
            break;
          }
        }
        const blockText = block.join("\n");
        const procM = PROCESS_LINE_RE.exec(blockText);
        const reason = [...blockText.matchAll(/Caused by:\s*([^\n]+)/g)].pop()?.[1]
          || /([\w.$]+(?:Exception|Error):[^\n]*)/.exec(blockText)?.[1]
          || lines[i].trim();
        results.push({
          process: procM ? procM[1] : "unknown",
          summary: reason.slice(0, 600),
          detail: blockText.slice(0, 16000),
          line: i + 1,
          endLine: j,
        });
      }
    }
    return results;
  }

  function findAnrs(lines, candidates) {
    const out = [];
    for (const candidate of candidates) {
      const text = lines[candidate.line - 1];
      const match = /\bANR in\s+([^\s(]+)/.exec(text);
      if (match) out.push({ process: match[1], source: 'ANR in', line: candidate.line, detail: text.slice(0, 16000) });
    }
    return out;
  }

  function incidentTimeDifference(first, second) {
    const read = value => /^(?:(\d{4})-)?(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})(?:\.(\d+))?(?:\s*([+-])(\d{2}):?(\d{2}))?/.exec(value || '');
    const a = read(first), b = read(second);
    if (!a || !b) return Infinity;
    const year = a[1] || b[1] || '2000';
    // A yearless log record is compared by its recorded calendar fields.
    // Apply offsets only when both sources actually record their zone.
    const millis = m => Date.UTC(Number(m[1] || year), +m[2] - 1, +m[3], +m[4], +m[5], +m[6], Number((m[7] || '').padEnd(3, '0').slice(0, 3)))
      - (a[8] && b[8] ? (m[8] === '-' ? -1 : 1) * (+m[9] * 60 + +m[10]) * 60000 : 0);
    return Math.abs(millis(a) - millis(b)) / 1000;
  }

  function incidentEvidence(record) {
    return { source: record.source || 'logcat', line: record.line, timestamp: record.timestamp || null };
  }

  function mergeAnrRecords(records) {
    const out = [];
    const possiblePair = (a, b) => a !== b && a.source !== b.source && a.process === b.process && a.process !== 'unknown'
      && !(a.pid && b.pid && a.pid !== b.pid)
      && !(a.user_id != null && b.user_id != null && a.user_id !== b.user_id)
      && incidentTimeDifference(a.timestamp, b.timestamp) <= 2;
    const ambiguousLines = new Set(records.filter(record => records.filter(other => possiblePair(record, other)).length > 1).map(record => record.line));
    for (const record of records) {
      const candidates = out.filter(existing => {
        if (existing.process !== record.process || existing.process === 'unknown') return false;
        if (existing.pid && record.pid && existing.pid !== record.pid) return false;
        if (existing.user_id != null && record.user_id != null && existing.user_id !== record.user_id) return false;
        const delta = incidentTimeDifference(existing.timestamp, record.timestamp);
        if (existing.source === record.source) return delta === 0 && existing.detail === record.detail;
        if (ambiguousLines.has(existing.line) || ambiguousLines.has(record.line)) return false;
        return delta <= 2 && !existing.evidence.some(item => item.source === record.source);
      });
      // Ambiguous matches remain separate for review.
      if (candidates.length !== 1) {
        out.push({ ...record, evidence: [incidentEvidence(record)] });
        continue;
      }
      const existing = candidates[0];
      existing.evidence.push(incidentEvidence(record));
      existing.pid ||= record.pid;
      existing.user_id ??= record.user_id;
      if (existing.detail !== record.detail) existing.detail += '\n' + record.detail;
    }
    return out;
  }

  // Native crash / tombstone analysis

  function parseTombstoneTimestamp(ts) {
    const m = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})/.exec(ts || "");
    if (!m) return null;
    return {
      month: parseInt(m[2], 10), day: parseInt(m[3], 10),
      hour: parseInt(m[4], 10), min: parseInt(m[5], 10), sec: parseInt(m[6], 10),
    };
  }

  function parseLogcatTimestamp(line) {
    const m = /^(\d{2})-(\d{2})\s+(\d{2}):(\d{2}):(\d{2})\.(\d{3})/.exec(line);
    if (!m) return null;
    return {
      month: parseInt(m[1], 10), day: parseInt(m[2], 10),
      hour: parseInt(m[3], 10), min: parseInt(m[4], 10), sec: parseInt(m[5], 10),
    };
  }

  function toDaySeconds(t) {
    return Date.UTC(2000, t.month - 1, t.day, t.hour, t.min, t.sec) / 1000;
  }

  function addrValue(hex) {
    if (!hex) return null;
    const v = parseInt(hex, 16);
    return Number.isNaN(v) ? null : v;
  }

  function parseFrameOffset(rest) {
    if (!rest) return null;
    // The offset is almost always immediately followed by the frame's own
    // closing paren, even when the symbol itself contains parens (as with
    // "std::terminate()+80)"), so search for "+NUM)" rather than trying to
    // bound the whole symbol first.
    const m = /\+(0x[0-9a-fA-F]+|\d+)\)/.exec(rest);
    if (!m) return null;
    return /^0x/i.test(m[1]) ? parseInt(m[1], 16) : parseInt(m[1], 10);
  }

  function matchSensitiveProcess(cmdline) {
    if (!cmdline) return null;
    for (const { re, label } of SENSITIVE_PROCESS_PATTERNS) {
      if (re.test(cmdline)) return label;
    }
    return null;
  }

  function parseBacktrace(chunk) {
    const frames = [];
    BACKTRACE_FRAME_RE.lastIndex = 0;
    let fm;
    while ((fm = BACKTRACE_FRAME_RE.exec(chunk)) !== null) {
      const rest = (fm[4] || "").trim();
      frames.push({ frame: fm[1], pc: fm[2], path: fm[3], symbol: rest || null, offset: parseFrameOffset(rest) });
    }
    return frames;
  }

  // A single time-ordered index of logcat lines and (best-effort) usagestats
  // events, built once so each tombstone can be cross-referenced against
  // "what was happening at that moment" without re-scanning the full report.
  function buildTimelineIndex(fullText) {
    const index = [];
    const lines = fullText.split("\n");
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (LOGCAT_LINE_RE.test(line)) {
        const t = parseLogcatTimestamp(line);
        if (t) index.push({ t, text: line.trim().slice(0, 300), source: "logcat" });
      }
    }
    USAGESTATS_EVENT_RE.lastIndex = 0;
    let um;
    while ((um = USAGESTATS_EVENT_RE.exec(fullText)) !== null) {
      const t = parseTombstoneTimestamp(um[1]);
      if (t) {
        index.push({ t, text: `type=${um[2]}${um[3] ? " package=" + um[3] : ""}`, source: "usagestats" });
      }
    }
    return index;
  }

  function nearbyTimelineEvents(index, tsObj, windowSeconds, maxLines) {
    if (!tsObj || !index || !index.length) return [];
    const target = toDaySeconds(tsObj);
    const matches = [];
    for (const entry of index) {
      const diff = toDaySeconds(entry.t) - target;
      if (Math.abs(diff) <= windowSeconds) matches.push({ text: entry.text, source: entry.source, diff_seconds: diff });
    }
    matches.sort((a, b) => Math.abs(a.diff_seconds) - Math.abs(b.diff_seconds));
    return matches.slice(0, maxLines);
  }

function findNativeCrashes(fullText, logSignals) {
  const original = fullText.split(/\r?\n/);
  const lines = original.map(line => Logcat.parseLine(line)?.message ?? line);
  const out = [];
  for (let i = 0; i < lines.length; i++) {
    const pid = /^pid:\s*(\d+),?\s*tid:/.exec(lines[i].trim());
    if (!pid) continue;
    let end = Math.min(i + 180, lines.length);
    for (let j = i + 1; j < end; j++) {
      if (/^pid:\s*\d+,?\s*tid:|^\*\*\* \*\*\*|^-{6} /.test(lines[j])) { end = j; break; }
    }
    const opening = lines.slice(i, Math.min(i + 8, end)).join('\n');
    const signal = /^\s*signal\s+\d+\s*\((SIG[A-Z0-9]+)\)/m.exec(opening);
    if (!signal) continue; // Stack captures without a fatal signal are not crashes.
    const chunk = lines.slice(i, end).join('\n');
    const before = lines.slice(Math.max(0, i - 10), i).join('\n');
    const cmdline = [...before.matchAll(/Cmdline:\s*([^\n]+)/g)].pop()?.[1]?.trim()
      || />>>\s*(.*?)\s*<<</.exec(lines[i])?.[1] || 'unknown';
    const timestamp = [...before.matchAll(/Timestamp:\s*([^\n]+)/g)].pop()?.[1]?.trim()
      || Logcat.parseLine(original[i])?.timestamp || null;
    out.push({
      pid: pid[1], signal: signal[1], cmdline, timestamp, line: i + 1,
      timestamp_parsed: parseTombstoneTimestamp(timestamp) || parseLogcatTimestamp(timestamp || ''),
      fault_code: /code\s+-?\d+\s*\(([A-Z_]+)\)/.exec(opening)?.[1] || null,
      fault_addr: FAULT_ADDR_RE.exec(opening)?.[1] || null,
      abort_message: ABORT_MSG_RE.exec(chunk)?.[1]?.slice(0, 1200) || null,
      backtrace: parseBacktrace(chunk).slice(0, 40), _chunk_length: chunk.length, source: 'tombstone'
    });
  }
  const merged = [];
  const signature = crash => JSON.stringify([crash.cmdline, crash.fault_code, crash.fault_addr, crash.abort_message, crash.backtrace?.map(frame => [frame.pc, frame.path, frame.symbol])]);
  for (const crash of out) {
    const duplicate = merged.find(other => other.pid === crash.pid && other.signal === crash.signal
      && incidentTimeDifference(other.timestamp, crash.timestamp) === 0 && signature(other) === signature(crash));
    if (duplicate) duplicate.evidence.push(incidentEvidence(crash));
    else merged.push({ ...crash, evidence: [incidentEvidence(crash)] });
  }
  for (const marker of logSignals?.nativeCrashes || []) {
    const parsed = parseTombstoneTimestamp(marker.timestamp) || parseLogcatTimestamp(marker.timestamp || '');
    const matches = merged.filter(c => c.source === 'tombstone' && c.pid === marker.pid && c.signal === marker.signal
      && incidentTimeDifference(marker.timestamp, c.timestamp) <= 2
      && !c.evidence.some(item => item.source === 'fatal signal marker'));
    const record = { ...marker, source: 'fatal signal marker' };
    if (matches.length === 1) matches[0].evidence.push(incidentEvidence(record));
    else merged.push({ ...record, evidence: [incidentEvidence(record)], timestamp_parsed: parsed, backtrace: [], _chunk_length: 0, fault_code: null, fault_addr: null, abort_message: null });
  }
  return merged;
}


  // Scores one tombstone against the exploitation signifiers. Returns
  // {flags, score, severity}; flags is an array of {flag, detail}.
function classifyNativeCrash(crash) {
  const flags = [];
  let score = 0;
  if (crash.signal === 'SIGABRT') flags.push({ flag: 'process-abort', detail: 'The process aborted. Review its abort message and preceding errors.' });
  if (crash.signal === 'SIGSEGV') flags.push({ flag: 'invalid-memory-access', detail: 'The process accessed invalid memory. Inspect the fault address and symbolicated stack.' });
  if (crash.fault_code) flags.push({ flag: crash.fault_code, detail: 'Signal code reported by the tombstone.' });
  if (crash.fault_addr && addrValue(crash.fault_addr) < 4096) flags.push({ flag: 'low-fault-address', detail: 'A null or low-address access is consistent with a pointer bug; the stack is needed to diagnose it.' });
  if (crash.abort_message) {
    const sanitizer = /addresssanitizer|hwasan|heap-buffer-overflow|stack-buffer-overflow|use-after-free|tag.?mismatch/i.test(crash.abort_message);
    flags.push({ flag: sanitizer ? 'sanitizer-report' : 'abort-message', detail: crash.abort_message });
    score += sanitizer ? 30 : 10;
  }
  if (!crash.backtrace?.length) flags.push({ flag: 'stack-not-included', detail: 'No backtrace was captured in this excerpt. Obtain the matching tombstone for root-cause analysis.' });
  const sensitive = matchSensitiveProcess(crash.cmdline);
  if (sensitive) { flags.push({ flag: 'core-or-sensitive-process', detail: `Process context: ${sensitive}. Review user-visible impact.` }); score += 10; }
  return { flags, score, severity: score >= 30 ? 'high' : score >= 10 ? 'moderate' : 'low' };
}


  // Aggregates classified tombstones: repeat/clustering by process, overall
  // severity, top-scored contributors, and nearby logcat/usagestats context
  // for each (the doc's "cross reference... to see what was happening").
  function buildCrashDiagnosis(nativeCrashes, timelineIndex) {
    const diagnosis = {
      severity: "normal",
      headline: nativeCrashes.length ? "Native crashes are available for review." : "No native crashes were found.",
      contributors: [],
    };

    if (!nativeCrashes || nativeCrashes.length === 0) {
      return diagnosis;
    }

    const byProcess = new Map();
    for (const c of nativeCrashes) {
      const key = c.cmdline || "unknown";
      if (!byProcess.has(key)) byProcess.set(key, []);
      byProcess.get(key).push(c);
    }

    const scored = nativeCrashes.map((c) => {
      const classification = classifyNativeCrash(c);
      const flags = classification.flags.slice();
      let score = classification.score;

      const group = byProcess.get(c.cmdline || "unknown") || [];
      if (group.length > 1) {
        const withTs = group.filter((g) => g.timestamp_parsed);
        const dayBuckets = withTs.map((g) => toDaySeconds(g.timestamp_parsed) - (g.timestamp_parsed.hour * 3600 + g.timestamp_parsed.min * 60 + g.timestamp_parsed.sec));
        const clustered = dayBuckets.length > 1 && (dayBuckets.reduce((a, b) => Math.max(a, b), -Infinity) - dayBuckets.reduce((a, b) => Math.min(a, b), Infinity)) <= 86400;
        flags.push({
          flag: clustered ? "repeated-crashes-clustered" : "repeated-crashes",
          detail: `${group.length} crash records for ${c.cmdline}${clustered ? ", clustered within about a day — worth reviewing together." : "."}`,
        });
        score += clustered ? 15 : 8;
      }

      const nearby_events = c.timestamp_parsed ? nearbyTimelineEvents(timelineIndex, c.timestamp_parsed, 10, 8) : [];

      return { ...c, flags, diagnostic_score: Math.round(score * 10) / 10, nearby_events };
    });

    scored.sort((a, b) => b.diagnostic_score - a.diagnostic_score);
    diagnosis.contributors = scored.slice(0, 10);

    const top = diagnosis.contributors[0];
    const highCount = scored.filter((c) => c.diagnostic_score >= 40).length;
    const moderateCount = scored.filter((c) => c.diagnostic_score >= 20 && c.diagnostic_score < 40).length;

    if (highCount > 0) diagnosis.severity = "high";
    else if (moderateCount > 0) diagnosis.severity = "moderate";

    if (top && top.diagnostic_score > 0) {
      const flagNames = top.flags.map((f) => f.flag).join(", ");
      diagnosis.headline = `${top.cmdline} (pid ${top.pid}, ${top.signal}) is the highest-priority native crash for review — flags: ${flagNames}.`;
    }

    return diagnosis;
  }

  function durationToSeconds(durStr) {
    let total = 0;
    DURATION_PART_RE.lastIndex = 0;
    let m;
    while ((m = DURATION_PART_RE.exec(durStr)) !== null) {
      const value = parseInt(m[1], 10);
      const unit = m[2];
      if (unit === "d") total += value * 86400;
      else if (unit === "h") total += value * 3600;
      else if (unit === "m") total += value * 60;
      else if (unit === "s") total += value;
      else if (unit === "ms") total += value / 1000;
    }
    return total;
  }

  function classifyWakelock(lock) {
    const name = (lock.name || "").toLowerCase();
    const uid = (lock.uid || "").toLowerCase();

    // System aggregates / accounting entries.
    if (
      name.includes("powermanagerservice.wakelocks") ||
      name.includes("powermanagerservice.display") ||
      name.includes("suspendlockout")
    ) {
      return {
        category: "system-accounting",
        relevance: "low",
        reason: "System power-management accounting; not direct app attribution."
      };
    }

    // Wi-Fi / networking.
    if (
      name.includes("wlan") ||
      name.includes("wifi") ||
      name.includes("netlink")
    ) {
      return {
        category: "network",
        relevance: "high",
        reason: "Network/Wi-Fi activity can keep the device CPU/radio active."
      };
    }

    // Cellular modem.
    if (
      name.includes("ccmni") ||
      name.includes("ccci") ||
      name.includes("ril") ||
      name.includes("modem")
    ) {
      return {
        category: "cellular",
        relevance: "high",
        reason: "Cellular/modem activity can contribute to idle battery drain."
      };
    }

    // Jobs / WorkManager / JobScheduler.
    if (
      name.includes("*job*") ||
      name.includes("systemjobservice") ||
      name.includes("workmanager")
    ) {
      return {
        category: "background-job",
        relevance: "high",
        reason: "Background job execution attributed to an app."
      };
    }

    // Audio.
    if (
      name.includes("audio") ||
      name.includes("voiceservice")
    ) {
      return {
        category: "audio",
        relevance: "context-dependent",
        reason: "Expected during calls/media, suspicious if active while idle."
      };
    }

    // Display / graphics.
    if (
      name.includes("crtc") ||
      name.includes("cmdq") ||
      name.includes("display")
    ) {
      return {
        category: "display-gpu",
        relevance: "context-dependent",
        reason: "Display/GPU activity; important mainly if the screen should be off."
      };
    }

    // Serial / kernel interfaces.
    if (
      name.includes("tty") ||
      lock.type === "kernel"
    ) {
      return {
        category: "kernel",
        relevance: "context-dependent",
        reason: "Kernel-level wakelock; usually requires vendor/kernel investigation."
      };
    }

    return {
      category: lock.type === "app" ? "app" : "kernel",
      relevance: lock.type === "app" ? "medium" : "context-dependent",
      reason: lock.type === "app"
        ? "Application-attributed wakelock."
        : "Kernel wakelock."
    };
  }


  function extractPackageFromWakelock(name) {
    if (!name) return null;
    // A component is package/class. Class names and arbitrary dotted tags
    // are not package evidence; in particular, the platform package is android.
    const component = /(?:^|[\/:])((?:[a-zA-Z][\w]*\.)+[a-zA-Z][\w]*|android)\/([\w.$]+)/.exec(name);
    if (component) return component[1];
    const tagged = /^\*[^*]+\*\/((?:[a-zA-Z][\w]*\.)+[a-zA-Z][\w]*|android)(?::[^/]*)?$/.exec(name);
    return tagged?.[1] || null;
  }


  function findWakelocks(sections, fullText) {
    const searchSpaces = [];

    for (const [, content] of getSectionsByFragment(
      sections,
      ["batterystats", "battery"]
    )) {
      searchSpaces.push(content);
    }

    const markerRe = /^DUMP OF SERVICE batterystats:/gm;
    let mk;

    while ((mk = markerRe.exec(fullText)) !== null) {
      const start = mk.index + mk[0].length;
      const rest = fullText.slice(start);
      const nextService = /\nDUMP OF SERVICE /.exec(rest);
      const end = nextService
        ? start + nextService.index
        : fullText.length;

      searchSpaces.push(fullText.slice(start, end));
    }

    const locks = [];

    for (const content of searchSpaces) {
      WAKELOCK_RE.lastIndex = 0;

      let m;

      while ((m = WAKELOCK_RE.exec(content)) !== null) {
        const isKernel = !!m[1];
        const rawName = m[2].trim();
        const durationStr = m[3].trim();
        const times = parseInt(m[4], 10);

        let uid = null;
        let tag = rawName;

        if (!isKernel) {
          const uidM = WAKELOCK_UID_TAG_RE.exec(rawName);

          if (uidM) {
            uid = uidM[1];
            tag = uidM[2];
          }
        }

        const seconds = durationToSeconds(durationStr);

        const lock = {
          type: isKernel ? "kernel" : "app",
          uid,
          name: tag,
          realtime: durationStr,
          times,

          // Useful numeric fields.
          seconds,
          average_seconds: times > 0 ? seconds / times : seconds,

          // Package attribution where possible.
          package: isKernel ? null : extractPackageFromWakelock(tag)
        };

        const classification = classifyWakelock(lock);

        lock.category = classification.category;
        lock.relevance = classification.relevance;
        lock.reason = classification.reason;

        // Flags that are useful for the battery report.
        lock.flags = [];

        if (times > 1000) {
          lock.flags.push("very-frequent");
        }

        if (seconds >= 1800) {
          lock.flags.push("long-held");
        }

        if (times > 0 && seconds / times < 1) {
          lock.flags.push("short-frequent");
        }

        if (
          lock.type === "app" &&
          lock.category === "background-job" &&
          seconds >= 600
        ) {
          lock.flags.push("background-job-heavy");
        }

        if (
          lock.category === "network" &&
          seconds >= 600
        ) {
          lock.flags.push("network-heavy");
        }

        locks.push(lock);
      }
    }

    /*
     * Deduplicate the same wakelock.
     *
     * Instead of throwing away the other occurrence, aggregate it.
     */
    const dedup = new Map();

    for (const l of locks) {
      const key = [
        l.type,
        l.uid,
        l.name
      ].join("|");

      const existing = dedup.get(key);

      if (!existing) {
        dedup.set(key, { ...l });
        continue;
      }

      // Keep one coherent record; never sum the same report repeated in two sections.
      if (l.seconds > existing.seconds || (l.seconds === existing.seconds && l.times > existing.times)) dedup.set(key, { ...l });
    }

    const ranked = Array.from(dedup.values())
      .sort((a, b) => b.seconds - a.seconds);

    return ranked;
  }

  function findTotalBatterySeconds(fullText) {
    const m = TOTAL_BATTERY_RE.exec(fullText);
    if (!m) return null;
    const seconds = durationToSeconds(m[1]);
    return seconds > 0 ? seconds : null;
  }

  function buildBatteryDiagnosis(wakelocks, totalBatterySeconds) {
    const diagnosis = {
      severity: "normal",
      headline: "No major wakelock contributor identified.",
      contributors: [],
      categories: {},
      total_battery_seconds: totalBatterySeconds || null,
      totals: {
        app_seconds: 0,
        kernel_seconds: 0,
        network_seconds: 0,
        cellular_seconds: 0,
        background_job_seconds: 0,
        system_accounting_seconds: 0,
      }
    };

    if (!wakelocks || wakelocks.length === 0) {
      diagnosis.headline = "No wakelock data was found.";
      return diagnosis;
    }

    for (const w of wakelocks) {
      const s = w.seconds || 0;

      if (w.type === "app") {
        diagnosis.totals.app_seconds += s;
      } else {
        diagnosis.totals.kernel_seconds += s;
      }

      if (w.category === "network") {
        diagnosis.totals.network_seconds += s;
      }

      if (w.category === "cellular") {
        diagnosis.totals.cellular_seconds += s;
      }

      if (w.category === "background-job") {
        diagnosis.totals.background_job_seconds += s;
      }

      if (w.category === "system-accounting") {
        diagnosis.totals.system_accounting_seconds += s;
      }

      diagnosis.categories[w.category] =
        (diagnosis.categories[w.category] || 0) + s;
    }

    /*
     * System accounting entries should not be treated as a direct
     * battery culprit.
     */
    const actionable = wakelocks.filter(
      w => w.category !== "system-accounting"
    );

    /*
     * Score contributors using:
     * - total held time
     * - frequency
     * - app attribution
     * - category
     *
     * This is NOT battery percentage. It is simply a diagnostic priority.
     */
    const scored = actionable.map(w => {
      const pct = totalBatterySeconds ? (w.seconds / totalBatterySeconds) * 100 : null;
      let score = Math.log10(1 + w.seconds) * 10;

      if (w.type === "app") {
        score += 15;
      }

      if (w.category === "background-job") {
        score += 20;
      }

      if (w.category === "network") {
        score += 15;
      }

      if (w.category === "cellular") {
        score += 12;
      }

      if (w.times > 5000) {
        score += 10;
      }

      if (w.times > 1000) {
        score += 5;
      }
      if (pct !== null) {
        if (pct >= 3) score += 15;
        else if (pct >= 1) score += 7;
      } else if (w.seconds > 1800) {
        score += 10;
      }

      return {
        ...w,
        pct_of_battery_time: pct === null ? null : Math.round(pct * 100) / 100,
        diagnostic_score: Math.round(score * 10) / 10
      };
    });

    scored.sort(
      (a, b) => b.diagnostic_score - a.diagnostic_score
    );

    diagnosis.contributors = scored.slice(0, 10);

    /*
     * Determine severity from actual actionable evidence. Normalized by
     * share of on-battery time when we know the total; otherwise fall back
     * to the raw-duration heuristic (30+ min held = notable).
     */
    const isHeavy = (w) =>
      totalBatterySeconds
        ? (w.seconds / totalBatterySeconds) * 100 >= 3
        : w.seconds >= 1800;

    const isModerate = (w) =>
      totalBatterySeconds
        ? (w.seconds / totalBatterySeconds) * 100 >= 1
        : w.seconds >= 600;

    const appHeavy = actionable.some(
      w => w.type === "app" && isHeavy(w)
    );

    const networkHeavy = actionable.some(
      w => w.category === "network" && isHeavy(w)
    );

    const jobHeavy = actionable.some(
      w => w.category === "background-job" && isHeavy(w)
    );

    const frequent = actionable.some(
      w => w.times >= 5000
    );

    if (jobHeavy || appHeavy || networkHeavy) {
      diagnosis.severity = "high";
    } else if (frequent || actionable.some(isModerate)) {
      diagnosis.severity = "moderate";
    }

    const top = diagnosis.contributors[0];

    if (top) {
      const pctStr = top.pct_of_battery_time !== null
        ? `, ${top.pct_of_battery_time}% of on-battery time`
        : "";
      if (top.type === "app") {
        diagnosis.headline =
          `${top.name} is the strongest app-attributed wakelock contributor ` +
          `(${top.realtime}${pctStr}, ${top.times} acquisitions).`;
      } else {
        diagnosis.headline =
          `${top.name} is the largest non-app/kernel contributor ` +
          `(${top.realtime}${pctStr}, ${top.times} acquisitions).`;
      }
    }

    return diagnosis;
  }


  // ---------------------------------------------------------------------
  // Stalkerware / surveillance-app correlation
  // ---------------------------------------------------------------------

  function sectionContentByMarker(fullText, markerRe) {
    const out = [];
    const re = new RegExp(markerRe.source, markerRe.flags.includes("g") ? markerRe.flags : markerRe.flags + "g");
    let mk;
    while ((mk = re.exec(fullText)) !== null) {
      const start = mk.index + mk[0].length;
      const rest = fullText.slice(start);
      const nextService = /\nDUMP OF SERVICE /.exec(rest);
      out.push(nextService ? rest.slice(0, nextService.index) : rest);
    }
    return out;
  }
  function findPackageInfo(fullText) {
    const packages = new Map();
    for (const content of sectionContentByMarker(fullText, /DUMP OF SERVICE package:/)) {
      let current = null;
      let mode = null, userId = null, packageIndent = 0, modeIndent = 0;
      for (const line of content.split("\n")) {
        const indent = line.search(/\S/);
        const pkgM = PKG_HEADER_RE.exec(line);
        if (pkgM) {
          current = pkgM[1];
          if (!packages.has(current)) {
            packages.set(current, { requested: new Set(), grantedRuntime: new Set(), users: new Map(), codePath: null, isSystem: null });
          }
          mode = null; userId = null; packageIndent = indent;
          continue;
        }
        if (!current) continue;
        if (indent >= 0 && indent <= packageIndent) { current = null; mode = null; continue; }
        const pkgData = packages.get(current);
        const user = /^\s*User\s+(\d+):/.exec(line);
        if (user) {
          userId = Number(user[1]); mode = null;
          if (!pkgData.users.has(userId)) pkgData.users.set(userId, { grantedRuntime: new Set(), installed: null });
          const installed = /\binstalled=(true|false)/.exec(line);
          if (installed) pkgData.users.get(userId).installed = installed[1] === 'true';
          continue;
        }

        if (pkgData.codePath === null) {
          const cpM = CODEPATH_RE.exec(line);
          if (cpM) pkgData.codePath = cpM[1];
        }
        if (pkgData.isSystem === null) {
          const flagsM = PKG_FLAGS_RE.exec(line);
          if (flagsM) pkgData.isSystem = /\bSYSTEM\b/.test(flagsM[1]);
        }

        if (REQ_PERMS_HEADER_RE.test(line)) { mode = "requested"; modeIndent = indent; continue; }
        if (RUNTIME_PERMS_HEADER_RE.test(line)) { mode = "runtime"; modeIndent = indent; continue; }
        if (mode && indent >= 0 && indent <= modeIndent) mode = null;

        if (mode) {
          const permM = PERM_LINE_RE.exec(line);
          if (permM) {
            if (mode === "requested") pkgData.requested.add(permM[1]);
            if (mode === "runtime" && permM[2] === "true") {
              const grants = userId == null ? pkgData.grantedRuntime : pkgData.users.get(userId).grantedRuntime;
              grants.add(permM[1]);
            }
          }
        }
      }
    }
    return packages;
  }

  function componentPackages(text) {
    return [...text.matchAll(/\b((?:[A-Za-z_][\w]*\.)+[A-Za-z_][\w]*|android)\/[\w.$]+/g)].map(match => match[1]);
  }

  // Keep installed, enabled and bound distinct; only explicit state blocks count.
  function findAccessibilityServiceAccess(fullText) {
    const access = new Map();
    const record = (pkg, user, state) => {
      if (!access.has(pkg)) access.set(pkg, new Map());
      const users = access.get(pkg);
      if (!users.has(user)) users.set(user, { enabled: false, bound: false });
      users.get(user)[state] = true;
    };
    for (const content of sectionContentByMarker(fullText, /DUMP OF SERVICE accessibility:/)) {
      let user = null, state = null, depth = 0;
      for (const line of content.split('\n')) {
        if (/^\s*User state\[/.test(line)) { user = null; state = null; }
        const id = /\bcurrentUserId=(\d+)|\battributes:\s*\{\s*id=(\d+)|^\s*User\s+(\d+):/.exec(line);
        if (id) { user = Number(id[1] || id[2] || id[3]); state = null; }
        const heading = /^\s*(Enabled|Bound)\s+services\s*[:=]\s*(.*)/i.exec(line);
        if (heading) { state = heading[1].toLowerCase(); depth = 0; }
        else if (/^\s*[A-Za-z][\w ]*\s*[:=]/.test(line) && !/^\s*(?:id|component|serviceInfo)\s*[:=]/i.test(line)) state = null;
        if (!state) continue;
        const value = heading ? heading[2] : line;
        for (const pkg of componentPackages(value)) record(pkg, user, state);
        depth += (value.match(/[\[{]/g) || []).length - (value.match(/[\]}]/g) || []).length;
        if (depth <= 0 && value.trim()) state = null;
      }
    }
    ENABLED_A11Y_SETTING_RE.lastIndex = 0;
    for (const setting of fullText.matchAll(ENABLED_A11Y_SETTING_RE)) {
      // A bare settings export has no trustworthy user/profile identity.
      for (const pkg of componentPackages(setting[1])) record(pkg, null, 'enabled');
    }
    return access;
  }

  function findDeviceAdminAccess(fullText) {
    const access = new Map();
    for (const content of sectionContentByMarker(fullText, /DUMP OF SERVICE device_policy:/)) {
      let user = null, inAdmins = false, headerIndent = 0;
      for (const line of content.split('\n')) {
        const header = /^(\s*)Enabled Device Admins\s*\(User\s+(\d+)/i.exec(line);
        if (header) { user = Number(header[2]); inAdmins = true; headerIndent = header[1].length; continue; }
        if (line.trim() && line.search(/\S/) <= headerIndent) inAdmins = false;
        if (!inAdmins) continue;
        for (const pkg of componentPackages(line)) {
          if (!access.has(pkg)) access.set(pkg, new Set());
          access.get(pkg).add(user);
        }
      }
    }
    return access;
  }

  // Packages exempted from battery optimization/Doze
  function findBatteryOptimizationExemptPackages(fullText) {
    const pkgs = new Set();
    for (const content of sectionContentByMarker(fullText, /DUMP OF SERVICE deviceidle:/)) {
      for (const line of content.split("\n")) {
        const m = WHITELIST_PKG_LINE_RE.exec(line);
        if (m) pkgs.add(m[1]);
      }
    }
    return pkgs;
  }

  function isUserInstalledPackage(info) {
    if (info.isSystem === true) return false;
    if (info.isSystem === false) return true;
    if (info.codePath) return !/^\/(system|vendor|product|apex|system_ext)\//.test(info.codePath);
    return null; // unknown either way
  }

  function matchKnownStalkerwarePattern(pkgName) {
    for (const { re, label } of KNOWN_STALKERWARE_PATTERNS) {
      if (re.test(pkgName)) return label;
    }
    return null;
  }

  function looksLikeSystemNameMimicry(pkgName) {
    return /(system|android|google|service|sync|update)/i.test(pkgName) && !/^com\.(google|android)\./i.test(pkgName);
  }

  // Scores one package against the correlated indicators. Every flag here is
  // individually explainable by a legitimate app (MDM, parental controls,
  // "Find My Device", accessibility tools for users with disabilities) —
  // the point is that several clustering on one app is what's worth a closer
  // look, mirroring the native-crash classifier's "one signal proves
  // nothing, several together do" approach.
  function classifyPackageIndicators(pkgName, info, context) {
    const flags = [];
    let score = 0;
    const userInstalled = isUserInstalledPackage(info);

    const knownMatch = matchKnownStalkerwarePattern(pkgName);
    if (knownMatch) {
      flags.push({ flag: "known-stalkerware-name-pattern", detail: `Package name matches a publicly documented ${knownMatch} naming pattern.` });
      score += 50;
    }

    const hasA11y = context.accessibilitySet.has(pkgName);
    const hasBoundA11y = context.accessibilityBoundSet?.has(pkgName);
    const hasAdmin = context.deviceAdminSet.has(pkgName);
    const hasBatteryExempt = context.batteryExemptSet.has(pkgName);

    if (hasA11y) {
      if (userInstalled) {
        flags.push({ flag: "accessibility-service-enabled", detail: "An Accessibility Service is explicitly listed as enabled for this user/profile. Review whether that access is intended." });
        score += 25;
      } else {
        flags.push({ flag: "accessibility-service-enabled", detail: "An Accessibility Service is explicitly listed as enabled. Installation type and user/profile are shown separately." });
        score += 5;
      }
    }

    if (hasBoundA11y) {
      flags.push({ flag: 'accessibility-service-bound', detail: 'An Accessibility Service is listed as bound in this snapshot. Bound and enabled states are recorded separately.' });
      if (!hasA11y) score += userInstalled ? 25 : 5;
    }

    if (hasAdmin) {
      flags.push({
        flag: "device-admin-enabled",
        detail: userInstalled
          ? "Registered as a Device Administrator — can restrict uninstall, wipe data, lock the screen, etc."
          : "Listed among enabled Device Administrators for this user/profile.",
      });
      score += userInstalled ? 20 : 5;
    }

    if (hasBatteryExempt && userInstalled) {
      flags.push({ flag: "battery-optimization-exempt", detail: "Exempted from battery optimization/Doze, letting it keep running in the background. Weak alone — many legitimate apps request this too." });
      score += 8;
    }

    const specialPresent = SPECIAL_ACCESS_PERMISSIONS.filter((p) => info.requested.has(p));
    if (specialPresent.length > 0) {
      flags.push({
        flag: "special-access-permissions",
        detail: `Requests special-access permissions: ${specialPresent.map((p) => p.replace("android.permission.", "")).join(", ")}.`,
      });
      score += Math.min(3, specialPresent.length) * 6;
    }

    const grantedGroups = Object.entries(DANGEROUS_PERMISSION_GROUPS).filter(([, perms]) => perms.some((p) => info.grantedRuntime.has(p)));
    if (grantedGroups.length > 0) {
      flags.push({
        flag: "sensitive-permissions-granted",
        detail: `Granted sensitive permission categories: ${grantedGroups.map(([g]) => g.replace("_", " ")).join(", ")}.`,
      });
      score += Math.min(4, grantedGroups.length) * 5;
    }
    if (grantedGroups.length >= 3 && userInstalled) {
      flags.push({
        flag: "surveillance-permission-cluster",
        detail: "This user/profile has grants in three or more sensitive-data categories. Review the app's purpose and whether the grants are intended; this does not establish monitoring activity.",
      });
      score += 25;
    }

    if (userInstalled && looksLikeSystemNameMimicry(pkgName)) {
      flags.push({ flag: "system-name-mimicry", detail: "Package name imitates system/service naming while being user-installed. Weak signal alone — many legitimate apps use generic names too." });
      score += 8;
    }

    if (context.batteryPackages.has(pkgName) && userInstalled) {
      flags.push({ flag: "background-wakelock-holder", detail: "Also appears as a significant background wakelock/battery contributor elsewhere in this report." });
      score += 10;
    }

    score = Math.min(100, score);
    let severity = "low";
    if (score >= 50) severity = "high";
    else if (score >= 25) severity = "moderate";

    return { flags, score: Math.round(score * 10) / 10, severity, userInstalled };
  }

  // Aggregates per-package classification into a report-level correlation,
  // ranked by score, in the same shape as buildBatteryDiagnosis/
  // buildCrashDiagnosis.
  function buildStalkerwareCorrelation(fullText, batteryDiagnosis) {
    const result = {
      severity: "normal",
      headline: "No correlated surveillance-app indicators found.",
      contributors: [],
      total_packages: 0,
      note:
        "Heuristic correlation of publicly documented indicators (accessibility-service abuse, device-admin registration, " +
        "battery-optimization exemption, sensitive-permission clusters, and known package-name patterns). This is not proof " +
        "of stalkerware: legitimate MDM, parental-control, and accessibility tools trigger the same technical signals. If you " +
        "believe you're being monitored without consent, consider consulting a resource like the Coalition Against " +
        "Stalkerware (stopstalkerware.org) before uninstalling anything, since removal can alert whoever is monitoring the device.",
    };

    const packageInfo = findPackageInfo(fullText);
    const accessibilityAccess = findAccessibilityServiceAccess(fullText);
    const deviceAdminAccess = findDeviceAdminAccess(fullText);
    const batteryExemptSet = findBatteryOptimizationExemptPackages(fullText);
    const batteryPackages = new Set(
      ((batteryDiagnosis && batteryDiagnosis.contributors) || []).map((w) => w.package).filter(Boolean)
    );

    // Union of every package we have any signal about, so one that only
    // shows up in accessibility/admin/whitelist dumps (and wasn't fully
    // captured by the package-permissions parse) still gets considered.
    const allPkgNames = new Set([
      ...packageInfo.keys(),
      ...accessibilityAccess.keys(),
      ...deviceAdminAccess.keys(),
      ...batteryExemptSet,
    ]);

    if (allPkgNames.size === 0) {
      result.headline = "No package/permission data was found to correlate (this bugreport may not include a full dumpsys package section).";
      return result;
    }

    const scored = [];
    for (const pkgName of allPkgNames) {
      const info = packageInfo.get(pkgName) || { requested: new Set(), grantedRuntime: new Set(), users: new Map(), codePath: null, isSystem: null };
      const userIds = new Set([...info.users.keys(), ...(accessibilityAccess.get(pkgName)?.keys() || []), ...(deviceAdminAccess.get(pkgName) || [])]);
      if (!userIds.size || info.grantedRuntime.size) userIds.add(null);
      const profiles = [];
      for (const userId of userIds) {
        const permissions = userId == null ? { grantedRuntime: info.grantedRuntime, installed: null } : info.users.get(userId);
        if (permissions?.installed === false) continue;
        const access = accessibilityAccess.get(pkgName)?.get(userId);
        const context = {
          accessibilitySet: new Set(access?.enabled ? [pkgName] : []),
          accessibilityBoundSet: new Set(access?.bound ? [pkgName] : []),
          deviceAdminSet: new Set(deviceAdminAccess.get(pkgName)?.has(userId) ? [pkgName] : []),
          batteryExemptSet, batteryPackages,
        };
        const grants = permissions?.grantedRuntime || new Set();
        const classification = classifyPackageIndicators(pkgName, { ...info, grantedRuntime: grants }, context);
        profiles.push({ user_id: userId, installed: permissions?.installed ?? null, granted_permissions: [...grants], flags: classification.flags, diagnostic_score: classification.score });
      }
      profiles.sort((a, b) => b.diagnostic_score - a.diagnostic_score);
      const top = profiles[0];
      if (top?.diagnostic_score > 0) {
        scored.push({
          package: pkgName,
          user_installed: isUserInstalledPackage(info),
          user_id: top.user_id,
          requested_permissions: Array.from(info.requested),
          granted_permissions: top.granted_permissions,
          flags: top.flags,
          diagnostic_score: top.diagnostic_score,
          permission_profiles: profiles,
        });
      }
    }

    scored.sort((a, b) => b.diagnostic_score - a.diagnostic_score);
    result.total_packages = scored.length;
    result.contributors = scored;

    const highCount = scored.filter((c) => c.diagnostic_score >= 50).length;
    const moderateCount = scored.filter((c) => c.diagnostic_score >= 25 && c.diagnostic_score < 50).length;
    if (highCount > 0) result.severity = "high";
    else if (moderateCount > 0) result.severity = "moderate";

    const top = result.contributors[0];
    if (top) {
      const flagNames = top.flags.map((f) => f.flag).join(", ");
      result.headline = `${top.package} has the strongest correlated indicators (score ${top.diagnostic_score}) — flags: ${flagNames}.`;
    }

    return result;
  }


  function findLowMemoryEvents(fullText) {
    const events = [];
    LOW_MEM_RE.lastIndex = 0;
    let m;
    while ((m = LOW_MEM_RE.exec(fullText)) !== null) {
      const line = m[0].slice(0, 200);
      if (BENIGN_MEM_RE.test(line)) continue;
      events.push(line);
  
    }
    return events;
  }

  function findOomKills(fullText) {
    const out = [];
    OOM_KILL_RE.lastIndex = 0;
    let m;
    while ((m = OOM_KILL_RE.exec(fullText)) !== null) {
      out.push({ process: m[1] });
  
    }
    return out;
  }

  function findFrameDrops(fullText) {
    const drops = [];
    FRAME_DROP_RE.lastIndex = 0;
    let m;
    while ((m = FRAME_DROP_RE.exec(fullText)) !== null) {
      drops.push(parseInt(m[1], 10));
    }
    if (drops.length === 0) return { count: 0, max_skipped: 0, total_skipped: 0 };
    return {
      count: drops.length,
      max_skipped: drops.reduce((max, n) => Math.max(max, n), 0),
      total_skipped: drops.reduce((a, b) => a + b, 0),
    };
  }

  function topOffendingProcesses(javaCrashes, anrs, nativeCrashes) {
    const counter = new Map();
    const bump = (k) => counter.set(k, (counter.get(k) || 0) + 1);
    javaCrashes.forEach((c) => bump(c.process));
    anrs.forEach((a) => bump(a.process));
    nativeCrashes.forEach((n) => bump(n.cmdline));
    return Array.from(counter.entries()).sort((a, b) => b[1] - a[1]).slice(0, 10);
  }

  // ---------------------------------------------------------------------
  // Orchestration
  // ---------------------------------------------------------------------
  function analyze(fullText, sourceName, logData, logSignals) {
    const sections = splitSections(fullText);
    const unparsedRecords = logData.records.filter(record => record.level === '?');
    const javaCrashes = [...logSignals.javaCrashes, ...findJavaCrashes(logData.lines, unparsedRecords)];
    const anrs = mergeAnrRecords([...logSignals.anrs, ...findAnrs(logData.lines, unparsedRecords)]);
    const nativeCrashes = findNativeCrashes(fullText, logSignals);
    const wakelocks = findWakelocks(sections, fullText);
    const totalBatterySeconds = findTotalBatterySeconds(fullText);
    const batteryDiagnosis = buildBatteryDiagnosis(wakelocks, totalBatterySeconds);
    const lowMem = findLowMemoryEvents(fullText);
    const oomKills = findOomKills(fullText);
    const frameDrops = findFrameDrops(fullText);
    const topOffenders = topOffendingProcesses(javaCrashes, anrs, nativeCrashes);

    // Native-crash exploitation-signal triage, cross-referenced against a
    // logcat/usagestats timeline built once for the whole report.
    const timelineIndex = buildTimelineIndex(fullText);
    const crashDiagnosis = buildCrashDiagnosis(nativeCrashes, timelineIndex);
    const stripInternal = ({ _chunk_length, timestamp_parsed, ...rest }) => rest;
    const cleanNativeCrashes = nativeCrashes.map(stripInternal);
    const cleanCrashDiagnosis = {
      ...crashDiagnosis,
      contributors: crashDiagnosis.contributors.map(stripInternal),
    };

    // Stalkerware / surveillance-app correlation across package permissions,
    // accessibility services, device admins, and battery-exemption lists.
    const stalkerwareIndicators = buildStalkerwareCorrelation(fullText, batteryDiagnosis);

    return {
      source_file: sourceName,
      analyzed_at: new Date().toISOString(),
      section_count: Object.keys(sections).length,
      sections_found: Object.keys(sections).sort().slice(0, 100),

      counts: {
        java_crashes: javaCrashes.length,
        anrs: anrs.length,
        native_crashes: nativeCrashes.length,
        wakelocks_reported: wakelocks.length,
        low_memory_events: lowMem.length,
        oom_kills: oomKills.length,
        frame_drop_events: frameDrops.count,
        correlated_surveillance_indicators: stalkerwareIndicators.total_packages,
      },

      top_offending_processes: topOffenders,

      java_crashes: javaCrashes.slice(0, 50),
      anrs: anrs.slice(0, 50),
      native_crashes: cleanNativeCrashes.slice(0, 50),

      wakelocks: wakelocks.slice(0, 100),

      battery_diagnosis: batteryDiagnosis,

      crash_diagnosis: cleanCrashDiagnosis,

      stalkerware_indicators: stalkerwareIndicators,

      low_memory_events: lowMem.slice(0, 20),
      oom_kills: oomKills.slice(0, 20),
      frame_drops: frameDrops,
    };

  }


function bugReportDetails(text, result, logData) {
  const property = name => {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`\\[${escaped}\\]:\\s*\\[([^\\]]*)\\]`).exec(text)?.[1] || '';
  };
  result.tool = 'bugreport'; result.version = 2;
  result.device = {
    manufacturer: property('ro.product.manufacturer'), model: property('ro.product.model'),
    android: property('ro.build.version.release'), sdk: property('ro.build.version.sdk'),
    build: property('ro.build.fingerprint') || /Build fingerprint:\s*'([^']+)'/.exec(text)?.[1] || ''
  };
  result.coverage = {
    physical_lines: logData.lines.length, log_records: logData.parsed,
    battery: /^(?:DUMP OF SERVICE batterystats:|------ [^\n]*(?:BATTERY STATS|batterystats)[^\n]* ------|\s{0,4}Battery History\s*\()/mi.test(text),
    packages: /^(?:DUMP OF SERVICE package:|Packages:\s*$)/m.test(text),
    sectioned: !(result.section_count === 1 && result.sections_found[0] === 'FULL_TEXT')
  };
  result.notes = [
    'Findings describe the supplied capture. Missing sections cannot establish that an issue is absent.',
    'Wakelock times may overlap and do not measure energy consumption. Scores prioritise review; they are not probabilities.',
    'Native crash and package-access signals do not establish exploitation or malware.'
  ];
  if (!result.coverage.sectioned) result.notes.unshift('No standard bugreport section headers found. For a standalone logcat file, use Log Analyser for detailed filtering.');
  if (!result.coverage.battery) result.battery_diagnosis.headline = 'Battery statistics were not found in this capture.';
  result.stalkerware_indicators.note = 'Review the observed grants and enabled services in context. Legitimate accessibility, management, and parental-control apps can have the same access. Package names alone do not identify an app reliably.';
  result.limits = { java_crashes: 50, anrs: 50, native_crashes: 50, low_memory_examples: 20, oom_examples: 20, wakelocks: 100 };
  return result;
}

  return { analyze, details: bugReportDetails };
})();

;
(() => {
'use strict';
const { MAX_FILE_BYTES, FILE_LIMIT_LABEL, MAX_LINES, MAX_ARCHIVE_ENTRIES } = AnalysisConfig;
let archive = null, activeFile = null, activeTool = '', logData = null, logFindings = null, report = null;
let archiveEntries = [], activeEntry = null, entrySelection = null;
let lastProgress = 0;
function progress(message, force = false) {
  if (force || Date.now() - lastProgress > 120) { postMessage({ type: 'progress', message }); lastProgress = Date.now(); }
}
function requireReady() { if (!logData || !report) throw new Error('Choose a file and finish analysis first.'); }

async function extractEntry(entry, maxBytes = MAX_FILE_BYTES) {
  return new Promise((resolve, reject) => {
    const decoder = new TextDecoder('utf-8'), chunks = [];
    let size = 0, failed = false;
    const stream = entry.internalStream('uint8array');
    stream.on('data', chunk => {
      if (failed) return;
      size += chunk.length;
      if (size > maxBytes) { failed = true; stream.pause(); reject(new Error(maxBytes === MAX_FILE_BYTES ? `The extracted file exceeds the ${FILE_LIMIT_LABEL} limit. Choose a smaller capture.` : 'Archive metadata is too large. Choose the report manually.')); return; }
      chunks.push(decoder.decode(chunk, { stream: true }));
      progress(`Extracting ${entry.name} · ${(size / 1048576).toFixed(1)} MiB`);
    });
    stream.on('error', error => { failed = true; reject(error); });
    stream.on('end', () => { if (!failed) { chunks.push(decoder.decode()); resolve(chunks.join('')); } });
    stream.resume();
  });
}

async function inspectFile(file, tool) {
  const validationError = validateCapture(file, tool);
  if (validationError) throw new Error(validationError);
  if (!['bugreport', 'logcat', 'packages', 'getprop'].includes(tool)) throw new Error('Choose a supported analyser.');
  if (typeof file.text !== 'function' || typeof file.arrayBuffer !== 'function') throw new Error('Choose a readable file from your device.');
  activeFile = file; activeTool = tool; archive = null; logData = null; report = null;
  archiveEntries = []; activeEntry = null; entrySelection = null;
  progress('Reading your file…', true);
  if (/\.zip$/i.test(file.name)) {
    const buffer = await readCapture(file, 'arrayBuffer');
    try { archive = await JSZip.loadAsync(buffer); }
    catch (_) { throw new Error('Could not open this ZIP. It may be damaged, encrypted, or use an unsupported compression method.'); }
    const entries = Object.values(archive.files).filter(e => !e.dir && !e.name.startsWith('__MACOSX/') && /\.(txt|log)$/i.test(e.name));
    if (!entries.length) throw new Error('No .txt or .log files were found inside this ZIP.');
    if (entries.length > MAX_ARCHIVE_ENTRIES) throw new Error(`This ZIP contains more than ${MAX_ARCHIVE_ENTRIES.toLocaleString('en-US')} text files. Extract the report you need and open it directly.`);
    entries.sort((a, b) => Number(/(?:bugreport|logcat)[^/]*\.(txt|log)$/i.test(b.name)) - Number(/(?:bugreport|logcat)[^/]*\.(txt|log)$/i.test(a.name)) || a.name.localeCompare(b.name));
    archiveEntries = entries.map(e => e.name);
    if (tool === 'bugreport') {
      const metadata = archive.file('main_entry.txt') || archive.file('main-entry.txt');
      let mainEntry = '';
      if (metadata) {
        try { mainEntry = (await extractEntry(metadata, 4096)).replace(/^\uFEFF/, '').trim(); }
        catch (_) { /* Missing or invalid metadata falls back to the picker. */ }
      }
      if (mainEntry && !/[\0\r\n\\]/.test(mainEntry) && !mainEntry.startsWith('/') && !mainEntry.split('/').includes('..') && archiveEntries.includes(mainEntry)) {
        await chooseEntry(mainEntry, 'metadata');
        return;
      }
    }
    if (entries.length > 1) { listArchiveEntries(); return; }
    await chooseEntry(entries[0].name, 'single-entry');
  } else {
    await runAnalysis(await readCapture(file, 'text'), file.name);
  }
}

async function readCapture(file, method) {
  try { return await file[method](); }
  catch (cause) {
    throw new Error('This file could not be read from disk. If it lives on a cloud-synced or network drive, make it available offline and try again.', { cause });
  }
}

async function inspectSettings(files) {
  const error = SettingsAnalysis.validateFiles(files);
  if (error) throw new Error(error);
  // Validate the complete selection before reading any file.
  for (const file of files) if (typeof file.text !== 'function') throw new Error('Choose readable settings files from your device.');
  archive = null; activeFile = null; activeTool = 'settings'; logData = null; logFindings = null; report = null;
  const inputs = [];
  for (const file of files) {
    progress(`Reading ${file.name}…`, true);
    inputs.push({ namespace: SettingsAnalysis.namespaceForFile(file.name), source_file: file.name, text: await readCapture(file, 'text') });
  }
  report = SettingsAnalysis.analyse(inputs, progress);
  postMessage({ type: 'result', summary: report });
}

function listArchiveEntries() {
  if (!archive || !archiveEntries.length) throw new Error('Reopen the ZIP to choose another entry.');
  postMessage({ type: 'archive', entries: archiveEntries, selected: activeEntry });
}

async function chooseEntry(name, selection = 'manual') {
  const entry = archive?.file(name);
  if (!entry || !archiveEntries.includes(name)) throw new Error('Choose a text or log file from the archive.');
  logData = null; logFindings = null; report = null;
  activeEntry = name; entrySelection = selection;
  progress('Extracting the selected report…', true);
  const text = await extractEntry(entry);
  const source = `${activeFile.name} / ${entry.name}`;
  await runAnalysis(text, source);
}

async function runAnalysis(text, source) {
  if (!text.trim()) throw new Error('The selected file has no text to analyse.');
  if (activeTool === 'getprop') {
    progress('Reading Android system properties…', true);
    report = GetpropAnalysis.analyse(text, source, progress);
    postMessage({ type: 'result', summary: report });
    return;
  }
  if (activeTool === 'packages') {
    progress('Reading package inventory…', true);
    report = PackageAnalysis.analyse(text, source, progress);
    postMessage({ type: 'result', summary: report });
    return;
  }
  const sample = text.slice(0, 16000);
  if ((sample.match(/\0/g) || []).length > 5) throw new Error('This does not look like UTF-8 text. Export the capture as UTF-8 .txt and try again.');
  let lineCount = 1;
  // A final newline terminates the last line; it does not add a source line.
  for (let i = 0; i < text.length - 1; i++) {
    if (text.charCodeAt(i) === 10 && ++lineCount > MAX_LINES) {
      throw new Error(`This capture exceeds ${MAX_LINES.toLocaleString('en-US')} lines. Split it into smaller files and analyse each part.`);
    }
  }
  progress('Parsing log records…', true);
  logData = Logcat.parse(text, progress);
  if (activeTool === 'logcat' && !logData.parsed) throw new Error('No supported logcat records were found. Use threadtime, time, brief, or long format; raw message-only logs have no priority or process fields.');
  progress('Grouping crash markers and recurring errors…', true);
  logFindings = Logcat.signals(logData);
  if (activeTool === 'logcat') {
    report = Logcat.summary(logData, source, logFindings);
  } else {
    progress('Analysing crashes, battery statistics, and package access…', true);
    report = Bugreport.details(text, Bugreport.analyze(text, source, logData, logFindings), logData);
  }
  if (archive) report.archive = { entries: archiveEntries, selected_entry: activeEntry, selection: entrySelection };
  postMessage({ type: 'result', summary: report });
}

function query(filters, page, requestId) {
  requireReady();
  postMessage({ type: 'query', requestId, ...LogQuery.selectPage(logData.records, filters, page) });
}

function context(line, requestId) {
  requireReady();
  const { CONTEXT_BEFORE, CONTEXT_AFTER, CONTEXT_LINE_CHARS } = AnalysisConfig;
  const target = Math.max(1, Math.min(logData.lines.length, Math.floor(Number(line)) || 1));
  const start = Math.max(1, target - CONTEXT_BEFORE), end = Math.min(logData.lines.length, target + CONTEXT_AFTER);
  const lines = logData.lines.slice(start - 1, end).map((text, i) => ({ line: start + i, text: text.slice(0, CONTEXT_LINE_CHARS), shortened: text.length > CONTEXT_LINE_CHARS }));
  postMessage({ type: 'context', requestId, target, start, end, total: logData.lines.length, lines });
}

function exportLog(filters) {
  requireReady();
  const parts = [];
  let count = 0, lastBuffer = null;
  for (const r of logData.records) {
    if (!Logcat.matches(r, filters)) continue;
    if (r.buffer !== lastBuffer && r.buffer !== 'unspecified') { parts.push(`--------- beginning of ${r.buffer}\n`); lastBuffer = r.buffer; }
    parts.push(logData.lines.slice(r.line - 1, r.endLine).join('\n') + '\n'); count++;
  }
  postMessage({ type: 'export', blob: new Blob(parts, { type: 'text/plain;charset=utf-8' }), count });
}

self.onmessage = async ({ data }) => {
  if (!data || typeof data !== 'object') data = {};
  try {
    switch (data.type) {
      case 'open': await inspectFile(data.file, data.tool); break;
      case 'open-settings': await inspectSettings(data.files); break;
      case 'package-metadata': {
        const file = data.file;
        const limit = /\.json$/i.test(file?.name || '') ? AnalysisConfig.MAX_PACKAGE_BYTES : MAX_FILE_BYTES;
        if (!file || typeof file.name !== 'string' || !/\.(json|txt)$/i.test(file.name) || !Number.isFinite(file.size) || file.size <= 0 || file.size > limit || typeof file.text !== 'function') throw new Error('Choose metadata JSON up to 20 MiB or dumpsys text up to 150 MiB.');
        const enriched = PackageAnalysis.enrich(data.summary, await readCapture(file, 'text'), file.name);
        postMessage({ type: 'metadata-result', summary: enriched });
        break;
      }
      case 'entry': await chooseEntry(data.name); break;
      case 'list-entries': listArchiveEntries(); break;
      case 'query': query(data.filters, data.page, data.requestId); break;
      case 'context': context(data.line, data.requestId); break;
      case 'export': exportLog(data.filters); break;
      default: throw new Error('Unknown analysis request.');
    }
  } catch (error) {
    postMessage({ type: 'error', operation: data.type, requestId: data.requestId, message: error?.message || 'The file could not be analysed.' });
  }
};
})();
