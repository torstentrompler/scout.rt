/*******************************************************************************
 * Copyright (c) 2014-2015 BSI Business Systems Integration AG.
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v1.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v10.html
 *
 * Contributors:
 *     BSI Business Systems Integration AG - initial API and implementation
 ******************************************************************************/
scout.AbstractGroupBoxBodyGrid = function() {
  this.gridRows = 0;
  this.gridColumns = 0;
};

scout.AbstractGroupBoxBodyGrid.prototype.init = function() {};

scout.AbstractGroupBoxBodyGrid.prototype.validate = function(groupBox, recursive) {
  // reset old state
  this.gridRows = 0;
  // step 0: column count
  this.gridColumns = this._computeGridColumnCount(groupBox);
  var containingGridXYCount = 0;
  var notContainingGridXYCount = 0;
  // build
  var fieldsExceptProcessButtons = [];
  groupBox.fields.forEach(function(field) {
    if (field.visible) {
      if (!field.processButton) {
        fieldsExceptProcessButtons.push(field);
        var hints = field.gridDataHints;
        if (hints && hints.x >= 0 && hints.y >= 0) {
          containingGridXYCount++;
        } else {
          notContainingGridXYCount++;
        }
      }
    } else {
      var gd = scout.GridData.createFromHints(field, 1);
      field.gridData = gd;
    }
  }.bind(this));
  if (containingGridXYCount > 0 && notContainingGridXYCount === 0) {
    this.layoutAllStatic(fieldsExceptProcessButtons);
  } else {
    this.layoutAllDynamic(fieldsExceptProcessButtons);
  }

  if (recursive && recursive === true) {
    groupBox.fields.filter(function(e) {
      return e.objectType === 'GroupBox';
    }).forEach(function(e) {
      this.validate(e, true);
    }.bind(this));
  }
};

scout.AbstractGroupBoxBodyGrid.prototype.layoutAllStatic = function(fields) {
  var hints = [];
  fields.forEach(function(v) {
    hints.push(scout.GridData.createFromHints(v, 1));
  });
  var totalGridW = hints.reduce(function(x, y) {
    var y1 = y.x + y.w;
    return y1 > x ? y1 : x;
  }, 1);
  var totalGridH = hints.reduce(function(x, y) {
    var y1 = y.y + y.h;
    return y1 > x ? y1 : x;
  }, 0);
  fields.forEach(function(v) {
    v.gridData = scout.GridData.createFromHints(v, totalGridW);
  });
  this.gridRows = totalGridH;
  this.gridColumns = totalGridW;
};

scout.AbstractGroupBoxBodyGrid.prototype.layoutAllDynamic = function(fields) {
  // abstract, must be implemented by sub classes
};

scout.AbstractGroupBoxBodyGrid.prototype.getGridColumnCount = function() {
  return this.gridColumns;
};

scout.AbstractGroupBoxBodyGrid.prototype.getGridRowCount = function() {
  return this.gridRows;
};

scout.AbstractGroupBoxBodyGrid.prototype._computeGridColumnCount = function(groupBox) {
  var gridColumns = -1,
    tmp = groupBox;
  do {
    gridColumns = scout.nvl(tmp.gridColumnCount, gridColumns);
  } while (gridColumns < 0 && tmp.getParentGroupBox && (tmp = tmp.getParentGroupBox()));
  return gridColumns < 0 ? 2 : gridColumns;
};

/**
 * if grid w greater than group box column count. Grid w will be set to group box column count.
 */
scout.AbstractGroupBoxBodyGrid.getGridDataFromHints = function(field, groupBoxColumnCount) {
  var data = scout.GridData.createFromHints(field, groupBoxColumnCount);
  data.w = Math.min(groupBoxColumnCount, data.w);
  return data;
};