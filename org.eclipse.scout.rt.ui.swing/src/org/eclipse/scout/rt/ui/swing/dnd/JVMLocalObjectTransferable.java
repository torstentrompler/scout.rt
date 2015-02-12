/*******************************************************************************
 * Copyright (c) 2010 BSI Business Systems Integration AG.
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v1.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v10.html
 *
 * Contributors:
 *     BSI Business Systems Integration AG - initial API and implementation
 ******************************************************************************/
package org.eclipse.scout.rt.ui.swing.dnd;

import java.awt.datatransfer.DataFlavor;
import java.awt.datatransfer.Transferable;
import java.awt.datatransfer.UnsupportedFlavorException;
import java.io.IOException;

public class JVMLocalObjectTransferable implements Transferable {

  private static final DataFlavor[] FLAVORS = {new DataFlavor(DataFlavor.javaJVMLocalObjectMimeType, null)};
  private Object m_data;

  public JVMLocalObjectTransferable(Object data) {
    m_data = data;
  }

  @Override
  public DataFlavor[] getTransferDataFlavors() {
    return FLAVORS.clone();
  }

  @Override
  public boolean isDataFlavorSupported(DataFlavor flavor) {
    for (int i = 0; i < FLAVORS.length; i++) {
      if (flavor.equals(FLAVORS[i])) {
        return true;
      }
    }
    return false;
  }

  @Override
  public Object getTransferData(DataFlavor flavor) throws UnsupportedFlavorException, IOException {
    if (flavor.equals(FLAVORS[0])) {
      return m_data;
    }
    else {
      throw new UnsupportedFlavorException(flavor);
    }
  }
}
