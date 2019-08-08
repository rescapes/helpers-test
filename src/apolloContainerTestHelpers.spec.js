import {
  apolloContainerTests, makeApolloTestPropsTaskFunction,
  propsFromParentPropsTask
} from './apolloContainerTestHelpers';
import {gql} from 'apollo-client-preset';
import * as R from 'ramda';
import {connect} from 'react-redux';
import {graphql} from 'react-apollo';
import {Component} from 'react';
import {resolvedSchema as schema, sampleConfig} from 'schema.sample';
import {reqStrPathThrowing, promiseToTask, mergeDeep} from 'rescape-ramda';
import {parentPropsForContainerTask} from 'componentTestHelpers';
import {of} from 'folktale/concurrency/task';
import * as Result from 'folktale/result';
import {loadingCompleteStatus, renderChoicepoint, eMap, renderErrorDefault, renderLoadingDefault} from 'rescape-helpers-component';
import {resolvedRemoteSchemaTask} from './schemaHelpers';
import {addResolvers} from './schema.sample';

const [div] = eMap(['div']);

class App extends Component {
  render() {
    return App.choicepoint(R.merge(this.props, {views: {'error': {}, 'loading': {}, 'success': {}}}));
  }
}

App.choicepoint = renderChoicepoint(
  renderErrorDefault('error'),
  renderLoadingDefault('loading'),
  () => {
    return div({className: 'success'});
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
const query = `query region($regionId: String!) {
      region(id: $regionId) {
            id
      }
}`;
const queries = {
  region: {
    query,
    args: {
      options: ({data: {region}}) => ({
        variables: {
          regionId: region.id
        },
        // Pass through error so we can handle it in the component
        errorPolicy: 'all'
      }),
      props: ({data, ownProps}) => R.merge(
        ownProps,
        {data}
      )
    }
  }
};

const ContainerWithData = graphql(
  gql`${queries.region.query}`,
  queries.region.args
)(App);

// ownProps will override with bad id for testing error
const mapStateToProps = (state, ownProps) => R.merge({data: {region: {id: ownProps.regionId}}}, ownProps);
const mapDispatchToProps = () => ({});
const ContainerClass = connect(mapStateToProps, mapDispatchToProps, R.merge)(ContainerWithData);
const [Container] = eMap([ContainerClass]);

// Find this React component
const componentName = 'App';
// Find this class in the data renderer
const childClassDataName = 'success';
// Find this class in the loading renderer
const childClassLoadingName = 'loading';
// Find this class in the error renderer
const childClassErrorName = 'error';

const errorMaker = parentProps => R.set(R.lensPath(['data', 'region', 'id']), 'foo', parentProps);

// Pretend that there's some parent container that passes the regionId to a view called myContainer, which
// is the container we are testing
const chainedParentPropsTask = parentPropsForContainerTask(
  // Pretend the parent returns the given props asynchronously
  of(Result.Ok({regionId: 'oakland'})),
  props => ({views: {myContainer: {regionId: props.regionId}}}),
  'myContainer'
);

describe('ApolloContainer', () => {
  const {testQuery, testRenderError, testRender} = apolloContainerTests({
    initialState: sampleConfig,
    schema,
    Container,
    chainedParentPropsTask,
    mapStateToProps,
    componentName,
    childClassDataName,
    childClassErrorName,
    childClassLoadingName,
    queryConfig: queries.region,
    errorMaker
  });
  test('testQuery', testQuery);
  test('testRender', testRender);
  test('testRenderError', testRenderError);

  test('makeApolloTestPropsTaskFunction', done => {
    const sampleState = ({data: {regionId: 'oakland'}, views: {aComponent: {stuff: 1}, bComponent: {moreStuff: 2}}});
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
      query: `
          query region($regionId: String!) {
                region(id: $regionId) {
                    id
                    name
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
    const func = makeApolloTestPropsTaskFunction(schema, sampleConfig, mapStateToProps, mapDispatchToProps, queryObj);
    // Now pretend we're calling it with state and props
    func(sampleState, sampleOwnProps).run().listen({
      // Map the Result, handling Result.Ok success and Result.Error failure
      onResolved: result => result.map(value => {
        expect(value).toEqual(
          R.merge({
            // Expect this data came from Apollo along with the other props that were passed through: style adn views
            data: R.merge(
              loadingCompleteStatus, {
                region: {id: "oakland", name: "Oakland"},
                regionId: 'oakland'
              }),
            style: {width: 100},
            views: {
              aComponent: {stuff: 1},
              bComponent: {moreStuff: 2}
            }
          }, dispatchResults)
        );
        done();
      }).mapError(value => {
        // If any Error values turn up, just throw the errors
        const errors = R.flatten(value.error);
        R.forEach(
          error => {
            console.error(error);
          }
        );
        throw errors[0];
      }),
      onRejected: reject => {
        // If the Task rejects, throw
        throw(reject);
      }
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
});


describe('ApolloContainer Remote Integration Test', () => {
  // Test with a remote schema. This is an integration test and requires a server
  // Run the graphql server in the rescape-graphene repo
  const config = {    // This server must be running in order for integration tests to pass
    settings: {
      api: {
        uri: 'http://localhost:8008/graphql'
      },
      // This user must be set up on the server in order for integration tests to pass
      apiAuthorization: {
        username: 'test',
        password: 'testpass'
      }
    }
  };

  const schemaTask = resolvedRemoteSchemaTask(config, addResolvers);
  const {testQuery: testQueryWithRemoteSchema, testRender: testRenderWithRemoteSchema, testRenderError: testRenderErrorWithRemoteSchema} = apolloContainerTests({
    initialState: sampleConfig,
    schema: schemaTask,
    Container,
    chainedParentPropsTask,
    mapStateToProps,
    componentName,
    childClassDataName,
    childClassErrorName,
    childClassLoadingName,
    queryConfig: queries.region,
    errorMaker
  });
  test('testQueryWithRemoteSchema', testQueryWithRemoteSchema);
  test('testRenderWithRemoteSchema', testRenderWithRemoteSchema);
  test('testRenderErrorWithRemoteSchema', testRenderErrorWithRemoteSchema);
});