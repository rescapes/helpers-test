import {apolloContainerTests, propsFromParentPropsTask} from './apolloContainerTestHelpers';
import * as R from 'ramda';
import {connect} from 'react-redux';
import {Component} from 'react';
import {remoteConfig} from 'remoteConfig';
import {ApolloProvider} from '@apollo/react-hooks';
import {
  composeWithChainMDeep,
  defaultRunConfig,
  mapToNamedResponseAndInputs,
  reqStrPathThrowing,
  toNamedResponseAndInputs
} from 'rescape-ramda';
import {parentPropsForContainerResultTask} from './componentTestHelpers';
import {of} from 'folktale/concurrency/task';
import * as Result from 'folktale/result';
import {
  makeRegionMutationContainer,
  makeRegionsQueryContainer,
  regionOutputParams
} from 'rescape-place';
import {
  testAuthTask,
  testConfig
} from 'rescape-apollo';
import {e, renderChoicepoint, renderErrorDefault, renderLoadingDefault} from 'rescape-helpers-component';
import {resolvedRemoteSchemaTask} from './schemaHelpers';
import {requests} from './containerTests/SampleContainer';

// Test with a remote schema. This is an integration test and requires a server
// Run the graphql server in the rescape-graphene repo
const config = {    // This server must be running in order for integration tests to pass
  settings: {
    api: {
      uri: 'http://localhost:8008/graphql'
    },
    // This user must be set up on the server in order for integration tests to pass
    testAuthorization: {
      username: 'test',
      password: 'testpass'
    }
  }
};

const schemaTask = resolvedRemoteSchemaTask(config);

class App extends Component {
  render() {
    return App.choicepoint(R.merge(this.props, {views: {'error': {}, 'loading': {}, 'success': {}}}));
  }
}

App.choicepoint = renderChoicepoint(
  renderErrorDefault('error'),
  renderLoadingDefault('loading'),
  () => {
    return e(div, {className: 'success'});
  }
);

// This is the views function for our App component.
App.views = props => ({
  error: {
    className: 'error'
  },
  loading: {
    className: 'loading'
  },
  success: {},
  // We'll pretend in the second set of tests that we have a child component,
  // which for convenience is also an App that has a property
  subApp: {
    id: reqStrPathThrowing('data.region.id', props)
  }
});

// TODO mapStateToProps and mapDispatchToProps will go away when we remove Redux
// ownProps will override with bad id for testing error
const mapStateToProps = (state, ownProps) => R.merge(
  {
    data: {
      region: {
        id: parseInt(ownProps.regionId)
      }
    }
  }, ownProps);
const mapDispatchToProps = () => ({});

// Compose the Apollo query container and mutation container
const apolloContainer = R.curry((component, props) => {
  return R.compose(
    toNamedResponseAndInputs('component',
      ({outputParams, component, props}) => {
        return makeRegionsQueryContainer({}, {outputParams}, component, props);
      }
    ),
    toNamedResponseAndInputs('component',
      ({outputParams, component, props}) => {
        return makeRegionMutationContainer({}, {outputParams}, component, props);
      }
    )
  )({outputParams: regionOutputParams, component, props});
});

const configuredTestAuthTask = testAuthTask(testConfig);
const providerWrappedApolloContainer = R.curry((component, props) => {
  return composeWithChainMDeep(1, [
    // Wrap it in an ApolloProvider
    ({apolloConfig: {apolloClient}, apolloContainer, component, props}) => {
      return of(e(
        ApolloProvider,
        {client: apolloClient},
        apolloContainer(component, props)
      ));
    },
    mapToNamedResponseAndInputs('apolloConfig',
      () => {
        return configuredTestAuthTask;
      }
    )
  ])({apolloContainer, component, props});
});

const Container = connect(mapStateToProps, mapDispatchToProps, R.merge)(apolloContainer);
const container = e(Container);

// Find this React component
const componentName = 'Region';
// Find this class in the data renderer
const childClassDataName = 'success';
// Find this class in the loading renderer
const childClassLoadingName = 'loading';
// Find this class in the error renderer
const childClassErrorName = 'error';

const errorMaker = parentProps => R.set(R.lensPath(['data', 'regions', 'id']), 'foo', parentProps);

// Pretend that there's some parent container that passes the regionId to a view called myRegion, which
// is the container we are testing
const propsResultTask = schema => parentPropsForContainerResultTask(
  {schema},
  // Pretend the parent returns the given props asynchronously
  schema => of(Result.Ok({regionId: 2020})),
  props => ({views: {myRegion: {regionId: parseInt(props.regionId)}}}),
  'myRegion'
);

describe('ApolloContainer', () => {

  // Test the composition of the apolloContainer
  test('apolloContainer', done => {
    const errors = [];
    const task = composeWithChainMDeep(1, [
      // Use the container and sample props
      ({value: props}) => {
        return providerWrappedApolloContainer(container, props);
      },
      // Get sample props
      schema => {
        return propsResultTask(schema);
      },
      () => schemaTask
    ])();
    task.run().listen(
      defaultRunConfig({
        onResolved: value => {
          expect(value).toBeTruthy();
        }
      }, errors, done)
    );
  }, 50000);

  const {
    testMapStateToProps,
    testQueries,
    testMutations,
    testRenderError,
    testRender
  } = apolloContainerTests(
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
        state: remoteConfig,
        schemaTask,
        requests: {
          queryComponents: [makeRegionsQueryContainer({}, {outputParams: regionOutputParams})],
          mutationComponents: [makeRegionMutationContainer({}, {outputParams: regionOutputParams})]
        }
      },
      reduxContext: {
        mapStateToProps
      },
      testContext: {
        errorMaker
      }
    },
    container,
    propsResultTask
  );
  test('testMapStateToProps', testMapStateToProps);
  test('testQueries', testQueries);
  test('testMutations', testMutations);
  test('testRender', testRender);
  test('testRenderError', testRenderError);


  test('propsFromParentPropsTask', done => {
    propsFromParentPropsTask(
      {foo: 1},
      of(Result.Ok({bar: 1})),
      (initialState, parentContainerSampleProps) => of(R.merge(initialState, parentContainerSampleProps))
    ).run().listen({
      onResolved: value => {
        expect(value).toEqual({
          foo: 1,
          bar: 1
        });
        done();
      }
    });
  });
});

describe('ApolloContainer Remote Integration Test', () => {

  const {
    testQuery: testQueryWithRemoteSchema,
    testMutation: testMutationWithRemoteSchema,
    testRender: testRenderWithRemoteSchema,
    testRenderError: testRenderErrorWithRemoteSchema
  } = apolloContainerTests(
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
        state: remoteConfig,
        schemaTask,
        requests
      },
      reduxContext: {
        mapStateToProps
      },
      testContext: {
        errorMaker
      }
    },
    container,
    propsResultTask
  );
  test('testQueryWithRemoteSchema', testQueryWithRemoteSchema);
  test('testMutationWithRemoteSchema', testMutationWithRemoteSchema);
  test('testRenderWithRemoteSchema', testRenderWithRemoteSchema);
  test('testRenderErrorWithRemoteSchema', testRenderErrorWithRemoteSchema);
});