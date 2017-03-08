var assert = require('assert'),
    sinon  = require('sinon'),
    rewire = require('rewire'),
    events = require('events'),
    strmocks = require('./streamMocks'),
    zclient = require('../index'),
    EventParser = require('../lib/eventParser');

describe('EventParser', function () {
  it('Should throw an error if no stream in options', function (done) {
    try {
      var ep = new EventParser();
    }
    catch (error) {
      done();
    }
  });
  it('Should throw an error if the stream in options is not a stream', function (done) {
    try {
      var ep = new EventParser({stream: 'adfdf'});
    }
    catch (error) {
      done();
    }
  });
  it('Should accept a readable stream in options', function (done) {
    strmocks.prepareMocks();
    strmocks.rstr.push('adsfadsfasdf');
    strmocks.rstr.push(null);
    try {
      //var ep = new EventParser({stream: strmocks.rstr});
      var ep = new EventParser({stream: strmocks.rstr});
      done();
    }
    catch (error) {
      console.err('Error creating eventParser: ',error);
    }
  });
  it('Should decode a single event with empty body', function (done) {
    strmocks.prepareMocks();
    //wtf! strmocks.rstr.push('\r\n');
    strmocks.rstr.push('header1: header1content\r\n');
    strmocks.rstr.push('header2: header2content\r\n');
    strmocks.rstr.push('header3: header3content\r\n');
    strmocks.rstr.push('Body-Length: 0\r\n');
    strmocks.rstr.push('\r\n');
    strmocks.rstr.push('header11: header11content\r\n');
    strmocks.rstr.push(null);
    try {
      var numOfEvents = 0;
      var events = [];
      var ep = new EventParser({stream: strmocks.rstr});

      ep.on('parsedEvent', function (ze) {
        numOfEvents++;
        events.push(ze);
      });
      ep.on('end', function () {
        assert.equal(numOfEvents, 1);
        assert.equal(events.length,1);
        assert.equal(events[0].header.header1, 'header1content');
        assert.equal(events[0].header.header2, 'header2content');
        assert.equal(events[0].header.header3, 'header3content');
        assert.equal(events[0].header['Body-Length'], 0);
        done();
      });
    }
    catch (error) {
      console.log('Error creating eventParser: ',error);
    }
  });
  it('Should decode a single event with nonempty body', function (done) {
    strmocks.prepareMocks();
    //wtf! strmocks.rstr.push('\r\n');
    strmocks.rstr.push('header1: header1content\r\n');
    strmocks.rstr.push('header2: header2content\r\n');
    strmocks.rstr.push('header3: header3content\r\n');
    var body = '1asdfet34565464';
    strmocks.rstr.push('Body-Length: '+body.length+'\r\n');
    strmocks.rstr.push(body);
    strmocks.rstr.push('\r\n\r\n');
    strmocks.rstr.push('header11: header11content\r\n');
    strmocks.rstr.push(null);
    try {
      var numOfEvents = 0;
      var events = [];
      var ep = new EventParser({stream: strmocks.rstr});

      ep.on('parsedEvent', function (ze) {
        numOfEvents++;
        events.push(ze);
      });
      ep.on('end', function () {
        assert.equal(numOfEvents, 1);
        assert.equal(events.length,1);
        assert.equal(events[0].header.header1, 'header1content');
        assert.equal(events[0].header.header2, 'header2content');
        assert.equal(events[0].header.header3, 'header3content');
        assert.equal(events[0].header['Body-Length'], 15);
        assert.equal(events[0].body, body);
        done();
      });
    }
    catch (error) {
      console.log('Error creating eventParser: ',error);
    }
  });
  it('Should decode a two events with empty body', function (done) {
    strmocks.prepareMocks();
    //wtf! strmocks.rstr.push('\r\n');
    strmocks.rstr.push('header11: header11content\r\n');
    strmocks.rstr.push('header12: header12content\r\n');
    strmocks.rstr.push('header13: header13content\r\n');
    strmocks.rstr.push('Body-Length: 0\r\n');
    strmocks.rstr.push('\r\n');
    strmocks.rstr.push('header21: header21content\r\n');
    strmocks.rstr.push('header22: header22content\r\n');
    strmocks.rstr.push('header23: header23content\r\n');
    strmocks.rstr.push('header24: header24content\r\n');
    strmocks.rstr.push('Body-Length: 0\r\n');
    strmocks.rstr.push('\r\n');
    strmocks.rstr.push(null);
    try {
      var numOfEvents = 0;
      var events = [];
      var ep = new EventParser({stream: strmocks.rstr});

      ep.on('parsedEvent', function (ze) {
        numOfEvents++;
        events.push(ze);
      });
      ep.on('end', function () {
        assert.equal(numOfEvents, 2);
        assert.equal(events.length,2);
        assert.equal(events[0].header.header11, 'header11content');
        assert.equal(events[0].header.header12, 'header12content');
        assert.equal(events[0].header.header13, 'header13content');
        assert.equal(events[0].header['Body-Length'], 0);
        assert.equal(events[1].header.header21, 'header21content');
        assert.equal(events[1].header.header22, 'header22content');
        assert.equal(events[1].header.header23, 'header23content');
        assert.equal(events[1].header.header24, 'header24content');
        assert.equal(events[1].header['Body-Length'], 0);
        done();
      });
    }
    catch (error) {
      console.log('Error creating eventParser: ',error);
    }
  });
  it('Should clean initial header with garbled text before Event-Id', function (done) {
    strmocks.prepareMocks();
    //wtf! strmocks.rstr.push('\r\n');
    strmocks.rstr.push('fasdfasdf.c: 5 gcc asadfased Event-Id: MyEventId\r\n');
    strmocks.rstr.push('header2: header2content\r\n');
    strmocks.rstr.push('header3: header3content\r\n');
    var body = '1asdfet34565464';
    strmocks.rstr.push('Body-Length: '+body.length+'\r\n');
    strmocks.rstr.push(body);
    strmocks.rstr.push('\r\n\r\n');
    strmocks.rstr.push('header11: header11content\r\n');
    strmocks.rstr.push(null);
    try {
      var numOfEvents = 0;
      var events = [];
      var ep = new EventParser({stream: strmocks.rstr});

      ep.on('parsedEvent', function (ze) {
        numOfEvents++;
        events.push(ze);
      });
      ep.on('end', function () {
        assert.equal(numOfEvents, 1);
        assert.equal(events.length,1);
        assert.equal(events[0].header['Event-Id'], 'MyEventId');
        assert.equal(events[0].header.header2, 'header2content');
        assert.equal(events[0].header.header3, 'header3content');
        assert.equal(events[0].header['Body-Length'], 15);
        assert.equal(events[0].body, body);
        done();
      });
    }
    catch (error) {
      console.log('Error creating eventParser: ',error);
    }
  });

});


