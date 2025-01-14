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
import {RemoteEvent, StringFieldAdapter} from '../../../src/index';
import {FormSpecHelper, TableSpecHelper} from '../../../src/testing/index';

describe('CellEditorAdapter', () => {
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

  function createStringField(table) {
    let model = formHelper.createFieldModel('StringField', session.desktop);
    let adapter = new StringFieldAdapter();
    adapter.init(model);
    return adapter.createWidget(model, session.desktop);
  }

  function $findPopup() {
    return $('.cell-editor-popup');
  }

  function findPopup() {
    return $findPopup().data('popup');
  }

  function createTableAndStartCellEdit() {
    let model = helper.createModelFixture(2, 2);
    model.rows[0].cells[0].editable = true;
    let adapter = helper.createTableAdapter(model);
    let table = adapter.createWidget(model, session.desktop);
    table.render();

    let field = createStringField(table);
    table.startCellEdit(table.columns[0], table.rows[0], field);
    return findPopup();
  }

  describe('endCellEdit event', () => {

    function createEndCellEditEvent(model, fieldId) {
      return {
        target: model.id,
        fieldId: fieldId,
        type: 'endCellEdit'
      };
    }

    it('destroys the field', () => {
      let popup = createTableAndStartCellEdit();
      let field = popup.cell.field;

      let message = {
        events: [createEndCellEditEvent(popup.table, field.id)]
      };
      session._processSuccessResponse(message);

      expect(field.destroyed).toBe(true);
      expect(session.getModelAdapter(field.id)).toBeFalsy();
    });

    it('removes the cell editor popup', () => {
      let popup = createTableAndStartCellEdit();
      let field = popup.cell.field;

      let message = {
        events: [createEndCellEditEvent(popup.table, field.id)]
      };
      session._processSuccessResponse(message);

      jasmine.clock().tick();
      expect($findPopup().length).toBe(0);
      expect($findPopup().find('.form-field').length).toBe(0);
      expect(popup.rendered).toBe(false);
      expect(popup.cell.field.rendered).toBe(false);
    });

  });

  describe('completeEdit', () => {

    it('sends completeCellEdit', done => {
      let popup = createTableAndStartCellEdit();
      popup.completeEdit()
        .then(() => {
          sendQueuedAjaxCalls();
          let event = new RemoteEvent(popup.table.id, 'completeCellEdit', {
            fieldId: popup.cell.field.id
          });
          expect(mostRecentJsonRequest()).toContainEvents(event);
          done();
        });
      jasmine.clock().tick(5);
    });

    it('sends completeCellEdit only once', done => {
      let popup = createTableAndStartCellEdit();
      let doneFunc = () => {
        sendQueuedAjaxCalls();

        expect(jasmine.Ajax.requests.count()).toBe(1);
        expect(mostRecentJsonRequest().events.length).toBe(1);
        let event = new RemoteEvent(popup.table.id, 'completeCellEdit', {
          fieldId: popup.cell.field.id
        });
        expect(mostRecentJsonRequest()).toContainEvents(event);
        done();
      };

      popup.completeEdit().then(doneFunc);
      popup.completeEdit();
      jasmine.clock().tick(5);
    });

    it('does not remove the popup and its field (will be done by endCellEdit)', () => {
      let popup = createTableAndStartCellEdit();
      popup.completeEdit();

      expect($findPopup().length).toBe(1);
      expect($findPopup().find('.form-field').length).toBe(1);
      expect(popup.rendered).toBe(true);
      expect(popup.cell.field.rendered).toBe(true);
    });

  });

  describe('cancelEdit', () => {

    it('sends cancelCellEdit', () => {
      let popup = createTableAndStartCellEdit();
      popup.cancelEdit();
      sendQueuedAjaxCalls();

      let event = new RemoteEvent(popup.table.id, 'cancelCellEdit', {
        fieldId: popup.cell.field.id
      });
      expect(mostRecentJsonRequest()).toContainEvents(event);
    });

    it('removes the popup and its field', () => {
      let popup = createTableAndStartCellEdit();
      popup.cancelEdit();

      expect($findPopup().length).toBe(0);
      expect($findPopup().find('.form-field').length).toBe(0);
      expect(popup.rendered).toBe(false);
      expect(popup.cell.field.rendered).toBe(false);
    });
  });
});
