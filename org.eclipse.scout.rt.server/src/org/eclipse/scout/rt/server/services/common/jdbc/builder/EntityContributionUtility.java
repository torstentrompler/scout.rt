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
package org.eclipse.scout.rt.server.services.common.jdbc.builder;

import java.util.TreeSet;
import java.util.regex.Pattern;

import org.eclipse.core.runtime.IStatus;
import org.eclipse.scout.commons.ListUtility;
import org.eclipse.scout.commons.StringUtility;
import org.eclipse.scout.commons.StringUtility.ITagProcessor;
import org.eclipse.scout.commons.exception.ProcessingException;
import org.eclipse.scout.commons.logger.IScoutLogger;
import org.eclipse.scout.commons.logger.ScoutLogManager;
import org.eclipse.scout.rt.server.services.common.jdbc.builder.FormDataStatementBuilder.EntityStrategy;

/**
 * Utility for building statements with {@link EntityContribution}
 */
public final class EntityContributionUtility {
  private static final IScoutLogger LOG = ScoutLogManager.getLogger(EntityContributionUtility.class);

  public static EntityContribution constraintTextToContribution(String wherePart) {
    EntityContribution contrib = new EntityContribution();
    if (wherePart != null) {
      contrib.getWhereParts().add(wherePart);
    }
    return contrib;
  }

  /**
   * Creates a where constraints based on the {@link EntityContribution}. This means that from parts etc. are wrapped
   * inside an EXISTS (SELECT 1 FROM ... WHERE ... ) clause.
   * 
   * @returns a where constraint or null if the {@link EntityContribution} is empty.
   *          <p>
   *          The constraint does not start with "AND" and can be added with {@link #addWhere(String, NVPair...)} by
   *          prepending "AND"
   */
  public static String contributionToConstraintText(EntityContribution contrib) {
    // if there are no where parts, do nothing
    if (contrib == null) {
      return null;
    }
    if (contrib.getWhereParts().isEmpty()) {
      return null;
    }
    String wherePart = ListUtility.format(contrib.getWhereParts(), " AND ");
    if (contrib.getFromParts().isEmpty()) {
      // no from parts, just use the where parts
      return wherePart;
    }
    // there are from parts
    // create an EXISTS (SELECT 1 FROM ... WHERE ...)
    String fromPart = ListUtility.format(contrib.getFromParts(), ", ");
    return " EXISTS (SELECT 1 FROM " + fromPart + " WHERE " + wherePart + ")";
  }

