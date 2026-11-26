/*
 * Hand-off from Epic's sign-in back to the Between app.
 *
 * Epic redirects to this https page with ?code=...&state=... . The app put its
 * own return address (an exp:// link in Expo Go, or between://auth/epic in an
 * installed build) hex-encoded at the end of `state`, after the last dot.
 * This script sends the browser on to that address with the same query.
 *
 * Only app addresses ending in auth/epic are allowed, so this page can't be
 * used to send people to arbitrary websites. The code alone is useless: the
 * app proves itself with a PKCE secret that never leaves the phone.
 */
(function (root) {
  'use strict';

  var ALLOWED = /^(exps?:\/\/[^\s?#/]+(\/[^\s?#]*)?\/--\/auth\/epic|between:\/\/auth\/epic)$/;
  var PASS_THROUGH = ['code', 'state', 'error', 'error_description'];

  function hexToAscii(hex) {
    if (!/^([0-9a-f]{2})+$/i.test(hex)) return null;
    var out = '';
    for (var i = 0; i < hex.length; i += 2) {
      var c = parseInt(hex.substr(i, 2), 16);
      if (c < 0x20 || c > 0x7e) return null;
      out += String.fromCharCode(c);
    }
    return out;
  }

  function returnUriFromState(state) {
    if (typeof state !== 'string') return null;
    var dot = state.lastIndexOf('.');
    if (dot < 1) return null;
    var uri = hexToAscii(state.slice(dot + 1));
    return uri && ALLOWED.test(uri) ? uri : null;
  }

  /** Where to send the browser for a given location.search, or null if it isn't a valid hand-off. */
  function handoffTarget(search) {
    var params = new URLSearchParams(search);
    var uri = returnUriFromState(params.get('state'));
    if (!uri) return null;
    var keep = new URLSearchParams();
    PASS_THROUGH.forEach(function (k) {
      if (params.has(k)) keep.set(k, params.get(k));
    });
    return uri + '?' + keep.toString();
  }

  var api = { handoffTarget: handoffTarget, returnUriFromState: returnUriFromState };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.BetweenHandoff = api;
})(typeof window !== 'undefined' ? window : this);
