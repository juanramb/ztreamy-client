var split      = require('split2')
  ,th2         = require('through2')
  ,util        = require('util')
  ,fs          = require('fs')
  ,log         = require('winston')
  ,Q           = require('q')
  ,debug       = require('debug')('ztreamy:EventParser')
  ,debug2       = require('debug')('ztreamy:EventParser:basura')
  ,EventEmitter      = require('events')
  ,inspect     = util.inspect;

//options.stream: source stream
function EventParser(options) {
  EventEmitter.call(this);

  this._options=options;
  this.lines = 0;
  this.events = 0;
  this.header = {};
  this.body='';
  this.bodyLength=-1;
  this.pastBody='';
  this.objs=[];
  this.iStream=null;
  //check if a source stream is provided
  if(typeof this._options === 'undefined' || typeof this._options.stream.pipe !== 'function'){
    debug('Options: ',this._options);
    throw new Error('A source stream must be provided');
  }else{
    this.iStream = this._options.stream;
    return this.init();
  }
}
util.inherits(EventParser, EventEmitter);
EventParser.prototype.init = function () {
	console.log('initializing parser');
  var self = this;
  this.oStream = this.iStream.pipe(split()).pipe(th2({objectMode: true}, function (line, enc, callback) {
    self.onDataThrough(line,enc,callback,this);
  }) );

  this.oStream.on('data', function(obj){
     debug('Emmiting object', obj);
     if (typeof obj.header !== 'undefined')
       self.oStream.emit('parsedEvent',obj);
  });

  this.oStream.on('end',function(){
    debug('Lines: %d, Events: %d',self.lines, self.events);
    debug('Obj events: %d',self.objs.length);
  });
  return this.oStream;

}
EventParser.prototype.onDataThrough = function(line,enc,callback, stream){
  this.lines++;
  debug('line:',line);
  if(line.length===0){
    this.events++;
    if (this.header && typeof this.header['Body-Length'] !== 'undefined')
      this.bodyLength = parseInt(this.header['Body-Length']);
    //self.bodyLength = self.header ? self.header['Body-Length'] : 0;
    debug('Blank line, bodyLength: %d',this.bodyLength);
    if (this.pastBody.length === this.bodyLength - 4) {
      this.body = this.pastBody;
      this.bodyLength = 0;
    }



    if (this.bodyLength === 0) {
      debug('body length 0 and blank line, so pushing event');
      stream.push({header: this.header, body: this.body})
      this.header={};
      this.bodyLength=-1;
      this.pastBody='';
    }
  }else{
    debug('Not Blank line with length %d, bodyLength: %d', line.length, this.bodyLength);
    if(typeof this.bodyLength !== 'undefined' && this.bodyLength !== -1){
      if(typeof this.pastBody !== 'undefined' && this.pastBody.length !== 0){
        //concat past body with line
        line=this.pastBody+'\r\n'+line;
        debug('adding pastBody to line & resetting pastBody')
        this.pastBody='';
      }
      if(line.length >= this.bodyLength){
        debug('line length: %d, body length: %d',line.length,this.bodyLength);
        debug('line: %s',line);
        debug('this line contains all body: getting body from line', line, this.bodyLength)
        this.body=line.slice(0,this.bodyLength);
        stream.push({header: this.header, body: this.body})
        this.header={};
        debug('trimming bodyLength from line')
        line=line.slice(this.bodyLength);
        this.bodyLength=-1;
        if(line.length === 0){//after body possibly trimmed
          this.header={};
          this.body='';
          debug('line only contains 1 event after trimmed')
        }else{
          debug('processing to get header:\n ====== \n %s \n ======',line);
          var matches=line.split(/Event-Id/);
          debug('matches:', matches)
          if (this.lines === 1 && matches.length > 1){
            debug2('got line with garbage: ',line);
            line = line.match(/.*(Event-Id.*)/)[1];
            debug2('line cleaned: ',line);
          }
          var keyValue=line.split(': ');
          this.header[keyValue[0]]=keyValue[1];
        }
      }else{
        debug('line content is stored in pastBody because is shorter than bodyLength')
        this.pastBody=this.pastBody+line;
      }
    }else{
      debug('no bodyLength, so still processing headers')
        debug('processing to get header:\n ====== \n %s \n ======',line);
        var matches=line.split(/Event-Id/);
        debug2('matched in new event:', matches)
        if (this.lines === 1 && matches.length > 1){
          debug2('first match: ',matches[0]);
          debug2('got line with garbage: ##%s##',line);

          line = line.match(/.*(Event-Id.*)/)[1];
          debug2('line cleaned: ##%s##',line);
        }
        var kV=line.split(': ');
        if ( kV.length === 2 ) {
          if (typeof this.header === 'undefined')
            this.header = {};
          this.header[kV[0]]=kV[1];
        }
        if (this.header && this.header['Body-Length'])
          this.bodyLength = parseInt(this.header['Body-Length']);
    }
  }
  callback();

};
module.exports = EventParser;
