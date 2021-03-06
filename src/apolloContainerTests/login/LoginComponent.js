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
import chakra from '@chakra-ui/core';
import reactRouterDom from "react-router-dom";
import {
  applyMatchingStyles,
  componentAndPropsFor,
  composeViews,
  e,
  nameLookup,
  propsFor,
  renderChoicepoint,
  renderErrorDefault,
  renderLoadingDefault,
  styleMultiplier
} from '@rescapes/helpers-component';
import PropTypes from 'prop-types';
import * as R from 'ramda';
import {strPathOr} from '@rescapes/ramda';

const {Box, Input} = chakra;

const {Redirect, useHistory, useLocation} = reactRouterDom;

export const c = nameLookup({
  login: true,
  loginBody: true,
  loginHeader: true,
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

  const allProps = LoginComponent.views(R.merge(props, {history, location}));
  const propsOf = propsFor(allProps.views);
  return e('div', propsOf(c.login),
    LoginComponent.choicepoint(allProps)
  );
}

/**
 *
 * @param {Object} history History object from the useHistory hook
 * @param {Object} location Location object from the useLocation hook
 * @param views
 * @returns {Object}
 */
LoginComponent.renderData = ({history, location, queryAuthenticatedUserLocalContainer, views}) => {
  const propsOf = propsFor(views);
  const componentAndPropsOf = componentAndPropsFor(views);
  const from = R.propOr('/', 'pathname', location);

  if (strPathOr(false, 'data.currentUser', queryAuthenticatedUserLocalContainer)) {
    return e(Redirect, {to: from});
  }

  return e(...componentAndPropsOf(c.loginBody), [
    e('h2', propsOf(c.loginHeader)),
    e(...componentAndPropsOf(c.loginUsername)),
    e(...componentAndPropsOf(c.loginPassword)),
    e('button', propsOf(c.loginButton))
  ]);
};

const styledComponents = {
  login: Box,
  /*
  styled.div`
  display: flex;
  align-items: center;
  flex-flow: column;
  width: 200px;
  height: 200px;
  margin: 0 auto;
  border: 2px solid #000;
  border-radius: 20px;
  background: #eee;
  h2 {
    font-family: Arial, Helvetica, sans-serif;
    font-size: 14px;
  }
  button {
    background: green;
    color: #fff;
    padding: 10px;
    margin: 5px;
    width: 150px;
    border: none;
    border-radius: 10px;
    box-sizing: border-box;
  }
`,
*/
  input: Input
  /*
  border: 1px solid #000;
  border-radius: 10px;
  padding: 10px;
  margin: 5px;
  width: 150px;
  box-sizing: border-box;
`
  */
};

/**
 * Merges parent and state styles into component styles
 * @param style
 */
LoginComponent.viewStyles = ({style}) => {

  return {
    [c.login]: {},

    [c.loginBody]: {
      component: styledComponents.login,
      style: applyMatchingStyles(style, {
        width: styleMultiplier(1),
        height: styleMultiplier(1)
      })
    },

    [c.loginUsername]: {
      component: styledComponents.input
    },

    [c.loginPassword]: {
      component: styledComponents.input
    }
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

LoginComponent.viewActions = () => {
  return {};
};

/**
 * Adds to props.views for each component configured in viewActions, viewProps, and viewStyles
 * @param {Object} props this.props or equivalent for testing
 * @returns {Object} modified props
 */
LoginComponent.views = composeViews(
  LoginComponent.viewActions(),
  LoginComponent.viewProps,
  LoginComponent.viewStyles
);

/**
 * Loading, Error, or Data based on the props.
 */
LoginComponent.choicepoint = p => {
  return renderChoicepoint(
    {
      onError: renderErrorDefault(c.loginError),
      onLoading: renderLoadingDefault(c.loginLoading),
      onData: LoginComponent.renderData
    },
    {}
  )(p);
};

LoginComponent.propTypes = {
  style: PropTypes.shape().isRequired
};

