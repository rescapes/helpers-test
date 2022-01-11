/**
 * Created by Andy Likuski on 2017.12.14
 * Copyright (c) 2017 Andy Likuski
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */
import * as chakra from "@chakra-ui/react";
import * as chakraReact from "@chakra-ui/react";
import * as reactRouterDom from "react-router-dom";
import {useTranslation} from 'react-i18next';

import {
  composeViews,
  e,
  nameLookup,
  propsFor,
  renderChoicepoint,
  renderLoadingDefault
} from '@rescapes/helpers-component';
import PropTypes from 'prop-types';
import * as R from 'ramda';
import * as RR from '@rescapes/ramda';
import {useInput} from '../../helpers/hookHelpers.js';
import {AuthenticationBox} from '../themeComponents/authenticationBox';
import {AuthenticationInput} from '../themeComponents/authenticationInput';
import {AuthenticationButton} from '../themeComponents/authenticationButton';

const {reqPathThrowing, strPathOr, reqStrPathThrowing, defaultNode} = RR;

const {FormLabel} = defaultNode(chakra);
const {Redirect, useHistory, useLocation} = defaultNode(reactRouterDom);
const {Form} = defaultNode(chakraReact);

export const isAuthenticated = props => {
  return !strPathOr(false, 'mutateDeleteTokenCookie.result.data.deleteTokenCookie', props) && (
    strPathOr(false, 'queryLocalTokenAuthContainer.data.obtainJSONWebToken.token', props) ||
    strPathOr(false, 'mutateTokenAuth.result.data.tokenAuth', props))
}

export const c = nameLookup({
  login: true,
  loginBody: true,
  loginHeader: true,
  loginForm: true,
  loginDataLabel: true,
  loginErrorLabel: true,
  loginUsername: true,
  loginPassword: true,
  loginButton: true,
  loginForgot: true,
  loginRegister: true,
  loginLoading: true,
  loginError: true
});


export default function LoginComponent(props) {
  // Browser history hook
  const history = useHistory();
  // Browser location hook
  const location = useLocation();
  const {t} = useTranslation();
  const hooks = {
    [c.loginUsername]: useInput(''),
    [c.loginPassword]: useInput('')
  };

  const allProps = LoginComponent.views(R.merge(props, {t, history, location, hooks}));
  const propsOf = propsFor(allProps.views);

  return e('div', propsOf(c.login),
    LoginComponent.choicepoint(allProps)
  );
}

/**
 *
 * @param {Object} history History object from the useHistory hook
 * @param {Object} location Location object from the useLocation hook
 * @param props
 * @param props.history
 * @param props.location
 * @param props.loginPath
 * @param props.mutateTokenAuth
 * @param props.views
 * @returns {Object}
 */
LoginComponent.renderData = (
  {
    history, t, loginPath, location,
    queryLocalTokenAuthContainer, queryAuthenticatedUserLocalContainer, mutateTokenAuth, mutateDeleteTokenCookie,
    views
  }
) => {
  const propsOf = propsFor(views);
  return renderDataOrError(
    {
      history, loginPath, location,
      queryLocalTokenAuthContainer, queryAuthenticatedUserLocalContainer, mutateTokenAuth, mutateDeleteTokenCookie,
      views
    },
    () => {
      return e(FormLabel, propsOf(c.loginDataLabel), t('Enter email and password'));
    }
  );
};

LoginComponent.renderError = (
  keys,
  {
    history, t, loginPath, location,
    queryLocalTokenAuthContainer, mutateTokenAuth,
    views
  }
) => {
  const propsOf = propsFor(views);

  return renderDataOrError(
    {history, loginPath, location, queryLocalTokenAuthContainer, mutateTokenAuth, views},
    () => {
      return e(FormLabel, propsOf(c.loginErrorLabel), t('Problem with your login'));
    }
  );
};

const renderDataOrError = (
  {
    history, loginPath, location,
    views,
    ...props
  },
  renderLabel
) => {
  const propsOf = propsFor(views);
  // TODO This should use history to redirect to the SoP path before login if one exists
  const from = R.ifElse(
    R.equals(loginPath),
    () => '/',
    () => '/'
  )(R.prop('pathname', location));


  if (isAuthenticated(props)) {
    return e(Redirect, {to: from});
  }
  return e(AuthenticationBox, propsOf(c.loginBody), [
    e('h2', propsOf(c.loginHeader)),
    e('form', propsOf(c.loginForm), [
      renderLabel(),
      e(AuthenticationInput, propsOf(c.loginUsername)),
      e(AuthenticationInput, propsOf(c.loginPassword)),
      e(AuthenticationButton, propsOf(c.loginButton))
    ])
  ]);
};


/**
 * Merges parent and state styles into component styles
 * @param style
 */
LoginComponent.viewStyles = ({style}) => {
  return {
    [c.login]: {float: 'right'},
    [c.loginBody]: {}
  };
};

LoginComponent.viewProps = props => {
  return {
    [c.loginBody]: {},
    [c.loginHeader]: {children: 'Login'},
    [c.loginUsername]: {type: 'text', placeholder: 'username'},
    [c.loginPassword]: {type: 'password', placeholder: 'password'},
    [c.loginButton]: {children: 'Login'}
  };
};

LoginComponent.viewEventHandlers = props => {
  const hooks = props.hooks;
  return {
    [c.loginUsername]: {
      onChange: e => reqPathThrowing(
        [c.loginUsername, 'onChange'],
        hooks
      )(e)
    },
    [c.loginPassword]: {
      onChange: e => reqPathThrowing(
        [c.loginPassword, 'onChange'],
        hooks
      )(e)
    },
    [c.loginButton]: {
      onClick: () => {
        reqStrPathThrowing('mutateTokenAuth.mutation', props)({
          variables: {
            username: reqPathThrowing([c.loginUsername, 'value'], hooks),
            password: reqPathThrowing([c.loginPassword, 'value'], hooks)
          }
        });
      }
    }
  };
};

/**
 * Adds to props.views for each component configured in viewEventHandlers, viewProps, and viewStyles
 * @param {Object} props this.props or equivalent for testing
 * @returns {Object} modified props
 */
LoginComponent.views = composeViews(
  LoginComponent.viewEventHandlers,
  LoginComponent.viewProps,
  LoginComponent.viewStyles
);

/**
 * Loading, Error, or Data based on the props.
 */
LoginComponent.choicepoint = props => {
  return renderChoicepoint(
    {
      onError: LoginComponent.renderError,
      onLoading: renderLoadingDefault(c.loginLoading),
      onData: LoginComponent.renderData
    },
    {
      mutateTokenAuth: true
    }
  )(props);
};

LoginComponent.propTypes = {
  style: PropTypes.shape().isRequired
};

