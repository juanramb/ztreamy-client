var assert = require('assert'),
    sinon  = require('sinon'),
    rewire = require('rewire'),
    events = require('events'),
    strmocks = require('./streamMocks.js'),
    ZtreamyClient = require('../lib/ztreamyClient');
describe('ZtreamyClient', function () {
  it('Should throw an error if not options', function (done) {
    try {
      var zc = new ZtreamyClient();
    }
    catch (error) {
      done();
    }
  });
  it('Should throw an error if no url in options', function (done) {
      try {
        var zc = new ZtreamyClient({});
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
      var ep = new ZtreamyClient({stream: strmocks.rstr});
      done();
    }
    catch (error) {
      console.error('Error creating eventParser: ',error);
      done(error);
    }
  });
});
