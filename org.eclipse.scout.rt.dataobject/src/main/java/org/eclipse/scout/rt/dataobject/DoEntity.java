/*
 * Copyright (c) 2010-2018 BSI Business Systems Integration AG.
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v1.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v10.html
 *
 * Contributors:
 *     BSI Business Systems Integration AG - initial API and implementation
 */
package org.eclipse.scout.rt.dataobject;

import static org.eclipse.scout.rt.platform.util.Assertions.*;

import java.util.Collection;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Map.Entry;
import java.util.Set;
import java.util.function.Function;
import java.util.function.Predicate;
import java.util.function.Supplier;
import java.util.stream.Stream;

import org.eclipse.scout.rt.platform.BEANS;
import org.eclipse.scout.rt.platform.util.Assertions;
import org.eclipse.scout.rt.platform.util.StreamUtility;

/**
 * Base type for all data object beans. Attributes of a data object bean are defined using {@link #doValue(String)} and
 * {@link #doList(String)} methods.
 * <p>
 * Example entity with a value and a list attribute:
 *
 * <pre>
 * &#64;TypeName("ExampleEntity")
 * &#64;TypeVersion("scout-8.0.0")
 * public class ExampleEntityDo extends DoEntity {
 *
 *   public DoValue&lt;Date&gt; createdOn() {
 *     return doValue("createdOn");
 *   }
 *
 *   public DoList&lt;String&gt; nodes() {
 *     return doList("nodes");
 *   }
 * }
 * </pre>
 */
public class DoEntity implements IDoEntity {

  /**
   * Attribute uses a {@link DoCollection} internally because order of elements is not relevant for equality.
   */
  public static final String CONTRIBUTIONS_ATTRIBUTE_NAME = "_contributions";

  private final Map<String, DoNode<?>> m_attributes = new LinkedHashMap<>();

  /**
   * @return Node of attribute {@code attributeName} or {@code null}, if attribute is not available.
   *         <p>
   *         The attribute node is either a {@link DoValue}, a {@link DoList}, a {@link DoSet} or a {@link DoCollection}
   *         wrapper object.
   */
  @Override
  public DoNode<?> getNode(String attributeName) {
    return m_attributes.get(attributeName);
  }

  /**
   * @return {@code true} if attribute with name {@code attributeName} exists (attribute value could be null), otherwise
   *         {@code false}
   */
  @Override
  public boolean has(String attributeName) {
    return m_attributes.containsKey(attributeName);
  }

  /**
   * Adds new {@link DoValue}, {@link DoList}, {@link DoSet} or {@link DoCollection} node to attributes map.
   */
  @Override
  public void putNode(String attributeName, DoNode<?> attribute) {
    IDoEntity.super.putNode(attributeName, attribute);
    m_attributes.put(attributeName, attribute);
  }

  /**
   * Adds new value to attribute map. The value is wrapped within a {@link DoValue}.
   */
  @Override
  public void put(String attributeName, Object value) {
    doValue(attributeName).set(value);
  }

  /**
   * Adds new list value to attribute map. The value is wrapped within a {@link DoList}.
   */
  @Override
  public <V> void putList(String attributeName, List<V> value) {
    DoList<V> doList = doList(attributeName);
    doList.set(value);
  }

  /**
   * Adds new set value to attribute map. The value is wrapped within a {@link DoSet}.
   */
  @Override
  public <V> void putSet(String attributeName, Set<V> value) {
    DoSet<V> doSet = doSet(attributeName);
    doSet.set(value);
  }

  /**
   * Adds new collection value to attribute map. The value is wrapped within a {@link DoCollection}.
   */
  @Override
  public <V> void putCollection(String attributeName, Collection<V> value) {
    DoCollection<V> doCollection = doCollection(attributeName);
    doCollection.set(value);
  }

