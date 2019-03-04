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
describe('SmartField2', function() {

  var session, field, lookupRow;

  beforeEach(function() {
    setFixtures(sandbox());
    session = sandboxSession();
    field = new scout.SmartField2();
    lookupRow = new scout.LookupRow(123, 'Foo');
    jasmine.clock().install();
  });

  afterEach(function() {
    jasmine.clock().uninstall();
    removePopups(session);
    removePopups(session, '.touch-popup');
  });

  function createFieldWithLookupCall(model, lookupCallModel) {
    lookupCallModel = $.extend({
      objectType: 'DummyLookupCall'
    }, lookupCallModel);

    model = $.extend({}, {
      parent: session.desktop,
      lookupCall: lookupCallModel
    }, model);
    return scout.create('SmartField2', model);
  }

  function findTableProposals() {
    var proposals = [];
    session.desktop.$container.find('.table-row').each(function() {
      proposals.push($(this).find('.table-cell').first().text());
    });
    return proposals;
  }

  describe('general behavior', function() {

    it('defaults', function() {
      expect(field.displayStyle).toBe('default');
      expect(field.value).toBe(null);
      expect(field.displayText).toBe(null);
      expect(field.lookupRow).toBe(null);
      expect(field.popup).toBe(null);
    });

    it('setLookupRow', function() {
      field.setLookupRow(lookupRow);
      expect(field.value).toBe(123);
      expect(field.lookupRow).toBe(lookupRow);
      expect(field.displayText).toBe('Foo');
    });

    it('init LookupCall when configured as string', function() {
      field = createFieldWithLookupCall();
      expect(field.lookupCall instanceof scout.DummyLookupCall).toBe(true);
    });

    it('when setValue is called, load and set the correct lookup row', function() {
      field = createFieldWithLookupCall();
      field.setValue(1);
      jasmine.clock().tick(300);
      expect(field.displayText).toBe('Foo');
      expect(field.value).toBe(1);
      expect(field.lookupRow.key).toBe(1);

      // set the value to null again
      field.setValue(null);
      expect(field.lookupRow).toBe(null);
      expect(field.value).toBe(null);
      expect(field.displayText).toBe('');

      field.setValue(2);
      jasmine.clock().tick(300);
      expect(field.displayText).toBe('Bar');
      expect(field.value).toBe(2);
      expect(field.lookupRow.key).toBe(2);
    });

    it('load proposals for the current displayText', function() {
      field = createFieldWithLookupCall();
      field.render();
      field.$field.focus(); // must be focused, otherwise popup will not open
      field.$field.val('b');
      field._onFieldKeyUp({});
      jasmine.clock().tick(300);
      expect(field.$container.hasClass('loading')).toBe(false); // loading indicator is not shown before 400 ms
      jasmine.clock().tick(300);
      // expect we have 2 table rows
      expect(field.popup).not.toBe(null);
      expect(findTableProposals()).toEqual(['Bar', 'Baz']);
    });

  });

  describe('clear', function() {

    it('clears the value', function() {
      var field = createFieldWithLookupCall();
      jasmine.clock().tick(500);
      field.render();
      field.$field.focus();
      field.setValue(1);
      jasmine.clock().tick(500);
      field.$field.triggerClick();
      jasmine.clock().tick(500);
      expect(field.value).toBe(1);
      expect(field.displayText).toBe('Foo');
      expect(field.$field.val()).toBe('Foo');
      expect(field.popup.proposalChooser.model.selectedRows.length).toBe(1);

      field.clear();
      jasmine.clock().tick(500);
      expect(field.value).toBe(null);
      expect(field.displayText).toBe('');
      expect(field.$field.val()).toBe('');
      expect(field.popup.proposalChooser.model.selectedRows.length).toBe(0);
    });

    it('clears the value, also in touch mode', function() {
      var field = createFieldWithLookupCall({
        touch: true
      });
      field.render();
      field.setValue(1);
      jasmine.clock().tick(500);
      field.$field.triggerClick();
      jasmine.clock().tick(500);
      expect(field.value).toBe(1);
      expect(field.displayText).toBe('Foo');
      expect(field.$field.text()).toBe('Foo');
      expect(field.popup._widget.model.selectedRows.length).toBe(1);

      field.popup._field.$field.focus();
      field.popup._field.clear();
      jasmine.clock().tick(500);
      expect(field.popup._field.value).toBe(null);
      expect(field.popup._field.displayText).toBe('');
      expect(field.popup._field.$field.val()).toBe('');
      expect(field.popup._widget.model.selectedRows.length).toBe(0);

      field.popup.close();
      expect(field.value).toBe(null);
      expect(field.displayText).toBe('');
      expect(field.$field.val()).toBe('');
    });

    it('does not close the popup but does a browse all', function() {
      // This is especially important for mobile, but makes sense for regular case too.
      var field = createFieldWithLookupCall();
      field.render();
      field.$field.focus(); // must be focused, otherwise popup will not open
      field.$field.val('b');
      field._onFieldKeyUp({});
      jasmine.clock().tick(500);
      expect(field.popup).not.toBe(null);
      expect(findTableProposals()).toEqual(['Bar', 'Baz']);

      field.clear();
      jasmine.clock().tick(500);
      expect(field.popup).not.toBe(null);
      expect(findTableProposals()).toEqual(['Foo', 'Bar', 'Baz']);
    });

  });

  describe('touch popup', function() {

    it('marks field as clearable even if the field is not focused', function() {
      var field = createFieldWithLookupCall({
        touch: true
      });
      field.render();
      field.$field.focus();
      field.setValue(1);
      jasmine.clock().tick(500);
      field.$field.triggerClick();
      jasmine.clock().tick(500);
      expect(field.popup).not.toBe(null);
      expect(field.popup._field.$field.val()).toBe('Foo');
      expect(field.popup._field.$container).toHaveClass('clearable');
      expect(field.popup._field.clearable).toBe(true);
    });

    it('stays open if active / inactive radio buttons are clicked', function() {
      var field = createFieldWithLookupCall({
        touch: true,
        activeFilterEnabled: true
      });
      field.render();
      jasmine.clock().tick(500);
      field.$field.triggerClick();
      jasmine.clock().tick(500);
      field.popup._widget.activeFilterGroup.radioButtons[1].select();
      jasmine.clock().tick(500);
      expect(field.popup).not.toBe(null);
    });

    it('stays open even if there are no results (with active filter)', function() {
      // Use case: Click on touch smart field, select inactive radio button, clear the text in the field -> smart field has to stay open
      var field = createFieldWithLookupCall({
        touch: true,
        activeFilterEnabled: true
      });
      field.render();
      jasmine.clock().tick(500);
      field.$field.triggerClick();
      jasmine.clock().tick(500);
      field.popup._widget.activeFilterGroup.radioButtons[1].select();
      // Simulate that lookup call does not return any data (happens if user clicks 'inactive' radio button and there are no inactive rows
      field.popup._field.lookupCall.data = [];
      field.popup._field.$field.focus();
      field.popup._field.$field.triggerKeyDown(scout.keys.BACKSPACE);
      field.popup._field._onFieldKeyUp({});
      jasmine.clock().tick(500);
      expect(field.popup).not.toBe(null);
    });

  });

  describe('acceptInput', function() {

    it('should not be triggered, when search text is (still) empty or equals to the text of the lookup row', function() {
      var field = createFieldWithLookupCall();
      var eventTriggered = false;
      field.render();
      field.on('acceptInput', function() {
        eventTriggered = true;
      });
      // empty case
      field.acceptInput();
      expect(eventTriggered).toBe(false);

      // text equals case
      field.setValue(1); // set lookup row [1, Foo]
      jasmine.clock().tick(500);
      expect(field.lookupRow.text).toBe('Foo');
      expect(field.$field.val()).toBe('Foo');
      expect(field.value).toBe(1);
      field.acceptInput();
      expect(eventTriggered).toBe(false);
    });

    // ticket #214831
    it('should not be triggered, when search text is (still) empty or equals to the text of the lookup row (lookupRow.text is null)', function() {
      var field = createFieldWithLookupCall({}, {showText: false});
      var eventTriggered = false;
      field.render();
      field.on('acceptInput', function() {
        eventTriggered = true;
      });
      // empty case
      field.acceptInput();
      expect(eventTriggered).toBe(false);

      // text equals case
      field.setValue(1); // set lookup row [1, null]
      jasmine.clock().tick(500);
      expect(field.lookupRow.text).toBe(null);
      expect(field.$field.val()).toBe('');
      expect(field.value).toBe(1);
      field.acceptInput();
      expect(eventTriggered).toBe(false);
    });

    // ticket #221944
    describe('should (not) reset selected lookup row', function() {
      var field, selectedLookupRow, searchTextChanged;

      // mocks for popup, lookup-row
      beforeEach(function() {
        field = createFieldWithLookupCall();
        selectedLookupRow = {};
        field.popup = {
          lookupResult: {
            seqNo: 7
          },
          getSelectedLookupRow: function() {
            return selectedLookupRow;
          }
        };
        field._userWasTyping = false;
        field.lookupSeqNo = 7;
        searchTextChanged = false;
      });

      it('use lookup row', function() {
        var lookupRow = field._getSelectedLookupRow(false);
        expect(lookupRow).toBe(selectedLookupRow);
      });

      it('reset when popup is closed', function() {
        field.popup = null;
        expect(field._getSelectedLookupRow(false)).toBe(null);
      });

      it('reset when user was typing or search-text has changed', function() {
        field._userWasTyping = true;
        expect(field._getSelectedLookupRow(true)).toBe(null);
      });

      it('reset when lookup result is out-dated', function() {
        field.lookupSeqNo = 8;
        expect(field._getSelectedLookupRow(false)).toBe(null);
      });

      // test for ticket #228288
      it('must add CSS class from selected lookup-row to field', function() {
        var field = createFieldWithLookupCall();
        expect(scout.strings.hasText(field.cssClass)).toBe(false);
        field.setValue(1);
        jasmine.clock().tick(500);
        expect(field.cssClass).toEqual('foo');
        field.setValue(null);
        jasmine.clock().tick(500);
        expect(scout.strings.hasText(field.cssClass)).toBe(false);
      });

    });

  });

  describe('lookup', function() {

    it('should increase lookupSeqNo when a lookup is executed', function() {
      var field = createFieldWithLookupCall();
      field.render();
      field.$field.focus();
      expect(field.lookupSeqNo).toBe(0);
      field._lookupByTextOrAll(false, 'Bar');
      jasmine.clock().tick(500);
      expect(field.lookupSeqNo).toBe(1);
      expect(field.popup.lookupResult.seqNo).toBe(1); // seqNo must be set on the lookupResult of the popup
    });

    it('should set error status when result has an exception', function() {
      var field = createFieldWithLookupCall();
      field._lookupByTextOrAllDone({
        lookupRows: [],
        exception: 'a total disaster'
      });
      expect(field.errorStatus.severity).toBe(scout.Status.Severity.ERROR);
      expect(field.errorStatus.message).toBe('a total disaster');
    });

    it('_executeLookup should always remove lookup-status (but not the error-status)', function() {
      var field = createFieldWithLookupCall();
      var lookupStatus = scout.Status.warn({message: 'bar'});
      var errorStatus = scout.Status.error({message: 'foo'});
      field.setLookupStatus(lookupStatus);
      field.setErrorStatus(errorStatus);
      var getByKeyFunc = field.lookupCall.getByKey.bind(field.lookupCall, 1);
      field._executeLookup(getByKeyFunc);
      jasmine.clock().tick(500);
      expect(field.errorStatus).toBe(errorStatus);
      expect(field.lookupStatus).toBe(null);
    });

    it('lookupByKey should set first lookup-row from result as this.lookupRow', function() {
      var field = createFieldWithLookupCall();
      var displayText = null;
      field._formatValue(3) // triggers lookup by key
        .then(function(displayText0) {
          displayText = displayText0;
        });
      jasmine.clock().tick(500);
      expect(displayText).toBe('Baz');
    });

  });

  describe('touch / embed', function() {

    it('must clone properties required for embedded field', function() {
      var field = createFieldWithLookupCall({
        touch: true,
        activeFilter: 'TRUE',
        activeFilterEnabled: true,
        activeFilterLabels: ['a', 'b', 'c'],
        browseLoadIncremental: true
      });
      var embedded = field.clone({
        parent: session.desktop
      });
      expect(embedded.activeFilter).toBe('TRUE');
      expect(embedded.activeFilterEnabled).toBe(true);
      expect(embedded.activeFilterLabels).toEqual(['a', 'b', 'c']);
      expect(embedded.browseLoadIncremental).toBe(true);
    });

    it('_copyValuesFromField', function() {
      var touchField = createFieldWithLookupCall();
      var embeddedField = touchField.clone({
        parent: session.desktop
      });
      embeddedField.setLookupRow(new scout.LookupRow(123, 'baz'));
      embeddedField.setErrorStatus(scout.Status.error({message: 'bar'}));
      embeddedField.setDisplayText('Foo');

      touchField._copyValuesFromField(embeddedField);

      expect(touchField.lookupRow.text).toBe('baz');
      expect(touchField.errorStatus.message).toBe('bar');
      expect(touchField.displayText).toBe('Foo');
    });

  });

  describe('aboutToBlurByMouseDown', function() { // see ticket #228888

    it('should not perform lookup for search by text', function() {
      var field = createFieldWithLookupCall();
      var eventTriggered = false;
      field.render();
      field.on('acceptInput', function() {
        eventTriggered = true;
      });
      field.$field.focus();

      field.setValue(1);
      jasmine.clock().tick(300);
      expect(field.displayText).toBe('Foo');

      field.$field.val('search!');
      field._userWasTyping = true;
      field.aboutToBlurByMouseDown();
      jasmine.clock().tick(300);

      // test if _acceptByText has been called with sync=true
      // this should reset the display text and trigger the acceptInput event
      expect(field.displayText).toBe('Foo');
      expect(field.$field.val()).toBe('Foo');
      expect(field._lastSearchText).toBe(null);
      expect(eventTriggered).toBe(true);
    });

  });

  describe('maxBrowseRowCount', function() {

    it('default - don\'t limit lookup rows', function() {
      var field = createFieldWithLookupCall();
      expect(field.browseMaxRowCount).toBe(100);
      field.render();
      field.$field.focus();
      var result = {
        lookupRows: [1, 2, 3, 4, 5]
      };
      field._lookupByTextOrAllDone(result);
      expect(result.lookupRows.length).toBe(5); // no limit required
      expect(field.popup.proposalChooser.status).toBe(null);
    });

    it('limit lookup rows', function() {
      var field = createFieldWithLookupCall({
        browseMaxRowCount: 3
      });
      field.render();
      field.$field.focus();
      var result = {
        lookupRows: [1, 2, 3, 4, 5]
      };
      field._lookupByTextOrAllDone(result);
      expect(result.lookupRows.length).toBe(3);
      expect(result.lookupRows[2]).toBe(3); // last element in array should be '3'
      expect(field.popup.proposalChooser.status.severity).toBe(scout.Status.Severity.INFO);
    });

  });

});