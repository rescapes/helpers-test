import {
  apolloContainerTests, makeApolloTestPropsTaskFunction,
  propsFromParentPropsTask
} from './apolloContainerTestHelpers';
import {gql} from 'apollo-client-preset';
import * as R from 'ramda';
import {connect} from 'react-redux';
import {graphql} from 'react-apollo';
import {Component} from 'react';
import {remoteConfig} from 'remoteConfig';
import {reqStrPathThrowing} from 'rescape-ramda';
import {parentPropsForContainerResultTask} from './componentTestHelpers';
import {of} from 'folktale/concurrency/task';
import * as Result from 'folktale/result';
import {makeQuery, makeMutation} from 'rescape-apollo';
import {composeGraphqlQueryDefinitions} from 'rescape-helpers-component';
import {
  loadingCompleteStatus,
  renderChoicepoint,
  e,
  renderErrorDefault,
  renderLoadingDefault
} from 'rescape-helpers-component';
import {resolvedRemoteSchemaTask} from './schemaHelpers';
import {
  defaultRunToResultConfig
} from 'rescape-ramda';

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

// Run this apollo query
const query = `query regions($regionId: Int!) {
      regions(id: $regionId) {
            id
      }
}`;

// No complex input types
const readInputTypeMapper = {};
const outputParams = [
  'id',
  'name'
];

export const makeRegionsQuery = (queryParams) => {
  const query = makeQuery('regions', readInputTypeMapper, outputParams, queryParams);
  makeQuery('sampleResourceQuery', sampleInputParamTypeMapper, sampleResourceOutputParams);
  log.debug(query);
  log.debug(JSON.stringify(queryParams));
  return gql`${query}`;
};

export const makeRegionsMutation = region => {
  const name = 'region';
  const {variablesAndTypes, namedOutputParams, crud} = mutationParts(
    {
      name,
      outputParams
    }, {regionData: region}
  );
  // create|update[Model Name]
  const createOrUpdateName = `${crud}${capitalize(name)}`;

  return makeMutation(
    createOrUpdateName,
    variablesAndTypes,
    namedOutputParams
  );
};

const graphqlRequests = {
  queries: {
    queryRegions: {
      query: makeRegionsQuery,
      args: {
        // Options for the query that expects the props as input
        // We always put our props in the format data: ... to match what graphql returns
        options: ({data: {region}}) => ({
          // The variables and values that will be used
          variables: {
            regionId: parseInt(region.id)
          },
          // Pass through error so we can handle it in the component
          errorPolicy: 'all'
        }),
        // Upon completion of the query merge the results--data-- with our ownProps that came from Redux or the parent
        props: ({data, ownProps}) => R.merge(
          ownProps,
          {data}
        )
      }
    }
  },
  mutations: {
    mutateRegion: {
      mutation: makeRegionsMutation
    }
  }
};

const ContainerWithData = composeGraphqlQueryDefinitions(
  // Compose all the queries and mutations into a new container
  R.merge(
    graphqlRequests.queries,
    graphqlRequests.mutations
  )
)(App);

// ownProps will override with bad id for testing error
const mapStateToProps = (state, ownProps) => R.merge(
  {
    data: {
      region: {
        id: parseFloat(ownProps.regionId)
      }
    }
  }, ownProps);
const mapDispatchToProps = () => ({});
const ContainerClass = connect(mapStateToProps, mapDispatchToProps, R.merge)(ContainerWithData);
const Container = e(ContainerClass);

// Find this React component
const componentName = 'App';
// Find this class in the data renderer
const childClassDataName = 'success';
// Find this class in the loading renderer
const childClassLoadingName = 'loading';
// Find this class in the error renderer
const childClassErrorName = 'error';

const errorMaker = parentProps => R.set(R.lensPath(['data', 'regions', 'id']), 'foo', parentProps);

// Pretend that there's some parent container that passes the regionId to a view called myContainer, which
// is the container we are testing
const chainedParentPropsTask = parentPropsForContainerResultTask(
  // Pretend the parent returns the given props asynchronously
  of(Result.Ok({regionId: 2020})),
  props => ({views: {myContainer: {regionId: parseInt(props.regionId)}}}),
  'myContainer'
);

describe('ApolloContainer', () => {
  const {testQuery, testMutate, testRenderError, testRender} = apolloContainerTests({
    initialState: remoteConfig,
    schema: schemaTask,
    Container,
    chainedParentPropsTask,
    mapStateToProps,
    componentName,
    childClassDataName,
    childClassErrorName,
    childClassLoadingName,
    graphqlRequests,
    errorMaker
  });
  test('testMutate', testMutate);
  test('testQuery', testQuery);
  test('testRender', testRender);
  test('testRenderError', testRenderError);

  test('mooMakeApolloTestPropsTaskFunction', done => {
    const sampleState = ({data: {regionId: 2020}, views: {aComponent: {stuff: 1}, bComponent: {moreStuff: 2}}});
    const sampleOwnProps = {style: {width: 100}};
    const mapStateToProps = (state, ownProps) => R.merge(state, ownProps);
    const dispatchResults = {
      action1: R.identity,
      action2: R.identity,
      action3: R.identity
    };
    const mapDispatchToProps = (dispatch, ownProps) => dispatchResults;
    // given mapStateToProps, mapDispatchToProps, and mergeProps we get a function back
    // that then takes sample state and ownProps. The result is a merged object based on container methods
    // and sample data. Next apply the apollo query
    const queryObj = {
      query: `;
  query;
  regions($regionId
:
  Int;
  !
)
  {
    regions(id
  :
    $regionId;
  )
    {
      id;
      name;
    }
  }
`,
      args: {
        options: ({data: {regionId}}) => ({
          variables: {
            regionId
          }
        })
      }
    };
    // Make the function with the configuration
    const func = makeApolloTestPropsTaskFunction(schemaTask, remoteConfig, mapStateToProps, mapDispatchToProps, queryObj);
    // Now pretend we're calling it with state and props
    const errors = [];
    func(sampleState, sampleOwnProps).run().listen(
      defaultRunToResultConfig({
        // Map the Result, handling Result.Ok success and Result.Error failure
        onResolved: value => {
          expect(value).toEqual(
            R.merge({
              // Expect this data came from Apollo along with the other props that were passed through: style adn views
              data: R.merge(
                loadingCompleteStatus, {
                  region: {id: "oakland", name: "Oakland"},
                  regionId: 2020
                }),
              style: {width: 100},
              views: {
                aComponent: {stuff: 1},
                bComponent: {moreStuff: 2}
              }
            }, dispatchResults)
          );
        }
      }, errors, done)
    );
  });
});

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

describe('ApolloContainer Remote Integration Test', () => {

  const {testQuery: testQueryWithRemoteSchema, testRender: testRenderWithRemoteSchema, testRenderError: testRenderErrorWithRemoteSchema} =
    apolloContainerTests({
      initialState: remoteConfig,
      schema: schemaTask,
      Container,
      chainedParentPropsTask,
      mapStateToProps,
      componentName,
      childClassDataName,
      childClassErrorName,
      childClassLoadingName,
      queryConfig: graphqlRequests.regions,
      errorMaker
    });
  test('testQueryWithRemoteSchema', testQueryWithRemoteSchema);
  test('testRenderWithRemoteSchema', testRenderWithRemoteSchema);
  test('testRenderErrorWithRemoteSchema', testRenderErrorWithRemoteSchema);
});