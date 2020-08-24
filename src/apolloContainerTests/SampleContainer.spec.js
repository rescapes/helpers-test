import * as R from 'ramda';
import Sample, {c} from './SampleComponent';
import SampleContainer, {apolloContainers} from './SampleContainer';
import {configToChainedPropsForSampleTask} from './SampleContainer.sample';
import {localTestAuthTask, VERSION_PROPS} from 'rescape-apollo';
import {apolloContainerTests} from '../apolloContainerTestHelpers';

// Test this container
const container = SampleContainer;
// Test container with this render component
const component = Sample

// Find this React component
const componentName = 'Sample';
// Find this class in the data renderer
const childClassDataName = c.sampleMapboxOuter;
// Find this class in the loading renderer
const childClassLoadingName = c.sampleLoading;
// Find this class in the error renderer
const childClassErrorName = c.sampleError;
// Error maker creates an unknown id that can't be queried
// Error maker creates an unknown id that can't be queried
const errorMaker = parentProps => {
  return R.compose(
    // Update both the region id and the userRegion's region id
    parentProps => R.set(R.lensPath(['userState', 'data', 'userRegions', 0, 'region', 'id']), -1, parentProps),
    parentProps => R.set(R.lensPath(['region', 'id']), -1, parentProps)
  )(parentProps)
};

const omitKeysFromSnapshots = R.concat(['id', 'key'], VERSION_PROPS);
// We expect calling mutateRegion to update the updatedAt of the queryRegions response
const updatedPaths = {
  mutateRegion: {
    // Check that mutation modified the query, we could likewise check the mutation result
    component: ['queryRegions.data.regions.0.updatedAt'],
    client: ['data.mutate.region']
  },
  mutateUserRegion: {
    component: ['mutateUserRegion.result.data.updateUserState.userState.updatedAt'],
    client: ['data.mutate.userState']
  }
};

describe('SampleContainer', () => {

  const {testComposeRequests, testQueries, testMutations, testRenderError, testRender} = apolloContainerTests(
    {
      componentContext: {
        name: componentName,
        statusClasses: {
          data: childClassDataName,
          loading: childClassLoadingName,
          error: childClassErrorName
        }
      },
      apolloContext: {
        state: {},
        apolloConfigTask: localTestAuthTask(),
        // This is called with one argument, null or and apolloConfig to return the containers
        apolloContainers
      },
      reduxContext: {},
      testContext: {
        errorMaker,
        // Don't snapshot compare these non-deterministic keys on any object
        omitKeysFromSnapshots,
        // This value should change when we mutate
        updatedPaths
      }
    },
    container,
    component,
    configToChainedPropsForSampleTask
  );
  test('testComposeRequests', testComposeRequests, 10000);
  test('testQueries', testQueries, 10000);
  test('testMutations', testMutations, 1000000);
  test('testRender', testRender, 1000000);
  test('testRenderError', testRenderError, 100000);
});

