var volcan = require("./index");
var Promise = require("es6-promise").Promise;
var Port = require("./port").Port;

var port = new Port(6000, "localhost");

var spawn = function(task) {
  return new Promise(function (resolve, reject) {
    try {
      var args = Array.prototype.slice.call(arguments,1);
      const routine = task(args);
      const raise = function(error) { routine.throw(error); };
      const step = function(data) {
        var res = routine.next(data),
            done = res.done, value = res.value;
        if (done) {
          resolve(value);
        } else {
          Promise.resolve(value).then(step, raise);
        }
      };
      step();
    } catch(error) {
      reject(error);
    }
  });
};

function waitForEvent(target, event, filter) {
  return new Promise(function (resolve, reject) {
    try {
      target.addEventListener(event, function(evt) {
        var found = false;
        if (typeof filter == "function") {
          try {
            found = filter(evt.data); 
          } catch(error) {
            reject(error); 
          }
        } else {
          found = true;
        }

        if (found) {
          resolve(evt.data);
        }
      });
    } catch(error) {
      reject(error);
    }
  });
}

spawn(function*() {
   var root = yield volcan.connect(port);
   var message = yield root.echo("hello");
   console.log("ECHO", message);

   var list = yield root.listTabs();
   console.log("You have " + list.tabs.length + " open tabs");
   var activeTab = list.tabs[list.selected];
   console.log("Your active tab url is: " + activeTab.url);

   console.log("PROTOCOL DESCRIPTION", yield root.protocolDescription());

   var waitTabAttached = waitForEvent(activeTab, "tabAttached");

   activeTab.attach();
   var tabAttached = yield waitTabAttached;

   console.log("TAB ATTACHED", tabAttached);
   
   yield activeTab.consoleActor.evaluateJS("alert('eval');");
   try {
     console.log("TAB ACTOR", Object.keys(Object.getPrototypeOf(activeTab)));
     console.log("STYLESHEET", Object.keys(Object.getPrototypeOf(activeTab.styleSheetsActor)));
   } catch(e) {
     console.error("ERROR!!!", e);
   }

   //var sheets = yield activeTab.styleSheetsActor.getStyleSheets();
   //console.log("SHEET", sheets.length);

   yield root.protocolDescription();

   yield {done: true};
 }).then(function () {
   console.log("EXIT SUCCESS", arguments);
   process.exit(0);
 }).catch(function () {
   console.log("EXIT ERROR", arguments);
   process.exit(1);
 });
