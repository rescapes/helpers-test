/**
 * Created by Andy Likuski on 2020.09.11
 * Copyright (c) 2020 Andy Likuski
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */
import * as R from 'ramda';
import styled from "styled-components";
import {Redirect, useHistory, useLocation} from "react-router-dom";
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
} from 'rescape-helpers-component';
import PropTypes from 'prop-types';
import {reqStrPathThrowing} from 'rescape-ramda';

export const c = nameLookup({
  logout: true,
  logoutHeader: true,
  logoutBody: true,
  logoutButton: true,
  logoutLoading: true,
  logoutError: true
});

export default function LogoutComponent(props) {
  // Browser history hook
  const history = useHistory();
  // Browser location hook
  const location = useLocation();

  const allProps = LogoutComponent.views(R.merge(props, {history, location}));
  const propsOf = propsFor(allProps.views);
  return e('div', propsOf(c.logout),
    LogoutComponent.choicepoint(allProps)
  );
}

/**
 *
 * @param {Object} history History object from the useHistory hook
 * @param {Object} location Location object from the useLocation hook
 * @param views
 * @returns {Object}
 */
LogoutComponent.renderData = ({history, location, queryAuthenticatedUserLocalContainer, views}) => {
  const styledComponentAndProps = componentAndPropsFor(views);

  const props = propsFor(views);

  if (!queryAuthenticatedUserLocalContainer) {
    return e(Redirect, {to: '/login'});
  }

  return e(...styledComponentAndProps(c.logoutBody), [
    e('h2', props(c.logoutHeader)),
    e(...styledComponentAndProps(c.logoutButton))
  ]);
};


/**
 * Merges parent and state styles into component styles
 * @param style
 */
LogoutComponent.viewStyles = ({style}) => {

  return {
    [c.logout]: {},

    [c.logoutBody]: applyMatchingStyles(style, {
      width: styleMultiplier(1),
      height: styleMultiplier(1)
    })
  };
};

const styledComponents = {
  logoutButton: styled.button`
  border: 1px solid #000;
`,

  logoutBody: styled.div`
  display: flex;
`
};
LogoutComponent.viewProps = props => {
  return {
    [c.logout]: {},
    [c.logoutBody]: {
      component: reqStrPathThrowing('logoutBody', styledComponents)
    },
    [c.logoutButton]: {
      component: reqStrPathThrowing('logoutButton', styledComponents),
      children: 'Logout'
    }
  };
};

LogoutComponent.viewActions = () => {
  return {};
};

/**
 * Adds to props.views for each component configured in viewActions, viewProps, and viewStyles
 * @param {Object} props this.props or equivalent for testing
 * @returns {Object} modified props
 */
LogoutComponent.views = composeViews(
  LogoutComponent.viewActions(),
  LogoutComponent.viewProps,
  LogoutComponent.viewStyles
);

/**
 * Loading, Error, or Data based on the props.
 */
LogoutComponent.choicepoint = p => {
  return renderChoicepoint(
    {
      onError: renderErrorDefault(c.logoutError),
      onLoading: renderLoadingDefault(c.logoutLoading),
      onData: LogoutComponent.renderData
    },
    {}
  )(p);
};

LogoutComponent.propTypes = {
  style: PropTypes.shape().isRequired
};


