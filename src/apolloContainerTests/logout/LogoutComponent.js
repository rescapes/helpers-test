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
import * as ReactRouterDom from "react-router-dom";
import {
  componentAndPropsFor,
  composeViews,
  e,
  nameLookup,
  propsFor,
  renderChoicepoint,
  renderErrorDefault,
  renderLoadingDefault
} from '@rescapes/helpers-component';
import PropTypes from 'prop-types';
import * as RR from '@rescapes/ramda';
import {defaultNode} from '@rescapes/ramda';
import LogoutButtonComponent from './LogoutButtonComponent.js';
import {AuthenticationBox} from '../themeComponents/authenticationBox';

const {strPathOr, reqStrPathThrowing, strPathOrNullOk} = RR;

const {Redirect, useHistory, useLocation} = defaultNode(ReactRouterDom)

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
 * @param {Object} queryAuthenticatedUserLocalContainer Apollo query result about state of the user
 * @param views
 * @returns {Object}
 */
LogoutComponent.renderData = ({history, location, mutateDeleteTokenCookie, views}) => {
  const styledComponentAndProps = componentAndPropsFor(views);

  const propsOf = propsFor(views);

  // TODO Since refetchQueries doesn't work well (https://github.com/apollographql/apollo-client/issues/3633)
  // just listen to the result of the mutation and redirect to the referring page or /
  // Ideally we shouldn't have to redirect because the AppContainer's queries should rerun when the token goes
  // is the cache, but I don't know how to get a cache write to trigger dependent queries.
  if (strPathOr(false, 'result.data.deleteTokenCookie', mutateDeleteTokenCookie)) {
    return e(Redirect, {to: '/login'});
  }

  return e(AuthenticationBox, propsOf(c.logoutBody), [
    e('h2', propsOf(c.logoutHeader)),
    e(LogoutButtonComponent, propsOf(c.logoutButton))
  ]);
};


/**
 * Merges parent and state styles into component styles
 * @param style
 */
LogoutComponent.viewStyles = ({style}) => {

  return {
    [c.logout]: {},
    [c.logoutButton]: {},
    [c.logoutBody]: {}
  };
};

LogoutComponent.viewProps = props => {
  return {
    [c.logout]: {},
    [c.logoutBody]: {

    },
    [c.logoutButton]: {
      children: 'Logout'
    }
  };
};

LogoutComponent.viewEventHandlers = props => {
  return {
    [c.logoutButton]: {
      onClick: () => {
        reqStrPathThrowing('mutateDeleteTokenCookie.mutation', props)({
          variables: {}
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
LogoutComponent.views = composeViews(
  LogoutComponent.viewEventHandlers,
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


