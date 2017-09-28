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
scout.TimePickerTouchPopupLayout = function(popup) {
  scout.TimePickerTouchPopupLayout.parent.call(this, popup);
};
scout.inherits(scout.TimePickerTouchPopupLayout, scout.TouchPopupLayout);

scout.TimePickerTouchPopupLayout.prototype.layout = function($container) {
  scout.TimePickerTouchPopupLayout.parent.prototype.layout.call(this, $container);
  var htmlPicker = this.popup.getTimePicker().htmlComp;
  htmlPicker.setSize(this.popup._widgetContainerHtmlComp.size());
};

/**
 * @override
 */
scout.TimePickerTouchPopupLayout.prototype.preferredLayoutSize = function($container, options) {
  var containerInsets = this.popup.htmlComp.insets(),
    fieldHtmlComp = this.popup._field.htmlComp,
    widgetContainerHtmlComp = this.popup._widgetContainerHtmlComp;

  var fieldPrefSize = fieldHtmlComp.prefSize(options)
    .add(fieldHtmlComp.margins());
  var widgetContainerPrefSize = widgetContainerHtmlComp.prefSize(options)
    .add(widgetContainerHtmlComp.margins());

  var headerHeight = scout.graphics.size(this.popup._$header, true).height;
  var popupHeight = headerHeight + fieldPrefSize.height + widgetContainerPrefSize.height + containerInsets.vertical();
  var popupWidth = Math.max(fieldPrefSize.width, widgetContainerPrefSize.width);

  return new scout.Dimension(popupWidth, popupHeight);
};
