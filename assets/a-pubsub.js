(function() {
  // If host theme already provides subscribe/publish (Dawn, Refresh, etc.), use theirs
  if (typeof subscribe !== 'undefined' && typeof publish !== 'undefined') return;

  var subscribers = {};

  window.subscribe = function(eventName, callback) {
    if (subscribers[eventName] === undefined) {
      subscribers[eventName] = [];
    }

    subscribers[eventName] = [].concat(subscribers[eventName], [callback]);

    return function unsubscribe() {
      subscribers[eventName] = subscribers[eventName].filter(function(cb) {
        return cb !== callback;
      });
    };
  };

  window.publish = function(eventName, data) {
    if (subscribers[eventName]) {
      subscribers[eventName].forEach(function(callback) {
        callback(data);
      });
    }
  };
})();
