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
import {HtmlComponent, IconDesc, Image, scout, Widget} from '../index';

/**
 * Widget representing an icon. It may be a font icon or an image icon. Depending on the type, either a span or an img tag will be rendered.
 * <p>
 * See also jquery-scout.icon/appendIcon. Main difference to these implementations is that the image loading will invalidate the layout by using {@link Image}.
 */
export default class Icon extends Widget {

  constructor() {
    super();

    this.autoFit = false;
    /** @type {IconDesc} */
    this.iconDesc = null;

    /**
     * Is set if the icon is rendered and an image, it is not set if it is a font icon
     * @type Image
     */
    this.image = null;
    this.prepend = false;
  }

  _init(model) {
    super._init(model);
    this._setIconDesc(this.iconDesc);
  }

  _render() {
    this._renderIconDesc(); // Must not be in _renderProperties because it creates $container -> properties like visible etc. need to be rendered afterwards
  }

  /**
   * Accepts either an iconId as string or an {@link IconDesc}.
   * @param {(string|IconDesc)} icon
   */
  setIconDesc(iconDesc) {
    this.setProperty('iconDesc', iconDesc);
  }

  _setIconDesc(iconDesc) {
    iconDesc = IconDesc.ensure(iconDesc);
    this._setProperty('iconDesc', iconDesc);
  }

  _renderIconDesc() {
    this._removeFontIcon();
    this._removeImageIcon();

    if (!this.iconDesc || this.iconDesc.isFontIcon()) {
      this._renderFontIcon();
    } else if (this.iconDesc.iconType === 2) {
      this._renderSvgIcon();
    } else {
      this._renderImageIcon();
    }
    if (!this.rendering) {
      this._renderProperties();
    }
    this.invalidateLayoutTree();
  }

