import {apolloContainerTests} from './apolloContainerTestHelpers';
import {gql} from 'apollo-client-preset';
import * as R from 'ramda';
import {connect} from 'react-redux';
import {graphql} from 'react-apollo';
import {
  eMap, makeApolloTestPropsTaskFunction, renderChoicepoint, renderErrorDefault,
  renderLoadingDefault
} from 'componentHelpers';
import {Component} from 'react';
import {resolvedSchema, sampleConfig} from 'sampleData';
import {reqStrPathThrowing, promiseToTask, mergeDeep} from 'rescape-ramda';
import {parentPropsForContainerTask} from 'componentTestHelpers';
import {of} from 'folktale/concurrency/task';
import * as Result from 'folktale/result';

describe('ApolloContainer', () => {
  const schema = resolvedSchema;
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
      id: reqStrPathThrowing('data.store.region.id', props)
    }
  });

// Run this apollo query
  const query = `query region($regionId: String!) {
    store {
        region(id: $regionId) {
            id
        }
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

  /**
   * Returns a function that expects state and parentProps for testing and returns a Task that resolves the
   * properties the properties in an Result.Ok or if there's an error gives an Result.Error
   */
  const samplePropsTaskMaker = makeApolloTestPropsTaskFunction(
    schema, sampleConfig, mapStateToProps, mapDispatchToProps, queries.region
  );

  // Pretend that there's some parent container that passes the regionId to a view called myContainer, which
  // is the container we are testing
  const chainedParentPropsTask = parentPropsForContainerTask(
    // Pretend the parent returns the given props asynchronously
    of(Result.Ok({regionId: 'oakland'})),
    props => ({views: {myContainer: {regionId: props.regionId}}}),
    'myContainer'
  );

  const {testMapStateToProps, testQuery, testRenderError, testRender} = apolloContainerTests({
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
  test('testMapStateToProps', testMapStateToProps);
  test('testQuery', testQuery);
  test('testRender', testRender);
  test('testRenderError', testRenderError);
});
