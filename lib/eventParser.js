var split      = require('split')
  ,th2         = require('through2')
  ,util        = require('util')
  ,fs          = require('fs')
  ,log         = require('winston')
  ,Q           = require('q')
  ,debug       = require('debug')('ztreamy:EventParser')
  ,events      = require('events')
  ,EventEmitter = events.EventEmitter
  ,inspect     = util.inspect;

//options.stream: source stream
function EventParser(options) {
  util.inherits(this,events.EventEmitter);
  var self = this;
  self._options=options;
  self.lines = 0;
  self.events = 0;
  self.header = {};
  self.body='';
  self.bodyLength=-1;
  self.pastBody='';
  self.objs=[];
  self.iStream=null;
  //check if a source stream is provided
  if(typeof self._options === 'undefined' || typeof self._options.stream.pipe !== 'function'){
    log.error('Options: ',self._options);
    throw new Error('A source stream must be provided');
  }else{
    self.iStream = self._options.stream;
    self.oStream = self.iStream.pipe(split()).pipe(th2({objectMode: true},self.onDataThrough));
    self.oStream.on('data', function(obj){
       debug('Emmiting object', obj);
       if (typeof obj.header !== 'undefined')
         self.oStream.emit('parsedEvent',obj);
    });

    self.oStream.on('end',function(){
      debug('Lines: %d, Events: %d',self.lines, self.events);
      debug('Obj events: %d',self.objs.length);
    });
    return self.oStream;
  }
}

EventParser.prototype.onDataThrough = function(line,enc,callback){
  var self=this;
  self.lines++;
  debug('line:',line);
  if(line.length===0){
    self.events++;
    self.bodyLength = self.header ? self.header['Body-Length'] : 0;
    self.pastBody='';
    debug('Blank line, bodyLength: %d',self.bodyLength);
    if (self.bodyLength == 0) {
      debug('body length 0 and blank line, so pushing event');
      self.push({header: self.header, body: self.body})
      self.header={};
      self.bodyLength=-1;
    }
  }else{
    if(typeof self.bodylength !== 'undefined' && self.bodyLength !== -1){
      if(typeof self.pastBody != 'undefined' && self.pastBody.length !== 0){
        //concat past body with line
        line=self.pastBody+'\r\n'+line;
        self.pastBody='';
      }
      if(line.length >= self.bodyLength){
        debug('line length: %d, body length: %d',line.length,self.bodyLength);
        debug('line: %s',line);
        self.body=line.slice(0,self.bodyLength);
        self.push({header: self.header, body: self.body})
        self.header={};
        line=line.slice(self.bodyLength);
        self.bodyLength=-1;
        if(line.length === 0){//after body possibly trimmed
          self.header={};
          self.body='';
        }else{
          debug('processing to get header:\n ====== \n %s \n ======',line);
          var keyValue=line.split(': ');
          self.header[keyValue[0]]=keyValue[1];
        }
      }else{
        self.pastBody=self.pastBody+line;
      }
    }else{
        debug('processing to get header:\n ====== \n %s \n ======',line);
        var kV=line.split(': ');
        if ( kV.length === 2 ) {
          if (typeof self.header === 'undefined')
            self.header = {};
          self.header[kV[0]]=kV[1];
        }
    }
  }
  callback();

};
module.exports = EventParser;