  /**
   * Removes {@link DoValue}, {@link DoList}, {@link DoSet} or {@link DoCollection} attribute from attributes map.
   */
  @Override
  public boolean remove(String attributeName) {
    return m_attributes.remove(attributeName) != null;
  }

  /**
   * Removes all {@link DoValue}, {@link DoList}, {@link DoSet} or {@link DoCollection} attribute from attributes map
   * that satisfy the given predicate. Errors or runtime exceptions thrown during iteration or by the predicate are
   * relayed to the caller.
   */
  @Override
  public boolean removeIf(Predicate<? super DoNode<?>> filter) {
    return m_attributes.values().removeIf(filter);
  }

  @Override
  public Map<String, DoNode<?>> allNodes() {
    return Collections.unmodifiableMap(m_attributes);
  }

  @Override
  public Map<String, ?> all() {
    return all(Function.identity());
  }

  /**
   * @return the map of all attribute values mapped using specified {@code mapper} function.
   */
  protected <T> Map<String, T> all(Function<Object, T> mapper) {
    return allNodes().entrySet().stream()
        .collect(StreamUtility.toLinkedHashMap(Entry::getKey, entry -> mapper.apply(entry.getValue().get())));
  }

  /**
   * Creates a new {@link DoValue} value attribute node wrapping a value of type {@code V}
   */
  protected <V> DoValue<V> doValue(String attributeName) {
    //noinspection unchecked
    return doNode(attributeName, DoValue.class, () -> new DoValue<V>(attributeName, attribute -> putNode(attributeName, attribute)));
  }

  /**
   * Creates a new {@link DoList} list value attribute node wrapping a list of type {@code List<V>}
   */
  protected <V> DoList<V> doList(String attributeName) {
    //noinspection unchecked
    return doNode(attributeName, DoList.class, () -> new DoList<V>(attributeName, attribute -> putNode(attributeName, attribute)));
  }

  /**
   * Creates a new {@link DoSet} set value attribute node wrapping a list of type {@code Set<V>}
   */
  protected <V> DoSet<V> doSet(String attributeName) {
    //noinspection unchecked
    return doNode(attributeName, DoSet.class, () -> new DoSet<V>(attributeName, attribute -> putNode(attributeName, attribute)));
  }

  /**
   * Creates a new {@link DoCollection} collection value attribute node wrapping a list of type {@code Collection<V>}
   */
  protected <V> DoCollection<V> doCollection(String attributeName) {
    //noinspection unchecked
    return doNode(attributeName, DoCollection.class, () -> new DoCollection<V>(attributeName, attribute -> putNode(attributeName, attribute)));
  }

  protected <NODE> NODE doNode(String attributeName, Class<NODE> clazz, Supplier<NODE> nodeSupplier) {
    assertNotNull(attributeName, "attribute name cannot be null");
    DoNode<?> node = getNode(attributeName);
    if (node != null) {
      Assertions.assertInstance(node, clazz, "Existing node {} is not of type {}, cannot change the node type!", node, clazz);
      //noinspection unchecked
      return (NODE) node;
    }
    return nodeSupplier.get();
  }

  @Override
  public Collection<IDoEntityContribution> getContributions() {
    if (!has(CONTRIBUTIONS_ATTRIBUTE_NAME)) {
      return Collections.emptyList();
    }

    return Collections.unmodifiableCollection(getContributionsInternal());
  }

  @Override
  public <CONTRIBUTION extends IDoEntityContribution> CONTRIBUTION getContribution(Class<CONTRIBUTION> contributionClass) {
    validateContributionClass(contributionClass);
    if (!has(CONTRIBUTIONS_ATTRIBUTE_NAME)) {
      return null;
    }

    return getContributionsInternal().stream()
        .filter(contribution -> contributionClass.equals(contribution.getClass()))
        .findFirst()
        .map(contributionClass::cast)
        .orElse(null);
  }

