var testing
  , path = require('path');

var started = false;

onmessage = function(message) {
  var details = message.data;

  // we have to load the testing module like this because web workers don't know
  // where they are so relative requires won't work.  We have our parent tell
  // us where we are
  if (!testing) {
    testing = require(path.join(details.dir, 'testing'));
  }

  var opts =
    { name: details.name
    , parallel: details.parallel
    , testName: details.testName
    , onSuiteStart: suiteStart
    , onSuiteDone: suiteDone
    , onPrematureExit: prematureExit
    , onTestStart: testStart
    , onTestDone: testDone
    };

  try {
    var s = require(details.suite);
  }
  catch(err) {
    postMessage({cmd: 'suiteError', message: err.message, stack: err.stack});
    return;
  }

  started = true;
  testing.runSuite(s, opts);
  started = false;
}

onclose = function() {
  closed = true;
}

var closed = false;
var stackReplaceRegExp = new RegExp(process.cwd(),'g');

function suiteStart() {
  if (closed) { return; }

  postMessage({cmd: 'suiteStart'});
}
function suiteDone(results) {
  if (closed) { return; }

  postMessage({cmd: 'suiteDone', results: results});
}
function testStart(name) {
  if (closed) { return; }

  postMessage({cmd: 'testStart', name: name});
}
function testDone(result) {
  if (closed) { return; }

  try {
    if (result.status == 'failure') {
      result.failure =
        { message: result.failure.message
        , stack: result.failure.stack.replace(stackReplaceRegExp, '.')
        };
    }
    else if (result.status == 'error') {
      result.error =
        { message: result.error.message
        , stack: result.error.stack.replace(stackReplaceRegExp, '.')
        };
    }
    //TODO multiErrors

    postMessage({cmd: 'testDone', result: result});
  }
  catch(err) {
    console.log(err.stack);
  }
}
function prematureExit(tests) {
  if (closed) { return; }

  postMessage({cmd: 'prematureExit', tests: tests});
}
