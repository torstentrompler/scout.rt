/*******************************************************************************
 * Copyright (C) 2005-2010 The Android Open Source Project
 * Copyright (c) 2015-2017 BSI Business Systems Integration AG
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * Contributors:
 *     The Android Open Source Project - initial implementation
 *     BSI Business Systems Integration AG - changes and improvements
 ******************************************************************************/
package org.json;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

// Note: this class was written without inspecting the non-free org.json sourcecode.

/*
 * Changes to the original code:
 * -----------------------------
 * - Applied Scout code formatting rules
 *
 * Copyright (c) 2015 BSI Business Systems Integration AG.
 */

/**
 * Implements {@link JSONObject#toString} and {@link JSONArray#toString}. Most application developers should use those
 * methods directly and disregard this API. For example:
 *
 * <pre>
 * JSONObject object = ...
 * String json = object.toString();
 * </pre>
 * <p>
 * Stringers only encode well-formed JSON strings. In particular:
 * <ul>
 * <li>The stringer must have exactly one top-level array or object.
 * <li>Lexical scopes must be balanced: every call to {@link #array} must have a matching call to {@link #endArray} and
 * every call to {@link #object} must have a matching call to {@link #endObject}.
 * <li>Arrays may not contain keys (property names).
 * <li>Objects must alternate keys (property names) and values.
 * <li>Values are inserted with either literal {@link #value(Object) value} calls, or by nesting arrays or objects.
 * </ul>
 * Calls that would result in a malformed JSON string will fail with a {@link JSONException}.
 * <p>
 * This class provides no facility for pretty-printing (ie. indenting) output. To encode indented output, use
 * {@link JSONObject#toString(int)} or {@link JSONArray#toString(int)}.
 * <p>
 * Some implementations of the API support at most 20 levels of nesting. Attempts to create more than 20 levels of
 * nesting may fail with a {@link JSONException}.
 * <p>
 * Each stringer may be used to encode a single top level value. Instances of this class are not thread safe. Although
 * this class is nonfinal, it was not designed for inheritance and should not be subclassed. In particular, self-use by
 * overrideable methods is not specified. See <i>Effective Java</i> Item 17, "Design and Document or inheritance or else
 * prohibit it" for further information.
 */
public class JSONStringer {

  /** The output data, containing at most one top-level array or object. */
  @SuppressWarnings("squid:S00116")
  final StringBuilder out = new StringBuilder();

  /**
   * Lexical scoping elements within this stringer, necessary to insert the appropriate separator characters (ie. commas
   * and colons) and to detect nesting errors.
   */
  enum Scope {

    /**
     * An array with no elements requires no separators or newlines before it is closed.
     */
    EMPTY_ARRAY,

    /**
     * A array with at least one value requires a comma and newline before the next element.
     */
    NONEMPTY_ARRAY,

    /**
     * An object with no keys or values requires no separators or newlines before it is closed.
     */
    EMPTY_OBJECT,

    /**
     * An object whose most recent element is a key. The next element must be a value.
     */
    DANGLING_KEY,

    /**
     * An object with at least one name/value pair requires a comma and newline before the next element.
     */
    NONEMPTY_OBJECT,

    /**
     * A special bracketless array needed by JSONStringer.join() and JSONObject.quote() only. Not used for JSON
     * encoding.
     */
    NULL,
  }

  /**
   * Unlike the original implementation, this stack isn't limited to 20 levels of nesting.
   */
  private final List<Scope> m_stack = new ArrayList<>();

  /**
   * A string containing a full set of spaces for a single level of indentation, or null for no pretty printing.
   */
  private final String m_indent;

  public JSONStringer() {
    m_indent = null;
  }

  JSONStringer(int indentSpaces) {
    char[] indentChars = new char[indentSpaces];
    Arrays.fill(indentChars, ' ');
    m_indent = new String(indentChars);
  }

  /**
   * Begins encoding a new array. Each call to this method must be paired with a call to {@link #endArray}.
   *
   * @return this stringer.
   */
  public JSONStringer array() {
    return open(Scope.EMPTY_ARRAY, "[");
  }

  /**
   * Ends encoding the current array.
   *
   * @return this stringer.
   */
  public JSONStringer endArray() {
    return close(Scope.EMPTY_ARRAY, Scope.NONEMPTY_ARRAY, "]");
  }

  /**
   * Begins encoding a new object. Each call to this method must be paired with a call to {@link #endObject}.
   *
   * @return this stringer.
   */
  public JSONStringer object() {
    return open(Scope.EMPTY_OBJECT, "{");
  }

  /**
   * Ends encoding the current object.
   *
   * @return this stringer.
   */
  public JSONStringer endObject() {
    return close(Scope.EMPTY_OBJECT, Scope.NONEMPTY_OBJECT, "}");
  }

  /**
   * Enters a new scope by appending any necessary whitespace and the given bracket.
   */
  JSONStringer open(Scope empty, String openBracket) {
    if (m_stack.isEmpty() && out.length() > 0) {
      throw new JSONException("Nesting problem: multiple top-level roots");
    }
    beforeValue();
    m_stack.add(empty);
    out.append(openBracket);
    return this;
  }

  /**
   * Closes the current scope by appending any necessary whitespace and the given bracket.
   */
  JSONStringer close(Scope empty, Scope nonempty, String closeBracket) {
    Scope context = peek();
    if (context != nonempty && context != empty) {
      throw new JSONException("Nesting problem");
    }

    m_stack.remove(m_stack.size() - 1);
    if (context == nonempty) {
      newline();
    }
    out.append(closeBracket);
    return this;
  }

