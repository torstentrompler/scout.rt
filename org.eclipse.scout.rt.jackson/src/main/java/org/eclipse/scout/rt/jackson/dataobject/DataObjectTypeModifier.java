package org.eclipse.scout.rt.jackson.dataobject;

import java.lang.reflect.Type;

import org.eclipse.scout.rt.platform.ApplicationScoped;
import org.eclipse.scout.rt.platform.dataobject.DoValue;

import com.fasterxml.jackson.databind.JavaType;
import com.fasterxml.jackson.databind.type.ReferenceType;
import com.fasterxml.jackson.databind.type.TypeBindings;
import com.fasterxml.jackson.databind.type.TypeFactory;
import com.fasterxml.jackson.databind.type.TypeModifier;

/**
 * Type modifier used to add contained type information for {@link DoValue} reference type.
 */
@ApplicationScoped
public class DataObjectTypeModifier extends TypeModifier {

  @Override
  public JavaType modifyType(JavaType type, Type jdkType, TypeBindings bindings, TypeFactory typeFactory) {
    if (type.isReferenceType() || type.isContainerType()) {
      return type;
    }
    // Upgrade simple type DoValue to a reference type by adding contained type
    if (type.getRawClass() == DoValue.class) {
      return ReferenceType.upgradeFrom(type, type.containedTypeOrUnknown(0));
    }
    return type;
  }
}
