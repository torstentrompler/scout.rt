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
package org.eclipse.scout.rt.dataobject;

import static org.junit.Assert.*;

import org.eclipse.scout.rt.dataobject.fixture.DoubleContributionFixtureDo;
import org.eclipse.scout.rt.dataobject.fixture.EntityFixtureDo;
import org.eclipse.scout.rt.dataobject.fixture.FirstSimpleContributionFixtureDo;
import org.eclipse.scout.rt.dataobject.fixture.ProjectContributionFixtureDo;
import org.eclipse.scout.rt.dataobject.fixture.ProjectFixtureDo;
import org.eclipse.scout.rt.dataobject.fixture.ScoutContributionFixtureDo;
import org.eclipse.scout.rt.dataobject.fixture.ScoutFixtureDo;
import org.eclipse.scout.rt.dataobject.fixture.SecondSimpleContributionFixtureDo;
import org.eclipse.scout.rt.dataobject.fixture.SimpleFixtureDo;
import org.eclipse.scout.rt.platform.BEANS;
import org.eclipse.scout.rt.platform.util.Assertions.AssertionException;
import org.eclipse.scout.rt.testing.platform.runner.PlatformTestRunner;
import org.junit.Test;
import org.junit.runner.RunWith;

@RunWith(PlatformTestRunner.class)
public class DataObjectContributionTest {

  @Test
  public void testHasGetContribution() {
    SimpleFixtureDo doEntity = BEANS.get(SimpleFixtureDo.class);
    assertFalse(doEntity.has(DoEntity.CONTRIBUTIONS_ATTRIBUTE_NAME)); // node doesn't exist
    assertTrue(doEntity.getContributions().isEmpty());

    assertThrows(AssertionException.class, () -> doEntity.getContribution(null)); // contribution class is mandatory

    // has -> false, get -> null
    assertFalse(doEntity.hasContribution(FirstSimpleContributionFixtureDo.class));
    assertFalse(doEntity.hasContribution(SecondSimpleContributionFixtureDo.class));
    assertNull(doEntity.getContribution(FirstSimpleContributionFixtureDo.class));
    assertNull(doEntity.getContribution(SecondSimpleContributionFixtureDo.class));

    // add first contribution
    FirstSimpleContributionFixtureDo firstContribution = BEANS.get(FirstSimpleContributionFixtureDo.class);
    doEntity.putContribution(firstContribution);

    // check node availability and return values of has/get
    assertEquals(1, doEntity.getContributions().size());
    assertSame(firstContribution, doEntity.getContributions().iterator().next());
    assertTrue(doEntity.has(DoEntity.CONTRIBUTIONS_ATTRIBUTE_NAME));
    assertTrue(doEntity.hasContribution(FirstSimpleContributionFixtureDo.class));
    assertSame(firstContribution, doEntity.getContribution(FirstSimpleContributionFixtureDo.class));

    // second contribution still not available
    assertFalse(doEntity.hasContribution(SecondSimpleContributionFixtureDo.class));
    assertNull(doEntity.getContribution(SecondSimpleContributionFixtureDo.class));
  }

  @Test
  public void testContribution() {
    SimpleFixtureDo doEntity = BEANS.get(SimpleFixtureDo.class);
    assertNull(doEntity.getContribution(FirstSimpleContributionFixtureDo.class));
    FirstSimpleContributionFixtureDo firstContribution = doEntity.contribution(FirstSimpleContributionFixtureDo.class);
    assertNotNull(firstContribution);
    assertSame(firstContribution, doEntity.contribution(FirstSimpleContributionFixtureDo.class)); // same instance if contribution is already available (via previous getOrCreate call)
    assertSame(firstContribution, doEntity.getContribution(FirstSimpleContributionFixtureDo.class)); // same instance for get call

    SecondSimpleContributionFixtureDo secondContribution = BEANS.get(SecondSimpleContributionFixtureDo.class);
    doEntity.putContribution(secondContribution);
    assertSame(secondContribution, doEntity.contribution(SecondSimpleContributionFixtureDo.class)); // same instance if contribution is already available (via putContribution)
  }

