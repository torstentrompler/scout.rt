/*
 * Copyright (c) 2010-2021 BSI Business Systems Integration AG.
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v1.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v10.html
 *
 * Contributors:
 *     BSI Business Systems Integration AG - initial API and implementation
 */
package org.eclipse.scout.rt.dataobject.migration;

import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;
import java.util.Map.Entry;
import java.util.Set;

import org.eclipse.scout.rt.dataobject.IDoEntity;
import org.eclipse.scout.rt.platform.BEANS;

/**
 * Abstract implementation of a {@link IDoStructureMigrationHandler} supporting simple definition of type name and
 * attribute name renamings.
 */
public abstract class AbstractDoStructureRenameMigrationHandler extends AbstractDoStructureMigrationHandler {

  private final Map<String, String> m_typeNameTranslations = new HashMap<>();
  private final Map<String, Map<String, String>> m_attributNameTranslations = new HashMap<>();

  protected AbstractDoStructureRenameMigrationHandler() {
    initTypeNameTranslations(m_typeNameTranslations);
    initAttributeNameTranslations(m_attributNameTranslations);
  }

  public Map<String, String> getTypeNameTranslations() {
    return m_typeNameTranslations;
  }

  public Map<String, Map<String, String>> getAttributNameTranslations() {
    return m_attributNameTranslations;
  }

  /**
   * Add type name translations.
   * <p>
   * Example renames the data object with type name "example.Lorem" to "example.Ipsum".
   *
   * <pre>
   * typeNameTranslations.put("example.Lorem", "example.Ipsum");
   * </pre>
   */
  protected void initTypeNameTranslations(Map<String, String> typeNameTranslations) {
  }

  /**
   * Add attribute name translations.
   * <p>
   * Example renames the attribute "ipsum" to "dolor" in the data object with type name "example.Lorem" (new type name
   * if renamed in {@link #initTypeNameTranslations(Map)}).
   *
   * <pre>
   * attributNameTranslations.put("example.Lorem", CollectionUtility.hashMap(new ImmutablePair<>("ipsum", "dolor")));
   * </pre>
   */
  protected void initAttributeNameTranslations(Map<String, Map<String, String>> attributNameTranslations) {
  }

  @Override
  public Set<String> getTypeNames() {
    Set<String> typeNames = new HashSet<>();
    typeNames.addAll(getTypeNameTranslations().keySet());
    typeNames.addAll(getAttributNameTranslations().keySet());
    return typeNames;
  }

  @Override
  public boolean migrate(DoStructureMigrationContext ctx, IDoEntity doEntity) {
    DoStructureMigrationHelper helper = BEANS.get(DoStructureMigrationHelper.class);
    boolean migrated = false;
    String typeName = helper.getType(doEntity);
    if (getTypeNameTranslations().containsKey(typeName)) {
      typeName = getTypeNameTranslations().get(typeName);
      helper.setType(doEntity, typeName);
      migrated = true;
    }

    if (getAttributNameTranslations().containsKey(typeName)) {
      Map<String, String> attributeTranslations = getAttributNameTranslations().get(typeName);
      for (Entry<String, String> entry : attributeTranslations.entrySet()) {
        String name = entry.getKey();
        String newName = entry.getValue();
        migrated |= helper.renameAttribute(doEntity, name, newName);
      }
    }

    return migrated;
  }
}