/*
describe('EJSON', function() {
  var DDPMessage = '{"msg":"added","collection":"posts","id":"2trpvcQ4pn32ZYXco","fields":{"date":{"$date":1371591394454},"bindata":{"$binary":"QUJDRA=="}}}';
  var EJSONObject = EJSON.parse(DDPMessage);

  it('should expose the EJSON object', function(done) {
    var ddpclient = new DDPClient();

    assert(ddpclient.EJSON);
    assert(ddpclient.EJSON.addType);

    done();
  });

  it('should decode binary and dates', function(done) {
    var ddpclient = new DDPClient({ use_ejson : true });

    ddpclient._message(DDPMessage);

    assert.deepEqual(ddpclient.collections.posts['2trpvcQ4pn32ZYXco'].date, new Date(1371591394454));

    assert.deepEqual(ddpclient.collections.posts['2trpvcQ4pn32ZYXco'].bindata, new Uint8Array([65, 66, 67, 68]));

    ddpclient.socket = {};
    ddpclient.socket.send = function (opts) {
      assert(opts.indexOf("date")          !== -1);
      assert(opts.indexOf("$date")         !== -1);
      assert(opts.indexOf("1371591394454") !== -1);

      assert(opts.indexOf("bindata")       !== -1);
      assert(opts.indexOf("$binary")       !== -1);
      assert(opts.indexOf("QUJDRA==")      !== -1);
    };

    ddpclient._send(EJSONObject.fields);

    done();
  });

});
*/
function WithRequestGet(getFn, fn) {
  var request = require("request");
  var originalGet = request.get;
  request.get = getFn;

  fn();

  request.get = originalGet;
}