  @Test
  public void testPutContribution() {
    SimpleFixtureDo doEntity = BEANS.get(SimpleFixtureDo.class);
    FirstSimpleContributionFixtureDo firstContribution1 = BEANS.get(FirstSimpleContributionFixtureDo.class);
    doEntity.putContribution(firstContribution1);
    assertEquals(1, doEntity.getContributions().size());
    FirstSimpleContributionFixtureDo firstContribution2 = BEANS.get(FirstSimpleContributionFixtureDo.class);
    doEntity.putContribution(firstContribution2);
    assertEquals(1, doEntity.getContributions().size()); // size is still 1, first contribution was overridden

    assertSame(firstContribution2, doEntity.getContribution(FirstSimpleContributionFixtureDo.class)); // same as 2. instance
  }

  @Test
  public void testRemoveContribution() {
    SimpleFixtureDo doEntity = BEANS.get(SimpleFixtureDo.class);
    assertFalse(doEntity.removeContribution(FirstSimpleContributionFixtureDo.class)); // no effect
    assertFalse(doEntity.removeContribution(SecondSimpleContributionFixtureDo.class)); // no effect
    assertFalse(doEntity.has(DoEntity.CONTRIBUTIONS_ATTRIBUTE_NAME)); // node doesn't exist

    doEntity.putContribution(BEANS.get(FirstSimpleContributionFixtureDo.class));
    assertTrue(doEntity.has(DoEntity.CONTRIBUTIONS_ATTRIBUTE_NAME));
    doEntity.putContribution(BEANS.get(SecondSimpleContributionFixtureDo.class));

    assertTrue(doEntity.removeContribution(FirstSimpleContributionFixtureDo.class));
    assertTrue(doEntity.has(DoEntity.CONTRIBUTIONS_ATTRIBUTE_NAME));

    assertTrue(doEntity.removeContribution(SecondSimpleContributionFixtureDo.class));
    assertFalse(doEntity.has(DoEntity.CONTRIBUTIONS_ATTRIBUTE_NAME)); // node is removed after last contribution is removed
  }

  @Test
  public void testValidation() {
    SimpleFixtureDo simpleFixture = BEANS.get(SimpleFixtureDo.class);
    assertThrows(AssertionException.class, () -> simpleFixture.validateContributionClass(null)); // missing contribution class
    simpleFixture.validateContributionClass(FirstSimpleContributionFixtureDo.class);
    simpleFixture.validateContributionClass(SecondSimpleContributionFixtureDo.class);
    assertThrows(AssertionException.class, () -> simpleFixture.validateContributionClass(ScoutContributionFixtureDo.class));
    assertThrows(AssertionException.class, () -> simpleFixture.validateContributionClass(ProjectContributionFixtureDo.class));

    // not using BEANS.get because bean is replaced by ProjectFixtureDo (only for validation, not a real case this way)
    ScoutFixtureDo scoutFixture = new ScoutFixtureDo();
    assertThrows(AssertionException.class, () -> scoutFixture.validateContributionClass(FirstSimpleContributionFixtureDo.class));
    assertThrows(AssertionException.class, () -> scoutFixture.validateContributionClass(SecondSimpleContributionFixtureDo.class));
    assertThrows(AssertionException.class, () -> scoutFixture.validateContributionClass(ProjectContributionFixtureDo.class));
    scoutFixture.validateContributionClass(ScoutContributionFixtureDo.class);

    // using subclasses data object
    ProjectFixtureDo projectFixture = BEANS.get(ProjectFixtureDo.class);
    assertThrows(AssertionException.class, () -> projectFixture.validateContributionClass(FirstSimpleContributionFixtureDo.class));
    assertThrows(AssertionException.class, () -> projectFixture.validateContributionClass(SecondSimpleContributionFixtureDo.class));
    projectFixture.validateContributionClass(ScoutContributionFixtureDo.class);
    projectFixture.validateContributionClass(ProjectContributionFixtureDo.class);

    // verify contribution DO with two containers
    projectFixture.validateContributionClass(DoubleContributionFixtureDo.class);
    simpleFixture.validateContributionClass(DoubleContributionFixtureDo.class);
    assertThrows(AssertionException.class, () -> BEANS.get(EntityFixtureDo.class).validateContributionClass(SecondSimpleContributionFixtureDo.class));

    // verify that all methods check validation
    assertThrows(AssertionException.class, () -> simpleFixture.getContribution(ScoutContributionFixtureDo.class));
    assertThrows(AssertionException.class, () -> simpleFixture.putContribution(BEANS.get(ScoutContributionFixtureDo.class)));
    assertThrows(AssertionException.class, () -> simpleFixture.contribution(ScoutContributionFixtureDo.class));
    assertThrows(AssertionException.class, () -> simpleFixture.hasContribution(ScoutContributionFixtureDo.class));
    assertThrows(AssertionException.class, () -> simpleFixture.removeContribution(ScoutContributionFixtureDo.class));
  }

