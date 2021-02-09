import * as R from 'ramda';
import Sample, {c} from './SampleComponent.js';
import {c as cLogout} from './logout/LogoutComponent.js';
import {c as cLogin} from './login/LoginComponent.js';
import SampleContainer, {apolloContainersSample} from './SampleContainer.js';
import {configToChainedPropsForSampleContainer} from './SampleContainer.sample.js';
import {VERSION_PROPS} from '@rescapes/apollo';
import {apolloContainerTests, defaultUpdatePathsForMutationContainers} from '../apolloContainerTestHelpers.js';
import {testAuthTask, testNoAuthTask} from '@rescapes/place';
import * as chakraReact from '@chakra-ui/react';
import {defaultNode} from '@rescapes/ramda';

const {extendTheme} = defaultNode(chakraReact);
const theme = extendTheme({});

// Test this container
const container = SampleContainer;
// Test container with this render component
const component = Sample;

const containerId = 'sampleContainer';
// Find this React component
const componentId = cLogout.logout;
// Find this class in the data renderer.
const childDataId = cLogout.logoutButton;
// Find this class in the loading renderer
const childLoadingId = c.sampleLoading;
// Find this class in the error renderer
const childErrorId = c.sampleError;
const childClassNoAuthenticationName = `button.${cLogin.loginButton}`;
// Error maker creates an unknown id that can't be queried
// Error maker creates an unknown id that can't be queried
const errorMaker = parentProps => {
  return R.compose(
    // Update both the region id and the userRegion's region id
    parentProps => R.set(R.lensPath(['userState', 'data', 'userRegions', 0, 'region', 'id']), -1, parentProps),
    parentProps => R.set(R.lensPath(['region', 'id']), -1, parentProps)
  )(parentProps);
};

const omitKeysFromSnapshots = R.concat(['id', 'key', 'lastLogin', 'exp', 'origIat', 'token'], VERSION_PROPS);
// We expect calling mutateRegion to update the updatedAt of the queryRegions response
const updatedPaths = defaultUpdatePathsForMutationContainers(apolloContainersSample, {
  mutateRegion: {
    // Check that mutation modified the query, we could likewise check the mutation result
    component: ['queryRegions.data.regions.0.updatedAt'],
    client: ['data.mutate.region']
  },
  mutateUserRegion: {
    component: ['mutateUserRegion.result.data.updateUserState.userState.updatedAt'],
    client: ['data.mutate.userState']
  }
});

describe('SampleContainer', () => {

  const {testComposeRequests, testQueries, testMutations, testRenderError, testRender, testRenderAuthentication} = apolloContainerTests(
    {
      componentContext: {
        componentId,
        containerId,
        statusClasses: {
          data: childDataId,
          loading: childLoadingId,
          error: childErrorId,
          noAuthentication: childClassNoAuthenticationName
        },
        // The Chakra theme
        theme
      },
      apolloContext: {
        state: {},
        apolloConfigContainer: testName => {
          return R.includes(testName, ['testRenderAuthenticationNoAuth']) ? testNoAuthTask() : testAuthTask();
        },
        // This is called with one argument, null or and apolloConfig to return the containers
        // Compose with the loginContainers and logoutContainers so we can test authentication
        apolloContainers: apolloContainersSample
      },
      testContext: {
        errorMaker,
        // Don't snapshot compare these non-deterministic keys on any object
        omitKeysFromSnapshots,
        // This value should change when we mutate
        updatedPaths,
        authorizeMutationKey: 'mutateTokenAuth',
        deauthorizeMutationKey: 'mutateDeleteTokenCookie',
        loginComponentName: 'LoginComponent',
        logoutComponentName: 'LogoutComponent'
      }
    },
    container,
    component,
    configToChainedPropsForSampleContainer
  );
  test('testComposeRequests', testComposeRequests, 10000);
  test('testQueries', testQueries, 10000);
  test('testMutations', testMutations, 1000000);
  test('testRender', testRender, 1000000);
  test('testRenderAuthentication', testRenderAuthentication, 1000000);
  test('testRenderError', testRenderError, 100000);
});

