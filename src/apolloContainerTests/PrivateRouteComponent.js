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
import {
  componentAndPropsFor,
  composeViews,
  e,
  nameLookup,
  propsFor,
  renderChoicepoint,
  renderErrorDefault,
  renderLoadingDefault
} from 'rescape-helpers-component';
import * as R from 'ramda';
import {Redirect, Route, useHistory, useLocation} from 'react-router-dom';
import {renameKey, reqStrPath, reqStrPathThrowing} from 'rescape-ramda';

export const c = nameLookup({
  privateRoute: true,
  privateRouteBody: true,
  privateRouteComponent: true,
  privateRouteRedirect: true,
  privateRouteLoading: true,
  privateRouteError: true
});

export default function PrivateRouteComponent(props) {
  const history = useHistory();
  const location = useLocation();
  const propViews = PrivateRouteComponent.views(R.merge(props, {location, history}));
  return e('div', propsFor(propViews.views, c.privateRoute),
    PrivateRouteComponent.choicepoint(propViews)
  );
}

/**
 * @param views
 * @returns {Object}
 */
PrivateRouteComponent.renderData = ({views, ...props}) => {
  const propsOf = propsFor(views);
  const componentAndPropsOf = componentAndPropsFor(views);
  const {isAuthenticated, ...privateRouteBodyProps} = propsOf(c.privateRouteBody);
  // Since Route has no path, it will always match here
  return e(Route, R.merge(
    privateRouteBodyProps, {
      render: (props) => {
        return R.ifElse(
          R.identity,
          // Render the given component
          () => e(...componentAndPropsOf(c.privateRouteComponent)),
          // Redirect to login
          () => e(Redirect, propsOf(c.privateRouteRedirect)
          )
        )(isAuthenticated);
      }
    }
  ));
};

/**
 * Merges parent and state styles into component styles
 * @param style
 */
PrivateRouteComponent.viewStyles = ({style}) => {
  return {};
};

PrivateRouteComponent.viewProps = props => {
  return {
    [c.privateRouteBody]: R.omit(['component'], props),
    // Rename 'component' to 'style' so we can grab it with componentAndPropsFor, which
    // currently looks for a styledComponent at the style key.
    // TODO componentAndPropsFor should look at 'component'
    [c.privateRouteComponent]: renameKey(R.lensPath([]), 'component', 'style', props),
    [c.privateRouteRedirect]: {
      to: reqStrPath('loginPath', props),
      // The location the user is trying to access, so we can redirect their after they login
      state: {from: reqStrPathThrowing('location', props)}
    }
  };
};

PrivateRouteComponent.viewActions = () => {
  return {};
};

/**
 * Adds to props.views for each component configured in viewActions, viewProps, and viewStyles
 * @param {Object} props this.props or equivalent for testing
 * @returns {Object} modified props
 */
PrivateRouteComponent.views = composeViews(
  PrivateRouteComponent.viewActions(),
  PrivateRouteComponent.viewProps,
  PrivateRouteComponent.viewStyles
);

/**
 * Loading, Error, or Data based on the props.
 */
PrivateRouteComponent.choicepoint = p => {
  return renderChoicepoint(
    {
      onError: renderErrorDefault(c.privateRouteError),
      onLoading: renderLoadingDefault(c.privateRouteLoading),
      onData: PrivateRouteComponent.renderData
    },
    {}
  )(p);
};

PrivateRouteComponent.propTypes = {};