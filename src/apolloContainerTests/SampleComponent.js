import React from 'react';
const {Component} = React
import {
  composeViews,
  e,
  nameLookup,
  propsFor,
  renderChoicepoint,
  renderErrorDefault,
  renderLoadingDefault,
  bypassToDataIfUnauthenticated
} from 'rescape-helpers-component';
import {reqStrPathThrowing, strPath, strPathOr} from 'rescape-ramda';
import PropTypes from 'prop-types';
import reactRouterDom from 'react-router-dom';
const {MemoryRouter, Route} = reactRouterDom
import * as R from 'ramda';
import PrivateRouteComponent from './PrivateRouteComponent';
import {Login} from './login';
import {Logout} from './logout';

export const c = nameLookup({
  sample: true,
  sampleLoading: true,
  sampleError: true,
  sampleRouter: true,
  sampleRouteLogin: true,
  sampleLogin: true,
  privateRouterComponent: true,
  sampleLogout: true,
  sampleHeader: true,
});

/**
 * The View for a Mapbox on a Sample
 */
class Sample extends Component {
  render() {
    const props = Sample.views(this.props);
    return e(
      'div',
      propsFor(props.views, c.sample),
      Sample.choicepoint(props)
    );
  }
}

/**
 * Merges parent and state styles into component styles
 * @param style
 */
Sample.viewStyles = () => {
  return {
    [c.sample]: {},
    [c.sampleHeader]: {}
  };
};

Sample.viewProps = (props) => {
  // sample is expected from the query result so can be null during loading or error
  const sample = strPath('data.sample', props);

  return {
    // Key with sample.id so this component can be used in an array
    [c.sample]: {
      sample
    },
    [c.sampleLogin]: R.pick(['style', 'queryAuthenticatedUserLocalContainer'], props),

    [c.sampleHeader]: {},
    [c.sampleRouter]: {
      // History, this will help us pretend that the user is requested an authenticated page.
      // When we are authenticated, we'll redirect to it. Otherwise we'll get stuck on the login page
      initialEntries: strPathOr([], 'memoryRouterInitialEntries', props),
      initialIndex: strPathOr(0, 'memoryRouterInitialIndex', props)
    },
    [c.sampleRouteLogin]: {
      // The login route path
      path: reqStrPathThrowing('loginPath', props)
    },
    [c.sampleLogout]: props,
    [c.privateRouterComponent]: {
      // The protected (needs authentication) route path
      // This will likely just be '/' in production
      path: reqStrPathThrowing('protectedPath', props),
      loginPath: reqStrPathThrowing('loginPath', props),
      ...R.pick(['queryAuthenticatedUserLocalContainer'], props)
    }
  };
};

Sample.viewActions = () => {
  return {};
};

Sample.renderData = ({views}) => {
  const propsOf = propsFor(views);
  // Put routeProps in the routeProps key and merge with the props destined for the component of the given key
  const mergeWithRoute = (key, routeProps) => {
    return R.merge(propsOf(key), {routeProps});
  };

  return e(MemoryRouter, propsOf(c.sampleRouter),
    // Route to render Login if the user is not authenticated
    e(Route,
      R.merge(
        propsOf(c.sampleRouteLogin),
        {
          render: props => {
            return e(Login, propsOf(c.sampleLogin));
          }
        }
      )
    ),
    // Route to PrivateRouteComponent if logged in
    e(PrivateRouteComponent, R.merge(propsOf(c.privateRouterComponent), {
      render: routeProps => {
        // PrivateRoute redirects to authentication unless authenticated
        // If authenticated, render the authenticated page, which here is just a logout button
        return e(Logout, mergeWithRoute(c.sampleLogout, routeProps));
      }
    }))
  );
};


/**
 * Adds to props.views for each component configured in viewActions, viewProps, and viewStyles
 * @param {Object} props this.props or equivalent for testing
 * @returns {Object} modified props
 */
Sample.views = composeViews(
  Sample.viewActions(),
  Sample.viewProps,
  Sample.viewStyles
);

/**
 * Loading, Error, or Data based on the props.
 * Our propConfig instructs renderChoicepoint to evaluate the loading state of the query and mutation
 */
Sample.choicepoint = p => {
  return renderChoicepoint(
    {
      onError: renderErrorDefault(c.sampleError),
      onLoading: renderLoadingDefault(c.sampleLoading),
      onData: Sample.renderData,
      // If not authenticated, simply render
      onUnauthenticated: Sample.renderData
    },
    {
      // Bypass other checks and call onData unless authenticated
      queryAuthenticatedUserLocalContainer: bypassToDataIfUnauthenticated(
        'queryAuthenticatedUserLocalContainer.data.currentUser'
      ),
      queryRegionsPaginatedAll: true,
      queryRegionsPaginated: true,
      queryRegionsMinimized: true,
      queryRegions: true,
      queryUserRegions: true,
      // We shouldn't care about when a mutation is loading. That's shouldn't block rendering
      // We do care if a mutate errors or if a complex mutation is not ready.
      // mutateUserRegion is a complex mutation that must query first, so it can have a skip=true state,
      // meaning we are not ready to render a page that lets us run this mutation.
      // mutateRegion doesn't need onReady because it is always ready to run if the queries have completed
      mutateRegion: ['onError'],
      mutateUserRegion: ['onError', 'onReady']
    },
    p
  );
};

Sample.propTypes = {
  style: PropTypes.shape().isRequired
};

export default Sample;
