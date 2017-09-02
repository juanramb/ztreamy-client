var fs = require('fs'),
    ZtreamyClient = require('./lib/ztreamyClient'),
    EventParser = require('./lib/eventParser');
function ztreamyClient(options){
  return new ZtreamyClient(options);
}
function eventParser(options){
  if (options && options.stream && typeof options.stream.pipe === 'function')
    return new EventParser(options);
  else{
    //stdin
		console.error('using stdin');
    return new EventParser({stream : fs.createReadStream('/dev/stdin')});
  }
}
module.exports.client = ztreamyClient;
module.exports.parser = eventParser;
