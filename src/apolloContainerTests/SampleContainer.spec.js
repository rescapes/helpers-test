import * as R from 'ramda';
import Sample, {c} from './SampleComponent.js';
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

// Find this React component (by component class name. You could also assign a display name to a functional component
// and fine that I think)
const componentId = 'Sample'
// Find the id of this component that is rendered by sample when data is ready
const childDataId = c.sampleLogout;
// Find this class in the loading renderer
const childLoadingId = c.sampleLoading;
// Find this class in the error renderer
const childErrorId = c.sampleError;
const childClassNoAuthenticationId = cLogin.loginButton;
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
    // Check that mutation modified the query result, we could likewise check the mutation result,
    // but this is more interesting since it shows the query responding to the mutation
    component: ['queryRegions.data.regions.0.updatedAt'],
    client: ['result.data.mutate.region']
  },
  mutateUserRegion: {
    component: ['mutateUserRegion.result.data.updateUserState.userState.updatedAt'],
    client: ['result.data.mutate.userState']
  }
});

describe('SampleContainer', () => {

  const {testComposeRequests, testQueries, testMutations, testRenderError, testRender, testRenderAuthentication, afterEachTask} = apolloContainerTests(
    {
      componentContext: {
        componentId,
        statusClasses: {
          data: childDataId,
          loading: childLoadingId,
          error: childErrorId,
          noAuthentication: childClassNoAuthenticationId
        },
        // The Chakra theme
        theme
      },
      apolloContext: {
        state: {},
        apolloConfigContainer: testName => {
          // Don't auth if we are testing authentication. We want to authenticate using mutation
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
        loginComponentId: 'LoginComponent',
        logoutComponentId: 'LogoutComponent'
      }
    },
    container,
    component,
    configToChainedPropsForSampleContainer
  );
  afterEach(async () => {
    await afterEachTask.run().promise()
  });

  test('testComposeRequests', testComposeRequests, 10000);
  test('testQueries', testQueries, 10000);
  test('testMutations', testMutations, 10000);
  test('testRender', testRender, 10000);
  test('testRenderAuthentication', testRenderAuthentication, 100000);
  test('testRenderError', testRenderError, 10000);
});

