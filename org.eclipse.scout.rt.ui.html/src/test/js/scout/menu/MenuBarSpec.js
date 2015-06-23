/* global MenuSpecHelper */
describe("MenuBar", function() {
  var helper, session;

  beforeEach(function() {
    setFixtures(sandbox());
    session = sandboxSession();
    helper = new MenuSpecHelper(session);
  });

  describe('updateItems', function() {

    it('prefers EmptySpace for the left position if menu has multiple menuTypes', function() {
      var menu1 = helper.createMenu(helper.createModel('multi')),
        menu2 = helper.createMenu(helper.createModel('selection')),
        menuBar = new scout.MenuBar(session, new scout.MenuItemsOrder(session, 'Table')),
        menus = [menu2, menu1];

      menu1.menuTypes = ['Table.EmptySpace', 'Table.SingleSelection'];
      menu2.menuTypes = ['Table.SingleSelection'];

      menuBar.render(session.$entryPoint);
      menuBar.updateItems(menus);

      expect(menuBar.menuItems.length).toBe(3); // 2 + separator
      expect(menuBar.menuItems[0]).toBe(menu1);
    });

    it('must add/destroy dynamically created separators', function() {
      var separator,
        menu1 = helper.createMenu(helper.createModel('empty')),
        menu2 = helper.createMenu(helper.createModel('selection-1')),
        menu3 = helper.createMenu(helper.createModel('selection-2')),
        menuBar = new scout.MenuBar(session, new scout.MenuItemsOrder(session, 'Table')),
        menus = [menu1, menu2];

      menu1.menuTypes = ['Table.EmptySpace'];
      menu2.menuTypes = ['Table.SingleSelection'];

      menuBar.render(session.$entryPoint);
      menuBar.updateItems(menus);

      // a separator must be added between EmptySpace and Selection Menus
      expect(menuBar.menuItems.length).toBe(3);
      separator = menuBar.menuItems[1];
      expect(separator.separator).toBe(true);
      expect(separator.createdBy).toBe(menuBar.menuSorter);

      // when menu-bar is updated, the old separator must be destroyed
      // and a new separator with different ID should be created
      menus = [menu1, menu3];
      menuBar.updateItems(menus);
      expect(separator.destroyed).toBe(true);
      expect(separator.id).not.toBe(menuBar.menuItems[1].id);
    });

    it('renders defaultMenu', function() {
      var modelMenu1 = helper.createModel('foo');
      var modelMenu2 = helper.createModel('bar');
      modelMenu2.keyStroke = 'enter';

      var menu1 = helper.createMenu(modelMenu1),
        menu2 = helper.createMenu(modelMenu2),
        menuBar = new scout.MenuBar(session, new scout.MenuItemsOrder(session, 'Table')),
        menus = [menu1, menu2];

      menuBar.render(session.$entryPoint);
      menuBar.updateItems(menus);

      expect(menuBar.menuItems.length).toBe(2);
      expect(menuBar.menuItems[0]).toBe(menu1);
      expect(menuBar.menuItems[1]).toBe(menu2);

      expect(menu1.$container.hasClass('default-menu')).toBe(false);
      expect(menu2.$container.hasClass('default-menu')).toBe(true);
    });

  });

});
