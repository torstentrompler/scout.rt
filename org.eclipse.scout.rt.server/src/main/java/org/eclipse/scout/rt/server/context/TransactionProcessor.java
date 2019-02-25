/*******************************************************************************
 * Copyright (c) 2010-2015 BSI Business Systems Integration AG.
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v1.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v10.html
 *
 * Contributors:
 *     BSI Business Systems Integration AG - initial API and implementation
 ******************************************************************************/
package org.eclipse.scout.rt.server.context;

import java.util.concurrent.Callable;

import org.eclipse.scout.rt.platform.BEANS;
import org.eclipse.scout.rt.platform.chain.callable.CallableChain;
import org.eclipse.scout.rt.platform.chain.callable.CallableChain.Chain;
import org.eclipse.scout.rt.platform.chain.callable.ICallableDecorator.IUndecorator;
import org.eclipse.scout.rt.platform.chain.callable.ICallableInterceptor;
import org.eclipse.scout.rt.platform.context.RunMonitor;
import org.eclipse.scout.rt.platform.exception.DefaultExceptionTranslator;
import org.eclipse.scout.rt.platform.util.Assertions;
import org.eclipse.scout.rt.platform.util.IRegistrationHandle;
import org.eclipse.scout.rt.platform.util.ThreadLocalProcessor;
import org.eclipse.scout.rt.server.transaction.ITransaction;
import org.eclipse.scout.rt.server.transaction.TransactionRequiredException;
import org.eclipse.scout.rt.server.transaction.TransactionScope;

/**
 * Depending on the {@link TransactionScope} and the existence of a caller transaction, this processor starts a new
 * transaction for the subsequent sequence of actions and ends the transaction according to the XA specification
 * (eXtended Architecture) upon completion. Thereto, the <code>2-phase-commit-protocol (2PC)</code> is applied in order
 * to successfully commit the transaction consistently over all involved transaction members like relational databases,
 * message queues, webservice consumers and so on.
 * <p>
 * Instances of this class are to be added to a {@link CallableChain} to participate in the execution of a
 * {@link Callable}.
 *
 * @since 5.1
 */
public class TransactionProcessor<RESULT> implements ICallableInterceptor<RESULT> {

  protected final TransactionScope m_transactionScope;
  protected final ITransaction m_callerTransaction;

  public TransactionProcessor(final ITransaction callerTransaction, final TransactionScope transactionScope) {
    m_transactionScope = (transactionScope != null ? transactionScope : TransactionScope.REQUIRES_NEW);
    m_callerTransaction = callerTransaction;
  }

  @Override
  public RESULT intercept(final Chain<RESULT> chain) throws Exception {
    switch (m_transactionScope) {
      case REQUIRES_NEW:
        return runTxRequiresNew(chain);
      case REQUIRED:
        return runTxRequired(chain);
      case MANDATORY:
        return runTxMandatory(chain);
      default:
        return Assertions.fail("Unsupported transaction scope [{}]", m_transactionScope);
    }
  }

  @Override
  public boolean isEnabled() {
    return true;
  }

  /**
   * Continues the chain in a new transaction, which upon completion is committed or rolled back.
   */
  protected RESULT runTxRequiresNew(final Chain<RESULT> chain) throws Exception {
    // Create and register the new transaction.
    final ITransaction newTransaction = BEANS.get(ITransaction.class);
    final IRegistrationHandle currentTransactionRegistration = registerAsCurrentTransaction(newTransaction);
    final IRegistrationHandle cancellationRegistration = registerTransactionForCancellation(newTransaction);
    try {
      try {
        return chain.continueChain();
      }
      catch (final Throwable t) { // NOSONAR
        newTransaction.addFailure(t); // Register failure to rollback transaction.
        throw BEANS.get(DefaultExceptionTranslator.class).translate(t);
      }
      finally {
        BEANS.get(ITransactionCommitProtocol.class).commitOrRollback(newTransaction);
      }
    }
    finally {
      currentTransactionRegistration.dispose();
      cancellationRegistration.dispose();
    }
  }

  /**
   * Continues the chain on behalf of the current caller transaction. If not available, a new transaction is started and
   * upon completion, that transaction is committed or rolled back.
   */
  protected RESULT runTxRequired(final Chain<RESULT> chain) throws Exception {
    if (m_callerTransaction != null) {
      return runTxMandatory(chain);
    }
    else {
      return runTxRequiresNew(chain);
    }
  }

  /**
   * Ensures a caller transaction to exist and continues the chain on behalf of that caller transaction.
   */
  protected RESULT runTxMandatory(final Chain<RESULT> chain) throws Exception {
    if (m_callerTransaction == null) {
      throw new TransactionRequiredException();
    }

    final IRegistrationHandle threadLocalRegistration = registerAsCurrentTransaction(m_callerTransaction);
    try {
      return chain.continueChain();
    }
    catch (final Throwable t) { // NOSONAR
      m_callerTransaction.addFailure(t);
      throw t;
    }
    finally {
      threadLocalRegistration.dispose();
    }
  }

  /**
   * Registers the given transaction for cancellation in the current {@link RunMonitor}.
   *
   * @return the 'undo-action' to unregister the transaction from the monitor.
   */
  protected IRegistrationHandle registerTransactionForCancellation(final ITransaction transaction) {
    RunMonitor.CURRENT.get().registerCancellable(transaction);

    // Return the 'undo-action' to unregister the transaction from the monitor.
    return new IRegistrationHandle() {

      @Override
      public void dispose() {
        RunMonitor.CURRENT.get().unregisterCancellable(transaction);
      }
    };
  }

  /**
   * Registers the given transaction in {@link ITransaction#CURRENT} thread-local, so it becomes the active transaction.
   *
   * @return the 'undo-action' to restore the thread-local value.
   * @throws Exception
   */
  protected IRegistrationHandle registerAsCurrentTransaction(final ITransaction transaction) throws Exception {
    final IUndecorator decoration = new ThreadLocalProcessor<>(ITransaction.CURRENT, transaction).decorate();

    return new IRegistrationHandle() {

      @Override
      public void dispose() {
        decoration.undecorate();
      }
    };
  }
}