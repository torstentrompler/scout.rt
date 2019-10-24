/*
 * Copyright (c) 2014-2018 BSI Business Systems Integration AG.
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v1.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v10.html
 *
 * Contributors:
 *     BSI Business Systems Integration AG - initial API and implementation
 */
import {DialogLayout} from '../index';
import {Event} from '../index';
import {HtmlComponent} from '../index';
import {Point} from '../index';
import {Insets} from '../index';
import {KeyStrokeContext} from '../index';
import * as $ from 'jquery';
import {scout} from '../index';
import {CloseKeyStroke} from '../index';
import {graphics} from '../index';
import {scrollbars} from '../index';
import {Rectangle} from '../index';
import {strings} from '../index';
import {GlassPaneRenderer} from '../index';
import {PopupLayout} from '../index';
import {Widget} from '../index';
import {FocusRule} from '../index';
import {Dimension} from '../index';

export default class Popup extends Widget {

constructor() {
  super();

  this._documentMouseDownHandler = null;
  this._anchorScrollHandler = null;
  this._anchorLocationChangeHandler = null;
  this._popupOpenHandler = null;
  this._glassPaneRenderer = null;
  this.anchorBounds = null;
  this.animateOpening = false;
  this.animateResize = false;
  this.anchor = null;
  this.$anchor = null;
  this.windowPaddingX = 10;
  this.windowPaddingY = 5;
  this.withGlassPane = false;
  this.withFocusContext = true;
  this.initialFocus = function() {
    return FocusRule.AUTO;
  };
  this.focusableContainer = false;

  // The alignment defines how the popup is positioned around the anchor.
  // If there is no anchor or anchor bounds the alignment has no effect.
  this.horizontalAlignment = Popup.Alignment.LEFTEDGE;
  this.verticalAlignment = Popup.Alignment.BOTTOM;

  // If switch is enabled, the alignment will be changed if the popup overlaps a window border.
  this.horizontalSwitch = false;
  this.verticalSwitch = true;

  // Hints for the layout to control whether the size should be adjusted if the popup does not fit into the window.
  // Before trimming is applied the popup will be switched, if the switch option is enabled.
  // If neither switch nor trim is enabled, the popup will be moved until its right border is visible.
  this.trimWidth = false;
  this.trimHeight = true;

  // Defines what should happen when the scroll parent is scrolled. It is also used if the anchor changes its location (needs to support the locationChange event)
  this.scrollType = 'remove';
  this.windowResizeType = null;

  // If true, the anchor is considered when computing the position and size of the popup
  this.boundToAnchor = true;

  // If true, an arrow is shown pointing to the anchor. If there is no anchor, no arrow will be visible.
  // Please note: some alignment combinations are not supported, which are: LEFT or RIGHT + BOTTOM or TOP
  this.withArrow = false;

  // If false, the attached mouse down handler will NOT close the popup if the anchor was clicked, the anchor is responsible to close it.
  // This is necessary because the mousedown listener is attached to the capture phase and therefore executed before any other.
  // If anchor was clicked, popup would already be closed and then opened again -> popup could never be closed by clicking the anchor
  this.closeOnAnchorMouseDown = true;

  // Defines whether the popup should be closed on a mouse click outside of the popup
  this.closeOnMouseDownOutside = true;

  // Defines whether the popup should be closed whenever another popup opens.
  this.closeOnOtherPopupOpen = true;

  this._openLater = false;

  this.$arrow = null;
  this._windowResizeHandler = this._onWindowResize.bind(this);
  this._anchorRenderHandler = this._onAnchorRender.bind(this);
  this._addWidgetProperties(['anchor']);
  this._addPreserveOnPropertyChangeProperties(['anchor']);
}


// Note that these strings are also used as CSS classes
static Alignment = {
  LEFT: 'left',
  LEFTEDGE: 'leftedge',
  TOP: 'top',
  TOPEDGE: 'topedge',
  CENTER: 'center',
  RIGHT: 'right',
  RIGHTEDGE: 'rightedge',
  BOTTOM: 'bottom',
  BOTTOMEDGE: 'bottomedge'
};

static SwitchRule = {};

/**
 * @param options:
 *          initialFocus: a function that returns the element to be focused or a <code>FocusRule</code>. Default returns <code>FocusRule.AUTO</code>
 *          focusableContainer: a boolean whether or not the container of the Popup is focusable
 */
_init(options) {
  super._init( options);

  if (options.location) {
    this.anchorBounds = new Rectangle(options.location.x, options.location.y, 0, 0);
  }
  if (this.withGlassPane) {
    this._glassPaneRenderer = new GlassPaneRenderer(this);
  }
  this._setAnchor(this.anchor);
}

/**
 * @override
 */
_createKeyStrokeContext() {
  return new KeyStrokeContext();
}

/**
 * @override
 */
_initKeyStrokeContext() {
  super._initKeyStrokeContext();

  this.keyStrokeContext.registerKeyStroke(this._createCloseKeyStroke());
}

/**
 * Override this method to provide a key stroke which closes the popup.
 * The default impl. returns a CloseKeyStroke which handles the ESC key.
 */
_createCloseKeyStroke() {
  return new CloseKeyStroke(this);
}

_createLayout() {
  return new PopupLayout(this);
}

open($parent) {
  this._triggerPopupOpenEvent();

  this._open($parent);
  if (this._openLater) {
    return;
  }

  // Focus the popup
  // It is important that this happens after layouting and positioning, otherwise we'd focus an element
  // that is currently not on the screen. Which would cause the whole desktop to
  // be shifted for a few pixels.
  this.validateFocus();
  if (this.animateOpening) {
    this.$container.addClassForAnimation('animate-open');
  }
}

validateFocus() {
  if (!this.withFocusContext) {
    return;
  }
  var context = this.session.focusManager.getFocusContext(this.$container);
  context.ready();
  if (!context.lastValidFocusedElement) {
    // No widget requested focus -> try to determine the initial focus
    this._requestInitialFocus();
  }
}

_requestInitialFocus() {
  var initialFocusElement = this.session.focusManager.evaluateFocusRule(this.$container, this.initialFocus());
  if (!initialFocusElement) {
    return;
  }
  this.session.focusManager.requestFocus(initialFocusElement);
}

_open($parent) {
  this.render($parent);
  if (this._openLater) {
    return;
  }
  this.revalidateLayout();
  this.position();
}

render($parent) {
  var $popupParent = $parent || this.entryPoint();
  // when the parent is detached it is not possible to render the popup -> do it later
  if (!$popupParent || !$popupParent.length || !$popupParent.isAttached()) {
    this._openLater = true;
    return;
  }
  super.render( $popupParent);
}

_render() {
  this.$container = this.$parent.appendDiv('popup');
  this.htmlComp = HtmlComponent.install(this.$container, this.session);
  this.htmlComp.validateRoot = true;
  this.htmlComp.setLayout(this._createLayout());
  this.$container.window().on('resize', this._windowResizeHandler);
}

_renderProperties() {
  super._renderProperties();
  this._renderAnchor();
  this._renderWithArrow();
  this._renderWithFocusContext();
  this._renderWithGlassPane();
}

_postRender() {
  super._postRender();

  this.size();
  this._attachCloseHandlers();
  this._attachAnchorHandlers();
}

_onAttach() {
  super._onAttach();
  if (this._openLater && !this.rendered) {
    this._openLater = false;
    this.open();
  }
}

_renderOnDetach() {
  this._openLater = true;
  this.remove();
  super._renderOnDetach();
}

remove() {
  var currentAnimateRemoval = this.animateRemoval;
  if (!this._isInView()) {
    this.animateRemoval = false;
  }
  super.remove();
  this.animateRemoval = currentAnimateRemoval;
}

_remove() {
  this.$container.window().off('resize', this._windowResizeHandler);
  if (this._glassPaneRenderer) {
    this._glassPaneRenderer.removeGlassPanes();
  }
  if (this.withFocusContext) {
    this.session.focusManager.uninstallFocusContext(this.$container);
  }
  if (this.$arrow) {
    this.$arrow.remove();
    this.$arrow = null;
  }

  if (this.anchor) {
    // reopen when the anchor gets rendered again
    this.anchor.one('render', this._anchorRenderHandler);
  }

  // remove all clean-up handlers
  this._detachAnchorHandlers();
  this._detachCloseHandlers();
  super._remove();
}

_destroy() {
  if (this.anchor) {
    this.anchor.off('render', this._anchorRenderHandler);
  }
  super._destroy();
}

_renderWithFocusContext() {
  if (this.withFocusContext) {
    // Don't allow an element to be focused while the popup is opened.
    // The popup will focus the element as soon as the opening is finished (see open());
    // The context needs to be already installed so that child elements don't try to focus an element outside of this context
    this.session.focusManager.installFocusContext(this.$container, FocusRule.PREPARE);
  }
  // Add programmatic 'tabindex' if the $container itself should be focusable (used by context menu popups with no focusable elements)
  if (this.withFocusContext && this.focusableContainer) {
    this.$container.attr('tabindex', -1);
  }
}

_renderWithGlassPane() {
  if (this._glassPaneRenderer) {
    this._glassPaneRenderer.renderGlassPanes();
  }
}

setWithArrow(withArrow) {
  this.setProperty('withArrow', withArrow);
}

_renderWithArrow() {
  if (this.$arrow) {
    this.$arrow.remove();
    this.$arrow = null;
  }
  if (this.withArrow) {
    this.$arrow = this.$container.prependDiv('popup-arrow');
    this._updateArrowClass();
  }
  this.invalidateLayoutTree();
}

_updateArrowClass(verticalAlignment, horizontalAlignment) {
  if (this.$arrow) {
    this.$arrow.removeClass(this._alignClasses());
    this.$arrow.addClass(this._computeArrowPositionClass(verticalAlignment, horizontalAlignment));
  }
}

_computeArrowPositionClass(verticalAlignment, horizontalAlignment) {
  var Alignment = Popup.Alignment;
  var cssClass = '';
  horizontalAlignment = horizontalAlignment || this.horizontalAlignment;
  verticalAlignment = verticalAlignment || this.verticalAlignment;
  switch (horizontalAlignment) {
    case Alignment.LEFT:
      cssClass = Alignment.RIGHT;
      break;
    case Alignment.RIGHT:
      cssClass = Alignment.LEFT;
      break;
    default:
      cssClass = horizontalAlignment;
      break;
  }

  switch (verticalAlignment) {
    case Alignment.BOTTOM:
      cssClass += ' ' + Alignment.TOP;
      break;
    case Alignment.TOP:
      cssClass += ' ' + Alignment.BOTTOM;
      break;
    default:
      cssClass += ' ' + verticalAlignment;
      break;
  }
  return cssClass;
}

_isRemovalPrevented() {
  // Never prevent. Default returns true if removal is pending by an animation, but popups should be closed before the animation starts
  return false;
}

close() {
  var event = new Event();
  this.trigger('close', event);
  if (!event.defaultPrevented) {
    this.destroy();
  }
}

/**
 * Install listeners to close the popup once clicking outside the popup,
 * or changing the anchor's scroll position, or another popup is opened.
 */
_attachCloseHandlers() {
  // Install mouse close handler
  // The listener needs to be executed in the capturing phase -> prevents that _onDocumentMouseDown will be executed right after the popup gets opened using mouse down, otherwise the popup would be closed immediately
  if (this.closeOnMouseDownOutside) {
    this._documentMouseDownHandler = this._onDocumentMouseDown.bind(this);
    this.$container.document(true).addEventListener('mousedown', this._documentMouseDownHandler, true); // true=the event handler is executed in the capturing phase
  }

  // Install popup open close handler
  if (this.closeOnOtherPopupOpen) {
    this._popupOpenHandler = this._onPopupOpen.bind(this);
    this.session.desktop.on('popupOpen', this._popupOpenHandler);
  }
}

_attachAnchorHandlers() {
  if (!this.$anchor || !this.boundToAnchor || !this.scrollType) {
    return;
  }
  // Attach a scroll handler to each scrollable parent of the anchor
  this._anchorScrollHandler = this._onAnchorScroll.bind(this);
  scrollbars.onScroll(this.$anchor, this._anchorScrollHandler);

  // Attach a location change handler as well (will only work if the anchor is a widget which triggers a locationChange event, e.g. another Popup)
  var anchor = scout.widget(this.$anchor);
  if (anchor) {
    this._anchorLocationChangeHandler = this._onAnchorLocationChange.bind(this);
    anchor.on('locationChange', this._anchorLocationChangeHandler);
  }
}

_detachAnchorHandlers() {
  if (this._anchorScrollHandler) {
    scrollbars.offScroll(this._anchorScrollHandler);
    this._anchorScrollHandler = null;
  }
  if (this._anchorLocationChangeHandler) {
    var anchor = scout.widget(this.$anchor);
    if (anchor) {
      anchor.off('locationChange', this._anchorLocationChangeHandler);
      this._anchorLocationChangeHandler = null;
    }
  }
}

_detachCloseHandlers() {
  // Uninstall popup open close handler
  if (this._popupOpenHandler) {
    this.session.desktop.off('popupOpen', this._popupOpenHandler);
    this._popupOpenHandler = null;
  }

  // Uninstall mouse close handler
  if (this._documentMouseDownHandler) {
    this.$container.document(true).removeEventListener('mousedown', this._documentMouseDownHandler, true);
    this._documentMouseDownHandler = null;
  }
}

_onDocumentMouseDown(event) {
  // in some cases the mousedown handler is executed although it has been already
  // detached on the _remove() method. However, since we're in the middle of
  // processing the mousedown event, it's too late to detach the event and we must
  // deal with that situation by checking the rendered flag. Otherwise we would
  // run into an error later, since the $container is not available anymore.
  if (!this.rendered) {
    return;
  }
  if (this._isMouseDownOutside(event)) {
    this._onMouseDownOutside(event);
  }
}

_isMouseDownOutside(event) {
  var $target = $(event.target),
    targetWidget;

  if (!this.closeOnAnchorMouseDown && this._isMouseDownOnAnchor(event)) {
    // 1. Often times, click on the anchor opens and 2. click closes the popup
    // If we were closing the popup here, it would not be possible to achieve the described behavior anymore -> let anchor handle open and close.
    return false;
  }

  targetWidget = scout.widget($target);

  // close the popup only if the click happened outside of the popup and its children
  // It is not sufficient to check the dom hierarchy using $container.has($target)
  // because the popup may open other popups which probably is not a dom child but a sibling
  // Also ignore clicks if the popup is covert by a glasspane
  return !this.isOrHas(targetWidget) && !this.session.focusManager.isElementCovertByGlassPane(this.$container[0]);
}

_isMouseDownOnAnchor(event) {
  return !!this.$anchor && this.$anchor.isOrHas(event.target);
}

/**
 * Method invoked once a mouse down event occurs outside the popup.
 */
_onMouseDownOutside(event) {
  this.close();
}

/**
 * Method invoked once the 'options.$anchor' is scrolled.
 */
_onAnchorScroll(event) {
  if (!this.rendered) {
    // Scroll events may be fired delayed, even if scroll listeners are already removed.
    return;
  }
  this._handleAnchorPositionChange();
}

_handleAnchorPositionChange(event) {
  if (scout.isOneOf(this.scrollType, 'position', 'layoutAndPosition') && this.isOpeningAnimationRunning()) {
    // If the popup is opened with an animation which transforms the popup the sizes used by prefSize and position will likely be wrong.
    // In that case it is not possible to layout and position it correctly -> do nothing.
    return;
  }

  if (this.scrollType === 'position') {
    this.position();
  } else if (this.scrollType === 'layoutAndPosition') {
    this.revalidateLayout();
    this.position();
  } else if (this.scrollType === 'remove') {
    this.close();
  }
}

isOpeningAnimationRunning() {
  return this.rendered && this.animateOpening && this.$container.hasClass('animate-open');
}

_onAnchorLocationChange(event) {
  this._handleAnchorPositionChange();
}

/**
 * Method invoked once a popup is opened.
 */
_onPopupOpen(event) {
  // Make sure child popups don't close the parent popup, we must check parent hierarchy in both directions
  // Use case: Opening of a context menu or cell editor in a form popup
  // Also, popups covered by a glass pane (a modal dialog is open) must never be closed
  // Use case: popup opens a modal dialog. User clicks on a smartfield on this dialog -> underlying popup must not get closed
  var closable = !this.isOrHas(event.popup) &&
    !event.popup.isOrHas(this);
  if (this.rendered) {
    closable = closable && !this.session.focusManager.isElementCovertByGlassPane(this.$container[0]);
  }
  if (closable) {
    this.close();
  }
}

setHorizontalAlignment(horizontalAlignment) {
  this.setProperty('horizontalAlignment', horizontalAlignment);
}

_renderHorizontalAlignment() {
  this._updateArrowClass();
  this.invalidateLayoutTree();
}

setVerticalAlignment(verticalAlignment) {
  this.setProperty('verticalAlignment', verticalAlignment);
}

_renderVerticalAlignment() {
  this._updateArrowClass();
  this.invalidateLayoutTree();
}

setHorizontalSwitch(horizontalSwitch) {
  this.setProperty('horizontalSwitch', horizontalSwitch);
}

_renderHorizontalSwitch() {
  this.invalidateLayoutTree();
}

setVerticalSwitch(verticalSwitch) {
  this.setProperty('verticalSwitch', verticalSwitch);
}

_renderVerticalSwitch() {
  this.invalidateLayoutTree();
}

setTrimWidth(trimWidth) {
  this.setProperty('trimWidth', trimWidth);
}

_renderTrimWidth() {
  this.invalidateLayoutTree();
}

setTrimHeight(trimHeight) {
  this.setProperty('trimHeight', trimHeight);
}

_renderTrimHeight() {
  this.invalidateLayoutTree();
}

prefLocation(verticalAlignment, horizontalAlignment) {
  if (!this.boundToAnchor || (!this.anchorBounds && !this.$anchor)) {
    return this._prefLocationWithoutAnchor();
  }
  return this._prefLocationWithAnchor(verticalAlignment, horizontalAlignment);
}

_prefLocationWithoutAnchor() {
  return DialogLayout.positionContainerInWindow(this.$container);
}

_prefLocationWithAnchor(verticalAlignment, horizontalAlignment) {
  var $container = this.$container;
  horizontalAlignment = horizontalAlignment || this.horizontalAlignment;
  verticalAlignment = verticalAlignment || this.verticalAlignment;
  var anchorBounds = this.getAnchorBounds();
  var size = graphics.size($container);
  var margins = graphics.margins($container);
  var Alignment = Popup.Alignment;

  var arrowBounds = null;
  if (this.$arrow) {
    // Ensure the arrow has the correct class
    this._updateArrowClass(verticalAlignment, horizontalAlignment);
    // Remove margin added by moving logic, otherwise the bounds would not be correct
    graphics.setMargins(this.$arrow, new Insets());
    arrowBounds = graphics.bounds(this.$arrow);
  }

  $container.removeClass(this._alignClasses());
  $container.addClass(verticalAlignment + ' ' + horizontalAlignment);

  var widthWithMargin = size.width + margins.horizontal();
  var width = size.width;
  var x = anchorBounds.x;
  if (horizontalAlignment === Alignment.LEFT) {
    x -= widthWithMargin;
  } else if (horizontalAlignment === Alignment.LEFTEDGE) {
    if (this.withArrow) {
      x += anchorBounds.width / 2 - arrowBounds.center().x - margins.left;
    } else {
      x = anchorBounds.x - margins.left;
    }
  } else if (horizontalAlignment === Alignment.CENTER) {
    x += anchorBounds.width / 2 - width / 2 - margins.left;
  } else if (horizontalAlignment === Alignment.RIGHT) {
    x += anchorBounds.width;
  } else if (horizontalAlignment === Alignment.RIGHTEDGE) {
    if (this.withArrow) {
      x += anchorBounds.width / 2 - arrowBounds.center().x - margins.right;
    } else {
      x = anchorBounds.x + anchorBounds.width - width - margins.right;
    }
  }

  var heightWithMargin = size.height + margins.vertical();
  var height = size.height;
  var y = anchorBounds.y;
  if (verticalAlignment === Alignment.TOP) {
    y -= heightWithMargin;
  } else if (verticalAlignment === Alignment.TOPEDGE) {
    if (this.withArrow) {
      y += anchorBounds.height / 2 - arrowBounds.center().y - margins.top;
    } else {
      y = anchorBounds.y - margins.top;
    }
  } else if (verticalAlignment === Alignment.CENTER) {
    y += anchorBounds.height / 2 - height / 2 - margins.top;
  } else if (verticalAlignment === Alignment.BOTTOM) {
    y += anchorBounds.height;
  } else if (verticalAlignment === Alignment.BOTTOMEDGE) {
    if (this.withArrow) {
      y += anchorBounds.height / 2 - arrowBounds.center().y - margins.bottom;
    } else {
      y = anchorBounds.y + anchorBounds.height - height - margins.bottom;
    }
  }

  // this.$parent might not be at (0,0) of the document
  var parentOffset = this.$parent.offset();
  x -= parentOffset.left;
  y -= parentOffset.top;

  return new Point(x, y);
}

_alignClasses() {
  var Alignment = Popup.Alignment;
  return strings.join(' ', Alignment.LEFT, Alignment.LEFTEDGE, Alignment.CENTER, Alignment.RIGHT, Alignment.RIGHTEDGE,
    Alignment.TOP, Alignment.TOPEDGE, Alignment.CENTER, Alignment.BOTTOM, Alignment.BOTTOMEDGE);
}

getAnchorBounds() {
  var anchorBounds = this.anchorBounds;
  if (!anchorBounds) {
    anchorBounds = graphics.offsetBounds(this.$anchor, {
      exact: true
    });
  }
  return anchorBounds;
}

getWindowSize() {
  var $window = this.$parent.window();
  return new Dimension($window.width(), $window.height());
}

/**
 * @returns Point the amount of overlap at the window borders.
 * A positive value indicates that it is overlapping the right / bottom border, a negative value indicates that it is overlapping the left / top border.
 * Prefers the right and bottom over the left and top border, meaning if a positive value is returned it does not mean that the left border is overlapping as well.
 */
overlap(location, includeMargin) {
  var $container = this.$container;
  if (!$container || !location) {
    return null;
  }
  includeMargin = scout.nvl(includeMargin, true);
  var height = $container.outerHeight(includeMargin);
  var width = $container.outerWidth(includeMargin);
  var popupBounds = new Rectangle(location.x, location.y, width, height);
  var bounds = graphics.offsetBounds($container.entryPoint(), true);

  var overlapX = popupBounds.right() + this.windowPaddingX - bounds.width;
  if (overlapX < 0) {
    overlapX = Math.min(popupBounds.x - this.windowPaddingX - bounds.x, 0);
  }
  var overlapY = popupBounds.bottom() + this.windowPaddingY - bounds.height;
  if (overlapY < 0) {
    overlapY = Math.min(popupBounds.y - this.windowPaddingY - bounds.y, 0);
  }
  return new Point(overlapX, overlapY);
}

adjustLocation(location, switchIfNecessary) {
  var verticalAlignment = this.verticalAlignment,
    horizontalAlignment = this.horizontalAlignment,
    overlap = this.overlap(location);

  // Reset arrow style
  if (this.$arrow) {
    this._updateArrowClass(verticalAlignment, horizontalAlignment);
    graphics.setMargins(this.$arrow, new Insets());
  }

  location = location.clone();
  if (overlap.y !== 0) {
    var verticalSwitch = scout.nvl(switchIfNecessary, this.verticalSwitch);
    if (verticalSwitch) {
      // Switch vertical alignment
      verticalAlignment = Popup.SwitchRule[verticalAlignment];
      location = this.prefLocation(verticalAlignment);
    } else {
      // Move popup to the top until it gets fully visible (if switch is disabled)
      location.y -= overlap.y;

      // Also move arrow so that it still points to the center of the anchor
      if (this.$arrow && (this.$arrow.hasClass(Popup.Alignment.LEFT) || this.$arrow.hasClass(Popup.Alignment.RIGHT))) {
        this.$arrow.cssMarginTop(overlap.y);
        if (overlap.y > 0) {
          this.$arrow.cssMarginTop(overlap.y);
        } else {
          this.$arrow.cssMarginBottom(-overlap.y);
        }
      }
    }
  }
  if (overlap.x !== 0) {
    var horizontalSwitch = scout.nvl(switchIfNecessary, this.horizontalSwitch);
    if (horizontalSwitch) {
      // Switch horizontal alignment
      horizontalAlignment = Popup.SwitchRule[horizontalAlignment];
      location = this.prefLocation(verticalAlignment, horizontalAlignment);
    } else {
      // Move popup to the left until it gets fully visible (if switch is disabled)
      location.x -= overlap.x;

      // Also move arrow so that it still points to the center of the anchor
      if (this.$arrow && (this.$arrow.hasClass(Popup.Alignment.TOP) || this.$arrow.hasClass(Popup.Alignment.BOTTOM))) {
        if (overlap.x > 0) {
          this.$arrow.cssMarginLeft(overlap.x);
        } else {
          this.$arrow.cssMarginRight(-overlap.x);
        }
      }
    }
  }
  return location;
}

size() {
  var size = this.prefSize(this.$container);
  if (!size) {
    return;
  }
  graphics.setSize(this.$container, size);
}

prefSize($container) {
  return null;
}

position(switchIfNecessary) {
  this._validateVisibility();
  this._position(switchIfNecessary);
}

_position(switchIfNecessary) {
  var location = this.prefLocation();
  if (!location) {
    return;
  }
  location = this.adjustLocation(location, switchIfNecessary);
  this.setLocation(location);
}

setLocation(location) {
  this.$container
    .css('left', location.x)
    .css('top', location.y);
  this._triggerLocationChange();
}

/**
 * Popups with an anchor must only be visible if the anchor is in view (prevents that the popup points at an invisible anchor)
 */
_validateVisibility() {
  if (!this.boundToAnchor || !this.$anchor) {
    return;
  }
  var inView = this._isInView();
  var needsLayouting = this.$container.hasClass('invisible') === inView && inView;
  this.$container.toggleClass('invisible', !inView); // Use visibility: hidden to not break layouting / size measurement
  if (needsLayouting) {
    var currentAnimateResize = this.animateResize;
    this.animateResize = false;
    this.revalidateLayout();
    this.animateResize = currentAnimateResize;
    if (this.withFocusContext) {
      this.session.focusManager.validateFocus();
    }
  }
}

_isInView() {
  if (!this.boundToAnchor || !this.$anchor) {
    return;
  }
  var anchorBounds = this.getAnchorBounds();
  return scrollbars.isLocationInView(anchorBounds.center(), this.$anchor.scrollParent());
}

_triggerLocationChange() {
  this.trigger('locationChange');
}

/**
 * Fire event that this popup is about to open.
 */
_triggerPopupOpenEvent() {
  this.session.desktop.trigger('popupOpen', {
    popup: this
  });
}

belongsTo($anchor) {
  return this.$anchor[0] === $anchor[0];
}

set$Anchor($anchor) {
  if (this.$anchor) {
    this._detachAnchorHandlers();
  }
  this.setProperty('$anchor', $anchor);
  if (this.rendered) {
    this._attachAnchorHandlers();
    this.revalidateLayout();
    if (!this.animateResize) { // PopupLayout will move it -> don't break move animation
      this.position();
    }
  }
}

isOpen() {
  return this.rendered;
}

ensureOpen() {
  if (!this.isOpen()) {
    this.open();
  }
}

setAnchor(anchor) {
  this.setProperty('anchor', anchor);
}

_setAnchor(anchor) {
  if (anchor) {
    this.setParent(anchor);
  }
  this._setProperty('anchor', anchor);
}

_onAnchorRender() {
  this.session.layoutValidator.schedulePostValidateFunction(function() {
    if (this.rendered || this.destroyed) {
      return;
    }
    if (this.anchor && !this.anchor.rendered) {
      // Anchor was removed again while this function was scheduled -> wait again for rendering
      this.anchor.one('render', this._anchorRenderHandler);
      return;
    }
    var currentAnimateOpening = this.animateOpening;
    this.animateOpening = false;
    this.open();
    this.animateOpening = currentAnimateOpening;
  }.bind(this));
}

_renderAnchor() {
  if (this.anchor) {
    this.set$Anchor(this.anchor.$container);
  }
}

_onWindowResize() {
  if (!this.rendered) {
    // may already be removed if a parent popup is closed during the resize event
    return;
  }
  if (this.windowResizeType === 'position') {
    this.position();
  } else if (this.windowResizeType === 'layoutAndPosition') {
    this.revalidateLayoutTree(false);
    this.position();
  } else if (this.windowResizeType === 'remove') {
    this.close();
  }
}
}

(function() {
  // Initialize switch rules (wrapped in IIFE to have local function scope for the variables)
  var SwitchRule = Popup.SwitchRule;
  var Alignment = Popup.Alignment;
  SwitchRule[Alignment.LEFT] = Alignment.RIGHT;
  SwitchRule[Alignment.LEFTEDGE] = Alignment.RIGHTEDGE;
  SwitchRule[Alignment.TOP] = Alignment.BOTTOM;
  SwitchRule[Alignment.TOPEDGE] = Alignment.BOTTOMEDGE;
  SwitchRule[Alignment.CENTER] = Alignment.CENTER;
  SwitchRule[Alignment.RIGHT] = Alignment.LEFT;
  SwitchRule[Alignment.RIGHTEDGE] = Alignment.LEFTEDGE;
  SwitchRule[Alignment.BOTTOM] = Alignment.TOP;
  SwitchRule[Alignment.BOTTOMEDGE] = Alignment.TOPEDGE;
}());