// Shared snarky loading messages used across the frontend.
(function () {
  var messages = [
    'Warming up the hamster wheel...',
    'Hold tight — stirring the servers...',
    'Summoning bytes from the void...',
    'Convincing the database to wake up...',
    'Polishing the pixels...',
    'Negotiating with the network gods...',
    'Retrieving answers from the mysterious backend...',
    'Nudging the database awake...',
    'Searching the couch cushions for data...',
    'Bribing the database with coffee...',
    'Asking nicely for the results...',
    'Hang tight, the bits are still loading...',
    'Loading... but not as slow as dial-up!',
    'Just a moment, the data is on its way...',
    'The server is thinking... or maybe just taking a coffee break.',
  ];

  function randIndex(len) {
    return Math.floor(Math.random() * len);
  }

  function getLoadingMessage() {
    try {
      return messages[randIndex(messages.length)];
    } catch (e) {
      return 'Loading...';
    }
  }

  // Expose a simple global helper for legacy frontend scripts
  if (typeof window !== 'undefined') {
    window.getLoadingMessage = getLoadingMessage;
    window.loadingMessages = { get: getLoadingMessage, all: messages.slice() };
  }
})();
