import * as R from 'ramda';
import {c} from './SampleComponent';
import SampleContainer, {requests} from './SampleContainer';
import {propsResultTask} from './SampleContainer.sample';
import {testConfig} from 'rescape-apollo';
import {remoteSchemaTask} from 'rescape-apollo';
import {e} from 'rescape-helpers-component';
import {apolloContainerTests} from '../apolloContainerTestHelpers';
import {remoteConfig} from '../remoteConfig';

// Test this container
const container = e(SampleContainer);
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

  const {testQuery, testRenderError, testRender} = apolloContainerTests(
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
        schemaTask: remoteSchemaTask(testConfig),
        requests
      },
      reduxContext: {
      },
      testContext: {
        errorMaker
      }
    },
    container,
    propsResultTask
  );
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

