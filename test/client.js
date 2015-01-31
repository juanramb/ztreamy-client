#!/usr/bin/env node
var log = require('winston')
var fs = require('fs')
var split = require('split')
var th2 = require('through2');
var request = require('request');
var inspect = require('util').inspect
log.remove(log.transports.Console);
log.add(log.transports.Console,{colorize: true});
function mylog(myEvent){
  log.info(require('util').inspect(myEvent));
}
var ztreamy = require('../index.js');
var options = {url: 'http://localhost:9000/events/stream'};
//var ztreamyClient = ztreamy.client(options);
//ztreamyClient.onEvent(mylog);

//var zp = ztreamy.parser();
zc=ztreamy.client(options);
//zc.on('ztreamyEvent',mylog);
var events=headers=bodys = 0;
zc.on('ztreamyEvent',function(parsed){
  events++;
  if (events > 3)
    rs.emit('end');
  log.info('Evento parseado: ',inspect(parsed));

})
zc.on('end',function(){
  console.log('Lines: %d, Events: %d',lines, events);
  console.log('Obj events: %d',objs.length);
})

