import { autoBindMethodsForReact } from 'class-autobind-decorator';
import React, { PureComponent, ReactNode } from 'react';

import { AUTOBIND_CFG } from '../../../common/constants';
import { Button } from './button';

type States =
  | typeof STATE_DEFAULT
  | typeof STATE_ASK
  | typeof STATE_DONE
  ;

const STATE_DEFAULT = 'default';
const STATE_ASK = 'ask';
const STATE_DONE = 'done';
interface Props<T> {
  onClick?: (event: React.MouseEvent<HTMLButtonElement>, value?: T) => void;
  addIcon?: boolean;
  children?: ReactNode;
  disabled?: boolean;
  confirmMessage?: string;
  doneMessage?: string;
  value?: T;
  tabIndex?: number;
  className?: string;
  // TODO(TSCONVERSION) this is linked to Button not using title
  title?: string;
}

interface State {
  state: States;
}

@autoBindMethodsForReact(AUTOBIND_CFG)
export class PromptButton<T> extends PureComponent<Props<T>> {
  _doneTimeout: NodeJS.Timeout | null = null;
  _triggerTimeout: NodeJS.Timeout | null = null;
  state: State = {
    state: STATE_DEFAULT,
  };

  _confirm(event: React.MouseEvent<HTMLButtonElement>, value?: T) {
    if (this._triggerTimeout !== null) {
      // Clear existing timeouts
      clearTimeout(this._triggerTimeout);
    }

    // Fire the click handler
    this.props.onClick?.(event, value);
    // Set the state to done (but delay a bit to not alarm user)
    // using global.setTimeout to force use of the Node timeout rather than DOM timeout
    this._doneTimeout = global.setTimeout(() => {
      this.setState({
        state: STATE_DONE,
      });
    }, 100);
    // Set a timeout to hide the confirmation
    // using global.setTimeout to force use of the Node timeout rather than DOM timeout
    this._triggerTimeout = global.setTimeout(() => {
      this.setState({
        state: STATE_DEFAULT,
      });
    }, 2000);
  }

  _ask(event: React.MouseEvent<HTMLButtonElement>) {
    // Prevent events (ex. won't close dropdown if it's in one)
    event.preventDefault();
    event.stopPropagation();
    // Toggle the confirmation notice
    this.setState({
      state: STATE_ASK,
    });
    // Set a timeout to hide the confirmation
    // using global.setTimeout to force use of the Node timeout rather than DOM timeout
    this._triggerTimeout = global.setTimeout(() => {
      this.setState({
        state: STATE_DEFAULT,
      });
    }, 2000);
  }

  _handleClick(event: React.MouseEvent<HTMLButtonElement>, value?: T) {
    const { state } = this.state;

    if (state === STATE_ASK) {
      this._confirm(event, value);
    } else if (state === STATE_DEFAULT) {
      this._ask(event);
    } else {
      // Do nothing
    }
  }

  componentWillUnmount() {
    if (this._triggerTimeout) {
      clearTimeout(this._triggerTimeout);
    }
    if (this._doneTimeout) {
      clearTimeout(this._doneTimeout);
    }
  }

  render() {
    const {
      onClick,
      // eslint-disable-line @typescript-eslint/no-unused-vars
      children,
      addIcon,
      disabled,
      confirmMessage,
      doneMessage,
      tabIndex,
      ...other
    } = this.props;
    const { state } = this.state;
    const finalConfirmMessage = (typeof confirmMessage === 'string'
      ? confirmMessage
      : 'Click to confirm'
    ).trim();
    const finalDoneMessage = doneMessage || 'Done';
    let innerMsg;

    if (state === STATE_ASK && addIcon) {
      innerMsg = (
        <span className="warning" title="Click again to confirm">
          <i className="fa fa-exclamation-circle" />
          {finalConfirmMessage ? <span className="space-left">{finalConfirmMessage}</span> : ''}
        </span>
      );
    } else if (state === STATE_ASK) {
      innerMsg = (
        <span className="warning" title="Click again to confirm">
          {finalConfirmMessage}
        </span>
      );
    } else if (state === STATE_DONE) {
      innerMsg = finalDoneMessage;
    } else {
      innerMsg = children;
    }

    return (
      // TODO(TSCONVERSION) - don't spread into Button because any additional buttons props are not used
      <Button onClick={this._handleClick} disabled={disabled} tabIndex={tabIndex} {...other}>
        {innerMsg}
      </Button>
    );
  }
}
