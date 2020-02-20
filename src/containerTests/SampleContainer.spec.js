import * as R from 'ramda';
import Sample, {c} from './SampleComponent';
import SampleContainer, {apolloContainers} from './SampleContainer';
import {propsResultTask} from './SampleContainer.sample';
import {remoteSchemaTask, testConfig} from 'rescape-apollo';
import {composeGraphqlQueryDefinitions} from 'rescape-helpers-component';
import {apolloContainerTests} from '../apolloContainerTestHelpers';

// Test this container
const container = SampleContainer;
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

  test('composeGraphqlQueryDefinitions', () => {
    const ContainerWithData = composeGraphqlQueryDefinitions(apolloContainers)(Sample);
    // Testing this requires running data through the Container, connecting to a graphql schema etc.
    expect(ContainerWithData({
      currentRegion: {
        // Some props
        style: {
          width: 500,
          height: 500
        },
        region: {
          // This matches a testConfig Region
          id: 1,
          mapbox: {
            viewport: {
              zoom: 10
            }
          }
        }
      }
    })).toBeTruthy();
  });

  const {testQueries, testRenderError, testRender} = apolloContainerTests(
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
        apolloContainers
      },
      reduxContext: {},
      testContext: {
        errorMaker
      }
    },
    container,
    propsResultTask
  );
  test('testQueries', testQueries, 100000);
  test('testRender', testRender, 100000);
  test('testRenderError', testRenderError, 1000);
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

);
ContainerWithData(Sample);
*/

