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
package org.eclipse.scout.rt.ui.html.json.form.fields.smartfield;

import org.eclipse.scout.rt.client.ui.form.fields.smartfield.IContentAssistField;
import org.eclipse.scout.rt.client.ui.form.fields.smartfield.IProposalField;
import org.eclipse.scout.rt.ui.html.IUiSession;
import org.eclipse.scout.rt.ui.html.json.IJsonAdapter;
import org.eclipse.scout.rt.ui.html.json.JsonEvent;
import org.eclipse.scout.rt.ui.html.json.form.fields.JsonAdapterProperty;
import org.eclipse.scout.rt.ui.html.json.form.fields.JsonValueField;
import org.json.JSONObject;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class JsonSmartField<VALUE, LOOKUP_KEY, CONTENT_ASSIST_FIELD extends IContentAssistField<VALUE, LOOKUP_KEY>> extends JsonValueField<CONTENT_ASSIST_FIELD> {

  private static final Logger LOG = LoggerFactory.getLogger(JsonSmartField.class);
  private static final String PROP_PROPOSAL = "proposal";

  private boolean m_proposal;

  public JsonSmartField(CONTENT_ASSIST_FIELD model, IUiSession uiSession, String id, IJsonAdapter<?> parent) {
    super(model, uiSession, id, parent);
    m_proposal = model instanceof IProposalField;
  }

  @Override
  protected void initJsonProperties(CONTENT_ASSIST_FIELD model) {
    super.initJsonProperties(model);
    putJsonProperty(new JsonAdapterProperty<IContentAssistField<VALUE, LOOKUP_KEY>>(IContentAssistField.PROP_PROPOSAL_CHOOSER, model, getUiSession()) {
      @Override
      protected Object modelValue() {
        return getModel().getProposalChooser();
      }
    });
  }

  @Override
  public String getObjectType() {
    if (getModel().isMultilineText()) {
      return "SmartFieldMultiline";
    }
    else {
      return "SmartField";
    }
  }

  @Override
  public void handleUiEvent(JsonEvent event) {
    // NOTE: it's important we always set the submitted 'displayText' as display text
    // on the model field instance. Otherwise the java client will be out of sync
    // with the browser, which will cause a variety of bugs in the UI. This happens
    // in the UI facade impl.
    if ("openProposal".equals(event.getType())) {
      handleUiOpenProposal(event);
    }
    else if ("proposalTyped".equals(event.getType())) {
      handleUiProposalTyped(event);
    }
    else if ("cancelProposal".equals(event.getType())) {
      handleUiCancelProposal();
    }
    else if ("acceptProposal".equals(event.getType())) {
      handleUiAcceptProposal(event);
    }
    else if ("deleteProposal".equals(event.getType())) {
      handleUiDeleteProposal(event);
    }
    else {
      super.handleUiEvent(event);
    }
  }

  protected void handleUiProposalTyped(JsonEvent event) {
    String text = getDisplayText(event);
    getModel().getUIFacade().proposalTypedFromUI(text);
  }

  protected void handleUiDeleteProposal(JsonEvent event) {
    getModel().getUIFacade().deleteProposalFromUI();
  }

  protected void handleUiAcceptProposal(JsonEvent event) {
    String text = getDisplayText(event);
    boolean chooser = event.getData().getBoolean("chooser");
    boolean forceClose = event.getData().getBoolean("forceClose");
    getModel().getUIFacade().acceptProposalFromUI(text, chooser, forceClose);
  }

  protected void handleUiCancelProposal() {
    getModel().getUIFacade().cancelProposalChooserFromUI();
  }

  // Note: we intentionally do NOT add filter conditions for the displayText of the smart-field, because
  // while processing the multiple events from the UI (from proposal-chooser, table and smart-field) the
  // displayText may change multiple times on the model. So in some cases the filter let pass the wrong
  // value in the end. Because the filter caused more harm than good, we removed it completely.

  protected void handleUiOpenProposal(JsonEvent event) {
    boolean browseAll = event.getData().optBoolean("browseAll");
    String displayText = getDisplayText(event);
    boolean selectCurrentValue = event.getData().optBoolean("selectCurrentValue");
    LOG.debug("handle openProposal -> openProposalFromUI. displayText={} browseAll={} selectCurrentValue={}", displayText, browseAll, selectCurrentValue);
    getModel().getUIFacade().openProposalChooserFromUI(displayText, browseAll, selectCurrentValue);
  }

  protected String getDisplayText(JsonEvent event) {
    return event.getData().optString("displayText", null);
  }

  @Override
  public JSONObject toJson() {
    JSONObject json = super.toJson();
    putProperty(json, PROP_PROPOSAL, m_proposal);
    putProperty(json, IContentAssistField.PROP_BROWSE_MAX_ROW_COUNT, getModel().getBrowseMaxRowCount());
    return json;
  }
}
