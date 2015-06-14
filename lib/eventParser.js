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
    log.error('Options: ',this._options);
    throw new Error('A source stream must be provided');
  }else{
    this.iStream = this._options.stream;
    /* this.oStream = this.iStream.pipe(split()).pipe(th2({objectMode: true},this.onDataThrough.bind(this)));
    var self = this;
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
    */
    return this.init();
  }
}
EventParser.prototype.init = function () {
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
    if (this.header && this.header['Body-Length'])
      this.bodyLength = parseInt(this.header['Body-Length']);
    //self.bodyLength = self.header ? self.header['Body-Length'] : 0;
    this.pastBody='';
    debug('Blank line, bodyLength: %d',this.bodyLength);
    if (this.bodyLength == 0) {
      debug('body length 0 and blank line, so pushing event');
      stream.push({header: this.header, body: this.body})
      this.header={};
      this.bodyLength=-1;
    }
  }else{
    debug('Not Blank line, bodyLength: %d',this.bodyLength);
    if(typeof this.bodyLength !== 'undefined' && this.bodyLength !== -1){
      if(typeof this.pastBody != 'undefined' && this.pastBody.length !== 0){
        //concat past body with line
        line=this.pastBody+'\r\n'+line;
        this.pastBody='';
      }
      if(line.length >= this.bodyLength){
        debug('line length: %d, body length: %d',line.length,this.bodyLength);
        debug('line: %s',line);
        this.body=line.slice(0,this.bodyLength);
        stream.push({header: this.header, body: this.body})
        this.header={};
        line=line.slice(this.bodyLength);
        this.bodyLength=-1;
        if(line.length === 0){//after body possibly trimmed
          this.header={};
          this.body='';
        }else{
          debug('processing to get header:\n ====== \n %s \n ======',line);
          var keyValue=line.split(': ');
          this.header[keyValue[0]]=keyValue[1];
        }
      }else{
        this.pastBody=this.pastBody+line;
      }
    }else{
        debug('processing to get header:\n ====== \n %s \n ======',line);
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
