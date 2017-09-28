/*******************************************************************************
 * Copyright (c) 2014-2017 BSI Business Systems Integration AG.
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v1.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v10.html
 *
 * Contributors:
 *     BSI Business Systems Integration AG - initial API and implementation
 ******************************************************************************/
/**
 * Polyfill for IE9 providing a simple implementation of FormData (as used by FileChooser.js)
 *
 * Only supports the append() and the toString() method. Does not work in modern browsers, because
 * it uses obsolete File.getAsBinary (https://developer.mozilla.org/de/docs/Web/API/File/getAsBinary).
 *
 * Rules for generating the boundary:
 * http://stackoverflow.com/a/4656646
 *
 * How to use this polyfill with jQuery:
 * http://stackoverflow.com/a/5976031
 */
scout.polyfills = {

  install: function(window) {
    this._installPolyfillFormData(window);
    this._installPolyfillMath(window);
  },

  /**
   * Polyfills for "Math"
   */
  _installPolyfillMath: function(window) {
    if (Math.sign) {
      return; // Nothing to do
    }

    Math.sign = function(x) {
      x = +x; // convert to a number
      if (x === 0 || isNaN(x)) {
        return x;
      }
      return x > 0 ? 1 : -1;
    };
  },

  /**
   * Polyfills for "FormData"
   */
  _installPolyfillFormData: function(window) {
    if (window.FormData) {
      return; // Nothing to do
    }

    window.FormData = function() {
      this.polyfill = true; // Marker
      this._boundary = 'ScoutFormData-' + scout.numbers.randomId(50);
      this._data = [];
      this._crlf = '\r\n';
    };

    window.FormData.prototype.append = function(key, value, filename) {
      var element = [key, value, filename];
      this._data.push(element);
    };

    window.FormData.prototype.getContent = function() {
      var result = '';
      this._data.forEach(function(element) {
        var key = element[0];
        var value = element[1];
        var filename = element[2];

        result += '--' + this._boundary + this._crlf;
        if (scout.device.supportsFile() && value instanceof window.File) {
          // File
          var file = value;
          filename = filename || file.name || key;
          result += 'Content-Disposition: form-data; name="' + key + '"; filename="' + filename + '"' + this._crlf;
          result += 'Content-Type: ' + file.type + this._crlf;
          result += this._crlf;
          result += (file.getAsBinary ? file.getAsBinary() : 'UNKNOWN CONTENT') + this._crlf;
        } else {
          // Everything else
          result += 'Content-Disposition: form-data; name="' + key + '";' + this._crlf;
          result += this._crlf;
          result += value + this._crlf;
        }
      }.bind(this));
      result += '--' + this._boundary + '--';
      return result;
    };

    window.FormData.prototype.applyToAjaxOptions = function(ajaxOpts) {
      if (!ajaxOpts) {
        return;
      }
      // Make sure no text encoding stuff is done by xhr
      ajaxOpts.xhr = function() {
        var xhr = $.ajaxSettings.xhr();
        xhr.send = xhr.sendAsBinary || xhr.send; // sendAsBinary only exists in older browsers
        return xhr;
      };
      // Manually set content type (with boundary)
      ajaxOpts.contentType = 'multipart/form-data; boundary=' + this._boundary;
      // Generate content
      ajaxOpts.data = this.getContent();
    };
  }
};