  /**
   * Returns the value on the top of the stack.
   */
  private Scope peek() {
    if (m_stack.isEmpty()) {
      throw new JSONException("Nesting problem");
    }
    return m_stack.get(m_stack.size() - 1);
  }

  /**
   * Replace the value on the top of the stack with the given value.
   */
  private void replaceTop(Scope topOfStack) {
    m_stack.set(m_stack.size() - 1, topOfStack);
  }

  /**
   * Encodes {@code value}.
   *
   * @param value
   *          a {@link JSONObject}, {@link JSONArray}, String, Boolean, Integer, Long, Double or null. May not be
   *          {@link Double#isNaN() NaNs} or {@link Double#isInfinite() infinities}.
   * @return this stringer.
   */
  public JSONStringer value(Object value) {
    if (m_stack.isEmpty()) {
      throw new JSONException("Nesting problem");
    }

    if (value instanceof JSONArray) {
      ((JSONArray) value).writeTo(this);
      return this;

    }
    else if (value instanceof JSONObject) {
      ((JSONObject) value).writeTo(this);
      return this;
    }

    beforeValue();

    if (value == null
        || value instanceof Boolean
        || value == JSONObject.NULL) {
      out.append(value);

    }
    else if (value instanceof Number) {
      out.append(JSONObject.numberToString((Number) value));

    }
    else {
      string(value.toString());
    }

    return this;
  }

  /**
   * Encodes {@code value} to this stringer.
   *
   * @return this stringer.
   */
  public JSONStringer value(boolean value) {
    if (m_stack.isEmpty()) {
      throw new JSONException("Nesting problem");
    }
    beforeValue();
    out.append(value);
    return this;
  }

  /**
   * Encodes {@code value} to this stringer.
   *
   * @param value
   *          a finite value. May not be {@link Double#isNaN() NaNs} or {@link Double#isInfinite() infinities}.
   * @return this stringer.
   */
  public JSONStringer value(double value) {
    if (m_stack.isEmpty()) {
      throw new JSONException("Nesting problem");
    }
    beforeValue();
    out.append(JSONObject.numberToString(value));
    return this;
  }

  /**
   * Encodes {@code value} to this stringer.
   *
   * @return this stringer.
   */
  public JSONStringer value(long value) {
    if (m_stack.isEmpty()) {
      throw new JSONException("Nesting problem");
    }
    beforeValue();
    out.append(value);
    return this;
  }

  private void string(String value) {
    out.append("\"");
    for (int i = 0, length = value.length(); i < length; i++) {
      char c = value.charAt(i);

      /*
       * From RFC 4627, "All Unicode characters may be placed within the
       * quotation marks except for the characters that must be escaped:
       * quotation mark, reverse solidus, and the control characters
       * (U+0000 through U+001F)."
       */
      switch (c) {
        case '"':
        case '\\':
        case '/':
          out.append('\\').append(c);
          break;

        case '\t':
          out.append("\\t");
          break;

        case '\b':
          out.append("\\b");
          break;

        case '\n':
          out.append("\\n");
          break;

        case '\r':
          out.append("\\r");
          break;

        case '\f':
          out.append("\\f");
          break;

        default:
          if (c <= 0x1F) {
            out.append(String.format("\\u%04x", (int) c));
          }
          else {
            out.append(c);
          }
          break;
      }

    }
    out.append("\"");
  }

  private void newline() {
    if (m_indent == null) {
      return;
    }

    out.append("\n");
    for (int i = 0; i < m_stack.size(); i++) {
      out.append(m_indent);
    }
  }

  /**
   * Encodes the key (property name) to this stringer.
   *
   * @param name
   *          the name of the forthcoming value. May not be null.
   * @return this stringer.
   */
  public JSONStringer key(String name) {
    if (name == null) {
      throw new JSONException("Names must be non-null");
    }
    beforeKey();
    string(name);
    return this;
  }

  /**
   * Inserts any necessary separators and whitespace before a name. Also adjusts the stack to expect the key's value.
   */
  private void beforeKey() {
    Scope context = peek();
    if (context == Scope.NONEMPTY_OBJECT) { // first in object
      out.append(',');
    }
    else if (context != Scope.EMPTY_OBJECT) { // not in an object!
      throw new JSONException("Nesting problem");
    }
    newline();
    replaceTop(Scope.DANGLING_KEY);
  }

  /**
   * Inserts any necessary separators and whitespace before a literal value, inline array, or inline object. Also
   * adjusts the stack to expect either a closing bracket or another element.
   */
  private void beforeValue() {
    if (m_stack.isEmpty()) {
      return;
    }

    Scope context = peek();
    if (context == Scope.EMPTY_ARRAY) { // first in array
      replaceTop(Scope.NONEMPTY_ARRAY);
      newline();
    }
    else if (context == Scope.NONEMPTY_ARRAY) { // another in array
      out.append(',');
      newline();
    }
    else if (context == Scope.DANGLING_KEY) { // value for key
      out.append(m_indent == null ? ":" : ": ");
      replaceTop(Scope.NONEMPTY_OBJECT);
    }
    else if (context != Scope.NULL) {
      throw new JSONException("Nesting problem");
    }
  }

  /**
   * Returns the encoded JSON string.
   * <p>
   * If invoked with unterminated arrays or unclosed objects, this method's return value is undefined.
   * <p>
   * <strong>Warning:</strong> although it contradicts the general contract of {@link Object#toString}, this method
   * returns null if the stringer contains no data.
   */
  @Override
  public String toString() {
    return out.length() == 0 ? null : out.toString();
  }
}
