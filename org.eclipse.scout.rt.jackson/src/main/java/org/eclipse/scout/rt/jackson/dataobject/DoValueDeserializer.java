package org.eclipse.scout.rt.jackson.dataobject;

import org.eclipse.scout.rt.platform.dataobject.DoValue;

import com.fasterxml.jackson.databind.DeserializationContext;
import com.fasterxml.jackson.databind.JavaType;
import com.fasterxml.jackson.databind.JsonDeserializer;
import com.fasterxml.jackson.databind.deser.ValueInstantiator;
import com.fasterxml.jackson.databind.deser.std.ReferenceTypeDeserializer;
import com.fasterxml.jackson.databind.jsontype.TypeDeserializer;

/**
 * Deserializer for {@link DoValue} objects unwrapping the contained value object.
 */
public class DoValueDeserializer extends ReferenceTypeDeserializer<DoValue<?>> {
  private static final long serialVersionUID = 1L;

  public DoValueDeserializer(JavaType fullType, ValueInstantiator inst, TypeDeserializer typeDeser, JsonDeserializer<?> deser) {
    super(fullType, inst, typeDeser, deser);
  }

  @Override
  public DoValueDeserializer withResolved(TypeDeserializer typeDeser, JsonDeserializer<?> valueDeser) {
    return new DoValueDeserializer(_fullType, _valueInstantiator,
        typeDeser, valueDeser);
  }

  @Override
  public DoValue<?> getNullValue(DeserializationContext ctxt) {
    return new DoValue<>();
  }

  @Override
  public DoValue<?> referenceValue(Object contents) {
    DoValue<Object> value = new DoValue<>();
    value.set(contents);
    return value;
  }

  @Override
  public Object getReferenced(DoValue<?> reference) {
    return reference.get();
  }

  @Override
  public DoValue<?> updateReference(DoValue<?> reference, Object contents) {
    return referenceValue(contents);
  }
}