  _renderSvgIcon() {
    if (this.iconDesc.iconUrl.indexOf('add-circle.svg') > -1) {
      this.$container = this.$parent.prependElement(`
      <svg version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px"
 viewBox="0 0 24 24" style="enable-background:new 0 0 24 24;" xml:space="preserve">
<title>add-circle</title>
<g>
<path d="M12,17.25c-0.414,0-0.75-0.336-0.75-0.75v-3.75H7.5c-0.414,0-0.75-0.336-0.75-0.75s0.336-0.75,0.75-0.75h3.75V7.5
 c0-0.414,0.336-0.75,0.75-0.75s0.75,0.336,0.75,0.75v3.75h3.75c0.414,0,0.75,0.336,0.75,0.75s-0.336,0.75-0.75,0.75h-3.75v3.75
 C12.75,16.914,12.414,17.25,12,17.25z"/>
<path d="M12,24C5.383,24,0,18.617,0,12C0,5.383,5.383,0,12,0c6.617,0,12,5.383,12,12C24,18.617,18.617,24,12,24z M12,1.5
 C6.21,1.5,1.5,6.21,1.5,12c0,5.79,4.71,10.5,10.5,10.5c5.79,0,10.5-4.71,10.5-10.5C22.5,6.21,17.79,1.5,12,1.5z"/>
</g>
</svg>
      `).addClass('icon');
    } else if (this.iconDesc.iconUrl.indexOf('16px-outline.svg') > -1) {
      this.$container = this.$parent.prependElement(`
<svg version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px"
\t viewBox="0 0 16 16" style="enable-background:new 0 0 16 16;" xml:space="preserve">
<g>
\t<path d="M11,7.5H8.5V5c0-0.3-0.2-0.5-0.5-0.5S7.5,4.7,7.5,5v2.5H5C4.7,7.5,4.5,7.7,4.5,8S4.7,8.5,5,8.5h2.5V11
\t\tc0,0.3,0.2,0.5,0.5,0.5s0.5-0.2,0.5-0.5V8.5H11c0.3,0,0.5-0.2,0.5-0.5S11.3,7.5,11,7.5z"/>
\t<path d="M8,0C3.6,0,0,3.6,0,8s3.6,8,8,8s8-3.6,8-8S12.4,0,8,0z M8,15c-3.9,0-7-3.1-7-7c0-3.9,3.1-7,7-7c3.9,0,7,3.1,7,7
\t\tC15,11.9,11.9,15,8,15z"/>
</g>
</svg>
      `).addClass('icon');
    } else if (this.iconDesc.iconUrl.indexOf('16px-outline-pixel-perfect.svg') > -1) {
      this.$container = this.$parent.prependElement(`
<svg version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px"
\t viewBox="0 0 16 16" style="enable-background:new 0 0 16 16;" xml:space="preserve">
<g>
\t<path d="M11.5,8H9V5.5C9,5.2,8.8,5,8.5,5S8,5.2,8,5.5V8H5.5C5.2,8,5,8.2,5,8.5S5.2,9,5.5,9H8v2.5C8,11.8,8.2,12,8.5,12
\t\tS9,11.8,9,11.5V9h2.5C11.8,9,12,8.8,12,8.5S11.8,8,11.5,8z"/>
\t<path d="M8,0C3.6,0,0,3.6,0,8s3.6,8,8,8s8-3.6,8-8S12.4,0,8,0z M8,15c-3.9,0-7-3.1-7-7c0-3.9,3.1-7,7-7c3.9,0,7,3.1,7,7
\t\tC15,11.9,11.9,15,8,15z"/>
</g>
</svg>
      `).addClass('icon');
    } else if (this.iconDesc.iconUrl.indexOf('16px-stroke.svg') > -1) {
      this.$container = this.$parent.prependElement(`
<svg version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px"
\t viewBox="0 0 16 16" style="enable-background:new 0 0 16 16;" xml:space="preserve">
<style type="text/css">
\t.st0{fill:none;stroke:#000000;stroke-linecap:round;stroke-linejoin:round;}
</style>
<line class="st0" x1="8" y1="5" x2="8" y2="11"/>
<line class="st0" x1="5" y1="8" x2="11" y2="8"/>
<circle class="st0" cx="8" cy="8" r="7.5"/>
</svg>
      `).addClass('icon stroke');
    } else if (this.iconDesc.iconUrl.indexOf('16px-stroke-pixel-perfect.svg') > -1) {
      this.$container = this.$parent.prependElement(`
<svg version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px"
\t viewBox="0 0 16 16" style="enable-background:new 0 0 16 16;" xml:space="preserve">
<style type="text/css">
\t.st0{fill:none;stroke:#000000;stroke-linecap:round;stroke-linejoin:round;}
</style>
<line class="st0" x1="8.5" y1="5.5" x2="8.5" y2="11.5"/>
<line class="st0" x1="5.5" y1="8.5" x2="11.5" y2="8.5"/>
<circle class="st0" cx="8" cy="8" r="7.5"/>
</svg>
      `).addClass('icon stroke');
    } else if (this.iconDesc.iconUrl.indexOf('mail-16px-stroke-ink.svg') > -1) {
      this.$container = this.$parent.prependElement(`
<svg width="16" height="16" version="1.1" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
 <defs>
  <style>.a{fill:none;stroke:currentColor;stroke-linecap:round;stroke-linejoin:round;stroke-width:1.5px;}</style>
 </defs>
 <title>email-action-unread</title>
 <path d="m1.5723 2c-0.86908 0-1.5723 0.72883-1.5723 1.5996v8.8008c0 0.87078 0.70319 1.5996 1.5723 1.5996h12.855c0.86908 0 1.5723-0.72883 1.5723-1.5996v-8.8008c0-0.87078-0.70319-1.5996-1.5723-1.5996h-12.855zm0 1h12.855c0.31806 0 0.57227 0.25159 0.57227 0.59961v8.8008c0 0.34802-0.2542 0.59961-0.57227 0.59961h-12.855c-0.31806 0-0.57227-0.25159-0.57227-0.59961v-8.8008c0-0.34802 0.2542-0.59961 0.57227-0.59961z" color="#000000" color-rendering="auto" dominant-baseline="auto" fill="currentColor" image-rendering="auto" shape-rendering="auto" solid-color="#000000" stop-color="#000000" style="font-feature-settings:normal;font-variant-alternates:normal;font-variant-caps:normal;font-variant-east-asian:normal;font-variant-ligatures:normal;font-variant-numeric:normal;font-variant-position:normal;font-variation-settings:normal;inline-size:0;isolation:auto;mix-blend-mode:normal;shape-margin:0;shape-padding:0;text-decoration-color:#000000;text-decoration-line:none;text-decoration-style:solid;text-indent:0;text-orientation:mixed;text-transform:none;white-space:normal"/>
 <path d="m0.71289 2.3926a0.5 0.5 0 0 0-0.36719 0.19531 0.5 0.5 0 0 0 0.091797 0.70117l5.8164 4.4707c1.0272 0.78966 2.465 0.78966 3.4922 0l5.8164-4.4707a0.5 0.5 0 0 0 0.091797-0.70117 0.5 0.5 0 0 0-0.70117-0.091797l-5.8164 4.4707c-0.67154 0.51627-1.6019 0.51627-2.2734 0l-5.8164-4.4707a0.5 0.5 0 0 0-0.33398-0.10352z" color="#000000" color-rendering="auto" dominant-baseline="auto" fill="currentColor" image-rendering="auto" shape-rendering="auto" solid-color="#000000" stop-color="#000000" style="font-feature-settings:normal;font-variant-alternates:normal;font-variant-caps:normal;font-variant-east-asian:normal;font-variant-ligatures:normal;font-variant-numeric:normal;font-variant-position:normal;font-variation-settings:normal;inline-size:0;isolation:auto;mix-blend-mode:normal;shape-margin:0;shape-padding:0;text-decoration-color:#000000;text-decoration-line:none;text-decoration-style:solid;text-indent:0;text-orientation:mixed;text-transform:none;white-space:normal"/>
</svg>
      `).addClass('icon');
    } else if (this.iconDesc.iconUrl.indexOf('circle-16px-outline-ink.svg') > -1) {
      this.$container = this.$parent.prependElement(`
<svg
   version="1.1"
   id="Layer_1"
   x="0px"
   y="0px"
   viewBox="0 0 16 16"
   style="enable-background:new 0 0 16 16;"
   xml:space="preserve"
   xmlns="http://www.w3.org/2000/svg"
   xmlns:svg="http://www.w3.org/2000/svg"><defs
   id="defs43" />
<style
   type="text/css"
   id="style32">
\t.st0{fill:none;stroke:#000000;stroke-linecap:round;stroke-linejoin:round;}
</style>
<path
   id="line34"
   style="color:#000000;fill:#000000;stroke-linecap:round;stroke-linejoin:round;-inkscape-stroke:none"
   d="M 8 0 C 3.5876487 0 0 3.5876487 0 8 C 0 12.412351 3.5876487 16 8 16 C 12.412351 16 16 12.412351 16 8 C 16 3.5876487 12.412351 0 8 0 z M 8 1 C 11.871912 1 15 4.1280883 15 8 C 15 11.871912 11.871912 15 8 15 C 4.1280883 15 1 11.871912 1 8 C 1 4.1280883 4.1280883 1 8 1 z M 8 4.5 A 0.5 0.5 0 0 0 7.5 5 L 7.5 7.5 L 5 7.5 A 0.5 0.5 0 0 0 4.5 8 A 0.5 0.5 0 0 0 5 8.5 L 7.5 8.5 L 7.5 11 A 0.5 0.5 0 0 0 8 11.5 A 0.5 0.5 0 0 0 8.5 11 L 8.5 8.5 L 11 8.5 A 0.5 0.5 0 0 0 11.5 8 A 0.5 0.5 0 0 0 11 7.5 L 8.5 7.5 L 8.5 5 A 0.5 0.5 0 0 0 8 4.5 z " />
</svg>
      `).addClass('icon');
    } else if (this.iconDesc.iconUrl.indexOf('circle-16px-stroke-ink.svg') > -1) {
      this.$container = this.$parent.prependElement(`

<svg
   version="1.1"
   id="Layer_1"
   x="0px"
   y="0px"
   viewBox="0 0 16 16"
   style="enable-background:new 0 0 16 16;"
   xml:space="preserve"
   xmlns="http://www.w3.org/2000/svg"
   xmlns:svg="http://www.w3.org/2000/svg"><defs
   id="defs43" />
<style
   type="text/css"
   id="style32">
\t.st0{fill:none;stroke:#000000;stroke-linecap:round;stroke-linejoin:round;}
</style>
<line
   class="st0"
   x1="8"
   y1="5"
   x2="8"
   y2="11"
   id="line34" />
<line
   class="st0"
   x1="5"
   y1="8"
   x2="11"
   y2="8"
   id="line36" />
<circle
   class="st0"
   cx="8"
   cy="8"
   id="circle38"
   r="7.5" />
</svg>
      `).addClass('icon stroke');
    }
  }

