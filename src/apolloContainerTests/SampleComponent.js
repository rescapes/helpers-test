import {Component} from 'react';
import {
  composeViews,
  e,
  nameLookup,
  propsFor,
  renderChoicepoint,
  renderErrorDefault,
  renderLoadingDefault
} from 'rescape-helpers-component';
import {reqStrPathThrowing, strPath} from 'rescape-ramda';
import PropTypes from 'prop-types';
import Logout from './LogoutComponent';
import {MemoryRouter, Route} from 'react-router-dom';
import * as R from 'ramda';
import PrivateRouteComponent from './PrivateRouteComponent';
import Login from './LoginComponent';

export const c = nameLookup({
  sample: true,
  sampleLoading: true,
  sampleError: true,
  sampleRouter: true,
  sampleRouteLogin: true,
  sampleLogin: true,
  sampleRouteProtected: true,
  sampleLogout: true,

  sampleHeader: true,
  sampleMapboxOuter: true,
  sampleMapbox: true
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

    [c.sampleMapboxOuter]: {},

    [c.sampleHeader]: {}
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
    // Route to render Login if the user is not authenticated
    e(PrivateRouteComponent, R.merge(propsOf(c.sampleRouteProtected), {
      render: routeProps => {
        // PrivateRoute redirects to authentication unless authenticated
        // If authenticated, render the logout button
        // Render the logout button
        return e('div', propsOf(c.sampleMapboxOuter), [
          e('div', propsOf(c.sampleHeader)),
          e(Logout, mergeWithRoute(c.sampleLogout, routeProps))
        ]);
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
Sample.choicepoint = renderChoicepoint(
  {
    onError: renderErrorDefault(c.sampleError),
    onLoading: renderLoadingDefault(c.sampleLoading),
    onData: Sample.renderData,
    // If not authenticated, simply render
    onUnauthenticated: Sample.renderData
  },
  {
    // Bypass to onData unless authenticated
    isAuthenticated: ({onError, onLoading, onData}, props) => {
      return R.ifElse(
        reqStrPathThrowing('isAuthenticated'),
        () => null,
        () => onData
      )(props);
    },
    queryRegionsPaginatedAll: true,
    queryRegionsPaginated: true,
    queryRegionsMinimized: true,
    queryRegions: true,
    queryUserRegions: true,
    mutateRegion: true,
    mutateUserRegion: true
  }
);

Sample.propTypes = {
  data: PropTypes.shape().isRequired,
  style: PropTypes.shape().isRequired
};

Sample.propTypes = {
  //queryRegions: PropTypes.shape({}).isRequired,
  //mutateRegion: PropTypes.func.isRequired
};

export default Sample;
