var request    = require('request')
  ,split       = require('split2')
  ,th2         = require('through2')
  ,util        = require('util')
  ,fs          = require('fs')
  ,log         = require('winston')
  ,Q           = require('q')
  ,debug       = require('debug')('ztreamy')
  ,EventEmitter = require('events')
  ,EventParser = require(__dirname+'/eventParser')
  ,inspect     = util.inspect;


log.remove(log.transports.Console);
log.add(log.transports.Console,{colorize: true});
//function mylog(myEvent){
//  log.info(require('util').inspect(myEvent));
//}

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

    if (self._options && self._options.stream && typeof self._options.stream.pipe === 'function'){
      debug('stream passed for parser');
      self._stream = self._options.stream;
      self.createParser();
    }
    else{
      if ( !(self._options && self._options.url) ) {
        throw new Error("Must provide a url in options")
      }
      //connect to ztreamy server
      debug('connecting to ztreamy server before creating parser');
      self.connect(0,function(error,stream){
        if (stream === null)
          debug('Stream es null en el callback');
        self._stream=stream;
        self.createParser();
      });

    }



  } catch (error){
    //log.error('Error: ',error.stack);
    throw error;
  }

}
util.inherits(ZtreamyClient,EventEmitter);
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
  if ( self._parser )
    self._parser.on('ztreamyEvent',callback.bind(self));
}

ZtreamyClient.prototype.onClose = function onClose (reason) {
  var self = this;
  log.info('Connection to server closed ',self._stream);
  log.info('Reason: ',reason);
  log.info('reconnecting');
  self.connect(1000,function(error,stream){
    self._stream=stream;
    self.createParser();
  });
}
ZtreamyClient.prototype.onError = function onError (error) {
  var self = this;
  log.error('Request error:  ',error);
  //this._stream.end();
  log.info('Retrying');
  self.connect(1000,function(error,stream){
    self._stream=stream;
    self.createParser();
  });
}
ZtreamyClient.prototype.connect = function(delay,callback){
  var self = this;
  log.info('Url for ZtreamyClient connect: ',self._options.url);
  /*if (self._stream)
    delete self._stream;
    */
  setTimeout(function(){
    var stream = request.get(self._options.url);
    stream.on('close',function(reason){
      debug('Connect: on close');
      self.onClose(reason);
    });
    stream.on('error',function(error){
      debug('Connect: on error');
      self.onError(error);
    });
    stream.on('end',function(error){
      debug('Connect: on end');
      self.onError(error);
    });
    self._stream = stream;
    return callback(null, stream);
  },delay);

}
module.exports = ZtreamyClient;