  @Test
  public void testEquality() {
    // Add contributions in order first -> second
    SimpleFixtureDo doEntity1 = BEANS.get(SimpleFixtureDo.class);
    doEntity1.putContribution(BEANS.get(FirstSimpleContributionFixtureDo.class));
    doEntity1.putContribution(BEANS.get(SecondSimpleContributionFixtureDo.class));

    // Add contributions in order second -> first
    SimpleFixtureDo doEntity2 = BEANS.get(SimpleFixtureDo.class);
    doEntity2.putContribution(BEANS.get(SecondSimpleContributionFixtureDo.class));
    doEntity2.putContribution(BEANS.get(FirstSimpleContributionFixtureDo.class));

    // Order of contributions must not be relevant for comparison
    assertEquals(doEntity1, doEntity2);
  }

  @Test
  public void testSerialization() {
    IPrettyPrintDataObjectMapper mapper = BEANS.get(IPrettyPrintDataObjectMapper.class);

    SimpleFixtureDo doEntity = BEANS.get(SimpleFixtureDo.class)
        .withName1("name");

    FirstSimpleContributionFixtureDo firstContribution = BEANS.get(FirstSimpleContributionFixtureDo.class).withFirstValue("first-value");
    doEntity.putContribution(firstContribution);
    SecondSimpleContributionFixtureDo secondContribution = BEANS.get(SecondSimpleContributionFixtureDo.class).withSecondValue("second-value");
    doEntity.putContribution(secondContribution);

    String json = mapper.writeValue(doEntity);

    assertEquals("{\n"
        + "  \"_type\" : \"scout.SimpleFixture\",\n"
        + "  \"_contributions\" : [ {\n"
        + "    \"_type\" : \"scout.FirstSimpleContributionFixture\",\n"
        + "    \"firstValue\" : \"first-value\"\n"
        + "  }, {\n"
        + "    \"_type\" : \"scout.SecondSimpleContributionFixture\",\n"
        + "    \"secondValue\" : \"second-value\"\n"
        + "  } ],\n"
        + "  \"name1\" : \"name\"\n"
        + "}", json.replaceAll("\\r", ""));

    SimpleFixtureDo deserializedDoEntity = mapper.readValue(json, SimpleFixtureDo.class);
    assertEquals("name", deserializedDoEntity.getName1());
    assertEquals(2, deserializedDoEntity.getContributions().size());
    assertEquals(firstContribution, deserializedDoEntity.getContribution(FirstSimpleContributionFixtureDo.class));
    assertEquals(secondContribution, deserializedDoEntity.getContribution(SecondSimpleContributionFixtureDo.class));
    assertEquals(doEntity, deserializedDoEntity);
  }
}