  _renderFontIcon() {
    this.$container = this.$parent.appendIcon(this.iconDesc);
    if (this.prepend) {
      this.$container.prependTo(this.$parent);
    }

    this.htmlComp = HtmlComponent.install(this.$container, this.session);
  }

  _removeFontIcon() {
    if (this.$container) {
      this.$container.remove();
      this.$container = null;
    }
  }

  _renderImageIcon() {
    if (this.image) {
      return;
    }
    this.image = scout.create('Image', {
      parent: this,
      imageUrl: this.iconDesc.iconUrl,
      cssClass: 'icon image-icon',
      autoFit: this.autoFit,
      prepend: this.prepend
    });
    this.image.render(this.$parent);
    this.image.one('destroy', () => {
      this.image = null;
    });
    this.image.on('load error', event => {
      // propagate event
      this.trigger(event.type, event);
    });
    this.$container = this.image.$container;
    this.htmlComp = this.image.htmlComp;
  }

  _removeImageIcon() {
    if (this.image) {
      this.image.destroy();
      this.image = null;
    }
  }

  /**
   * Delegates to this.image.setAutoFit, but only if Icon is an image. Beside updating the autoFit property, this method has no effect if the icon is a font-icon.
   */
  setAutoFit(autoFit) {
    this.setProperty('autoFit', autoFit);
    if (this.image) {
      this.image.setAutoFit(autoFit);
    }
  }
}
