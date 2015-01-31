var request    = require('request')
  ,split       = require('split')
  ,th2         = require('through2')
  ,util        = require('util')
  ,fs          = require('fs')
  ,log         = require('winston')
  ,Q           = require('q')
  ,debug       = require('debug')('ztreamy')
  ,events      = require('events')
  ,EventEmitter = events.EventEmitter
  ,inspect     = util.inspect;


log.remove(log.transports.Console);
log.add(log.transports.Console,{colorize: true});
//function mylog(myEvent){
//  log.info(require('util').inspect(myEvent));
//}
//options.stream: source stream
function EventParser(options) {
  util.inherits(this,events.EventEmitter);
  var self = this;
  self.debug=debug('ztreamy:EventParser');
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
  if(typeof self.options === 'undefined' || typeof self.options.stream.pipe !== 'function'){
    log.error('Options: ',options);
    throw new Error('A source stream must be provided');
  }else{
    self.iStream = options.stream;
    self.oStream = self.iStream.pipe(split()).pipe(th2({objectMode: true},self.onDataThrough));
    self.oStream.on('data', function(obj){
     self.oStream.emit('ztreamyEvent',obj);
    });
    self.oStream.on('end',function(){
      self.debug('Lines: %d, Events: %d',self.lines, self.events);
      self.debug('Obj events: %d',self.objs.length);
    });
    return self.oStream;
  }
}

EventParser.prototype.onDataThrough = function(line,enc,callback){
  var self=this;
  self.lines++;
  if(line.length===0){
    self.events++;
    self.bodyLength=self.header['Body-Length'];
    self.debug('Blank line, bodyLength: %d',self.bodyLength);
  }else{
    if(self.bodyLength !== -1){
      if(self.pastBody.length !== 0){
        //concat past body with line
        line=self.pastBody+'\r\n'+line;
        self.pastBody='';
      }
      if(line.length >= self.bodyLength){
        self.debug('line length: %d, body length: %d',line.length,self.bodyLength);
        self.body=line.slice(0,self.bodyLength);
        self.push({header: self.header, body: self.body})
        self.header={};
        line=line.slice(self.bodyLength);
        self.bodyLength=-1;
        if(line.length === 0){//after body possibly trimmed
          self.header={};
          self.body='';
        }else{
          self.debug('processing to get header:\n ====== \n %s \n ======',line);
          var keyValue=line.split(': ');
          self.header[keyValue[0]]=keyValue[1];
        }
      }else{
        self.pastBody=self.pastBody+line;
      }
    }else{
      if(line.length === 0){//after body possibly trimmed
        self.header={};
      }else{
        self.debug('processing to get header:\n ====== \n %s \n ======',line);
        var kV=line.split(': ');
        self.header[kV[0]]=kV[1];
      }
    }
  }
  callback();

};
//options.stream in stream (optional, stdin if null)
//options.parser (optional, default parser if null)
function ZtreamyClient(options) {
  EventEmitter.call(this);
  var self = this;
  self._options=options;
  self._request=request;
  self._stream=null;
  self._onEventCallbacks=[];
  try{
    if(self._options.stream && typeof self._options.stream.pipe === 'function'){
      self._stream = self._options.stream;
      self.createParser();
    }
    else{
      //connect to ztreamy server
      self.connect(0,function(stream){
        self._stream=stream;
        self.createParser();
      });

    }
   

    
  } catch (error){
    log.error('Error: ',error.stack);
  }

}
util.inherits(ZtreamyClient,events.EventEmitter);
ZtreamyClient.prototype.createParser = function(parser){
  var self = this;
  //self._parser must be a stream
  if (parser && typeof parser.pipe === 'function')
    self._parser = parser;
  else
    self._parser = new EventParser({stream: self._stream});
  self._parser.on('error',function(error){
      self.onError(error);
  });
  if (self._onEventCallbacks)
    self._onEventCallbacks.forEach(function(callback){
      self._parser.addListener('parsedEvent',callback);
    })
}
ZtreamyClient.prototype.onEvent = function(callback) {
  var self = this;
  self._onEventCallbacks.push(callback);
  self._parser.on('ztreamyEvent',callback.bind(self));
}

ZtreamyClient.prototype.onClose = function onClose (reason) {
  var self = this;
  log.info('Connection to server closed ',self._stream);
  log.info('Reason: ',reason);
  log.info('reconnecting');
  self.connect(1000,function(stream){
    self._stream=stream;
    self.createParser();
  });
}
ZtreamyClient.prototype.onError = function onError (error) {
  var self = this;
  log.error('Request error:  ',error);
  //this._stream.end();
  log.info('Retrying');
  self.connect(1000,function(stream){
    self._stream=stream;
    self.createParser();
  });
}
ZtreamyClient.prototype.connect = function(delay,callback){
  var self = this;
  log.info(self._options);
  /*if (self._stream)
    delete self._stream;
    */
  setTimeout(function(){
    self._stream = request.get(self._options.url);

    self._stream.on('close',function(reason){
      self.onClose(reason);
    });
    self._stream.on('error',function(error){
      self.onError(error);
    });
    self._stream.on('end',function(error){
      self.onError(error);
    });

  },delay);
  return callback(null,self._stream);
}

function ztreamyClient(options){
  if (options && options.url)
    return new ZtreamyClient(options);
  else{
    throw new Error('Options error, you must provide an url to connect');
  }
}
function eventParser(options){
  if (options && options.stream && typeof options.stream.pipe === 'function')
    return new EventParser(options);
  else{
    //stdin
    return new EventParser({stream : fs.createReadStream('/dev/stdin')});
  }
}
module.exports.client = ztreamyClient;
module.exports.parser = eventParser;