  /**
   * Evaluates the collecting tags in the entity statement and fills in the values of the {@link EntityContribution}.
   * If the contributing tags are missing, the complete part is treated as 'select' on {@link EntityStrategy#BuildQuery}
   * and as 'where' on {@link EntityStrategy#BuildConstraints}
   * <p>
   * Before the call is processed, all {@link IFormDataStatementBuilderInjection}s are invoked.
   * 
   * @param entityStrategy
   * @param entityPartWithTags
   *          may contain the collecting tags selectParts, fromParts, whereParts, groupBy, groupByParts, havingParts<br/>
   *          as well as the contributing selectPart, fromPart, wherePart, groupByPart, havingPart for the outer calling
   *          part.
   * @param childContributions
   *          is the set of tags collected by all children
   * @param consumeChildContributions
   *          true: consume the child tags inside the entity statement. The returned entity contributions will not
   *          contain any of these tags
   *          <p>
   *          false: don't consume the child tags inside the entity statement. The returned entity contribution contains
   *          its onw plus all of these child tags (proxy)
   */
  public static EntityContribution mergeContributions(EntityStrategy entityStrategy, final String entityPartWithTags, EntityContribution childContributions, boolean consumeChildContributions) throws ProcessingException {
    String entityPart = entityPartWithTags;
    EntityContribution parentContrib = new EntityContribution();
    //PROCESS collectiong tags: selectParts, fromParts, whereParts, groupBy, groupByParts, havingParts
    if (!consumeChildContributions) {
      //just proxy through to parent
      parentContrib.add(childContributions);
    }
    else {
      // extend the select section
      if (childContributions.getSelectParts().size() > 0) {
        StringBuilder selectBuf = new StringBuilder();
        for (String selectPart : childContributions.getSelectParts()) {
          if (selectBuf.length() > 0) {
            selectBuf.append(", ");
          }
          selectBuf.append(autoBracketSelectPart(selectPart));
        }
        final String s = selectBuf.toString();
        if (StringUtility.getTag(entityPart, "selectParts") != null) {
          entityPart = StringUtility.replaceTags(entityPart, "selectParts", new ITagProcessor() {
            @Override
            public String processTag(String tagName, String tagContent) {
              if (tagContent.length() > 0) {
                return tagContent + ", " + s;
              }
              return s;
            }
          });
        }
        else {
          throw new IllegalArgumentException("missing <selectParts/> tag");
        }
      }
      entityPart = StringUtility.removeTagBounds(entityPart, "selectParts");
      // extend the from section
      TreeSet<String> fromParts = new TreeSet<String>(childContributions.getFromParts());
      if (fromParts.size() > 0) {
        StringBuilder buf = new StringBuilder();
        for (String fromPart : fromParts) {
          if (!isAnsiJoin(fromPart)) {
            buf.append(",");
          }
          buf.append(" ");
          buf.append(fromPart);
        }
        final String s = buf.toString();
        if (StringUtility.getTag(entityPart, "fromParts") != null) {
          entityPart = StringUtility.replaceTags(entityPart, "fromParts", new ITagProcessor() {
            @Override
            public String processTag(String tagName, String tagContent) {
              return tagContent + s;
            }
          });
        }
        else {
          throw new IllegalArgumentException("missing <fromParts/> tag");
        }
      }
      entityPart = StringUtility.removeTagBounds(entityPart, "fromParts");
      // extend the where section
      if (childContributions.getWhereParts().size() > 0) {
        final String s = ListUtility.format(childContributions.getWhereParts(), " AND ");
        if (StringUtility.getTag(entityPart, "whereParts") != null) {
          entityPart = StringUtility.replaceTags(entityPart, "whereParts", new ITagProcessor() {
            @Override
            public String processTag(String tagName, String tagContent) {
              return tagContent + " AND " + s;//legacy: always prefix an additional AND
            }
          });
        }
        else {
          entityPart = entityPart + " AND " + s;
        }
      }
      entityPart = StringUtility.removeTagBounds(entityPart, "whereParts");
      // extend the group by / having section
      if (StringUtility.getTag(entityPart, "groupBy") != null) {
        int selectGroupByDelta = childContributions.getSelectParts().size() - childContributions.getGroupByParts().size();
        if ((selectGroupByDelta > 0 && childContributions.getGroupByParts().size() > 0) || childContributions.getHavingParts().size() > 0) {
          entityPart = StringUtility.removeTagBounds(entityPart, "groupBy");
          if (childContributions.getGroupByParts().size() > 0) {
            //check group by parts
            for (String s : childContributions.getGroupByParts()) {
              checkGroupByPart(s);
            }
            final String s = ListUtility.format(childContributions.getGroupByParts(), ", ");
            if (StringUtility.getTag(entityPart, "groupByParts") != null) {
              entityPart = StringUtility.replaceTags(entityPart, "groupByParts", new ITagProcessor() {
                @Override
                public String processTag(String tagName, String tagContent) {
                  if (tagContent.length() > 0) {
                    return tagContent + ", " + s;
                  }
                  return s;
                }
              });
            }
            else {
              throw new IllegalArgumentException("missing <groupByParts/> tag");
            }
          }
          else {
            //no group by parts, avoid empty GROUP BY clause
            entityPart = StringUtility.replaceTags(entityPart, "groupByParts", new ITagProcessor() {
              @Override
              public String processTag(String tagName, String tagContent) {
                if (tagContent.length() > 0) {
                  return tagContent;
                }
                return tagContent + " 1 ";
              }
            });
          }
          entityPart = StringUtility.removeTagBounds(entityPart, "groupByParts");
          //
          if (childContributions.getHavingParts().size() > 0) {
            final String s = ListUtility.format(childContributions.getHavingParts(), " AND ");
            if (StringUtility.getTag(entityPart, "havingParts") != null) {
              entityPart = StringUtility.replaceTags(entityPart, "havingParts", new ITagProcessor() {
                @Override
                public String processTag(String tagName, String tagContent) {
                  return tagContent + " AND " + s;//legacy: always prefix an additional AND
                }
              });
            }
            else {
              throw new IllegalArgumentException("missing <havingParts/> tag");
            }
          }
          else {
            entityPart = StringUtility.removeTagBounds(entityPart, "havingParts");
          }
        }
        else {
          entityPart = StringUtility.removeTag(entityPart, "groupBy");
        }
      }
    }
    //PROCESS contributing tags: selectPart, fromPart, wherePart, groupByPart, havingPart
    String selectPart = StringUtility.getTag(entityPart, "selectPart");
    if (selectPart != null) {
      parentContrib.getSelectParts().add(selectPart);
      entityPart = StringUtility.removeTag(entityPart, "selectPart").trim();
    }
    //
    String fromPart = StringUtility.getTag(entityPart, "fromPart");
    if (fromPart != null) {
      parentContrib.getFromParts().add(fromPart);
      entityPart = StringUtility.removeTag(entityPart, "fromPart").trim();
    }
    //
    String wherePart = StringUtility.getTag(entityPart, "wherePart");
    if (wherePart != null) {
      parentContrib.getWhereParts().add(wherePart);
      entityPart = StringUtility.removeTag(entityPart, "wherePart").trim();
    }
    //
    String groupByPart = StringUtility.getTag(entityPart, "groupByPart");
    if (groupByPart != null) {
      parentContrib.getGroupByParts().add(groupByPart);
      entityPart = StringUtility.removeTag(entityPart, "groupByPart").trim();
    }
    //
    String havingPart = StringUtility.getTag(entityPart, "havingPart");
    if (havingPart != null) {
      parentContrib.getHavingParts().add(havingPart);
      entityPart = StringUtility.removeTag(entityPart, "havingPart").trim();
    }
    if (parentContrib.isEmpty()) {
      switch (entityStrategy) {
        case BuildConstraints: {
          parentContrib.getWhereParts().add(entityPart);
          break;
        }
        case BuildQuery: {
          parentContrib.getSelectParts().add(entityPart);
          parentContrib.getGroupByParts().add("1");
          break;
        }
      }
    }
    else {
      //check for remaining dirt
      if (entityPart.length() > 0) {
        LOG.warn("entityPart " + entityPartWithTags + " contains content that is not wrapped in a tag: " + entityPart);
      }
    }
    return parentContrib;
  }

