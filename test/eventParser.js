var assert = require('assert'),
    sinon  = require('sinon'),
    rewire = require('rewire'),
    events = require('events'),
    stream = require('stream'),
    zclient = require('../index'),
    EventParser = require('../lib/eventParser');

var wstrMock;
var rstrMock;
function prepareMocks() {
  wstrMock = new stream.Writable;
  rstrMock = new stream.Readable;

  //eventParser = new EventParser({stream: wstrMock});
}

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
    prepareMocks();
    rstrMock.push('adsfadsfasdf');
    rstrMock.push(null);
    try {
      //var ep = new EventParser({stream: rstrMock});
      var ep = new EventParser({stream: rstrMock});
      done();
    }
    catch (error) {
      console.err('Error creating eventParser: ',error);
    }
  });
  it('Should decode a single event with empty body', function (done) {
    prepareMocks();
    //wtf! rstrMock.push('\r\n');
    rstrMock.push('header1: header1content\r\n');
    rstrMock.push('header2: header2content\r\n');
    rstrMock.push('header3: header3content\r\n');
    rstrMock.push('Body-Length: 0\r\n');
    rstrMock.push('\r\n');
    rstrMock.push('header11: header11content\r\n');
    rstrMock.push(null);
    try {
      var numOfEvents = 0;
      var events = [];
      var ep = new EventParser({stream: rstrMock});
      
      ep.on('parsedEvent', function (ze) {
        numOfEvents++;
        events.push(ze);
      });
      ep.on('end', function () {
        assert.equal(numOfEvents, 1);
        assert.equal(events[0].header.header1, 'header1content');
        
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
