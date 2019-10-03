import * as R from 'ramda';
import {c} from './SampleComponent';
import SampleContainer, {graphqlTasks} from './SampleContainer';
import {chainedParentPropsResultTask} from './SampleContainer.sample';
import {testConfig} from 'rescape-apollo'
import {remoteSchemaTask} from 'rescape-apollo'
import {e} from 'rescape-helpers-component'
import {apolloContainerTests} from '../apolloContainerTestHelpers';

// Test this container
const Container = e(SampleContainer);
// Find this React component
const componentName = 'Sample';
// Find this class in the data renderer
const childClassDataName = c.sampleMapboxOuter;
// Find this class in the loading renderer
const childClassLoadingName = c.sampleLoading;
// Find this class in the error renderer
const childClassErrorName = c.sampleError;
const errorMaker = parentProps => R.set(R.lensPath(['sample', 'id']), 'foo', parentProps);

describe('SampleContainer', () => {

  const {testQuery, testRenderError, testRender} = apolloContainerTests({
    // This was for Redux. We shouldn't need it now since our Apollo LinkState stores all state
    initialState: {},
    // Get the remote schema based on the test config
    schema: remoteSchemaTask(testConfig),
    Container,
    componentName,
    childClassDataName,
    childClassLoadingName,
    childClassErrorName,
    graphqlTasks: graphqlTasks,
    chainedParentPropsResultTask,
    errorMaker
  });
  test('testRender', testRender);
  test('testRenderError', testRenderError);
});

/*
const ContainerWithData = child => R.composeK(
  child,
  mapToNamedResponseAndInputs(
    'queryTwo',
    ({props, value: queryOne}) => query({query: queryTwo}),
  ),
  mapToNamedResponseAndInputs(
    'queryOne',
    props => query({query: queryOne})
  )
);
ContainerWithData(Sample);
*/