  private static final Pattern ANSI_JOIN_PATTERN = Pattern.compile("\\s*(LEFT\\s+|RIGHT\\s+)?(OUTER\\s+|INNER\\s+)?JOIN\\s+.*", Pattern.CASE_INSENSITIVE | Pattern.DOTALL);

  public static boolean isAnsiJoin(String fromPart) {
    if (fromPart == null) {
      return false;
    }
    return ANSI_JOIN_PATTERN.matcher(fromPart).matches();
  }

  private static final Pattern CHECK_GROUP_BY_CONTAINS_SELECT_PATTERN = Pattern.compile("[^a-z0-9\"'.%$_]SELECT[^a-z0-9\"'.%$_]", Pattern.CASE_INSENSITIVE | Pattern.DOTALL);

  public static final int STATUS_CODE_INVALID_GROUP_BY_PART = 0x70000001;

  /**
   * Check if a group by part is valid, i.e. ist not a SELECT clause.
   * 
   * @throws ProcessingException
   *           with {@link IStatus#getCode()} = X
   * @since 3.8
   */
  public static void checkGroupByPart(String groupByPart) throws ProcessingException {
    if (groupByPart == null) {
      return;
    }
    if (CHECK_GROUP_BY_CONTAINS_SELECT_PATTERN.matcher(groupByPart).find()) {
      throw new ProcessingException("Invalid group by clause", null, STATUS_CODE_INVALID_GROUP_BY_PART);
    }
  }

  private static String autoBracketSelectPart(String s) {
    if (s != null && !s.startsWith("(") && s.toLowerCase().contains("select")) {
      return "(" + s + ")";
    }
    return s;
  }

}
