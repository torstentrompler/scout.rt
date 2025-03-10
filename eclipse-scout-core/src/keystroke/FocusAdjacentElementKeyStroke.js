/*
 * Copyright (c) 2014-2017 BSI Business Systems Integration AG.
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v1.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v10.html
 *
 * Contributors:
 *     BSI Business Systems Integration AG - initial API and implementation
 */
import {keys, KeyStroke} from '../index';

export default class FocusAdjacentElementKeyStroke extends KeyStroke {

  constructor(session, field) {
    super();
    this.session = session;
    this.field = field;
    this.which = [keys.LEFT, keys.RIGHT];
    this.renderingHints.render = false;
    this.stopPropagation = true;
    this.keyStrokeMode = KeyStroke.Mode.DOWN;
  }

  handle(event) {
    let activeElement = this.field.$container.activeElement(true),
      $focusableElements = this.field.$container.find(':focusable');

    switch (event.which) { // NOSONAR
      case keys.RIGHT:
        if (activeElement === $focusableElements.last()[0]) {
          this.session.focusManager.requestFocus($focusableElements.first());
        } else {
          this.session.focusManager.requestFocus($focusableElements[$focusableElements.index(activeElement) + 1]);
        }

        break;
      case keys.LEFT:
        if (activeElement === $focusableElements.first()[0]) {
          this.session.focusManager.requestFocus($focusableElements.last());
        } else {
          this.session.focusManager.requestFocus($focusableElements[$focusableElements.index(activeElement) - 1]);
        }
        break;
    }
  }
}
