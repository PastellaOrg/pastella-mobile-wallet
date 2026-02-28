// Polyfill for Web Crypto API getRandomValues
import 'react-native-get-random-values';

// Polyfill for toReversed to support older Node versions
if (!Array.prototype.toReversed) {
  Array.prototype.toReversed = function() {
    return this.slice().reverse();
  };
}
