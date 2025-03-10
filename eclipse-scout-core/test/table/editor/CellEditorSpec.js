/*
 * Copyright (c) 2010-2020 BSI Business Systems Integration AG.
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v1.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v10.html
 *
 * Contributors:
 *     BSI Business Systems Integration AG - initial API and implementation
 */
import {Cell, keys, scout, StaticLookupCall, Status, TableRow, Widget} from '../../../src/index';
import {FormSpecHelper, TableSpecHelper} from '../../../src/testing/index';

describe('CellEditor', () => {
  let session;
  let helper;
  let formHelper;

  beforeEach(() => {
    setFixtures(sandboxDesktop());
    session = sandboxSession();
    helper = new TableSpecHelper(session);
    formHelper = new FormSpecHelper(session);
    jasmine.Ajax.install();
    jasmine.clock().install();
  });

  afterEach(() => {
    session = null;
    jasmine.Ajax.uninstall();
    jasmine.clock().uninstall();
    let popup = findPopup();
    if (popup) {
      popup.close();
    }
  });

  class DummyLookupCall extends StaticLookupCall {
    constructor() {
      super();
    }

    _data() {
      return [
        ['key0', 'Key 0'],
        ['key1', 'Key 1']
      ];
    }
  }

  function createStringField() {
    return scout.create('StringField', {
      parent: session.desktop
    });
  }

  function $findPopup() {
    return $('.cell-editor-popup');
  }

  function findPopup() {
    return $findPopup().data('popup');
  }

  function assertCellEditorIsOpen(table, column, row) {
    let popup = table.cellEditorPopup;
    expect(popup.cell.field.rendered).toBe(true);
    expect(popup.column).toBe(column);
    expect(popup.row).toBe(row);
    let $popup = $findPopup();
    expect($popup.length).toBe(1);
    expect(popup.$container[0]).toBe($popup[0]);
    expect($popup.find('.form-field').length).toBe(1);
  }

  describe('mouse click', () => {
    let table, model, $rows, $cells0, $cells1, $cell0_0, $cell0_1, $cell1_0;

    beforeEach(() => {
      model = helper.createModelFixture(2, 2);
      table = helper.createTable(model);
      table.render();
      helper.applyDisplayStyle(table);
      $rows = table.$rows();
      $cells0 = $rows.eq(0).find('.table-cell');
      $cells1 = $rows.eq(1).find('.table-cell');
      $cell0_0 = $cells0.eq(0);
      $cell0_1 = $cells0.eq(1);
      $cell1_0 = $cells1.eq(0);
    });

    it('starts cell edit if cell is editable', () => {
      table.rows[0].cells[0].editable = true;
      table.rows[1].cells[0].editable = false;

      spyOn(table, 'prepareCellEdit');
      $cell1_0.triggerClick();
      expect(table.prepareCellEdit).not.toHaveBeenCalled();
      $cell0_0.triggerClick();
      expect(table.prepareCellEdit).toHaveBeenCalled();
    });

    it('does not start cell edit if cell is not editable', () => {
      table.rows[0].cells[0].editable = false;

      spyOn(table, 'prepareCellEdit');
      $cell0_0.triggerClick();
      expect(table.prepareCellEdit).not.toHaveBeenCalled();
    });

    it('does not start cell edit if row is disabled', () => {
      table.rows[0].cells[0].editable = true;
      table.rows[0].enabled = false;

      spyOn(table, 'prepareCellEdit');
      $cell0_0.triggerClick();
      expect(table.prepareCellEdit).not.toHaveBeenCalled();
    });

    it('does not start cell edit if table is disabled', () => {
      table.rows[0].cells[0].editable = true;
      table.enabled = false;
      table.recomputeEnabled();

      spyOn(table, 'prepareCellEdit');
      $cell0_0.triggerClick();
      expect(table.prepareCellEdit).not.toHaveBeenCalled();
    });

    it('does not start cell edit if form is disabled', () => {
      table.rows[0].cells[0].editable = true;
      table.enabledComputed = false;

      spyOn(table, 'prepareCellEdit');
      $cell0_0.triggerClick();
      expect(table.prepareCellEdit).not.toHaveBeenCalled();
    });

    it('does not start cell edit if mouse down and up happened on different cells', () => {
      table.rows[0].cells[0].editable = true;
      table.rows[0].cells[1].editable = true;

      spyOn(table, 'prepareCellEdit');
      $cell0_1.triggerMouseDown();
      $cell0_0.triggerMouseUp();
      expect(table.prepareCellEdit).not.toHaveBeenCalled();
    });

    it('does not start cell edit if right mouse button was pressed', () => {
      table.rows[0].cells[0].editable = true;

      spyOn(table, 'prepareCellEdit');
      $cell0_0.triggerMouseDown({which: 3});
      $cell0_0.triggerMouseUp({which: 3});
      expect(table.prepareCellEdit).not.toHaveBeenCalled();
    });

    it('does not start cell edit if middle mouse button was pressed', () => {
      table.rows[0].cells[0].editable = true;

      spyOn(table, 'prepareCellEdit');
      $cell0_0.triggerMouseDown({which: 2});
      $cell0_0.triggerMouseUp({which: 2});
      expect(table.prepareCellEdit).not.toHaveBeenCalled();
    });

    it('does not open cell editor if a ctrl or shift is pressed, because the user probably wants to do row selection rather than cell editing', () => {
      table.rows[0].cells[0].editable = true;
      table.rows[1].cells[0].editable = true;

      spyOn(table, 'prepareCellEdit');
      // row 0 is selected, user presses shift and clicks row 2
      table.selectRows([table.rows[0]]);
      $cell1_0.triggerClick({modifier: 'shift'});
      expect(table.prepareCellEdit).not.toHaveBeenCalled();

      $cell1_0.triggerClick({modifier: 'ctrl'});
      expect(table.prepareCellEdit).not.toHaveBeenCalled();
    });
  });

  describe('TAB key', () => {
    let table, $rows, $cells0;

    beforeEach(() => {
      table = helper.createTable(helper.createModelFixture(2, 2));
      table.render();
      helper.applyDisplayStyle(table);
      $rows = table.$rows();
      $cells0 = $rows.eq(0).find('.table-cell');
    });

    it('starts the cell editor for the next editable cell', () => {
      table.rows[0].cells[0].editable = true;
      table.rows[1].cells[0].editable = true;

      table.focusCell(table.columns[0], table.rows[0]);
      jasmine.clock().tick(0);
      assertCellEditorIsOpen(table, table.columns[0], table.rows[0]);

      $(document.activeElement).triggerKeyInputCapture(keys.TAB);
      jasmine.clock().tick(0);
      jasmine.clock().tick(0);
      assertCellEditorIsOpen(table, table.columns[0], table.rows[1]);
    });
  });

  describe('prepareCellEdit', () => {
    let table;

    beforeEach(() => {
      let model = helper.createModelFixture(2, 2);
      table = helper.createTable(model);
      table.render();
      helper.applyDisplayStyle(table);
    });

    it('creates field and calls start', () => {
      table.columns[0].setEditable(true);
      spyOn(table, 'startCellEdit').and.callThrough();

      table.prepareCellEdit(table.columns[0], table.rows[0]);
      jasmine.clock().tick(0);
      expect(table.startCellEdit).toHaveBeenCalled();
      assertCellEditorIsOpen(table, table.columns[0], table.rows[0]);
    });

    it('copies the value to the field if cell was valid', () => {
      let column = table.columns[0];
      let row = table.rows[0];
      column.setEditable(true);
      column.setCellValue(row, 'valid value');
      table.prepareCellEdit(column, row);
      jasmine.clock().tick(0);
      assertCellEditorIsOpen(table, column, row);
      let field = table.cellEditorPopup.cell.field;
      expect(field.value).toEqual('valid value');
      expect(field.displayText).toEqual('valid value');
      expect(field.errorStatus).toEqual(null);
    });

    it('copies the text and the error to the field if cell was invalid', () => {
      let column = table.columns[0];
      let row = table.rows[0];
      column.setEditable(true);
      column.setCellValue(row, 'valid value');
      column.setCellText(row, 'invalid value');
      column.setCellErrorStatus(row, Status.error('error'));
      table.prepareCellEdit(column, row);
      jasmine.clock().tick(0);
      assertCellEditorIsOpen(table, column, row);
      let field = table.cellEditorPopup.cell.field;
      expect(field.value).toEqual(null);
      expect(field.displayText).toEqual('invalid value');
      expect(field.errorStatus.message).toEqual('error');
    });

    it('triggers prepareCellEdit event', () => {
      let triggeredEvent;
      table.columns[0].setEditable(true);
      table.on('prepareCellEdit', event => {
        triggeredEvent = event;
      });
      table.prepareCellEdit(table.columns[0], table.rows[0]);
      jasmine.clock().tick(0);
      expect(triggeredEvent.column).toBe(table.columns[0]);
      expect(triggeredEvent.row).toBe(table.rows[0]);
    });
  });

  describe('startCellEdit', () => {
    let table;

    beforeEach(() => {
      let model = helper.createModelFixture(2, 2);
      table = helper.createTable(model);
      table.render();
      helper.applyDisplayStyle(table);
    });

    it('opens popup with field', () => {
      table.columns[0].setEditable(true);
      let field = createStringField(table);
      table.startCellEdit(table.columns[0], table.rows[0], field);
      assertCellEditorIsOpen(table, table.columns[0], table.rows[0]);
      expect(table.cellEditorPopup.cell.field).toBe(field);
    });

    it('triggers startCellEdit event', () => {
      let triggeredEvent;
      table.columns[0].setEditable(true);
      table.on('startCellEdit', event => {
        triggeredEvent = event;
      });
      table.prepareCellEdit(table.columns[0], table.rows[0]);
      jasmine.clock().tick(0);
      expect(triggeredEvent.row).toBe(table.rows[0]);
      expect(triggeredEvent.column).toBe(table.columns[0]);
      expect(triggeredEvent.field instanceof Widget).toBe(true);
    });
  });

  describe('completeCellEdit', () => {
    let table;

    beforeEach(() => {
      let model = helper.createModelFixture(2, 2);
      table = helper.createTable(model);
      table.render();
      helper.applyDisplayStyle(table);
    });

    it('triggers completeCellEdit event', () => {
      let triggeredEvent;
      table.columns[0].setEditable(true);
      table.prepareCellEdit(table.columns[0], table.rows[0]);
      jasmine.clock().tick(0);
      table.on('completeCellEdit', event => {
        triggeredEvent = event;
      });
      table.completeCellEdit();
      expect(triggeredEvent.column).toBe(table.columns[0]);
      expect(triggeredEvent.row).toBe(table.rows[0]);
      expect(triggeredEvent.field).toBe(table.rows[0].cells[0].field);
    });

    it('calls endCellEdit with saveEditorValue=true', () => {
      table.columns[0].setEditable(true);
      table.prepareCellEdit(table.columns[0], table.rows[0]);
      jasmine.clock().tick(0);
      spyOn(table, 'endCellEdit').and.callThrough();
      let field = table.cellEditorPopup.cell.field;

      table.completeCellEdit();
      expect(table.endCellEdit).toHaveBeenCalledWith(field, true);
      jasmine.clock().tick(0);
      expect($findPopup().length).toBe(0);
    });

    it('saves editor value', () => {
      table.columns[0].setEditable(true);
      table.prepareCellEdit(table.columns[0], table.rows[0]);
      jasmine.clock().tick(0);
      table.cellEditorPopup.cell.field.setValue('my new value');

      table.completeCellEdit();
      expect(table.rows[0].cells[0].value).toBe('my new value');
    });

    it('copies the value to the cell if field was valid', () => {
      table.columns[0].setEditable(true);
      table.prepareCellEdit(table.columns[0], table.rows[0]);
      jasmine.clock().tick(0);
      table.cellEditorPopup.cell.field.setValue('my new value');

      table.completeCellEdit();
      let cell = table.rows[0].cells[0];
      expect(cell.value).toBe('my new value');
      expect(cell.text).toBe('my new value');
      expect(cell.errorStatus).toBe(null);
      expect($('.tooltip').length).toBe(0);
    });

    it('copies the text and error to the cell if field was invalid', () => {
      let column = table.columns[0];
      let row = table.rows[0];
      let cell = row.cells[0];
      expect($('.tooltip').length).toBe(0);

      column.setEditable(true);
      column.setCellValue(row, 'valid value');
      table.prepareCellEdit(column, row);
      jasmine.clock().tick(0);

      let field = table.cellEditorPopup.cell.field;
      field.setValidator(value => {
        throw 'Validation failed';
      });
      field.setValue('invalid value');
      expect(field.value).toBe('valid value');
      expect(field.errorStatus.message).toBe('Validation failed');
      expect(field.displayText).toBe('invalid value');
      table.completeCellEdit();
      expect(cell.value).toBe('valid value');
      expect(cell.text).toBe('invalid value');
      expect(cell.errorStatus.message).toBe('Validation failed');
      expect($('.tooltip').length).toBe(1);
      expect($('.tooltip')).toContainText('Validation failed');
    });

    it('clears the error if value is now valid', () => {
      let column = table.columns[0];
      let row = table.rows[0];
      let cell = row.cells[0];
      expect($('.tooltip').length).toBe(0);

      column.setEditable(true);
      column.setCellValue(row, 'valid value');
      table.prepareCellEdit(column, row);
      jasmine.clock().tick(0);

      let field = table.cellEditorPopup.cell.field;
      field.setValidator(value => {
        throw 'Validation failed';
      });
      field.setValue('invalid value');
      expect(field.value).toBe('valid value');
      expect(field.errorStatus.message).toBe('Validation failed');
      expect(field.displayText).toBe('invalid value');
      table.completeCellEdit();
      expect(cell.value).toBe('valid value');
      expect(cell.text).toBe('invalid value');
      expect(cell.errorStatus.message).toBe('Validation failed');
      expect($('.tooltip').length).toBe(1);
      expect($('.tooltip')).toContainText('Validation failed');

      // Second time -> make it valid
      table.prepareCellEdit(column, row);
      jasmine.clock().tick(0);
      field = table.cellEditorPopup.cell.field;
      field.setValidator(null);
      field.setValue('new valid value');
      expect(field.value).toBe('new valid value');
      expect(field.errorStatus).toBe(null);
      expect(field.displayText).toBe('new valid value');
      table.completeCellEdit();
      expect(cell.value).toBe('new valid value');
      expect(cell.text).toBe('new valid value');
      expect(cell.errorStatus).toBe(null);
      expect($('.tooltip').length).toBe(0);
    });

    it('clears the error if value is now valid even when changed to the original value', () => {
      let column = table.columns[0];
      let row = table.rows[0];
      let cell = row.cells[0];
      expect($('.tooltip').length).toBe(0);

      column.setEditable(true);
      column.setCellValue(row, 'valid value');
      table.prepareCellEdit(column, row);
      jasmine.clock().tick(0);

      let field = table.cellEditorPopup.cell.field;
      field.setValidator(value => {
        throw 'Validation failed';
      });
      field.setValue('invalid value');
      expect(field.value).toBe('valid value');
      expect(field.errorStatus.message).toBe('Validation failed');
      expect(field.displayText).toBe('invalid value');
      table.completeCellEdit();
      expect(cell.value).toBe('valid value');
      expect(cell.text).toBe('invalid value');
      expect(cell.errorStatus.message).toBe('Validation failed');
      expect($('.tooltip').length).toBe(1);
      expect($('.tooltip')).toContainText('Validation failed');

      // Second time -> make it valid
      table.prepareCellEdit(column, row);
      jasmine.clock().tick(0);
      field = table.cellEditorPopup.cell.field;
      field.setValidator(null);
      field.setValue('valid value'); // Same as at the beginning
      expect(field.value).toBe('valid value');
      expect(field.errorStatus).toBe(null);
      expect(field.displayText).toBe('valid value');
      table.completeCellEdit();
      expect(cell.value).toBe('valid value');
      expect(cell.text).toBe('valid value');
      expect(cell.errorStatus).toBe(null);
      expect($('.tooltip').length).toBe(0);
    });

    it('does not reopen the editor again', () => {
      table.columns[0].setEditable(true);
      table.prepareCellEdit(table.columns[0], table.rows[0]);
      jasmine.clock().tick(0);
      table.cellEditorPopup.cell.field.setValue('my new value');

      let triggeredStartCellEditEvent = null;
      table.on('startCellEdit', event => {
        triggeredStartCellEditEvent = event;
      });
      table.completeCellEdit();
      // CompleteCellEdit triggers updateRows which would reopen the editor -> this must not happen if the editor was closed
      expect(triggeredStartCellEditEvent).toBe(null);
    });
  });

  describe('completeCellEdit in SmartColumn', () => {
    let table;

    beforeEach(() => {
      let lookupCall = new DummyLookupCall();
      lookupCall.init({session: session});

      table = helper.createTable({
        columns: [{
          objectType: 'SmartColumn',
          lookupCall: lookupCall
        }]
      });
      let cell = new Cell();
      cell.init({value: 'key0', text: 'Key 0'});
      table.insertRow({
        cells: [cell]
      });
      table.render();
      helper.applyDisplayStyle(table);
      // Ensure texts are set and no updates are pending
      expect(table.rows[0].cells[0].text).toEqual('Key 0');
      expect(table.updateBuffer.promises.length).toBe(0);
    });

    it('does not fail when completing edit after removing a value', done => {
      jasmine.clock().uninstall();
      table.columns[0].setEditable(true);
      table.sort(table.columns[0]); // Column needs to be sorted to force a rerendering of the rows at the end when rows are updated (_sortAfterUpdate)
      table.prepareCellEdit(table.columns[0], table.rows[0], true).then(() => {
        table.cellEditorPopup.cell.field.clear();

        let triggeredStartCellEditEvent = null;
        table.on('startCellEdit', event => {
          triggeredStartCellEditEvent = event;
        });
        // Use completeEdit to simulate a mouse click (see CellEditorPopup._onMouseDownOutside)
        // Compared to table.completeEdit it sets the flag _pendingCompleteCellEdit which delays the destruction of the popup (see _destroyCellEditorPopup)
        table.cellEditorPopup.completeEdit().then(() => {

          // CompleteCellEdit triggers setCellTextDeferred which adds the promise to the updateBuffer which eventually renders the viewport and would reopen the editor
          // -> reopening must not happen if the editor was closed
          expect(triggeredStartCellEditEvent).toBe(null);
          done();
        });
      });
    });

    it('triggers update row event containing row with correct state', () => {
      table.columns[0].setEditable(true);
      table.markRowsAsNonChanged();
      table.prepareCellEdit(table.columns[0], table.rows[0], true);
      jasmine.clock().tick(300);
      table.cellEditorPopup.cell.field.setValue('key1');
      jasmine.clock().tick(300);
      let updateRowCount = 0;
      table.on('rowsUpdated', event => {
        expect(event.rows[0].cells[0].value).toBe('key1');
        expect(event.rows[0].cells[0].text).toBe('Key 1');
        expect(event.rows[0].status).toBe(TableRow.Status.UPDATED);
        updateRowCount++;
      });
      table.completeCellEdit();
      jasmine.clock().tick(300);
      expect(updateRowCount).toBe(1);
    });
  });

  describe('cancelCellEdit', () => {
    let table;

    beforeEach(() => {
      let model = helper.createModelFixture(2, 2);
      table = helper.createTable(model);
      table.render();
      helper.applyDisplayStyle(table);
    });

    it('triggers cancelCellEdit event', () => {
      let triggeredEvent;
      table.columns[0].setEditable(true);
      table.prepareCellEdit(table.columns[0], table.rows[0]);
      jasmine.clock().tick(0);
      table.on('cancelCellEdit', event => {
        triggeredEvent = event;
      });
      table.cancelCellEdit();
      expect(triggeredEvent.column).toBe(table.columns[0]);
      expect(triggeredEvent.row).toBe(table.rows[0]);
      expect(triggeredEvent.field).toBe(table.rows[0].cells[0].field);
    });

    it('calls endCellEdit with saveEditorValue=false', () => {
      table.columns[0].setEditable(true);
      table.prepareCellEdit(table.columns[0], table.rows[0]);
      jasmine.clock().tick(0);
      spyOn(table, 'endCellEdit').and.callThrough();
      let field = table.cellEditorPopup.cell.field;

      table.cancelCellEdit();
      expect(table.endCellEdit).toHaveBeenCalledWith(field);
      jasmine.clock().tick(0);
      expect($findPopup().length).toBe(0);
    });

    it('does not save editor value', () => {
      table.columns[0].setEditable(true);
      table.prepareCellEdit(table.columns[0], table.rows[0]);
      jasmine.clock().tick(0);
      table.cellEditorPopup.cell.field.setValue('my new value');

      table.cancelCellEdit();
      expect(table.rows[0].cells[0].value).toBe('cell0_0');
    });
  });

  describe('endCellEdit', () => {
    let table;

    beforeEach(() => {
      let model = helper.createModelFixture(2, 2);
      table = helper.createTable(model);
      table.render();
      helper.applyDisplayStyle(table);
    });

    it('destroys the field', () => {
      table.prepareCellEdit(table.columns[0], table.rows[0]);
      jasmine.clock().tick(0);
      let popup = table.cellEditorPopup;
      let field = popup.cell.field;
      expect(field.destroyed).toBe(false);

      table.endCellEdit(field);
      expect(field.destroyed).toBe(true);
    });

    it('removes the cell editor popup', () => {
      table.prepareCellEdit(table.columns[0], table.rows[0]);
      jasmine.clock().tick(0);
      let popup = table.cellEditorPopup;
      let field = popup.cell.field;
      expect(field.destroyed).toBe(false);

      table.endCellEdit(field);
      jasmine.clock().tick(0);
      expect($findPopup().length).toBe(0);
      expect($findPopup().find('.form-field').length).toBe(0);
      expect(popup.rendered).toBe(false);
      expect(popup.cell.field.rendered).toBe(false);
    });
  });

  describe('validation', () => {
    let table, model, cell0_0, $tooltip;

    beforeEach(() => {
      model = helper.createModelFixture(2, 2);
      table = helper.createTable(model);
      cell0_0 = table.rows[0].cells[0];
    });

    it('shows a tooltip if field has an error', () => {
      cell0_0.editable = true;
      cell0_0.errorStatus = 'Validation error';
      $tooltip = $('.tooltip');

      expect($tooltip.length).toBe(0);
      table.render();
      $tooltip = $('.tooltip');
      expect($tooltip.length).toBe(1);
    });

    it('does not show a tooltip if field has no error', () => {
      cell0_0.editable = true;
      $tooltip = $('.tooltip');

      expect($tooltip.length).toBe(0);
      table.render();
      $tooltip = $('.tooltip');
      expect($tooltip.length).toBe(0);
    });
  });

  describe('popup recovery', () => {
    let model, table, row0, $cells0, $cell0_0;

    beforeEach(() => {
      model = helper.createModelFixture(2, 3);
      table = helper.createTable(model);
      row0 = table.rows[0];
    });

    it('reopens popup if row gets updated', () => {
      row0.cells[0].editable = true;
      table.render();
      $cells0 = table.$cellsForRow(row0.$row);
      $cell0_0 = $cells0.eq(0);
      table.prepareCellEdit(table.columns[0], row0);
      jasmine.clock().tick(0);
      expect(table.cellEditorPopup.row).toBe(row0);
      expect(table.cellEditorPopup.$anchor[0]).toBe($cell0_0[0]);

      let updatedRows = helper.createModelRows(2, 1);
      updatedRows[0].id = row0.id;
      table.updateRows(updatedRows);

      // Check if popup is correctly linked to updated row and new $cell
      row0 = table.rows[0];
      $cells0 = table.$cellsForRow(row0.$row);
      $cell0_0 = $cells0.eq(0);
      expect($findPopup().length).toBe(1);
      expect(table.cellEditorPopup.row).toBe(row0);
      expect(table.cellEditorPopup.$anchor[0]).toBe($cell0_0[0]);
    });

    it('closes popup if row gets deleted', () => {
      row0.cells[0].editable = true;
      table.render();
      table.prepareCellEdit(table.columns[0], row0);
      jasmine.clock().tick(0);
      spyOn(table, 'cancelCellEdit');

      table.deleteRows([row0]);

      // Check if popup is closed
      expect($findPopup().length).toBe(0);

      // Check whether cancel edit has been called
      expect(table.cancelCellEdit).toHaveBeenCalled();
    });

    it('closes popup if all rows get deleted', () => {
      row0.cells[0].editable = true;
      table.render();
      table.prepareCellEdit(table.columns[0], row0);
      jasmine.clock().tick(0);
      spyOn(table, 'cancelCellEdit');

      table.deleteAllRows();

      // Check if popup is closed
      expect($findPopup().length).toBe(0);

      // Check whether cancel edit has been called
      expect(table.cancelCellEdit).toHaveBeenCalled();
    });

    it('closes popup (before) table is removed', () => {
      row0.cells[0].editable = true;
      table.render();
      table.prepareCellEdit(table.columns[0], row0);
      jasmine.clock().tick(0);
      expect(table.cellEditorPopup).toBeTruthy();
      table.remove(); // called by parent.detach();
      jasmine.clock().tick(0);
      expect(table.cellEditorPopup).toBe(null);
    });

    it('closes popup when table is removed', () => {
      row0.cells[0].editable = true;
      table.render();
      table.prepareCellEdit(table.columns[0], row0);
      jasmine.clock().tick(0);
      expect(table.cellEditorPopup).toBeTruthy();
      table.remove();
      jasmine.clock().tick(0);
      expect(table.cellEditorPopup).toBe(null);
    });
  });

  describe('tooltip recovery', () => {
    let model, table, row0;

    beforeEach(() => {
      model = helper.createModelFixture(2, 3);
      table = helper.createTable(model);
      row0 = model.rows[0];
    });

    it('removes tooltip if row gets deleted', () => {
      row0.cells[0].editable = true;
      row0.cells[0].errorStatus = 'Validation error';

      table.render();
      expect($('.tooltip').length).toBe(1);
      expect(table.tooltips.length).toBe(1);

      table.deleteRows([row0]);

      expect($('.tooltip').length).toBe(0);
      expect(table.tooltips.length).toBe(0);
    });
  });
});