  @Override
  public <CONTRIBUTION extends IDoEntityContribution> void putContribution(CONTRIBUTION contribution) {
    assertNotNull(contribution, "contribution is required");
    validateContributionClass(contribution.getClass());

    removeContribution(contribution.getClass());
    ensureContributionsNode();
    getContributionsInternal().add(contribution);
  }

  @Override
  public <CONTRIBUTION extends IDoEntityContribution> CONTRIBUTION contribution(Class<CONTRIBUTION> contributionClass) {
    validateContributionClass(contributionClass);

    if (!hasContribution(contributionClass)) {
      CONTRIBUTION contribution = BEANS.get(contributionClass);
      putContribution(contribution);
      return contribution;
    }

    return getContribution(contributionClass);
  }

  @Override
  public boolean hasContribution(Class<? extends IDoEntityContribution> contributionClass) {
    validateContributionClass(contributionClass);
    return getContribution(contributionClass) != null;
  }

  @Override
  public boolean removeContribution(Class<? extends IDoEntityContribution> contributionClass) {
    validateContributionClass(contributionClass);
    if (!has(CONTRIBUTIONS_ATTRIBUTE_NAME)) {
      return false;
    }

    Collection<IDoEntityContribution> list = getContributionsInternal();
    boolean removed = list.removeIf(contribution -> contributionClass.equals(contribution.getClass()));
    if (list.isEmpty()) {
      remove(CONTRIBUTIONS_ATTRIBUTE_NAME);
    }
    return removed;
  }

  protected void validateContributionClass(Class<? extends IDoEntityContribution> contributionClass) {
    assertNotNull(contributionClass, "contributionClass is required");
    ContributesTo contributesToAnn = contributionClass.getAnnotation(ContributesTo.class);
    assertTrue(contributesToAnn != null && contributesToAnn.value() != null, "Contribution class {} is missing a valid {} annotation", contributionClass, ContributesTo.class.getSimpleName());
    Class<? extends IDoEntity>[] containers = contributesToAnn.value();
    assertTrue(Stream.of(containers).anyMatch(containerClass -> containerClass.isInstance(this)), "{} is not a valid container class of {}", this.getClass().getSimpleName(), contributionClass.getSimpleName());
  }

  /**
   * Ensures that the contributions node ({@link #CONTRIBUTIONS_ATTRIBUTE_NAME}) exists (i.e. creates it if it doesn't
   * exist yet).
   */
  protected void ensureContributionsNode() {
    if (!has(CONTRIBUTIONS_ATTRIBUTE_NAME)) {
      putNode(CONTRIBUTIONS_ATTRIBUTE_NAME, new DoCollection<IDoEntityContribution>());
    }
  }

  /**
   * Only call this method if the attribute node is available (e.g. call {@link #ensureContributionsNode()} before if
   * desired or check for node existance manually).
   *
   * @return A mutable collection of DO entity contribution of corresponding {@link DoCollection} node.
   */
  protected Collection<IDoEntityContribution> getContributionsInternal() {
    assertTrue(has(CONTRIBUTIONS_ATTRIBUTE_NAME), "Attribute node for DO entity contributions is missing");
    //noinspection unchecked
    return ((DoCollection<IDoEntityContribution>) Assertions.assertType(getNode(CONTRIBUTIONS_ATTRIBUTE_NAME), DoCollection.class)).get();
  }

  @Override
  public int hashCode() {
    final int prime = 31;
    int result = 1;
    result = prime * result + m_attributes.hashCode();
    return result;
  }

  @Override
  public boolean equals(Object obj) {
    if (this == obj) {
      return true;
    }
    if (obj == null) {
      return false;
    }
    if (getClass() != obj.getClass()) {
      return false;
    }
    DoEntity other = (DoEntity) obj;
    return m_attributes.equals(other.m_attributes);
  }

  @Override
  public String toString() {
    return getClass().getSimpleName() + " " + BEANS.get(DataObjectHelper.class).toString(this);
  }
}
