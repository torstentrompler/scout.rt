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
describe('ProposalField2', function() {

  var session, field, lookupRow;

  beforeEach(function() {
    setFixtures(sandbox());
    session = sandboxSession();
    field = field = scout.create('ProposalField2', {
      parent: session.desktop,
      lookupCall: 'DummyLookupCall'
    });
    lookupRow = new scout.LookupRow(123, 'Foo');
    jasmine.clock().install();
  });

  afterEach(function() {
    jasmine.clock().uninstall();
    removePopups(session);
    removePopups(session, '.touch-popup');
  });

  describe('proposal field', function() {

    it('defaults', function() {
      expect(field.maxLength).toBe(4000);
      expect(field.trimText).toBe(true);
    });

    /**
     * Proposal field acts as regular string field when setValue is called
     * No matter if the typed text exists as record in the lookup call, we
     * simply set value/display text to it.
     */
    it('setValue', function() {
      field.setValue('Foo');
      expect(field.value).toBe('Foo');
      expect(field.displayText).toBe('Foo');

      field.setValue('Xyz');
      expect(field.value).toBe('Xyz');
      expect(field.displayText).toBe('Xyz');
      expect(field.errorStatus).toBe(null);
    });

    it('setLookupRow should set value too', function() {
      var lookupRow = {
        key: 123,
        text: 'Foo'
      };
      field.setLookupRow(lookupRow);
      expect(field.value).toBe('Foo');
      expect(field.lookupRow).toBe(lookupRow);

      field.setLookupRow(null);
      expect(field.value).toBe(null);
      expect(field.lookupRow).toBe(null);
    });

    /**
     * When the lookupOnAcceptByText flag is set, make sure that when clear()
     * _customTextAccepted is called and not _acceptByText. _customTextAccepted
     * will trigger the acceptInput event which is also sent to the Scout server.
     * # 221199
     */
    it('lookupOnAcceptByText', function() {
      field.render();
      field.lookupOnAcceptByText = true;
      field.setValue('Foo');

      var acceptInputCalled = false;
      field.on('acceptInput', function() {
        acceptInputCalled = true;
      });
      field.clear();

      expect(acceptInputCalled).toBe(true);
    });

    /**
     * When aboutToBlurByMouseDown is called, the value of the proposal field
     * should not be deleted, regardless of the value of
     * this.lookupOnAcceptByText.
     * # 2345061
     */
    it('when lookupOnAcceptByText=true the value is not deleted when aboutToBlurByMouseDown is called', function() {
      field.render();
      field.lookupOnAcceptByText = true;

      field.$field.focus();
      field.$field.val('Foo');
      field._userWasTyping = true;
      field.aboutToBlurByMouseDown();
      jasmine.clock().tick(300);
      expect(field.displayText).toBe('Foo');
      expect(field.$field.val()).toBe('Foo');
    });

    it('should set error status when result has an exception', function() {
      field._lookupByTextOrAllDone({
        lookupRows: [],
        exception: 'proposal lookup failed'
      });
      expect(field.errorStatus.severity).toBe(scout.Status.Severity.ERROR);
      expect(field.errorStatus.message).toBe('proposal lookup failed');
    });
  });

});