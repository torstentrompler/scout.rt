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
 * Keystroke to open the 'ViewMenuPopup' on 'F2'.
 */
scout.ViewMenuOpenKeyStroke = function(viewMenuTab) {
  scout.ViewMenuOpenKeyStroke.parent.call(this);
  this.field = viewMenuTab;

  this.which = [scout.keys.F2];
  this.stopPropagation = true;

  this.renderingHints.$drawingArea = function($drawingArea, event) {
    return this.field.$container;
  }.bind(this);
};
scout.inherits(scout.ViewMenuOpenKeyStroke, scout.KeyStroke);

/**
 * @override KeyStroke.js
 */
scout.ViewMenuOpenKeyStroke.prototype.handle = function(event) {
  this.field.togglePopup();
};

scout.ViewMenuOpenKeyStroke.prototype._postRenderKeyBox = function($drawingArea) {
  var width = $drawingArea.outerWidth();
  var wKeybox = $drawingArea.find('.key-box').outerWidth();
  var leftKeyBox = width / 2 - wKeybox / 2;
  $drawingArea.find('.key-box').cssLeft(leftKeyBox);
};
