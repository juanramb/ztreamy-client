#!/usr/bin/env node
var log = require('winston')
var fs = require('fs')
var split = require('split2')
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

zc=ztreamy.client(options);

var events=headers=bodys = 0;
zc.onEvent(function(parsed){
  events++;
  if (events > 3)
    zc.emit('end');
  log.info('Evento parseado: ',inspect(parsed));

})
zc.on('end',function(){
  console.log('Obj events: %d',events);
  process.exit();
})

