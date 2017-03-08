var stream = require('stream');
function StreamMocks() {
  this.wstr = null;
  this.rstr = null;

};
StreamMocks.prototype.prepareMocks = function () {
  this.wstr = new stream.Writable();
  this.rstr = new stream.Readable();
}

var streammocks = new StreamMocks();
module.exports = streammocks;
